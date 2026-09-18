import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { KLUBY, type Klub } from './kluby';
import { uprosc, zapytanieFts } from './tekst';
import { porownajZKlubem, type GlosZKlubem, type PorownanieZKlubem } from './niezaleznosc';

/**
 * JEDYNY dostep do danych dla stron publicznych.
 *
 * Wszystko jest tylko do odczytu. Baza to plik SQLite zbudowany przez
 * `npm run import`; gdy go nie ma, strony pokazuja stan "brak danych"
 * zamiast sie wywracac — bo brak importu to nie jest awaria serwisu,
 * tylko etap pracy.
 */

const SCIEZKA = process.env.JAWNE_BAZA ?? resolve(process.cwd(), 'dane', 'sejm.db');

let polaczenie: DatabaseSync | null = null;

function db(): DatabaseSync | null {
  if (polaczenie) return polaczenie;
  /*
    Turbopack ostrzega tu o dostepie do pliku, ktorego sciezki nie umie
    przesledzic, i ma racje: jest zlozona ze zmiennej srodowiskowej.
    To jest SWIADOME — baza nie jest zasobem aplikacji do spakowania, tylko
    plikiem danych obok niej, wymienianym bez przebudowy przy kazdym imporcie.
    Wniosek praktyczny na wdrozenie: `dane/sejm.db` trzeba dostarczyc osobno,
    bo bundler go nie zabierze.
  */
  if (!existsSync(/* turbopackIgnore: true */ SCIEZKA)) return null;
  polaczenie = new DatabaseSync(SCIEZKA, { readOnly: true });
  return polaczenie;
}

export function bazaDostepna(): boolean {
  return db() !== null;
}

function wszystkie<T>(sql: string, ...params: unknown[]): T[] {
  const d = db();
  if (!d) return [];
  return d.prepare(sql).all(...(params as never[])) as unknown as T[];
}

function jeden<T>(sql: string, ...params: unknown[]): T | null {
  const d = db();
  if (!d) return null;
  return (d.prepare(sql).get(...(params as never[])) as unknown as T) ?? null;
}

/**
 * Brak tabeli = brakujacy etap importu, nie awaria. Strona pokazuje wtedy
 * pusty stan, a KAZDY inny blad SQL-a przepuszczamy, bo oznacza usterke.
 */
function bezTabeli<T>(fn: () => T, gdyBrak: T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Error && /no such table/i.test(e.message)) return gdyBrak;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Podsumowanie
// ---------------------------------------------------------------------------

export type Podsumowanie = {
  poslow: number;
  poslowAktywnych: number;
  klubow: number;
  glosowan: number;
  glosow: number;
  glosowanZGlosami: number;
  ostatnieGlosowanie: string | null;
  pierwszeGlosowanie: string | null;
};

export function podsumowanie(): Podsumowanie {
  const l = (sql: string) => jeden<{ c: number }>(sql)?.c ?? 0;
  const zakres = jeden<{ od: string | null; do_: string | null }>(
    'select min(data) as od, max(data) as do_ from glosowania',
  );
  return {
    poslow: l('select count(*) as c from poslowie'),
    poslowAktywnych: l('select count(*) as c from poslowie where aktywny = 1'),
    klubow: l('select count(*) as c from kluby'),
    glosowan: l('select count(*) as c from glosowania'),
    glosow: l('select count(*) as c from glosy'),
    glosowanZGlosami: l('select count(*) as c from (select distinct posiedzenie, numer from glosy)'),
    ostatnieGlosowanie: zakres?.do_ ?? null,
    pierwszeGlosowanie: zakres?.od ?? null,
  };
}

// ---------------------------------------------------------------------------
// Kluby
// ---------------------------------------------------------------------------

export type KlubZDanymi = Klub & { poslow: number };

/**
 * Laczy rejestr (nazwa, mandaty) z naszym zestawem barw i kolejnoscia
 * zasiadania. Kluby, ktorych nie ma w `kluby.ts`, dostaja barwe zastepcza
 * i lecza na koniec — lepiej pokazac klub bez przypisanej barwy niz go pominac.
 */
export function kluby(): KlubZDanymi[] {
  const wiersze = wszystkie<{ id: string; nazwa: string | null; mandaty: number | null; poslow: number }>(
    `select k.id as id, k.nazwa as nazwa, k.mandaty as mandaty,
            (select count(*) from poslowie p where p.klub_id = k.id and p.aktywny = 1) as poslow
       from kluby k`,
  );
  const kolejnosc = new Map(KLUBY.map((k, i) => [k.id, i]));
  return wiersze
    .map((w) => {
      const barwy = KLUBY.find((k) => k.id === w.id);
      return {
        id: w.id,
        nazwa: w.nazwa,
        mandaty: w.mandaty,
        poslow: w.poslow,
        barwa: barwy?.barwa ?? '#9a958c',
        barwaCiemna: barwy?.barwaCiemna ?? '#8e8a95',
      };
    })
    .sort((a, b) => (kolejnosc.get(a.id) ?? 999) - (kolejnosc.get(b.id) ?? 999));
}

// ---------------------------------------------------------------------------
// Poslowie
// ---------------------------------------------------------------------------

export type PoselSkrot = {
  id: number;
  slug: string;
  imie_nazwisko: string;
  nazwisko: string;
  klub_id: string | null;
  okreg_nr: number | null;
  okreg_nazwa: string | null;
  wojewodztwo: string | null;
  aktywny: number;
  ma_zdjecie: number | null;
};

export function listaPoslow(): PoselSkrot[] {
  return wszystkie<PoselSkrot>(
    `select id, slug, imie_nazwisko, nazwisko, klub_id, okreg_nr, okreg_nazwa,
            wojewodztwo, aktywny, ma_zdjecie
       from poslowie
      order by nazwisko collate nocase, imie_nazwisko collate nocase`,
  );
}

export type Posel = PoselSkrot & {
  imie: string;
  drugie_imie: string | null;
  zawod: string | null;
  wyksztalcenie: string | null;
  data_urodzenia: string | null;
  miejsce_urodzenia: string | null;
  glosow_w_wyborach: number | null;
  email: string | null;
  przyczyna_wygasniecia: string | null;
  data_wygasniecia: string | null;
};

export function posel(slug: string): Posel | null {
  return jeden<Posel>('select * from poslowie where slug = ?', slug);
}

export function slugiPoslow(): string[] {
  return wszystkie<{ slug: string }>('select slug from poslowie').map((r) => r.slug);
}

/**
 * Rozklad glosow posla.
 *
 * Zwraca surowe kody rejestru z licznikami — etykiety nadaje warstwa widoku.
 * `mianownik` to liczba glosowan, w ktorych posel w ogole figuruje; bez niego
 * procent jest nieczytelny, bo 60% ze stu glosowan to nie to samo,
 * co 60% z czterech tysiecy.
 */
