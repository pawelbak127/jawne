/**
 * Co zmienia REGON w regule prywatnosci — porownanie na WSZYSTKICH nazwach.
 *   npx tsx scripts/porownaj-regon.ts
 * Nic nie pobiera i nic nie zapisuje; czyta baze i liczy.
 */
import { DatabaseSync } from 'node:sqlite';
import { nazwaPodmiotuJawna } from '../src/lib/prywatnosc.js';

type Wiersz = { nip: string; nazwa: string; typ: string | null };

async function main(): Promise<void> {
  const db = new DatabaseSync('dane/sejm.db', { readOnly: true });
  const wiersze = db.prepare(
    `select f.nip as nip, f.nazwa as nazwa, r.typ as typ
       from firmy_szukaj f left join regon r on r.nip = f.nip`,
  ).all() as unknown as Wiersz[];

  let zTypem = 0;
  let bezZmian = 0;
  const odslonieci: Wiersz[] = [];
  const schowani: Wiersz[] = [];
  for (const w of wiersze) {
    const stara = nazwaPodmiotuJawna(w.nazwa);
    const nowa = nazwaPodmiotuJawna(w.nazwa, w.typ);
    if (w.typ) zTypem++;
    if (stara === nowa) { bezZmian++; continue; }
    (nowa ? odslonieci : schowani).push(w);
  }

  console.log(`nazw w bazie: ${wiersze.length}, z typem z REGON: ${zTypem} (${Math.round((100 * zTypem) / wiersze.length)}%)`);
  console.log(`bez zmiany: ${bezZmian}`);
  console.log(`ODSLONIETE (rejestr mowi: osoba prawna, my chowalismy): ${odslonieci.length}`);
  for (const w of odslonieci.slice(0, 8)) console.log(`   + ${w.nazwa.slice(0, 70)}`);
  console.log(`SCHOWANE (rejestr mowi: osoba fizyczna, my pokazywalismy): ${schowani.length}`);
  for (const w of schowani.slice(0, 8)) console.log(`   - ${w.nazwa.slice(0, 70)}`);
}

main().catch((e) => {
  console.error('BLAD:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
