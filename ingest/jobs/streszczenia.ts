/**
 * Streszczenia ustaw — narzedzie dla sesji, ktora je pisze.
 *
 *   npx tsx ingest/jobs/streszczenia.ts --eksport   (wymaga bazy)
 *   npx tsx ingest/jobs/streszczenia.ts --sprawdz   (BEZ bazy)
 *
 * --eksport zapisuje do ingest/zrodla/streszczenia/opisy.json opisy WSZYSTKICH
 * projektow ustaw z rejestru (numer, tytul, stan, opis, skrot). Plik idzie do
 * repozytorium, bo sesja w chmurze klonuje repo BEZ bazy — a bez opisow nie
 * ma z czego pisac ani czego sprawdzac.
 *
 * --sprawdz porownuje ustawy.json z opisy.json tymi samymi kontrolami co
 * import (skrot zrodla + bezpiecznik liczb) i wypisuje, czego jeszcze brakuje.
 * Konczy sie kodem 1, gdy cokolwiek odpada — sesja ma to naprawic, zanim
 * wypchnie zmiany. Zasady pisania: docs/streszczenia-instrukcja.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { sprawdzStreszczenie } from '../../src/lib/streszczenia.js';
import { skrotOpisu, type WpisStreszczenia } from '../lib/streszczenia.js';

const KATALOG = join(process.cwd(), 'ingest', 'zrodla', 'streszczenia');
const OPISY = join(KATALOG, 'opisy.json');
const STRESZCZENIA = join(KATALOG, 'ustawy.json');

type Opis = { tytul: string; stan: string; opis: string; zrodlo_skrot: string };

function eksport(): void {
  const db = new DatabaseSync(join(process.cwd(), 'dane', 'sejm.db'), { readOnly: true });
  const wiersze = db.prepare(
    `select p.numer as numer, p.tytul as tytul, p.opis as opis,
            (select e.nazwa from etapy_procesow e where e.proces = p.numer and e.typ = 'End' limit 1) as koniec
       from procesy p
      where p.rodzaj = 'projekt ustawy' and p.opis is not null and trim(p.opis) <> ''
      order by cast(p.numer as integer) desc`,
  ).all() as unknown as { numer: string; tytul: string; opis: string; koniec: string | null }[];
  const wynik: Record<string, Opis> = {};
  for (const w of wiersze) {
    wynik[w.numer] = {
      tytul: w.tytul,
      // „w toku" = projekt, ktory jeszcze nie obowiazuje — streszczenie w trybie przypuszczajacym
      stan: w.koniec ?? 'w toku',
      opis: w.opis.trim(),
      zrodlo_skrot: skrotOpisu(w.opis),
    };
  }
  writeFileSync(OPISY, `${JSON.stringify(wynik, null, 1)}\n`);
  console.log(`zapisano ${wiersze.length} opisow do ${OPISY}`);
}

function sprawdz(): void {
  if (!existsSync(OPISY)) { console.error('Brak opisy.json — najpierw --eksport na komputerze z baza.'); process.exit(2); }
  const opisy = JSON.parse(readFileSync(OPISY, 'utf8')) as Record<string, Opis>;
  const stresz = existsSync(STRESZCZENIA)
    ? JSON.parse(readFileSync(STRESZCZENIA, 'utf8')) as Record<string, WpisStreszczenia>
    : {};
  const bledy: string[] = [];
  for (const [numer, w] of Object.entries(stresz)) {
    const o = opisy[numer];
    if (!o) { bledy.push(`${numer}: nie ma takiego projektu ustawy w opisy.json`); continue; }
    if (o.zrodlo_skrot !== w.zrodlo_skrot) { bledy.push(`${numer}: skrot zrodla sie nie zgadza (opis sie zmienil?)`); continue; }
    const s = sprawdzStreszczenie(w.tekst, o.opis);
    if (!s.ok) bledy.push(`${numer}: ${s.bledy.join('; ')}`);
    if (!w.model?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(w.przygotowano ?? '')) bledy.push(`${numer}: brak modelu albo daty`);
  }
  // Sortowanie JAWNE: klucze liczbowe obiektu JS ida zawsze rosnaco, niezaleznie
  // od kolejnosci w pliku — bez tego „najnowsze" byly najstarszymi (24, 25, 26…).
  const brakuje = Object.keys(opisy).filter((n) => !stresz[n]).sort((a, b) => Number(b) - Number(a));
  console.log(`streszczen: ${Object.keys(stresz).length}, poprawnych: ${Object.keys(stresz).length - new Set(bledy.map((b) => b.split(':')[0])).size}`);
  console.log(`projektow ustaw z opisem: ${Object.keys(opisy).length}, bez streszczenia: ${brakuje.length}`);
  if (brakuje.length) console.log(`najnowsze bez streszczenia: ${brakuje.slice(0, 15).join(', ')}`);
  for (const b of bledy) console.log(`BLAD ${b}`);
  if (bledy.length) process.exit(1);
}

if (process.argv.includes('--eksport')) eksport();
else if (process.argv.includes('--sprawdz')) sprawdz();
else { console.error('Uzycie: --eksport (z baza) albo --sprawdz (bez bazy)'); process.exit(2); }
