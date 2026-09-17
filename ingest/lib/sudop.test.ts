import { describe, expect, it } from 'vitest';
import {
  adresPrzyrostu, adresWyszukania, kluczePorcji, kluczPrzypadku, kodySudopGminy, kwota, poczatekOknaDanych,
  sprawdzPorcje, sprawdzPorcjePrzyrostu, terytGminyZKodu, terytZKoduSudop, type PrzypadekPomocy,
} from './sudop';

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

describe('adresPrzyrostu', () => {
  it('powtarza kod formy pomocy i podaje oba konce zakresu', () => {
    const u = new URL(adresPrzyrostu(['A1.1', 'A2.5'], '2026-09-15', '2026-09-15'));
    expect(u.searchParams.getAll('forma-pomocy-kod')).toEqual(['A1.1', 'A2.5']);
    expect(u.searchParams.get('dzien-udzielenia-pomocy-od')).toBe('2026-09-15');
    expect(u.searchParams.get('dzien-udzielenia-pomocy-do')).toBe('2026-09-15');
    expect(u.searchParams.get('strona')).toBe('1');
  });

  // Zmierzone: API odrzuca zapytanie o same daty (HTTP 400), wiec pusta lista
  // form nie ma prawa wyjsc na siec.
  it('nie wypuszcza zapytania o same daty', () => {
    expect(() => adresPrzyrostu([], '2026-09-15', '2026-09-15')).toThrow(/form pomocy/);
  });

  it('lapie odwrocony zakres i zly format daty', () => {
    expect(() => adresPrzyrostu(['A1.1'], '2026-09-16', '2026-09-15')).toThrow(/odwrocony/);
    expect(() => adresPrzyrostu(['A1.1'], '15.09.2026', '2026-09-15')).toThrow(/RRRR-MM-DD/);
  });
});

describe('terytZKoduSudop', () => {
  it('ucina cyfre rodzaju gminy', () => {
    expect(terytZKoduSudop('1001011')).toBe('100101');
    expect(terytZKoduSudop('3021085')).toBe('302108');
  });

  it('odrzuca kod o innej dlugosci', () => {
    expect(terytZKoduSudop('100101')).toBeNull();
    expect(terytZKoduSudop(null)).toBeNull();
  });
});

describe('kluczPrzypadku', () => {
  const w = (nadpis: Partial<PrzypadekPomocy> = {}) => ({
    'gmina-siedziby-kod': '1001011',
    'dzien-udzielenia-pomocy': '2026-09-15',
    'nip-beneficjenta': '7791011327',
    'wartosc-brutto-pln': '36878.61',
    ...nadpis,
  }) as PrzypadekPomocy;

  it('ten sam przypadek daje ten sam klucz, niezaleznie od kolejnosci pol', () => {
    const a = w();
    const b = { 'wartosc-brutto-pln': '36878.61', 'nip-beneficjenta': '7791011327', 'dzien-udzielenia-pomocy': '2026-09-15', 'gmina-siedziby-kod': '1001011' } as PrzypadekPomocy;
    expect(kluczPrzypadku(a)).toBe(kluczPrzypadku(b));
  });

  it('roznica w jednym polu zmienia klucz', () => {
    expect(kluczPrzypadku(w())).not.toBe(kluczPrzypadku(w({ 'wartosc-brutto-pln': '36878.62' })));
  });
});

describe('sprawdzPorcjePrzyrostu', () => {
  const w = (nadpis: Partial<PrzypadekPomocy> = {}) => ({
    'gmina-siedziby-kod': '1001011',
    'dzien-udzielenia-pomocy': '2026-09-15',
    'wartosc-brutto-pln': '1000.00',
    'wartosc-nominalna-pln': '1000.00',
    ...nadpis,
  }) as PrzypadekPomocy;

  it('przepuszcza porcje z zakresu', () => {
    expect(sprawdzPorcjePrzyrostu([w()], '2026-09-01', '2026-09-15')).toEqual([]);
  });

  it('lapie date spoza zakresu', () => {
    expect(sprawdzPorcjePrzyrostu([w()], '2026-09-01', '2026-09-14')[0]).toMatch(/spoza zakresu/);
  });

  it('lapie kod gminy, ktorego nie da sie przelozyc na TERYT', () => {
    expect(sprawdzPorcjePrzyrostu([w({ 'gmina-siedziby-kod': 'NZ' })], '2026-09-01', '2026-09-15')[0]).toMatch(/kod gminy/);
  });
});

