/**
 * Import kadencji z API Sejmu do lokalnego SQLite.
 *
 * Etapy sa osobne i wznawialne, bo API Sejmu bywa niedostepne godzinami
 * (przy budowie tego importu oddawalo kolejno: timeout, 503, 200 i 404).
 * Kazdy etap zapisuje sie w tabeli `import`, wiec wiadomo, co jest swieze.
 *
 *   npx tsx ingest/jobs/import.ts kluby poslowie glosowania glosy
 *   npx tsx ingest/jobs/import.ts wszystko
 */
import { otworz, zalozSchemat, odnotujImport, SCHEMAT_FE } from '../lib/baza.js';
import { slugPosla } from '../lib/slug.js';
import { GLOSY_ZNANE } from '../../src/lib/glosy.js';
import { dlaKazdego, pobierzBajty, pobierzJson, przerwaBdlMs, kluczBdl, kluczSmup } from '../lib/http.js';
import * as api from '../lib/sejm.js';
import { czytajGminyPkw, sprawdzGminyPkw } from '../lib/pkw.js';
import { uprosc } from '../../src/lib/tekst.js';
import { opisGlosowania } from '../../src/lib/opis-glosowania.js';
import { bezNazwiskOsobPrywatnych } from '../../src/lib/prywatnosc.js';
import { porownajZKlubem, type GlosZKlubem } from '../../src/lib/niezaleznosc.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import {
  czytajLokalizacje, dopasujGmine, dopasujPowiat, indeksGmin, indeksPowiatow, sprawdzNaglowek, UKLAD, wierszNaProjekt,
  type GminaDoDopasowania, type Okres,
} from '../lib/fe.js';
import { join } from 'node:path';
import {
  adresDanych, adresLat, adresSlownikaTeryt, adresWskaznikow, FLAGI_ZNANE, MIARY,
  sprawdzPorcjeSmup, terytGminy, wartoscDoZapisu, type JednostkaSmup, type WierszSmup,
} from '../lib/smup.js';
import type { DatabaseSync } from 'node:sqlite';

const log = (s: string) => process.stdout.write(`${s}\n`);

async function importKlubow(db: DatabaseSync): Promise<void> {
  log('-> kluby');
  const kluby = await api.kluby();
  const wstaw = db.prepare(
    `insert into kluby(id, nazwa, mandaty, email, telefon, faks) values (?,?,?,?,?,?)
     on conflict(id) do update set nazwa=excluded.nazwa, mandaty=excluded.mandaty,
       email=excluded.email, telefon=excluded.telefon, faks=excluded.faks`,
  );
  db.exec('begin');
  for (const k of kluby) {
    // membersCount bywa nieobecne - kolo, ktorego rejestr juz nie liczy.
    // Zapisujemy null, bo zero znaczyloby "zmierzylismy zero czlonkow".
    wstaw.run(k.id, k.name ?? null, k.membersCount ?? null, k.email ?? null, k.phone ?? null, k.fax ?? null);
  }
  db.exec('commit');
  const bezLiczby = kluby.filter((k) => k.membersCount === undefined).map((k) => k.id);
  const suma = kluby.reduce((a, k) => a + (k.membersCount ?? 0), 0);
  log(`   ${kluby.length} klubow, suma mandatow: ${suma}`);
  if (bezLiczby.length) log(`   bez liczebnosci w rejestrze: ${bezLiczby.join(', ')}`);
  odnotujImport(db, 'kluby', kluby.length, bezLiczby.length ? `bez liczebnosci: ${bezLiczby.join(',')}` : '');
}

async function importPoslow(db: DatabaseSync): Promise<void> {
  log('-> poslowie');
  const lista = await api.poslowie();

  // KONTROLA DZIEDZINY PRZED ZAPISEM: kazdy klub posla musi istniec w tabeli
  // klubow, inaczej klucz obcy wywali sie w polowie zapisu.
  //
  // I to nie jest teoria. ZMIERZONE: /clubs oddaje 12 klubow (suma dokladnie
  // 460 mandatow), ale czesc poslow ma w polu `club` wartosc "Polska2050-TD",
  // ktorej w tej liscie NIE MA. Rejestr jest wewnetrznie niespojny.
  //
  // Nie wyrzucamy takiego posla i nie zgadujemy, do czego nalezy. Zakladamy
  // klub z samym identyfikatorem: nazwa null (rejestr jej nie podaje)
  // i mandaty null (co znaczy "rejestr nie liczy", a nie "zero"). Poseł
  // zostaje widoczny, a brak danych jest brakiem, nie cisza.
  const znaneKluby = new Set(
    db.prepare('select id from kluby').all().map((r) => String((r as { id: string }).id)),
  );
  const obce = [...new Set(lista.map((p) => p.club).filter((c): c is string => Boolean(c) && !znaneKluby.has(c)))];
  if (obce.length) {
    const wstawKlub = db.prepare('insert into kluby(id, nazwa, mandaty) values (?, null, null) on conflict(id) do nothing');
    db.exec('begin');
    for (const id of obce) wstawKlub.run(id);
    db.exec('commit');
    for (const id of obce) {
      const ilu = lista.filter((p) => p.club === id).length;
      log(`   UWAGA - klub "${id}" wystepuje u ${ilu} poslow, ale nie ma go w /clubs`);
    }
    odnotujImport(db, 'kluby-spoza-listy', obce.length, obce.join(', '));
  }

  // Slug raz nadany nie jest zmieniany - opublikowany link ma dzialac zawsze,
  // takze po zmianie nazwiska w rejestrze.
  const istniejace = new Map<number, string>(
    db.prepare('select id, slug from poslowie').all()
      .map((r) => [Number((r as { id: number }).id), String((r as { slug: string }).slug)] as [number, string]),
  );
  const zajete = new Set(istniejace.values());

  const wstaw = db.prepare(
    `insert into poslowie(id, slug, imie, drugie_imie, nazwisko, imie_nazwisko, klub_id,
       okreg_nr, okreg_nazwa, wojewodztwo, zawod, wyksztalcenie, data_urodzenia,
       miejsce_urodzenia, glosow_w_wyborach, email, aktywny, przyczyna_wygasniecia,
       data_wygasniecia, ma_zdjecie)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     on conflict(id) do update set
       imie=excluded.imie, drugie_imie=excluded.drugie_imie, nazwisko=excluded.nazwisko,
       imie_nazwisko=excluded.imie_nazwisko, klub_id=excluded.klub_id,
       okreg_nr=excluded.okreg_nr, okreg_nazwa=excluded.okreg_nazwa,
       wojewodztwo=excluded.wojewodztwo, zawod=excluded.zawod,
       wyksztalcenie=excluded.wyksztalcenie, data_urodzenia=excluded.data_urodzenia,
       miejsce_urodzenia=excluded.miejsce_urodzenia,
       glosow_w_wyborach=excluded.glosow_w_wyborach, email=excluded.email,
       aktywny=excluded.aktywny, przyczyna_wygasniecia=excluded.przyczyna_wygasniecia,
       data_wygasniecia=excluded.data_wygasniecia,
       ma_zdjecie=coalesce(excluded.ma_zdjecie, poslowie.ma_zdjecie)`,
  );

  db.exec('begin');
  for (const p of lista) {
    const slug = istniejace.get(p.id) ?? slugPosla(p.firstLastName, zajete, p.id);
    zajete.add(slug);
    wstaw.run(
      p.id, slug, p.firstName, p.secondName ?? null, p.lastName, p.firstLastName,
      p.club || null, p.districtNum ?? null, p.districtName ?? null, p.voivodeship ?? null,
      p.profession ?? null, p.educationLevel ?? null, p.birthDate ?? null,
      p.birthLocation ?? null, p.numberOfVotes ?? null, p.email ?? null,
      p.active ? 1 : 0, p.inactiveCause ?? null, p.mandateExpiryDate ?? null,
      null,  // ma_zdjecie ustawia etap "zdjecia" — on jedyny wie to na pewno
    );
  }
  db.exec('commit');
  const nieaktywni = lista.filter((p) => !p.active).length;
  log(`   ${lista.length} poslow (nieaktywnych: ${nieaktywni})`);
  odnotujImport(db, 'poslowie', lista.length, `nieaktywnych: ${nieaktywni}`);
}

