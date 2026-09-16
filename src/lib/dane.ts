import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { KLUBY, type Klub } from './kluby';

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
    `select g.posiedzenie as posiedzenie, g.numer as numer, g.data as data,
            g.tytul as tytul, g.temat as temat, g.za as za, g.przeciw as przeciw,
            g.wstrzymalo as wstrzymalo, g.nieobecnych as nieobecnych, s.glos as glos
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
};

export function ostatnieGlosowania(ile = 12): GlosowanieSkrot[] {
  return wszystkie<GlosowanieSkrot>(
    `select posiedzenie, numer, data, tytul, temat, za, przeciw, wstrzymalo, nieobecnych
       from glosowania
      order by data desc, posiedzenie desc, numer desc
      limit ?`,
    ile,
  );
}

export type Glosowanie = GlosowanieSkrot & {
  dzien: number | null;
  opis: string | null;
  rodzaj: string | null;
  typ_wiekszosci: string | null;
  glosowalo: number;
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
export function stronaGlosowan(offset: number, limit: number): GlosowanieSkrot[] {
  return wszystkie<GlosowanieSkrot>(
    `select posiedzenie, numer, data, tytul, temat, za, przeciw, wstrzymalo, nieobecnych
       from glosowania
      order by data desc, posiedzenie desc, numer desc
      limit ? offset ?`,
    limit, offset,
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
  try {
    const w = jeden<{ typ: string; bajty: Uint8Array }>(
      'select typ, bajty from zdjecia where posel_id = ?', id,
    );
    return w ? { typ: w.typ, bajty: w.bajty } : null;
  } catch (e) {
    // Brak tabeli = nie uruchomiono etapu "zdjecia". To jest brakujacy etap
    // importu, a nie awaria — trasa narysuje inicjaly i serwis dziala dalej.
    // Kazdy inny blad SQL-a przepuszczamy, bo oznacza realna usterke.
    if (e instanceof Error && /no such table/i.test(e.message)) return null;
    throw e;
  }
}