export type StatystykiPosla = {
  rozklad: { glos: string; ile: number }[];
  mianownik: number;
  oddanych: number;
};

export function statystykiPosla(id: number): StatystykiPosla {
  const rozklad = wszystkie<{ glos: string; ile: number }>(
    'select glos, count(*) as ile from glosy where posel_id = ? group by glos order by ile desc',
    id,
  );
  const mianownik = rozklad.reduce((a, r) => a + r.ile, 0);
  const oddanych = rozklad
    .filter((r) => r.glos === 'YES' || r.glos === 'NO' || r.glos === 'ABSTAIN')
    .reduce((a, r) => a + r.ile, 0);
  return { rozklad, mianownik, oddanych };
}

/** Ostatnie glosowania, w ktorych posel figuruje — z jego glosem. */
export function ostatnieGlosyPosla(id: number, ile = 8): (GlosowanieSkrot & { glos: string })[] {
  return wszystkie<GlosowanieSkrot & { glos: string }>(
    `select ${KOLUMNY_GLOSOWANIA}, s.glos as glos
       from glosy s
       join glosowania g on g.posiedzenie = s.posiedzenie and g.numer = s.numer
      where s.posel_id = ?
      order by g.data desc, g.posiedzenie desc, g.numer desc
      limit ?`,
    id, ile,
  );
}

// ---------------------------------------------------------------------------
// Glosowania
// ---------------------------------------------------------------------------

export type GlosowanieSkrot = {
  posiedzenie: number;
  numer: number;
  data: string;
  tytul: string;
  temat: string | null;
  za: number;
  przeciw: number;
  wstrzymalo: number;
  nieobecnych: number;
  /**
   * Liczba obecnych, ktorzy wzieli udzial. NIE jest rowna za+przeciw+wstrzymalo:
   * w 59 glosowaniach (kworum, wybory na liscie) rejestr liczy obecnych bez
   * glosu za/przeciw. Bez tego pola pasek glosowania kworum pokazywal,
   * ze nikt nie glosowal.
   */
  glosowalo: number;
  rodzaj: string | null;
};

/** Kolumny skrotu glosowania z tabela aliasowana jako `g`. Jedno miejsce, piec zapytan. */
const KOLUMNY_GLOSOWANIA = `
  g.posiedzenie as posiedzenie, g.numer as numer, g.data as data, g.tytul as tytul,
  g.temat as temat, g.za as za, g.przeciw as przeciw, g.wstrzymalo as wstrzymalo,
  g.nieobecnych as nieobecnych, g.glosowalo as glosowalo, g.rodzaj as rodzaj`;

/**
 * Filtr "nad caloscia projektu" korzysta z tabeli cech wyliczonej ta sama
 * funkcja, ktora opisuje glosowanie na stronie. Bez tabeli (nie uruchomiono
 * etapu "wyliczenia") zwracamy pusta liste — pokazanie wszystkich glosowan
 * pod naglowkiem "nad caloscia" byloby nieprawda.
 */
function zFiltrem<T>(nadCaloscia: boolean, zapytanie: (zlaczenie: string) => T, gdyBrak: T): T {
  if (!nadCaloscia) return zapytanie('');
  return bezTabeli(
    () => zapytanie(
      `join glosowania_cechy c on c.posiedzenie = g.posiedzenie and c.numer = g.numer and c.nad_caloscia = 1`,
    ),
    gdyBrak,
  );
}

export function ostatnieGlosowania(ile = 12, opcje: { nadCaloscia?: boolean } = {}): GlosowanieSkrot[] {
  return zFiltrem(
    Boolean(opcje.nadCaloscia),
    (zl) => wszystkie<GlosowanieSkrot>(
      `select ${KOLUMNY_GLOSOWANIA} from glosowania g ${zl}
        order by g.data desc, g.posiedzenie desc, g.numer desc limit ?`,
      ile,
    ),
    [],
  );
}

export function liczbaGlosowan(opcje: { nadCaloscia?: boolean } = {}): number {
  return zFiltrem(
    Boolean(opcje.nadCaloscia),
    (zl) => jeden<{ c: number }>(`select count(*) as c from glosowania g ${zl}`)?.c ?? 0,
    0,
  );
}

export type Glosowanie = GlosowanieSkrot & {
  dzien: number | null;
  opis: string | null;
  typ_wiekszosci: string | null;
  pdf: string | null;
};

export function glosowanie(posiedzenie: number, numer: number): Glosowanie | null {
  return jeden<Glosowanie>(
    'select * from glosowania where posiedzenie = ? and numer = ?',
    posiedzenie, numer,
  );
}

export type GlosPosla = {
  posel_id: number;
  glos: string;
  klub_id: string | null;
  slug: string;
  imie_nazwisko: string;
  nazwisko: string;
};

export function glosyWGlosowaniu(posiedzenie: number, numer: number): GlosPosla[] {
  return wszystkie<GlosPosla>(
    `select s.posel_id as posel_id, s.glos as glos, s.klub_id as klub_id,
            p.slug as slug, p.imie_nazwisko as imie_nazwisko, p.nazwisko as nazwisko
       from glosy s
       join poslowie p on p.id = s.posel_id
      where s.posiedzenie = ? and s.numer = ?
      order by p.nazwisko collate nocase`,
    posiedzenie, numer,
  );
}

/** Czy glosowanie ma juz zaimportowane glosy imienne. */
export function maGlosyImienne(posiedzenie: number, numer: number): boolean {
  return (jeden<{ c: number }>(
    'select count(*) as c from glosy where posiedzenie = ? and numer = ? limit 1',
    posiedzenie, numer,
  )?.c ?? 0) > 0;
}

/** Strona listy glosowan. Stronicowanie jawne — bez niego lista urywa sie po cichu. */
export function stronaGlosowan(offset: number, limit: number, opcje: { nadCaloscia?: boolean } = {}): GlosowanieSkrot[] {
  return zFiltrem(
    Boolean(opcje.nadCaloscia),
    (zl) => wszystkie<GlosowanieSkrot>(
      `select ${KOLUMNY_GLOSOWANIA} from glosowania g ${zl}
        order by g.data desc, g.posiedzenie desc, g.numer desc limit ? offset ?`,
      limit, offset,
    ),
    [],
  );
}

export type WpisImportu = { co: string; kiedy: string; ile: number | null; uwagi: string | null };

/** Co i kiedy zostalo zaimportowane — na strone stanu danych. */
export function stanImportu(): WpisImportu[] {
  return wszystkie<WpisImportu>('select co, kiedy, ile, uwagi from import order by co');
}

export type Zdjecie = { typ: string; bajty: Uint8Array };