async function importGlosowan(db: DatabaseSync): Promise<void> {
  log('-> glosowania (naglowki)');
  const lista = await api.posiedzenia();
  const wstawP = db.prepare(
    'insert into posiedzenia(numer, tytul, daty) values (?,?,?) on conflict(numer) do update set tytul=excluded.tytul, daty=excluded.daty',
  );
  db.exec('begin');
  for (const p of lista) wstawP.run(p.number, p.title ?? null, JSON.stringify(p.dates ?? []));
  db.exec('commit');
  log(`   ${lista.length} posiedzen`);

  const partie = await dlaKazdego(lista, async (p) => {
    try {
      return await api.glosowaniaPosiedzenia(p.number);
    } catch (e) {
      // Posiedzenie bez glosowan oddaje 404 - to odpowiedz, nie awaria.
      if (e instanceof Error && e.message.includes('HTTP 404')) return [];
      throw e;
    }
  }, { opis: 'posiedzenia', co: 10 });

  const wszystkie = partie.flat();
  const wstaw = db.prepare(
    `insert into glosowania(posiedzenie, numer, dzien, data, tytul, temat, opis, rodzaj,
       typ_wiekszosci, za, przeciw, wstrzymalo, nieobecnych, glosowalo, pdf)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     on conflict(posiedzenie, numer) do update set
       data=excluded.data, tytul=excluded.tytul, temat=excluded.temat, opis=excluded.opis,
       rodzaj=excluded.rodzaj, typ_wiekszosci=excluded.typ_wiekszosci, za=excluded.za,
       przeciw=excluded.przeciw, wstrzymalo=excluded.wstrzymalo,
       nieobecnych=excluded.nieobecnych, glosowalo=excluded.glosowalo, pdf=excluded.pdf`,
  );
  db.exec('begin');
  for (const g of wszystkie) {
    wstaw.run(
      g.sitting, g.votingNumber, g.sittingDay ?? null, g.date, g.title,
      g.topic ?? null, g.description ?? null, g.kind ?? null, g.majorityType ?? null,
      g.yes, g.no, g.abstain, g.notParticipating, g.totalVoted, api.adresPdf(g),
    );
  }
  db.exec('commit');
  log(`   ${wszystkie.length} glosowan`);
  odnotujImport(db, 'glosowania', wszystkie.length);
}

async function importGlosow(db: DatabaseSync): Promise<void> {
  log('-> glosy imienne (najdluzszy etap)');

  // `--od-nowa` sluzy do powtorzenia etapu po zmianie SPOSOBU zapisu (a nie
  // danych zrodlowych) — tak jak przy naprawie klubow historycznych. Bez tego
  // etap pomija glosowania, ktore juz maja wiersze, i poprawka by ich nie objela.
  if (process.argv.includes('--od-nowa')) {
    db.exec('delete from glosy');
    log('   wyczyszczono tabele glosow (--od-nowa)');
  }

  const doPobrania = db.prepare(
    `select g.posiedzenie as posiedzenie, g.numer as numer from glosowania g
      where not exists (select 1 from glosy s
                         where s.posiedzenie = g.posiedzenie and s.numer = g.numer)
      order by g.posiedzenie, g.numer`,
  ).all() as unknown as { posiedzenie: number; numer: number }[];
  log(`   do pobrania: ${doPobrania.length}`);
  if (!doPobrania.length) return;

  const wstaw = db.prepare(
    'insert into glosy(posiedzenie, numer, posel_id, klub_id, glos) values (?,?,?,?,?) on conflict do nothing',
  );
  const znaneKluby = new Set(db.prepare('select id from kluby').all().map((r) => String((r as { id: string }).id)));
  const wstawKlub = db.prepare('insert into kluby(id, nazwa, mandaty) values (?, null, null) on conflict(id) do nothing');
  const nieznaneGlosy = new Map<string, number>();
  const klubyHistoryczne = new Map<string, number>();
  let zapisanych = 0;
  let zrobione = 0;

  // Zapis porcjami po 25 glosowaniach: jedna transakcja na ~11 500 wierszy.
  const PORCJA = 25;
  for (let i = 0; i < doPobrania.length; i += PORCJA) {
    const kawalek = doPobrania.slice(i, i + PORCJA);
    const pelne = await dlaKazdego(kawalek, (g) => api.glosowanie(g.posiedzenie, g.numer));
    db.exec('begin');
    for (const g of pelne) {
      for (const v of g.votes ?? []) {
        if (!GLOSY_ZNANE.has(v.vote)) nieznaneGlosy.set(v.vote, (nieznaneGlosy.get(v.vote) ?? 0) + 1);

        // KLUBY HISTORYCZNE. Glos niesie klub z DNIA GLOSOWANIA, a /clubs
        // podaje tylko stan biezacy. ZMIERZONE na pelnym imporcie: w glosach
        // wystepuja Kukiz15 (2993 glosy), Republikanie (9604), PSL (256)
        // i Nowa_Lewica (208) — kluby, ktorych dzis juz nie ma.
        //
        // Zapisanie przy nich null byloby cicha utrata informacji: glos oddany
        // przez czlonka Kukiz15 pokazywalby sie jako "bez klubu", czyli
        // nieprawde. Zakladamy wiec klub z samym identyfikatorem, tak samo jak
        // przy posle wskazujacym klub spoza listy.
        if (v.club && !znaneKluby.has(v.club)) {
          wstawKlub.run(v.club);
          znaneKluby.add(v.club);
          klubyHistoryczne.set(v.club, 0);
        }
        if (v.club && klubyHistoryczne.has(v.club)) {
          klubyHistoryczne.set(v.club, (klubyHistoryczne.get(v.club) ?? 0) + 1);
        }
        wstaw.run(g.sitting, g.votingNumber, v.MP, v.club || null, v.vote);
        zapisanych++;
      }
    }
    db.exec('commit');
    zrobione += kawalek.length;
    log(`   ${zrobione}/${doPobrania.length} glosowan, ${zapisanych} glosow`);
  }

  // Nieznane wartosci NIE przerywaja importu - sa raportem do decyzji czlowieka.
  const uwagi: string[] = [];
  if (nieznaneGlosy.size) {
    const opis = [...nieznaneGlosy].map(([k, n]) => `${k}x${n}`).join(', ');
    log(`   UWAGA - wartosci glosu spoza slownika: ${opis}`);
    log('          dopisz je do GLOSY_ZNANE i ETYKIETY w ingest/lib/glosy.ts');
    uwagi.push(`nieznane glosy: ${opis}`);
  }
  if (klubyHistoryczne.size) {
    const opis = [...klubyHistoryczne].map(([k, n]) => `${k}x${n}`).join(', ');
    log(`   kluby historyczne (sa w glosach, nie ma ich w /clubs): ${opis}`);
    uwagi.push(`kluby historyczne: ${opis}`);
  }
  log(`   razem ${zapisanych} glosow`);
  odnotujImport(db, 'glosy', zapisanych, uwagi.join(' | '));
}

