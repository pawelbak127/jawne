/**
 * Generuje src/lib/imiona-pesel.ts z wykazow imion rejestru PESEL
 * (dane.gov.pl, zbior 1667, "imie pierwsze", osoby zyjace).
 *
 *   node scripts/imiona-pesel.mjs
 *
 * Po co: nazwa beneficjenta zawierajaca imie w mianowniku ("... Anna Nowak")
 * to prawie zawsze jednoosobowa dzialalnosc. Znacznik w rodzaju "zakład" czy
 * "centrum" tego nie wyklucza — patrz src/lib/prywatnosc.ts.
 *
 * Prog 200 osob: rzadsze imiona to glownie zapisy obcojezyczne, ktore czesciej
 * koliduja ze zwyklymi slowami w nazwach firm, a rzadko wystepuja w nazwach
 * jednoosobowych dzialalnosci. Plik wynikowy jest w repozytorium, zeby build
 * nie zalezal od sieci; xlsx lezy w dane/ (poza repozytorium).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import ExcelJS from 'exceljs';

const PROG = 200;
const ZASOBY = [
  { plik: 'imiona-zenskie-2026.xlsx', id: 1159670, plec: 'zenskie' },
  { plik: 'imiona-meskie-2026.xlsx', id: 1159669, plec: 'meskie' },
];
const KATALOG = 'dane/zrodla/pesel';

mkdirSync(KATALOG, { recursive: true });
const imiona = { zenskie: new Set(), meskie: new Set() };
const opisy = [];

for (const z of ZASOBY) {
  const sciezka = `${KATALOG}/${z.plik}`;
  if (!existsSync(sciezka)) {
    const res = await fetch(`https://api.dane.gov.pl/resources/${z.id}/file`);
    if (!res.ok) throw new Error(`${z.id}: HTTP ${res.status}`);
    writeFileSync(sciezka, Buffer.from(await res.arrayBuffer()));
  }
  const bajty = readFileSync(sciezka);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bajty);
  const ws = wb.worksheets[0];
  // Kontrola ksztaltu przed uzyciem: naglowek i typ liczby.
  const naglowek = [1, 2, 3].map((i) => String(ws.getRow(1).getCell(i).value ?? '').trim());
  if (naglowek[0] !== 'IMIĘ_PIERWSZE' || naglowek[2] !== 'LICZBA_WYSTĄPIEŃ') {
    throw new Error(`${z.plik}: nieoczekiwany naglowek ${JSON.stringify(naglowek)}`);
  }
  let wzietych = 0;
  ws.eachRow((r, n) => {
    if (n === 1) return;
    const imie = String(r.getCell(1).value ?? '').trim();
    const liczba = Number(r.getCell(3).value);
    if (!Number.isFinite(liczba)) throw new Error(`${z.plik}, wiersz ${n}: liczba ${r.getCell(3).value}`);
    if (liczba >= PROG && /^\p{Lu}+$/u.test(imie)) {
      imiona[z.plec].add(imie);
      wzietych++;
    }
  });
  const sha = createHash('sha256').update(bajty).digest('hex');
  opisy.push(`//   ${z.plik} (zasob ${z.id}): ${wzietych} imion, sha256 ${sha.slice(0, 16)}…`);
}

const lista = (zbior) => [...zbior].sort((a, b) => a.localeCompare(b, 'pl')).join(' ');
writeFileSync(
  'src/lib/imiona-pesel.ts',
  `// PLIK GENEROWANY — node scripts/imiona-pesel.mjs. Nie edytuj recznie.
// Imiona pierwsze z rejestru PESEL (osoby zyjace, stan na 20.01.2026),
// noszone przez co najmniej ${PROG} osob. Zrodlo: dane.gov.pl, zbior 1667.
${opisy.join('\n')}
const ZENSKIE = '${lista(imiona.zenskie)}';
const MESKIE = '${lista(imiona.meskie)}';

export const IMIONA_MESKIE: ReadonlySet<string> = new Set(MESKIE.split(' '));
export const IMIONA_PESEL: ReadonlySet<string> = new Set([...ZENSKIE.split(' '), ...IMIONA_MESKIE]);
`,
);
console.log(`zapisano ${imiona.zenskie.size} zenskich i ${imiona.meskie.size} meskich imion`);
