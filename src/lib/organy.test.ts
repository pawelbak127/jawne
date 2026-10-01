import { describe, expect, it } from 'vitest';
import { nazwaOrganu, organWykonawczyGminy } from './organy.js';

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

  it('NIE uznaje burmistrza SĄSIEDNIEJ gminy', () => {
    expect(organWykonawczyGminy('Burmistrz Miasta Zakopane', '121709', '120704')).toBe(false);
  });

  it('brak nazwy albo brak TERYT-u organu to nie, a nie zgadywanie', () => {
    expect(organWykonawczyGminy(null, '121709', '121709')).toBe(false);
    expect(organWykonawczyGminy('Burmistrz Miasta Zakopane', null, '121709')).toBe(false);
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