/**
 * Zdjecia posiadanie u siebie zamiast linkowania — patrz komentarz przy tabeli
 * `zdjecia`. Przy okazji ustawiamy `ma_zdjecie`, bo to jest jedyny moment,
 * w ktorym naprawde wiemy, czy rejestr zdjecie ma.
 */
async function importZdjec(db: DatabaseSync): Promise<void> {
  log('-> zdjecia poslow');
  const poslowie = db.prepare('select id from poslowie order by id').all() as unknown as { id: number }[];

  const wstaw = db.prepare(
    'insert into zdjecia(posel_id, typ, bajty) values (?,?,?) on conflict(posel_id) do update set typ=excluded.typ, bajty=excluded.bajty',
  );
  const oznacz = db.prepare('update poslowie set ma_zdjecie = ? where id = ?');

  const wyniki = await dlaKazdego(poslowie, async (p) => {
    try {
      const bajty = await pobierzBajty(api.adresZdjecia(p.id));
      // Typ z SYGNATURY, nie z naglowka: przy zasobach graficznych rejestru
      // `content-type` potrafi podawac co innego niz zawartosc.
      const jpeg = bajty[0] === 0xff && bajty[1] === 0xd8;
      const png = bajty.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
      if (!jpeg && !png) return { id: p.id, bajty: null, typ: null, powod: 'nierozpoznany format' };
      return { id: p.id, bajty, typ: jpeg ? 'image/jpeg' : 'image/png', powod: null };
    } catch {
      return { id: p.id, bajty: null, typ: null, powod: 'rejestr nie oddal zdjecia' };
    }
  }, { opis: 'zdjecia', co: 100 });

  db.exec('begin');
  for (const w of wyniki) {
    if (w.bajty && w.typ) wstaw.run(w.id, w.typ, w.bajty);
    oznacz.run(w.bajty ? 1 : 0, w.id);
  }
  db.exec('commit');

  const maja = wyniki.filter((w) => w.bajty).length;
  const bajtow = wyniki.reduce((a, w) => a + (w.bajty?.length ?? 0), 0);
  log(`   ${maja} z ${poslowie.length} poslow ma zdjecie (${(bajtow / 1024 / 1024).toFixed(1)} MB)`);
  odnotujImport(db, 'zdjecia', maja, `bez zdjecia: ${poslowie.length - maja}`);
}

/**
 * Okregi i gminy z pliku PKW, ktory lezy w repozytorium — ten etap nie
 * dotyka sieci. Nazwe okregu (siedzibe) bierzemy z rejestru Sejmu, bo PKW
 * w tym pliku jej nie podaje; dlatego etap idzie PO etapie "poslowie".
 */
async function importOkregow(db: DatabaseSync): Promise<void> {
  log('-> okregi i gminy (PKW 2023, plik lokalny)');
  const sciezka = join(process.cwd(), 'ingest', 'zrodla', 'pkw-2023', 'wyniki_gl_na_listy_po_gminach_sejm_utf8.csv');
  const wynik = czytajGminyPkw(readFileSync(sciezka, 'utf8'));

  // Kontrola dziedziny PRZED zapisem — cala porcja albo nic.
  const problemy = sprawdzGminyPkw(wynik);
  if (problemy.length) throw new Error(`Plik PKW nie przeszedl kontroli:\n  ${problemy.join('\n  ')}`);
  if (wynik.nieznanePrefiksy.length) {
    log(`   UWAGA - nieznane prefiksy nazw gmin: ${wynik.nieznanePrefiksy.join(', ')}`);
  }

  // Zgodnosc z Sejmem: kazdy okreg posla musi istniec w PKW i odwrotnie.
  const nazwySejmu = new Map(
    (db.prepare('select distinct okreg_nr as nr, okreg_nazwa as nazwa from poslowie where okreg_nr is not null').all() as unknown as { nr: number; nazwa: string }[])
      .map((r) => [r.nr, r.nazwa]),
  );
  const okregiPkw = new Set(wynik.gminy.map((g) => g.okreg));
  const tylkoWSejmie = [...nazwySejmu.keys()].filter((n) => !okregiPkw.has(n));
  if (tylkoWSejmie.length) throw new Error(`Okregi poslow nieobecne w PKW: ${tylkoWSejmie.join(', ')}`);
  if (nazwySejmu.size === 0) log('   UWAGA - brak poslow w bazie; okregi zostana zapisane bez nazw');

  const okregi = [...okregiPkw].sort((a, b) => a - b).map((nr) => {
    const gminy = wynik.gminy.filter((g) => g.okreg === nr);
    const zagr = wynik.zagranica.filter((z) => z.okreg === nr);
    return {
      nr,
      nazwa: nazwySejmu.get(nr) ?? null,
      wojewodztwo: gminy[0]!.wojewodztwo,
      kraj: gminy.reduce((a, g) => a + (g.uprawnionych ?? 0), 0),
      zagr: zagr.length ? zagr.reduce((a, z) => a + (z.uprawnionych ?? 0), 0) : null,
    };
  });

  const wstawOkreg = db.prepare(
    `insert into okregi(nr, nazwa, wojewodztwo, uprawnionych_kraj, uprawnionych_zagr) values (?,?,?,?,?)
     on conflict(nr) do update set nazwa=excluded.nazwa, wojewodztwo=excluded.wojewodztwo,
       uprawnionych_kraj=excluded.uprawnionych_kraj, uprawnionych_zagr=excluded.uprawnionych_zagr`,
  );
  const wstawGmine = db.prepare(
    `insert into gminy(teryt, nazwa, rodzaj, powiat, wojewodztwo, okreg_nr, uprawnionych, szukaj)
     values (?,?,?,?,?,?,?,?)
     on conflict(teryt) do update set nazwa=excluded.nazwa, rodzaj=excluded.rodzaj,
       powiat=excluded.powiat, wojewodztwo=excluded.wojewodztwo, okreg_nr=excluded.okreg_nr,
       uprawnionych=excluded.uprawnionych, szukaj=excluded.szukaj`,
  );

  db.exec('begin');
  for (const o of okregi) wstawOkreg.run(o.nr, o.nazwa, o.wojewodztwo, o.kraj, o.zagr);
  for (const g of wynik.gminy) {
    wstawGmine.run(g.teryt, g.nazwa, g.rodzaj, g.powiat, g.wojewodztwo, g.okreg, g.uprawnionych, uprosc(g.nazwa));
  }
  db.exec('commit');

  log(`   ${okregi.length} okregow, ${wynik.gminy.length} gmin, ${wynik.zagranica.length} obwodow za granica`);
  odnotujImport(db, 'okregi', okregi.length, `gmin: ${wynik.gminy.length}; zrodlo: PKW, wybory do Sejmu 2023`);
}

/**
 * Wyliczenia na zaimportowanych danych: sumy glosow klubow i indeks
 * wyszukiwania. Zadnej sieci, wiec mozna je powtarzac dowolnie czesto.
 */
