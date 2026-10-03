/**
 * Czy serwis ma byc indeksowany przez wyszukiwarki.
 *
 * Do 03.10.2026 decydowal o tym `robots: { index: false }` wpisany na stale
 * w `layout.tsx`, z komentarzem „zdjac dopiero na wyrazne polecenie". Dwie
 * rzeczy byly z tym nie tak:
 *
 * 1. `robots.txt` nie istnial wcale — adres oddawal nasza strone 404.
 *    Serwis mowil wiec „nie indeksuj" jednym kanalem (meta w HTML-u),
 *    a drugiego, ktory roboty czytaja PIERWSZY, nie mial.
 * 2. Zdjecie blokady wymagalo zmiany w kodzie w dwoch miejscach naraz.
 *    Rozjazd miedzy nimi to najgorszy mozliwy stan: `robots.txt` pozwala,
 *    meta zabrania (albo odwrotnie) i nie wiadomo, co serwis wlasciwie mowi.
 *
 * Teraz rozstrzyga jedna zmienna, a domyslnie jest WYLACZONE — bo decyzja
 * o premierze jest Pawla, nie skutkiem ubocznym wdrozenia:
 *
 *     sudo jawne ustaw JAWNE_INDEKSOWANIE     (wartosc: tak)
 *
 * Progu jawnosci to nie dotyczy. Ten stoi na `JAWNE_KONTAKT` (droga
 * sprzeciwu) i dziala niezaleznie — strona osoby fizycznej ma `noindex`
 * zawsze, takze po premierze.
 */
export const INDEKSOWANIE_WLACZONE = (process.env.JAWNE_INDEKSOWANIE?.trim() || '') === 'tak';
