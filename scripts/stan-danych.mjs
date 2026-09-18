/**
 * Co juz mamy, a czego jeszcze nie — i jakim poleceniem to dociagnac.
 *
 *   npm run stan
 *
 * Pisany tak, zeby byl PIERWSZA rzecza uruchamiana po wlaczeniu komputera
 * i na poczatku kazdej sesji: nie zmienia niczego, tylko czyta baze i mowi,
 * co zrobic dalej. Zadnych zapytan do zadnego urzedu.
 */
import { existsSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const PLIK = 'dane/sejm.db';
// Musi sie zgadzac z DNI_DO_USTALENIA w src/lib/dane.ts: urzedy maja 7 dni na
// zgloszenie pomocy, dzien pobrany wczesniej jest niepelny.
const DNI_DO_USTALENIA = 14;
const KATALOG_SUDOP = 'dane/zrodla/sudop';
const DZIS = new Date();
const dzien = (d) => d.toISOString().slice(0, 10);
const wczoraj = dzien(new Date(DZIS.getTime() - 24 * 3600_000));
// Okno rejestru SUDOP: od 1 stycznia roku n-10.
const POCZATEK_OKNA = `${DZIS.getUTCFullYear() - 10}-01-01`;

const nl = (s = '') => process.stdout.write(`${s}\n`);
const liczba = (n) => n.toLocaleString('pl-PL');

if (!existsSync(PLIK)) {
  nl(`Nie ma pliku ${PLIK}. Zacznij od:`);
  nl('   npm run import kluby poslowie glosowania');
  process.exit(0);
}

const db = new DatabaseSync(PLIK, { readOnly: true });
const jeden = (sql, ...p) => {
  try {
    return db.prepare(sql).get(...p);
  } catch {
    return null; // brak tabeli = etap jeszcze nieuruchomiony
  }
};
const wszystkie = (sql, ...p) => {
  try {
    return db.prepare(sql).all(...p);
  } catch {
    return [];
  }
};

nl('== Co mamy');
for (const [co, opis] of [
  ['poslowie', 'posłowie'],
  ['glosowania', 'głosowania'],
  ['glosy', 'głosy imienne'],
  ['okregi', 'okręgi i gminy'],
  ['ludnosc', 'ludność gmin'],
  ['budzety', 'budżety gmin'],
  ['fundusze-2021-2027', 'projekty UE 2021–2027'],
  ['fundusze-2014-2020', 'projekty UE 2014–2020'],
]) {
  const w = jeden('select ile, kiedy from import where co = ?', co);
  const kiedy = w ? new Date(w.kiedy) : null;
  const ile = kiedy ? Math.round((DZIS - kiedy) / 86_400_000) : null;
  const kiedyTekst = ile === 0 ? 'dzisiaj' : ile === 1 ? 'wczoraj' : `${ile} dni temu`;
  nl(w ? `   ${opis.padEnd(22)} ${String(liczba(w.ile)).padStart(9)}   ${kiedyTekst}` : `   ${opis.padEnd(22)}         —   nie importowano`);
}

// Dni brakujace w srodku pobranego zakresu — zwykle przerwane pobieranie.
const brakiWSrodku = [];

nl();
nl('== Pomoc publiczna (SUDOP)');
const wierszy = jeden('select count(*) as c from pomoc_publiczna')?.c ?? 0;
const gminy = wszystkie('select teryt, wierszy from pomoc_publiczna_pobrania order by teryt');
const dni = wszystkie('select dzien, wierszy, pobrano from pomoc_publiczna_dni order by dzien');
const poDniach = (a, b) => Math.round((new Date(`${a}T00:00:00Z`) - new Date(`${b}T00:00:00Z`)) / 86_400_000);
// Dzien niepelny: pobrany mniej niz DNI_DO_USTALENIA dni po swojej dacie.
const niepelne = dni.filter((d) => poDniach(d.pobrano.slice(0, 10), d.dzien) < DNI_DO_USTALENIA);
// Do odswiezenia: niepelne, ktore JUZ zdazyly sie ustalic (minelo 14 dni).
const doOdswiezenia = niepelne.filter((d) => poDniach(dzien(DZIS), d.dzien) >= DNI_DO_USTALENIA);
nl(`   przypadków w bazie: ${liczba(wierszy)}`);
nl(`   gminy pobrane w całości (10 lat): ${gminy.length}${gminy.length ? ` — ${gminy.map((g) => g.teryt).join(', ')}` : ''}`);

if (!dni.length) {
  nl('   dni pobrane dla całego kraju: 0');
} else {
  const od = dni[0].dzien;
  const doDnia = dni[dni.length - 1].dzien;
  // Dziury w srodku zakresu: dzien, ktorego nie ma w tabeli, nie zostal
  // pobrany — to co innego niz dzien pobrany, w ktorym nic nie bylo.
  const mamy = new Set(dni.map((d) => d.dzien));
  for (let d = new Date(`${od}T00:00:00Z`); dzien(d) <= doDnia; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!mamy.has(dzien(d))) brakiWSrodku.push(dzien(d));
  }
  const wszystkichDni = Math.round((new Date(`${wczoraj}T00:00:00Z`) - new Date(`${POCZATEK_OKNA}T00:00:00Z`)) / 86_400_000) + 1;
  nl(`   dni pobrane dla całego kraju: ${dni.length} (${od} … ${doDnia})`);
  nl(`   to ${(100 * dni.length / wszystkichDni).toFixed(1)}% okna rejestru (${liczba(wszystkichDni)} dni od ${POCZATEK_OKNA})`);
  if (brakiWSrodku.length) nl(`   UWAGA: dziury w środku zakresu: ${brakiWSrodku.length} dni, np. ${brakiWSrodku.slice(0, 5).join(', ')}`);
  nl(`   dni niepełnych (pobrane < ${DNI_DO_USTALENIA} dni po dacie, pomijane w sumach): ${niepelne.length}`);
}

