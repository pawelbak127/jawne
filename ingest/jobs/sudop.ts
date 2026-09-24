/**
 * Import pomocy publicznej z SUDOP.
 *
 *   npx tsx ingest/jobs/sudop.ts --gminy=100101,100102
 *   npx tsx ingest/jobs/sudop.ts --przyrost=2026-09-15..2026-09-17
 *   npx tsx ingest/jobs/sudop.ts --dzienny                     (serwer, co noc)
 *   npx tsx ingest/jobs/sudop.ts --historia --maks-zapytan=150 (serwer, co noc)
 *   npx tsx ingest/jobs/sudop.ts --historia --plan             (co by pobral — bez pytania urzedu)
 *
 * Dwa tryby, dwa rozne koszty dla urzedu:
 *  - GMINA: cale 10 lat jednej gminy, kilka zapytan (Zakopane: 5).
 *  - PRZYROST: jeden dzien dla CALEGO KRAJU, jedno zapytanie. Zmierzone
 *    18.09.2026: 3 531 przypadkow z 1 150 gmin zmiescilo sie w jednej stronie.
 * Tryby serwera skladaja sie z przyrostow: --dzienny to wczoraj i dzien
 * sprzed 14 dni, --historia to kolejne zakresy z planHistorii (ingest/lib/
 * harmonogram.ts) do limitu zapytan i tylko w oknie godzin.
 *
 * Nie jest czescia `import wszystko` i nie bedzie. Kazda gmina to jedno
 * zgloszenie w kolejce urzedu, ktory napisal, ze ruch przekracza jego
 * mozliwosci. Stad:
 *  - zawsze jedno zapytanie w toku, nigdy rownolegle,
 *  - odpytywanie kolejki co 60 s (list UOKiK), najdluzej 62 min,
 *  - przerwa po trzech nieudanych gminach z rzedu,
 *  - zapisujemy surowa odpowiedz, zeby powtorny zapis nie wymagal
 *    ponownego pytania urzedu (`--z-plikow`).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { odnotujImport, otworz, zalozSchemat } from '../lib/baza.js';
import {
  dodajDni, DNI_DO_USTALENIA, dzienWarszawa, planHistorii, stanDnia, wOknie, zakresyZPlikow, type DzienPobrany,
} from '../lib/harmonogram.js';
import {
  adresPrzyrostu, adresWyszukania, kluczePorcji, kodySudopGminy, kwota, poczatekOknaDanych,
  sprawdzPorcje, sprawdzPorcjePrzyrostu, SUDOP_BAZA, terytGminyZKodu, TERYT_WARSZAWY,
  type KodGminySudop, type OdpowiedzSudop, type PrzypadekPomocy,
} from '../lib/sudop.js';

const log = (s: string) => process.stdout.write(`${s}\n`);
const spij = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA = 'jawne.pl/0.1 (serwis obywatelski; import reczny, jedno zapytanie w toku)';
const KATALOG = join(process.cwd(), 'dane', 'zrodla', 'sudop');
const CO_ILE_MS = 60_000;
// ZMIERZONE w nocy 22/23.09.2026: rekord kolejki zyje ROWNO godzine. Zadanie
// czekalo 59 minut ("czeka (1 min)" ... "czeka (59 min)"), a w 60. minucie
// urzad oddal 404 "Nie znaleziono rekordu o podanym identyfikatorze".
// Czekanie dluzej niz godzine nie moze sie udac — konczymy piec minut
// wczesniej i mowimy wprost, ze wynik nie przyszedl w czasie zycia rekordu.
const HORYZONT_MS = 55 * 60_000;
const NA_STRONE = 10_000; // instrukcja UOKiK: do 10 tys. wierszy na strone

async function get(url: string) {
  // redirect: 'manual' — inaczej fetch sam idzie za 303 i gubi adres kolejki.
  const odp = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(120_000),
  });
  return { status: odp.status, location: odp.headers.get('location'), tekst: await odp.text() };
}

const pelny = (loc: string) => (/^https?:/.test(loc) ? loc : new URL(loc, SUDOP_BAZA).toString());

/** Przydzial jednego przebiegu: ile zapytan i w jakich godzinach wolno zaczac nowe. */
type Budzet = {
  maks: number;
  uzyte: number;
  okno: string | null;
  /**
   * Ile czekamy na PIERWSZY wynik danego zakresu. ZMIERZONE: kolejka
   * odpowiada noca po 1-3 minutach (najdluzej 14), wiec gdy milczy 20 minut,
   * to nie jest wolna kolejka, tylko kolejka, ktora nie odpowie. Czekanie
   * pelnych 55 minut na kazdy z trzech zakresow kosztowalo nas prawie trzy
   * godziny nocy — i tak zakonczone zerem (noce 22/23 i 23/24.09.2026).
   */
  horyzontPierwszejMs?: number;
};

