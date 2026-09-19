/**
 * Paczka danych dla serwera: kopia bazy i surowe odpowiedzi SUDOP.
 *
 *   npm run paczka-na-serwer
 *
 * Wynik: dane/do-serwera.tgz — do skopiowania na serwer (docs/serwer.md).
 * Nie pyta zadnego urzedu. Odpowiedzi SUDOP jada razem z baza, bo ich
 * ponowne pobranie to zapytania do UOKiK; listy FE i reszte serwer pobierze
 * sam albo ich nie potrzebuje.
 *
 * Paczka zawiera dane osobowe (nazwy jednoosobowych firm, NIP-y) — po
 * wgraniu na serwer usun ja z dysku.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const BAZA = 'dane/sejm.db';
const KOPIA = 'dane/do-serwera.db';
const PACZKA = 'dane/do-serwera.tgz';
const BLOKADA = 'dane/zrodla/sudop/.blokada';
const nl = (s = '') => process.stdout.write(`${s}\n`);

if (!existsSync(BAZA)) {
  nl(`Nie ma ${BAZA} — nie ma czego wysylac.`);
  process.exit(1);
}

// Trwajace pobieranie dopisze dni PO zrobieniu kopii — serwer by ich nie
// dostal, a jego plan nocny zapytalby o nie urzad drugi raz.
if (existsSync(BLOKADA)) {
  const b = JSON.parse(readFileSync(BLOKADA, 'utf8'));
  let zyje = true;
  try {
    process.kill(b.pid, 0);
  } catch (e) {
    zyje = e?.code === 'EPERM';
  }
  if (zyje) {
    nl(`Trwa pobieranie z SUDOP (PID ${b.pid}, od ${b.start}: ${b.argv}).`);
    nl('Poczekaj, az skonczy, i uruchom ponownie.');
    process.exit(1);
  }
}

rmSync(KOPIA, { force: true });
// VACUUM INTO: spojna kopia jednym plikiem, bez -wal i -shm obok.
const zrodlo = new DatabaseSync(BAZA, { readOnly: true });
zrodlo.exec(`vacuum into '${KOPIA}'`);
zrodlo.close();

const kopia = new DatabaseSync(KOPIA, { readOnly: true });
const wynik = kopia.prepare('pragma integrity_check').get();
const liczba = (sql) => {
  try {
    return kopia.prepare(sql).get().c;
  } catch {
    return 0;
  }
};
const poslow = liczba('select count(*) as c from poslowie');
const dni = liczba('select count(*) as c from pomoc_publiczna_dni');
const przypadkow = liczba('select count(*) as c from pomoc_publiczna');
kopia.close();
if (wynik.integrity_check !== 'ok') {
  nl(`Kopia nie przeszla kontroli integralnosci: ${JSON.stringify(wynik)}`);
  process.exit(1);
}

rmSync(PACZKA, { force: true });
execFileSync('tar', [
  '-czf', PACZKA, '--exclude=.blokada', '--exclude=_artefakty',
  '-C', 'dane', 'do-serwera.db', 'zrodla/sudop',
], { stdio: 'inherit' });
rmSync(KOPIA);

const mb = (statSync(PACZKA).size / 1024 / 1024).toFixed(0);
nl(`Gotowe: ${PACZKA} (${mb} MB)`);
nl(`   poslow ${poslow}, dni SUDOP ${dni}, przypadkow pomocy ${przypadkow.toLocaleString('pl-PL')}; integralnosc: ok`);
nl('Dalej (docs/serwer.md, krok 7):');
nl('   scp dane/do-serwera.tgz jawne:/tmp/');