/**
 * Zdjecie posla z naszej bazy. Uzywane przez obrazek Open Graph i przez wlasna
 * trase obrazka — dzieki temu ani render podgladu, ani build nie zaleza od
 * tego, czy API Sejmu akurat odpowiada.
 */
export function zdjeciePosla(id: number): Zdjecie | null {
  // Brak tabeli = nie uruchomiono etapu "zdjecia"; trasa narysuje inicjaly.
  return bezTabeli(() => {
    const w = jeden<{ typ: string; bajty: Uint8Array }>(
      'select typ, bajty from zdjecia where posel_id = ?', id,
    );
    return w ? { typ: w.typ, bajty: w.bajty } : null;
  }, null);
}

// ---------------------------------------------------------------------------
// Porownanie z klubem
// ---------------------------------------------------------------------------

/** Glosy posla razem z sumami jego klubu w tych samych glosowaniach. */
export function porownanieZKlubem(poselId: number): PorownanieZKlubem | null {
  return bezTabeli(() => {
    const wiersze = wszystkie<GlosZKlubem>(
      `select s.posiedzenie as posiedzenie, s.numer as numer, g.data as data,
              g.tytul as tytul, g.temat as temat, s.klub_id as klub_id, s.glos as glos,
              k.za as za, k.przeciw as przeciw, k.wstrzymalo as wstrzymalo
         from glosy s
         join glosy_klubow k on k.posiedzenie = s.posiedzenie and k.numer = s.numer and k.klub_id = s.klub_id
         join glosowania g on g.posiedzenie = s.posiedzenie and g.numer = s.numer
        where s.posel_id = ?`,
      poselId,
    );
    return porownajZKlubem(wiersze);
  }, null);
}

export type PodsumowaniePorownania = { porownywalnych: number; odmiennych: number };

/** Same liczby porownania dla wielu posłow — z tabeli liczonej przy imporcie. */
export function podsumowaniaPorownan(idPoslow: number[]): Map<number, PodsumowaniePorownania> {
  if (idPoslow.length === 0) return new Map();
  const wiersze = bezTabeli(
    () => wszystkie<PodsumowaniePorownania & { posel_id: number }>(
      `select posel_id, porownywalnych, odmiennych from porownania_poslow
        where posel_id in (${idPoslow.map(() => '?').join(',')})`,
      ...idPoslow,
    ),
    [],
  );
  return new Map(wiersze.map((w) => [w.posel_id, w]));
}

export type WynikKlubu = {
  klub_id: string;
  za: number;
  przeciw: number;
  wstrzymalo: number;
  nieobecnych: number;
  innych: number;
};

export function wynikiKlubow(posiedzenie: number, numer: number): WynikKlubu[] {
  return bezTabeli(
    () => wszystkie<WynikKlubu>(
      `select klub_id, za, przeciw, wstrzymalo, nieobecnych, innych
         from glosy_klubow where posiedzenie = ? and numer = ?`,
      posiedzenie, numer,
    ),
    [],
  );
}

// ---------------------------------------------------------------------------
// Okregi
// ---------------------------------------------------------------------------

export type Okreg = {
  nr: number;
  nazwa: string | null;
  wojewodztwo: string;
  uprawnionych_kraj: number | null;
  uprawnionych_zagr: number | null;
  poslow: number;
  gmin: number;
};

const SELECT_OKREG = `
  select o.nr as nr, o.nazwa as nazwa, o.wojewodztwo as wojewodztwo,
         o.uprawnionych_kraj as uprawnionych_kraj, o.uprawnionych_zagr as uprawnionych_zagr,
         (select count(*) from poslowie p where p.okreg_nr = o.nr and p.aktywny = 1) as poslow,
         (select count(*) from gminy g where g.okreg_nr = o.nr) as gmin
    from okregi o`;

export function okregi(): Okreg[] {
  return bezTabeli(() => wszystkie<Okreg>(`${SELECT_OKREG} order by o.nr`), []);
}

export function okreg(nr: number): Okreg | null {
  return bezTabeli(() => jeden<Okreg>(`${SELECT_OKREG} where o.nr = ?`, nr), null);
}

export type Gmina = {
  teryt: string;
  nazwa: string;
  rodzaj: string;
  powiat: string;
  wojewodztwo: string;
  okreg_nr: number;
  uprawnionych: number | null;
};

export function gminyOkregu(nr: number): Gmina[] {
  return bezTabeli(
    () => wszystkie<Gmina>(
      `select teryt, nazwa, rodzaj, powiat, wojewodztwo, okreg_nr, uprawnionych
         from gminy where okreg_nr = ? order by powiat collate nocase, nazwa collate nocase`,
      nr,
    ),
    [],
  );
}

export function poslowieOkregu(nr: number): PoselSkrot[] {
  return wszystkie<PoselSkrot>(
    `select id, slug, imie_nazwisko, nazwisko, klub_id, okreg_nr, okreg_nazwa,
            wojewodztwo, aktywny, ma_zdjecie
       from poslowie where okreg_nr = ?
      order by aktywny desc, nazwisko collate nocase`,
    nr,
  );
}

export type GlosWOkregu = { posiedzenie: number; numer: number; posel_id: number; glos: string };

/**
 * Ostatnie glosowania NAD CALOSCIA projektow z glosami posłow jednego okregu.
 *
 * Nie wybieramy "waznych" glosowan — to bylaby nasza ocena. Bierzemy
 * ostateczne glosowania nad projektami, rozpoznane po slowach rejestru
 * ("głosowanie nad całością"). Wczesniejsza wersja brala po prostu ostatnie
 * glosowania i tabela okregu skladala sie z kworum, przerw i odroczen.
 */
export function glosyOkregu(nr: number, ile = 10): { glosowania: GlosowanieSkrot[]; glosy: GlosWOkregu[] } {
  const glosowania = ostatnieGlosowania(ile, { nadCaloscia: true });
  if (glosowania.length === 0) return { glosowania, glosy: [] };
  const warunek = glosowania.map(() => '(s.posiedzenie = ? and s.numer = ?)').join(' or ');
  const glosy = wszystkie<GlosWOkregu>(
    `select s.posiedzenie as posiedzenie, s.numer as numer, s.posel_id as posel_id, s.glos as glos
       from glosy s join poslowie p on p.id = s.posel_id
      where p.okreg_nr = ? and (${warunek})`,
    nr, ...glosowania.flatMap((g) => [g.posiedzenie, g.numer]),
  );
  return { glosowania, glosy };
}

// ---------------------------------------------------------------------------
// Wyszukiwanie
// ---------------------------------------------------------------------------

let indeksPoslow: (PoselSkrot & { klucz: string; kluczNazwiska: string })[] | null = null;

export type GminaWWyszukiwaniu = Gmina & { okreg_nazwa: string | null };

