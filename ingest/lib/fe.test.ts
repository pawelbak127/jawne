import { describe, expect, it } from 'vitest';
import {
  czytajLokalizacje, dataZExcela, dopasujGmine, dopasujPowiat, indeksGmin, indeksPowiatow, sprawdzNaglowek, TERYT_WARSZAWY,
  walutaProgramu, wierszNaProjekt, type SegmentLokalizacji,
} from './fe';

// Zapisy lokalizacji przepisane z listy MFiPR 2021-2027 (nazwy miejsc, nie osob).
describe('czytajLokalizacje', () => {
  it('rozbija wiele miejsc realizacji', () => {
    const s = czytajLokalizacje('WOJ.: LUBELSKIE, POW.: Biała Podlaska, GM.: Biała Podlaska | WOJ.: PODLASKIE, POW.: zambrowski, GM.: Zambrów');
    expect(s).toEqual([
      { poziom: 'gmina', wojewodztwo: 'LUBELSKIE', powiat: 'Biała Podlaska', gmina: 'Biała Podlaska', wiejska: false },
      { poziom: 'gmina', wojewodztwo: 'PODLASKIE', powiat: 'zambrowski', gmina: 'Zambrów', wiejska: false },
    ]);
  });

  it('rozpoznaje dopisek gminy wiejskiej, takze uciety', () => {
    const [a] = czytajLokalizacje('WOJ.: WARMIŃSKO-MAZURSKIE, POW.: braniewski, GM.: Braniewo - Gmina wiejska');
    const [b] = czytajLokalizacje('WOJ.: WARMIŃSKO-MAZURSKIE, POW.: braniewski, GM.: Braniewo - Gmina wi');
    expect(a).toMatchObject({ gmina: 'Braniewo', wiejska: true });
    expect(b).toMatchObject({ gmina: 'Braniewo', wiejska: true });
  });

  it('rozpoznaje poziom kraju, wojewodztwa i powiatu', () => {
    expect(czytajLokalizacje('Cały Kraj')).toEqual([{ poziom: 'kraj' }]);
    expect(czytajLokalizacje('WOJ.: ŚLĄSKIE')).toEqual([{ poziom: 'wojewodztwo', wojewodztwo: 'ŚLĄSKIE' }]);
    expect(czytajLokalizacje('WOJ.: MAŁOPOLSKIE, POW.: nowosądecki')).toEqual([
      { poziom: 'powiat', wojewodztwo: 'MAŁOPOLSKIE', powiat: 'nowosądecki' },
    ]);
  });

  it('pomija puste zapisy zamiast tworzyc segment bez nazwy', () => {
    expect(czytajLokalizacje('WOJ.: | WOJ.,')).toEqual([]);
  });
});

// Gminy przepisane z pliku PKW (TERYT, nazwa, rodzaj, powiat, wojewodztwo).
const GMINY = indeksGmin([
  { teryt: '100101', nazwa: 'Bełchatów', rodzaj: 'miasto', powiat: 'bełchatowski', wojewodztwo: 'łódzkie' },
  { teryt: '100102', nazwa: 'Bełchatów', rodzaj: 'gmina', powiat: 'bełchatowski', wojewodztwo: 'łódzkie' },
  { teryt: '066101', nazwa: 'Biała Podlaska', rodzaj: 'miasto na prawach powiatu', powiat: 'Biała Podlaska', wojewodztwo: 'lubelskie' },
  { teryt: '060102', nazwa: 'Biała Podlaska', rodzaj: 'gmina', powiat: 'bialski', wojewodztwo: 'lubelskie' },
  { teryt: '101801', nazwa: 'Bolesławiec', rodzaj: 'gmina', powiat: 'wieruszowski', wojewodztwo: 'łódzkie' },
]);
const gm = (s: string) => czytajLokalizacje(s)[0] as Extract<SegmentLokalizacji, { poziom: 'gmina' }>;

describe('dopasujGmine', () => {
  it('nazwa bez dopisku przy imiennikach to miasto', () => {
    expect(dopasujGmine(gm('WOJ.: ŁÓDZKIE, POW.: bełchatowski, GM.: Bełchatów'), GMINY)).toBe('100101');
  });

  it('dopisek "Gmina wiejska" to gmina', () => {
    expect(dopasujGmine(gm('WOJ.: ŁÓDZKIE, POW.: bełchatowski, GM.: Bełchatów - Gmina wiejska'), GMINY)).toBe('100102');
  });

  it('powiat rozstrzyga miasto na prawach powiatu i gmine w innym powiecie', () => {
    expect(dopasujGmine(gm('WOJ.: LUBELSKIE, POW.: Biała Podlaska, GM.: Biała Podlaska'), GMINY)).toBe('066101');
    expect(dopasujGmine(gm('WOJ.: LUBELSKIE, POW.: bialski, GM.: Biała Podlaska'), GMINY)).toBe('060102');
  });

  it('wielkosc liter i ogonki nie przeszkadzaja', () => {
    expect(dopasujGmine(gm('WOJ.: ŁÓDZKIE, POW.: wieruszowski, GM.: BOLESLAWIEC'), GMINY)).toBe('101801');
  });

  it('Warszawa trafia do m.st. Warszawy, nie do dzielnicy', () => {
    expect(dopasujGmine(gm('WOJ.: MAZOWIECKIE, POW.: Warszawa, GM.: Warszawa'), GMINY)).toBe(TERYT_WARSZAWY);
  });

  it('brak pewnosci to null, nie zgadywanie', () => {
    expect(dopasujGmine(gm('WOJ.: ŁÓDZKIE, POW.: bełchatowski, GM.: Nieistniejąca'), GMINY)).toBeNull();
  });
});

