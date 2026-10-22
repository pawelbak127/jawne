import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { zalozSchemat } from './baza';
import { pobranoZKonca, stronyZakresow, uzupelnijBezGminy } from './bez-gminy';
import { zapiszPrzyrost } from './sudop-zapis';

const P1 = '2026-10-19T10:00:00.000Z';
const P2 = '2026-10-20T10:00:00.000Z';
// Prawdziwe wiersze SUDOP maja wszystkie pola — puste jako null.
const PUSTE = Object.fromEntries([
  'nazwa-beneficjenta', 'wielkosc-beneficjenta-kod', 'wielkosc-beneficjenta-nazwa', 'sektor-dzialalnosci-kod',
  'sektor-dzialalnosci-nazwa', 'nip-udzielajacego-pomocy', 'srodek-pomocowy-numer', 'srodek-pomocowy-nazwa',
  'podstawa-prawna-2a-nazwa', 'podstawa-prawna-2b', 'podstawa-prawna-2c', 'przeznaczenie-pomocy-kod',
  'przeznaczenie-pomocy-nazwa', 'forma-pomocy-kod', 'forma-pomocy-nazwa', 'wartosc-nominalna-pln', 'wartosc-brutto-eur',
].map((k) => [k, null]));
const wiersz = (dzien: string, kod: string, brutto: string, nip = '1234563218') => ({
  ...PUSTE,
  'dzien-udzielenia-pomocy': dzien, 'gmina-siedziby-kod': kod, 'wartosc-brutto-pln': brutto,
  'nip-beneficjenta': nip, 'nazwa-udzielajacego-pomocy': 'Prezes Zakładu Ubezpieczeń Społecznych',
});

describe('pobranoZKonca', () => {
  it('znacznik z konca odpowiedzi; stara strona bez znacznika — null', () => {
    expect(pobranoZKonca(JSON.stringify({ 'liczba-wynikow': 0, wyniki: [], pobrano: P1 }))).toBe(P1);
    expect(pobranoZKonca(JSON.stringify({ 'liczba-wynikow': 0, wyniki: [] }))).toBeNull();
  });
});

describe('stronyZakresow', () => {
  it('strony w kolejnosci liczbowej (s10 po s2), zwykle i spakowane', () => {
    const z = stronyZakresow(['przyrost-2020-05-01-2020-05-03-s10.json.gz', 'przyrost-2020-05-01-2020-05-03-s2.json', 'przyrost-2020-05-01-2020-05-03-s1.json.gz', 'inne.json']);
    expect(z.get('2020-05-01..2020-05-03')).toEqual([
      'przyrost-2020-05-01-2020-05-03-s1.json.gz', 'przyrost-2020-05-01-2020-05-03-s2.json', 'przyrost-2020-05-01-2020-05-03-s10.json.gz',
    ]);
  });
});