export type WynikiWyszukiwania = {
  fraza: string;
  poslowie: PoselSkrot[];
  gminy: GminaWWyszukiwaniu[];
  glosowania: GlosowanieSkrot[];
  glosowanWszystkich: number;
};

/**
 * Jedno pole na wszystko: posel, gmina (-> okreg) i glosowanie.
 *
 * Posłow i gminy porownujemy po tekscie bez ogonkow, bo na polskiej
 * klawiaturze ogonek to dodatkowy klawisz i ludzie go pomijaja. Glosowania
 * ida przez FTS5 — patrz uwagi w tekst.ts o odmianie i o literze "ł".
 */
export function szukaj(fraza: string, ileGlosowan = 8): WynikiWyszukiwania {
  const pusty: WynikiWyszukiwania = { fraza, poslowie: [], gminy: [], glosowania: [], glosowanWszystkich: 0 };
  const q = uprosc(fraza.trim());
  if (q.length < 2 || !bazaDostepna()) return pusty;

  indeksPoslow ??= listaPoslow().map((p) => ({
    ...p,
    klucz: uprosc(p.imie_nazwisko),
    kluczNazwiska: uprosc(p.nazwisko),
  }));
  const poslowie = indeksPoslow
    .filter((p) => p.klucz.includes(q))
    // Najpierw trafienie od poczatku nazwiska, potem sprawujacy mandat.
    .sort((a, b) =>
      Number(b.kluczNazwiska.startsWith(q)) - Number(a.kluczNazwiska.startsWith(q))
      || b.aktywny - a.aktywny
      || a.nazwisko.localeCompare(b.nazwisko, 'pl'))
    .slice(0, 8);

  const gminy = bezTabeli(
    () => wszystkie<GminaWWyszukiwaniu>(
      `select g.teryt as teryt, g.nazwa as nazwa, g.rodzaj as rodzaj, g.powiat as powiat,
              g.wojewodztwo as wojewodztwo, g.okreg_nr as okreg_nr, g.uprawnionych as uprawnionych,
              o.nazwa as okreg_nazwa
         from gminy g join okregi o on o.nr = g.okreg_nr
        where instr(g.szukaj, ?) > 0
        order by (g.szukaj = ?) desc, (substr(g.szukaj, 1, length(?)) = ?) desc,
                 g.uprawnionych desc
        limit 8`,
      q, q, q, q,
    ),
    [],
  );

  let glosowania: GlosowanieSkrot[] = [];
  let glosowanWszystkich = 0;
  const fts = zapytanieFts(fraza);
  if (fts) {
    glosowania = bezTabeli(
      () => wszystkie<GlosowanieSkrot>(
        `select ${KOLUMNY_GLOSOWANIA}
           from glosowania_szukaj f
           join glosowania g on g.posiedzenie = f.posiedzenie and g.numer = f.numer
          where glosowania_szukaj match ?
          order by g.data desc, g.posiedzenie desc, g.numer desc
          limit ?`,
        fts, ileGlosowan,
      ),
      [],
    );
    glosowanWszystkich = bezTabeli(
      () => jeden<{ c: number }>('select count(*) as c from glosowania_szukaj where glosowania_szukaj match ?', fts)?.c ?? 0,
      0,
    );
  }

  return { fraza, poslowie, gminy, glosowania, glosowanWszystkich };
}

// ---------------------------------------------------------------------------
// Gmina: ludnosc, fundusze UE, pomoc publiczna
// ---------------------------------------------------------------------------

export type GminaPelna = Gmina & {
  okreg_nazwa: string | null;
  ludnosc: number | null;
  ludnosc_rok: number | null;
};

export function gminaPelna(teryt: string): GminaPelna | null {
  return bezTabeli(
    () => jeden<GminaPelna>(
      `select g.teryt as teryt, g.nazwa as nazwa, g.rodzaj as rodzaj, g.powiat as powiat,
              g.wojewodztwo as wojewodztwo, g.okreg_nr as okreg_nr, g.uprawnionych as uprawnionych,
              o.nazwa as okreg_nazwa, l.osob as ludnosc, l.rok as ludnosc_rok
         from gminy g
         join okregi o on o.nr = g.okreg_nr
         left join ludnosc l on l.teryt = g.teryt
        where g.teryt = ?`,
      teryt,
    ),
    null,
  );
}

export function terytyGmin(): string[] {
  return bezTabeli(() => wszystkie<{ teryt: string }>('select teryt from gminy order by teryt').map((r) => r.teryt), []);
}

export type GlosowanieDoMapy = Pick<Glosowanie, 'posiedzenie' | 'numer' | 'data' | 'tytul' | 'temat' | 'opis'>;

/** Wszystkie glosowania z polami potrzebnymi mapie strony (i decyzji o noindex). */
export function glosowaniaDoMapy(): GlosowanieDoMapy[] {
  return bezTabeli(
    () => wszystkie<GlosowanieDoMapy>(
      `select posiedzenie, numer, data, tytul, temat, opis from glosowania order by posiedzenie, numer`,
    ),
    [],
  );
}

export type FunduszeWOkresie = {
  okres: string;
  tylko_tu: number;
  tylko_tu_wartosc: number | null;
  tylko_tu_ue: number | null;
  wspolnych: number;
  w_powiecie: number;
};

/**
 * Fundusze UE w gminie, osobno dla kazdego okresu.
 * `teryt` Warszawy to 146501 — dzielnice (1465xx) dostaja dane calego miasta
 * osobnym wywolaniem, bo lista UE nie rozpisuje Warszawy na dzielnice.
 */
export function funduszeGminy(teryt: string): FunduszeWOkresie[] {
  return bezTabeli(
    () => wszystkie<FunduszeWOkresie>(
      `select o.okres as okres,
              coalesce(g.tylko_tu, 0) as tylko_tu, g.tylko_tu_wartosc as tylko_tu_wartosc,
              g.tylko_tu_ue as tylko_tu_ue, coalesce(g.wspolnych, 0) as wspolnych,
              coalesce(p.projektow, 0) as w_powiecie
         from (select '2021-2027' as okres union all select '2014-2020') o
         left join fe_gminy g on g.teryt = ? and g.okres = o.okres
         left join fe_powiaty p on p.teryt_powiatu = ? and p.okres = o.okres
        order by o.okres desc`,
      teryt, teryt.slice(0, 4),
    ),
    [],
  );
}

export const TERYT_WARSZAWY = '146501';

// Warszawa jest w liscie UE jedna gmina (146501), a w PKW i GUS — 18 dzielnic.
// Do przeliczen na mieszkanca skladamy ja z dzielnic; inaczej wypadalaby
// z porownan jako jedyne miasto bez ludnosci.
const JEDNOSTKI_FE = `
  select g.teryt as teryt, g.wojewodztwo as wojewodztwo, g.rodzaj as rodzaj, l.osob as osob
    from gminy g join ludnosc l on l.teryt = g.teryt
   where g.rodzaj <> 'dzielnica Warszawy'
  union all
  select '${TERYT_WARSZAWY}', min(g.wojewodztwo), 'miasto na prawach powiatu', sum(l.osob)
    from gminy g join ludnosc l on l.teryt = g.teryt
   where g.rodzaj = 'dzielnica Warszawy'
  having count(*) > 0`;

