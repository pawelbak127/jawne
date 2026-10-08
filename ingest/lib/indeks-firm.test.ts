import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { zalozSchemat } from './baza.js';
import { zbudujIndeksFirm } from './indeks-firm.js';
import { uprosc } from '../../src/lib/tekst.js';

let db: DatabaseSync;

function wstaw(dzien: string, nip: string | null, nazwa: string | null, brutto: number | null, eur: number | null, teryt = '020101'): void {
  db.prepare(
    `insert into pomoc_publiczna (teryt, dzien, nip_beneficjenta, nazwa_beneficjenta, wielkosc_kod, wielkosc,
       udzielajacy, przeznaczenie, forma, wartosc_brutto, wartosc_brutto_eur, klucz)
     values (?,?,?,?,'1','mikro','Urząd','regionalna','dotacja',?,?,?)`,
  ).run(teryt, dzien, nip, nazwa, brutto, eur, `${dzien}-${Math.random()}`);
}

/** Dawna droga — jedno zapytanie, ktore na serwerze trwalo do 2,5 h. */
function zSql() {
  return db.prepare(
    `select s.nip as nip, coalesce(n.nazwa, '') as nazwa, s.przypadkow as przypadkow, s.brutto as brutto,
            s.max_eur as max_eur, n.teryt as teryt
       from (select nip_beneficjenta as nip, count(*) as przypadkow,
                    sum(wartosc_brutto) as brutto, max(wartosc_brutto_eur) as max_eur
               from pomoc_publiczna where nip_beneficjenta is not null
              group by nip_beneficjenta) s
       join (select nip, nazwa, teryt from
               (select nip_beneficjenta as nip, nazwa_beneficjenta as nazwa, teryt,
                       row_number() over (partition by nip_beneficjenta
                                          order by (nazwa_beneficjenta is null), dzien desc, id desc) as rn
                  from pomoc_publiczna where nip_beneficjenta is not null)
              where rn = 1) n on n.nip = s.nip
      order by s.nip`,
  ).all();
}

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  zalozSchemat(db);
});

describe('indeks firm (pulapka 72)', () => {
  it('daje dokladnie to samo co dawne zapytanie — z NULL-ami, zmiana nazwy i kilkoma gminami', () => {
    wstaw('2026-01-01', '1000000001', 'Stara Nazwa Sp. z o.o.', 100, 25);
    wstaw('2026-03-01', '1000000001', 'Nowa Nazwa Sp. z o.o.', 300, 75, '140101');
    wstaw('2026-04-01', '1000000001', null, null, null);            // najnowszy, ale bez nazwy
    wstaw('2026-02-01', '1000000002', 'Bez Kwot S.A.', null, null);  // suma ma byc NULL, nie 0
    wstaw('2026-02-01', '1000000003', 'Żółć Łódź', 50, 12);
    wstaw('2026-02-01', null, 'Bez NIP-u', 999, 250);                // nie wchodzi
    wstaw('2026-02-02', '1000000004', null, 10, 2);                  // tylko puste nazwy

    const n = zbudujIndeksFirm(db);
    const wynik = db.prepare('select nip, nazwa, przypadkow, brutto, max_eur, teryt from firmy_szukaj order by nip').all();

    expect(n).toBe(4);
    expect(wynik).toEqual(zSql());
    const nowa = wynik.find((r) => r.nip === '1000000001')!;
    expect(nowa.nazwa).toBe('Nowa Nazwa Sp. z o.o.');
    expect(nowa.teryt).toBe('140101');
    expect(wynik.find((r) => r.nip === '1000000002')!.brutto).toBeNull();
  });

  it('wypelnia klucz wyszukiwania uprosc() — takze ponad jedna partie', () => {
    for (let i = 0; i < 120; i++) wstaw('2026-01-01', String(2000000000 + i), `Firma Ąę ${i}`, 1, 1);
    zbudujIndeksFirm(db);
    const zle = (db.prepare('select nazwa, szukaj from firmy_szukaj').all() as { nazwa: string; szukaj: string }[])
      .filter((r) => r.szukaj !== (uprosc(r.nazwa) || ' '));
    expect(zle).toEqual([]);
    expect((db.prepare("select count(*) as c from firmy_szukaj where szukaj = ''").get() as { c: number }).c).toBe(0);
  });

  it('czyta tabele pomocy PO KOLEI, nie indeksem po NIP-ie', () => {
    const plany: string[] = [];
    const exec = db.exec.bind(db);
    db.exec = ((sql: string) => {
      const m = /insert into temp\.firmy_nowe[\s\S]*?;/.exec(sql);
      if (m) {
        const zapytanie = m[0].replace(/^insert into temp\.firmy_nowe\([^)]*\)\s*/, '').replace(/;$/, '');
        for (const r of db.prepare(`explain query plan ${zapytanie}`).all() as { detail: string }[]) plany.push(r.detail);
      }
      return exec(sql);
    }) as typeof db.exec;
    zbudujIndeksFirm(db);
    db.exec = exec;
    const poTabeli = plany.filter((p) => /pomoc_publiczna\b(?!_)/.test(p));
    expect(poTabeli.length).toBeGreaterThan(0);
    expect(poTabeli.filter((p) => /USING (COVERING )?INDEX/.test(p))).toEqual([]);
  });

  it('nie zostawia tabeli tymczasowej i podmienia stary indeks', () => {
    wstaw('2026-01-01', '1000000001', 'Alfa S.A.', 1, 1);
    zbudujIndeksFirm(db);
    wstaw('2026-01-02', '1000000002', 'Beta S.A.', 1, 1);
    expect(zbudujIndeksFirm(db)).toBe(2);
    expect((db.prepare("select count(*) as c from temp.sqlite_master where name = 'firmy_nowe'").get() as { c: number }).c).toBe(0);
  });
});
