/**
 * Zdanie porownawcze przy liczbie (F9 przebudowy, docs/przebudowa/runda-2.md).
 *
 * Krotnosc wobec punktu odniesienia poprawia zapamietanie i wykrywanie
 * blednych liczb (Barrio, Goldstein, Hofman, CHI 2016; badania-ux.md §3).
 * Liczona WYLACZNIE z naszych danych i bez slow oceniajacych (zasada 6):
 * „wiecej” i „mniej”, nigdy „lepiej” czy „za malo”.
 */

/** Ponizej tej roznicy mowimy „mniej wiecej tyle co” — 1,1 raza to szum, nie wiadomosc. */
const PROG = 1.15;

/** „1,4 raza”, „2 razy”, „2,5 raza” — ulamek bierze „raza”, liczba calkowita „razy”. */
export function ileRazy(krotnosc: number): string {
  const zaokr = krotnosc >= 10 ? Math.round(krotnosc) : Math.round(krotnosc * 10) / 10;
  const calkowita = Number.isInteger(zaokr);
  const tekst = calkowita ? String(zaokr) : zaokr.toFixed(1).replace('.', ',');
  return `${tekst} ${calkowita ? 'razy' : 'raza'}`;
}

/**
 * „3,4 raza więcej niż mediana w województwie.” — albo null, gdy porownania
 * nie da sie uczciwie podac (brak liczby, zero w mianowniku, zero w liczniku).
 * Zero w liczniku nie dostaje zdania: „nieskonczenie mniej” nic nie mowi,
 * a sama liczba 0 i mediana obok mowia wszystko.
 */
export function zdaniePorownania(wartosc: number | null, odniesienie: number | null, czego: string): string | null {
  if (wartosc === null || odniesienie === null || !(wartosc > 0) || !(odniesienie > 0)) return null;
  const r = wartosc / odniesienie;
  if (r >= PROG) return `${ileRazy(r)} więcej niż ${czego}.`;
  if (r <= 1 / PROG) return `${ileRazy(1 / r)} mniej niż ${czego}.`;
  return `Mniej więcej tyle, co ${czego}.`;
}
