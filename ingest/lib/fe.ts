/**
 * Listy projektow z Funduszy Europejskich (MFiPR, dane.gov.pl, zbiory
 * 1176 i 13939). Czyste funkcje — bez sieci i bazy.
 *
 * ZMIERZONE 17.09.2026:
 *  - 2021-2027: 34 348 projektow, naglowek w wierszu 2, dane od 3.
 *  - 2014-2020: 103 824 projekty, naglowek w wierszach 2-3, dane od 4,
 *    INNY uklad kolumn.
 *  - Lokalizacja to tekst: "WOJ.: X, POW.: Y, GM.: Z | WOJ.: ...". Segmentow
 *    z gmina 55 413, z samym powiatem 9 919, z samym wojewodztwem albo
 *    "Cały Kraj" 3 977. Gmina wiejska o nazwie miasta ma dopisek
 *    " - Gmina wiejska". Powiat bywa przymiotnikiem ("braniewski") albo
 *    nazwa miasta na prawach powiatu ("Biała Podlaska").
 *  - Projekty programow Interreg (2014-2020) maja kwoty w EURO, nie w zl —
 *    tak mowi naglowek kolumny. Nie przeliczamy ich po zgadnietym kursie.
 *  - Daty sa liczbami seryjnymi Excela.
 *  - Brak NIP-u beneficjenta. Brak kodow TERYT.
 */
import { uprosc } from '../../src/lib/tekst.js';

export type Okres = '2021-2027' | '2014-2020';

export type SegmentLokalizacji =
  | { poziom: 'kraj' }
  | { poziom: 'wojewodztwo'; wojewodztwo: string }
  | { poziom: 'powiat'; wojewodztwo: string; powiat: string }
  | { poziom: 'gmina'; wojewodztwo: string; powiat: string | null; gmina: string; wiejska: boolean };

export function czytajLokalizacje(tekst: string): SegmentLokalizacji[] {
  const wynik: SegmentLokalizacji[] = [];
  for (const surowy of tekst.split('|')) {
    const s = surowy.trim();
    if (!s) continue;
    if (/^cały\s+kraj$/i.test(s)) {
      wynik.push({ poziom: 'kraj' });
      continue;
    }
    const woj = /WOJ\.:\s*([^,|]+)/.exec(s)?.[1]?.trim();
    const pow = /POW\.:\s*([^,|]+)/.exec(s)?.[1]?.trim() ?? null;
    let gm = /GM\.:\s*(.+)$/.exec(s)?.[1]?.trim() ?? null;
    // Pusty zapis ("WOJ.:", "WOJ.: X,") wystepuje w danych — pomijamy go
    // jawnie, zamiast wytwarzac segment z pusta nazwa.
    if (!woj) continue;
    if (!gm) {
      wynik.push(pow ? { poziom: 'powiat', wojewodztwo: woj, powiat: pow } : { poziom: 'wojewodztwo', wojewodztwo: woj });
      continue;
    }
    // Dopisek bywa uciety przez limit komorki Excela ("Gmina wi").
    let wiejska = false;
    const dopisek = /\s+-\s+Gmina\s+w\S*$/i.exec(gm);
    if (dopisek) {
      wiejska = true;
      gm = gm.slice(0, dopisek.index).trim();
    }
    wynik.push({ poziom: 'gmina', wojewodztwo: woj, powiat: pow, gmina: gm, wiejska });
  }
  return wynik;
}

export type GminaDoDopasowania = {
  teryt: string;
  nazwa: string;
  rodzaj: string;
  powiat: string;
  wojewodztwo: string;
};

export type IndeksGmin = Map<string, GminaDoDopasowania[]>;

export function indeksGmin(gminy: readonly GminaDoDopasowania[]): IndeksGmin {
  const m: IndeksGmin = new Map();
  for (const g of gminy) {
    const k = `${uprosc(g.wojewodztwo)}|${uprosc(g.nazwa)}`;
    m.set(k, [...(m.get(k) ?? []), g]);
  }
  return m;
}

