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
  } finally {
    db.close();
  }
}

main();
