/**
 * Czemu rejestr nie zna 41 599 NIP-ow z SUDOP? Sprawdzamy 40 z nich —
 * najpierw paczka po 20, potem pojedynczo.
 *   npx tsx scripts/sondy/bir-braki.ts
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { poprawnyNip } from '../../src/lib/nip.js';
import { szukajPoNipach, wyloguj, zaloguj } from '../../ingest/lib/bir.js';

async function main(): Promise<void> {
  process.env.GUS_BIR_KLUCZ ||= /^GUS_BIR_KLUCZ\s*=\s*(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim() ?? '';
  const db = new DatabaseSync('dane/sejm.db', { readOnly: true });
  const braki = (db.prepare(
    `select f.nip from firmy_szukaj f left join regon r on r.nip = f.nip
      where r.nip is null and length(f.nip) = 10 limit 40`,
  ).all() as unknown as { nip: string }[]).map((x) => x.nip);

  const zlych = braki.filter((n) => !poprawnyNip(n));
  console.log(`probka: ${braki.length}; z bledna suma kontrolna: ${zlych.length}`, zlych.slice(0, 5));

  const sid = await zaloguj();
  const paczka = await szukajPoNipach(sid, braki.slice(0, 20));
  console.log('paczka 20 ->', paczka.length, 'rekordow');
  let pojedynczo = 0;
  for (const n of braki.slice(0, 8)) {
    const w = await szukajPoNipach(sid, [n]);
    if (w.length) { pojedynczo++; console.log('   ', n, '->', w[0]!.typ, w[0]!.nazwa?.slice(0, 40)); }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  console.log(`pojedynczo znalezionych: ${pojedynczo} z 8`);
  await wyloguj(sid);
}

main().catch((e) => { console.error('BLAD:', e instanceof Error ? e.message : e); process.exitCode = 1; });