/** Koniec przydzialu — nie blad. Pobrane strony zostaja na dysku do wznowienia. */
class KoniecPrzydzialu extends Error {}

function sprawdzBudzet(b: Budzet | null): void {
  if (!b) return;
  if (b.uzyte >= b.maks) throw new KoniecPrzydzialu(`wykorzystano ${b.maks} zapytan`);
  if (b.okno && !wOknie(new Date(), b.okno)) throw new KoniecPrzydzialu(`koniec okna ${b.okno} (czas polski)`);
}

/**
 * Zapisana wczesniej odpowiedz, zwykla albo spakowana. Spakowane pliki robi
 * `scripts/sudop-artefakty.mjs` — bez tego odczytu powtorny import pytalby
 * urzad o cos, co juz mamy na dysku.
 */
function zapisanaOdpowiedz(plik: string): OdpowiedzSudop | null {
  if (existsSync(plik)) return JSON.parse(readFileSync(plik, 'utf8')) as OdpowiedzSudop;
  if (existsSync(`${plik}.gz`)) return JSON.parse(gunzipSync(readFileSync(`${plik}.gz`)).toString('utf8')) as OdpowiedzSudop;
  return null;
}

/** Slowniki sa zasobem statycznym — nie tworza pozycji w kolejce. */
async function slownik(nazwa: string): Promise<KodGminySudop[]> {
  const plik = join(KATALOG, `slownik-${nazwa}.json`);
  if (!existsSync(plik)) {
    const r = await get(`${SUDOP_BAZA}/slownik/${nazwa}`);
    if (r.status !== 200) throw new Error(`Slownik ${nazwa}: HTTP ${r.status}`);
    writeFileSync(plik, r.tekst, 'utf8');
  }
  return JSON.parse(readFileSync(plik, 'utf8')) as KodGminySudop[];
}

/** Jedno wyszukanie od rejestracji do wyniku. */
async function wyszukaj(url: string, opis: string, horyzontMs = HORYZONT_MS): Promise<OdpowiedzSudop> {
  const rej = await get(url);
  if (rej.status !== 303 || !rej.location) {
    throw new Error(`${opis}: rejestracja zwrocila ${rej.status} ${rej.tekst.slice(0, 200)}`);
  }
  const kolejka = pelny(rej.location);
  const start = Date.now();
  while (Date.now() - start < horyzontMs) {
    await spij(CO_ILE_MS);
    const min = ((Date.now() - start) / 60_000).toFixed(0);
    const r = await get(kolejka);
    if (r.status === 200) {
      log(`   ${opis}: czeka (${min} min)`);
      continue;
    }
    if (r.status === 303 && r.location) {
      const w = await get(pelny(r.location));
      if (w.status !== 200) throw new Error(`${opis}: wynik zwrocil ${w.status}`);
      log(`   ${opis}: gotowe po ${min} min`);
      return JSON.parse(w.tekst) as OdpowiedzSudop;
    }
    throw new Error(`${opis}: kolejka zwrocila ${r.status} ${r.tekst.slice(0, 200)}`);
  }
  throw new Error(
    `${opis}: kolejka nie oddala wyniku po ${Math.round(horyzontMs / 60_000)} min — odpuszczam ten zakres`,
  );
}

/**
 * Wstawia porcje. Klucz z numerem powtorzenia — zrodlo ma prawdziwe wiersze
 * identyczne na wszystkich polach (osobne transze tej samej pomocy).
 */
