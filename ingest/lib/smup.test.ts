import { describe, expect, it } from 'vitest';
import {
  adresDanych, MIARY, sprawdzPorcjeSmup, terytGminy, wartoscDoZapisu, wskaznikiDoPobrania,
  type WierszSmup,
} from './smup';

// Wpisy przepisane ze slownika SMUP (teryt-dictionary, 21.09.2026).
const BELCHATOW_MIASTO = { 'id-teryt': 1324, woj: '10', pow: '01', gmn: '01', rodz: '1', nazwa: 'Bełchatów', 'nazwa-dod': 'gmina miejska' };
const BELCHATOW_GMINA = { 'id-teryt': 1325, woj: '10', pow: '01', gmn: '02', rodz: '2', nazwa: 'Bełchatów', 'nazwa-dod': 'gmina wiejska' };
const POWIAT = { 'id-teryt': 154, woj: '10', pow: '01', nazwa: 'Powiat bełchatowski', 'nazwa-dod': 'powiat' };
const WOJEWODZTWO = { 'id-teryt': 6, woj: '12', nazwa: 'MAŁOPOLSKIE', 'nazwa-dod': 'województwo' };

describe('terytGminy', () => {
  it('sklada TERYT z woj, pow i gmn', () => {
    expect(terytGminy(BELCHATOW_MIASTO)).toBe('100101');
    expect(terytGminy(BELCHATOW_GMINA)).toBe('100102');
  });

  it('pomija jednostki, ktore nie sa gmina', () => {
    expect(terytGminy(POWIAT)).toBeNull();
    expect(terytGminy(WOJEWODZTWO)).toBeNull();
  });

  it('pomija rodzaje 4 i 5 — czesci gminy miejsko-wiejskiej (pulapka 30)', () => {
    expect(terytGminy({ ...BELCHATOW_GMINA, rodz: '4' })).toBeNull();
    expect(terytGminy({ ...BELCHATOW_GMINA, rodz: '5' })).toBeNull();
  });

  it('pomija dzielnice', () => {
    expect(terytGminy({ 'id-teryt': 1, woj: '14', pow: '65', gmn: '01', rodz: '8', 'nazwa-dod': 'dzielnica' })).toBeNull();
  });
});

describe('adresDanych', () => {
  it('sklada date jako RRRR1231 i trzyma sie maksymalnej strony', () => {
    const u = new URL(adresDanych(4074, 2023));
    expect(u.searchParams.get('id')).toBe('4074');
    expect(u.searchParams.get('id-daty')).toBe('20231231');
    expect(u.searchParams.get('page-size')).toBe('5000');
  });
});

describe('MIARY', () => {
  it('maja rozne klucze', () => {
    expect(new Set(MIARY.map((m) => m.klucz)).size).toBe(MIARY.length);
  });

  it('miary budzetowe maja wersje dla gmin i dla miast na prawach powiatu', () => {
    const dlug = MIARY.find((m) => m.klucz === 'dlug');
    expect(dlug?.zrodla).toEqual([4074, 4424]);
  });

  it('lista do pobrania nie powtarza wskaznikow', () => {
    const lista = wskaznikiDoPobrania();
    expect(new Set(lista).size).toBe(lista.length);
    expect(lista).toContain(10);
  });
});

const wiersz = (nadpisz: Partial<WierszSmup> = {}): WierszSmup => ({
  id: 4074, 'id-daty': 20231231, 'id-teryt': 1324, 'id-flaga': 1, wartosc: 1160.06, precyzja: 2, ...nadpisz,
});

describe('sprawdzPorcjeSmup', () => {
  it('przepuszcza poprawna porcje', () => {
    expect(sprawdzPorcjeSmup([wiersz()], 4074, 2023)).toEqual([]);
  });

  it('lapie porcje z innego wskaznika albo roku', () => {
    expect(sprawdzPorcjeSmup([wiersz({ id: 4044 })], 4074, 2023)[0]).toMatch(/wskaznik 4044/);
    expect(sprawdzPorcjeSmup([wiersz({ 'id-daty': 20221231 })], 4074, 2023)[0]).toMatch(/data 20221231/);
  });
});

describe('wartoscDoZapisu', () => {
  it('„zjawisko nie wystapilo” to zmierzone zero', () => {
    expect(wartoscDoZapisu(wiersz({ 'id-flaga': 2, wartosc: 0 }))).toBe(0);
  });

  it('„brak informacji albo tajemnica statystyczna” to null, nie zero', () => {
    expect(wartoscDoZapisu(wiersz({ 'id-flaga': 5, wartosc: 0 }))).toBeNull();
  });

  it('brak wartosci zostaje brakiem', () => {
    expect(wartoscDoZapisu(wiersz({ wartosc: null }))).toBeNull();
  });
});
