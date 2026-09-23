/**
 * Dzialy klasyfikacji budzetowej — nazwy takie, jak podaje rejestr.
 *
 * Nie skracamy ich i nie tlumaczymy na „ladniejsze": „Edukacyjna opieka
 * wychowawcza" brzmi urzedowo, bo tak nazywa sie ta pozycja w budzecie gminy
 * i pod taka nazwa czytelnik znajdzie ja w uchwale budzetowej swojej gminy.
 *
 * Lista jest krotsza niz pelna klasyfikacja (37 dzialow): bierzemy te, ktore
 * w gminach waza najwiecej. Reszta trafia na strone jako „pozostale dzialy",
 * policzona jako roznica wobec „ogolem" z tego samego zrodla — nigdy jako zero.
 */
export const NAZWY_DZIALOW: Record<string, string> = {
  '010': 'Rolnictwo i łowiectwo',
  '600': 'Transport i łączność',
  '700': 'Gospodarka mieszkaniowa',
  '750': 'Administracja publiczna',
  '754': 'Bezpieczeństwo publiczne i ochrona przeciwpożarowa',
  '757': 'Obsługa długu publicznego',
  '801': 'Oświata i wychowanie',
  '851': 'Ochrona zdrowia',
  '852': 'Pomoc społeczna',
  '854': 'Edukacyjna opieka wychowawcza',
  '855': 'Rodzina',
  '900': 'Gospodarka komunalna i ochrona środowiska',
  '921': 'Kultura i ochrona dziedzictwa narodowego',
  '926': 'Kultura fizyczna i sport',
};

/** Nazwa dzialu; nieznany kod zostaje kodem — nie zgadujemy, czym jest. */
export function nazwaDzialu(kod: string): string {
  return NAZWY_DZIALOW[kod] ?? `Dział ${kod}`;
}
