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