export function ludnoscWarszawy(): number | null {
  return bezTabeli(
    () => jeden<{ osob: number | null }>(
      `select sum(l.osob) as osob from gminy g join ludnosc l on l.teryt = g.teryt where g.rodzaj = 'dzielnica Warszawy'`,
    )?.osob ?? null,
    null,
  );
}

export type MedianaUe = {
  mediana: number;
  jednostek: number;
  /** z kim porownujemy — tekst na stronie zalezy od grupy */
  grupa: 'wojewodztwo' | 'miasta-na-prawach-powiatu';
};

/**
 * Mediana dofinansowania UE na mieszkanca w grupie porownawczej (projekty
 * realizowane wylacznie w jednej gminie, dany okres). Kontekst dla jednej
 * liczby — bez niej "300 zl na mieszkanca" nie znaczy nic.
 * Gminy bez takich projektow licza sie jako zero: brak projektu to zmierzony
 * brak, nie brak danych.
 *
 * 2021–2027: gminy tego samego wojewodztwa.
 * 2014–2020: miasta na prawach powiatu w calym kraju. Ta lista podaje miejsce
 * realizacji tylko do powiatu, wiec projekty "tylko w tej gminie" maja wylacznie
 * takie miasta. Mediana po wszystkich gminach wojewodztwa wychodzila 0 zl
 * (Krakow: 182 gminy, prawie wszystkie z zerem z powodu formatu listy).
 */
export function medianaUeNaMieszkanca(wojewodztwo: string, okres: string): MedianaUe | null {
  const miasta = okres === '2014-2020';
  const wiersze = bezTabeli(
    () => wszystkie<{ na_osobe: number }>(
      `select coalesce(f.tylko_tu_ue, 0) * 1.0 / j.osob as na_osobe
         from (${JEDNOSTKI_FE}) j
         left join fe_gminy f on f.teryt = j.teryt and f.okres = ?
        where ${miasta ? "j.rodzaj = 'miasto na prawach powiatu'" : 'j.wojewodztwo = ?'} and j.osob > 0
        order by na_osobe`,
      ...(miasta ? [okres] : [okres, wojewodztwo]),
    ),
    [],
  );
  if (!wiersze.length) return null;
  const s = Math.floor(wiersze.length / 2);
  const mediana = wiersze.length % 2 ? wiersze[s]!.na_osobe : (wiersze[s - 1]!.na_osobe + wiersze[s]!.na_osobe) / 2;
  return { mediana, jednostek: wiersze.length, grupa: miasta ? 'miasta-na-prawach-powiatu' : 'wojewodztwo' };
}

export type BudzetGminy = {
  rok: number;
  dochody: number | null;
  dochody_wlasne: number | null;
  wydatki: number | null;
  /** inwestycje plus dotacje inwestycyjne — to jest "budzet na inwestycje" */
  wydatki_majatkowe: number | null;
  /** sama czesc inwestycyjna wydatkow majatkowych */
  wydatki_inwestycyjne: number | null;
};

/**
 * Budzet gminy za ostatni rok, ktory GUS opublikowal.
 * Warszawa ma w BDL jedna jednostke (146501), wiec dzielnica dostaje budzet
 * calego miasta — tak samo jak przy funduszach UE.
 */
export function budzetGminy(teryt: string): BudzetGminy | null {
  return bezTabeli(
    () => jeden<BudzetGminy>(
      `select rok, dochody, dochody_wlasne, wydatki, wydatki_majatkowe, wydatki_inwestycyjne
         from budzety_gmin where teryt = ? order by rok desc limit 1`,
      teryt,
    ),
    null,
  );
}

export type RokBudzetu = {
  rok: number;
  dochody: number | null;
  wydatki: number | null;
  wydatki_majatkowe: number | null;
};

/**
 * Budzet gminy rok po roku, od najstarszego. Kwoty calkowite w cenach
 * biezacych — ludnosc mamy tylko z jednego roku, wiec "na mieszkanca" dla
 * starszych lat dzielilibysmy przez zly mianownik.
 */
export function historiaBudzetu(teryt: string): RokBudzetu[] {
  return bezTabeli(
    () => wszystkie<RokBudzetu>(
      `select rok, dochody, wydatki, wydatki_majatkowe from budzety_gmin where teryt = ? order by rok`,
      teryt,
    ),
    [],
  );
}

export type PorownanieBudzetu = {
  gmin: number;
  dochodyNaOsobe: number;
  udzialWlasnych: number;
  majatkoweNaOsobe: number;
};

/**
 * Mediany budzetowe w wojewodztwie — kontekst dla trzech liczb ze strony gminy.
 * Bez nich "8 900 zl na mieszkanca" i "84 % dochodow wlasnych" nie znacza nic.
 *
 * Liczymy tylko z gmin, ktore maja i budzet, i ludnosc: gmina bez danych to
 * brak pomiaru, a nie zero (inaczej niz przy funduszach UE, gdzie brak projektu
 * JEST zmierzonym zerem).
 */
export function porownanieBudzetu(wojewodztwo: string, rok: number): PorownanieBudzetu | null {
  const wiersze = bezTabeli(
    () => wszystkie<{ na_osobe: number; udzial: number | null; majatkowe: number | null }>(
      `select b.dochody * 1.0 / j.osob as na_osobe,
              case when b.dochody > 0 then b.dochody_wlasne * 100.0 / b.dochody end as udzial,
              b.wydatki_majatkowe * 1.0 / j.osob as majatkowe
         from (${JEDNOSTKI_FE}) j
         join budzety_gmin b on b.teryt = j.teryt and b.rok = ?
        where j.wojewodztwo = ? and j.osob > 0 and b.dochody is not null`,
      rok, wojewodztwo,
    ),
    [],
  );
  if (!wiersze.length) return null;
  const mediana = (liczby: number[]): number => {
    const l = [...liczby].sort((a, b) => a - b);
    const s = Math.floor(l.length / 2);
    return l.length % 2 ? l[s]! : (l[s - 1]! + l[s]!) / 2;
  };
  const bezPustych = (f: (w: typeof wiersze[number]) => number | null): number[] =>
    wiersze.map(f).filter((x): x is number => x !== null);
  return {
    gmin: wiersze.length,
    dochodyNaOsobe: mediana(wiersze.map((w) => w.na_osobe)),
    udzialWlasnych: mediana(bezPustych((w) => w.udzial)),
    majatkoweNaOsobe: mediana(bezPustych((w) => w.majatkowe)),
  };
}

