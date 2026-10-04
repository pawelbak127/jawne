/**
 * Wystapienia na sali — drobiazgi dla strony, bez dostepu do bazy.
 */

/** Adres tresci jednego wystapienia w rejestrze (HTML) — odnosnik przy pozycji (zasada 1). */
export const adresWystapienia = (posiedzenie: number, dzien: string, numer: number) =>
  `https://api.sejm.gov.pl/sejm/term10/proceedings/${posiedzenie}/${dzien}/transcripts/${numer}`;

/**
 * Czas trwania wystapienia w minutach, z dwoch znacznikow rejestru.
 *
 * `null`, gdy ktoregos brakuje — tak jest przy KAZDYM wystapieniu zlozonym
 * tylko na pismie (zmierzone 03.10.2026: 61 z 61 na jednym dniu) — i gdy
 * koniec jest przed poczatkiem. Polpauza, nie zero (zasada 4): zero minut
 * znaczyloby, ze zmierzylismy wystapienie, ktore nie trwalo.
 */
export function minutyWystapienia(poczatek: string | null, koniec: string | null): number | null {
  if (!poczatek || !koniec) return null;
  const a = Date.parse(poczatek);
  const b = Date.parse(koniec);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60_000);
}

/** „4 min", „poniżej minuty" albo null. */
export function opisCzasu(minuty: number | null): string | null {
  if (minuty === null) return null;
  return minuty < 1 ? 'poniżej minuty' : `${minuty} min`;
}
