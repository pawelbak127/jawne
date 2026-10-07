import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { zalozSchemat } from './baza.js';
import { mapaZeSum, odswiezSumy, PORCJA_DNIA, przegladZeSum, sprawdzSumy, sumyFirm } from './sumy-pomocy.js';
import { DNI_USTALONE, policzMapePomocy, policzPrzeglad } from '../../src/lib/przeglad.js';
import { policzPomocGminy, pomocGminyZeSum } from '../../src/lib/pomoc-gminy.js';

/**
 * Kontrola, ze suma liczona dzien po dniu daje dokladnie to samo, co jedno
 * zapytanie po calej tabeli. To jest cala umowa tego modulu — bez niej sumy
 * przyrostowe byłyby liczbami, ktorych nikt nie sprawdza (wzorzec 7).
 */
const WARSZAWA = '146501';

let db: DatabaseSync;

const czytnik = () => ({
  wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
  jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
});

/** `pobrano` 14 dni po dniu = dzien ustalony; mniej = dzien swiezy. */
function dodajDzien(dzien: string, poIlu: number, wiersze: Partial<Record<string, unknown>>[]): void {
  const pobrano = new Date(`${dzien}T12:00:00Z`);
  pobrano.setUTCDate(pobrano.getUTCDate() + poIlu);
  const iso = pobrano.toISOString();
  db.prepare('insert or replace into pomoc_publiczna_dni (dzien, pobrano, pobrano_dzien, wierszy) values (?,?,?,?)')
    .run(dzien, iso, iso.slice(0, 10), wiersze.length);
  wstawWiersze(dzien, wiersze);
}

