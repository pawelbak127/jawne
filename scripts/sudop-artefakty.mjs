/**
 * Sciaga odpowiedzi SUDOP zebrane przez GitHub Actions i importuje je lokalnie.
 *
 *   npm run sudop:artefakty              -- tylko sciaga i mowi, co uruchomic
 *   npm run sudop:artefakty -- --import  -- sciaga i od razu importuje
 *
 * Import z plikow NIE pyta urzedu o nic: `ingest/jobs/sudop.ts` czyta
 * zapisana odpowiedz, jesli plik juz jest.
 *
 * Wymaga `gh` (GitHub CLI) zalogowanego do konta z dostepem do repozytorium.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KATALOG = join('dane', 'zrodla', 'sudop');
const TYMCZASOWY = join(KATALOG, '_artefakty');
const WORKFLOW = 'sudop-przyrost.yml';
const nl = (s = '') => process.stdout.write(`${s}\n`);

/** Lokalna wersja odpowiedzi (zwykla albo spakowana) albo null. */
function czytajLokalny(cel) {
  if (existsSync(cel)) return JSON.parse(readFileSync(cel, 'utf8'));
  if (existsSync(`${cel}.gz`)) return JSON.parse(gunzipSync(readFileSync(`${cel}.gz`)).toString('utf8'));
  return null;
}

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

try {
  gh('auth', 'status');
} catch {
  nl('Brak zalogowanego `gh` (GitHub CLI). Zainstaluj i wykonaj: gh auth login');
  process.exit(1);
}

mkdirSync(KATALOG, { recursive: true });
rmSync(TYMCZASOWY, { recursive: true, force: true });
mkdirSync(TYMCZASOWY, { recursive: true });

const przebiegi = JSON.parse(gh('run', 'list', '--workflow', WORKFLOW, '--json', 'databaseId,conclusion,createdAt', '--limit', '60'))
  .filter((p) => p.conclusion === 'success');
nl(`Udanych przebiegów: ${przebiegi.length}`);

let nowych = 0;
const noweZakresy = new Set();
for (const p of przebiegi) {
  try {
    gh('run', 'download', String(p.databaseId), '-D', TYMCZASOWY);
  } catch {
    // Artefakt wygasl (90 dni) albo juz go nie ma — to nie blad tego skryptu.
    continue;
  }
}

// gh rozpakowuje kazdy artefakt do osobnego katalogu — splaszczamy i odpakowujemy.
const doPrzejrzenia = [TYMCZASOWY];
while (doPrzejrzenia.length) {
  const k = doPrzejrzenia.pop();
  if (!existsSync(k)) continue;
  for (const wpis of readdirSync(k)) {
    const sciezka = join(k, wpis);
    if (statSync(sciezka).isDirectory()) {
      doPrzejrzenia.push(sciezka);
      continue;
    }
    if (!wpis.endsWith('.json.gz')) continue;
    const cel = join(KATALOG, wpis.replace(/\.gz$/, ''));
    const tresc = gunzipSync(readFileSync(sciezka));
    // Ten sam dzien bywa pobierany dwa razy: dzien pozniej (niepelny) i po
    // 14 dniach (ustalony). Nowsze pobranie wygrywa, starsze zostaje nadpisane.
    const lokalny = czytajLokalny(cel);
    if (lokalny && (lokalny.pobrano ?? '') >= (JSON.parse(tresc.toString('utf8')).pobrano ?? '')) continue;
    rmSync(`${cel}.gz`, { force: true });
    writeFileSync(cel, tresc);
    nowych++;
    const m = /^przyrost-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-s\d+\.json$/.exec(wpis.replace(/\.gz$/, ''));
    if (m) noweZakresy.add(`${m[1]}..${m[2]}`);
  }
}
rmSync(TYMCZASOWY, { recursive: true, force: true });
nl(`Nowych plików odpowiedzi: ${nowych}`);

// Importujemy tylko zakresy z NOWYCH artefaktow — reszta juz jest w bazie.
const zakresy = [...noweZakresy].sort();
if (!zakresy.length) {
  nl('Nic nowego w artefaktach — nie ma czego importować.');
  process.exit(0);
}

const zaimportuj = process.argv.includes('--import');
nl(zaimportuj ? 'Importuję (bez zapytań do urzędu — z plików):' : 'Do zaimportowania (z plików, bez zapytań do urzędu):');
for (const z of zakresy) {
  if (!zaimportuj) {
    nl(`   npx tsx ingest/jobs/sudop.ts --przyrost=${z}`);
    continue;
  }
  nl(`-> ${z}`);
  // tsx wolany wprost przez node, bez npx: npx na Windows wymaga shell: true,
  // a to Node 24 oznacza jako niebezpieczne (DEP0190).
  execFileSync(process.execPath, [join('node_modules', 'tsx', 'dist', 'cli.mjs'), 'ingest/jobs/sudop.ts', `--przyrost=${z}`], { stdio: 'inherit' });
}

// Po imporcie pakujemy surowe odpowiedzi: zajmuja kilkanascie MB na dzien,
// a import umie je czytac spakowane, wiec powtorka nadal nie pyta urzedu.
if (zaimportuj) {
  let spakowanych = 0;
  for (const p of readdirSync(KATALOG).filter((x) => /^przyrost-.*\.json$/.test(x))) {
    const sciezka = join(KATALOG, p);
    writeFileSync(`${sciezka}.gz`, gzipSync(readFileSync(sciezka)));
    rmSync(sciezka);
    spakowanych++;
  }
  nl(`Spakowano ${spakowanych} odpowiedzi (.json.gz) — import umie je czytać.`);
}
