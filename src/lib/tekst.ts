/**
 * Tekst do porownywania: bez ogonkow, malymi literami.
 *
 * "ł" trzeba zamienic RECZNIE, bo nie rozklada sie przez NFD — i tak samo nie
 * rozklada go tokenizer FTS5 z `remove_diacritics`. Zmierzone: "marszalka"
 * nie znajdowal "Marszałka", a "zolta" nie znajdowal "Żółta", choc
 * "sygnalistow" znajdowal "sygnalistów" (bo "ó" sie rozklada). Dlatego indeks
 * i zapytanie przechodza przez te sama funkcje, zamiast polegac na tokenizerze.
 */
export function uprosc(t: string): string {
  return t
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Zapytanie do FTS5 z tokenizerem trygramowym.
 *
 * Kazde slowo jest osobna fraza w cudzyslowie (inaczej "-" albo "AND"
 * wpisane przez czytelnika zostalyby wykonane jako skladnia zapytania).
 * Slowa krotsze niz 3 znaki pomijamy: trygram ich nie indeksuje i zapytanie
 * z nimi zwraca zero wynikow — zmierzone na "po" i "od".
 */
export function zapytanieFts(fraza: string): string | null {
  const slowa = uprosc(fraza)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((s) => s.length >= 3)
    .map(rdzen);
  if (slowa.length === 0) return null;
  return slowa.map((s) => `"${s.replace(/"/g, '""')}"`).join(' AND ');
}

/**
 * Przyblizony rdzen slowa: ucinamy koncowke, a trygram dopasuje podciag.
 *
 * Bez tego "podatek" nie znajdowal "podatku", a "sygnalisci" — "sygnalistow"
 * (zmierzone: 0 wynikow). Supabase i SQLite nie maja polskiego slownika
 * odmiany, wiec to jest heurystyka, nie lematyzacja: slowa od 9 liter traca
 * trzy litery, od 7 dwie, od 5 jedna, krotsze nic. Nie zlapie wymian w rdzeniu
 * ("matka" -> "matek") i strona wyszukiwania mowi o tym wprost.
 * Liczby zostawiamy w calosci — numer druku ma pasowac dokladnie.
 */
export function rdzen(slowo: string): string {
  if (/^\d+$/.test(slowo)) return slowo;
  // Od 9 liter trzy: "lowiectwo" i "lowieckie" roznia sie juz przed koncowka.
  if (slowo.length >= 9) return slowo.slice(0, -3);
  if (slowo.length >= 7) return slowo.slice(0, -2);
  if (slowo.length >= 5) return slowo.slice(0, -1);
  return slowo;
}
