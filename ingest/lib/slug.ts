/**
 * Adres posla. Musi byc TRWALY — raz opublikowany link ma dzialac zawsze,
 * takze gdy ktos zmieni nazwisko w rejestrze. Dlatego slug powstaje raz
 * i przy kolejnych importach nie jest nadpisywany (patrz job poslowie).
 *
 * Polskie znaki sprowadzamy do ASCII, bo adres z „ł" jest w praktyce
 * nieprzeklejalny — czesc komunikatorow go procentuje i link sie rozpada.
 * `ł` NIE rozklada sie przez NFD, wiec ma osobna mape.
 */
const OSOBNE: Record<string, string> = { ł: 'l', Ł: 'L', đ: 'd', ß: 'ss' };

export function slugifikuj(tekst: string): string {
  return tekst
    .replace(/[łŁđß]/g, (z) => OSOBNE[z] ?? z)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Imiennicy istnieja (w kadencji X jest kilka par tego samego nazwiska),
 * wiec slug musi sie rozstrzygac. Doklejamy identyfikator rejestrowy — nie
 * kolejny numer porzadkowy, bo ten zmienia sie przy kazdym imporcie
 * i uniewaznilby stare linki.
 */
export function slugPosla(imieNazwisko: string, zajete: ReadonlySet<string>, idRejestru: number): string {
  const podstawa = slugifikuj(imieNazwisko);
  if (!podstawa) return `posel-${idRejestru}`;
  if (!zajete.has(podstawa)) return podstawa;
  return `${podstawa}-${idRejestru}`;
}
