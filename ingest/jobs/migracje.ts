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
import { existsSync, statSync } from 'node:fs';
import { policzAgregaty } from '../lib/agregaty.js';
import { otworz, SCIEZKA_BAZY, zalozSchemat } from '../lib/baza.js';
import { sprawdzSumy } from '../lib/sumy-pomocy.js';
import { przeliczTerytRegon, znormalizujNabywcow } from '../lib/teryt-regon.js';
import { nipZTekstu } from '../../src/lib/nip.js';
import { wTransakcji } from '../lib/baza.js';
import { TERYT_WARSZAWY } from '../lib/fe.js';

const log = (s: string) => process.stdout.write(`${s}\n`);

const mb = (b: number | null) => (b === null ? '?' : `${Math.round(b / 1024 / 1024)} MB`);
/** null znaczy, ze pliku nie ma — czyli dziennik jest zlozony. */
const rozmiarWal = (): number | null => {
  try { return statSync(`${SCIEZKA_BAZY}-wal`).size; } catch { return null; }
};

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
    /*
     * Dwie naprawy na danych, ktore juz sa w bazie — BEZ SIECI.
     * Obie znalezione przegladem 01.10.2026 i obie tego samego rodzaju:
     * zlaczenie szlo po polu, ktore nie bylo tym, czym wygladalo.
     * Idempotentne: po pierwszym przebiegu nie maja co robic.
     */
    const nab = wTransakcji(db, () => znormalizujNabywcow(db, nipZTekstu));
    if (nab.sprawdzono) {
      log(`   TED: znormalizowano NIP nabywcy w ${nab.sprawdzono} ogloszeniach `
        + `(rozpoznano ${nab.poprawione}, wyzerowano ${nab.wyzerowane})`);
    }
    const ter = wTransakcji(db, () => przeliczTerytRegon(db));
    if (ter.doszlo || ter.poprawione) {
      log(`   REGON: sprawdzono ${ter.sprawdzono} wierszy (bez kodu albo z kodem z pary kolizyjnej); `
        + `TERYT doszedl ${ter.doszlo}, POPRAWIONO ${ter.poprawione}, bez kodu zostaje ${ter.nadal}`);
    }

    const start = Date.now();
    const w = policzAgregaty(db, process.argv.includes('--agregaty-od-nowa'));
    log(`   ${w.opis} (${Math.round((Date.now() - start) / 1000)} s)`);

    /*
     * ZLOZENIE DZIENNIKA WAL.
     *
     * ZMIERZONE NA SERWERZE 03.10.2026: sejm.db ma 4,8 GB, a sejm.db-wal
     * urosl do 978 MB — przy 1,8 GB pamieci maszyny. W trybie WAL kazdy
     * odczyt musi przejrzec dziennik, wiec taki plik obciaza KAZDE wejscie
     * czytelnika, nie tylko import.
     *
     * Dziennik rosnie, bo samoczynne skladanie nie moze przyciac pliku,
     * dopoki trzyma go czytelnik — a next-server chodzi bez przerwy dobami.
     * Zlozenie na zadanie, tutaj, trafia w moment, gdy wiekszosc zadan stoi:
     * instaluj.sh zatrzymuje je przed budowa, a migracje ida tuz przed nia.
     *
     * TRUNCATE, nie PASSIVE: PASSIVE przepisuje strony do bazy, ale pliku nie
     * skraca, wiec te 978 MB zostaloby na dysku. BLAD NIE PRZERYWA MIGRACJI —
     * gdy czytelnik akurat trzyma dziennik, skladanie ma po prostu nie wyjsc,
     * a nie wywrocic wdrozenia.
     */
    try {
      const przed = rozmiarWal();
      const r = db.prepare('pragma wal_checkpoint(truncate)').get() as { busy: number } | undefined;
      if (przed !== null) {
        log(`   dziennik WAL: ${mb(przed)} -> ${mb(rozmiarWal())}`
          + (r?.busy ? '  (zajety przez czytelnika — zlozy sie przy nastepnym przebiegu)' : ''));
      }
    } catch (e) {
      log(`   dziennika WAL nie udalo sie zlozyc: ${(e as Error).message}`);
    }

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
