/**
 * Sonda: katalog dane.gov.pl — czy dany zbior w ogole istnieje i co ma w srodku.
 *
 *   node scripts/sondy/dane-gov-szukaj.mjs --uruchom "rejestr umów"
 *   node scripts/sondy/dane-gov-szukaj.mjs --uruchom "Polski Ład" --zasoby
 *
 * Jedno zapytanie na fraze (`--zasoby`: plus jedno na kazdy z trzech
 * pierwszych zbiorow). Wypisuje tytul, instytucje, date aktualizacji
 * i liczbe zasobow — czyli to, czego potrzeba, zeby zdecydowac, czy warto.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BAZA = 'https://api.dane.gov.pl/1.4';
const KATALOG = join('dane', 'sondy');
const nl = (s = '') => process.stdout.write(`${s}\n`);
const UA = 'jawne.pl/0.1 (serwis obywatelski; sonda katalogu)';

const argi = process.argv.slice(2);
const fraza = argi.find((a) => !a.startsWith('--'));
const zZasobami = argi.includes('--zasoby');
if (!fraza) {
  nl('Podaj fraze: node scripts/sondy/dane-gov-szukaj.mjs --uruchom "rejestr umów"');
  process.exit(2);
}
if (!argi.includes('--uruchom')) {
  nl(`Szukalbym: "${fraza}"`);
  process.exit(0);
}

async function json(adres) {
  const odp = await fetch(adres, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!odp.ok) throw new Error(`${adres} -> HTTP ${odp.status}`);
  return odp.json();
}

const adres = `${BAZA}/search?q=${encodeURIComponent(fraza)}&model%5Bterms%5D=dataset&per_page=8`;
const wynik = await json(adres);
mkdirSync(KATALOG, { recursive: true });
writeFileSync(join(KATALOG, `dane-gov-${fraza.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify(wynik, null, 1));

// Katalog oddaje type: 'common', a rodzaj trzyma w attributes.model (zmierzone).
const zbiory = (wynik.data ?? []).filter((d) => (d.attributes?.model ?? d.type) === 'dataset');
nl(`"${fraza}": ${wynik.meta?.count ?? zbiory.length} trafien, pokazuje ${zbiory.length}`);
for (const z of zbiory) {
  const a = z.attributes ?? {};
  // Katalog podswietla trafienia znacznikiem <mark> w samym tytule.
  nl(`   [${z.id}] ${(a.title ?? '').replaceAll('<mark>', '').replaceAll('</mark>', '')}`);
  nl(`        zmieniony: ${(a.modified ?? '').slice(0, 10)}   zrodlo: ${a.source?.title ?? '—'}   slowa: ${(a.keywords ?? []).slice(0, 5).map((k) => k.name ?? k).join(', ')}`);
}

if (zZasobami) {
  for (const z of zbiory.slice(0, 3)) {
    const r = await json(`${BAZA}/datasets/${z.id}/resources?per_page=5`);
    nl(`   zasoby zbioru ${z.id}:`);
    for (const p of r.data ?? []) {
      const a = p.attributes ?? {};
      nl(`      ${a.format ?? '?'}  ${a.title ?? ''}  ${a.file_size ? `${(a.file_size / 1048576).toFixed(1)} MB` : ''}`);
      nl(`         ${a.file_url ?? a.link ?? ''}`);
    }
  }
}
