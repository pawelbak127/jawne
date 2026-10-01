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
export type Kandydat = { teryt: string; rodzaj: string };
export type SlownikGmin = Map<string, Kandydat[]>;

/**
 * TRZECIA PULAPKA, znaleziona 01.10.2026 — i powazniejsza od dwoch
 * poprzednich, bo **slownik cicho gubil klucze**.
 *
 * Pierwsza wersja trzymala `Map<string, string>` i robila `m.set(klucz, teryt)`.
 * Tymczasem **143 pary gmin maja TE SAMA nazwe w TYM SAMYM powiecie**: miasto
 * i okalajaca je gmina wiejska (Belchatow 100101/100102, Augustow, Bochnia,
 * Boleslawiec, Brodnica…). Klucz `nazwa|powiat|wojewodztwo` pasowal do obu,
 * wiec drugie `set` nadpisywalo pierwsze i **wygrywala gmina wiejska**.
 *
 * ZMIERZONE: 8 512 wpisow REGON po stronie gminy wiejskiej i **ZERO** po
 * stronie miasta, w 286 gminach. „MIASTO BELCHATOW" (NIP 7692166386) mialo
 * kod gminy WIEJSKIEJ, a „MIEJSKI ZAKLAD GOSPODARKI MIESZKANIOWEJ
 * W BOLESLAWCU" siedzial na wsi. Na tym zlaczeniu wisi 7 092 ogloszen TED
 * (zamawiajacy) i 12 600 wierszy wykonawcow.
 *
 * Rozstrzyga `miejscowosc` z BIR i nie jest to heurystyka, tylko wniosek
 * z samego rejestru: **miasto X jest dokladnie jedna miejscowoscia X**,
 * a wsie okalajacej gminy nazywaja sie inaczej. Gdy miejscowosc rowna sie
 * nazwie gminy, podmiot stoi w miescie.
 *
 * JEDEN WYJATEK, ktory rejestr sam nazywa: wlasne organy gminy wiejskiej maja
 * siedzibe w miescie, ale naleza do gminy. Poznajemy je po nazwie — `GMINA `,
 * `GMINN…`, `URZAD GMINY` (147 wpisow). Wzorzec musi byc WASKI: wsrod nazw
 * zawierajacych „GMIN" sa **„GMINA-MIASTO TOMASZOW MAZOWIECKI",
 * „GMINA-MIASTO DZIALDOWO" i „GMINA-MIASTO STARGARD"** — czyli same miasta —
 * oraz 20 ZWIAZKOW GMIN, ktore gmina wiejska nie sa. Dlatego `GMINA ` ze
 * spacja, a nie „zawiera GMIN".
 *
 * Gdy po tym nadal nie wiadomo, oddajemy `null`: „nie wiemy, ktora z dwoch"
 * jest prawda, a przypisanie szpitala miejskiego do wsi obok nia nie jest.
 */
export function slownikGmin(db: DatabaseSync): SlownikGmin {
  const m: SlownikGmin = new Map();
  for (const g of db.prepare('select teryt, nazwa, rodzaj, powiat, wojewodztwo from gminy').all() as unknown as
    { teryt: string; nazwa: string; rodzaj: string; powiat: string; wojewodztwo: string }[]) {
    const klucz = `${uprosc(g.nazwa)}|${uprosc(g.powiat)}|${uprosc(g.wojewodztwo)}`;
    m.set(klucz, [...(m.get(klucz) ?? []), { teryt: g.teryt, rodzaj: g.rodzaj }]);
  }
  return m;
}

/** Czy nazwa podmiotu mowi, ze to wlasny organ gminy, a nie miasta. */
const ORGAN_GMINY = /^(gmina |gminn|urzad gminy)/;