function wstawWiersze(dzien: string, wiersze: Partial<Record<string, unknown>>[]): void {
  const w = db.prepare(
    `insert into pomoc_publiczna
      (teryt, dzien, nip_beneficjenta, nazwa_beneficjenta, wielkosc_kod, wielkosc, udzielajacy,
       przeznaczenie, forma, wartosc_brutto, wartosc_brutto_eur, klucz)
     values (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const [i, r] of wiersze.entries()) {
    w.run(
      (r.teryt as string) ?? '020101', dzien, (r.nip as string) ?? null, (r.nazwa as string) ?? null,
      (r.wielkosc_kod as string) ?? '1', (r.wielkosc as string) ?? 'mikro',
      // `in`, nie `??`: test musi umiec podac jawny NULL („brak w rejestrze”).
      'udzielajacy' in r ? (r.udzielajacy as string | null) : 'Urząd A',
      'przeznaczenie' in r ? (r.przeznaczenie as string | null) : 'regionalna', (r.forma as string) ?? 'dotacja',
      r.brutto === undefined ? 100 : (r.brutto as number | null),
      'eur' in r ? (r.eur as number | null) : 25, `${dzien}-${i}-${Math.random()}`,
    );
  }
}

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  zalozSchemat(db);
  db.prepare('insert into okregi (nr, nazwa, wojewodztwo) values (?,?,?)').run(1, 'okręg', 'dolnośląskie');
  for (const [teryt, nazwa, woj, osob] of [
    ['020101', 'Bolesławiec', 'dolnośląskie', 1000],
    ['020102', 'Nowa', 'dolnośląskie', 500],
    ['140101', 'Inna', 'mazowieckie', 2000],
  ] as [string, string, string, number][]) {
    db.prepare(
      'insert or replace into gminy (teryt, nazwa, rodzaj, powiat, wojewodztwo, okreg_nr, szukaj) values (?,?,?,?,?,?,?)',
    ).run(teryt, nazwa, 'gmina', 'powiat', woj, 1, nazwa.toLowerCase());
    db.prepare('insert into ludnosc (teryt, rok, osob) values (?,?,?)').run(teryt, 2024, osob);
  }
});

describe('sumy przyrostowe', () => {
  it('daje to samo, co liczenie od zera — pole po polu', () => {
    dodajDzien('2026-01-01', 20, [
      { nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 1000 },
      { nip: '2222222222', nazwa: 'Beta S.A.', teryt: '140101', brutto: 250.5, udzielajacy: 'Urząd B' },
    ]);
    dodajDzien('2026-01-02', 20, [
      { nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 7 },
      { nip: '3333333333', nazwa: 'Gamma', teryt: '020102', brutto: 3, forma: 'pożyczka' },
    ]);
    expect(odswiezSumy(db).dodanych).toBe(2);

    const zZera = policzPrzeglad(czytnik(), WARSZAWA)!;
    const zeStanu = przegladZeSum(db, WARSZAWA)!;
    expect(zeStanu.przypadkow).toBe(zZera.przypadkow);
    expect(zeStanu.beneficjentow).toBe(zZera.beneficjentow);
    expect(zeStanu.gmin).toBe(zZera.gmin);
    expect(zeStanu.brutto).toBeCloseTo(zZera.brutto!, 9);
    expect(zeStanu.udzielajacy).toEqual(zZera.udzielajacy);
    expect(zeStanu.formy).toEqual(zZera.formy);
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
  });

  it('dnia jeszcze nieustalonego nie wlicza ANI do przegladu, ANI do mapy (B2)', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 1000 }]);
    dodajDzien('2026-02-01', 1, [{ nip: '2222222222', nazwa: 'Beta', brutto: 500 }]);
    odswiezSumy(db);

    expect(przegladZeSum(db, WARSZAWA)!.przypadkow).toBe(1);
    expect(przegladZeSum(db, WARSZAWA)!.swiezych).toBe(1);
    /*
     * Do 01.10.2026 mapa dawala tu 1,5 (1000 + 500 na 1000 mieszkancow),
     * a strona gminy 1,0 — ta sama wielkosc z dwoch roznych zbiorow (B2).
     * Teraz oba licza z dni ustalonych: 1000 / 1000 = 1,0.
     */
    expect(mapaZeSum(db, WARSZAWA)).toEqual(policzMapePomocy(czytnik(), WARSZAWA));
    expect(mapaZeSum(db, WARSZAWA)[0]!.wartosc).toBeCloseTo(1.0, 9);
  });

  it('bez ani jednego dnia ustalonego mapa jest PUSTA, a nie zerowa (regula 4)', () => {
    dodajDzien('2026-02-01', 1, [{ nip: '2222222222', nazwa: 'Beta', brutto: 500 }]);
    odswiezSumy(db);

    expect(przegladZeSum(db, WARSZAWA)).toBeNull();
    expect(mapaZeSum(db, WARSZAWA)).toEqual([]);
    expect(policzMapePomocy(czytnik(), WARSZAWA)).toEqual([]);
  });

  it('liczy firmy z calej tabeli — takze z gmin pokazowych, ktorych dnia nie ma w rejestrze dni', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 1000 }]);
    wstawWiersze('2019-05-05', [{ nip: '9999999999', nazwa: 'Pokazowa', brutto: 42 }]);
    odswiezSumy(db);

    expect(przegladZeSum(db, WARSZAWA)!.przypadkow).toBe(1);
    expect(sumyFirm(db).get('9999999999')?.brutto).toBe(42);
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
  });

  it('buduje od zera, gdy policzony dzien zostal pobrany jeszcze raz', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 1000 }]);
    // Pierwsze policzenie to nie „odbudowa": nie bylo czego unieważniać.
    expect(odswiezSumy(db)).toMatchObject({ dodanych: 1, odBudowy: false });
    expect(odswiezSumy(db)).toMatchObject({ dodanych: 0, odBudowy: false });

    // Dzien pobrany od nowa: inny znacznik i inna tresc.
    db.prepare('delete from pomoc_publiczna where dzien = ?').run('2026-01-01');
    dodajDzien('2026-01-01', 30, [
      { nip: '1111111111', nazwa: 'Alfa', brutto: 1000 },
      { nip: '2222222222', nazwa: 'Beta', brutto: 5 },
    ]);
    const w = odswiezSumy(db);
    expect(w.odBudowy).toBe(true);
    expect(przegladZeSum(db, WARSZAWA)!.przypadkow).toBe(2);
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
  });

  it('WYKRYWA rozjazd — kontrola, ktora nigdy nic nie zglasza, jest bezwartosciowa', () => {
    dodajDzien('2026-01-01', 20, [
      { nip: '1111111111', nazwa: 'Alfa', brutto: 1000 },
      { nip: '2222222222', nazwa: 'Beta', teryt: '020102', brutto: 500 },
    ]);
    odswiezSumy(db);
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);

    // Kwota w gminie: psujemy stan, zrodlo zostaje bez zmian.
    db.prepare('update pomoc_sumy_gmin set brutto = brutto + 1 where teryt = ?').run('020101');
    expect(sprawdzSumy(db, WARSZAWA).join(' | ')).toMatch(/mapa\/020101/);

    // Nazwa firmy: od niej zalezy, czy wolno ja pokazac, wiec tez musi sie zgadzac.
    db.prepare('update pomoc_sumy_gmin set brutto = brutto - 1 where teryt = ?').run('020101');
    db.prepare('update pomoc_sumy_firm set nazwa = ? where nip = ?').run('Cos innego', '2222222222');
    expect(sprawdzSumy(db, WARSZAWA).join(' | ')).toMatch(/nazwa/);
  });

  it('nie zbiera w nieskonczonosc listy bledow', () => {
    // 25 gmin, kazda rozjechana — lista ma sie zatrzymac na dwudziestu
    // i powiedziec, ilu rozjazdow nie pokazala.
    const wiersze = Array.from({ length: 25 }, (_, i) => ({
      nip: String(1000000000 + i), nazwa: `Firma ${i}`, teryt: '020101', brutto: 10,
    }));
    dodajDzien('2026-01-01', 20, wiersze);
    odswiezSumy(db);
    db.prepare('update pomoc_sumy_firm set brutto = brutto + 1').run();
    const r = sprawdzSumy(db, WARSZAWA);
    expect(r.length).toBe(21);
    expect(r.at(-1)).toMatch(/dalszych rozjazdow/);
  });

  it('brak kwoty to nie zero (regula 4)', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: null }]);
    odswiezSumy(db);
    const p = przegladZeSum(db, WARSZAWA)!;
    expect(p.przypadkow).toBe(1);
    expect(p.brutto).toBeNull();
    expect(policzPrzeglad(czytnik(), WARSZAWA)!.brutto).toBeNull();
    // Gmina bez zadnej kwoty nie trafia na mape jako zero.
    expect(mapaZeSum(db, WARSZAWA)).toEqual([]);
  });
});

describe('pomoc w gminie ze stanu (strona gminy)', () => {
  const ZRODLO = `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;
  const obie = (teryt: string) => ({
    zeStanu: pomocGminyZeSum(czytnik(), teryt),
    zTabeli: policzPomocGminy(czytnik(), ZRODLO, teryt),
  });

  beforeEach(() => {
    // Typ z REGON wchodzi do wyniku — musi przejsc przez obie drogi tak samo.
    db.prepare('insert into regon (nip, typ, nazwa, pobrano) values (?,?,?,?)').run('1111111111', 'P', 'ALFA', '2026-01-01');
  });

  it('daje to samo, co liczenie z tabeli — takze przy NULL-ach i powtorzonych firmach', () => {
    dodajDzien('2025-12-30', 20, [
      { nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 1000, eur: 230 },
      { nip: '1111111111', nazwa: 'ALFA SP. Z O.O.', brutto: 5, eur: null },
      { nip: null, nazwa: 'Jan Kowalski', brutto: 40, przeznaczenie: null },
      { nip: '2222222222', nazwa: null, brutto: null, udzielajacy: null },
    ]);
    dodajDzien('2026-01-02', 20, [
      { nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 7, eur: 400 },
      { nip: null, nazwa: 'Anna Nowak', brutto: 3 },
      { nip: '3333333333', nazwa: 'Gamma', teryt: '020102', brutto: 3, przeznaczenie: 'B+R' },
    ]);
    // Dzien jeszcze nieustalony nie wchodzi ANI do stanu, ANI do liczenia z tabeli.
    dodajDzien('2026-02-01', 1, [{ nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 99999 }]);
    odswiezSumy(db);

    for (const teryt of ['020101', '020102', '140101']) {
      const { zeStanu, zTabeli } = obie(teryt);
      if (teryt === '140101') {
        // Gmina bez pomocy: ze stanu brak danych, a nie zero przypadkow.
        expect(zeStanu.razem).toBeNull();
        continue;
      }
      expect(zeStanu).toEqual(zTabeli);
    }
    const k = obie('020101').zeStanu;
    expect(k.razem).toMatchObject({ przypadkow: 6, beneficjentow: 2, pierwszy: '2025-12-30', ostatni: '2026-01-02' });
    expect(k.lata.map((r) => r.rok)).toEqual(['2025', '2026']);
    expect(k.beneficjenci.find((b) => b.nip === '1111111111')).toMatchObject({ przypadkow: 3, max_eur: 400, typ_regon: 'P' });
    // Firma bez zadnej kwoty: suma to NULL, a nie zmierzone zero (regula 4).
    expect(k.beneficjenci.find((b) => b.nip === '2222222222')?.brutto).toBeNull();
    expect(k.przeznaczenia.map((g) => g.nazwa)).toContain('(brak w rejestrze)');
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
  });

  it('nazwa z wczesniejszego dnia nie znika przez dzien z pusta nazwa (max z NULL-em)', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa sp. z o.o.', brutto: 1 }]);
    dodajDzien('2026-01-02', 20, [{ nip: '1111111111', nazwa: null, brutto: 1 }]);
    odswiezSumy(db);
    expect(obie('020101').zeStanu.beneficjenci[0]!.nazwa).toBe('Alfa sp. z o.o.');
    expect(sumyFirm(db).get('1111111111')?.nazwa).toBe('Alfa sp. z o.o.');
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
  });

  it('stan z poprzedniej wersji liczy sie od zera — inaczej gmina mialaby tylko nowe dni', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 10 }]);
    odswiezSumy(db);
    // Udajemy stan sprzed 04.10.2026: bez tabel gminy i bez wersji.
    for (const t of ['pomoc_sumy_gmin_lata', 'pomoc_sumy_gmin_firmy', 'pomoc_sumy_gmin_wymiar', 'pomoc_sumy_wersja']) {
      db.prepare(`delete from ${t}`).run();
    }
    dodajDzien('2026-01-02', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 5 }]);
    const w = odswiezSumy(db);
    expect(w.odBudowy).toBe(true);
    expect(w.opis).toMatch(/nowy zakres sum/);
    expect(obie('020101').zeStanu.razem?.przypadkow).toBe(2);
    // Kolejny przebieg nie buduje juz od zera.
    expect(odswiezSumy(db)).toMatchObject({ dodanych: 0, odBudowy: false });
  });

  it('kontrola WYKRYWA rozjazd w stanie gminy — w kwocie, w nazwie i w progu jawnosci', () => {
    dodajDzien('2026-01-01', 20, [{ nip: '1111111111', nazwa: 'Alfa', brutto: 10, eur: 3 }]);
    odswiezSumy(db);
    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
    db.prepare("update pomoc_sumy_gmin_lata set brutto = brutto + 1 where teryt = '020101'").run();
    expect(sprawdzSumy(db, WARSZAWA).join(' | ')).toMatch(/gmina\/020101\/2026/);
    db.prepare("update pomoc_sumy_gmin_lata set brutto = brutto - 1 where teryt = '020101'").run();
    db.prepare("update pomoc_sumy_gmin_firmy set max_eur = 999999 where nip = '1111111111'").run();
    expect(sprawdzSumy(db, WARSZAWA).join(' | ')).toMatch(/max_eur/);
    db.prepare("update pomoc_sumy_gmin_firmy set max_eur = 3, nazwa = 'Inna' where nip = '1111111111'").run();
    expect(sprawdzSumy(db, WARSZAWA).join(' | ')).toMatch(/firma 1111111111 nazwa/);
  });
});

