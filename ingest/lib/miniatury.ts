import type { DatabaseSync } from 'node:sqlite';
import { wTransakcji } from './baza.js';

/**
 * Miniatury portretow poslow — ta sama fotografia, skompresowana od nowa.
 *
 * ZMIERZONE 25.10.2026 na 499 zdjeciach z rejestru: wszystkie maja 110 x 137 px,
 * a waza srednio 14,2 kB (najwiecej 22 kB) — piksele sa male, kompresja slaba.
 * Ten sam obraz w JPEG 78 (mozjpeg) to srednio 2,9 kB: 7,1 MB -> 1,4 MB dla
 * calej listy. Szerokosc 128 px z `withoutEnlargement` nie powieksza dzisiejszych
 * zdjec, a przy wiekszym oryginale z rejestru i tak wystarczy na portret 64 px
 * na ekranie o podwojnej gestosci.
 *
 * Oryginal zostaje w `zdjecia.bajty` — do duzego portretu na stronie posla
 * i do obrazka podgladu linku. Miniatura to wylacznie optymalizacja wagi:
 * gdy jej nie ma (albo `sharp` nie zaladuje sie na serwerze), trasa
 * /posel/[slug]/miniatura oddaje oryginal i strona dziala jak dotad.
 */
export const SZEROKOSC_MINIATURY = 128;
const JAKOSC = 78;

type Sharp = (typeof import('sharp'))['default'];

/** `null`, gdy biblioteki nie ma albo nie laduje sie jej binarka — to nie blad etapu. */
async function zaladujSharp(): Promise<Sharp | null> {
  try {
    const m = await import('sharp');
    return ((m as unknown as { default?: Sharp }).default ?? (m as unknown as Sharp));
  } catch {
    return null;
  }
}

export async function miniatura(sharp: Sharp, bajty: Uint8Array): Promise<Uint8Array> {
  return sharp(bajty)
    .resize({ width: SZEROKOSC_MINIATURY, withoutEnlargement: true })
    .jpeg({ quality: JAKOSC, mozjpeg: true })
    .toBuffer();
}

/**
 * Dorabia miniatury, ktorych brakuje — z zapisanych zdjec, bez sieci.
 * Przy niezmienionych zdjeciach nie ma nic do roboty (etap `zdjecia` zeruje
 * miniature tylko przy zmianie bajtow). Zwraca liczbe dorobionych albo `null`,
 * gdy `sharp` jest niedostepny.
 */
export async function uzupelnijMiniatury(db: DatabaseSync): Promise<{ dorobiono: number; bajtow: number } | null> {
  const brak = db.prepare('select posel_id, bajty from zdjecia where miniatura is null').all() as unknown as
    { posel_id: number; bajty: Uint8Array }[];
  if (!brak.length) return { dorobiono: 0, bajtow: 0 };
  const sharp = await zaladujSharp();
  if (!sharp) return null;
  const gotowe: { id: number; b: Uint8Array }[] = [];
  for (const z of brak) gotowe.push({ id: z.posel_id, b: await miniatura(sharp, z.bajty) });
  const zapisz = db.prepare('update zdjecia set miniatura = ? where posel_id = ?');
  wTransakcji(db, () => {
    for (const g of gotowe) zapisz.run(g.b, g.id);
  });
  return { dorobiono: gotowe.length, bajtow: gotowe.reduce((a, g) => a + g.b.length, 0) };
}
