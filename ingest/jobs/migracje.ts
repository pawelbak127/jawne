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
  } finally {
    db.close();
  }
}

main();