describe('dzien wiekszy niz porcja (17.12.2024: 846 670 przypadkow)', () => {
  it('liczy dzien porcjami i daje to samo co SQL — takze pary rozrzucone po porcjach', () => {
    const ile = Math.floor(PORCJA_DNIA * 2.5);
    const wiersze = Array.from({ length: ile }, (_, i) => ({
      // Ta sama para gmina–firma co 7 wierszy — trafia do kilku porcji naraz.
      nip: String(1000000000 + (i % 7919)),
      nazwa: i % 11 === 0 ? null : `Firma ${i % 7919} sp. z o.o.`,
      teryt: i % 3 === 0 ? '020102' : '020101',
      brutto: i === Math.floor(ile / 2) ? 9_999_999 : (i % 13 === 0 ? null : (i % 500) + 0.25),
      eur: i % 17 === 0 ? null : i % 300,
      przeznaczenie: i % 5 === 0 ? null : `cel ${i % 4}`,
    }));
    db.exec('begin');
    dodajDzien('2024-12-17', 20, wiersze);
    db.exec('commit');
    odswiezSumy(db);

    expect(sprawdzSumy(db, WARSZAWA)).toEqual([]);
    for (const teryt of ['020101', '020102']) {
      const zeStanu = pomocGminyZeSum(czytnik(), teryt);
      const zTabeli = policzPomocGminy(czytnik(), `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`, teryt);
      expect(zeStanu.razem?.przypadkow).toBe(zTabeli.razem?.przypadkow);
      expect(zeStanu.lata).toHaveLength(zTabeli.lata.length);
      expect(zeStanu.beneficjenci.map((b) => b.nip)).toEqual(zTabeli.beneficjenci.map((b) => b.nip));
    }
    // Najwiekszy przypadek lezal w srodku dnia, w drugiej porcji.
    expect(przegladZeSum(db, WARSZAWA)!.najwieksze[0]!.brutto).toBe(9_999_999);
    expect(przegladZeSum(db, WARSZAWA)!.przypadkow).toBe(ile);
  });
});
