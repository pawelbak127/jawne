/**
 * Kwoty z TED bywaja bledne o trzy rzedy wielkosci — i to bledy ZAMAWIAJACEGO,
 * nie nasze.
 *
 * ZMIERZONE 24.09.2026 na 114 889 polskich ogloszeniach z kwota w zlotych:
 *
 *   257 562 861 720 000 zl  — „utrzymanie torow kolejowych” (235172-2026),
 *                             czyli 85 razy wiecej niz roczny PKB Polski,
 *    34 400 000 000 zl      — bezgotowkowy zakup paliw dla MPO (214475-2026),
 *   ... 2 ogloszenia powyzej biliona, 24 powyzej 10 mld, 222 powyzej miliarda.
 *
 * Wartosci pojedynczych ofert w tych ogloszeniach sumuja sie do tej samej
 * nierealnej kwoty, wiec to nie jest blad odczytu po naszej stronie.
 *
 * Jedna taka pozycja zamienia sume gminy w bezsens (Warszawa: 257 752 mld zl).
 * Dlatego kwoty powyzej progu NIE wchodza do sum — ale ich nie ukrywamy:
 * strona podaje, ile ich bylo, i pokazuje je z odnosnikiem do ogloszenia.
 *
 * PROG JEST NASZ, nie rejestru, i tak go opisujemy. 10 mld zl to wiecej niz
 * roczne wydatki majatkowe najwiekszego polskiego miasta — pojedyncze
 * zamowienie tej wielkosci istnieje, ale jest na tyle rzadkie, ze lepiej
 * pokazac je osobno niz wtopic w sume razem z pomylka o trzy zera.
 */
export const PROG_PODEJRZANEJ_KWOTY = 10_000_000_000;

/** Czy kwota ogloszenia jest na tyle duza, ze pokazujemy ja osobno. */
export function kwotaPodejrzana(wartosc: number | null, waluta: string | null): boolean {
  if (wartosc === null || waluta !== 'PLN') return false;
  return wartosc > PROG_PODEJRZANEJ_KWOTY;
}
