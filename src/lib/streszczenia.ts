/**
 * Streszczenia ustaw „po ludzku" — bezpiecznik przed publikacja.
 *
 * Streszczenie pisze model jezykowy na podstawie opisu z rejestru Sejmu
 * (`procesy.opis`). Model potrafi dopisac cos, czego w zrodle nie ma —
 * najgrozniej liczbe: kwote, prog, termin. Dlatego KAZDY ciag cyfr ze
 * streszczenia musi dokladnie wystepowac w tekscie rejestru. Inaczej
 * streszczenie odpada i strona pokazuje sam opis rejestru.
 *
 * ZMIERZONE NA PRZYKLADZIE (03.10.2026, druk 1040): przy „swiadczeniu
 * wychowawczym" kusi dopisac „800+", bo tak sie o nim mowi. Tej liczby nie
 * ma w opisie rejestru — i bezpiecznik ma ja odrzucic, bo to bylby nasz
 * dopisek, a nie tresc rejestru.
 *
 * Porownujemy ciagi cyfr, nie liczby: „10 000" w zrodle to „10" i „000",
 * wiec streszczenie z „10 000" przechodzi, a z „10000" — nie. Ostrozniej
 * w strone odrzucenia: zle odrzucone streszczenie kosztuje tylko to, ze
 * czytelnik zobaczy sam opis rejestru.
 */

const CYFRY = /\d+/g;

export function ciagiCyfr(tekst: string): string[] {
  return tekst.match(CYFRY) ?? [];
}

export const MAKS_DLUGOSC = 700;

export type WynikSprawdzenia = { ok: boolean; bledy: string[] };

export function sprawdzStreszczenie(streszczenie: string, zrodlo: string): WynikSprawdzenia {
  const bledy: string[] = [];
  const tekst = streszczenie.trim();
  if (!tekst) bledy.push('puste streszczenie');
  if (tekst.length > MAKS_DLUGOSC) bledy.push(`za dlugie: ${tekst.length} znakow (najwyzej ${MAKS_DLUGOSC})`);
  const wZrodle = new Set(ciagiCyfr(zrodlo));
  const obce = [...new Set(ciagiCyfr(tekst))].filter((c) => !wZrodle.has(c));
  if (obce.length) bledy.push(`liczby spoza tekstu rejestru: ${obce.join(', ')}`);
  return { ok: bledy.length === 0, bledy };
}
