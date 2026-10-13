import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Font do obrazkow Open Graph.
 *
 * Satori (silnik `next/og`) nie ma zadnego wbudowanego fontu z polskimi
 * znakami — bez tego pliku "ą", "ę", "ł" wychodza pustymi prostokatami
 * dokladnie tam, gdzie stoi nazwisko posla.
 *
 * Plik lezy w repozytorium, a nie jest pobierany przy budowie, bo build
 * nie moze zalezec od dostepnosci cudzego CDN-u. Sprawdzony po sygnaturze
 * bajtow (00 01 00 00), nie po naglowku `content-type` — ten przy zasobach
 * fontowych i graficznych potrafi klamac.
 */
let pamiec: ArrayBuffer | null = null;

export async function fontDoOg(): Promise<ArrayBuffer> {
  if (pamiec) return pamiec;
  const bajty = await readFile(join(process.cwd(), 'src', 'fonty', 'Inter-SemiBold.ttf'));
  pamiec = bajty.buffer.slice(bajty.byteOffset, bajty.byteOffset + bajty.byteLength) as ArrayBuffer;
  return pamiec;
}

export const ROZMIAR_OG = { width: 1200, height: 630 };
export const TYP_OG = 'image/png';

/**
 * Barwy obrazka OG. Osobno od tokenow CSS, bo Satori nie zna zmiennych —
 * dlatego przy zmianie palety trzeba je przepisac recznie. Od 13.10.2026
 * to jasna paleta wersji Standardowej (globals.css, :root); wczesniej
 * zostala tu paleta sprzed przebudowy z morskim akcentem.
 */
export const OG = {
  tlo: '#ffffff',
  atrament: '#0b0c0c',
  atrament2: '#383f43',
  atrament3: '#505a5f',
  kreska: '#b1b4b6',
  akcent: '#1d70b8',
  za: '#1b9e63',
  przeciw: '#d2453f',
  wstrzymal: '#e0a021',
  brak: '#cfcbc0',
} as const;