function wstawWiersze(db: DatabaseSync, wyniki: readonly PrzypadekPomocy[], terytZWiersza: (w: PrzypadekPomocy) => string): void {
  const wstaw = db.prepare(
    `insert into pomoc_publiczna(teryt, kod_gminy_sudop, dzien, nip_beneficjenta, nazwa_beneficjenta,
       wielkosc_kod, wielkosc, pkd, pkd_nazwa, nip_udzielajacego, udzielajacy, srodek_numer,
       srodek_nazwa, podstawa, przeznaczenie_kod, przeznaczenie, forma_kod, forma,
       wartosc_nominalna, wartosc_brutto, wartosc_brutto_eur, klucz)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const klucze = kluczePorcji(wyniki);
  wyniki.forEach((w, i) => {
    const podstawa = [w['podstawa-prawna-2a-nazwa'], w['podstawa-prawna-2b'], w['podstawa-prawna-2c']]
      .filter((x) => x && x.trim()).join(' — ') || null;
    wstaw.run(
      terytZWiersza(w), w['gmina-siedziby-kod'], w['dzien-udzielenia-pomocy']!, w['nip-beneficjenta'],
      w['nazwa-beneficjenta'], w['wielkosc-beneficjenta-kod'], w['wielkosc-beneficjenta-nazwa'],
      w['sektor-dzialalnosci-kod'], w['sektor-dzialalnosci-nazwa'], w['nip-udzielajacego-pomocy'],
      w['nazwa-udzielajacego-pomocy'], w['srodek-pomocowy-numer'], w['srodek-pomocowy-nazwa'],
      podstawa, w['przeznaczenie-pomocy-kod'], w['przeznaczenie-pomocy-nazwa'],
      w['forma-pomocy-kod'], w['forma-pomocy-nazwa'], kwota(w['wartosc-nominalna-pln']),
      kwota(w['wartosc-brutto-pln']), kwota(w['wartosc-brutto-eur']), klucze[i]!,
    );
  });
}

function zapisz(db: DatabaseSync, teryt: string, od: string, wyniki: OdpowiedzSudop['wyniki'], zapytan: number, sekund: number) {
  const problemy = sprawdzPorcje(wyniki, teryt);
  if (problemy.length) {
    throw new Error(`Gmina ${teryt}: porcja nie przeszla kontroli:\n  ${problemy.slice(0, 10).join('\n  ')}`);
  }
  db.exec('begin');
  // Cala gmina jest zastepowana naraz: SUDOP koryguje stare przypadki, wiec
  // dopisywanie zostawiloby w bazie wersje, ktorych urzad juz nie pokazuje.
  db.prepare('delete from pomoc_publiczna where teryt = ?').run(teryt);
  wstawWiersze(db, wyniki, () => teryt);
  db.prepare(
    `insert into pomoc_publiczna_pobrania(teryt, od, pobrano, wierszy, zapytan, sekund) values (?,?,?,?,?,?)
     on conflict(teryt) do update set od=excluded.od, pobrano=excluded.pobrano, wierszy=excluded.wierszy,
       zapytan=excluded.zapytan, sekund=excluded.sekund`,
  ).run(teryt, od, new Date().toISOString(), wyniki.length, zapytan, sekund);
  db.exec('commit');
}

/**
 * Zapis porcji krajowej. Dzien jest jednostka autorytatywna: kasujemy wszystko
 * z zakresu i wstawiamy od nowa, wiec korekta po stronie urzedu zastepuje
 * nasza wersje zamiast dokladac sie do niej.
 */
function zapiszPrzyrost(
  db: DatabaseSync, od: string, doDnia: string, wyniki: PrzypadekPomocy[], znane: ReadonlySet<string>, pobrano: string | null,
): { zapisanych: number; obce: number; nasze: PrzypadekPomocy[] } {
  const problemy = sprawdzPorcjePrzyrostu(wyniki, od, doDnia);
  if (problemy.length) {
    throw new Error(`Porcja ${od}..${doDnia} nie przeszla kontroli: ${problemy.slice(0, 10).join('; ')}`);
  }
  // Gminy spoza naszej listy (np. kod "NZ" albo jednostka, ktorej nie ma
  // w danych PKW) sa RAPORTOWANE, nie przerywaja importu.
  const nasze = wyniki.filter((w) => {
    const t = terytGminyZKodu(w['gmina-siedziby-kod']);
    return t !== null && znane.has(t);
  });
  db.exec('begin');
  db.prepare('delete from pomoc_publiczna where dzien between ? and ?').run(od, doDnia);
  wstawWiersze(db, nasze, (w) => terytGminyZKodu(w['gmina-siedziby-kod'])!);
  const wstawDzien = db.prepare(
    `insert into pomoc_publiczna_dni(dzien, pobrano, pobrano_dzien, wierszy) values (?,?,?,?)
     on conflict(dzien) do update set pobrano=excluded.pobrano, pobrano_dzien=excluded.pobrano_dzien,
       wierszy=excluded.wierszy`,
  );
  const naDzien = new Map<string, number>();
  for (const w of nasze) {
    const d = w['dzien-udzielenia-pomocy']!;
    naDzien.set(d, (naDzien.get(d) ?? 0) + 1);
  }
  // Dni bez ani jednego przypadku tez odnotowujemy — inaczej nie odroznimy
  // "nie pytalismy" od "pytalismy i nic nie bylo".
  for (let d = new Date(`${od}T00:00:00Z`); d <= new Date(`${doDnia}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const dzien = d.toISOString().slice(0, 10);
    // Stary plik bez naszej metryczki: zostawiamy date pobrania, ktora juz
    // jest w bazie — "teraz" oznaczyloby swiezy dzien jako ustalony.
    const istniejaca = pobrano ? null
      : (db.prepare('select pobrano from pomoc_publiczna_dni where dzien = ?').get(dzien) as { pobrano: string } | undefined)?.pobrano;
    const kiedy = pobrano ?? istniejaca ?? new Date().toISOString();
    // Polska data tej samej chwili. Liczymy ja RAZ, przy zapisie: nocne
    // zadanie o 01:17 ma w UTC jeszcze poprzedni dzien, a regula 14 dni
    // jest kalendarzowa (ZMIERZONE 22.09.2026 — patrz ingest/lib/baza.ts).
    wstawDzien.run(dzien, kiedy, dzienWarszawa(new Date(kiedy)), naDzien.get(dzien) ?? 0);
  }
  db.exec('commit');
  return { zapisanych: nasze.length, obce: wyniki.length - nasze.length, nasze };
}

