/**
 * Uzupelnienie przypadkow SUDOP bez gminy (U6) z odpowiedzi juz lezacych na
 * dysku — bez ani jednego zapytania do UOKiK.
 *
 * Do 23.10.2026 import pomijal przypadki, dla ktorych rejestr podaje tylko
 * wojewodztwo („1200000”, gmina „NZ”) albo nic („0000000 BRAK DANYCH”).
 * Od tego dnia zapisuje je do `pomoc_bez_gminy`, a dni zapisane wczesniej maja
 * w `pomoc_publiczna_dni.bez_gminy` NULL — „nie wiemy”, nie zero (zasada 4).
 *
 * Dzien uzupelniamy WYLACZNIE z zestawu stron, z ktorego zostal zapisany:
 * import nadaje dniowi najwczesniejszy znacznik `pobrano` ze stron zakresu,
 * wiec zestaw rozpoznajemy po tej samej chwili co do milisekundy. Dzien
 * pobierany kilka razy (odswiezenie po 14 dniach, nakladajace sie zakresy)
 * ma na dysku kilka zestawow — wziecie innego niz ten, z ktorego pochodza
 * jego wiersze w `pomoc_publiczna`, dalo by liczby z innej chwili rejestru.
 * Strony bez znacznika (stare pliki z GitHub Actions) nie pasuja do niczego
 * i ich dni zostaja NULL — tak samo jak dni, ktorych plikow juz nie ma.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { DatabaseSync } from 'node:sqlite';
import { wTransakcji } from './baza.js';
import { terytGminyZKodu, wojewodztwoZKodu, kwota, type OdpowiedzSudop, type PrzypadekPomocy } from './sudop.js';
import { wstawWiersze } from './sudop-zapis.js';

/**
 * Znacznik `pobrano` z konca zapisanej odpowiedzi — bez parsowania 10 tys.
 * wierszy i BEZ zamiany calej strony na napis.
 *
 * ZMIERZONE 23–24.10.2026 (pulapka 79): pierwsza wersja brala `tekst.slice(-300)`
 * z napisu calej strony. W V8 wycinek dluzszy niz kilkanascie znakow to
 * odnosnik do napisu zrodlowego, a nie kopia — znaczniki wszystkich stron
 * zakresu trzymaly wiec w pamieci CALE strony (do 121 po ok. 28 MB w UTF-16).
 * Jadro zabilo wdrozenie przy 1,5 GB RAM + 1,7 GB swapu i trzy przebiegi
 * historii. Teraz koniec bierzemy z BUFORA (`toString` tworzy nowy, maly
 * napis), a wynik kopiujemy jeszcze raz przez Buffer — na wszelki wypadek.
 */
export function pobranoZKonca(dane: string | Buffer): string | null {
  const koniec = typeof dane === 'string'
    ? Buffer.from(dane.slice(-300), 'utf8').toString('utf8')
    : dane.subarray(Math.max(0, dane.length - 300)).toString('utf8');
  const m = /"pobrano":"([^"]+)"\s*\}\s*$/.exec(koniec);
  return m ? Buffer.from(m[1]!, 'utf8').toString('utf8') : null;
}

/** Strony zakresow przyrostu na dysku: zakres → nazwy plikow w kolejnosci stron. */
export function stronyZakresow(nazwy: readonly string[]): Map<string, string[]> {
  const wynik = new Map<string, { nr: number; plik: string }[]>();
  for (const plik of nazwy) {
    const m = /^przyrost-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-s(\d+)\.json(\.gz)?$/.exec(plik);
    if (!m) continue;
    const z = `${m[1]}..${m[2]}`;
    const lista = wynik.get(z) ?? [];
    lista.push({ nr: Number(m[3]), plik });
    wynik.set(z, lista);
  }
  return new Map([...wynik].map(([z, l]) => [z, l.sort((a, b) => a.nr - b.nr).map((x) => x.plik)]));
}

const rozpakuj = (sciezka: string): Buffer => {
  const buf = readFileSync(sciezka);
  return sciezka.endsWith('.gz') ? gunzipSync(buf) : buf;
};
const czytaj = (sciezka: string) => rozpakuj(sciezka).toString('utf8');

