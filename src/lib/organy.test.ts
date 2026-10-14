import { describe, expect, it } from 'vitest';
import { gminaOrganu, nazwaOrganu, rodzajOrganu, type GminaWykazu } from './organy.js';

const G: GminaWykazu[] = [
  { teryt: '260701', nazwa: 'Ostrowiec Świętokrzyski', rodzaj: 'miasto', wojewodztwo: 'świętokrzyskie' },
  { teryt: '260702', nazwa: 'Bodzechów', rodzaj: 'gmina', wojewodztwo: 'świętokrzyskie' },
  { teryt: '106101', nazwa: 'Łódź', rodzaj: 'miasto na prawach powiatu', wojewodztwo: 'łódzkie' },
  { teryt: '106305', nazwa: 'Nowosolna', rodzaj: 'gmina', wojewodztwo: 'łódzkie' },
  { teryt: '121301', nazwa: 'Oświęcim', rodzaj: 'miasto', wojewodztwo: 'małopolskie' },
  { teryt: '121306', nazwa: 'Oświęcim', rodzaj: 'gmina', wojewodztwo: 'małopolskie' },
  { teryt: '200806', nazwa: 'Mońki', rodzaj: 'gmina', wojewodztwo: 'podlaskie' },
  { teryt: '221002', nazwa: 'Nowy Dwór Gdański', rodzaj: 'gmina', wojewodztwo: 'pomorskie' },
  { teryt: '041701', nazwa: 'Wąbrzeźno', rodzaj: 'miasto', wojewodztwo: 'kujawsko-pomorskie' },
  { teryt: '041705', nazwa: 'Ryńsk', rodzaj: 'gmina', wojewodztwo: 'kujawsko-pomorskie' },
  { teryt: '281401', nazwa: 'Ryn', rodzaj: 'gmina', wojewodztwo: 'warmińsko-mazurskie' },
  { teryt: '100101', nazwa: 'Bełchatów', rodzaj: 'miasto', wojewodztwo: 'łódzkie' },
  { teryt: '100102', nazwa: 'Bełchatów', rodzaj: 'gmina', wojewodztwo: 'łódzkie' },
  { teryt: '021101', nazwa: 'Lubin', rodzaj: 'miasto', wojewodztwo: 'dolnośląskie' },
  { teryt: '021102', nazwa: 'Lubin', rodzaj: 'gmina', wojewodztwo: 'dolnośląskie' },
  { teryt: '121709', nazwa: 'Zakopane', rodzaj: 'miasto', wojewodztwo: 'małopolskie' },
  { teryt: '026401', nazwa: 'Wrocław', rodzaj: 'miasto na prawach powiatu', wojewodztwo: 'dolnośląskie' },
  { teryt: '120704', nazwa: 'Kamienica', rodzaj: 'gmina', wojewodztwo: 'małopolskie' },
  { teryt: '246401', nazwa: 'Tychy', rodzaj: 'miasto na prawach powiatu', wojewodztwo: 'śląskie' },
  { teryt: '120701', nazwa: 'Limanowa', rodzaj: 'miasto', wojewodztwo: 'małopolskie' },
];
const M = new Map(G.map((g) => [g.teryt, g]));

/** Czy organ jest organem TEJ gminy — tak, jak pyta strona gminy (przez `organy_gmin`). */
const organWykonawczyGminy = (nazwa: string | null, terytOrganu: string | null, terytGminy: string) =>
  nazwa !== null && gminaOrganu(nazwa, terytOrganu, M) === terytGminy;


describe('organWykonawczyGminy', () => {
  it('rozpoznaje wójta, burmistrza i prezydenta tej gminy', () => {
    // Wszystkie trzy zapisy sa w rejestrze doslownie.
    expect(organWykonawczyGminy('Burmistrz Miasta Zakopane', '121709', '121709')).toBe(true);
    expect(organWykonawczyGminy('Prezydent Miasta Bełchatów', '100101', '100101')).toBe(true);
    expect(organWykonawczyGminy('Prezydent Wrocławia', '026401', '026401')).toBe(true);
    expect(organWykonawczyGminy('Wójt Gminy Kamienica', '120704', '120704')).toBe(true);
    expect(organWykonawczyGminy('PREZYDENT MIASTA TYCHY', '246401', '246401')).toBe(true);
  });

  it('NIE uznaje instytucji krajowej z siedzibą w tej gminie — to był mój błąd', () => {
    // ZMIERZONE: na stronie Warszawy ZUS, PFRON i BGK wyszly jako „organ tej
    // gminy", bo maja tam siedzibe. Sam TERYT tego nie rozdziela.
    for (const n of [
      'ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH',
      'PAŃSTWOWY FUNDUSZ REHABILITACJI OSÓB NIEPEŁNOSPRAWNYCH',
      'BANK GOSPODARSTWA KRAJOWEGO',
      'ZARZĄDCA ROZLICZEŃ SPÓŁKA AKCYJNA',
    ]) {
      expect(organWykonawczyGminy(n, '146501', '146501')).toBe(false);
    }
  });

  it('NIE uznaje starosty — to organ POWIATU, a takich jest 282', () => {
    expect(organWykonawczyGminy('Starosta Powiatu Limanowskiego', '120701', '120701')).toBe(false);
    expect(organWykonawczyGminy('Marszałek Województwa Łódzkiego', '106101', '106101')).toBe(false);
  });

  it('wójt gminy wiejskiej z urzędem w mieście obok — jej organ, nie miasta (do 14.10.2026 odwrotnie)', () => {
    expect(organWykonawczyGminy('Wójt Gminy Bodzechów', '260701', '260702')).toBe(true);
    expect(organWykonawczyGminy('Wójt Gminy Bodzechów', '260701', '260701')).toBe(false);
  });

  it('NIE uznaje burmistrza SĄSIEDNIEJ gminy', () => {
    expect(organWykonawczyGminy('Burmistrz Miasta Zakopane', '121709', '120704')).toBe(false);
  });

  it('brak nazwy to nie; brak TERYT-u organu rozstrzyga tylko jednoznaczna nazwa', () => {
    expect(organWykonawczyGminy(null, '121709', '121709')).toBe(false);
    // Jedno Zakopane w kraju — bez siedziby z REGON i tak wiadomo, czyje to.
    expect(organWykonawczyGminy('Burmistrz Miasta Zakopane', null, '121709')).toBe(true);
    // Dwa Belchatowy — bez siedziby nie zgadujemy.
    expect(organWykonawczyGminy('Burmistrz Gminy Bełchatów', null, '100102')).toBe(false);
  });

  it('nie łapie słowa, które tylko zaczyna się tak samo', () => {
    // Granica wyrazu: „Prezydentura…" albo „Wojtek…" nie jest organem gminy.
    expect(organWykonawczyGminy('WOJTEK NOWAK USŁUGI', '121709', '121709')).toBe(false);
    expect(organWykonawczyGminy('BURMISTRZOWSKA SPÓŁKA Z O.O.', '121709', '121709')).toBe(false);
  });
});

