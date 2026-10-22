/**
 * Ikonki serwisu z JEDNEGO rysunku: src/app/icon.svg, apple-icon.png
 * i favicon.ico (16, 32 i 48 px w jednym pliku).
 *
 * ZGLOSZENIE PAWLA 23.10.2026: w wynikach Google przy zrejestru.pl stal
 * bialy trojkat na czarnym tle — domyslna ikonka z create-next-app (Vercel).
 * Google bierze favicon.ico z korzenia i chce boku bedacego wielokrotnoscia
 * 48 px, stad 48 w pliku .ico.
 *
 * Rysunek to same sciezki, bez tekstu — tekst w SVG zalezy od fontow
 * maszyny, ktora go rasteryzuje. Barwa: --akcent z globals.css (#1d70b8).
 *
 *   node scripts/ikony.mjs
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const AKCENT = '#1d70b8';
// Litera „z” z trzech kresek o grubosci ok. 7/64 — czytelna jeszcze przy 16 px.
const Z = 'M17 16H47V23L27 41H47V48H17V41L37 23H17Z';

const svg = (zaokraglenie) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
  + `<rect width="64" height="64" rx="${zaokraglenie}" fill="${AKCENT}"/>`
  + `<path d="${Z}" fill="#fff"/></svg>\n`;

const png = (rozmiar, zaokraglenie) =>
  sharp(Buffer.from(svg(zaokraglenie)), { density: 72 * (rozmiar / 64) * 4 })
    .resize(rozmiar, rozmiar)
    .png()
    .toBuffer();

/** Plik .ico z obrazkami PNG w srodku (dozwolone od Windows Vista, rozumie go kazda przegladarka). */
function ico(obrazy) {
  const naglowek = Buffer.alloc(6);
  naglowek.writeUInt16LE(0, 0);
  naglowek.writeUInt16LE(1, 2);
  naglowek.writeUInt16LE(obrazy.length, 4);
  const wpisy = [];
  let przesuniecie = 6 + 16 * obrazy.length;
  for (const { rozmiar, dane } of obrazy) {
    const w = Buffer.alloc(16);
    w.writeUInt8(rozmiar >= 256 ? 0 : rozmiar, 0);
    w.writeUInt8(rozmiar >= 256 ? 0 : rozmiar, 1);
    w.writeUInt8(0, 2);
    w.writeUInt8(0, 3);
    w.writeUInt16LE(1, 4);
    w.writeUInt16LE(32, 6);
    w.writeUInt32LE(dane.length, 8);
    w.writeUInt32LE(przesuniecie, 12);
    przesuniecie += dane.length;
    wpisy.push(w);
  }
  return Buffer.concat([naglowek, ...wpisy, ...obrazy.map((o) => o.dane)]);
}

async function main() {
  writeFileSync('src/app/icon.svg', svg(12));
  // Apple zaokragla rogi sam i nie lubi przezroczystosci — pelny kwadrat.
  writeFileSync('src/app/apple-icon.png', await png(180, 0));
  const male = [];
  for (const rozmiar of [16, 32, 48]) male.push({ rozmiar, dane: await png(rozmiar, 12) });
  writeFileSync('src/app/favicon.ico', ico(male));
  console.log('icon.svg, apple-icon.png (180), favicon.ico (16/32/48) — gotowe');
}

main();
