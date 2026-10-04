import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { KLUBY, type Klub } from './kluby';
import { uprosc, zapytanieFts } from './tekst';
import { porownajZKlubem, type GlosZKlubem, type PorownanieZKlubem } from './niezaleznosc';
import { nazwaDoPokazania, nazwaPodmiotuJawna } from './prywatnosc';
import { kategoriaFormy, type KategoriaPomocy } from './formy-pomocy';
import { nazwaOrganu, organWykonawczyGminy } from './organy';
import { nazwaDzialu } from './dzialy';
import { PROG_PODEJRZANEJ_KWOTY } from './zamowienia';
import { KONTAKT } from './adres';
import { zwinDoPowiatow, type LudnoscGminy, type WartoscNaMapie } from './mapa';
import {
  DNI_USTALONE, KLUCZ_FIRM_DO_MAPY, KLUCZ_MAPY_POMOCY, KLUCZ_PRZEGLADU, podpisDni, policzMapePomocy,
  policzPrzeglad, type Czytnik, type PrzegladPomocy,
} from './przeglad';

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

/** To samo polaczenie, w ksztalcie, ktorego oczekuje `przeglad.ts`. */
const czytnik: Czytnik = { wszystkie, jeden };

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
export type ObecnoscPosla = {
  /** Dni obrad, ktore rejestr w ogole zapisal dla tego posla. */
  dni: number;
  /** Dni, w ktorych opuscil choc jedno glosowanie. */
  dniZNieobecnoscia: number;
  /** Z nich: dni, ktore rejestr oznaczyl jako usprawiedliwione. */
  dniUsprawiedliwione: number;
};

/**
 * Obecnosc posla w dniach obrad — z `/MP/{id}/votings/stats`.
 *
 * Liczymy DNI, nie glosowania, i to nie jest wybor estetyczny: znacznik
 * `absenceExcuse` dotyczy calego dnia obrad, wiec przeliczanie go na
 * pojedyncze glosowania bylo by naszym wymyslem, nie trescia rejestru.
 *
 * Nie mieszamy tez tej liczby z naszym licznikiem nieobecnosci przy
 * glosowaniach. ZMIERZONE 28.09.2026: ten sam rejestr podaje w `/votings`
 * inna liczbe glosowan danego dnia niz w statystyce posla — na 162 dniach
 * obrad zgadza sie 102, a w 60 statystyka podaje MNIEJ (raz az o 105).
 * Kazda z tych liczb jest wiec prawdziwa w swoim zrodle i tak je pokazujemy:
 * glosowania po naszemu, dni po rejestrowemu.
 */
export function obecnoscPosla(id: number): ObecnoscPosla | null {
  return bezTabeli(
    () => jeden<ObecnoscPosla>(
      `select count(*) as dni,
              sum(case when opuscil > 0 then 1 else 0 end) as dniZNieobecnoscia,
              sum(case when opuscil > 0 and usprawiedliwiony = 1 then 1 else 0 end) as dniUsprawiedliwione
         from obecnosc where posel_id = ?`,
      id,
    ),
    null,
  );
}

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
  ustawy: ProcesSkrot[];
  ustawWszystkich: number;
  poslowie: PoselSkrot[];
  gminy: GminaWWyszukiwaniu[];
  glosowania: GlosowanieSkrot[];
  glosowanWszystkich: number;
  firmy: FirmaSkrot[];
};

/**
 * Jedno pole na wszystko: posel, gmina (-> okreg) i glosowanie.
 *
 * Posłow i gminy porownujemy po tekscie bez ogonkow, bo na polskiej
 * klawiaturze ogonek to dodatkowy klawisz i ludzie go pomijaja. Glosowania
 * ida przez FTS5 — patrz uwagi w tekst.ts o odmianie i o literze "ł".
 */