/**
 * Samo pobranie zakresu dni — bez bazy. Uzywane przez `--tylko-pobierz`
 * (GitHub Actions nie ma pliku bazy; zapisuje surowe odpowiedzi i zostawia
 * je jako artefakt do zaimportowania na komputerze).
 */
async function pobierzPrzyrost(
  od: string, doDnia: string, odswiez = false, budzet: Budzet | null = null,
): Promise<{ wyniki: PrzypadekPomocy[]; zapytan: number; sekund: number; pobrano: string | null }> {
  const formy = (await slownik('forma-pomocy')).map((f) => String(f.number));
  log(`-> przyrost dla calego kraju, ${od}..${doDnia} (${formy.length} form pomocy)${odswiez ? ' — odswiezenie' : ''}`);
  const start = Date.now();
  const dzis = dzienWarszawa(new Date());
  let wyniki: PrzypadekPomocy[] = [];
  let pobrano: string | null = null;
  let liczba: number | null = null;
  // Po wykryciu stron z roznych chwil: strony starsze niz ta data nie ida z dysku.
  let swiezeOd: string | null = null;
  let strona = 1;
  let zapytan = 0;
  for (;;) {
    const plik = join(KATALOG, `przyrost-${od}-${doDnia}-s${strona}.json`);
    let odp: OdpowiedzSudop;
    const zapisana = zapisanaOdpowiedz(plik);
    // Przy odswiezeniu stary plik sie nie liczy — chyba ze pobralismy go
    // dzisiaj (wtedy to wznowienie przerwanego odswiezenia, nie stara wersja).
    const dzisiejsza = zapisana?.pobrano !== undefined && dzienWarszawa(new Date(zapisana.pobrano)) === dzis;
    const dosycSwieza = !swiezeOd || (zapisana?.pobrano ?? '') >= swiezeOd;
    if (zapisana && (!odswiez || dzisiejsza) && dosycSwieza) {
      odp = zapisana;
      log(`   strona ${strona}: z pliku`);
    } else {
      sprawdzBudzet(budzet);
      // Pierwsza strona zakresu ma krotszy horyzont, jesli zadanie go poda:
      // po niej wiadomo, czy kolejka w ogole odpowiada.
      const horyzont = strona === 1 && zapytan === 0 && budzet?.horyzontPierwszejMs
        ? budzet.horyzontPierwszejMs
        : HORYZONT_MS;
      odp = await wyszukaj(adresPrzyrostu(formy, od, doDnia, strona), `strona ${strona}`, horyzont);
      odp.pobrano = new Date().toISOString();
      zapytan++;
      if (budzet) budzet.uzyte++;
      writeFileSync(plik, JSON.stringify(odp), 'utf8');
      // Stara spakowana wersja tej strony jest juz nieaktualna.
      if (existsSync(`${plik}.gz`)) rmSync(`${plik}.gz`);
    }
    // Kazda strona to osobne zapytanie, a wznowiony zakres sklada strony
    // z roznych nocy. Jesli urzad w miedzyczasie dopisal przypadki, strony
    // sa wzgledem siebie przesuniete: sklejone dalyby duplikaty (policzone
    // potem jako osobne transze) albo luki. Liczba wynikow musi sie zgadzac.
    // ZMIERZONE: strony pobrane jednym ciagiem maja ja identyczna (33 409
    // na 4 stronach, 45 377 na 5).
    if (liczba === null) {
      liczba = odp['liczba-wynikow'];
    } else if (odp['liczba-wynikow'] !== liczba) {
      if (swiezeOd) {
        throw new Error(`${od}..${doDnia}: liczba wynikow zmienia sie w trakcie pobierania (${liczba} -> ${odp['liczba-wynikow']}) — sprobuje nastepnym razem`);
      }
      log(`   strona ${strona}: ${odp['liczba-wynikow']} wynikow, a strona 1 miala ${liczba} — strony z roznych chwil, starsze pobieram ponownie`);
      swiezeOd = odp.pobrano ?? new Date().toISOString();
      wyniki = [];
      pobrano = null;
      liczba = null;
      strona = 1;
      continue;
    }
    // Dzien jest tak swiezy jak jego NAJSTARSZA strona.
    if (odp.pobrano && (!pobrano || odp.pobrano < pobrano)) pobrano = odp.pobrano;
    wyniki.push(...(odp.wyniki ?? []));
    log(`   strona ${strona}: ${odp.wyniki?.length ?? 0} z ${odp['liczba-wynikow']}`);
    if (wyniki.length >= odp['liczba-wynikow'] || (odp.wyniki?.length ?? 0) < NA_STRONE) break;
    strona++;
  }
  return { wyniki, zapytan, sekund: Math.round((Date.now() - start) / 1000), pobrano };
}