nl();
nl('== Co dociągnąć (każde polecenie to osobne zapytania do UOKiK)');
const ostatni = dni.length ? dni[dni.length - 1].dzien : null;
const pierwszy = dni.length ? dni[0].dzien : null;

// Przerwane pobieranie zostawia pliki stron nazwane zakresem, o ktory pytano
// (przyrost-OD-DO-sN.json). Import uzyje ich TYLKO przy identycznym zakresie,
// wiec najpierw proponujemy dokladnie te zakresy — inaczej te same strony
// zostalyby pobrane od urzedu drugi raz.
const dniZakresu = (od, doD) => {
  const w = [];
  for (let d = new Date(`${od}T00:00:00Z`); dzien(d) <= doD; d.setUTCDate(d.getUTCDate() + 1)) w.push(dzien(d));
  return w;
};
const mamyDni = new Set(dni.map((d) => d.dzien));
const przerwane = existsSync(KATALOG_SUDOP)
  ? [...new Set(readdirSync(KATALOG_SUDOP)
    .map((p) => /^przyrost-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-s\d+\.json(\.gz)?$/.exec(p))
    .filter(Boolean)
    .map((m) => `${m[1]}..${m[2]}`))]
    .filter((z) => dniZakresu(...z.split('..')).some((d) => !mamyDni.has(d)))
    .sort()
  : [];
const pokryte = new Set(przerwane.flatMap((z) => dniZakresu(...z.split('..'))));

// Pozostale dziury skladamy w ciagle zakresy: jedno polecenie na zakres.
const zakresyDziur = [];
for (const d of brakiWSrodku.filter((x) => !pokryte.has(x))) {
  const ost = zakresyDziur[zakresyDziur.length - 1];
  const nastepny = ost ? dzien(new Date(new Date(`${ost[1]}T00:00:00Z`).getTime() + 86_400_000)) : null;
  if (ost && nastepny === d) ost[1] = d;
  else zakresyDziur.push([d, d]);
}
if (przerwane.length || zakresyDziur.length) {
  nl('   0. Dziury — najpierw te, bo przerwane pobieranie zostawiło już część stron:');
  for (const z of przerwane) nl(`      npx tsx ingest/jobs/sudop.ts --przyrost=${z}   (część stron na dysku)`);
  for (const [od, doD] of zakresyDziur.slice(0, 5)) nl(`      npx tsx ingest/jobs/sudop.ts --przyrost=${od}..${doD}`);
}

if (doOdswiezenia.length) {
  // Ciagle zakresy, jedno polecenie na zakres.
  const zakresy = [];
  for (const d of doOdswiezenia.map((x) => x.dzien)) {
    const ost = zakresy[zakresy.length - 1];
    if (ost && poDniach(d, ost[1]) === 1) ost[1] = d;
    else zakresy.push([d, d]);
  }
  nl(`   0b. Odśwież dni, które już się ustaliły (${doOdswiezenia.length}):`);
  for (const [od, doD] of zakresy.slice(0, 5)) nl(`      npx tsx ingest/jobs/sudop.ts --przyrost=${od}..${doD} --odswiez`);
}

if (!ostatni || ostatni < wczoraj) {
  const od = ostatni ? dzien(new Date(new Date(`${ostatni}T00:00:00Z`).getTime() + 86_400_000)) : wczoraj;
  const ile = Math.round((new Date(`${wczoraj}T00:00:00Z`) - new Date(`${od}T00:00:00Z`)) / 86_400_000) + 1;
  nl(`   1. Świeże dni (${ile}): npx tsx ingest/jobs/sudop.ts --przyrost=${od}..${wczoraj}`);
} else {
  nl('   1. Świeże dni: nic — mamy wszystko do wczoraj.');
}

if (pierwszy && pierwszy > POCZATEK_OKNA) {
  const doDnia = dzien(new Date(new Date(`${pierwszy}T00:00:00Z`).getTime() - 86_400_000));
  const od = dzien(new Date(new Date(`${doDnia}T00:00:00Z`).getTime() - 29 * 86_400_000));
  const zostalo = Math.round((new Date(`${doDnia}T00:00:00Z`) - new Date(`${POCZATEK_OKNA}T00:00:00Z`)) / 86_400_000) + 1;
  nl(`   2. Historia wstecz (zostało ${liczba(zostalo)} dni do ${POCZATEK_OKNA}):`);
  nl(`      npx tsx ingest/jobs/sudop.ts --przyrost=${od > POCZATEK_OKNA ? od : POCZATEK_OKNA}..${doDnia}`);
  nl('      (miesiąc to ok. 4–6 zapytań; przy tym tempie całe okno to tygodnie pracy — decyzja w docs/sudop.md)');
}

const stare = wszystkie('select co, kiedy from import').filter((w) => (DZIS - new Date(w.kiedy)) / 86_400_000 > 30);
if (stare.length) nl(`   3. Starsze niż 30 dni: ${stare.map((w) => w.co).join(', ')} — rozważ ponowny import.`);

db.close();
