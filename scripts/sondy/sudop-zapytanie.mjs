/**
 * Jedno zapytanie kontrolne do SUDOP, parametry z wiersza polecen.
 *
 *   node scripts/sondy/sudop-zapytanie.mjs --uruchom dzien-udzielenia-pomocy-od=2026-09-15 …
 *
 * Bez `--uruchom` tylko wypisuje adres — zapytanie do urzedu ma byc
 * swiadome, bo kazde zajmuje miejsce w kolejce.
 *
 * Wypisuje WYLACZNIE podsumowanie (status, czas, liczba wynikow, rozmiar).
 * Cala odpowiedz ladzie w dane/sondy/ — nie na ekran.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const BAZA = 'https://api-sudop.uokik.gov.pl/sudop-api';
const CO_ILE_MS = 60_000;
const HORYZONT_MS = 62 * 60_000;

const argumenty = process.argv.slice(2);
const uruchom = argumenty.includes('--uruchom');
const pary = argumenty.filter((a) => a.includes('=') && !a.startsWith('--'));
if (!pary.length) {
  console.log('Podaj parametry, np. dzien-udzielenia-pomocy-od=2026-09-15 dzien-udzielenia-pomocy-do=2026-09-15');
  process.exit(1);
}
const adres = `${BAZA}/api/przypadki-pomocy?${pary.join('&')}`;
console.log(adres);
if (!uruchom) {
  console.log('(sucho — dodaj --uruchom, zeby naprawde zapytac)');
  process.exit(0);
}

const czas = () => new Date().toTimeString().slice(0, 8);
const spij = (ms) => new Promise((r) => setTimeout(r, ms));

const rej = await fetch(adres, { redirect: 'manual' });
const kolejka = rej.headers.get('location');
console.log(`${czas()} rejestracja: HTTP ${rej.status} -> ${kolejka ?? '(brak Location)'}`);
if (rej.status !== 303 || !kolejka) {
  // 400 przychodzi natychmiast i NIE zajmuje miejsca w kolejce — tresc mowi,
  // czego API wymaga, wiec warto ja zobaczyc.
  console.log((await rej.text()).slice(0, 400));
  process.exit(1);
}

const start = Date.now();
let wynikAdres = null;
while (Date.now() - start < HORYZONT_MS) {
  await spij(CO_ILE_MS);
  const r = await fetch(new URL(kolejka, BAZA), { redirect: 'manual' });
  const minuty = Math.round((Date.now() - start) / 60_000);
  if (r.status === 303) {
    wynikAdres = r.headers.get('location');
    console.log(`${czas()} kolejka: gotowe po ${minuty} min`);
    break;
  }
  console.log(`${czas()} kolejka: HTTP ${r.status}, czekam (${minuty} min)`);
  if (r.status !== 200) break;
}
if (!wynikAdres) process.exit(1);

const w = await fetch(new URL(wynikAdres, BAZA));
const tekst = await w.text();
mkdirSync('dane/sondy', { recursive: true });
const plik = `dane/sondy/sudop-${Date.now()}.json`;
writeFileSync(plik, tekst);
let liczba = null;
let wierszy = null;
try {
  const j = JSON.parse(tekst);
  liczba = j['liczba-wynikow'];
  wierszy = Array.isArray(j.wyniki) ? j.wyniki.length : null;
} catch { /* zostawiamy null — ksztalt widac w pliku */ }
console.log(`${czas()} wynik: HTTP ${w.status}, liczba-wynikow ${liczba}, wierszy na stronie ${wierszy}, ${(tekst.length / 1e6).toFixed(1)} MB -> ${plik}`);