/**
 * Strony zapisanego zakresu pakujemy: historia calego kraju to ok. 28 GB
 * zwyklego JSON-u (1,4 KB na przypadek), spakowana — kilka razy mniej.
 * Odczyt i wznowienie rozumieja oba formaty.
 */
function spakujStrony(od: string, doDnia: string): void {
  const wzor = new RegExp(`^przyrost-${od}-${doDnia}-s\\d+\\.json$`);
  for (const nazwa of readdirSync(KATALOG).filter((n) => wzor.test(n))) {
    const plik = join(KATALOG, nazwa);
    writeFileSync(`${plik}.gz`, gzipSync(readFileSync(plik), { level: 9 }));
    rmSync(plik);
  }
}

async function przyrost(db: DatabaseSync, zakres: string, znane: ReadonlySet<string>, odswiez: boolean, budzet: Budzet | null = null): Promise<void> {
  const [od, doDnia] = zakres.split('..');
  if (!od || !doDnia) throw new Error('Zakres podaj jako --przyrost=2026-09-15..2026-09-17');
  const { wyniki, zapytan, sekund, pobrano } = await pobierzPrzyrost(od, doDnia, odswiez, budzet);
  const { zapisanych, obce, nasze } = zapiszPrzyrost(db, od, doDnia, wyniki, znane, pobrano);
  spakujStrony(od, doDnia);
  log(`   zapisano ${zapisanych} przypadkow z ${new Set(nasze.map((w) => terytGminyZKodu(w['gmina-siedziby-kod']))).size} gmin (${zapytan} zapytan, ${sekund} s)`);
  if (obce) log(`   pominieto ${obce} przypadkow z jednostek spoza listy gmin PKW`);
  odnotujImport(db, 'sudop-przyrost', zapisanych, `dni ${od}..${doDnia}, zapytan ${zapytan}`);
}

/**
 * Zadanie dzienne serwera: wczoraj (swiezy, niepelny — do "co nowego")
 * i dzien sprzed 14 dni (juz ustalony — ten wchodzi do sum). Drugiego nie
 * pobieramy, jesli w bazie jest juz jego ustalona wersja.
 */
async function dzienne(db: DatabaseSync, znane: ReadonlySet<string>): Promise<void> {
  const dzis = dzienWarszawa(new Date());
  const swiezy = dodajDni(dzis, -1);
  const doUstalenia = dodajDni(dzis, -DNI_DO_USTALENIA);
  // Zwykly dzien to 1–2 strony; wiecej niz 8 znaczy, ze dzieje sie cos dziwnego.
  const budzet: Budzet = { maks: 8, uzyte: 0, okno: null };
  await przyrost(db, `${swiezy}..${swiezy}`, znane, false, budzet);
  const w = db.prepare('select coalesce(pobrano_dzien, substr(pobrano, 1, 10)) as pobrano from pomoc_publiczna_dni where dzien = ?')
    .get(doUstalenia) as { pobrano: string } | undefined;
  switch (stanDnia(doUstalenia, w?.pobrano)) {
    case 'ustalony':
      log(`-> ${doUstalenia}: juz ustalony (pobrany ${w!.pobrano}) — nie pytam ponownie`);
      break;
    case 'brak':
      log(`-> ${doUstalenia}: tego dnia w ogole nie mamy — to dziura, wezmie ja noc razem z sasiadami (jawne plan)`);
      break;
    default:
      await przyrost(db, `${doUstalenia}..${doUstalenia}`, znane, true, budzet);
  }
  log(`Zapytan do urzedu: ${budzet.uzyte}`);
}

/**
 * Zadanie nocne serwera: kolejne zakresy z planHistorii, az do limitu
 * zapytan albo konca okna godzin. Plan liczony od nowa po kazdym zakresie.
 * Nowego zapytania nie zaczyna poza oknem — "tylko noca" pilnuje kod,
 * nie tylko harmonogram systemd.
 */