export type WynikUzupelnienia = { dniDoUzupelnienia: number; uzupelnionych: number; przypadkow: number; bezZrodla: number };

export function uzupelnijBezGminy(
  db: DatabaseSync, katalog: string, znane: ReadonlySet<string>, opcje: { maksMs?: number; log?: (s: string) => void } = {},
): WynikUzupelnienia {
  const start = Date.now();
  const doUzupelnienia = new Map(
    (db.prepare('select dzien, pobrano from pomoc_publiczna_dni where bez_gminy is null').all() as unknown as { dzien: string; pobrano: string }[])
      .map((r) => [r.dzien, r.pobrano]),
  );
  const wynik: WynikUzupelnienia = { dniDoUzupelnienia: doUzupelnienia.size, uzupelnionych: 0, przypadkow: 0, bezZrodla: 0 };
  if (!doUzupelnienia.size) return wynik;

  const wGmine = (w: PrzypadekPomocy) => {
    const t = terytGminyZKodu(w['gmina-siedziby-kod']);
    return t !== null && znane.has(t);
  };
  const ustaw = db.prepare(
    'update pomoc_publiczna_dni set bez_gminy = ?, bez_gminy_brutto = ? where dzien = ? and pobrano = ? and bez_gminy is null',
  );
  const usun = db.prepare('delete from pomoc_bez_gminy where dzien = ?');

  for (const [zakres, pliki] of stronyZakresow(readdirSync(katalog))) {
    if (opcje.maksMs && Date.now() - start > opcje.maksMs) {
      opcje.log?.(`   limit czasu — reszta przy nastepnej migracji`);
      break;
    }
    const [od, doDnia] = zakres.split('..') as [string, string];
    const kandydaci = [...doUzupelnienia.keys()].filter((d) => d >= od && d <= doDnia);
    if (!kandydaci.length) continue;
    // Najwczesniejszy znacznik stron = znacznik, ktory import nadal dniom zakresu.
    // Dwa przejscia, strona po stronie: zakres bywa 121 stron po ~15 MB, a trzymanie
    // ich naraz to 1,8 GB przy stercie 1,4 GB (pulapka 61).
    const znaczniki = pliki.map((p) => pobranoZKonca(rozpakuj(join(katalog, p))));
    if (znaczniki.some((z) => z === null)) continue;
    const pobrano = (znaczniki as string[]).reduce((a, b) => (b < a ? b : a));
    const dni = new Set(kandydaci.filter((d) => doUzupelnienia.get(d) === pobrano));
    if (!dni.size) continue;

    const naDzien = new Map<string, { ile: number; brutto: number }>([...dni].map((d) => [d, { ile: 0, brutto: 0 }]));
    const licznik = new Map<string, number>();
    wTransakcji(db, () => {
      for (const d of dni) usun.run(d);
      for (const p of pliki) {
        const wiersze = ((JSON.parse(czytaj(join(katalog, p))) as OdpowiedzSudop).wyniki ?? [])
          .filter((w) => dni.has(w['dzien-udzielenia-pomocy']!) && !wGmine(w));
        for (const w of wiersze) {
          const s = naDzien.get(w['dzien-udzielenia-pomocy']!)!;
          s.ile++;
          s.brutto += kwota(w['wartosc-brutto-pln']) ?? 0;
        }
        wstawWiersze(db, wiersze, (w) => wojewodztwoZKodu(w['gmina-siedziby-kod']), licznik, 'pomoc_bez_gminy');
      }
      for (const [d, s] of naDzien) {
        ustaw.run(s.ile, s.brutto, d, pobrano);
        wynik.przypadkow += s.ile;
      }
    });
    wynik.uzupelnionych += dni.size;
    for (const d of dni) doUzupelnienia.delete(d);
  }
  wynik.bezZrodla = (db.prepare('select count(*) as c from pomoc_publiczna_dni where bez_gminy is null').get() as { c: number }).c;
  return wynik;
}