describe('kluczePorcji', () => {
  const w = (kwotaBrutto: string) => ({
    'gmina-siedziby-kod': '1001011',
    'dzien-udzielenia-pomocy': '2026-09-15',
    'nip-beneficjenta': '7791011327',
    'wartosc-brutto-pln': kwotaBrutto,
  }) as PrzypadekPomocy;

  // Zrodlo ma prawdziwe powtorzenia (osobne transze tej samej pomocy tego
  // samego dnia) — klucz musi je rozroznic, inaczej import zanizy sume.
  it('rozroznia identyczne wiersze numerem w grupie', () => {
    const k = kluczePorcji([w('1550'), w('1550'), w('1550')]);
    expect(new Set(k).size).toBe(3);
    expect(k.map((x) => x.split('#')[1])).toEqual(['0', '1', '2']);
  });

  it('ta sama porcja daje te same klucze przy powtorzonym imporcie', () => {
    const porcja = [w('1550'), w('200'), w('1550')];
    expect(kluczePorcji(porcja)).toEqual(kluczePorcji([...porcja]));
  });

  it('rozne kwoty maja rozne skroty', () => {
    const [a, b] = kluczePorcji([w('1550'), w('200')]);
    expect(a!.split('#')[0]).not.toBe(b!.split('#')[0]);
  });
});

describe('terytGminyZKodu', () => {
  // Zmierzone na slowniku SUDOP i na porcji krajowej z 15.09.2026.
  it('dzielnica Warszawy i cale miasto ida pod jeden TERYT', () => {
    expect(terytGminyZKodu('1465011')).toBe('146501');
    expect(terytGminyZKodu('1465028')).toBe('146501');
  });

  it('delegatura wraca do miasta macierzystego', () => {
    expect(terytGminyZKodu('1061039')).toBe('106101');
    expect(terytGminyZKodu('0264029')).toBe('026401');
  });

  it('zwykla gmina to pierwsze szesc cyfr', () => {
    expect(terytGminyZKodu('1001011')).toBe('100101');
    expect(terytGminyZKodu('3021085')).toBe('302108');
  });

  it('jednostka bez gminy (rodzaj 0) nie ma TERYT-u', () => {
    expect(terytGminyZKodu('2800000')).toBeNull();
    expect(terytGminyZKodu('100101')).toBeNull();
  });
});

describe('kodySudopGminy — miasta z czesciami', () => {
  const SLOWNIK_MIASTA = [
    { number: '1465011', name: 'WARSZAWA' },
    { number: '1465028', name: 'BEMOWO' },
    { number: '1465038', name: 'BIAŁOŁĘKA' },
    { number: '1061011', name: 'ŁÓDŹ' },
    { number: '1061039', name: 'ŁÓDŹ-GÓRNA' },
    { number: '1001011', name: 'BEŁCHATÓW' },
  ];

  it('Warszawa pyta tez o dzielnice', () => {
    expect(kodySudopGminy('146501', SLOWNIK_MIASTA)).toEqual(['1465011', '1465028', '1465038']);
  });

  it('Lodz pyta tez o delegatury', () => {
    expect(kodySudopGminy('106101', SLOWNIK_MIASTA)).toEqual(['1061011', '1061039']);
  });

  it('zwykle miasto pyta tylko o siebie', () => {
    expect(kodySudopGminy('100101', SLOWNIK_MIASTA)).toEqual(['1001011']);
  });
});
