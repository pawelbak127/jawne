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
import { otworz, zalozSchemat, odnotujImport } from '../lib/baza.js';
import { slugPosla } from '../lib/slug.js';
import { GLOSY_ZNANE } from '../../src/lib/glosy.js';
import { dlaKazdego, pobierzBajty } from '../lib/http.js';
import * as api from '../lib/sejm.js';
import { czytajGminyPkw, sprawdzGminyPkw } from '../lib/pkw.js';
import { uprosc } from '../../src/lib/tekst.js';
import { opisGlosowania } from '../../src/lib/opis-glosowania.js';
import { bezNazwiskOsobPrywatnych } from '../../src/lib/prywatnosc.js';
import { porownajZKlubem, type GlosZKlubem } from '../../src/lib/niezaleznosc.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const ETAPY: Record<string, (db: DatabaseSync) => Promise<void>> = {
  kluby: importKlubow,
  poslowie: importPoslow,
  glosowania: importGlosowan,
  glosy: importGlosow,
  zdjecia: importZdjec,
  okregi: importOkregow,
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
