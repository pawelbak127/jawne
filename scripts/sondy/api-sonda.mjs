/**
 * Sonda: jedno zapytanie GET i opis tego, co NAPRAWDE przyszlo.
 *
 *   node scripts/sondy/api-sonda.mjs --uruchom https://api.sejm.gov.pl/sejm/term10/processes
 *   node scripts/sondy/api-sonda.mjs --uruchom ADRES --naglowek Accept=text/csv
 *
 * Bez `--uruchom` tylko wypisuje adres. Cala odpowiedz idzie do dane/sondy/,
 * na ekran trafia podsumowanie: status, typ, rozmiar, ksztalt.
 *
 * Sluzy do przenoszenia zrodel z „z dokumentacji” do „zmierzone”
 * (docs/zrodla.md). Opisujemy tylko to, co widac w odpowiedzi.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KATALOG = join('dane', 'sondy');
const nl = (s = '') => process.stdout.write(`${s}\n`);
const UA = 'jawne.pl/0.1 (serwis obywatelski; sonda pojedyncza)';

const argi = process.argv.slice(2);
const adres = argi.find((a) => a.startsWith('http'));
const naglowki = Object.fromEntries(
  argi.filter((a) => a.startsWith('--naglowek=')).map((a) => a.slice('--naglowek='.length).split('=')),
);
if (!adres) {
  nl('Podaj adres: node scripts/sondy/api-sonda.mjs --uruchom https://…');
  process.exit(2);
}
if (!argi.includes('--uruchom')) {
  nl(`Zapytalbym o: ${adres}`);
  nl('Dodaj --uruchom, zeby wyslac.');
  process.exit(0);
}

/** Ksztalt odpowiedzi w kilku linijkach: co to jest i jakie ma pola. */
function ksztalt(dane, wciecie = '   ') {
  if (Array.isArray(dane)) {
    nl(`${wciecie}tablica, ${dane.length} elementow`);
    if (dane.length) ksztalt(dane[0], `${wciecie}  `);
    return;
  }
  if (dane && typeof dane === 'object') {
    const klucze = Object.keys(dane);
    nl(`${wciecie}obiekt, pola (${klucze.length}): ${klucze.slice(0, 30).join(', ')}${klucze.length > 30 ? ' …' : ''}`);
    for (const k of klucze) {
      const v = dane[k];
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        nl(`${wciecie}  ${k}: tablica ${v.length}`);
        ksztalt(v[0], `${wciecie}    `);
        break;
      }
    }
    return;
  }
  nl(`${wciecie}${typeof dane}: ${String(dane).slice(0, 120)}`);
}

const start = Date.now();
let odp;
try {
  odp = await fetch(adres, {
    headers: { 'User-Agent': UA, Accept: 'application/json, text/csv, */*', ...naglowki },
    signal: AbortSignal.timeout(60_000),
    redirect: 'follow',
  });
} catch (e) {
  nl(`BLAD polaczenia: ${e instanceof Error ? `${e.name}: ${e.message}` : e}`);
  process.exit(1);
}
const bajty = Buffer.from(await odp.arrayBuffer());
const sekund = ((Date.now() - start) / 1000).toFixed(1);
const typ = odp.headers.get('content-type') ?? '(brak)';

mkdirSync(KATALOG, { recursive: true });
const nazwa = `${new URL(adres).hostname}${new URL(adres).pathname}`.replace(/[^a-z0-9]+/gi, '-').slice(0, 80);
// Rozszerzenie z typu odpowiedzi: plik .txt z JSON-em w srodku myli przy
// kazdym powrocie do sondy (i node probuje go wczytac jako modul).
const rozszerzenie = typ.includes('json') ? 'json' : typ.includes('csv') ? 'csv' : typ.includes('html') ? 'html' : 'txt';
const plik = join(KATALOG, `${nazwa}.${rozszerzenie}`);
writeFileSync(plik, bajty);

nl(`${odp.status} ${odp.statusText}  ${sekund} s  ${(bajty.length / 1024).toFixed(1)} kB  ${typ}`);
const dyspozycja = odp.headers.get('content-disposition');
if (dyspozycja) nl(`   content-disposition: ${dyspozycja}`);
if (typ.includes('json')) {
  try {
    ksztalt(JSON.parse(bajty.toString('utf8')));
  } catch {
    nl(`   (nie JSON mimo naglowka) ${bajty.toString('utf8').slice(0, 200)}`);
  }
} else {
  nl(`   poczatek: ${bajty.toString('utf8').slice(0, 300).replace(/\s+/g, ' ')}`);
}
nl(`   cala odpowiedz: ${plik}`);
