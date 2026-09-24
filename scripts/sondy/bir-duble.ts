/**
 * Czy jeden NIP oddaje wiecej niz jeden rekord w REGON — i czym sie roznia.
 *   npx tsx scripts/sondy/bir-duble.ts
 * Dziesiec wywolan po 20 NIP-ow; nic nie zapisuje.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { NIPOW_NA_RAZ, szukajPoNipach, wyloguj, zaloguj } from '../../ingest/lib/bir.js';

async function main(): Promise<void> {
  process.env.GUS_BIR_KLUCZ ||= /^GUS_BIR_KLUCZ\s*=\s*(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim() ?? '';
  const db = new DatabaseSync('dane/sejm.db', { readOnly: true });
  const nipy = (db.prepare('select nip from regon order by random() limit 200').all() as unknown as { nip: string }[]).map((r) => r.nip);

  const sid = await zaloguj();
  const ile = new Map<string, number>();
  const roznyTyp: string[] = [];
  const roznaGmina: string[] = [];
  for (let i = 0; i < nipy.length; i += NIPOW_NA_RAZ) {
    const partia = nipy.slice(i, i + NIPOW_NA_RAZ);
    const wynik = await szukajPoNipach(sid, partia);
    const wg = new Map<string, typeof wynik>();
    for (const p of wynik) wg.set(p.nip, [...(wg.get(p.nip) ?? []), p]);
    for (const [nip, lista] of wg) {
      ile.set(nip, lista.length);
      if (new Set(lista.map((x) => x.typ)).size > 1) roznyTyp.push(nip);
      if (new Set(lista.map((x) => x.gmina)).size > 1) roznaGmina.push(nip);
    }
    await new Promise((ok) => setTimeout(ok, 350));
  }
  await wyloguj(sid);

  const rozklad = new Map<number, number>();
  for (const n of ile.values()) rozklad.set(n, (rozklad.get(n) ?? 0) + 1);
  console.log('zapytanych NIP-ow:', nipy.length, '| odpowiedzialo:', ile.size);
  console.log('rekordow na NIP:', [...rozklad.entries()].sort().map(([k, v]) => `${k}x: ${v}`).join(', '));
  console.log('NIP-ow z roznym typem (F/P):', roznyTyp.length, roznyTyp.slice(0, 3));
  console.log('NIP-ow z rozna gmina:', roznaGmina.length, roznaGmina.slice(0, 3));
}

main().catch((e) => {
  console.error('BLAD:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