export type Firma = {
  nip: string;
  nazwa: string;
  /** Najwieksza POJEDYNCZA pomoc w euro — decyduje o pokazaniu nazwy osoby fizycznej. */
  max_eur: number | null;
  wielkosc: string | null;
  /** 0 mikro, 1 maly, 2 sredni, 3 inny (duzy); "b.d." gdy zrodlo nie podalo */
  wielkosc_kod: string | null;
  pkd: string | null;
  pkd_nazwa: string | null;
  teryt: string | null;
  gmina: string | null;
  gmina_rodzaj: string | null;
  przypadkow: number;
  brutto: number | null;
  pierwszy: string;
  ostatni: string;
};

export type PrzypadekFirmy = {
  dzien: string;
  brutto: number | null;
  nominalna: number | null;
  przeznaczenie: string | null;
  forma: string | null;
  udzielajacy: string | null;
  srodek: string | null;
};

/** Beneficjent pomocy publicznej po NIP — podsumowanie. */
export function firma(nip: string): Firma | null {
  return bezTabeli(
    () => jeden<Firma>(
      // Nazwa, wielkosc i PKD MUSZA pochodzic z jednego wiersza: osobne max()
      // sklejalo kod PKD z nazwa z innego przypadku (74.10 opisane jako para wodna).
      // Bierzemy najnowszy przypadek — dane sprzed lat bywaja nieaktualne.
      `with ostatni as (
         select nazwa_beneficjenta, wielkosc, wielkosc_kod, pkd, pkd_nazwa, teryt
           from pomoc_publiczna where nip_beneficjenta = ? order by dzien desc, id desc limit 1
       )
       select p.nip_beneficjenta as nip, o.nazwa_beneficjenta as nazwa, max(p.wartosc_brutto_eur) as max_eur,
              o.wielkosc as wielkosc, o.wielkosc_kod as wielkosc_kod, o.pkd as pkd, o.pkd_nazwa as pkd_nazwa,
              o.teryt as teryt, g.nazwa as gmina, g.rodzaj as gmina_rodzaj,
              count(*) as przypadkow, sum(p.wartosc_brutto) as brutto,
              min(p.dzien) as pierwszy, max(p.dzien) as ostatni
         from pomoc_publiczna p
         join ostatni o
         left join gminy g on g.teryt = o.teryt
        where p.nip_beneficjenta = ?
        group by p.nip_beneficjenta`,
      nip, nip,
    ),
    null,
  );
}

/**
 * Beneficjenci do mapy strony: NIP i nazwa, zeby mapa wzieła tylko tych,
 * ktorych nazwe wolno pokazac BEZ progu kwotowego. Osoby fizyczne odslaniane
 * progiem maja `noindex` i do mapy nie trafiaja.
 */
export function beneficjenciDoMapy(): { nip: string; nazwa: string }[] {
  return bezTabeli(
    () => wszystkie<{ nip: string; nazwa: string }>(
      `select nip_beneficjenta as nip, max(nazwa_beneficjenta) as nazwa
         from pomoc_publiczna where nip_beneficjenta is not null
        group by nip_beneficjenta`,
    ),
    [],
  );
}

/** Pojedyncze przypadki pomocy dla firmy, od najnowszych. */
export function przypadkiFirmy(nip: string, ile = 50): PrzypadekFirmy[] {
  return bezTabeli(
    () => wszystkie<PrzypadekFirmy>(
      `select dzien, wartosc_brutto as brutto, wartosc_nominalna as nominalna, przeznaczenie, forma,
              udzielajacy, srodek_nazwa as srodek
         from pomoc_publiczna where nip_beneficjenta = ?
        order by dzien desc, wartosc_brutto desc limit ?`,
      nip, ile,
    ),
    [],
  );
}

export type WierszPrzegladu = { nazwa: string; przypadkow: number; brutto: number | null };

export type PrzegladPomocy = {
  od: string;
  do: string;
  dni: number;
  /** Dni pobrane, ale jeszcze nieustalone — pominiete w sumach. */
  swiezych: number;
  przypadkow: number;
  beneficjentow: number;
  gmin: number;
  brutto: number | null;
  udzielajacy: WierszPrzegladu[];
  przeznaczenia: WierszPrzegladu[];
  formy: WierszPrzegladu[];
  wielkosc: (WierszPrzegladu & { kod: string | null })[];
  wojewodztwa: { wojewodztwo: string; przypadkow: number; brutto: number | null; osob: number | null }[];
  najwieksze: {
    nip: string | null; nazwa: string; max_eur: number | null; dzien: string; brutto: number | null;
    przeznaczenie: string | null; udzielajacy: string | null; teryt: string; gmina: string | null;
  }[];
};

/**
 * Pomoc publiczna w calym kraju — WYLACZNIE z dni pobranych dla calego kraju.
 *
 * W tej samej tabeli leza pelne 10 lat trzech gmin pokazowych. Bez filtra po
 * `pomoc_publiczna_dni` Belchatow i Zakopane doszlyby do sum krajowych ze
 * swoja cala historia i zawyzylyby je o miliardy.
 * Warszawa (146501) nie ma wiersza w tabeli gmin (sa dzielnice), wiec jej
 * wojewodztwo podajemy wprost.
 */
