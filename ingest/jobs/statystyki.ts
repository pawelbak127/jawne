/**
 * Raport odwiedzin z dziennika wejsc — czyta wiersze JSON ze standardowego
 * wejscia, bo dziennik nalezy do uzytkownika caddy i czyta go root:
 *
 *   zcat -f /var/log/caddy/wejscia*.log* | npx tsx ingest/jobs/statystyki.ts --dni=30
 *
 * Na serwerze robi to `sudo jawne statystyki [dni]`. Uprawnienia roota
 * sa potrzebne tylko do odczytu plikow; liczenie idzie jako uzytkownik
 * jawne, ktory dziennika sam nie widzi.
 *
 * Strumieniem, wiersz po wierszu (pulapki 57 i 61): 90 dni dziennika to
 * moze byc kilkaset megabajtow i nie ma powodu trzymac go w pamieci.
 */
import { createInterface } from 'node:readline';
import { licznikOdwiedzin, type WpisDziennika } from '../lib/statystyki.js';

const dni = Number(process.argv.find((a) => a.startsWith('--dni='))?.split('=')[1] ?? 30);
const host = process.env.JAWNE_HOST?.trim() || 'zrejestru.pl';
const liczba = (n: number) => n.toLocaleString('pl-PL');
const wiersz = (...kol: [string, number][]) => kol.map(([t, w]) => (w < 0 ? t.padEnd(-w) : t.padStart(w))).join('  ');

async function* wpisy(): AsyncGenerator<WpisDziennika> {
  let zlych = 0;
  for await (const linia of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    if (!linia.trim()) continue;
    try {
      const w = JSON.parse(linia) as WpisDziennika & { msg?: string };
      if (w.msg === 'handled request' && w.request) yield w;
    } catch {
      zlych++;
    }
  }
  if (zlych) process.stderr.write(`(pominieto ${zlych} wierszy, ktore nie sa JSON-em)\n`);
}

async function main(): Promise<void> {
  // Do 02.11.2026 wpisy szly najpierw do tablicy — przy ok. 50 tys. zapytan
  // robotow na dobe tydzien przestal sie miescic w stercie (licznikOdwiedzin).
  const licznik = licznikOdwiedzin({ dni, teraz: Date.now() / 1000, naszHost: host });
  for await (const w of wpisy()) licznik.dodaj(w);
  const p = licznik.wynik();

  const out: string[] = [];
  out.push(`Odwiedziny ${host} — ostatnie ${dni} dni`);
  if (!p.od) {
    out.push('');
    out.push('Brak odslon w dzienniku. Dziennik wejsc dziala od wdrozenia z 03.10.2026 —');
    out.push('jesli to swiezy serwer, wejdz na strone i sprobuj za chwile.');
    out.push(`(robotow: ${liczba(p.robotow)}, innych zadan: ${liczba(p.pominietych)})`);
    process.stdout.write(`${out.join('\n')}\n`);
    return;
  }
  out.push(`dane z dziennika: ${p.od} … ${p.do}`);
  out.push('');
  out.push(wiersz(['dzien', -12], ['osoby', 7], ['odslony', 9]));
  for (const d of p.dni) out.push(wiersz([d.dzien, -12], [liczba(d.osoby), 7], [liczba(d.odslony), 9]));
  out.push('');
  out.push(`Razem: ${liczba(p.osobWOkresie)} roznych osob, ${liczba(p.odslon)} odslon.`);
  out.push('(Osoby z kolejnych dni sie nie sumuja: ktos, kto wraca, liczy sie w okresie raz.)');

  out.push('');
  out.push('Rodzaje stron (odslony)');
  for (const r of p.rodzaje.slice(0, 12)) {
    const udzial = Math.round((100 * r.odslony) / p.odslon);
    out.push(`   ${r.rodzaj.padEnd(18)} ${liczba(r.odslony).padStart(7)}  ${String(udzial).padStart(3)}%`);
  }

  out.push('');
  out.push('Najczesciej ogladane (odslony / osoby)');
  for (const s of p.strony) out.push(`   ${liczba(s.odslony).padStart(6)} / ${liczba(s.osoby).padEnd(5)} ${s.sciezka}`);

  out.push('');
  out.push('Skad przychodza (wejscia z innych stron)');
  if (!p.zrodla.length) out.push('   — brak odsylaczy z zewnatrz (wejscia wprost albo z zakladek)');
  for (const z of p.zrodla) out.push(`   ${liczba(z.wejsc).padStart(6)}  ${z.host}`);

  out.push('');
  out.push(`Pominiete: ${liczba(p.robotow)} zadan robotow, ${liczba(p.pominietych)} zadan, ktore nie sa odslona.`);
  if (p.roboty.length) {
    out.push('Roboty (zapytania):');
    for (const r of p.roboty) out.push(`   ${liczba(r.zapytan).padStart(8)}  ${r.nazwa}`);
  }
  out.push('„Osoba" to para (adres IP skrocony do /24, przegladarka) w ciagu doby —');
  out.push('szacunek z dolu: dwie osoby z jednej sieci i z ta sama przegladarka licza sie raz.');
  process.stdout.write(`${out.join('\n')}\n`);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? e}\n`);
  process.exit(1);
});
