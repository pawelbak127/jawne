/**
 * Sonda: caly katalog SMUP — obszary, uslugi, wskazniki.
 *
 *   node scripts/sondy/smup-katalog.mjs --uruchom
 *
 * Kilkadziesiat lekkich zapytan (0,2–0,4 s kazde, bez kolejki), z przerwa
 * 300 ms — limitow SMUP nie znamy, wiec nie pedzimy. Wynik: jeden plik
 * dane/sondy/smup-katalog.json, z ktorego wybieramy wskazniki do importu.
 * Klucz z .env.local (SMUP_KLUCZ), nigdy z wiersza polecen.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BAZA = 'https://api.smup.gov.pl/api/1.0.0';
const KATALOG = join('dane', 'sondy');
const nl = (s = '') => process.stdout.write(`${s}\n`);
const spij = (ms) => new Promise((r) => setTimeout(r, ms));

if (!process.argv.includes('--uruchom')) {
  nl('Pobralbym katalog SMUP (kilkadziesiat zapytan). Dodaj --uruchom.');
  process.exit(0);
}
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const klucz = process.env.SMUP_KLUCZ?.trim();
if (!klucz) {
  nl('Brak SMUP_KLUCZ w .env.local');
  process.exit(2);
}

let zapytan = 0;
async function pobierz(sciezka) {
  zapytan++;
  const odp = await fetch(`${BAZA}/${sciezka}`, {
    headers: { 'X-ClientId': klucz, Accept: 'application/json', 'User-Agent': 'jawne.pl/0.1 (serwis obywatelski)' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!odp.ok) throw new Error(`${sciezka} -> HTTP ${odp.status}`);
  await spij(300);
  return odp.json();
}

const obszary = await pobierz('areas-list?lang=pl');
const katalog = [];
for (const o of obszary) {
  const uslugi = await pobierz(`public-services?id=${o['id-ou']}&lang=pl`);
  const wUsludze = [];
  for (const u of uslugi) {
    const wskazniki = await pobierz(`indicators-list?id=${u['id-up']}&lang=pl`);
    wUsludze.push({ ...u, wskazniki });
  }
  katalog.push({ ...o, uslugi: wUsludze });
  nl(`   ${o['nazwa-obszaru']}: ${uslugi.length} uslug, ${wUsludze.reduce((a, u) => a + u.wskazniki.length, 0)} wskaznikow`);
}

mkdirSync(KATALOG, { recursive: true });
writeFileSync(join(KATALOG, 'smup-katalog.json'), JSON.stringify(katalog, null, 1));
const uslug = katalog.reduce((a, o) => a + o.uslugi.length, 0);
const wskaznikow = katalog.reduce((a, o) => a + o.uslugi.reduce((b, u) => b + u.wskazniki.length, 0), 0);
nl(`Razem: ${obszary.length} obszarow, ${uslug} uslug, ${wskaznikow} wskaznikow (${zapytan} zapytan)`);
nl('Plik: dane/sondy/smup-katalog.json');