export function szukaj(fraza: string, ileGlosowan = 8): WynikiWyszukiwania {
  const pusty: WynikiWyszukiwania = { fraza, poslowie: [], gminy: [], glosowania: [], glosowanWszystkich: 0, firmy: [], ustawy: [], ustawWszystkich: 0 };
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

  const gminy: GminaWWyszukiwaniu[] = bezTabeli(
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

  // Warszawy nie ma w tabeli gmin (sa 18 dzielnic), a to jej ludzie szukaja
  // najczesciej. Dokladamy ja z przodu, gdy fraza pasuje do nazwy miasta.
  if ('warszawa'.startsWith(q) || q.startsWith('warszaw')) {
    const w = warszawaJakoGmina();
    if (w && !gminy.some((g) => g.teryt === TERYT_WARSZAWY)) {
      gminy.unshift({
        teryt: w.teryt, nazwa: w.nazwa, rodzaj: w.rodzaj, powiat: w.powiat,
        wojewodztwo: w.wojewodztwo, okreg_nr: w.okreg_nr, uprawnionych: w.uprawnionych,
        okreg_nazwa: w.okreg_nazwa,
      });
      gminy.length = Math.min(gminy.length, 8);
    }
  }

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

  // Ustawy szukamy tym samym trygramem co glosowan — po druku i po tytule.
  let ustawy: ProcesSkrot[] = [];
  let ustawWszystkich = 0;
  if (fts) {
    ustawy = bezTabeli(
      () => wszystkie<ProcesSkrot>(
        `select ${KOLUMNY_PROCESU} from procesy_szukaj f
           join procesy p on p.numer = f.numer
          where procesy_szukaj match ?
          order by coalesce(p.data_wplyniecia, '') desc limit 6`,
        fts,
      ),
      [],
    );
    ustawWszystkich = bezTabeli(
      () => jeden<{ c: number }>('select count(*) as c from procesy_szukaj where procesy_szukaj match ?', fts)?.c ?? 0,
      0,
    );
  }
  // Numer druku tez jest kluczem: „druk 30" i „30" maja trafiac w proces.
  const numer = fraza.trim().replace(/^druk\s*(nr)?\s*/i, '');
  if (/^\d{1,4}$/.test(numer) && !ustawy.some((u) => u.numer === numer)) {
    const p = proces(numer);
    if (p) { ustawy.unshift(p); ustawWszystkich++; }
  }

  return { fraza, poslowie, gminy, glosowania, glosowanWszystkich, firmy: szukajFirm(fraza), ustawy, ustawWszystkich };
}

export type FirmaSkrot = {
  nip: string;
  /** Typ z REGON ('P'/'F'/…), gdy go mamy — rozstrzyga o pokazaniu nazwy. */
  typ_regon?: string | null;
  /** Nazwa GOTOWA do pokazania — przepuszczona przez regule prywatnosci. */
  nazwa: string;
  przypadkow: number;
  brutto: number | null;
  max_eur: number | null;
  teryt: string | null;
  gmina: string | null;
};

/**
 * Firmy w wyszukiwarce: po NIP dokladnie, po nazwie po kawalku.
 *
 * Oddajemy WYLACZNIE te, ktore wolno pokazac (`nazwaDoPokazania`), i to
 * w obu drogach — takze po NIP. Dwa powody, oba sprawdzone na zywej stronie:
 * 1. wynik wyszukiwania nie moze mowic wiecej niz strona, do ktorej prowadzi,
 *    a `/firma/[nip]` dla mozliwej osoby fizycznej ODDAJE 404 (nie robimy
 *    strony o osobie prywatnej),
 * 2. samo trafienie po nazwisku mowiloby, ze osoba o tym nazwisku dostala
 *    pomoc — to ta sama zasada, ktora trzyma nazwiska osob prywatnych poza
 *    indeksem glosowan (regula 7 w CLAUDE.md).
 * Kwoty tych podmiotow zostaja w sumach gminy i w liczbie beneficjentow —
 * pomijamy nazwe, nie pieniadze.
 */
export function szukajFirm(fraza: string, ile = 6): FirmaSkrot[] {
  const q = uprosc(fraza.trim());
  if (q.length < 3 || !bazaDostepna()) return [];
  const cyfry = fraza.replace(/\D/g, '');
  const progAktywny = Boolean(KONTAKT);

  const kolumny = `f.nip as nip, f.nazwa as nazwa, f.przypadkow as przypadkow, f.brutto as brutto,
                   f.max_eur as max_eur, f.teryt as teryt, g.nazwa as gmina, r.typ as typ_regon`;
  // Ta sama regula, co na stronie firmy. Wynik wyszukiwania nie moze mowic
  // wiecej niz strona, do ktorej prowadzi.
  const wolnoPokazac = (w: FirmaSkrot) =>
    !nazwaDoPokazania(w.nazwa, { pomocEur: w.max_eur, progAktywny, typRegon: w.typ_regon }).pominieta;

  if (cyfry.length === 10) {
    return bezTabeli(
      () => wszystkie<FirmaSkrot>(
        `select ${kolumny} from firmy_szukaj f
           left join gminy g on g.teryt = f.teryt
           left join regon r on r.nip = f.nip
          where f.nip = ?`,
        cyfry,
      ).filter(wolnoPokazac),
      [],
    );
  }

  // Bierzemy z zapasem, bo czesc nazw odpadnie na regule prywatnosci.
  const kandydaci = bezTabeli(
    () => wszystkie<FirmaSkrot>(
      `select ${kolumny} from firmy_szukaj f
         left join gminy g on g.teryt = f.teryt
         left join regon r on r.nip = f.nip
        where instr(f.szukaj, ?) > 0
        order by (f.szukaj = ?) desc, f.brutto desc nulls last
        limit ?`,
      q, q, ile * 8,
    ),
    [],
  );
  return kandydaci.filter(wolnoPokazac).slice(0, ile);
}

// ---------------------------------------------------------------------------
// Gmina: ludnosc, fundusze UE, pomoc publiczna
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mapa gmin
// ---------------------------------------------------------------------------

export type MiaraMapy = 'dochody' | 'unia' | 'pomoc';

export type { WartoscNaMapie } from './mapa';

/**
 * Wartosci do mapy: jedna liczba na gmine, ZAWSZE na mieszkanca.
 *
 * Gmina, dla ktorej nie mamy danych, NIE dostaje zera — nie ma jej w wyniku
 * i na mapie zostaje szara (regula 4). Warszawa jest w granicach PRG jedna
 * jednostka 146501, a ludnosc mamy po dzielnicach — stad `ludnoscWarszawy`.
 */
export function wartosciMapy(miara: MiaraMapy): WartoscNaMapie[] {
  return bezTabeli(() => {
    const warszawa = ludnoscWarszawy();
    const ludnoscCTE = `ludzie as (
      select teryt, osob from ludnosc
      union all select '${TERYT_WARSZAWY}', ${warszawa ?? 0}
    )`;
    if (miara === 'dochody') {
      return wszystkie<WartoscNaMapie>(
        `with ${ludnoscCTE}
         select b.teryt as teryt, b.dochody * 1.0 / l.osob as wartosc
           from budzety_gmin b join ludzie l on l.teryt = b.teryt
          where b.rok = (select max(rok) from budzety_gmin) and b.dochody is not null and l.osob > 0`,
      );
    }
    if (miara === 'unia') {
      /*
       * `coalesce(..., 0)`, bo tu zero jest ZMIERZONE, a nie brakujace.
       * Sprawdzone 01.10.2026: ze 133 gmin bez wartosci ANI JEDNA nie ma
       * projektu tylko u siebie — 128 ma wiersz z zerem, 4 nie maja wiersza,
       * bo nie maja projektow. Legenda mowila o nich „brak danych", a one
       * wypadaly z kwantyli i przez to CALA skala byla o 28 % za wysoko
       * (dolny prog 359,78 zl zamiast 281,01 zl). Mediana liczyla je jako
       * zero od poczatku (`medianaUeNaMieszkanca`) — mapa i mediana mowily
       * wiec o innej populacji tego samego zjawiska.
       *
       * UWAGA: w tym szablonie nie wolno uzywac odwrotnych apostrofow —
       * koncza go i TypeScript przestaje sie kompilowac.
       */
      return wszystkie<WartoscNaMapie>(
        `with ${ludnoscCTE}
         select f.teryt as teryt, coalesce(f.tylko_tu_ue, 0) * 1.0 / l.osob as wartosc
           from fe_gminy f join ludzie l on l.teryt = f.teryt
          where f.okres = '2021-2027' and l.osob > 0`,
      );
    }
    // Pomoc publiczna: gotowy wynik z importu. `/mapa` jest trasa DYNAMICZNA,
    // wiec liczenie tutaj placilby kazdy czytelnik — 508 ms przy 168 tys.
    // wierszy i ponad minute przy pelnej historii. Bez agregatu liczymy
    // na miejscu, zeby mapa dzialala takze na swiezej bazie.
    const zapisana = bezTabeli(
      () => jeden<{ wartosc: string }>('select wartosc from agregaty where klucz = ?', KLUCZ_MAPY_POMOCY),
      null,
    );
    if (zapisana) return JSON.parse(zapisana.wartosc) as WartoscNaMapie[];
    return policzMapePomocy(czytnik, TERYT_WARSZAWY);
  }, []);
}

/**
 * Ludnosc gmin — mianownik zwijania mapy do powiatow.
 *
 * Warszawa jak wszedzie indziej: 18 dzielnic skladamy w jedna jednostke
 * `146501`, bo tak wyglada w granicach PRG i tak liczy ja `wartosciMapy`
 * (pulapka 24).
 */
export function ludnoscGmin(): LudnoscGminy[] {
  return bezTabeli(
    () => wszystkie<LudnoscGminy>(
      `select l.teryt as teryt, l.osob as osob
         from ludnosc l join gminy g on g.teryt = l.teryt
        where g.rodzaj <> 'dzielnica Warszawy'
       union all
       select '${TERYT_WARSZAWY}', sum(l.osob)
         from ludnosc l join gminy g on g.teryt = l.teryt
        where g.rodzaj = 'dzielnica Warszawy'
       having count(*) > 0`,
    ),
    [],
  );
}

/**
 * Nazwy powiatow po czterech pierwszych cyfrach TERYT-u, w pisowni PKW.
 *
 * Powiat ziemski ma nazwe przymiotnikowa mala litera („bolesławiecki"),
 * miasto na prawach powiatu — wlasna („Wrocław"). Tej roznicy nie da sie
 * wyczytac z kodu, a na mapie trzeba napisac „powiat bolesławiecki", ale
 * samo „Wrocław"; dlatego oddajemy nazwe surowa i decyzje zostawiamy
 * stronie. PRG zna te same 380 kodow (kontrola w `granice-gmin.mjs`).
 */
export function nazwyPowiatow(): Map<string, string> {
  return bezTabeli(() => {
    const m = new Map<string, string>();
    for (const r of wszystkie<{ kod: string; powiat: string }>(
      `select substr(teryt, 1, 4) as kod, min(powiat) as powiat
         from gminy where rodzaj <> 'dzielnica Warszawy' group by 1`,
    )) m.set(r.kod, r.powiat);
    m.set(TERYT_WARSZAWY.slice(0, 4), 'Warszawa');
    return m;
  }, new Map<string, string>());
}

/**
 * To samo, co `wartosciMapy`, ale na poziomie powiatu.
 *
 * Skladane z wartosci gmin, a nie liczone osobnym SQL-em: pomoc publiczna
 * przychodzi z gotowego agregatu (pulapka 52), wiec drugie zapytanie po
 * calej tabeli oznaczaloby albo minuty na kazde wejscie, albo trzeci klucz
 * w `agregaty`. Zwijanie jest czysta funkcja z testem — `zwinDoPowiatow`.
 */
export function wartosciMapyPowiatow(miara: MiaraMapy): WartoscNaMapie[] {
  return zwinDoPowiatow(wartosciMapy(miara), ludnoscGmin());
}

// ---------------------------------------------------------------------------
// Interpelacje poselskie
// ---------------------------------------------------------------------------

export type Interpelacja = {
  numer: number;
  tytul: string;
  data_wplywu: string;
  adresaci: string | null;
  odpowiedzi: number;
  adres: string | null;
  /** Ilu poslow ja podpisalo — bez tego „interpelacja posla X" bywa nieprawda. */
  autorow: number;
};

export type InterpelacjePosla = {
  /** Ile zlozyl (albo wspolpodpisal) — licznik. */
  ile: number;
  /** Ile z nich nie ma jeszcze odpowiedzi w rejestrze. */
  bezOdpowiedzi: number;
  /** Ile zlozono w CZASIE JEGO MANDATU — mianownik (regula 3). */
  wKadencji: number;
  /** Okno mandatu, z ktorego policzono mianownik — do pokazania przy liczbie. */
  od: string | null;
  do: string | null;
  /** Czy okno jest wezsze niz cala kadencja (zastepca albo wygasly mandat). */
  wezszeNizKadencja: boolean;
  ostatnie: Interpelacja[];
};

/**
 * Interpelacje jednego posla.
 *
 * Wspolautorstwo liczymy tak samo jak autorstwo — rejestr ich nie rozroznia,
 * a 4 138 z 20 145 interpelacji ma wiecej niz jednego autora. Przy kazdej
 * pozycja mowi, ilu poslow ja podpisalo, zeby nie sugerowac, ze byl sam.
 *
 * `odpowiedzi = 0` to fakt o ADRESACIE, nie o posle — nie komentujemy go.
 */
export type RodzajPytan = 'interpelacje' | 'zapytania';

/** Interpelacje jednego posla — zachowane dla dotychczasowych wywolan. */
export const interpelacjePosla = (id: number, ile = 5) => pytaniaPosla('interpelacje', id, ile);

/**
 * Interpelacje albo zapytania poselskie jednego posla. Obie maja w rejestrze
 * te sama budowe (zmierzone 03.10.2026), wiec jedna funkcja; nazwa tabeli
 * pochodzi z typu `RodzajPytan`, nigdy z wejscia czytelnika.
 */
export function pytaniaPosla(t: RodzajPytan, id: number, ile = 5): InterpelacjePosla {
  return bezTabeli(() => {
    const licznik = jeden<{ ile: number; bez: number }>(
      `select count(*) as ile, sum(case when i.odpowiedzi = 0 then 1 else 0 end) as bez
         from ${t}_autorzy a join ${t} i on i.numer = a.numer
        where a.posel_id = ?`,
      id,
    );
    /*
     * MIANOWNIK Z OKNA MANDATU, nie z calej kadencji. B10 z przegladu
     * 01.10.2026: licznik obejmowal czas poslowania, a mianownik cala
     * kadencje — wiec posel, ktory wszedl na ostatnie poltora roku, byl
     * porownywany z czteroletnim dorobkiem izby.
     *
     * Okno bierzemy Z REJESTRU, nie z domyslu. `obecnosc` to dni poselskie
     * z `/MP/{id}/votings/stats`: kto nie byl jeszcze poslem, nie ma tam
     * wiersza. ZMIERZONE 01.10.2026: wszystkich 499 poslow ma wiersze,
     * a pierwszy dzien obrad siega od 2023-11-13 (poczatek kadencji) az do
     * 2026-05-15 — czyli rejestr sam pokazuje, kto doszedl w trakcie.
     * Gorna granice bierzemy z `data_wygasniecia`, gdy jest; inaczej okno
     * jest otwarte do dzis.
     */
    const okno = jeden<{ od: string | null; wygaslo: string | null }>(
      `select (select min(dzien) from obecnosc where posel_id = p.id) as od,
              p.data_wygasniecia as wygaslo
         from poslowie p where p.id = ?`,
      id,
    );
    const od = okno?.od ?? null;
    const doKiedy = okno?.wygaslo ?? null;
    const wKadencji = jeden<{ c: number }>(
      `select count(*) as c from ${t}
        where (? is null or data_wplywu >= ?) and (? is null or data_wplywu <= ?)`,
      od, od, doKiedy, doKiedy,
    )?.c ?? 0;
    const wszystkich = jeden<{ c: number }>(`select count(*) as c from ${t}`)?.c ?? 0;
    const ostatnie = wszystkie<Interpelacja>(
      `select i.numer as numer, i.tytul as tytul, i.data_wplywu as data_wplywu,
              i.adresaci as adresaci, i.odpowiedzi as odpowiedzi, i.adres as adres,
              (select count(*) from ${t}_autorzy b where b.numer = i.numer) as autorow
         from ${t}_autorzy a join ${t} i on i.numer = a.numer
        where a.posel_id = ?
        order by i.data_wplywu desc, i.numer desc limit ?`,
      id, ile,
    );
    return {
      ile: licznik?.ile ?? 0,
      bezOdpowiedzi: licznik?.bez ?? 0,
      wKadencji,
      od,
      do: doKiedy,
      wezszeNizKadencja: wKadencji < wszystkich,
      ostatnie,
    };
  }, { ile: 0, bezOdpowiedzi: 0, wKadencji: 0, od: null, do: null, wezszeNizKadencja: false, ostatnie: [] });
}

// ---------------------------------------------------------------------------
// Zamowienia publiczne z TED
// ---------------------------------------------------------------------------

export type ZamowienieTed = {
  numer: string;
  data: string;
  tytul: string | null;
  nabywca: string | null;
  wartosc: number | null;
  waluta: string | null;
  cpv: string | null;
  /** Ilu wykonawcow ma cale ogloszenie — kwota dotyczy ich wszystkich razem. */
  wykonawcow: number;
};

export type ZamowieniaGminy = {
  ogloszen: number;
  suma: number | null;
  /** Ile ogloszen nie ma kwoty w zlotych — mianownik dla sumy. */
  bezKwoty: number;
  /** Ile ogloszen NAPRAWDE weszlo do `suma` — mianownik dla tej kwoty (B12). */
  wSumie: number;
  /** Ogloszenia z kwota ponad progiem — pokazywane osobno, nie w sumie. */
  podejrzane: ZamowienieTed[];
  najwieksze: ZamowienieTed[];
};

/**
 * Zamowienia publiczne udzielone przez podmioty z siedziba w gminie.
 *
 * Nabywce wiazemy z gmina przez REGON (tabela `regon`), bo TED podaje przy
 * ogloszeniu tylko NIP zamawiajacego. Tu kwota jest uczciwa inaczej niz na
 * stronie firmy: ogloszenie ma JEDNEGO zamawiajacego, wiec jego wartosc to
 * wydatek tego zamawiajacego — niezaleznie od tego, ilu bylo wykonawcow.
 *
 * To NIE sa wydatki samej gminy jako urzedu: zamawiajacym bywa szpital,
 * spolka komunalna czy uczelnia z tej gminy. Strona musi to mowic wprost.
 */
export function zamowieniaGminy(teryt: string, ile = 8): ZamowieniaGminy {
  return bezTabeli(() => {
    // Kwoty ponad progiem nie wchodza do sumy — patrz src/lib/zamowienia.ts.
    /*
     * `wSumie` liczy DOKLADNIE te ogloszenia, ktore weszly do `suma`.
     * B12 z przegladu 01.10.2026: strona pisala „z N ogloszen", gdzie
     * N = ogloszen - bezKwoty, a to wciaz obejmuje ogloszenia z kwota
     * odrzucona jako bledna (powyzej PROG_PODEJRZANEJ_KWOTY), ktorych
     * w sumie nie ma. Mianownik musi byc licznoscia tego samego zbioru,
     * z ktorego policzono licznik (regula 3).
     */
    const sumy = jeden<{ ogloszen: number; suma: number | null; bezKwoty: number; wSumie: number }>(
      `select count(*) as ogloszen,
              sum(case when o.waluta = 'PLN' and o.wartosc <= ${PROG_PODEJRZANEJ_KWOTY} then o.wartosc end) as suma,
              sum(case when o.wartosc is null or o.waluta <> 'PLN' then 1 else 0 end) as bezKwoty,
              sum(case when o.waluta = 'PLN' and o.wartosc is not null
                        and o.wartosc <= ${PROG_PODEJRZANEJ_KWOTY} then 1 else 0 end) as wSumie
         from ted_ogloszenia o join regon r on r.nip = o.nabywca_id
        where r.teryt = ?`,
      teryt,
    );
    const podejrzane = wszystkie<ZamowienieTed>(
      `select o.numer, o.data, o.tytul, o.nabywca, o.wartosc, o.waluta, o.cpv, o.wykonawcow
         from ted_ogloszenia o join regon r on r.nip = o.nabywca_id
        where r.teryt = ? and o.waluta = 'PLN' and o.wartosc > ${PROG_PODEJRZANEJ_KWOTY}
        order by o.wartosc desc`,
      teryt,
    );
    const najwieksze = wszystkie<ZamowienieTed>(
      `select o.numer, o.data, o.tytul, o.nabywca, o.wartosc, o.waluta, o.cpv, o.wykonawcow
         from ted_ogloszenia o join regon r on r.nip = o.nabywca_id
        where r.teryt = ? and o.waluta = 'PLN' and o.wartosc <= ${PROG_PODEJRZANEJ_KWOTY}
        order by o.wartosc desc nulls last limit ?`,
      teryt, ile,
    );
    return {
      ogloszen: sumy?.ogloszen ?? 0,
      suma: sumy?.suma ?? null,
      bezKwoty: sumy?.bezKwoty ?? 0,
      wSumie: sumy?.wSumie ?? 0,
      podejrzane,
      najwieksze,
    };
  }, { ogloszen: 0, suma: null, bezKwoty: 0, wSumie: 0, podejrzane: [], najwieksze: [] });
}

export type ZamowieniaFirmy = {
  ogloszen: number;
  /** Suma wartosci ogloszen w PLN, w ktorych firma byla JEDYNYM wykonawca. */
  sumaSama: number | null;
  ogloszenSama: number;
  /** Ile z nich NAPRAWDE weszlo do `sumaSama` — mianownik dla tej kwoty. */
  ogloszenWSumie: number;
  /** Ogloszen, w ktorych wykonawcow bylo wiecej — kwoty nie da sie przypisac. */
  ogloszenZInnymi: number;
  lista: ZamowienieTed[];
};

/**
 * Zamowienia publiczne firmy (TED).
 *
 * Kwota z TED dotyczy CALEGO ogloszenia: wszystkich czesci i wszystkich
 * wykonawcow. Dlatego sumujemy TYLKO ogloszenia z jednym wykonawca, a reszte
 * pokazujemy osobno i bez sumy. Inaczej firma, ktora dostala jedna z dziesieciu
 * czesci, mialaby przy nazwisku wartosc calego przetargu.
 */
export function zamowieniaFirmy(nip: string, ile = 12): ZamowieniaFirmy {
  return bezTabeli(() => {
    const lista = wszystkie<ZamowienieTed>(
      `select o.numer, o.data, o.tytul, o.nabywca, o.wartosc, o.waluta, o.cpv, o.wykonawcow
         from ted_wykonawcy w join ted_ogloszenia o on o.numer = w.numer
        where w.nip = ? order by o.data desc limit ?`,
      nip, ile,
    );
    /*
     * `wsumie` to licznosc zbioru, z ktorego policzono `suma` — nie to samo
     * co `sama`. B11 z przegladu 01.10.2026: etykieta mowila „z N ogloszen
     * z jednym wykonawca", a `suma` pomija z nich te bez kwoty, w innej
     * walucie i z kwota odrzucona jako bledna (pulapka 47). Mianownik byl
     * wiec wiekszy od zbioru, ktory zsumowano.
     */
    const sumy = jeden<{ ogloszen: number; sama: number; suma: number | null; zinnymi: number; wsumie: number }>(
      `select count(*) as ogloszen,
              sum(case when o.wykonawcow = 1 then 1 else 0 end) as sama,
              sum(case when o.wykonawcow = 1 and o.waluta = 'PLN'
                        and o.wartosc <= ${PROG_PODEJRZANEJ_KWOTY} then o.wartosc end) as suma,
              sum(case when o.wykonawcow = 1 and o.waluta = 'PLN' and o.wartosc is not null
                        and o.wartosc <= ${PROG_PODEJRZANEJ_KWOTY} then 1 else 0 end) as wsumie,
              sum(case when o.wykonawcow > 1 then 1 else 0 end) as zinnymi
         from ted_wykonawcy w join ted_ogloszenia o on o.numer = w.numer
        where w.nip = ?`,
      nip,
    );
    return {
      ogloszen: sumy?.ogloszen ?? 0,
      sumaSama: sumy?.suma ?? null,
      ogloszenSama: sumy?.sama ?? 0,
      ogloszenWSumie: sumy?.wsumie ?? 0,
      ogloszenZInnymi: sumy?.zinnymi ?? 0,
      lista,
    };
  }, { ogloszen: 0, sumaSama: null, ogloszenSama: 0, ogloszenWSumie: 0, ogloszenZInnymi: 0, lista: [] });
}

// ---------------------------------------------------------------------------
// Proces legislacyjny: co sie stalo z projektem
// ---------------------------------------------------------------------------

export type ProcesSkrot = {
  numer: string;
  tytul: string;
  rodzaj: string | null;
  uchwalony: number | null;
  data_wplyniecia: string | null;
  data_zakonczenia: string | null;
  eli: string | null;
  adres_publikacji: string | null;
  /**
   * Streszczenie projektu NAPISANE PRZEZ REJESTR (pole `description`
   * w /sejm/term10/processes/{nr}), nie przez nas.
   *
   * ZMIERZONE 03.10.2026: wypelnione dla 943 z 956 projektow ustaw (98,6%),
   * srednio 329 znakow, 952 z 954 zaczyna sie od slow „projekt dotyczy".
   * Lezalo w bazie od 23.09 i bylo INDEKSOWANE do wyszukiwarki (`import.ts`,
   * `procesy_szukaj` sklada tytul + opis) — czyli po tym tekscie dalo sie
   * u nas szukac, ale nie dalo sie go przeczytac. Nie bylo go w tej liscie
   * kolumn, wiec nie dochodzil do zadnej strony.
   *
   * `null` dla 240 z 251 projektow uchwal, 138 wnioskow i 100 informacji
   * rzadowych — tam sekcja ma sie NIE POJAWIAC, a nie pojawiac sie pusta
   * (zasada 4).
   */
  opis: string | null;
  /** Nazwa etapu koncowego z rejestru: "Uchwalono", "Odrzucono", "Wycofano". */
  koniec: string | null;
  ostatni_etap: string | null;
  ostatnia_data: string | null;
};

const KOLUMNY_PROCESU = `p.numer as numer, p.tytul as tytul, p.rodzaj as rodzaj, p.uchwalony as uchwalony,
  p.data_wplyniecia as data_wplyniecia, p.data_zakonczenia as data_zakonczenia, p.eli as eli,
  p.adres_publikacji as adres_publikacji, p.opis as opis,
  (select e.nazwa from etapy_procesow e where e.proces = p.numer and e.typ = 'End' limit 1) as koniec,
  (select e.nazwa from etapy_procesow e where e.proces = p.numer
    order by e.kolejnosc desc limit 1) as ostatni_etap,
  (select max(e.data) from etapy_procesow e where e.proces = p.numer) as ostatnia_data`;

/** Warunek SQL dla stanu procesu — jedno miejsce dla listy i dla licznikow. */
function warunekStanu(stan: string): string {
  if (stan === 'uchwalone') return "and exists (select 1 from etapy_procesow e where e.proces = p.numer and e.typ = 'End' and e.nazwa = 'Uchwalono')";
  if (stan === 'zakonczone-inaczej') return "and exists (select 1 from etapy_procesow e where e.proces = p.numer and e.typ = 'End' and e.nazwa <> 'Uchwalono')";
  if (stan === 'w-toku') return "and not exists (select 1 from etapy_procesow e where e.proces = p.numer and e.typ = 'End')";
  return '';
}

export function liczbaProcesow(rodzaj = 'projekt ustawy', stan = ''): number {
  return bezTabeli(
    () => jeden<{ c: number }>(
      `select count(*) as c from procesy p where p.rodzaj = ? ${warunekStanu(stan)}`, rodzaj,
    )?.c ?? 0,
    0,
  );
}

/** Strona listy procesow — najnowsze u gory, bo o nich sie rozmawia. */
export function stronaProcesow(od: number, ile: number, rodzaj = 'projekt ustawy', stan = ''): ProcesSkrot[] {
  return bezTabeli(
    () => wszystkie<ProcesSkrot>(
      `select ${KOLUMNY_PROCESU} from procesy p
        where p.rodzaj = ? ${warunekStanu(stan)}
        order by coalesce(p.data_wplyniecia, '') desc, cast(p.numer as integer) desc
        limit ? offset ?`,
      rodzaj, ile, od,
    ),
    [],
  );
}

export type Streszczenie = { tekst: string; model: string; przygotowano: string };

/**
 * Streszczenie „po ludzku" — osobnym zapytaniem, NIE kolumna w
 * KOLUMNY_PROCESU: gdyby tabeli jeszcze nie bylo, `bezTabeli` oddalby
 * pusty wynik dla calej listy ustaw, a nie tylko dla streszczenia.
 * Do tabeli trafia wylacznie to, co przeszlo bezpiecznik w imporcie.
 */
export function streszczenieUstawy(numer: string): Streszczenie | null {
  return bezTabeli(
    () => jeden<Streszczenie>('select tekst, model, przygotowano from streszczenia where numer = ?', numer),
    null,
  );
}

export function proces(numer: string): ProcesSkrot | null {
  return bezTabeli(
    () => jeden<ProcesSkrot>(`select ${KOLUMNY_PROCESU} from procesy p where p.numer = ?`, numer),
    null,
  );
}

export function procesyDoMapy(): { numer: string; tytul: string }[] {
  return bezTabeli(
    () => wszystkie<{ numer: string; tytul: string }>('select numer, tytul from procesy'),
    [],
  );
}

export type EtapProcesu = {
  kolejnosc: number;
  poziom: number;
  typ: string | null;
  nazwa: string;
  data: string | null;
  druk: string | null;
  komisja: string | null;
  decyzja: string | null;
  komentarz: string | null;
  posiedzenie: number | null;
  glos_posiedzenie: number | null;
  glos_numer: number | null;
  /** 1, gdy to glosowanie mamy u siebie — inaczej nie robimy z niego odnosnika. */
  glosowanie_mamy: number;
};

export function etapyProcesu(numer: string): EtapProcesu[] {
  return bezTabeli(
    () => wszystkie<EtapProcesu>(
      `select e.kolejnosc, e.poziom, e.typ, e.nazwa, e.data, e.druk, e.komisja, e.decyzja,
              e.komentarz, e.posiedzenie, e.glos_posiedzenie, e.glos_numer,
              (select count(*) from glosowania g
                where g.posiedzenie = e.glos_posiedzenie and g.numer = e.glos_numer) as glosowanie_mamy
         from etapy_procesow e where e.proces = ? order by e.kolejnosc`,
      numer,
    ),
    [],
  );
}

/** Proces, w ktorym padlo to glosowanie — odnosnik ze strony glosowania. */
export function procesGlosowania(posiedzenie: number, numer: number): ProcesSkrot | null {
  return bezTabeli(
    () => jeden<ProcesSkrot>(
      `select ${KOLUMNY_PROCESU} from procesy p
        join etapy_procesow e on e.proces = p.numer
        where e.glos_posiedzenie = ? and e.glos_numer = ? limit 1`,
      posiedzenie, numer,
    ),
    null,
  );
}

export type WydatekDzialu = { dzial: string; nazwa: string; kwota: number; udzial: number };
export type WydatkiDzialami = {
  rok: number;
  ogolem: number;
  pozycje: WydatekDzialu[];
  /** Dzialy spoza naszej listy, policzone jako roznica — nie zero. */
  pozostale: number;
};

/**
 * Na co gmina wydaje — wydatki wedlug dzialow klasyfikacji budzetowej.
 *
 * Mianownik ("ogolem") pochodzi z TEGO SAMEGO tematu BDL co dzialy, a nie
 * z tabeli budzetow: inaczej procenty liczylyby sie wzgledem liczby z innego
 * zestawienia i nie sumowalyby sie do stu.
 */
export function wydatkiDzialami(teryt: string): WydatkiDzialami | null {
  return bezTabeli(() => {
    const rok = jeden<{ rok: number }>(
      "select max(rok) as rok from budzety_dzialy where teryt = ? and dzial = 'ogolem'", teryt,
    )?.rok;
    if (!rok) return null;
    const wiersze = wszystkie<{ dzial: string; kwota: number }>(
      'select dzial, kwota from budzety_dzialy where teryt = ? and rok = ?', teryt, rok,
    );
    const ogolem = wiersze.find((w) => w.dzial === 'ogolem')?.kwota ?? 0;
    if (ogolem <= 0) return null;
    const pozycje = wiersze
      .filter((w) => w.dzial !== 'ogolem' && w.kwota > 0)
      .map((w) => ({ dzial: w.dzial, nazwa: nazwaDzialu(w.dzial), kwota: w.kwota, udzial: w.kwota / ogolem }))
      .sort((a, b) => b.kwota - a.kwota);
    const suma = pozycje.reduce((a, p) => a + p.kwota, 0);
    return { rok, ogolem, pozycje, pozostale: Math.max(0, ogolem - suma) };
  }, null);
}

export type GminaPelna = Gmina & {
  okreg_nazwa: string | null;
  ludnosc: number | null;
  ludnosc_rok: number | null;
};

/**
 * Warszawa jako CALE MIASTO.
 *
 * Nasza tabela gmin pochodzi z danych PKW, ktore dziela Warszawe na 18
 * dzielnic (pulapka 24) — wiersza „Warszawa" tam nie ma. Ale budzet, fundusze
 * UE, pomoc publiczna i zamowienia sa w bazie pod TERYT 146501, a od 23.09.2026
 * mapa pokazuje jedna Warszawe i prowadzila do strony, ktora ODDAWALA 404.
 *
 * Skladamy wiec ten jeden wiersz z dzielnic, zamiast dopisywac go do tabeli
 * gmin: tam psulby liczniki i mediany (Warszawa liczona raz jako miasto
 * i osiemnascie razy jako dzielnice).
 */
function warszawaJakoGmina(): GminaPelna | null {
  return bezTabeli(() => {
    const d = jeden<{ uprawnionych: number | null; okreg_nr: number; okreg_nazwa: string | null; rok: number | null }>(
      `select sum(g.uprawnionych) as uprawnionych, min(g.okreg_nr) as okreg_nr,
              min(o.nazwa) as okreg_nazwa, max(l.rok) as rok
         from gminy g join okregi o on o.nr = g.okreg_nr
         left join ludnosc l on l.teryt = g.teryt
        where g.rodzaj = 'dzielnica Warszawy'`,
    );
    if (!d) return null;
    return {
      teryt: TERYT_WARSZAWY,
      nazwa: 'Warszawa',
      rodzaj: 'miasto na prawach powiatu',
      powiat: 'Warszawa',
      wojewodztwo: 'mazowieckie',
      okreg_nr: d.okreg_nr,
      okreg_nazwa: d.okreg_nazwa,
      uprawnionych: d.uprawnionych,
      ludnosc: ludnoscWarszawy(),
      ludnosc_rok: d.rok,
    };
  }, null);
}

export function gminaPelna(teryt: string): GminaPelna | null {
  if (teryt === TERYT_WARSZAWY) return warszawaJakoGmina();
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

export type WojewodztwoZeSpisem = { wojewodztwo: string; gmin: number; osob: number | null; rok: number | null };

/** Województwa z liczbą gmin — spis dla strony `/gminy`. */
export function wojewodztwaGmin(): WojewodztwoZeSpisem[] {
  return bezTabeli(
    () => wszystkie<WojewodztwoZeSpisem>(
      /*
       * Dzielnice Warszawy liczone JAKO JEDNA gmina. Bez tego serwis pisal
       * „2 494 gminy" na stronie glownej i „331 gmin" w mazowieckiem.
       * Ta liczba nie jest tu wpisana i to jest celowe: 01.10.2026 wynosila
       * 2 477, a po uzgodnieniu wykazu z PRG i GUS (etap `wykaz`, doszly
       * Szczawa i Grabowka) wynosi **2 479** — i zmieni sie znowu przy
       * kazdej zmianie administracyjnej, bo PKW jest zamrozona na dniu
       * wyborow. Ludnosc sumuje sie poprawnie i tak, bo dzielnice maja
       * wlasne wiersze w `ludnosc`.
       */
      `select g.wojewodztwo as wojewodztwo,
              count(*) - sum(case when g.rodzaj = 'dzielnica Warszawy' then 1 else 0 end)
                + (case when sum(case when g.rodzaj = 'dzielnica Warszawy' then 1 else 0 end) > 0 then 1 else 0 end)
                as gmin,
              sum(l.osob) as osob, max(l.rok) as rok
         from gminy g left join ludnosc l on l.teryt = g.teryt
        group by g.wojewodztwo order by g.wojewodztwo collate nocase`,
    ),
    [],
  );
}

export type GminaSpisu = { teryt: string; nazwa: string; rodzaj: string; powiat: string; osob: number | null; rok: number | null };

/** Gminy jednego województwa, po powiatach — spis dla `/gminy/[wojewodztwo]`. */
export function gminyWojewodztwa(wojewodztwo: string): GminaSpisu[] {
  return bezTabeli(
    () => wszystkie<GminaSpisu>(
      `select g.teryt as teryt, g.nazwa as nazwa, g.rodzaj as rodzaj, g.powiat as powiat, l.osob as osob, l.rok as rok
         from gminy g left join ludnosc l on l.teryt = g.teryt
        where g.wojewodztwo = ?
        order by g.powiat collate nocase, g.nazwa collate nocase`,
      wojewodztwo,
    ),
    [],
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

// ---------------------------------------------------------------------------
// Wystapienia na sali (od 03.10.2026)
// ---------------------------------------------------------------------------

export type Wystapienie = {
  posiedzenie: number;
  dzien: string;
  numer: number;
  funkcja: string | null;
  poczatek: string | null;
  koniec: string | null;
  sprawozdawca: number;
  sekretarz: number;
  na_pismie: number;
};

export type WystapieniaPosla = {
  /** Wszystkie wystapienia w stenogramach — licznik. */
  ile: number;
  /** W tym zlozone tylko na pismie (niewygloszone). */
  naPismie: number;
  /** W tym jako sekretarz posiedzenia — czynnosc proceduralna. */
  jakoSekretarz: number;
  /** Dni, w ktorych posel ZABRAL GLOS na sali (bez wystapien na pismie). */
  dniZGlosem: number;
  /** Dni obrad w czasie mandatu — mianownik (zasada 3). */
  dniObrad: number;
  ostatnie: Wystapienie[];
};

/**
 * Wystapienia jednego posla.
 *
 * MIANOWNIK Z TEGO SAMEGO ZRODLA CO LICZNIK: dni obrad bierzemy ze
 * stenogramow (stenogramy_dni), a nie z tabeli obecnosci. Pulapka 53: dwa
 * konce tego samego rejestru licza inaczej, a obecnosc zna tylko dni
 * z glosowaniami — dzien samej debaty mialby wystapienie bez dnia w
 * mianowniku i iloraz wyszedlby ponad 100%.
 * Okno mandatu jak przy interpelacjach: od pierwszego dnia w obecnosci do
 * data_wygasniecia albo do dzis.
 *
 * `null`, gdy stenogramow jeszcze nie pobralismy — brak danych to stan,
 * a nie zmierzone zero (wzorzec 6).
 */
export function wystapieniaPosla(id: number, ile = 8): WystapieniaPosla | null {
  return bezTabeli(() => {
    const dniWBazie = jeden<{ c: number }>('select count(*) as c from stenogramy_dni where wystapien > 0')?.c ?? 0;
    if (!dniWBazie) return null;
    const okno = jeden<{ od: string | null; wygaslo: string | null }>(
      `select (select min(dzien) from obecnosc where posel_id = p.id) as od, p.data_wygasniecia as wygaslo
         from poslowie p where p.id = ?`,
      id,
    );
    const od = okno?.od ?? null;
    const doKiedy = okno?.wygaslo ?? null;
    const dniObrad = jeden<{ c: number }>(
      `select count(distinct dzien) as c from stenogramy_dni
        where wystapien > 0 and (? is null or dzien >= ?) and (? is null or dzien <= ?)`,
      od, od, doKiedy, doKiedy,
    )?.c ?? 0;
    const licznik = jeden<{ ile: number; pismo: number; sekretarz: number; dni: number }>(
      `select count(*) as ile, coalesce(sum(na_pismie), 0) as pismo, coalesce(sum(sekretarz), 0) as sekretarz,
              count(distinct case when na_pismie = 0 then dzien end) as dni
         from wystapienia where posel_id = ?`,
      id,
    );
    const ostatnie = wszystkie<Wystapienie>(
      `select posiedzenie, dzien, numer, funkcja, poczatek, koniec, sprawozdawca, sekretarz, na_pismie
         from wystapienia where posel_id = ?
        order by dzien desc, numer desc limit ?`,
      id, ile,
    );
    return {
      ile: licznik?.ile ?? 0,
      naPismie: licznik?.pismo ?? 0,
      jakoSekretarz: licznik?.sekretarz ?? 0,
      dniZGlosem: licznik?.dni ?? 0,
      dniObrad,
      ostatnie,
    };
  }, null);
}

// ---------------------------------------------------------------------------
// Komisje sejmowe (od 03.10.2026)
// ---------------------------------------------------------------------------

export type KomisjaSkrot = {
  kod: string;
  nazwa: string;
  typ: string;
  zakres: string | null;
  czlonkow: number;
};

export type CzlonkostwoPosla = KomisjaSkrot & { funkcja: string | null; od: string | null };

export type CzlonekKomisji = {
  posel_id: number;
  slug: string;
  imie_nazwisko: string;
  klub: string | null;
  funkcja: string | null;
  od: string | null;
};

export type Komisja = KomisjaSkrot & {
  dopelniacz: string | null;
  telefon: string | null;
  powolana: string | null;
  sklad_z_dnia: string | null;
  sklad: CzlonekKomisji[];
};

/** Kolejnosc funkcji: przewodniczacy, zastepcy, czlonkowie — jak w rejestrze. */
const RANGA_FUNKCJI = `case when funkcja like 'przewodnicz%' then 0
                           when funkcja like 'zast%' then 1 else 2 end`;

const KOMISJA_SKROT = `k.kod as kod, k.nazwa as nazwa, k.typ as typ, k.zakres as zakres,
  (select count(*) from komisje_sklad s where s.kod = k.kod) as czlonkow`;

/**
 * Komisje JEDNEGO posla. Tylko jego — pelny sklad zostaje na /komisja/[kod]
 * (pulapka 54: dane wszystkich poslow na 499 stronach podniosly strone posla
 * z 88 do 258 kB). `null`, gdy tabeli jeszcze nie ma: brak danych to stan,
 * a nie zmierzone zero (wzorzec 6).
 */
export function komisjePosla(poselId: number): CzlonkostwoPosla[] | null {
  return bezTabeli(
    () => {
      const ile = jeden<{ c: number }>('select count(*) as c from komisje')?.c ?? 0;
      if (!ile) return null;
      return wszystkie<CzlonkostwoPosla>(
        `select ${KOMISJA_SKROT}, s.funkcja as funkcja, s.od as od
           from komisje_sklad s join komisje k on k.kod = s.kod
          where s.posel_id = ?
          order by ${RANGA_FUNKCJI.replaceAll('funkcja', 's.funkcja')}, k.nazwa`,
        poselId,
      );
    },
    null,
  );
}

export function listaKomisji(): KomisjaSkrot[] {
  return bezTabeli(
    () => wszystkie<KomisjaSkrot>(
      `select ${KOMISJA_SKROT} from komisje k
        order by case k.typ when 'STANDING' then 0 when 'EXTRAORDINARY' then 1 else 2 end, k.nazwa`,
    ),
    [],
  );
}

export function komisja(kod: string): Komisja | null {
  return bezTabeli(
    () => {
      const k = jeden<Omit<Komisja, 'sklad'>>(
        `select ${KOMISJA_SKROT}, k.dopelniacz as dopelniacz, k.telefon as telefon,
                k.powolana as powolana, k.sklad_z_dnia as sklad_z_dnia
           from komisje k where k.kod = ?`,
        kod,
      );
      if (!k) return null;
      const sklad = wszystkie<CzlonekKomisji>(
        `select s.posel_id as posel_id, p.slug as slug, p.imie_nazwisko as imie_nazwisko,
                s.klub as klub, s.funkcja as funkcja, s.od as od
           from komisje_sklad s join poslowie p on p.id = s.posel_id
          where s.kod = ?
          order by ${RANGA_FUNKCJI.replaceAll('funkcja', 's.funkcja')}, p.nazwisko, p.imie`,
        kod,
      );
      return { ...k, sklad };
    },
    null,
  );
}

export function kodyKomisji(): string[] {
  return bezTabeli(() => wszystkie<{ kod: string }>('select kod from komisje').map((r) => r.kod), []);
}

export type FunduszeWRoku = {
  okres: string;
  rok: number;
  tylko_tu: number;
  tylko_tu_wartosc: number | null;
  tylko_tu_ue: number | null;
  wspolnych: number;
};

/**
 * Fundusze UE w gminie po ROKU ROZPOCZECIA projektu — tabela liczona
 * w imporcie (fe_gminy_lata). Lata bez projektu sa UZUPELNIANE zerem:
 * miedzy pierwszym a ostatnim rokiem brak wiersza znaczy „zaden projekt
 * tu nie ruszyl", czyli zmierzone zero, a nie brak danych (zasada 4).
 * Bez uzupelnienia oś „2023, 2025" chowalaby rok 2024 i czytelnik moglby
 * tego nie zauwazyc.
 */
export function funduszeGminyLata(teryt: string): FunduszeWRoku[] {
  const wiersze = bezTabeli(
    () => wszystkie<FunduszeWRoku>(
      `select okres, rok, tylko_tu, tylko_tu_wartosc, tylko_tu_ue, wspolnych
         from fe_gminy_lata where teryt = ? order by okres, rok`,
      teryt,
    ),
    [],
  );
  const wynik: FunduszeWRoku[] = [];
  for (const okres of [...new Set(wiersze.map((w) => w.okres))]) {
    /*
     * NULL ≠ ZERO (zasada 4). ZMIERZONE NA ZRZUCIE 03.10.2026, Krakow,
     * 2021-2027: lata 2014 i 2019 pokazywaly „—", a 2015-2017 „0 zl" — choc
     * znaczyly to samo. W 2014 i 2019 ruszyly TYLKO projekty wspolne z innymi
     * gminami, wiec projektow „tylko tutaj" bylo zero, a SQL-owe sum() po
     * pustym zbiorze daje NULL. Kontrola sum tego nie widziala, bo NULL
     * i 0 sumuja sie tak samo.
     * Polpauza zostaje tylko tam, gdzie projekty SA, ale kwoty w zlotych nie
     * ma (Interreg 2014-2020 podaje euro — pulapka 23).
     */
    const tego = wiersze.filter((w) => w.okres === okres).map((w) => (w.tylko_tu === 0
      ? { ...w, tylko_tu_wartosc: 0, tylko_tu_ue: 0 }
      : w));
    const lata = new Map(tego.map((w) => [w.rok, w]));
    for (let rok = tego[0]!.rok; rok <= tego[tego.length - 1]!.rok; rok++) {
      wynik.push(lata.get(rok) ?? { okres, rok, tylko_tu: 0, tylko_tu_wartosc: 0, tylko_tu_ue: 0, wspolnych: 0 });
    }
  }
  return wynik;
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
  /** Z czego skladaja sie dochody — null znaczy „GUS nie podal", nie zero. */
  subwencja: number | null;
  dotacje: number | null;
  /** Udzialy w PIT i CIT sa czescia dochodow WLASNYCH, nie obok nich. */
  udzial_pit: number | null;
  udzial_cit: number | null;
  podatek_nieruchomosc: number | null;
};

/**
 * Budzet gminy za ostatni rok, ktory GUS opublikowal.
 * Warszawa ma w BDL jedna jednostke (146501), wiec dzielnica dostaje budzet
 * calego miasta — tak samo jak przy funduszach UE.
 */
export function budzetGminy(teryt: string): BudzetGminy | null {
  return bezTabeli(
    () => jeden<BudzetGminy>(
      `select rok, dochody, dochody_wlasne, wydatki, wydatki_majatkowe, wydatki_inwestycyjne,
              subwencja, dotacje, udzial_pit, udzial_cit, podatek_nieruchomosc
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

export type WartoscSmup = {
  klucz: string;
  etykieta: string;
  /** 'procent' albo 'zl_na_mieszkanca' — decyduje o zapisie liczby */
  jednostka: string;
  /** nazwy urzedowe wskaznikow SMUP, prosto z rejestru */
  nazwy: string | null;
  /** rok, za ktory jest ta wartosc — kazda miara ma swoj, zrodlo publikuje je w roznym tempie */
  rok: number;
  /** null znaczy "brak informacji albo tajemnica statystyczna" (flaga 5), nie zero */
  wartosc: number | null;
  precyzja: number | null;
  flaga: number;
  /** mediana w wojewodztwie w tym samym roku */
  mediana: number | null;
  /** ile gmin zlozylo sie na mediane — mianownik porownania */
  gmin: number;
};

/**
 * Wskazniki SMUP dla gminy, kazdy za NAJNOWSZY ROK, ktory ma w zrodle,
 * wraz z mediana w wojewodztwie za ten sam rok (zasada 9: liczba z punktem
 * odniesienia).
 *
 * Kazdy wiersz niesie wlasny rok, bo zrodlo publikuje wskazniki w roznym
 * tempie: ZMIERZONE 22.09.2026 — budzetowe maja 2025, trzy podatkowe koncza
 * sie na 2024. Jeden wspolny rok albo gubilby swieze dane, albo pokazywalby
 * dziury tam, gdzie zrodlo jeszcze nie opublikowalo.
 *
 * Mediane liczymy TYLKO z gmin, ktore maja wartosc — gmina bez pomiaru to
 * brak, nie zero (zrodlo odroznia jedno od drugiego flaga).
 */
export function smupGminy(teryt: string, wojewodztwo: string): WartoscSmup[] {
  return bezTabeli(() => {
    const wiersze = wszystkie<{
      klucz: string; etykieta: string; jednostka: string; nazwy: string | null;
      rok: number; wartosc: number | null; precyzja: number | null; flaga: number;
    }>(
      `select d.klucz, m.etykieta, m.jednostka, m.nazwy, d.rok, d.wartosc, d.precyzja, d.flaga
         from smup_dane d
         join smup_miary m on m.klucz = d.klucz
         join (select klucz, max(rok) as rok from smup_dane where teryt = ? group by klucz) o
           on o.klucz = d.klucz and o.rok = d.rok
        where d.teryt = ?`,
      teryt, teryt,
    );
    if (!wiersze.length) return [];

    const odRoku = Math.min(...wiersze.map((w) => w.rok));
    const wWojewodztwie = wszystkie<{ klucz: string; rok: number; wartosc: number }>(
      /*
       * Warszawy NIE MA w tabeli `gminy` jako jednej jednostki (sa 18
       * dzielnic), a `smup_dane` ma ja pod 146501. Zwykle zlaczenie
       * wycinalo ja z grupy porownawczej: „mediana w wojewodztwie (313 gmin)"
       * zamiast 314, i to na stronach dzielnic Warszawy, ktore porownywaly
       * sie do mediany bez siebie samych (zmierzone 01.10.2026).
       */
      `select d.klucz, d.rok, d.wartosc from smup_dane d
         join (select teryt, wojewodztwo from gminy
               union all select ?, 'mazowieckie') g on g.teryt = d.teryt
        where g.wojewodztwo = ? and d.rok >= ? and d.wartosc is not null`,
      TERYT_WARSZAWY, wojewodztwo, odRoku,
    );
    const poKluczu = new Map<string, number[]>();
    for (const w of wWojewodztwie) {
      const klucz = `${w.klucz}|${w.rok}`;
      const lista = poKluczu.get(klucz) ?? [];
      lista.push(w.wartosc);
      poKluczu.set(klucz, lista);
    }
    const mediana = (liczby: number[]): number => {
      const l = [...liczby].sort((a, b) => a - b);
      const s = Math.floor(l.length / 2);
      return l.length % 2 ? l[s]! : (l[s - 1]! + l[s]!) / 2;
    };

    return wiersze.map((w) => {
      const wojewodzkie = poKluczu.get(`${w.klucz}|${w.rok}`) ?? [];
      return { ...w, mediana: wojewodzkie.length ? mediana(wojewodzkie) : null, gmin: wojewodzkie.length };
    });
  }, []);
}

/** Jedna miara SMUP rok po roku — do wykresu na stronie gminy. */
export function historiaSmup(teryt: string, klucz: string): { rok: number; wartosc: number | null }[] {
  return bezTabeli(
    () => wszystkie<{ rok: number; wartosc: number | null }>(
      'select rok, wartosc from smup_dane where teryt = ? and klucz = ? order by rok',
      teryt, klucz,
    ),
    [],
  );
}

export type Firma = {
  nip: string;
  nazwa: string;
  /** Typ z REGON ('P'/'F'/…), gdy go mamy. */
  typ_regon: string | null;
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
  /*
   * Z JAKIEGO ZBIORU sa te liczby. B6 z przegladu 01.10.2026: strona firmy
   * mieszala pod jedna etykieta pelna dziesiecioletnia historie trzech gmin
   * pokazowych i kilkanascie dni reszty kraju, a pod zakresem dat pisala
   * „rejestr obejmuje ostatnie dziesiec lat" — co dla wiekszosci firm bylo
   * wprost nieprawda. Trzy liczby ponizej sa rozlaczne i sumuja sie do
   * `przypadkow`, wiec czytelnik widzi mianownik (regula 3).
   */
  /** Przypadki z PELNEGO pobrania gminy — dzien poza rejestrem dni kraju. */
  z_historii_gminy: number;
  /** Przypadki z dni pobranych dla kraju, ktore juz sie ustalily. */
  z_dni_ustalonych: number;
  /** Przypadki z dni pobranych, ale jeszcze nieustalonych (niepelne). */
  z_dni_swiezych: number;
  /** Ile dni kraju jest ustalonych i od kiedy do kiedy — mianownik dla powyzszych. */
  dni_kraju: number;
  dni_od: string | null;
  dni_do: string | null;
};

export type PrzypadekFirmy = {
  dzien: string;
  brutto: number | null;
  nominalna: number | null;
  przeznaczenie: string | null;
  forma: string | null;
  udzielajacy: string | null;
  /** NIP udzielajacego — do filtra nazw (pulapka 34) i do strony organu. */
  nip_udzielajacego: string | null;
  /** Typ udzielajacego w REGON, gdy go znamy — rozstrzyga o jawnosci nazwy. */
  typ_udzielajacego: string | null;
  srodek: string | null;
  /** Numer programu pomocowego; „SA.…" to sprawa w Komisji Europejskiej. */
  srodek_numer: string | null;
  /** Podstawa prawna z SUDOP (od 04.10.2026 pokazywana na stronie firmy). */
  podstawa: string | null;
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
              (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon,
              o.wielkosc as wielkosc, o.wielkosc_kod as wielkosc_kod, o.pkd as pkd, o.pkd_nazwa as pkd_nazwa,
              o.teryt as teryt, g.nazwa as gmina, g.rodzaj as gmina_rodzaj,
              count(*) as przypadkow, sum(p.wartosc_brutto) as brutto,
              min(p.dzien) as pierwszy, max(p.dzien) as ostatni,
              sum(case when p.dzien not in (select dzien from pomoc_publiczna_dni) then 1 else 0 end) as z_historii_gminy,
              sum(case when p.dzien in ${DNI_USTALONE} then 1 else 0 end) as z_dni_ustalonych,
              sum(case when p.dzien in (select dzien from pomoc_publiczna_dni)
                        and p.dzien not in ${DNI_USTALONE} then 1 else 0 end) as z_dni_swiezych,
              (select count(*) from ${DNI_USTALONE}) as dni_kraju,
              (select min(dzien) from ${DNI_USTALONE}) as dni_od,
              (select max(dzien) from ${DNI_USTALONE}) as dni_do
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
/**
 * NIP-y firm do mapy strony — GOTOWA lista z importu, juz po regule jawnosci
 * i juz przycieta do limitu protokolu.
 *
 * Liczenie tego przy renderowaniu wywrocilo wdrozenie 28.09.2026: pelne
 * grupowanie po 2,5 mln wierszy dawalo ~230 tysiecy firm, z ktorych kazda
 * przechodzila przez `nazwaPodmiotuJawna()`. Trzy proby po ponad 300 sekund
 * i `next build` przerwal prace, zostawiajac serwis wylaczony na dobe.
 */
export function firmyDoMapy(): string[] {
  const zapisane = bezTabeli(
    () => jeden<{ wartosc: string }>('select wartosc from agregaty where klucz = ?', KLUCZ_FIRM_DO_MAPY),
    null,
  );
  return zapisane ? (JSON.parse(zapisane.wartosc) as string[]) : [];
}

/**
 * Ktore z podanych NIP-ow organow maja wlasna strone (`/organ/[nip]`).
 * Strona powstaje z tabeli sum, czyli z dni USTALONYCH — organ znany tylko
 * z dni swiezych albo z historii gmin pokazowych dawalby 404. Osobne
 * zapytanie, zeby brak tej tabeli nie wyzerowal listy przypadkow.
 */
export function organyZeStrona(nipy: string[]): Set<string> {
  const unikalne = [...new Set(nipy.filter(Boolean))];
  if (!unikalne.length) return new Set();
  return bezTabeli(
    () => new Set(wszystkie<{ nip: string }>(
      `select distinct nip_organu as nip from pomoc_sumy_organy
        where nip_organu in (${unikalne.map(() => '?').join(',')})`,
      ...unikalne,
    ).map((r) => r.nip)),
    new Set<string>(),
  );
}

/** Pojedyncze przypadki pomocy dla firmy, od najnowszych. */
export function przypadkiFirmy(nip: string, ile = 50): PrzypadekFirmy[] {
  return bezTabeli(
    () => wszystkie<PrzypadekFirmy>(
      `select dzien, wartosc_brutto as brutto, wartosc_nominalna as nominalna, przeznaczenie, forma,
              udzielajacy, nip_udzielajacego,
              (select typ from regon r where r.nip = pomoc_publiczna.nip_udzielajacego) as typ_udzielajacego,
              srodek_nazwa as srodek, srodek_numer, podstawa
         from pomoc_publiczna where nip_beneficjenta = ?
        order by dzien desc, wartosc_brutto desc limit ?`,
      nip, ile,
    ),
    [],
  );
}

export type { WierszPrzegladu, PrzegladPomocy } from './przeglad';


/**
 * Pomoc publiczna w calym kraju — WYLACZNIE z dni pobranych dla calego kraju.
 *
 * W tej samej tabeli leza pelne 10 lat trzech gmin pokazowych. Bez filtra po
 * `pomoc_publiczna_dni` Belchatow i Zakopane doszlyby do sum krajowych ze
 * swoja cala historia i zawyzylyby je o miliardy.
 * Warszawa (146501) nie ma wiersza w tabeli gmin (sa dzielnice), wiec jej
 * wojewodztwo podajemy wprost.
 */
export type PrzegladZeZnacznikiem = PrzegladPomocy & {
  /** Kiedy policzony. `null` = policzony przed chwila, na tej stronie. */
  policzono: string | null;
  /** `true`, gdy od policzenia doszly nowe dni ustalone. */
  nieaktualny: boolean;
};

/**
 * Przeglad krajowy: czytamy GOTOWY wynik zapisany przez import.
 *
 * Liczenie go tutaj oznaczaloby osiem przebiegow po calej tabeli pomocy
 * przy kazdej odbudowie strony — 3 minuty na 2,5 mln wierszy i kilkanascie
 * na pelnej historii (patrz `src/lib/przeglad.ts`). Gdy agregatu nie ma
 * (swiezy klon repozytorium, import bez etapu `agregaty`), liczymy na
 * miejscu: wolno, ale bez klamstwa i bez pustej strony.
 */
export function przegladPomocy(): PrzegladZeZnacznikiem | null {
  // Brak TABELI `agregaty` (stara baza sprzed 27.09.2026) to nie to samo,
  // co brak wiersza — w obu wypadkach liczymy na miejscu, ale gdyby caly
  // odczyt szedl przez jedno `bezTabeli`, brak tabeli wygaszalby strone.
  const zapisany = bezTabeli(
    () => jeden<{ wartosc: string; podpis: string; policzono: string }>(
      'select wartosc, podpis, policzono from agregaty where klucz = ?', KLUCZ_PRZEGLADU,
    ),
    null,
  );
  if (zapisany) {
    const p = JSON.parse(zapisany.wartosc) as PrzegladPomocy;
    return { ...p, policzono: zapisany.policzono, nieaktualny: zapisany.podpis !== podpisDni(czytnik) };
  }
  return bezTabeli(() => {
    const p = policzPrzeglad(czytnik, TERYT_WARSZAWY);
    return p && { ...p, policzono: null, nieaktualny: false };
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
  /** Typ z REGON — rozstrzyga o jawnosci nazwy tak samo jak na stronie. */
  typ_regon: string | null;
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
              (select typ from regon where regon.nip = z.nip_beneficjenta) as typ_regon,
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
/* Jedna definicja dla strony i dla importu — patrz `src/lib/przeglad.ts`. */
export { DNI_DO_USTALENIA } from './przeglad';

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
  nazwyBeneficjentow: { nazwa: string; max_eur: number | null; typ_regon: string | null }[];
  lata: { rok: string; przypadkow: number; brutto: number | null }[];
  przeznaczenia: { nazwa: string; przypadkow: number; brutto: number | null }[];
  udzielajacy: { nazwa: string; przypadkow: number; brutto: number | null }[];
  /** `max_eur` to NAJWIEKSZA POJEDYNCZA pomoc — do progu jawnosci nazwiska. */
  beneficjenci: {
    nazwa: string; nip: string | null; przypadkow: number; brutto: number | null;
    max_eur: number | null;
    /** Typ z REGON — od 24.09.2026 to ON rozstrzyga o jawnosci nazwy, nie heurystyka. */
    typ_regon: string | null;
  }[];
};

/** Pomoc publiczna z SUDOP dla beneficjentow z siedziba w gminie. */
export type KategoriaOrganu = {
  kategoria: KategoriaPomocy;
  przypadkow: number;
  /** `null` znaczy „rejestr nie podal kwoty", nie zero (regula 4). */
  brutto: number | null;
};

export type OrganPomocy = {
  nip: string;
  nazwa: string;
  /** Czy to organ TEJ gminy — wojt, burmistrz, prezydent albo jej jednostka. */
  wlasny: boolean;
  przypadkow: number;
  kategorie: KategoriaOrganu[];
};

export type OrganyPomocy = {
  organy: OrganPomocy[];
  /** Ilu organow nie wolno nam nazwac (osoby fizyczne) — liczba zostaje. */
  bezNazwy: number;
  przypadkowBezNazwy: number;
  /** Czy liczone z PELNEGO pobrania gminy, czy tylko z dni ustalonych kraju. */
  pelna: boolean;
};

/**
 * KTO PODJAL DECYZJE o pomocy dla firm z tej gminy.
 *
 * Najbogatszy i dotad **zupelnie nieuzywany** wymiar rejestru: pole
 * `nip_udzielajacego` jest wypelnione w 100% wierszy (0 brakow na 168 456),
 * a roznych organow jest 1 149. Serwis pokazywal, ile pomocy dostaly firmy
 * w gminie — nigdy, kto o tym postanowil.
 *
 * Czyta GOTOWY stan z `pomoc_sumy_organy`, liczony przyrostowo przy imporcie
 * z dni USTALONYCH (te same, co reszta strony gminy — lekcja B2). Strona nie
 * grupuje niczego po tabeli pomocy, bo przy pelnej historii to kilka minut
 * (pulapki 52 i 57).
 *
 * TRZY RZECZY, ktore musza byc tutaj, a nie w szablonie:
 *
 *  1. **Klucz to NIP, nie nazwa.** 33 NIP-y maja po 2-3 warianty nazwy
 *     w rejestrze; grupowanie po nazwie rozsypaloby jeden organ na trzy.
 *  2. **Kategorie sie NIE SUMUJA.** Dotacja jest wydatkiem budzetu,
 *     zwolnienie — dochodem, ktorego nie pobrano, a rata — tylko korzyscia
 *     z odsetek. Jedna liczba „pomoc organu" byłaby bledem merytorycznym,
 *     wiec oddajemy rozbicie i strona pokazuje je osobno.
 *  3. **Organem bywa osoba fizyczna** (pulapka 34; firmy szkoleniowe przy
 *     projektach UE). Nazwa przechodzi przez ta sama regule jawnosci co
 *     beneficjenci, a kogo nie wolno nazwac — liczymy, nie pomijamy
 *     (zasada 7).
 */
export function organyPomocy(teryt: string): OrganyPomocy {
  const pusto: OrganyPomocy = { organy: [], bezNazwy: 0, przypadkowBezNazwy: 0, pelna: false };
  return bezTabeli(() => {
    /*
     * TEN SAM ZBIOR, co sekcja pomocy wyzej na tej stronie — inaczej mielibysmy
     * blad B2 w nowym miejscu. `pomocGminy()` dla gminy z PELNYM pobraniem
     * liczy z calej jej historii, a dla reszty kraju z dni ustalonych.
     * ZMIERZONE 01.10.2026 na Zakopanem (gmina pokazowa): z dni ustalonych
     * wychodzily 4 organy z drobnymi kwotami, a z pelnej historii „Burmistrz
     * Miasta Zakopane" ma **904 decyzje na 15,93 mln zl**. Dwie sekcje na tej
     * samej stronie mowilyby o innym swiecie.
     *
     * Liczenie na zywo jest tu tanie i NIE lamie pulapki 52: idzie indeksem
     * pokrywajacym `pomoc_teryt` dla JEDNEJ gminy (sprawdzone planem
     * zapytania: SEARCH USING COVERING INDEX), a nie przebiegiem po tabeli.
     * Takich gmin jest tyle, ile pelnych pobran — dzis trzy.
     */
    const pelna = (jeden<{ c: number }>(
      'select count(*) as c from pomoc_publiczna_pobrania where teryt = ?', teryt,
    )?.c ?? 0) > 0;

    const wiersze = pelna
      ? wszystkie<{
        nip: string; kategoria: string; przypadkow: number; z_kwota: number; brutto: number;
        nazwa_sudop: string | null; nazwa_regon: string | null;
        typ_regon: string | null; teryt_organu: string | null;
      }>(
        `select p.nip_udzielajacego as nip, p.forma_kod as kategoria, count(*) as przypadkow,
                sum(case when p.wartosc_brutto is null then 0 else 1 end) as z_kwota,
                coalesce(sum(p.wartosc_brutto), 0) as brutto,
                max(p.udzielajacy) as nazwa_sudop, r.nazwa as nazwa_regon,
                r.typ as typ_regon, r.teryt as teryt_organu
           from pomoc_publiczna p
           left join regon r on r.nip = p.nip_udzielajacego
          where p.teryt = ? and p.nip_udzielajacego is not null
          group by p.nip_udzielajacego, p.forma_kod`,
        teryt,
      ).map((r) => ({ ...r, kategoria: kategoriaFormy(r.kategoria) }))
      : wszystkie<{
        nip: string; kategoria: string; przypadkow: number; z_kwota: number; brutto: number;
        nazwa_sudop: string | null; nazwa_regon: string | null;
        typ_regon: string | null; teryt_organu: string | null;
      }>(
        `select o.nip_organu as nip, o.kategoria as kategoria, o.przypadkow as przypadkow,
                o.z_kwota as z_kwota, o.brutto as brutto,
                o.nazwa as nazwa_sudop, r.nazwa as nazwa_regon, r.typ as typ_regon, r.teryt as teryt_organu
           from pomoc_sumy_organy o
           left join regon r on r.nip = o.nip_organu
          where o.teryt = ?
          order by o.brutto desc`,
        teryt,
      );
    if (!wiersze.length) return pusto;

    const wg = new Map<string, OrganPomocy>();
    const ukryte = new Set<string>();
    let przypadkowBezNazwy = 0;
    for (const r of wiersze) {
      const nazwa = nazwaOrganu(r.nazwa_sudop, r.nazwa_regon);
      // Prog kwotowy nie ma tu zastosowania: on sluzy beneficjentom pomocy,
      // a nie podmiotom, ktore ja udzielaja.
      if (!nazwaPodmiotuJawna(nazwa, r.typ_regon)) {
        // Jeden organ ma do pieciu kubelkow (po jednym na kategorie), wiec
        // liczymy ORGANY przez zbior NIP-ow, a przypadki sumujemy.
        ukryte.add(r.nip);
        przypadkowBezNazwy += r.przypadkow;
        continue;
      }
      let o = wg.get(r.nip);
      if (!o) {
        o = {
          nip: r.nip,
          nazwa,
          // NIE samo porownanie TERYT-u: ZUS, PFRON i BGK maja siedzibe
          // w Warszawie, wiec wychodzily jako „organ tej gminy". Patrz organy.ts.
          wlasny: organWykonawczyGminy(nazwa, r.teryt_organu, teryt),
          przypadkow: 0,
          kategorie: [],
        };
        wg.set(r.nip, o);
      }
      o.przypadkow += r.przypadkow;
      // W trybie pelnym jeden organ ma po wierszu na KOD formy, a kodow
      // w jednej kategorii jest kilkanascie — wiec kubelki skladamy.
      const juz = o.kategorie.find((k) => k.kategoria === r.kategoria);
      if (juz) {
        juz.przypadkow += r.przypadkow;
        if (r.z_kwota > 0) juz.brutto = (juz.brutto ?? 0) + r.brutto;
      } else {
        o.kategorie.push({
          kategoria: r.kategoria as KategoriaPomocy,
          przypadkow: r.przypadkow,
          brutto: r.z_kwota > 0 ? r.brutto : null,
        });
      }
    }
    const organy = [...wg.values()].sort((a, b) => {
      if (a.wlasny !== b.wlasny) return a.wlasny ? -1 : 1;
      return b.przypadkow - a.przypadkow;
    });
    for (const o of organy) o.kategorie.sort((a, b) => b.przypadkow - a.przypadkow);
    return { organy, bezNazwy: ukryte.size, przypadkowBezNazwy, pelna };
  }, pusto);
}

export type GminaOrganu = {
  teryt: string;
  nazwa: string;
  powiat: string;
  przypadkow: number;
  brutto: number | null;
};

export type OrganKrajowy = {
  nip: string;
  nazwa: string;
  /** Gmina siedziby z REGON — gdy rejestr ja zna. */
  siedziba: { teryt: string; nazwa: string; powiat: string } | null;
  przypadkow: number;
  /** W ilu gminach ten organ podjal decyzje — mianownik dla liczb nizej. */
  gmin: number;
  kategorie: KategoriaOrganu[];
  gminy: GminaOrganu[];
};

/**
 * CO TEN ORGAN ZROBIL W CALYM KRAJU.
 *
 * Dokonczenie sekcji „Kto to postanowil" z 01.10.2026: tam organy byly
 * zwyklym tekstem, wiec czytelnik widzial „Prezes Zarzadu PFRON, 1 005
 * decyzji" i nie mial gdzie klikna. Teraz ma — a pytanie „co ten organ robi
 * w innych gminach" jest naturalnym nastepnym pytaniem i nikt w Polsce na nie
 * nie odpowiada, bo nikt nie ma SUDOP.
 *
 * ZMIERZONE 02.10.2026: 910 organow w stanie sum, a PFRON to **28 907
 * decyzji w 2 066 gminach na 211,8 mln zl**.
 *
 * Czyta GOTOWY stan `pomoc_sumy_organy` indeksem po NIP-ie (bez indeksu byl
 * przebieg po tabeli — klucz glowny zaczyna sie od `teryt`). Zero grupowania
 * po tabeli pomocy, wiec pulapka 52 nie ma tu zastosowania.
 *
 * `null` oznacza „nie pokazujemy tej strony": organ nieznany ALBO organ,
 * ktorego nazwy nie wolno pokazac (pulapka 34 — udzielajacym bywa osoba
 * fizyczna; zmierzone: 13 z 1 148 ma w REGON typ F). Strona oddaje wtedy 404,
 * tak samo jak `/firma/[nip]` dla mozliwej osoby fizycznej.
 */
export function organ(nip: string): OrganKrajowy | null {
  return bezTabeli(() => {
    const kategorie = wszystkie<{ kategoria: string; przypadkow: number; z_kwota: number; brutto: number }>(
      `select kategoria, sum(przypadkow) as przypadkow, sum(z_kwota) as z_kwota, sum(brutto) as brutto
         from pomoc_sumy_organy where nip_organu = ? group by kategoria order by przypadkow desc`,
      nip,
    );
    if (!kategorie.length) return null;

    const meta = jeden<{ nazwa_sudop: string | null; nazwa_regon: string | null; typ_regon: string | null; teryt_organu: string | null }>(
      `select (select nazwa from pomoc_sumy_organy where nip_organu = ? limit 1) as nazwa_sudop,
              r.nazwa as nazwa_regon, r.typ as typ_regon, r.teryt as teryt_organu
         from regon r where r.nip = ?`,
      nip, nip,
    ) ?? { nazwa_sudop: null, nazwa_regon: null, typ_regon: null, teryt_organu: null };
    // Gdy REGON nie zna NIP-u, zostaje zapis z SUDOP — tak samo jak w sekcji gminy.
    const zSudop = meta.nazwa_sudop
      ?? jeden<{ n: string | null }>('select nazwa as n from pomoc_sumy_organy where nip_organu = ? limit 1', nip)?.n
      ?? null;
    const nazwa = nazwaOrganu(zSudop, meta.nazwa_regon);
    if (!nazwa || !nazwaPodmiotuJawna(nazwa, meta.typ_regon)) return null;

    const razem = jeden<{ przypadkow: number; gmin: number }>(
      'select sum(przypadkow) as przypadkow, count(distinct teryt) as gmin from pomoc_sumy_organy where nip_organu = ?',
      nip,
    )!;
    const gminy = wszystkie<GminaOrganu>(
      `select o.teryt as teryt, g.nazwa as nazwa, g.powiat as powiat,
              sum(o.przypadkow) as przypadkow,
              case when sum(o.z_kwota) > 0 then sum(o.brutto) else null end as brutto
         from pomoc_sumy_organy o join gminy g on g.teryt = o.teryt
        where o.nip_organu = ?
        group by o.teryt, g.nazwa, g.powiat
        order by brutto desc nulls last, przypadkow desc
        limit 12`,
      nip,
    );
    const siedziba = meta.teryt_organu
      ? jeden<{ teryt: string; nazwa: string; powiat: string }>(
        'select teryt, nazwa, powiat from gminy where teryt = ?', meta.teryt_organu,
      )
      : null;

    return {
      nip,
      nazwa,
      siedziba,
      przypadkow: razem.przypadkow,
      gmin: razem.gmin,
      kategorie: kategorie.map((k) => ({
        kategoria: k.kategoria as KategoriaPomocy,
        przypadkow: k.przypadkow,
        brutto: k.z_kwota > 0 ? k.brutto : null,
      })),
      gminy,
    };
  }, null);
}

/** NIP-y organow do mapy strony — tylko te, ktorych nazwe wolno pokazac. */
export function organyDoMapy(): string[] {
  return bezTabeli(() => wszystkie<{ nip: string; nazwa_sudop: string | null; nazwa_regon: string | null; typ: string | null }>(
    `select o.nip_organu as nip, max(o.nazwa) as nazwa_sudop, r.nazwa as nazwa_regon, r.typ as typ
       from pomoc_sumy_organy o left join regon r on r.nip = o.nip_organu
      group by o.nip_organu`,
  ).filter((r) => {
    const n = nazwaOrganu(r.nazwa_sudop, r.nazwa_regon);
    return n !== '' && nazwaPodmiotuJawna(n, r.typ);
  }).map((r) => r.nip), []);
}

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
    // Ta sama regula co przy `beneficjenci` — rejestr, nie heurystyka.
    const nazwyBeneficjentow = wszystkie<{ nazwa: string | null; max_eur: number | null; typ_regon: string | null }>(
      `select max(nazwa_beneficjenta) as nazwa, max(wartosc_brutto_eur) as max_eur,
              (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon
         from ${P} p where teryt = ? group by nip_beneficjenta`, teryt,
    ).map((r) => ({ nazwa: r.nazwa ?? '', max_eur: r.max_eur, typ_regon: r.typ_regon }));
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
    /*
     * `typ_regon` jest tu OBOWIAZKOWY, nie ozdobny. Od 24.09.2026 o jawnosci
     * nazwy rozstrzyga rejestr, nie heurystyka — ale decyzja weszla tylko
     * na strone firmy i do wyszukiwarki. ZMIERZONE 01.10.2026 na 93 287
     * nazwach: bez tego strona gminy pokazywala 48 nazw, ktore `/firma`
     * chowa, i chowala 350, ktore `/firma` pokazuje. Dwie strony tego samego
     * serwisu odpowiadaly inaczej na to samo pytanie o te sama firme.
     */
    const beneficjenci = wszystkie<{
      nazwa: string; nip: string | null; przypadkow: number; brutto: number | null;
      max_eur: number | null; typ_regon: string | null;
    }>(
      `select max(nazwa_beneficjenta) as nazwa, nip_beneficjenta as nip, count(*) as przypadkow, sum(wartosc_brutto) as brutto,
              max(wartosc_brutto_eur) as max_eur,
              (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon
         from ${P} p where teryt = ? group by nip_beneficjenta order by brutto desc nulls last limit 60`, teryt,
    );
    return { zrodlo, pobranie, razem, nazwyBeneficjentow, lata, przeznaczenia: grupa('przeznaczenie'), udzielajacy: grupa('udzielajacy'), beneficjenci };
  }, pusto);
}