async function nocne(db: DatabaseSync, znane: ReadonlySet<string>, o: { maks: number; okno: string; tylkoPlan: boolean }): Promise<void> {
  const dzis = dzienWarszawa(new Date());
  const plan = () => planHistorii({
    // pobrano_dzien to polska data; substr(pobrano) tylko dla wierszy sprzed migracji.
    dni: db.prepare('select dzien, coalesce(pobrano_dzien, substr(pobrano, 1, 10)) as pobrano from pomoc_publiczna_dni').all() as unknown as DzienPobrany[],
    zakresyPlikow: zakresyZPlikow(readdirSync(KATALOG)),
    dzis,
    poczatekOkna: poczatekOknaDanych(new Date()),
  });
  if (o.tylkoPlan) {
    const p = plan();
    log(p.length ? 'Kolejnosc (po kazdym zakresie plan liczy sie od nowa):' : 'Nic do pobrania.');
    for (const z of p.slice(0, 10)) log(`   ${z.powod.padEnd(12)} ${z.od}..${z.do}${z.odswiez ? '  (odswiezenie)' : ''}`);
    return;
  }
  if (!wOknie(new Date(), o.okno)) {
    log(`Poza oknem ${o.okno} (czas polski) — nie pytam urzedu.`);
    return;
  }
  const budzet: Budzet = { maks: o.maks, uzyte: 0, okno: o.okno, horyzontPierwszejMs: 20 * 60_000 };
  // Zakres, ktory po pobraniu nadal jest w planie, odkladamy do konca nocy
  // i idziemy dalej. ZMIERZONE 22.09.2026: pierwsza taka sytuacja (blad
  // ze strefa czasu) zatrzymala cala noc po trzech zapytaniach z pieciudziesieciu.
  const odlozone = new Set<string>();
  // Zakres, ktory skonczyl sie bledem, tez odkladamy. ZMIERZONE w nocy
  // 22/23.09.2026: pierwszy zakres nocy padl po godzinie, wyjatek wyszedl
  // z petli i cala noc skonczyla sie na nim — ze 150 zapytan nie zostalo
  // wykorzystane nic. Blad jednego zakresu to za malo, zeby stracic noc
  // (wzorzec 2 w CLAUDE.md), ale trzy pod rzad znacza awarie po tamtej
  // stronie albo u nas i wtedy konczymy.
  const zBledem = new Map<string, string>();
  const MAKS_BLEDOW_POD_RZAD = 4;
  let bledowPodRzad = 0;
  let poprzedni = '';
  try {
    for (;;) {
      const pominiete = (k: string) => odlozone.has(k) || zBledem.has(k);
      const z = plan().find((x) => !pominiete(`${x.od}..${x.do}`));
      if (!z) {
        log(odlozone.size || zBledem.size
          ? 'Nic wiecej do pobrania poza zakresami odlozonymi i tymi z bledem.'
          : 'Nic wiecej do pobrania — historia kompletna.');
        break;
      }
      const zakres = `${z.od}..${z.do}`;
      if (zakres === poprzedni) {
        log(`   UWAGA: ${zakres} po pobraniu wciaz jest w planie — odkladam go i biore nastepny`);
        odlozone.add(zakres);
        poprzedni = '';
        continue;
      }
      poprzedni = zakres;
      log(`== ${z.powod}: ${zakres}`);
      try {
        await przyrost(db, zakres, znane, z.odswiez, budzet);
        bledowPodRzad = 0;
      } catch (e) {
        if (e instanceof KoniecPrzydzialu) throw e;
        const tresc = e instanceof Error ? e.message : String(e);
        log(`   BLAD na ${zakres}: ${tresc}`);
        log('   Pobrane strony tego zakresu zostaja na dysku — nastepna noc je wznowi. Biore nastepny zakres.');
        zBledem.set(zakres, tresc);
        bledowPodRzad++;
        poprzedni = '';
        if (bledowPodRzad >= MAKS_BLEDOW_POD_RZAD) {
          log(`   ${bledowPodRzad} zakresy pod rzad skonczyly sie bledem — koncze noc, zeby nie dobijac urzedu.`);
          break;
        }
        // Kolejka, ktora nie odpowiedziala, za chwile tez nie odpowie.
        // Kwadrans przerwy jest tanszy niz kolejne zapytanie w prozne.
        log('   czekam kwadrans, zanim sprobuje nastepnego zakresu');
        await spij(15 * 60_000);
      }
    }
  } catch (e) {
    if (!(e instanceof KoniecPrzydzialu)) throw e;
    log(`Koniec na te noc: ${e.message}. Pobrane strony zostaja na dysku — nastepna noc je wznowi.`);
  }
  log(`Zapytan do urzedu tej nocy: ${budzet.uzyte} z ${budzet.maks}`);
  if (odlozone.size) {
    log(`ODLOZONE zakresy (po pobraniu wciaz w planie): ${[...odlozone].join(', ')}`);
    log('To znaczy, ze pobranie nie zmienilo stanu bazy — do sprawdzenia w kodzie, nie w urzedzie.');
    process.exitCode = 1;
  }
  if (zBledem.size) {
    log(`ZAKRESY Z BLEDEM (${zBledem.size}):`);
    for (const [zakres, tresc] of zBledem) log(`   ${zakres}: ${tresc}`);
    process.exitCode = 1;
  }
}