async function wyliczenia(db: DatabaseSync): Promise<void> {
  log('-> wyliczenia: sumy glosow klubow');
  const start = Date.now();
  db.exec('begin');
  db.exec('delete from glosy_klubow');
  db.exec(`
    insert into glosy_klubow(posiedzenie, numer, klub_id, za, przeciw, wstrzymalo, nieobecnych, innych)
    select posiedzenie, numer, klub_id,
           sum(glos = 'YES'), sum(glos = 'NO'), sum(glos = 'ABSTAIN'), sum(glos = 'ABSENT'),
           sum(glos not in ('YES', 'NO', 'ABSTAIN', 'ABSENT'))
      from glosy
     where klub_id is not null
     group by posiedzenie, numer, klub_id`);
  db.exec('commit');
  const wierszy = (db.prepare('select count(*) as c from glosy_klubow').get() as { c: number }).c;

  // Kontrola: sumy klubow musza dac sume glosow. Rozjazd znaczy, ze cos
  // zgubilismy po drodze — a to jest dokladnie ten blad, ktory nie krzyczy.
  const sumaKlubow = (db.prepare('select sum(za + przeciw + wstrzymalo + nieobecnych + innych) as s from glosy_klubow').get() as { s: number | null }).s ?? 0;
  const sumaGlosow = (db.prepare('select count(*) as c from glosy where klub_id is not null').get() as { c: number }).c;
  if (sumaKlubow !== sumaGlosow) {
    throw new Error(`Sumy klubow (${sumaKlubow}) nie zgadzaja sie z liczba glosow (${sumaGlosow})`);
  }
  log(`   ${wierszy} wierszy, ${sumaGlosow} glosow, ${((Date.now() - start) / 1000).toFixed(1)} s`);
  odnotujImport(db, 'glosy-klubow', wierszy);

  log('-> wyliczenia: porownanie poslow z klubem');
  const wierszePosla = db.prepare(
    `select s.posiedzenie as posiedzenie, s.numer as numer, g.data as data, g.tytul as tytul,
            g.temat as temat, s.klub_id as klub_id, s.glos as glos,
            k.za as za, k.przeciw as przeciw, k.wstrzymalo as wstrzymalo
       from glosy s
       join glosy_klubow k on k.posiedzenie = s.posiedzenie and k.numer = s.numer and k.klub_id = s.klub_id
       join glosowania g on g.posiedzenie = s.posiedzenie and g.numer = s.numer
      where s.posel_id = ?`,
  );
  const wstawPorownanie = db.prepare('insert into porownania_poslow(posel_id, porownywalnych, odmiennych) values (?,?,?)');
  const idPoslow = (db.prepare('select id from poslowie').all() as unknown as { id: number }[]).map((r) => r.id);
  db.exec('begin');
  db.exec('delete from porownania_poslow');
  for (const id of idPoslow) {
    const p = porownajZKlubem(wierszePosla.all(id) as unknown as GlosZKlubem[]);
    wstawPorownanie.run(id, p.porownywalnych, p.odmiennych);
  }
  db.exec('commit');
  log(`   ${idPoslow.length} poslow`);
  odnotujImport(db, 'porownania-poslow', idPoslow.length);

  log('-> wyliczenia: indeks wyszukiwania glosowan');
  const glosowania = db.prepare('select posiedzenie, numer, tytul, temat, opis from glosowania').all() as unknown as {
    posiedzenie: number; numer: number; tytul: string; temat: string | null; opis: string | null;
  }[];
  const wstaw = db.prepare('insert into glosowania_szukaj(tekst, posiedzenie, numer) values (?,?,?)');
  db.exec('begin');
  db.exec('delete from glosowania_szukaj');
  for (const g of glosowania) {
    // Do indeksu idzie tekst BEZ nazwisk osob prywatnych: nasze wyszukiwanie
    // nie moze znajdowac prywatnego oskarzyciela po nazwisku (prywatnosc.ts).
    const tekst = [g.temat, g.tytul, g.opis].filter(Boolean).map((t) => bezNazwiskOsobPrywatnych(t!)).join(' • ');
    wstaw.run(uprosc(tekst), g.posiedzenie, g.numer);
  }
  db.exec('commit');
  log(`   ${glosowania.length} glosowan w indeksie`);
  odnotujImport(db, 'szukaj-glosowania', glosowania.length);

  log('-> wyliczenia: indeks firm — beneficjentow pomocy publicznej');
  const maPomoc = db.prepare("select count(*) as c from sqlite_master where name = 'pomoc_publiczna'").get() as { c: number };
  if (maPomoc.c) {
    db.exec('begin');
    db.exec(`
      drop table if exists firmy_szukaj;
      create table firmy_szukaj (
        nip        text primary key,
        nazwa      text not null,       -- z NAJNOWSZEGO przypadku, jak na stronie firmy
        szukaj     text not null,       -- uprosc(nazwa); '' dopoki nie wypelnione
        przypadkow integer not null,
        brutto     real,
        max_eur    real,                -- najwieksza POJEDYNCZA pomoc: decyduje o progu jawnosci
        teryt      text
      ) without rowid;
      insert into firmy_szukaj(nip, nazwa, szukaj, przypadkow, brutto, max_eur, teryt)
      select s.nip, coalesce(n.nazwa, ''), '', s.przypadkow, s.brutto, s.max_eur, n.teryt
        from (select nip_beneficjenta as nip, count(*) as przypadkow,
                     sum(wartosc_brutto) as brutto, max(wartosc_brutto_eur) as max_eur
                from pomoc_publiczna where nip_beneficjenta is not null
               group by nip_beneficjenta) s
        join (select nip, nazwa, teryt from
                (select nip_beneficjenta as nip, nazwa_beneficjenta as nazwa, teryt,
                        row_number() over (partition by nip_beneficjenta
                                           order by (nazwa_beneficjenta is null), dzien desc, id desc) as rn
                   from pomoc_publiczna where nip_beneficjenta is not null)
               where rn = 1) n on n.nip = s.nip;
    `);
    db.exec('commit');
    // uprosc() to funkcja TS (SQL-owy lower() nie zdejmuje ogonkow), wiec klucz
    // wyszukiwania wypelniamy partiami — przy calej historii to miliony firm
    // i jeden select all() nie zmiescilby sie w pamieci.
    const doKlucza = db.prepare("select nip, nazwa from firmy_szukaj where szukaj = '' limit 50000");
    const ustawKlucz = db.prepare('update firmy_szukaj set szukaj = ? where nip = ?');
    let firm = 0;
    for (;;) {
      const partia = doKlucza.all() as unknown as { nip: string; nazwa: string }[];
      if (!partia.length) break;
      db.exec('begin');
      for (const f of partia) ustawKlucz.run(uprosc(f.nazwa) || ' ', f.nip);
      db.exec('commit');
      firm += partia.length;
    }
    log(`   ${firm} firm w indeksie`);
    odnotujImport(db, 'szukaj-firmy', firm);
  } else {
    log('   pomijam — nie ma jeszcze tabeli pomoc_publiczna');
  }

  log('-> wyliczenia: fundusze UE w gminach i powiatach');
  const maFundusze = db.prepare("select count(*) as c from sqlite_master where name = 'fe_miejsca'").get() as { c: number };
  if (maFundusze.c) {
    db.exec('begin');
    db.exec(`
      drop table if exists fe_gminy;
      create table fe_gminy (
        teryt            text not null,
        okres            text not null,
        tylko_tu         integer not null,   -- projekty realizowane WYLACZNIE w tej gminie
        tylko_tu_wartosc real,               -- ich wartosc (tylko PLN)
        tylko_tu_ue      real,               -- ich dofinansowanie z UE (tylko PLN)
        wspolnych        integer not null,   -- projekty tu I gdzie indziej — kwot nie dzielimy
        primary key (teryt, okres)
      ) without rowid;
      insert into fe_gminy
      select teryt, okres, sum(miejsc = 1),
             sum(case when miejsc = 1 and waluta = 'PLN' then wartosc end),
             sum(case when miejsc = 1 and waluta = 'PLN' then dofinansowanie_ue end),
             sum(miejsc > 1)
        from (select distinct m.teryt as teryt, p.id, p.okres as okres, p.miejsc as miejsc,
                     p.waluta as waluta, p.wartosc as wartosc, p.dofinansowanie_ue as dofinansowanie_ue
                from fe_miejsca m join fe_projekty p on p.id = m.projekt_id
               where m.teryt is not null)
       group by teryt, okres;

      drop table if exists fe_powiaty;
      create table fe_powiaty (
        teryt_powiatu text not null,
        okres         text not null,
        projektow     integer not null,      -- projekty wskazane tylko do poziomu powiatu
        primary key (teryt_powiatu, okres)
      ) without rowid;
      insert into fe_powiaty
      select m.teryt_powiatu, p.okres, count(distinct p.id)
        from fe_miejsca m join fe_projekty p on p.id = m.projekt_id
       where m.poziom = 'powiat' and m.teryt_powiatu is not null
       group by m.teryt_powiatu, p.okres;
    `);
    db.exec('commit');
    const g = db.prepare('select count(*) as c, sum(tylko_tu) as p from fe_gminy').get() as { c: number; p: number };
    log(`   ${g.c} wierszy gmina x okres, ${g.p} projektow przypisanych do jednej gminy`);
  } else {
    log('   brak tabel funduszy — uruchom etap "fundusze"');
  }

  log('-> wyliczenia: cechy glosowan');
  const wstawCechy = db.prepare(
    'insert into glosowania_cechy(posiedzenie, numer, nad_caloscia, porzadkowe) values (?,?,?,?)',
  );
  let nadCaloscia = 0;
  db.exec('begin');
  db.exec('delete from glosowania_cechy');
  for (const g of glosowania) {
    const o = opisGlosowania({ tytul: g.tytul, temat: g.temat });
    if (o.nadCaloscia) nadCaloscia++;
    wstawCechy.run(g.posiedzenie, g.numer, o.nadCaloscia ? 1 : 0, o.porzadkowe ? 1 : 0);
  }
  db.exec('commit');
  log(`   nad caloscia projektu: ${nadCaloscia} z ${glosowania.length}`);
  odnotujImport(db, 'cechy-glosowan', glosowania.length, `nad caloscia: ${nadCaloscia}`);
}