/** TERYT m.st. Warszawy. PKW rozpisuje ja na 18 dzielnic, lista UE — nie. */
export const TERYT_WARSZAWY = '146501';

const MIEJSKIE = new Set(['miasto', 'miasto na prawach powiatu']);

/**
 * Dopasowanie segmentu do gminy. Zwraca TERYT albo null — nigdy "najblizszy
 * trafiony", bo pomylenie miasta Bełchatów z gmina Bełchatów przypisaloby
 * pieniadze nie tej gminie.
 */
export function dopasujGmine(seg: Extract<SegmentLokalizacji, { poziom: 'gmina' }>, indeks: IndeksGmin): string | null {
  if (uprosc(seg.wojewodztwo) === 'mazowieckie' && uprosc(seg.gmina) === 'warszawa') return TERYT_WARSZAWY;

  let kandydaci = indeks.get(`${uprosc(seg.wojewodztwo)}|${uprosc(seg.gmina)}`) ?? [];
  if (kandydaci.length > 1 && seg.powiat) {
    const powiat = uprosc(seg.powiat);
    const wPowiecie = kandydaci.filter((g) => uprosc(g.powiat) === powiat);
    if (wPowiecie.length) kandydaci = wPowiecie;
  }
  if (kandydaci.length > 1) {
    kandydaci = seg.wiejska
      ? kandydaci.filter((g) => g.rodzaj === 'gmina')
      : kandydaci.filter((g) => MIEJSKIE.has(g.rodzaj));
  }
  return kandydaci.length === 1 ? kandydaci[0]!.teryt : null;
}

/**
 * Indeks powiatow: (wojewodztwo, nazwa powiatu z PKW) -> 4-cyfrowy kod powiatu
 * oraz gmina, jesli powiat JEST gmina (miasto na prawach powiatu).
 *
 * Potrzebne, bo lista 2014-2020 podaje lokalizacje TYLKO do powiatu
 * (zmierzone: 131 258 segmentow z powiatem, 0 z gmina).
 */
export type Powiat = { kod: string; gminaMiasto: string | null };
export type IndeksPowiatow = Map<string, Powiat>;

export function indeksPowiatow(gminy: readonly GminaDoDopasowania[]): IndeksPowiatow {
  const kody = new Map<string, Set<string>>();
  const miasta = new Map<string, string>();
  for (const g of gminy) {
    const k = `${uprosc(g.wojewodztwo)}|${uprosc(g.powiat)}`;
    kody.set(k, (kody.get(k) ?? new Set<string>()).add(g.teryt.slice(0, 4)));
    if (g.rodzaj === 'miasto na prawach powiatu') miasta.set(k, g.teryt);
  }
  const m: IndeksPowiatow = new Map();
  for (const [k, zbior] of kody) {
    // Niejednoznaczny powiat (ta sama nazwa, dwa kody) pomijamy — jak w dopasujGmine.
    if (zbior.size === 1) m.set(k, { kod: [...zbior][0]!, gminaMiasto: miasta.get(k) ?? null });
  }
  return m;
}

export function dopasujPowiat(wojewodztwo: string, powiat: string, indeks: IndeksPowiatow): Powiat | null {
  if (uprosc(wojewodztwo) === 'mazowieckie' && uprosc(powiat) === 'warszawa') {
    return { kod: TERYT_WARSZAWY.slice(0, 4), gminaMiasto: TERYT_WARSZAWY };
  }
  return indeks.get(`${uprosc(wojewodztwo)}|${uprosc(powiat)}`) ?? null;
}