describe('nazwaOrganu', () => {
  it('pierwszeństwo ma zapis z SUDOP, bo mówi KTO wydał decyzję', () => {
    expect(nazwaOrganu('Burmistrz Miasta Zakopane', 'GMINA ZAKOPANE')).toBe('Burmistrz Miasta Zakopane');
  });

  it('bez zapisu z SUDOP zostaje nazwa z REGON', () => {
    expect(nazwaOrganu(null, 'GMINA ZAKOPANE')).toBe('GMINA ZAKOPANE');
    expect(nazwaOrganu('   ', 'GMINA ZAKOPANE')).toBe('GMINA ZAKOPANE');
  });

  it('bez żadnej nazwy oddaje pusty napis, a nie „undefined”', () => {
    expect(nazwaOrganu(null, null)).toBe('');
  });
});

describe('rodzajOrganu', () => {
  it.each([['Wójt Gminy Komorniki', 'wojt'], ['BURMISTRZ BŁONIA', 'burmistrz'], ['Prezydent Wrocławia', 'prezydent'],
    ['Prezes Zarządu PFRON', null], ['Starosta Powiatu Bełchatów', null]])('%s', (n, r) => {
    expect(rodzajOrganu(n)).toBe(r);
  });
});

describe('gminaOrganu — przypadki zmierzone na serwerze 14.10.2026', () => {
  it('siedziba z REGON zgodna z nazwa i rodzajem: przyjeta, takze przy odmianie', () => {
    expect(gminaOrganu('Burmistrz Moniek', '200806', M)).toBe('200806');
    expect(gminaOrganu('BURMISTRZ NOWEGO DWORU GDAŃSKIEGO', '221002', M)).toBe('221002');
    expect(gminaOrganu('PREZYDENT MIASTA OŚWIĘCIM', '121301', M)).toBe('121301');
    expect(gminaOrganu('WÓJT GMINY OŚWIĘCIM', '121306', M)).toBe('121306');
  });

  it('urzad gminy wiejskiej z siedziba w miescie obok: wlasciwa gmina z nazwy, nie miasto', () => {
    expect(gminaOrganu('Wójt Gminy Bodzechów', '260701', M)).toBe('260702');
    expect(gminaOrganu('Wójt Gminy Nowosolna', '106101', M)).toBe('106305');
    expect(gminaOrganu('Wójt Gminy Ryńsk', '041701', M)).toBe('041705');
  });

  it('wojt przy siedzibie w miescie o tej samej nazwie trafia w gmine wiejska', () => {
    expect(gminaOrganu('Wójt Gminy Bełchatów', '100101', M)).toBe('100102');
    expect(gminaOrganu('Wójt Gminy Oświęcim', '121301', M)).toBe('121306');
  });

  it('prezydent z kodem gminy wiejskiej o tej samej nazwie — miasto, także w dopełniaczu', () => {
    expect(gminaOrganu('Prezydent Miasta Lubina', '021102', M)).toBe('021101');
  });

  it('Warszawa — strona miasta, choc w wykazie sa dzielnice', () => {
    expect(gminaOrganu('Prezydent Miasta Stołecznego Warszawy', '146501', M)).toBe('146501');
  });

  it('niepewne zostaje bez gminy: brak siedziby i niejednoznaczna nazwa, organ nie-gminny', () => {
    expect(gminaOrganu('Burmistrz Bełchatowa', null, M)).toBeNull(); // odmiana bez siedziby: nie zgadujemy
    expect(gminaOrganu('Burmistrz Gminy Bełchatów', null, M)).toBeNull(); // dwa Bełchatowy w kraju
    expect(gminaOrganu('Starosta Powiatu Bełchatów', '100101', M)).toBeNull();
    expect(gminaOrganu('Wójt Gminy Nieistniejąca', null, M)).toBeNull();
  });

  it('cale slowa: „Ryn” nie trafia w „Ryńsk”', () => {
    expect(gminaOrganu('Wójt Gminy Ryńsk', null, M)).toBe('041705');
  });
});
