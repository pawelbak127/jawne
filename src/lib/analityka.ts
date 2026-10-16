/**
 * Analityka bez ciasteczek (Umami) — WYLACZONA, dopoki nie ma identyfikatora.
 *
 * Decyzja Pawla z 16.10.2026: zaczynamy od bezplatnego Umami; konto zaklada
 * Pawel. Kod jest gotowy wczesniej, zeby wlaczenie bylo jednym ustawieniem
 * (`JAWNE_UMAMI_ID`), ALE przed wlaczeniem trzeba uzupelnic polityke
 * prywatnosci: dzis mowi ona, ze nie uruchamiamy w przegladarce zadnej
 * analityki — i to musi byc prawda w kazdej chwili. Region przechowywania
 * danych Umami Cloud sprawdzamy przy zakladaniu konta, nie zgadujemy.
 *
 * Identyfikator strony to UUID; inna wartosc jest ignorowana (nie trafia do
 * HTML-a), zeby literowka w pliku ustawien nie wstawila czegos dziwnego.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function identyfikatorUmami(env: Record<string, string | undefined> = process.env): string | null {
  const id = env.JAWNE_UMAMI_ID?.trim() || '';
  return UUID.test(id) ? id : null;
}

/** Adres skryptu; tylko https, domyslnie chmura Umami. */
export function skryptUmami(env: Record<string, string | undefined> = process.env): string {
  const adres = env.JAWNE_UMAMI_SKRYPT?.trim() || '';
  return /^https:\/\/[^\s"'<>]+$/.test(adres) ? adres : 'https://cloud.umami.is/script.js';
}
