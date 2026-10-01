import type { DatabaseSync } from 'node:sqlite';
import { uprosc } from '../../src/lib/tekst.js';
import { TERYT_WARSZAWY } from './fe.js';

/**
 * Z nazw, ktore oddaje REGON (BIR), na nasz kod TERYT.
 *
 * BIR nie podaje kodu TERYT, tylko nazwy: wojewodztwo wielkimi literami,
 * powiat i gmine. Porownujemy po `uprosc()`, bo pisownia sie rozni.
 *
 * DWIE PULAPKI, obie zmierzone, obie o tym samym: **rejestr zna jednostki
 * mniejsze niz gmina, a my nie**.
 *
 *  1. Warszawa — BIR podaje DZIELNICE jako gmine, a caly serwis liczy
 *     Warszawe jako jedna jednostke 146501 (pulapka 24).
 *  2. Krakow, Lodz, Wroclaw i Poznan — BIR podaje DELEGATURY jako gmine
 *     („Krakow-Podgorze", „Lodz-Baluty", „Wroclaw-Fabryczna"), a my znamy
 *     tylko miasto. To ta sama pulapka 31, ktora w SUDOP zalatwia
 *     `terytGminyZKodu` — tam przychodzi kod konczacy sie na 9, tutaj nazwa
 *     z mysnikiem. ZMIERZONE 01.10.2026: bez tego 5 534 wpisow REGON nie
 *     dostawalo TERYT-u, a strony Krakowa, Lodzi, Wroclawia i Poznania
 *     pokazywaly **zero zamowien publicznych** — i to bez slowa wyjasnienia,
 *     bo sekcja po prostu sie nie renderuje.
 *
 * Dopasowanie po delegaturze robimy TYLKO wtedy, gdy nazwa gminy zaczyna sie
 * od nazwy powiatu z mysnikiem. Samo ciecie po pierwszym mysniku byloby
 * zgadywaniem: gminy miewaja mysniki w prawdziwych nazwach.
 */
export type SlownikGmin = Map<string, string>;

export function slownikGmin(db: DatabaseSync): SlownikGmin {
  const m: SlownikGmin = new Map();
  for (const g of db.prepare('select teryt, nazwa, powiat, wojewodztwo from gminy').all() as unknown as
    { teryt: string; nazwa: string; powiat: string; wojewodztwo: string }[]) {
    m.set(`${uprosc(g.nazwa)}|${uprosc(g.powiat)}|${uprosc(g.wojewodztwo)}`, g.teryt);
  }
  return m;
}

export function terytZNazw(
  slownik: SlownikGmin,
  gmina: string | null,
  powiat: string | null,
  woj: string | null,
): string | null {
  if (!gmina || !powiat || !woj) return null;
  if (uprosc(powiat) === 'warszawa') return TERYT_WARSZAWY;

  const g = uprosc(gmina);
  const p = uprosc(powiat);
  const w = uprosc(woj);
  const wprost = slownik.get(`${g}|${p}|${w}`);
  if (wprost) return wprost;

  // Delegatura miasta na prawach powiatu — patrz pulapka 2 w naglowku.
  if (g.startsWith(`${p}-`)) return slownik.get(`${p}|${p}|${w}`) ?? null;
  return null;
}

/**
 * Przelicza `regon.teryt` z nazw, ktore juz sa w bazie. BEZ SIECI: BIR nie
 * jest pytany jeszcze raz, bo `gmina`, `powiat` i `wojewodztwo` lezą w tabeli
 * od pierwszego importu. Zwraca, ilu wierszom TERYT doszedl.
 */
export function przeliczTerytRegon(db: DatabaseSync): { sprawdzono: number; doszlo: number; nadal: number } {
  const slownik = slownikGmin(db);
  const wiersze = db.prepare(
    'select nip, gmina, powiat, wojewodztwo from regon where teryt is null',
  ).all() as unknown as { nip: string; gmina: string | null; powiat: string | null; wojewodztwo: string | null }[];
  const ustaw = db.prepare('update regon set teryt = ? where nip = ?');
  let doszlo = 0;
  for (const r of wiersze) {
    const t = terytZNazw(slownik, r.gmina, r.powiat, r.wojewodztwo);
    if (t) {
      ustaw.run(t, r.nip);
      doszlo += 1;
    }
  }
  return { sprawdzono: wiersze.length, doszlo, nadal: wiersze.length - doszlo };
}

/**
 * Normalizuje `ted_ogloszenia.nabywca_id` tym samym filtrem, ktorym od poczatku
 * szedl NIP wykonawcy. BEZ SIECI — pole jest w bazie, tylko w surowej postaci.
 *
 * Wartosci, w ktorych NIP-u nie ma (REGON-y, numery zagraniczne, smiec),
 * zostaja ZEROWANE: zlaczenie po nich i tak nic nie znajduje, a zostawienie
 * ich udaje identyfikator. Zwraca, ile wierszy poprawiono i ile wyzerowano.
 */
export function znormalizujNabywcow(
  db: DatabaseSync,
  nipZTekstu: (t: string | null | undefined) => string | null,
): { sprawdzono: number; poprawione: number; wyzerowane: number } {
  const wiersze = db.prepare(
    "select numer, nabywca_id from ted_ogloszenia"
    + " where nabywca_id is not null and nabywca_id not glob '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'",
  ).all() as unknown as { numer: string; nabywca_id: string }[];
  const ustaw = db.prepare('update ted_ogloszenia set nabywca_id = ? where numer = ?');
  let poprawione = 0;
  let wyzerowane = 0;
  for (const r of wiersze) {
    const nip = nipZTekstu(r.nabywca_id);
    ustaw.run(nip, r.numer);
    if (nip) poprawione += 1;
    else wyzerowane += 1;
  }
  return { sprawdzono: wiersze.length, poprawione, wyzerowane };
}
