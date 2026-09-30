/**
 * Migracje bazy — dopelnienie schematu i przeliczenia, ktore trzeba zrobic raz.
 *
 *   npx tsx ingest/jobs/migracje.ts
 *
 * To samo robi kazdy import (`zalozSchemat`), ale strona czyta kolumny
 * WPROST, a brakujaca kolumna nie jest lapana przez `bezTabeli()`
 * w `src/lib/dane.ts` — wywrocilaby strone gminy. Dlatego `deploy/instaluj.sh`
 * uruchamia to zanim ruszy `next build`, a nie dopiero przy nocnym imporcie.
 */
import { existsSync } from 'node:fs';
import { policzAgregaty } from '../lib/agregaty.js';
import { otworz, SCIEZKA_BAZY, zalozSchemat } from '../lib/baza.js';
import { sprawdzSumy } from '../lib/sumy-pomocy.js';
import { TERYT_WARSZAWY } from '../lib/fe.js';

const log = (s: string) => process.stdout.write(`${s}\n`);

function main(): void {
  if (!existsSync(SCIEZKA_BAZY)) {
    log(`Nie ma ${SCIEZKA_BAZY} — nie ma czego migrowac.`);
    return;
  }
  const db = otworz(true);
  try {
    const zrobione = zalozSchemat(db);
    log(zrobione.length ? zrobione.map((z) => `   ${z}`).join('\n') : '   baza aktualna — nic do zrobienia');
    // Agregaty tuz przed budowa strony: bez nich `/pomoc-publiczna` liczy
    // osiem przebiegow po calej tabeli i przekracza limit czasu budowy
    // (zmierzone 27.09.2026 na serwerze: ponad 3 minuty przy 2,5 mln wierszy).
    const start = Date.now();
    const w = policzAgregaty(db, process.argv.includes('--agregaty-od-nowa'));
    log(`   ${w.opis} (${Math.round((Date.now() - start) / 1000)} s)`);

    /*
     * Kontrola druga droga: te same liczby policzone SQL-em po calej tabeli.
     * Drogie (kilka przebiegow po pomoc_publiczna), wiec na zadanie, a nie
     * przy kazdym imporcie — ale bez tej drogi sumy przyrostowe bylyby
     * liczbami, ktorych nikt nie umie sprawdzic.
     */
    if (process.argv.includes('--sprawdz')) {
      const t = Date.now();
      const wierszy = (db.prepare('select count(*) as c from pomoc_publiczna').get() as { c: number }).c;
      log(`   kontrola druga droga na ${wierszy.toLocaleString('pl')} wierszach — to kilkadziesiat minut.`);
      log('   Nie przerywaj: polecenie nic nie zapisuje, tylko liczy i porownuje.');
      const rozjazdy = sprawdzSumy(db, TERYT_WARSZAWY, log);
      if (rozjazdy.length) {
        log(`   ROZJAZD (${rozjazdy.length}) — sumy przyrostowe nie zgadzaja sie ze zrodlem:`);
        for (const r of rozjazdy.slice(0, 20)) log(`      ${r}`);
      } else {
        log(`   kontrola druga droga: zero rozjazdow (${Math.round((Date.now() - t) / 1000)} s)`);
      }
      if (rozjazdy.length) process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

main();