/** Liczba seryjna Excela -> RRRR-MM-DD. Excel liczy dni od 1899-12-30. */
export function dataZExcela(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return new Date(Math.round((v - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

export function liczbaZKomorki(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function tekstZKomorki(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown };
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if (typeof o.text === 'string') return o.text;
    if (o.result !== undefined) return String(o.result);
    return '';
  }
  return String(v);
}

export type ProjektFe = {
  okres: Okres;
  numerUmowy: string | null;
  tytul: string;
  beneficjent: string | null;
  fundusz: string | null;
  program: string | null;
  wartosc: number | null;
  dofinansowanieUe: number | null;
  waluta: 'PLN' | 'EUR';
  poczatek: string | null;
  koniec: string | null;
  lokalizacja: string;
};

/**
 * Uklad kolumn — z naglowkow, zmierzony. ExcelJS numeruje kolumny od 1.
 * Kontrola naglowka jest w imporcie: jesli ministerstwo przesunie kolumny,
 * import stanie, zamiast wczytac kwoty jako daty.
 */
export const UKLAD: Record<Okres, {
  pierwszyWiersz: number;
  wierszNaglowka: number;
  kolumny: Record<'tytul' | 'numer' | 'beneficjent' | 'fundusz' | 'program' | 'wartosc' | 'ue' | 'lokalizacja' | 'poczatek' | 'koniec', number>;
  oczekiwane: Record<number, RegExp>;
}> = {
  '2021-2027': {
    pierwszyWiersz: 3,
    wierszNaglowka: 2,
    kolumny: { tytul: 1, numer: 3, beneficjent: 4, fundusz: 7, program: 9, wartosc: 12, ue: 14, lokalizacja: 16, poczatek: 17, koniec: 18 },
    oczekiwane: { 1: /^Nazwa projektu/, 4: /^Nazwa beneficjenta/, 12: /^Wartość projektu/, 14: /^Dofinansowanie z UE/, 16: /^Miejsce realizacji/ },
  },
  '2014-2020': {
    pierwszyWiersz: 4,
    wierszNaglowka: 3,
    kolumny: { tytul: 1, numer: 3, beneficjent: 4, fundusz: 5, program: 6, wartosc: 10, ue: 12, lokalizacja: 15, poczatek: 17, koniec: 18 },
    oczekiwane: { 1: /^Tytuł projektu/, 4: /^Nazwa beneficjenta/, 10: /^Wartość projektu \(w zł, dla projektów EWT w euro\)/, 12: /^Wartość unijnego dofinansowania/, 15: /^Miejsce realizacji/ },
  },
};

export function sprawdzNaglowek(okres: Okres, naglowek: readonly unknown[]): string[] {
  const bledy: string[] = [];
  for (const [kol, wzor] of Object.entries(UKLAD[okres].oczekiwane)) {
    // Zmierzone: naglowki ministerstwa zawieraja twarde spacje (U+00A0),
    // np. "Miejsce realizacji", "(w zł)". Porownujemy po normalizacji.
    const t = tekstZKomorki(naglowek[Number(kol)]).replace(/\s+/g, ' ').trim();
    if (!wzor.test(t)) bledy.push(`kolumna ${kol}: "${t.slice(0, 60)}" nie pasuje do ${wzor}`);
  }
  return bledy;
}

/** Programy, w ktorych kwoty sa w euro — zgodnie z naglowkiem listy 2014-2020. */
export function walutaProgramu(okres: Okres, program: string | null): 'PLN' | 'EUR' {
  if (okres === '2014-2020' && program && /interreg|europejska współpraca terytorialna/i.test(program)) return 'EUR';
  return 'PLN';
}

export function wierszNaProjekt(okres: Okres, v: readonly unknown[]): ProjektFe | null {
  const k = UKLAD[okres].kolumny;
  const tytul = tekstZKomorki(v[k.tytul]).trim();
  if (!tytul) return null;
  const program = tekstZKomorki(v[k.program]).trim() || null;
  return {
    okres,
    numerUmowy: tekstZKomorki(v[k.numer]).trim() || null,
    tytul,
    beneficjent: tekstZKomorki(v[k.beneficjent]).trim() || null,
    fundusz: tekstZKomorki(v[k.fundusz]).trim() || null,
    program,
    wartosc: liczbaZKomorki(v[k.wartosc]),
    dofinansowanieUe: liczbaZKomorki(v[k.ue]),
    waluta: walutaProgramu(okres, program),
    poczatek: dataZExcela(v[k.poczatek]),
    koniec: dataZExcela(v[k.koniec]),
    lokalizacja: tekstZKomorki(v[k.lokalizacja]).trim(),
  };
}