/**
 * Najnowszy plik XLSX zbioru z dane.gov.pl. Adres pliku zmienia sie co miesiac,
 * wiec pytamy katalog, zamiast wpisywac adres na sztywno.
 * Zmierzone: stronicowanie katalogu potrafi zwrocic ten sam zasob dwa razy.
 */
async function najnowszyXlsx(zbior: number): Promise<{ url: string; data: string }> {
  const zasoby: { data: string; url: string; format: string }[] = [];
  for (let strona = 1; strona <= 10; strona++) {
    const r = await fetch(`https://api.dane.gov.pl/1.4/datasets/${zbior}/resources?per_page=50&page=${strona}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json()) as { data?: { attributes: { data_date?: string; link?: string; format?: string } }[] };
    if (!j.data?.length) break;
    for (const d of j.data) {
      zasoby.push({ data: d.attributes.data_date ?? '', url: d.attributes.link ?? '', format: d.attributes.format ?? '' });
    }
  }
  const xlsx = zasoby.filter((z) => z.format === 'xlsx' && z.url).sort((a, b) => b.data.localeCompare(a.data));
  if (!xlsx[0]) throw new Error(`Zbior ${zbior}: brak pliku XLSX w katalogu`);
  return xlsx[0];
}

const ZBIORY_FE: { okres: Okres; zbior: number }[] = [
  { okres: '2021-2027', zbior: 13939 },
  { okres: '2014-2020', zbior: 1176 },
];

async function importFunduszy(db: DatabaseSync): Promise<void> {
  log('-> fundusze europejskie (listy projektow MFiPR z dane.gov.pl)');
  const gminy = db.prepare('select teryt, nazwa, rodzaj, powiat, wojewodztwo from gminy').all() as unknown as GminaDoDopasowania[];
  if (!gminy.length) throw new Error('Brak gmin w bazie — uruchom najpierw etap "okregi".');
  const indeks = indeksGmin(gminy);
  const powiaty = indeksPowiatow(gminy);
  const katalog = join(process.cwd(), 'dane', 'zrodla');
  mkdirSync(katalog, { recursive: true });

  // Odbudowa w calosci: listy ministerstwa zmieniaja sie wstecz co miesiac.
  db.exec('drop table if exists fe_miejsca; drop table if exists fe_projekty;');
  db.exec(SCHEMAT_FE);
  const wstawP = db.prepare(
    `insert into fe_projekty(okres, numer_umowy, tytul, beneficjent, fundusz, program, wartosc,
       dofinansowanie_ue, waluta, poczatek, koniec, miejsc, lokalizacja) values (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const wstawM = db.prepare(
    'insert into fe_miejsca(projekt_id, poziom, teryt, teryt_powiatu, wojewodztwo, powiat, gmina) values (?,?,?,?,?,?,?)',
  );

  for (const { okres, zbior } of ZBIORY_FE) {
    const { url, data } = await najnowszyXlsx(zbior);
    const plik = join(katalog, `fe-${okres}-${data}.xlsx`);
    if (!existsSync(plik)) {
      log(`   pobieram ${url}`);
      writeFileSync(plik, await pobierzBajty(url));
    }
    const skrot = createHash('sha256').update(readFileSync(plik)).digest('hex');
    log(`   ${okres}: plik z ${data}, sha256 ${skrot.slice(0, 12)}…`);

    const st = { projektow: 0, segGminy: 0, dopasowanych: 0, niedopasowanych: 0, powiat: 0, powiatDopas: 0, powiatMiasto: 0, woj: 0, kraj: 0, eur: 0 };
    const niedopasowane = new Map<string, number>();
    const uklad = UKLAD[okres];
    const czytnik = new ExcelJS.stream.xlsx.WorkbookReader(plik, {
      sharedStrings: 'cache', worksheets: 'emit', hyperlinks: 'ignore', styles: 'ignore',
    });
    db.exec('begin');
    try {
      for await (const arkusz of czytnik) {
        for await (const wiersz of arkusz) {
          const v = wiersz.values as unknown[];
          if (wiersz.number === uklad.wierszNaglowka) {
            const bledy = sprawdzNaglowek(okres, v);
            if (bledy.length) throw new Error(`${okres}: zmienil sie uklad kolumn:\n  ${bledy.join('\n  ')}`);
            continue;
          }
          if (wiersz.number < uklad.pierwszyWiersz) continue;
          const p = wierszNaProjekt(okres, v);
          if (!p) continue;
          const segmenty = czytajLokalizacje(p.lokalizacja);
          const { lastInsertRowid } = wstawP.run(
            p.okres, p.numerUmowy, p.tytul, p.beneficjent, p.fundusz, p.program, p.wartosc,
            p.dofinansowanieUe, p.waluta, p.poczatek, p.koniec, segmenty.length, p.lokalizacja,
          );
          st.projektow++;
          if (p.waluta === 'EUR') st.eur++;
          for (const s of segmenty) {
            if (s.poziom === 'gmina') {
              st.segGminy++;
              const teryt = dopasujGmine(s, indeks);
              if (teryt) st.dopasowanych++;
              else {
                st.niedopasowanych++;
                const k = `${s.wojewodztwo} / ${s.powiat ?? '-'} / ${s.gmina}${s.wiejska ? ' (wiejska)' : ''}`;
                niedopasowane.set(k, (niedopasowane.get(k) ?? 0) + 1);
              }
              const powG = s.powiat ? dopasujPowiat(s.wojewodztwo, s.powiat, powiaty) : null;
              wstawM.run(lastInsertRowid, 'gmina', teryt, teryt ? teryt.slice(0, 4) : (powG?.kod ?? null), s.wojewodztwo, s.powiat, s.gmina);
            } else if (s.poziom === 'powiat') {
              st.powiat++;
              const pow = dopasujPowiat(s.wojewodztwo, s.powiat, powiaty);
              if (pow) st.powiatDopas++;
              if (pow?.gminaMiasto) st.powiatMiasto++;
              // Miasto na prawach powiatu JEST gmina — tylko wtedy wpisujemy TERYT gminy.
              wstawM.run(lastInsertRowid, pow?.gminaMiasto ? 'gmina' : 'powiat', pow?.gminaMiasto ?? null, pow?.kod ?? null, s.wojewodztwo, s.powiat, null);
            } else if (s.poziom === 'wojewodztwo') {
              st.woj++;
              wstawM.run(lastInsertRowid, 'wojewodztwo', null, null, s.wojewodztwo, null, null);
            } else {
              st.kraj++;
              wstawM.run(lastInsertRowid, 'kraj', null, null, null, null, null);
            }
          }
        }
        break; // lista ma jeden arkusz; kolejne (jesli sa) to objasnienia
      }
      db.exec('commit');
    } catch (e) {
      db.exec('rollback');
      throw e;
    }

    const proc = st.segGminy ? ((st.dopasowanych / st.segGminy) * 100).toFixed(1) : '0';
    log(`   ${okres}: ${st.projektow} projektow; gmin w lokalizacjach ${st.segGminy}, dopasowanych ${st.dopasowanych} (${proc}%)`);
    log(`   ${okres}: poziom powiatu ${st.powiat} (dopasowanych ${st.powiatDopas}, w tym miast na prawach powiatu ${st.powiatMiasto}); wojewodztwa ${st.woj}, kraju ${st.kraj}; w euro: ${st.eur}`);
    if (niedopasowane.size) {
      // Raport, nie blad: niedopasowana gmina zostaje w bazie z nazwa, bez TERYT.
      const top = [...niedopasowane].sort((a, b) => b[1] - a[1]).slice(0, 8);
      log(`   niedopasowane (${niedopasowane.size} nazw), najczestsze:`);
      for (const [k, n] of top) log(`     ${n} × ${k}`);
    }
    odnotujImport(db, `fundusze-${okres}`, st.projektow,
      `plik z ${data}; ${url}; sha256 ${skrot}; gminy dopasowane ${st.dopasowanych}/${st.segGminy}`);
  }
}

/**
 * Ludnosc gmin z GUS BDL — mianownik kwot "na mieszkanca".
 * Zmierzone: zmienna 72305 ("ogolem") ma poziom 6 (gminy), 3 918 jednostek
 * (gminy, ich czesci miejskie i wiejskie, dzielnice). Kod jednostki BDL ma
 * 12 znakow i zawiera TERYT: "011212001011" -> woj 12, pow 01, gm 01, rodzaj 1.
 * Limit anonimowy: 10 000 zapytan na 7 dni.
 */
async function importLudnosci(db: DatabaseSync): Promise<void> {
  log('-> ludnosc gmin (GUS BDL, zmienna 72305)');
  const zmienna = await pobierzJson<{ years: number[] }>('https://bdl.stat.gov.pl/api/v1/variables/72305?format=json');
  const lata = [...zmienna.years].sort((a, b) => b - a);
  const gminy = new Set((db.prepare('select teryt from gminy').all() as unknown as { teryt: string }[]).map((r) => r.teryt));

  for (const rok of lata.slice(0, 3)) {
    const wartosci = new Map<string, { rodzaj: string; osob: number }[]>();
    let adres: string | null = `https://bdl.stat.gov.pl/api/v1/data/by-variable/72305?unit-level=6&year=${rok}&page-size=100&format=json`;
    let stron = 0;
    while (adres) {
      const j: { results: { id: string; values: { year: string; val: number }[] }[]; links?: { next?: string } } = await pobierzJson(adres);
      stron++;
      for (const r of j.results) {
        const w = r.values.find((x) => x.year === String(rok));
        if (!w) continue;
        const teryt = `${r.id.slice(2, 4)}${r.id.slice(7, 11)}`;
        const lista = wartosci.get(teryt) ?? [];
        lista.push({ rodzaj: r.id.slice(11), osob: w.val });
        wartosci.set(teryt, lista);
      }
      adres = j.links?.next ?? null;
      if (adres) await new Promise((ok) => setTimeout(ok, przerwaBdlMs()));
    }
    // Gmina miejsko-wiejska ma trzy wpisy (3 cala gmina, 4 miasto, 5 wies) —
    // bierzemy CALA gmine. Dla pozostalych jest jeden wpis.
    const doZapisu: [string, number][] = [];
    for (const [teryt, lista] of wartosci) {
      if (!gminy.has(teryt)) continue;
      const cala = lista.find((x) => ['1', '2', '3', '8'].includes(x.rodzaj));
      if (cala) doZapisu.push([teryt, cala.osob]);
    }
    log(`   rok ${rok}: ${stron} stron, gmin z wartoscia ${doZapisu.length} z ${gminy.size}`);
    if (doZapisu.length < gminy.size * 0.95) {
      log(`   rok ${rok}: za malo gmin — GUS nie opublikowal jeszcze tego roku, biore starszy`);
      continue;
    }
    const wstaw = db.prepare('insert into ludnosc(teryt, rok, osob) values (?,?,?) on conflict(teryt) do update set rok=excluded.rok, osob=excluded.osob');
    db.exec('begin');
    db.exec('delete from ludnosc');
    for (const [teryt, osob] of doZapisu) wstaw.run(teryt, rok, osob);
    db.exec('commit');
    const suma = doZapisu.reduce((a, [, o]) => a + o, 0);
    log(`   zapisano ${doZapisu.length} gmin, lacznie ${suma} osob (rok ${rok})`);
    odnotujImport(db, 'ludnosc', doZapisu.length, `GUS BDL, zmienna 72305, rok ${rok}; suma ${suma}`);
    return;
  }
  throw new Error('GUS BDL: zaden z trzech ostatnich lat nie ma kompletu gmin');
}

/*
 * Budzety gmin — GUS BDL, poziom 6.
 *
 * Zmienne wybrane tak, zeby odpowiedziec na cztery pytania czytelnika:
 * ile gmina ma pieniedzy, ile z tego zarabia sama, ile wydaje i ile z tego
 * inwestuje. Wskaznikow "na mieszkanca" z BDL nie bierzemy — dzielimy sami,
 * zeby mianownik zgadzal sie z reszta serwisu.
 */
const ZMIENNE_BUDZETU: [kolumna: string, zmienna: number, opis: string][] = [
  ['dochody', 76037, 'dochody ogolem'],
  ['dochody_wlasne', 76070, 'dochody wlasne razem'],
  ['wydatki', 76477, 'wydatki ogolem'],
  // Majatkowe = inwestycje plus dotacje inwestycyjne (np. dla spolki miejskiej
  // budujacej metro). To ta liczba jest w Polsce nazywana "wydatkami na
  // inwestycje"; wezsza pozycja inwestycyjna zostaje jako uszczegolowienie.
  ['wydatki_majatkowe', 76453, 'wydatki majatkowe ogolem'],
  ['wydatki_inwestycyjne', 76450, 'wydatki majatkowe inwestycyjne'],
];

/** TERYT Warszawy: w BDL jest jedna jednostka, w naszej tabeli gmin — 18 dzielnic. */
const TERYT_WARSZAWY = '146501';

/**
 * Jedna zmienna BDL dla wszystkich gmin w danym roku.
 * Bierzemy rodzaje 1, 2, 3 (gmina miejska, wiejska, miejsko-wiejska).
 * Rodzaje 4 i 5 to miasto i obszar wiejski WEWNATRZ gminy miejsko-wiejskiej —
 * ich zsumowanie policzyloby te gmine drugi raz.
 */
async function bdlZmiennaGmin(zmienna: number, rok: number): Promise<Map<string, number>> {
  const wartosci = new Map<string, number>();
  let adres: string | null = `https://bdl.stat.gov.pl/api/v1/data/by-variable/${zmienna}?unit-level=6&year=${rok}&page-size=100&format=json`;
  while (adres) {
    const j: { results: { id: string; values: { year: string; val: number }[] }[]; links?: { next?: string } } = await pobierzJson(adres);
    for (const r of j.results) {
      if (!['1', '2', '3'].includes(r.id.slice(11))) continue;
      const w = r.values.find((x) => x.year === String(rok));
      if (!w || w.val === null) continue;
      wartosci.set(`${r.id.slice(2, 4)}${r.id.slice(7, 11)}`, w.val);
    }
    adres = j.links?.next ?? null;
    if (adres) await new Promise((ok) => setTimeout(ok, przerwaBdlMs()));
  }
  return wartosci;
}

/**
 * Budzety gmin za kilka ostatnich lat.
 *
 * Jeden rok to punkt, kilka lat to trend — a dopiero trend odpowiada na
 * pytanie "czy gmina ma coraz mniej pieniedzy". Liczbe lat ustawia
 * `--lata=N` (domyslnie 5). Rok bez kompletu gmin pomijamy: GUS publikuje
 * dane etapami i niepelny rok wygladalby jak zapasc dochodow.
 */
async function importBudzetow(db: DatabaseSync): Promise<void> {
  const ileLat = Number(process.argv.find((a) => a.startsWith('--lata='))?.split('=')[1] ?? 5);
  log(`-> budzety gmin (GUS BDL, ostatnie ${ileLat} lat z kompletem danych; ${kluczBdl() ? 'z kluczem' : 'bez klucza — wolno, 100 zapytan na 15 min'})`);
  const zmienna = await pobierzJson<{ years: number[] }>(`https://bdl.stat.gov.pl/api/v1/variables/${ZMIENNE_BUDZETU[0]![1]}?format=json`);
  const lata = [...zmienna.years].sort((a, b) => b - a);
  // Warszawa jest w BDL jedna jednostka, wiec do kompletu liczymy gminy
  // BEZ dzielnic i dokladamy sama Warszawe.
  const oczekiwane = new Set(
    (db.prepare("select teryt from gminy where rodzaj <> 'dzielnica Warszawy'").all() as unknown as { teryt: string }[]).map((r) => r.teryt),
  );
  oczekiwane.add(TERYT_WARSZAWY);

  const wstaw = db.prepare(
    `insert into budzety_gmin(teryt, rok, dochody, dochody_wlasne, wydatki, wydatki_majatkowe, wydatki_inwestycyjne)
     values (?,?,?,?,?,?,?)
     on conflict(teryt, rok) do update set dochody=excluded.dochody, dochody_wlasne=excluded.dochody_wlasne,
       wydatki=excluded.wydatki, wydatki_majatkowe=excluded.wydatki_majatkowe,
       wydatki_inwestycyjne=excluded.wydatki_inwestycyjne`,
  );
  const zaokr = (w: Map<string, number>, t: string): number | null => {
    const v = w.get(t);
    return v === undefined ? null : Math.round(v);
  };

  const zapisaneLata: number[] = [];
  let ostatniaSuma = 0;
  // Przegladamy o dwa lata wiecej, niz chcemy zapisac: najswiezszy rok bywa
  // niepelny, a najstarsze lata w slowniku bywaja bez czesci gmin.
  const odNowa = process.argv.includes('--od-nowa');
  for (const rok of lata.slice(0, ileLat + 2)) {
    if (zapisaneLata.length >= ileLat) break;
    // Wznawianie: rok, ktory juz ma komplet gmin, zostaje — przerwany import
    // (np. GUS odpowiedzial 429) nie musi pobierac wszystkiego od poczatku.
    const juzJest = (db.prepare('select count(*) as c from budzety_gmin where rok = ? and dochody is not null').get(rok) as { c: number }).c;
    if (!odNowa && juzJest >= oczekiwane.size * 0.95) {
      log(`   rok ${rok}: juz w bazie (${juzJest} gmin) — pomijam; --od-nowa pobiera ponownie`);
      zapisaneLata.push(rok);
      continue;
    }
    const kolumny = new Map<string, Map<string, number>>();
    for (const [kolumna, id] of ZMIENNE_BUDZETU) {
      kolumny.set(kolumna, await bdlZmiennaGmin(id, rok));
    }
    const dochody = kolumny.get('dochody')!;
    const komplet = [...oczekiwane].filter((t) => dochody.has(t)).length;
    if (komplet < oczekiwane.size * 0.95) {
      log(`   rok ${rok}: tylko ${komplet} z ${oczekiwane.size} gmin — pomijam`);
      continue;
    }

    db.exec('begin');
    db.exec(`delete from budzety_gmin where rok = ${rok}`);
    for (const teryt of oczekiwane) {
      if (!dochody.has(teryt)) continue;
      wstaw.run(
        teryt, rok,
        zaokr(dochody, teryt),
        zaokr(kolumny.get('dochody_wlasne')!, teryt),
        zaokr(kolumny.get('wydatki')!, teryt),
        zaokr(kolumny.get('wydatki_majatkowe')!, teryt),
        zaokr(kolumny.get('wydatki_inwestycyjne')!, teryt),
      );
    }
    db.exec('commit');
    const suma = [...oczekiwane].reduce((a, t) => a + (dochody.get(t) ?? 0), 0);
    log(`   rok ${rok}: ${komplet} gmin, dochody razem ${(suma / 1e9).toFixed(1)} mld zl`);
    zapisaneLata.push(rok);
    if (zapisaneLata.length === 1) ostatniaSuma = suma;
  }

  if (!zapisaneLata.length) throw new Error('GUS BDL: zaden rok nie ma kompletu budzetow gmin');
  const gmin = (db.prepare('select count(distinct teryt) as c from budzety_gmin').get() as { c: number }).c;
  odnotujImport(
    db, 'budzety', gmin,
    `GUS BDL, lata ${zapisaneLata[zapisaneLata.length - 1]}–${zapisaneLata[0]}; dochody ${zapisaneLata[0]}: ${Math.round(ostatniaSuma)} zl`,
  );
}

/**
 * SMUP (GUS): wskazniki finansowe i podatkowe gmin, rocznie.
 *
 * Budzet z BDL mowi, ILE gmina wydala; SMUP mowi, jak jej idzie — ile umarza,
 * ile traci na wlasnych ulgach, ile ma dlugu, czy dochody biezace pokrywaja
 * wydatki biezace. Lista miar i ich uzasadnienie: `ingest/lib/smup.ts`.
 *
 * Jeden wskaznik i rok to JEDNO zapytanie (ok. 3 tys. wierszy przy
 * `page-size=5000`), wiec pelny import to ok. 240 zapytan. Limitow SMUP nie
 * znamy — stad przerwa 400 ms i pomijanie tego, co juz kompletne w bazie
 * (`--od-nowa` pobiera znowu, `--lata=N` zaweza zakres).
 */
async function importSmup(db: DatabaseSync): Promise<void> {
  if (!kluczSmup()) throw new Error('Brak SMUP_KLUCZ — bez klucza SMUP nie odda danych (.env.local albo /etc/jawne/jawne.env)');
  const ileLat = Number(process.argv.find((a) => a.startsWith('--lata='))?.split('=')[1] ?? 10);
  const odNowa = process.argv.includes('--od-nowa');
  log(`-> SMUP: ${MIARY.length} miar gmin, ostatnie ${ileLat} lat`);

  // Slownik terytorialny: id SMUP -> nasz szesciocyfrowy TERYT.
  const slownik = await pobierzJson<{ data: JednostkaSmup[] }>(adresSlownikaTeryt());
  const teryty = new Map<number, string>();
  for (const u of slownik.data ?? []) {
    const t = terytGminy(u);
    if (t) teryty.set(u['id-teryt'], t);
  }
  const znane = new Set((db.prepare('select teryt from gminy').all() as unknown as { teryt: string }[]).map((r) => r.teryt));
  znane.add(TERYT_WARSZAWY);
  const obce = [...new Set([...teryty.values()].filter((t) => !znane.has(t)))];
  log(`   slownik SMUP: ${teryty.size} gmin, z tego ${teryty.size - obce.length} znamy`);
  if (obce.length) log(`   UWAGA - ${obce.length} gmin SMUP spoza naszej listy (np. ${obce.slice(0, 5).join(', ')}) — pomijam`);

  // Nazwy urzedowe bierzemy z rejestru, zeby nie przepisywac ich recznie.
  const rejestr = await pobierzJson<{ data: { id: number; 'nazwa-wskaznika': string }[] }>(adresWskaznikow());
  const nazwy = new Map((rejestr.data ?? []).map((w) => [w.id, w['nazwa-wskaznika']]));
  const daty = await pobierzJson<{ data: { rok: number }[] }>(adresLat());
  const lata = [...new Set((daty.data ?? []).map((d) => d.rok))].sort((a, b) => b - a).slice(0, ileLat);
  log(`   lata: ${lata[lata.length - 1]}–${lata[0]}`);

  const wstawMiare = db.prepare(
    `insert into smup_miary(klucz, etykieta, jednostka, wskazniki, nazwy) values (?,?,?,?,?)
     on conflict(klucz) do update set etykieta=excluded.etykieta, jednostka=excluded.jednostka,
       wskazniki=excluded.wskazniki, nazwy=excluded.nazwy`,
  );
  db.exec('begin');
  for (const m of MIARY) {
    wstawMiare.run(m.klucz, m.etykieta, m.jednostka, m.zrodla.join(','), m.zrodla.map((id) => nazwy.get(id) ?? '?').join(' | '));
  }
  db.exec('commit');

  const wstaw = db.prepare(
    `insert into smup_dane(teryt, klucz, rok, wartosc, flaga, precyzja) values (?,?,?,?,?,?)
     on conflict(teryt, klucz, rok) do update set wartosc=excluded.wartosc, flaga=excluded.flaga, precyzja=excluded.precyzja`,
  );
  const nieznaneFlagi = new Map<number, number>();
  const bezDanych: string[] = [];
  let zapytan = 0;
  let pominietych = 0;

  for (const miara of MIARY) {
    let wMiary = 0;
    for (const rok of lata) {
      const juz = (db.prepare('select count(*) as c from smup_dane where klucz = ? and rok = ?').get(miara.klucz, rok) as { c: number }).c;
      if (!odNowa && juz >= 2400) {
        pominietych++;
        continue;
      }
      let wRoku = 0;
      for (const id of miara.zrodla) {
        for (let strona = 1; strona <= 5; strona++) {
          // ZMIERZONE 21.09.2026: wskaznik bez danych za dany rok oddaje
          // HTTP 404 (nie pusta tablice). Wskaznik 16 ma 2024, nie ma 2025,
          // a wskazniki budzetowe maja oba. To odpowiedz, nie awaria —
          // raportujemy i idziemy dalej (wzorzec 2 z CLAUDE.md).
          let porcja: { data: WierszSmup[]; 'page-count': number };
          try {
            porcja = await pobierzJson<{ data: WierszSmup[]; 'page-count': number }>(adresDanych(id, rok, strona));
          } catch (e) {
            if (e instanceof Error && e.message.includes('HTTP 404')) break;
            throw e;
          }
          zapytan++;
          const wiersze = porcja.data ?? [];
          const problemy = sprawdzPorcjeSmup(wiersze, id, rok);
          if (problemy.length) throw new Error(`SMUP ${miara.klucz} (wskaznik ${id}, ${rok}): ${problemy.slice(0, 5).join('; ')}`);
          db.exec('begin');
          for (const w of wiersze) {
            const teryt = teryty.get(w['id-teryt']);
            if (!teryt || !znane.has(teryt)) continue;
            if (!FLAGI_ZNANE.has(w['id-flaga'])) nieznaneFlagi.set(w['id-flaga'], (nieznaneFlagi.get(w['id-flaga']) ?? 0) + 1);
            wstaw.run(teryt, miara.klucz, rok, wartoscDoZapisu(w), w['id-flaga'], w.precyzja ?? null);
            wRoku++;
            wMiary++;
          }
          db.exec('commit');
          await new Promise((ok) => setTimeout(ok, 400));
          if (strona >= (porcja['page-count'] ?? 1)) break;
        }
      }
      if (!wRoku) bezDanych.push(`${miara.klucz} ${rok}`);
    }
    log(`   ${miara.klucz.padEnd(24)} ${wMiary ? `${wMiary} wierszy` : 'bez nowych danych'}`);
  }

  const gmin = (db.prepare('select count(distinct teryt) as c from smup_dane').get() as { c: number }).c;
  const razem = (db.prepare('select count(*) as c from smup_dane').get() as { c: number }).c;
  log(`   razem w bazie: ${razem} wartosci dla ${gmin} gmin (${zapytan} zapytan, pominietych par: ${pominietych})`);
  if (bezDanych.length) log(`   bez danych w zrodle: ${bezDanych.length} par miara-rok (np. ${bezDanych.slice(0, 3).join(', ')})`);
  if (nieznaneFlagi.size) log(`   UWAGA - flagi spoza slownika: ${[...nieznaneFlagi].map(([f, n]) => `${f}x${n}`).join(', ')}`);
  odnotujImport(db, 'smup', razem, `${MIARY.length} miar, lata ${lata[lata.length - 1]}–${lata[0]}, gmin ${gmin}`);
}

const ETAPY: Record<string, (db: DatabaseSync) => Promise<void>> = {
  kluby: importKlubow,
  poslowie: importPoslow,
  glosowania: importGlosowan,
  glosy: importGlosow,
  zdjecia: importZdjec,
  okregi: importOkregow,
  ludnosc: importLudnosci,
  budzety: importBudzetow,
  smup: importSmup,
  fundusze: importFunduszy,
  wyliczenia,
};

const zadane = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const doZrobienia = zadane.includes('wszystko') || zadane.length === 0 ? Object.keys(ETAPY) : zadane;

const nieznane = doZrobienia.filter((e) => !(e in ETAPY));
if (nieznane.length) {
  log(`Nieznany etap: ${nieznane.join(', ')}. Dostepne: ${Object.keys(ETAPY).join(', ')}, wszystko`);
  process.exit(2);
}

// Zawiniete w funkcje, bo projekt jest CJS (Next nie potrzebuje "type":"module"),
// a tsx nie przepuszcza w takim pliku awaitu na najwyzszym poziomie.
async function main(): Promise<void> {
  // Klucze API (np. GUS_BDL_KLUCZ) trzymamy w .env.local — poza repozytorium.
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const db = otworz(true);
  zalozSchemat(db);
  const start = Date.now();
  try {
    for (const etap of doZrobienia) await ETAPY[etap]!(db);
    log(`\nGotowe w ${((Date.now() - start) / 1000).toFixed(0)} s`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  log(`\nBLAD: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