export function przegladPomocy(): PrzegladPomocy | null {
  return bezTabeli(() => {
    // Tylko dni ustalone: swiezy dzien ma dopiero czesc zgloszen i zanizylby
    // sumy (patrz DNI_DO_USTALENIA).
    const zakres = jeden<{ od: string | null; do: string | null; dni: number }>(
      `select min(dzien) as od, max(dzien) as do, count(*) as dni from ${DNI_USTALONE}`,
    );
    if (!zakres?.od || !zakres.do) return null;
    const swiezych = (jeden<{ c: number }>(
      `select count(*) as c from pomoc_publiczna_dni where dzien not in ${DNI_USTALONE}`,
    )?.c ?? 0);
    const Z = `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;
    const razem = jeden<{ przypadkow: number; beneficjentow: number; gmin: number; brutto: number | null }>(
      `select count(*) as przypadkow, count(distinct nip_beneficjenta) as beneficjentow,
              count(distinct teryt) as gmin, sum(wartosc_brutto) as brutto from ${Z}`,
    )!;
    const grupa = (kolumna: string, ile: number) => wszystkie<WierszPrzegladu>(
      `select ${kolumna} as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
         from ${Z} where ${kolumna} is not null group by ${kolumna} order by brutto desc nulls last limit ?`,
      ile,
    );
    const wielkosc = wszystkie<WierszPrzegladu & { kod: string | null }>(
      `select wielkosc_kod as kod, max(wielkosc) as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
         from ${Z} group by wielkosc_kod order by wielkosc_kod`,
    );
    const wojewodztwa = wszystkie<{ wojewodztwo: string; przypadkow: number; brutto: number | null; osob: number | null }>(
      `with p as (
         select case when z.teryt = '${TERYT_WARSZAWY}' then 'mazowieckie' else g.wojewodztwo end as wojewodztwo,
                z.wartosc_brutto
           from ${Z} z left join gminy g on g.teryt = z.teryt
       ),
       l as (
         select g.wojewodztwo, sum(l.osob) as osob from gminy g join ludnosc l on l.teryt = g.teryt group by g.wojewodztwo
       )
       select p.wojewodztwo as wojewodztwo, count(*) as przypadkow, sum(p.wartosc_brutto) as brutto, l.osob as osob
         from p left join l on l.wojewodztwo = p.wojewodztwo
        where p.wojewodztwo is not null
        group by p.wojewodztwo order by p.wojewodztwo`,
    );
    const najwieksze = wszystkie<PrzegladPomocy['najwieksze'][number]>(
      `select z.nip_beneficjenta as nip, z.nazwa_beneficjenta as nazwa, z.wartosc_brutto_eur as max_eur,
              z.dzien as dzien, z.wartosc_brutto as brutto, z.przeznaczenie as przeznaczenie,
              z.udzielajacy as udzielajacy, z.teryt as teryt,
              case when z.teryt = '${TERYT_WARSZAWY}' then 'Warszawa' else g.nazwa end as gmina
         from ${Z} z left join gminy g on g.teryt = z.teryt
        order by z.wartosc_brutto desc nulls last limit 15`,
    );
    return {
      od: zakres.od, do: zakres.do, dni: zakres.dni, swiezych, ...razem,
      udzielajacy: grupa('udzielajacy', 12),
      przeznaczenia: grupa('przeznaczenie', 12),
      formy: grupa('forma', 8),
      wielkosc, wojewodztwa, najwieksze,
    };
  }, null);
}

// ---------------------------------------------------------------------------
// Eksport CSV — te same zakresy i reguly co na stronie gminy
// ---------------------------------------------------------------------------

export type WierszBudzetu = RokBudzetu & { dochody_wlasne: number | null; wydatki_inwestycyjne: number | null };

export function budzetDoEksportu(teryt: string): WierszBudzetu[] {
  return bezTabeli(
    () => wszystkie<WierszBudzetu>(
      `select rok, dochody, dochody_wlasne, wydatki, wydatki_majatkowe, wydatki_inwestycyjne
         from budzety_gmin where teryt = ? order by rok`,
      teryt,
    ),
    [],
  );
}

export type ProjektDoEksportu = {
  okres: string; numer_umowy: string | null; tytul: string; beneficjent: string | null;
  program: string | null; fundusz: string | null; wartosc: number | null; dofinansowanie_ue: number | null;
  waluta: string | null; poczatek: string | null; koniec: string | null; miejsc: number;
};

/** Wszystkie projekty UE, ktore dotycza gminy — takze wielomiejscowe (kolumna `miejsc`). */
export function projektyDoEksportu(teryt: string): ProjektDoEksportu[] {
  return bezTabeli(
    () => wszystkie<ProjektDoEksportu>(
      `select distinct p.okres, p.numer_umowy, p.tytul, p.beneficjent, p.program, p.fundusz, p.wartosc,
              p.dofinansowanie_ue, p.waluta, p.poczatek, p.koniec, p.miejsc
         from fe_miejsca m join fe_projekty p on p.id = m.projekt_id
        where m.teryt = ?
        order by p.okres desc, p.dofinansowanie_ue desc`,
      teryt,
    ),
    [],
  );
}

export type PomocDoEksportu = {
  dzien: string; nip_beneficjenta: string | null; nazwa_beneficjenta: string | null;
  /** najwieksza POJEDYNCZA pomoc tego beneficjenta w euro — do progu jawnosci */
  max_eur_beneficjenta: number | null;
  wielkosc: string | null; pkd: string | null; udzielajacy: string | null; przeznaczenie: string | null;
  forma: string | null; wartosc_nominalna: number | null; wartosc_brutto: number | null; wartosc_brutto_eur: number | null;
};

/**
 * Przypadki pomocy gminy w tym samym zakresie co strona: cale pobranie gminy
 * albo — gdy go nie ma — tylko dni ustalone.
 */
export function pomocDoEksportu(teryt: string): PomocDoEksportu[] {
  return bezTabeli(() => {
    const pelna = jeden<{ c: number }>('select count(*) as c from pomoc_publiczna_pobrania where teryt = ?', teryt)?.c;
    const P = pelna ? 'pomoc_publiczna' : `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;
    return wszystkie<PomocDoEksportu>(
      `select z.dzien, z.nip_beneficjenta, z.nazwa_beneficjenta,
              (select max(x.wartosc_brutto_eur) from ${P} x where x.teryt = z.teryt and x.nip_beneficjenta = z.nip_beneficjenta) as max_eur_beneficjenta,
              z.wielkosc, z.pkd, z.udzielajacy, z.przeznaczenie, z.forma,
              z.wartosc_nominalna, z.wartosc_brutto, z.wartosc_brutto_eur
         from ${P} z where z.teryt = ?
        order by z.dzien desc, z.wartosc_brutto desc`,
      teryt,
    );
  }, []);
}

export type ProjektGminy = {
  id: number;
  okres: string;
  tytul: string;
  beneficjent: string | null;
  program: string | null;
  wartosc: number | null;
  dofinansowanie_ue: number | null;
  poczatek: string | null;
  koniec: string | null;
};

/** Najwieksze projekty realizowane WYLACZNIE w tej gminie. */
export function najwiekszeProjektyGminy(teryt: string, ile = 8): ProjektGminy[] {
  return bezTabeli(
    () => wszystkie<ProjektGminy>(
      `select distinct p.id as id, p.okres as okres, p.tytul as tytul, p.beneficjent as beneficjent,
              p.program as program, p.wartosc as wartosc, p.dofinansowanie_ue as dofinansowanie_ue,
              p.poczatek as poczatek, p.koniec as koniec
         from fe_miejsca m join fe_projekty p on p.id = m.projekt_id
        where m.teryt = ? and p.miejsc = 1 and p.waluta = 'PLN'
        order by p.dofinansowanie_ue desc
        limit ?`,
      teryt, ile,
    ),
    [],
  );
}

export type ZrodloImportu = { kiedy: string; uwagi: string | null } | null;

export function zrodloImportu(co: string): ZrodloImportu {
  return bezTabeli(() => jeden<{ kiedy: string; uwagi: string | null }>('select kiedy, uwagi from import where co = ?', co), null);
}

