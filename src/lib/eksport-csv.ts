/**
 * CSV do pobrania przez czytelnika.
 *
 * DECYZJA: format pod polskiego Excela, nie pod RFC 4180 — czytelnikiem jest
 * dziennikarz albo radny z Excelem, nie program:
 *  - separator ";" (polski Excel przy "," wkleja wszystko do jednej kolumny),
 *  - przecinek dziesietny ("1234,56"; kropke polski Excel bierze za tekst
 *    albo date),
 *  - UTF-8 z BOM (bez BOM Excel psuje polskie litery),
 *  - konce linii CRLF.
 * Programy czytajace CSV i tak musza znac separator; napis przy linku mowi,
 * jaki to format.
 */

export type Komorka = string | number | null | undefined;

const BOM = '﻿';

function komorka(w: Komorka): string {
  if (w === null || w === undefined) return '';
  // null != 0: pusta komorka to brak wartosci, a nie zero.
  const tekst = typeof w === 'number'
    ? (Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100).replace('.', ','))
    : w;
  return /[";\r\n]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

export function doCsv(naglowki: readonly string[], wiersze: readonly (readonly Komorka[])[]): string {
  const linie = [naglowki, ...wiersze].map((w) => w.map(komorka).join(';'));
  return `${BOM}${linie.join('\r\n')}\r\n`;
}

/** Nazwa pliku bez polskich znakow i spacji — rozne systemy roznie je obsluguja. */
export function nazwaPliku(...czesci: string[]): string {
  const bezOgonkow = czesci.join('-')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L');
  return `${bezOgonkow.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}.csv`;
}