describe('dopasujPowiat', () => {
  const POWIATY = indeksPowiatow([
    { teryt: '100101', nazwa: 'Bełchatów', rodzaj: 'miasto', powiat: 'bełchatowski', wojewodztwo: 'łódzkie' },
    { teryt: '100102', nazwa: 'Bełchatów', rodzaj: 'gmina', powiat: 'bełchatowski', wojewodztwo: 'łódzkie' },
    { teryt: '126101', nazwa: 'Kraków', rodzaj: 'miasto na prawach powiatu', powiat: 'Kraków', wojewodztwo: 'małopolskie' },
  ]);

  it('zwykly powiat daje kod powiatu, ale nie gmine', () => {
    expect(dopasujPowiat('ŁÓDZKIE', 'bełchatowski', POWIATY)).toEqual({ kod: '1001', gminaMiasto: null });
  });

  it('miasto na prawach powiatu jest jednoczesnie gmina', () => {
    expect(dopasujPowiat('MAŁOPOLSKIE', 'Kraków', POWIATY)).toEqual({ kod: '1261', gminaMiasto: '126101' });
  });

  it('Warszawa to m.st. Warszawa', () => {
    expect(dopasujPowiat('MAZOWIECKIE', 'Warszawa', POWIATY)).toEqual({ kod: '1465', gminaMiasto: TERYT_WARSZAWY });
  });

  it('nieznany powiat to null', () => {
    expect(dopasujPowiat('ŁÓDZKIE', 'nieistniejący', POWIATY)).toBeNull();
  });
});

describe('dataZExcela', () => {
  it('liczy od 1899-12-30', () => {
    expect(dataZExcela(45566.083333333336)).toBe('2024-10-01');
    expect(dataZExcela(44927)).toBe('2023-01-01');
  });
  it('brak daty to null', () => {
    expect(dataZExcela('')).toBeNull();
    expect(dataZExcela(null)).toBeNull();
  });
});

describe('walutaProgramu', () => {
  it('Interreg 2014-2020 jest w euro', () => {
    expect(walutaProgramu('2014-2020', 'Program Współpracy Interreg V-A Polska – Słowacja')).toBe('EUR');
    expect(walutaProgramu('2014-2020', 'Program Operacyjny Infrastruktura i Środowisko')).toBe('PLN');
    expect(walutaProgramu('2021-2027', 'Interreg Polska – Słowacja')).toBe('PLN');
  });
});

describe('uklad kolumn', () => {
  it('rozpoznaje zmieniony naglowek', () => {
    const naglowek = [null, 'Nazwa projektu/ Project name', '', '', 'Nazwa beneficjenta/ Beneficiary name'];
    expect(sprawdzNaglowek('2021-2027', naglowek).length).toBeGreaterThan(0);
  });

  it('twarda spacja w naglowku nie jest zmiana ukladu', () => {
    const n: unknown[] = [];
    n[1] = 'Nazwa projektu/ Project name'; n[4] = 'Nazwa beneficjenta/ Beneficiary name';
    n[12] = 'Wartość projektu (w zł)/ Total'; n[14] = 'Dofinansowanie z UE (w zł)/ EU';
    n[16] = 'Miejsce realizacji projektu/ Project location';
    expect(sprawdzNaglowek('2021-2027', n)).toEqual([]);
  });

  it('czyta wiersz 2021-2027', () => {
    const v: unknown[] = [];
    v[1] = 'Tytuł'; v[3] = 'UM-1'; v[4] = 'Gmina Przykład'; v[7] = 'EFRR'; v[9] = 'Program';
    v[12] = 1000.5; v[14] = 800; v[16] = 'Cały Kraj'; v[17] = 44927; v[18] = 45000;
    expect(wierszNaProjekt('2021-2027', v)).toMatchObject({
      tytul: 'Tytuł', beneficjent: 'Gmina Przykład', wartosc: 1000.5, dofinansowanieUe: 800,
      waluta: 'PLN', poczatek: '2023-01-01', lokalizacja: 'Cały Kraj',
    });
  });
});
