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

/** Barwy obrazka OG. Osobno od tokenow CSS, bo Satori nie zna zmiennych. */
export const OG = {
  tlo: '#faf9f6',
  atrament: '#17161a',
  atrament2: '#56535e',
  atrament3: '#8b8794',
  kreska: '#e3e0d8',
  akcent: '#0a6b62',
  za: '#1b9e63',
  przeciw: '#d2453f',
  wstrzymal: '#e0a021',
  brak: '#cfcbc0',
} as const;