/**
 * Blokada "jedno pobieranie naraz" — w kodzie, nie w dyscyplinie.
 *
 * ZMIERZONE 19.09.2026: zadanie z poprzedniej sesji przezylo jej zamkniecie
 * i czekalo w kolejce urzedu, kiedy uruchomilismy drugie. Dwa zapytania
 * naraz to dokladnie to, czego obiecalismy UOKiK nie robic. Plik blokady
 * trzyma PID; drugi proces sprawdza, czy ten PID zyje, i odmawia startu.
 */
function zalozBlokade(): void {
  const plik = join(KATALOG, '.blokada');
  if (existsSync(plik)) {
    try {
      const b = JSON.parse(readFileSync(plik, 'utf8')) as { pid: number; start: string; argv: string };
      process.kill(b.pid, 0); // rzuca ESRCH, jesli proces nie zyje
      log(`Juz trwa inne pobieranie z SUDOP (PID ${b.pid}, od ${b.start}): ${b.argv}`);
      log('Poczekaj, az skonczy, albo zatrzymaj je. Jedno zapytanie do urzedu naraz.');
      process.exit(3);
    } catch (e) {
      // EPERM = proces zyje, ale nie nasz: tez nie startujemy.
      if (e instanceof Error && 'code' in e && e.code === 'EPERM') process.exit(3);
      // ESRCH albo zepsuty plik: blokada po martwym procesie — przejmujemy.
    }
  }
  writeFileSync(plik, JSON.stringify({ pid: process.pid, start: new Date().toISOString(), argv: process.argv.slice(2).join(' ') }));
  const zdejmij = () => {
    try {
      const b = JSON.parse(readFileSync(plik, 'utf8')) as { pid: number };
      if (b.pid === process.pid) rmSync(plik);
    } catch { /* juz nie ma */ }
  };
  process.on('exit', zdejmij);
  for (const sygnal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sygnal, () => {
      zdejmij();
      process.exit(130);
    });
  }
}

