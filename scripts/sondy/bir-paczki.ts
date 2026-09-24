/**
 * Ile NIP-ow naraz przyjmuje DaneSzukajPodmioty — pomiar, nie domysl.
 *   npx tsx scripts/sondy/bir-paczki.ts
 * Jedno logowanie i piec wyszukan; nic nie zapisuje.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { szukajPoNipach, wyloguj, zaloguj } from '../../ingest/lib/bir.js';

async function main(): Promise<void> {
  process.env.GUS_BIR_KLUCZ ||= /^GUS_BIR_KLUCZ\s*=\s*(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim() ?? '';
  const db = new DatabaseSync('dane/sejm.db', { readOnly: true });
  const nipy = (db.prepare(
    "select distinct nabywca_id nip from ted_ogloszenia where nabywca_id is not null and length(nabywca_id) = 10 limit 100",
  ).all() as unknown as { nip: string }[]).map((r) => r.nip);

  const sid = await zaloguj();
  for (const ile of [20, 21, 25, 30, 40]) {
    const w = await szukajPoNipach(sid, nipy.slice(0, ile));
    console.log(`wyslane ${String(ile).padStart(3)} -> oddane ${w.length}`);
  }
  await wyloguj(sid);
}

main().catch((e) => {
  console.error('BLAD:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
