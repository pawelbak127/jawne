/**
 * Sonda: SUDOP, sciezka Z KOLEJKA, odpytywana tak, jak kaze urzad.
 *
 *   node scripts/sondy/sudop-kolejka.mjs --uruchom
 *
 * ---------------------------------------------------------------------
 * JEDNO ZAPYTANIE NA URUCHOMIENIE. Urzad napisal, ze ruch przekracza jego
 * mozliwosci. Nie ma tu petli po wielu NIP-ach ani ponownej rejestracji.
 *
 * ---------------------------------------------------------------------
 * CO POPRZEDNIE SONDY (projekt "obywatel") PRZEOCZYLY — 17.09.2026:
 *
 * 1. Oficjalna instrukcja UOKiK na dane.gov.pl (zbior 6068, DOCX z 5.09.2025)
 *    nie byla nigdy czytana. Podaje: format daty RRRR-MM-DD, limit
 *    15 zapytan na minute, okno danych 10 lat, warunki ponownego uzycia.
 * 2. 62-minutowy pomiar z 12.09 dotyczyl WYLACZNIE sciezki `bez-kolejki`
 *    (odpytywanie /api/wynik/{id}). Sciezka Z KOLEJKA — ta z listu urzedu
 *    ("sprawdzac /api/kolejka/{id} co ~60 s, 303 = gotowe") i ta z przykladow
 *    w instrukcji — byla odpytywana najwyzej szesc minut.
 * 3. Zapytanie kontrolne pytalo o pomoc z 2008 r., a API obejmuje 10 lat.
 *
 * Dlatego zapytanie jest DOKLADNIE przykladem z instrukcji urzedu —
 * parametry, o ktorych urzad sam pisze, ze dzialaja, z zawezeniem dat.
 * ---------------------------------------------------------------------
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BAZA = 'https://api-sudop.uokik.gov.pl';
const ZAPYTANIE = '/sudop-api/api/przypadki-pomocy'
  + '?nip-beneficjenta=7791011327'
  + '&dzien-udzielenia-pomocy-od=2020-01-01'
  + '&dzien-udzielenia-pomocy-do=2022-12-31';
const UA = 'jawne.pl/0.1 (serwis obywatelski; jedno zapytanie kontrolne)';
const CO_ILE_MS = 60_000;          // list UOKiK: "najlepiej w odstepach okolo 60 sekund"
const HORYZONT_MS = 62 * 60_000;   // list UOKiK: po 60 minutach wynik wygasa
const KATALOG = resolve('dane', 'sondy');
const LOG = resolve(KATALOG, 'sudop-kolejka.log');

const czas = () => new Date().toISOString();
const spij = (ms) => new Promise((r) => setTimeout(r, ms));

function zapiszLog(linia) {
  console.log(linia);
  appendFileSync(LOG, `${linia}\n`, 'utf8');
}

async function get(sciezka) {
  const url = /^https?:/.test(sciezka) ? sciezka : `${BAZA}${sciezka}`;
  // redirect: 'manual' — bez tego fetch sam idzie za 303 i gubi naglowek
  // Location. To jest blad, ktory juz raz trafil do pisma do urzedu.
  const odp = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': UA, Accept: 'application/json, */*' },
    signal: AbortSignal.timeout(60_000),
  });
  const tekst = await odp.text();
  return { url, status: odp.status, location: odp.headers.get('location'), tekst };
}

async function main() {
  if (!process.argv.includes('--uruchom')) {
    console.log('Ta sonda tworzy JEDNO zgloszenie w kolejce UOKiK. Uruchom z --uruchom.');
    return;
  }
  mkdirSync(KATALOG, { recursive: true });
  zapiszLog(`\n=== ${czas()} START ===`);

  const rej = await get(ZAPYTANIE);
  zapiszLog(`${czas()} REJESTRACJA ${rej.status} Location: ${rej.location ?? '(brak)'} | ${rej.tekst.slice(0, 200)}`);
  if (rej.status !== 303 || !rej.location) {
    zapiszLog('Brak 303 z Location — koniec. Odpowiedz powyzej.');
    return;
  }

  const kolejka = rej.location;
  const start = Date.now();
  let runda = 0;
  while (Date.now() - start < HORYZONT_MS) {
    await spij(CO_ILE_MS);
    runda++;
    const min = ((Date.now() - start) / 60_000).toFixed(1);
    let r;
    try {
      r = await get(kolejka);
    } catch (e) {
      zapiszLog(`${czas()} [${runda}] ${min} min  BLAD SIECI ${e instanceof Error ? e.message : e}`);
      continue;
    }
    zapiszLog(`${czas()} [${runda}] ${min} min  ${r.status}${r.location ? ` -> ${r.location}` : ''} | ${r.tekst.slice(0, 120).replace(/\s+/g, ' ')}`);

    if (r.status === 303 && r.location) {
      zapiszLog(`${czas()} KOLEJKA ZAKONCZONA po ${min} min. Pobieram wynik.`);
      const w = await get(r.location);
      zapiszLog(`${czas()} WYNIK ${w.status}, ${w.tekst.length} znakow`);
      writeFileSync(resolve(KATALOG, 'sudop-wynik.json'), w.tekst, 'utf8');
      if (w.status === 200) {
        try {
          const j = JSON.parse(w.tekst);
          const wyniki = Array.isArray(j.wyniki) ? j.wyniki : [];
          zapiszLog(`liczba-wynikow: ${j['liczba-wynikow']} | w tablicy: ${wyniki.length}`);
          if (wyniki[0]) zapiszLog(`POLA (${Object.keys(wyniki[0]).length}): ${Object.keys(wyniki[0]).join(', ')}`);
        } catch (e) {
          zapiszLog(`Wynik nie jest JSON-em: ${e instanceof Error ? e.message : e}`);
        }
        await spij(5_000);
        const csv = await get(`${r.location}${r.location.includes('?') ? '&' : '?'}csv=true`);
        zapiszLog(`${czas()} WYNIK CSV ${csv.status}, ${csv.tekst.length} znakow`);
        writeFileSync(resolve(KATALOG, 'sudop-wynik.csv'), csv.tekst, 'utf8');
      }
      return;
    }
    if (r.status === 500) {
      zapiszLog('Kolejka zglosila blad wyszukiwania (500) — koniec.');
      return;
    }
  }
  zapiszLog(`${czas()} BRAK WYNIKU po ${HORYZONT_MS / 60_000} min na sciezce z kolejka.`);
}

main().catch((e) => {
  zapiszLog(`${czas()} BLAD: ${e instanceof Error ? e.stack : e}`);
  process.exit(1);
});
