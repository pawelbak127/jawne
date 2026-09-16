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
import { dlaKazdego, pobierz } from '../lib/http.js';
import * as api from '../lib/sejm.js';
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

async function importPoslow(db: DatabaseSync, sprawdzZdjecia: boolean): Promise<void> {
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

  let zdjecia = new Map<number, boolean>();
  if (sprawdzZdjecia) {
    log('   sprawdzam zdjecia (HEAD)');
    const wyniki = await dlaKazdego(lista, async (p) => {
      try {
        const odp = await pobierz(api.adresZdjecia(p.id), { json: false });
        return [p.id, odp.ok] as const;
      } catch {
        return [p.id, false] as const;
      }
    }, { opis: 'zdjecia', co: 100 });
    zdjecia = new Map(wyniki);
  }

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
      sprawdzZdjecia ? (zdjecia.get(p.id) ? 1 : 0) : null,
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
  const nieznaneGlosy = new Map<string, number>();
  const nieznaneKluby = new Map<string, number>();
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
        const klub = v.club && znaneKluby.has(v.club) ? v.club : null;
        if (v.club && !klub) nieznaneKluby.set(v.club, (nieznaneKluby.get(v.club) ?? 0) + 1);
        wstaw.run(g.sitting, g.votingNumber, v.MP, klub, v.vote);
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
  if (nieznaneKluby.size) {
    const opis = [...nieznaneKluby].map(([k, n]) => `${k}x${n}`).join(', ');
    log(`   UWAGA - kluby w glosach, ktorych nie ma w /clubs: ${opis} (zapisane jako null)`);
    uwagi.push(`kluby spoza rejestru: ${opis}`);
  }
  log(`   razem ${zapisanych} glosow`);
  odnotujImport(db, 'glosy', zapisanych, uwagi.join(' | '));
}

const ETAPY: Record<string, (db: DatabaseSync) => Promise<void>> = {
  kluby: importKlubow,
  poslowie: (db) => importPoslow(db, process.argv.includes('--zdjecia')),
  glosowania: importGlosowan,
  glosy: importGlosow,
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
