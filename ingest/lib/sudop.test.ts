import { describe, expect, it } from 'vitest';
import { adresWyszukania, kodySudopGminy, kwota, poczatekOknaDanych, sprawdzPorcje, type PrzypadekPomocy } from './sudop';

// Kody przepisane ze slownika /slownik/gmina-siedziby (17.09.2026).
const SLOWNIK = [
  { number: '1001011', name: 'BEŁCHATÓW' },
  { number: '1001022', name: 'BEŁCHATÓW' },
  { number: '3021084', name: 'KOSTRZYN' },
  { number: '3021083', name: 'KOSTRZYN' },
  { number: '3021085', name: 'KOSTRZYN' },
  { number: '2800000', name: 'NZ' },
];

describe('kodySudopGminy', () => {
  it('miasto i gmina wiejska o tej samej nazwie maja rozne kody', () => {
    expect(kodySudopGminy('100101', SLOWNIK)).toEqual(['1001011']);
    expect(kodySudopGminy('100102', SLOWNIK)).toEqual(['1001022']);
  });

  it('gmina miejsko-wiejska daje trzy kody: gmina, miasto, obszar wiejski', () => {
    expect(kodySudopGminy('302108', SLOWNIK)).toEqual(['3021083', '3021084', '3021085']);
  });

  it('odrzuca TERYT, ktory nie ma 6 cyfr', () => {
    expect(() => kodySudopGminy('20101', SLOWNIK)).toThrow(/6 cyfr/);
  });
});

describe('adresWyszukania', () => {
  it('powtarza parametr gminy zamiast sklejac kody przecinkiem', () => {
    const u = new URL(adresWyszukania(['3021083', '3021084'], '2016-01-01'));
    expect(u.pathname).toBe('/sudop-api/api/przypadki-pomocy');
    expect(u.searchParams.getAll('gmina-siedziby-kod')).toEqual(['3021083', '3021084']);
    expect(u.searchParams.get('dzien-udzielenia-pomocy-od')).toBe('2016-01-01');
  });

  it('pilnuje formatu daty z instrukcji urzedu', () => {
    expect(() => adresWyszukania(['1001011'], '01.01.2016')).toThrow(/RRRR-MM-DD/);
  });
});

describe('poczatekOknaDanych', () => {
  it('to 1 stycznia roku n-10', () => {
    expect(poczatekOknaDanych(new Date('2026-09-17T12:00:00Z'))).toBe('2016-01-01');
  });
});

describe('kwota', () => {
  it('czyta kropke dziesietna', () => {
    expect(kwota('36878.61')).toBe(36878.61);
  });

  it('brak kwoty to null, a nie zero', () => {
    expect(kwota(null)).toBeNull();
    expect(kwota('')).toBeNull();
  });

  it('smieci rzucaja', () => {
    expect(() => kwota('36 878,61')).toThrow(/Nierozpoznana/);
  });
});

describe('sprawdzPorcje', () => {
  const w = (nadpis: Partial<PrzypadekPomocy>) => ({
    'gmina-siedziby-kod': '3021083',
    'dzien-udzielenia-pomocy': '2020-07-30',
    'wartosc-brutto-pln': '36878.61',
    'wartosc-nominalna-pln': '36878.61',
    ...nadpis,
  }) as PrzypadekPomocy;

  it('przepuszcza poprawna porcje', () => {
    expect(sprawdzPorcje([w({})], '302108')).toEqual([]);
  });

  it('lapie przypadek z innej gminy', () => {
    expect(sprawdzPorcje([w({ 'gmina-siedziby-kod': '1001011' })], '302108')[0]).toMatch(/1001011 zamiast 302108/);
  });

  it('lapie zla date i zla kwote', () => {
    const p = sprawdzPorcje([w({ 'dzien-udzielenia-pomocy': '30.07.2020', 'wartosc-brutto-pln': 'abc' })], '302108');
    expect(p).toHaveLength(2);
  });
});