/**
 * Po ilu dniach od daty udzielenia pomocy uznajemy dzien za USTALONY.
 *
 * Podmioty udzielajace pomocy maja 7 dni na zgloszenie jej do UOKiK
 * (par. 6 ust. 2 rozporzadzenia RM z 7.08.2008), korekty tez 7 dni.
 * ZMIERZONE: czwartek pobrany dzien pozniej mial 200 przypadkow, czwartki
 * pobrane po 3-4 tygodniach — 5 657 i 7 850. Dajemy tydzien zapasu na
 * publikacje w SUDOP: 14 dni.
 */
export const DNI_DO_USTALENIA = 14;

/** Dni pobrane dla calego kraju, ktore juz sie ustalily (SQL). */
const DNI_USTALONE = `(select dzien from pomoc_publiczna_dni
  where julianday(substr(pobrano, 1, 10)) - julianday(dzien) >= ${DNI_DO_USTALENIA})`;

/**
 * Skad mamy dane o pomocy dla tej gminy:
 *  - 'gmina'   — pobrano cale 10 lat tej gminy,
 *  - 'dni'     — mamy tylko dni pobrane dla calego kraju (tryb przyrostowy).
 * Roznica jest dla czytelnika zasadnicza: w drugim przypadku suma NIE jest
 * suma calej pomocy w gminie, tylko z kilku dni.
 */
export type ZrodloPomocy =
  | { rodzaj: 'gmina'; od: string; pobrano: string }
  | { rodzaj: 'dni'; od: string; do: string; dni: number };

export type PomocGminy = {
  zrodlo: ZrodloPomocy | null;
  pobranie: { od: string; pobrano: string; wierszy: number } | null;
  razem: { przypadkow: number; beneficjentow: number; brutto: number | null; pierwszy: string; ostatni: string } | null;
  /** WSZYSCY beneficjenci (nazwa + najwieksza pojedyncza pomoc) — do policzenia, ilu nie pokazujemy z nazwy. */
  nazwyBeneficjentow: { nazwa: string; max_eur: number | null }[];
  lata: { rok: string; przypadkow: number; brutto: number | null }[];
  przeznaczenia: { nazwa: string; przypadkow: number; brutto: number | null }[];
  udzielajacy: { nazwa: string; przypadkow: number; brutto: number | null }[];
  /** `max_eur` to NAJWIEKSZA POJEDYNCZA pomoc — do progu jawnosci nazwiska. */
  beneficjenci: { nazwa: string; nip: string | null; przypadkow: number; brutto: number | null; max_eur: number | null }[];
};

/** Pomoc publiczna z SUDOP dla beneficjentow z siedziba w gminie. */
export function pomocGminy(teryt: string): PomocGminy {
  const pusto: PomocGminy = { zrodlo: null, pobranie: null, razem: null, nazwyBeneficjentow: [], lata: [], przeznaczenia: [], udzielajacy: [], beneficjenci: [] };
  return bezTabeli(() => {
    const pobranie = jeden<{ od: string; pobrano: string; wierszy: number }>(
      'select od, pobrano, wierszy from pomoc_publiczna_pobrania where teryt = ?', teryt,
    );
    // Bez pelnego pobrania gminy zostaja dni pobrane dla calego kraju —
    // pokazujemy je, ale mowimy wprost, ze to nie jest cala historia.
    // Swieze dni sa niepelne (urzedy zglaszaja pomoc do 7 dni po fakcie),
    // wiec w trybie dni liczymy tylko dni ustalone — patrz DNI_DO_USTALENIA.
    const dni = pobranie ? null : bezTabeli(
      () => jeden<{ od: string; do: string; dni: number }>(
        `select min(dzien) as od, max(dzien) as do, count(*) as dni from ${DNI_USTALONE}`,
      ),
      null,
    );
    // Pelne pobranie gminy obejmuje wszystkie jej wiersze; tryb dni — tylko
    // dni ustalone. Jedna podkwerenda zamiast warunku w kazdym zapytaniu.
    const P = pobranie ? 'pomoc_publiczna' : `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;
    const maWiersze = !pobranie && dni?.dni
      ? (jeden<{ c: number }>(`select count(*) as c from ${P} where teryt = ?`, teryt)?.c ?? 0) > 0
      : false;
    if (!pobranie && !maWiersze) return pusto;
    const zrodlo: ZrodloPomocy = pobranie
      ? { rodzaj: 'gmina', od: pobranie.od, pobrano: pobranie.pobrano }
      : { rodzaj: 'dni', od: dni!.od, do: dni!.do, dni: dni!.dni };
    const razem = jeden<{ przypadkow: number; beneficjentow: number; brutto: number | null; pierwszy: string; ostatni: string }>(
      `select count(*) as przypadkow, count(distinct nip_beneficjenta) as beneficjentow, sum(wartosc_brutto) as brutto,
              min(dzien) as pierwszy, max(dzien) as ostatni
         from ${P} where teryt = ?`, teryt,
    );
    const nazwyBeneficjentow = wszystkie<{ nazwa: string | null; max_eur: number | null }>(
      `select max(nazwa_beneficjenta) as nazwa, max(wartosc_brutto_eur) as max_eur
         from ${P} where teryt = ? group by nip_beneficjenta`, teryt,
    ).map((r) => ({ nazwa: r.nazwa ?? '', max_eur: r.max_eur }));
    const lata = wszystkie<{ rok: string; przypadkow: number; brutto: number | null }>(
      `select substr(dzien, 1, 4) as rok, count(*) as przypadkow, sum(wartosc_brutto) as brutto
         from ${P} where teryt = ? group by rok order by rok`, teryt,
    );
    const grupa = (kolumna: 'przeznaczenie' | 'udzielajacy') => wszystkie<{ nazwa: string; przypadkow: number; brutto: number | null }>(
      `select coalesce(${kolumna}, '(brak w rejestrze)') as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
         from ${P} where teryt = ? group by nazwa order by brutto desc nulls last limit 6`, teryt,
    );
    // Beneficjentow bierzemy szerzej niz pokazujemy — filtr nazw osob
    // prywatnych dziala dopiero w widoku i czesc wierszy odpadnie.
    const beneficjenci = wszystkie<{ nazwa: string; nip: string | null; przypadkow: number; brutto: number | null; max_eur: number | null }>(
      `select max(nazwa_beneficjenta) as nazwa, nip_beneficjenta as nip, count(*) as przypadkow, sum(wartosc_brutto) as brutto,
              max(wartosc_brutto_eur) as max_eur
         from ${P} where teryt = ? group by nip_beneficjenta order by brutto desc nulls last limit 60`, teryt,
    );
    return { zrodlo, pobranie, razem, nazwyBeneficjentow, lata, przeznaczenia: grupa('przeznaczenie'), udzielajacy: grupa('udzielajacy'), beneficjenci };
  }, pusto);
}