function rozstrzygnij(
  kandydaci: Kandydat[],
  gmina: string,
  miejscowosc: string | null,
  nazwa: string | null,
): string | null {
  if (kandydaci.length === 1) return kandydaci[0]!.teryt;
  const miasto = kandydaci.find((k) => k.rodzaj === 'miasto');
  const poza = kandydaci.find((k) => k.rodzaj !== 'miasto');
  if (!miasto || !poza || kandydaci.length > 2) return null;
  if (nazwa && ORGAN_GMINY.test(uprosc(nazwa))) return poza.teryt;
  if (miejscowosc && uprosc(miejscowosc) === gmina) return miasto.teryt;
  return poza.teryt;
}

export function terytZNazw(
  slownik: SlownikGmin,
  gmina: string | null,
  powiat: string | null,
  woj: string | null,
  miejscowosc: string | null = null,
  nazwa: string | null = null,
): string | null {
  if (!gmina || !powiat || !woj) return null;
  if (uprosc(powiat) === 'warszawa') return TERYT_WARSZAWY;

  const g = uprosc(gmina);
  const p = uprosc(powiat);
  const w = uprosc(woj);
  const wprost = slownik.get(`${g}|${p}|${w}`);
  if (wprost) return rozstrzygnij(wprost, g, miejscowosc, nazwa);

  // Delegatura miasta na prawach powiatu — patrz pulapka 2 w naglowku.
  if (g.startsWith(`${p}-`)) {
    const m = slownik.get(`${p}|${p}|${w}`);
    return m ? rozstrzygnij(m, p, miejscowosc, nazwa) : null;
  }
  return null;
}

/**
 * Przelicza `regon.teryt` z nazw, ktore juz sa w bazie. BEZ SIECI: BIR nie
 * jest pytany jeszcze raz, bo `gmina`, `powiat` i `wojewodztwo` lezą w tabeli
 * od pierwszego importu. Zwraca, ilu wierszom TERYT doszedl.
 */
export function przeliczTerytRegon(db: DatabaseSync): {
  sprawdzono: number; doszlo: number; poprawione: number; nadal: number;
} {
  const slownik = slownikGmin(db);
  /*
   * Bierzemy DWA zbiory: wiersze bez kodu i wiersze, ktorych kod nalezy do
   * pary KOLIZYJNEJ. Te drugie maja kod, ale moze byc zly — pierwsza wersja
   * slownika cicho wybierala gmine wiejska we wszystkich 143 parach (patrz
   * naglowek). Samo `where teryt is null` nigdy by ich nie tknelo, wiec blad
   * przezylby kazda migracje.
   */
  const wKolizji = new Set((db.prepare(
    "select group_concat(teryt) as t from gminy where rodzaj <> 'dzielnica Warszawy'"
    + ' group by lower(nazwa), powiat, wojewodztwo having count(*) > 1',
  ).all() as unknown as { t: string }[]).flatMap((r) => r.t.split(',')));

  const wiersze = db.prepare(
    'select nip, nazwa, gmina, powiat, wojewodztwo, miejscowosc, teryt from regon',
  ).all() as unknown as {
    nip: string; nazwa: string | null; gmina: string | null; powiat: string | null;
    wojewodztwo: string | null; miejscowosc: string | null; teryt: string | null;
  }[];
  const ustaw = db.prepare('update regon set teryt = ? where nip = ?');
  let sprawdzono = 0;
  let doszlo = 0;
  let poprawione = 0;
  let nadal = 0;
  for (const r of wiersze) {
    const bezKodu = r.teryt === null;
    if (!bezKodu && !wKolizji.has(r.teryt!)) continue;
    sprawdzono += 1;
    const t = terytZNazw(slownik, r.gmina, r.powiat, r.wojewodztwo, r.miejscowosc, r.nazwa);
    if (t === r.teryt) {
      if (bezKodu) nadal += 1;
      continue;
    }
    ustaw.run(t, r.nip);
    if (!t) nadal += 1;
    else if (bezKodu) doszlo += 1;
    else poprawione += 1;
  }
  return { sprawdzono, doszlo, poprawione, nadal };
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