describe('uzupelnijBezGminy — U6, 23.10.2026', () => {
  let katalog = '';
  afterEach(() => { if (katalog) rmSync(katalog, { recursive: true, force: true }); });

  it('bierze tylko zestaw stron, z ktorego dzien zostal zapisany; powtorzenie przez granice stron zostaje', () => {
    katalog = mkdtempSync(join(tmpdir(), 'bez-gminy-'));
    const db = new DatabaseSync(':memory:');
    zalozSchemat(db);
    const dzien = db.prepare('insert into pomoc_publiczna_dni(dzien, pobrano, pobrano_dzien, wierszy, bez_gminy) values (?,?,?,?,?)');
    dzien.run('2020-05-01', P1, '2026-10-19', 1, null); // z tego zestawu
    dzien.run('2020-05-02', P2, '2026-10-20', 0, null); // zapisany z INNEGO zestawu
    dzien.run('2020-05-03', P1, '2026-10-19', 0, 0); // juz policzony

    const nz = wiersz('2020-05-01', '1200000', '100.50');
    // Strona 1 pobrana wczesniej (P1), strona 2 pozniej — znacznik zakresu to P1.
    writeFileSync(join(katalog, 'przyrost-2020-05-01-2020-05-03-s1.json.gz'), gzipSync(JSON.stringify({
      'liczba-wynikow': 4, wyniki: [wiersz('2020-05-01', '1261011', '5'), nz, wiersz('2020-05-02', '1400000', '7')], pobrano: P1,
    })));
    writeFileSync(join(katalog, 'przyrost-2020-05-01-2020-05-03-s2.json'), JSON.stringify({
      'liczba-wynikow': 4, wyniki: [nz], pobrano: '2026-10-19T11:00:00.000Z',
    }));
    // Zestaw bez znacznika (stary plik) nie pasuje do niczego.
    writeFileSync(join(katalog, 'przyrost-2020-05-02-2020-05-02-s1.json'), JSON.stringify({
      'liczba-wynikow': 1, wyniki: [wiersz('2020-05-02', '1400000', '7')],
    }));

    const w = uzupelnijBezGminy(db, katalog, new Set(['126101']));
    expect(w).toEqual({ dniDoUzupelnienia: 2, uzupelnionych: 1, przypadkow: 2, bezZrodla: 1 });
    const dni = db.prepare('select dzien, bez_gminy, bez_gminy_brutto from pomoc_publiczna_dni order by dzien').all();
    expect(dni.map((d) => [d.dzien, d.bez_gminy, d.bez_gminy_brutto])).toEqual([
      ['2020-05-01', 2, 201], ['2020-05-02', null, null], ['2020-05-03', 0, null],
    ]);
    const wiersze = db.prepare('select wojewodztwo, klucz from pomoc_bez_gminy').all();
    expect(wiersze.map((x) => x.wojewodztwo)).toEqual(['12', '12']);
    expect(new Set(wiersze.map((x) => x.klucz)).size).toBe(2);
    // Gminny wiersz nie trafia do tabeli bez gminy.
    expect((db.prepare('select count(*) as c from pomoc_bez_gminy where kod_gminy_sudop = ?').get('1261011') as { c: number }).c).toBe(0);

    // Drugi przebieg nie ma czego robic i niczego nie dubluje.
    expect(uzupelnijBezGminy(db, katalog, new Set(['126101']))).toEqual({ dniDoUzupelnienia: 1, uzupelnionych: 0, przypadkow: 0, bezZrodla: 1 });
    expect((db.prepare('select count(*) as c from pomoc_bez_gminy').get() as { c: number }).c).toBe(2);
  });
});

describe('zapiszPrzyrost — przypadki bez gminy od 23.10.2026 trafiaja do bazy', () => {
  let katalog = '';
  afterEach(() => { if (katalog) rmSync(katalog, { recursive: true, force: true }); });

  it('gminne do pomoc_publiczna, bez gminy do pomoc_bez_gminy; dzien pamieta liczbe; odswiezenie nie dubluje', () => {
    katalog = mkdtempSync(join(tmpdir(), 'zapis-'));
    const db = new DatabaseSync(':memory:');
    zalozSchemat(db);
    writeFileSync(join(katalog, 'przyrost-2020-05-01-2020-05-02-s1.json'), JSON.stringify({
      'liczba-wynikow': 4,
      wyniki: [
        wiersz('2020-05-01', '1261011', '5'), wiersz('2020-05-01', '1200000', '100'),
        wiersz('2020-05-01', '0000000', '1'), wiersz('2020-05-02', '9999991', '3'),
      ],
      pobrano: P1,
    }));
    const znane = new Set(['126101']);
    const r = zapiszPrzyrost(db, katalog, '2020-05-01', '2020-05-02', 1, znane, P1, false);
    expect(r).toMatchObject({ zapisanych: 1, obce: 3 });
    const policz = (t: string) => (db.prepare(`select count(*) as c from ${t}`).get() as { c: number }).c;
    expect(policz('pomoc_publiczna')).toBe(1);
    expect(policz('pomoc_bez_gminy')).toBe(3);
    const dni = db.prepare('select dzien, wierszy, bez_gminy, bez_gminy_brutto from pomoc_publiczna_dni order by dzien').all();
    expect(dni.map((d) => [d.dzien, d.wierszy, d.bez_gminy, d.bez_gminy_brutto])).toEqual([
      ['2020-05-01', 1, 2, 101], ['2020-05-02', 0, 1, 3],
    ]);
    // Kod gminy spoza listy PKW (9999991) nie ma wojewodztwa — zostaje bez kodu.
    expect(db.prepare('select kod_gminy_sudop as k, wojewodztwo as w from pomoc_bez_gminy order by k').all().map((x) => [x.k, x.w]))
      .toEqual([['0000000', null], ['1200000', '12'], ['9999991', null]]);

    zapiszPrzyrost(db, katalog, '2020-05-01', '2020-05-02', 1, znane, P1, true);
    expect(policz('pomoc_publiczna')).toBe(1);
    expect(policz('pomoc_bez_gminy')).toBe(3);
  });
});