async function main(): Promise<void> {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const gminy = (arg('gminy') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const zakres = arg('przyrost');
  const zPlikow = process.argv.includes('--z-plikow');
  const dzienny = process.argv.includes('--dzienny');
  const historia = process.argv.includes('--historia');
  const tylkoPlan = process.argv.includes('--plan');
  if (!gminy.length && !zakres && !dzienny && !historia) {
    log('Podaj gminy: --gminy=100101,100102   (TERYT, 6 cyfr)');
    log('albo zakres dni dla calego kraju: --przyrost=2026-09-15..2026-09-17');
    log('Dodaj --z-plikow, zeby zapisac do bazy wczesniej pobrane odpowiedzi bez pytania urzedu.');
    log('Dodaj --tylko-pobierz, zeby pobrac bez zapisu do bazy (GitHub Actions).');
    log('Dodaj --odswiez, zeby pobrac ponownie dni, ktore juz mamy (dzien ustala sie po 14 dniach).');
    log('Serwer: --dzienny (wczoraj i dzien sprzed 14 dni) albo --historia [--maks-zapytan=150] [--okno=22:00-07:00]');
    log('        --historia --plan pokazuje, co pobralaby noc — bez pytania urzedu.');
    process.exit(2);
  }
  // Tempo wobec UOKiK: decyzja Pawla z 22.09.2026 — 150 zapytan na noc
  // w oknie 22:00-07:00 (wczesniej 50 w oknie 01:00-06:00). Godziny pracy
  // urzedu zostaja wolne: zmierzone czekanie w kolejce to 1-3 min w nocy
  // i 54 min w dzien. Limit siedzi w kodzie, zeby nie dalo sie go
  // "podkrecic" samym parametrem w harmonogramie ani przez autopilota;
  // podniesienie wymaga zmiany tutaj, wpisu w docs/plan.md i poprawienia
  // akapitu o tempie w docs/uokik-sprostowanie.md.
  const maks = Number(arg('maks-zapytan') ?? 150);
  if (historia && !(Number.isInteger(maks) && maks >= 1 && maks <= 150)) {
    throw new Error(`--maks-zapytan musi byc liczba 1–150 (jest: ${arg('maks-zapytan')})`);
  }
  const okno = arg('okno') ?? '22:00-07:00';
  wOknie(new Date(), okno); // sprawdza zapis okna, zanim cokolwiek sie zacznie
  mkdirSync(KATALOG, { recursive: true });
  // Z plikow i sam plan nie pytaja urzedu — blokada potrzebna tylko, gdy moze pojsc zapytanie.
  if (!zPlikow && !tylkoPlan) zalozBlokade();

  // Tryb dla GitHub Actions: pobierz i zapisz surowe odpowiedzi, nie dotykaj
  // bazy (w CI jej nie ma). Import robi sie potem na komputerze z plikow.
  if (zakres && process.argv.includes('--tylko-pobierz')) {
    const [od, doDnia] = zakres.split('..');
    if (!od || !doDnia) throw new Error('Zakres podaj jako --przyrost=2026-09-15..2026-09-17');
    const { wyniki, zapytan, sekund } = await pobierzPrzyrost(od, doDnia, process.argv.includes('--odswiez'));
    log(`   pobrano ${wyniki.length} przypadkow w ${zapytan} zapytaniach (${sekund} s); pliki w ${KATALOG}`);
    return;
  }

  const db = otworz(true);
  for (const zmiana of zalozSchemat(db)) log(`Migracja: ${zmiana}`);
  // Warszawa jest w PKW 18 dzielnicami, a w SUDOP jednym miastem — jej pomoc
  // trzymamy pod 146501, tak samo jak fundusze UE i budzet.
  const znane = new Set((db.prepare('select teryt from gminy').all() as unknown as { teryt: string }[]).map((r) => r.teryt));
  znane.add(TERYT_WARSZAWY);
  // Bez listy gmin kazdy przypadek z przyrostu bylby "spoza listy", a dzien
  // zapisalby sie jako pobrany i pusty — zero tam, gdzie powinno byc "nie wiemy".
  if ((zakres || dzienny || historia) && znane.size < 2000) {
    db.close();
    throw new Error(`W bazie jest ${znane.size} gmin zamiast ok. 2 500. Najpierw: npm run import okregi`);
  }
  if (dzienny || historia) {
    try {
      if (dzienny) await dzienne(db, znane);
      else await nocne(db, znane, { maks, okno, tylkoPlan });
    } finally {
      db.close();
    }
    return;
  }
  if (zakres) {
    try {
      await przyrost(db, zakres, znane, process.argv.includes('--odswiez'));
    } finally {
      db.close();
    }
    return;
  }
  const kody = await slownik('gmina-siedziby');
  const od = poczatekOknaDanych(new Date());
  let porazekZRzedu = 0;

  try {
    for (const teryt of gminy) {
      if (!znane.has(teryt)) {
        log(`-> ${teryt}: nie ma takiej gminy w danych PKW — pomijam`);
        continue;
      }
      const kodyGminy = kodySudopGminy(teryt, kody);
      if (!kodyGminy.length) {
        log(`-> ${teryt}: brak kodu w slowniku SUDOP — pomijam`);
        continue;
      }
      log(`-> gmina ${teryt} (kody SUDOP: ${kodyGminy.join(', ')}), pomoc od ${od}`);
      const start = Date.now();
      try {
        const wyniki: OdpowiedzSudop['wyniki'] = [];
        let strona = 1;
        let zapytan = 0;
        for (;;) {
          const plik = join(KATALOG, `${teryt}-od-${od}-s${strona}.json`);
          let odp: OdpowiedzSudop;
          const zapisana = zapisanaOdpowiedz(plik);
          if (zPlikow || zapisana) {
            if (!zapisana) throw new Error(`brak pliku ${plik}`);
            odp = zapisana;
            log(`   strona ${strona}: z pliku`);
          } else {
            odp = await wyszukaj(adresWyszukania(kodyGminy, od, strona), `strona ${strona}`);
            zapytan++;
            writeFileSync(plik, JSON.stringify(odp), 'utf8');
          }
          wyniki.push(...(odp.wyniki ?? []));
          log(`   strona ${strona}: ${odp.wyniki?.length ?? 0} z ${odp['liczba-wynikow']}`);
          if (wyniki.length >= odp['liczba-wynikow'] || (odp.wyniki?.length ?? 0) < NA_STRONE) break;
          strona++;
        }
        const sekund = Math.round((Date.now() - start) / 1000);
        zapisz(db, teryt, od, wyniki, zapytan, sekund);
        log(`   zapisano ${wyniki.length} przypadkow (${zapytan} zapytan, ${sekund} s)`);
        porazekZRzedu = 0;
      } catch (e) {
        porazekZRzedu++;
        log(`   BLAD: ${e instanceof Error ? e.message : e}`);
        if (porazekZRzedu >= 3) {
          log('Trzy gminy z rzedu bez wyniku — przerywam, zeby nie obciazac kolejki urzedu.');
          break;
        }
      }
    }
    const lacznie = (db.prepare('select count(*) as c from pomoc_publiczna').get() as { c: number }).c;
    odnotujImport(db, 'sudop', lacznie, `gmin: ${(db.prepare('select count(*) as c from pomoc_publiczna_pobrania').get() as { c: number }).c}`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  log(`BLAD: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
