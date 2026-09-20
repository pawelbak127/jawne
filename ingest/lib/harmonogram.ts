/**
 * Harmonogram pobierania SUDOP na serwerze — czyste funkcje, bez sieci i bazy.
 *
 * Dwa zadania, dwa rytmy:
 *  - DZIENNE: wczorajszy dzien (swiezy, niepelny) i dzien sprzed 14 dni
 *    (juz ustalony). Dwa zapytania na dobe, tak jak w GitHub Actions.
 *  - NOCNE: uzupelnianie tego, czego brakuje, z limitem zapytan i tylko
 *    w oknie godzin. Kolejnosc: najpierw to, co zaczete (przerwane zakresy
 *    maja juz czesc stron na dysku), potem dni do odswiezenia, dziury,
 *    a dopiero na koncu historia wstecz.
 *
 * Czas liczymy po polsku (Europe/Warsaw), a nie w UTC: SUDOP podaje daty
 * udzielenia pomocy w polskim kalendarzu, a o 01:17 w Warszawie w UTC jest
 * jeszcze poprzedni dzien — "wczoraj" wg UTC to byloby przedwczoraj.
 */

/**
 * Dzien jest USTALONY, gdy od jego daty do pobrania minelo 14 dni: urzedy
 * maja 7 dni na zgloszenie pomocy, plus tydzien zapasu na publikacje.
 * Musi sie zgadzac z DNI_DO_USTALENIA w src/lib/dane.ts i scripts/stan-danych.mjs.
 */
export const DNI_DO_USTALENIA = 14;

/** Dlugosc zakresu w nocnym uzupelnianiu: tydzien to zwykle 2–6 stron odpowiedzi. */
export const DNI_W_ZAKRESIE = 7;

const STREFA = 'Europe/Warsaw';

/** Data kalendarzowa w Polsce, RRRR-MM-DD. */
export function dzienWarszawa(chwila: Date): string {
  const czesci = new Intl.DateTimeFormat('en-GB', { timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(chwila);
  const cz = (typ: string) => czesci.find((c) => c.type === typ)!.value;
  return `${cz('year')}-${cz('month')}-${cz('day')}`;
}

export function dodajDni(dzien: string, n: number): string {
  const d = new Date(`${dzien}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dniMiedzy = (pozniej: string, wczesniej: string) =>
  Math.round((Date.parse(`${pozniej}T00:00:00Z`) - Date.parse(`${wczesniej}T00:00:00Z`)) / 86_400_000);

/** Czy dzien pobrany w chwili `pobrano` (ISO) byl juz wtedy ustalony. */
export function ustalony(dzien: string, pobrano: string): boolean {
  return dniMiedzy(pobrano.slice(0, 10), dzien) >= DNI_DO_USTALENIA;
}

/**
 * Co zadanie dzienne ma zrobic z dniem sprzed 14 dni.
 *
 * „brak" to nie to samo co „nieustalony": dnia, ktorego w ogole nie mamy,
 * nie odswiezamy pojedynczo — jest dziura i wejdzie w zakres nocny razem
 * z sasiadami. Pytanie o niego osobno to jedno zapytanie do urzedu wiecej
 * za te same dane.
 */
export function stanDnia(dzien: string, pobrano: string | null | undefined): 'brak' | 'ustalony' | 'nieustalony' {
  if (!pobrano) return 'brak';
  return ustalony(dzien, pobrano) ? 'ustalony' : 'nieustalony';
}

/**
 * Czy chwila miesci sie w oknie godzin (czas polski), np. "01:00-06:00".
 * Okno moze przechodzic przez polnoc: "23:00-05:00".
 */
export function wOknie(chwila: Date, okno: string): boolean {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(okno);
  if (!m) throw new Error(`Okno podaj jako GG:MM-GG:MM, np. 01:00-06:00 (jest: "${okno}")`);
  const od = Number(m[1]) * 60 + Number(m[2]);
  const doMinuty = Number(m[3]) * 60 + Number(m[4]);
  const [g, min] = new Intl.DateTimeFormat('en-GB', { timeZone: STREFA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(chwila).split(':').map(Number);
  const teraz = g! * 60 + min!;
  return od <= doMinuty ? teraz >= od && teraz < doMinuty : teraz >= od || teraz < doMinuty;
}

/** Zakresy "OD..DO" z nazw zapisanych stron odpowiedzi (przyrost-OD-DO-sN.json[.gz]). */
export function zakresyZPlikow(nazwy: readonly string[]): string[] {
  const zakresy = new Set<string>();
  for (const n of nazwy) {
    const m = /^przyrost-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})-s\d+\.json(\.gz)?$/.exec(n);
    if (m) zakresy.add(`${m[1]}..${m[2]}`);
  }
  return [...zakresy].sort();
}

export type DzienPobrany = { dzien: string; pobrano: string };

export type ZakresDoPobrania = {
  od: string;
  do: string;
  /** Pobrac ponownie mimo zapisanych stron — dzien juz jest, ale niepelny. */
  odswiez: boolean;
  powod: 'przerwane' | 'nieustalone' | 'dziura' | 'historia';
};

/** Dni sklejone w ciagle zakresy nie dluzsze niz `dlugosc`. */
function sklej(dni: readonly string[], dlugosc: number): [string, string][] {
  const zakresy: [string, string][] = [];
  for (const d of [...dni].sort()) {
    const ost = zakresy[zakresy.length - 1];
    if (ost && dodajDni(ost[1], 1) === d && dniMiedzy(d, ost[0]) < dlugosc) ost[1] = d;
    else zakresy.push([d, d]);
  }
  return zakresy;
}

function dniZakresu(od: string, doDnia: string): string[] {
  const dni: string[] = [];
  for (let d = od; d <= doDnia; d = dodajDni(d, 1)) dni.push(d);
  return dni;
}

/**
 * Co pobrac w nocy, w kolejnosci pilnosci. Zadanie bierze pierwszy zakres,
 * pobiera go i liczy plan od nowa — wiec funkcja nie musi przewidywac,
 * jak baza bedzie wygladac po kolejnych krokach.
 *
 * Swiezych dni (wczoraj) tu nie ma — to robota zadania dziennego.
 */
export function planHistorii(p: {
  dni: readonly DzienPobrany[];
  zakresyPlikow: readonly string[];
  dzis: string;
  poczatekOkna: string;
  dlugosc?: number;
}): ZakresDoPobrania[] {
  const dlugosc = p.dlugosc ?? DNI_W_ZAKRESIE;
  const wczoraj = dodajDni(p.dzis, -1);
  const ostatniDoUstalenia = dodajDni(p.dzis, -DNI_DO_USTALENIA);
  const mamy = new Set(p.dni.map((d) => d.dzien));
  const plan: ZakresDoPobrania[] = [];

  // 1. Przerwane: strony zakresu leza na dysku, a czesci dni nie ma w bazie.
  //    Wznowienie uzywa zapisanych stron — tanszego kroku nie ma.
  const pokryte = new Set<string>();
  for (const z of p.zakresyPlikow) {
    const [od, doDnia] = z.split('..') as [string, string];
    if (doDnia > wczoraj) continue;
    const dni = dniZakresu(od, doDnia);
    if (dni.every((d) => mamy.has(d))) continue;
    plan.push({ od, do: doDnia, odswiez: false, powod: 'przerwane' });
    for (const d of dni) pokryte.add(d);
  }

  // 2. Nieustalone: pobrane za wczesnie, a 14 dni juz minelo. Normalnie
  //    odswieza je zadanie dzienne; tu zostaja zaleglosci (np. po awarii).
  const nieustalone = p.dni
    .filter((d) => d.dzien <= ostatniDoUstalenia && !ustalony(d.dzien, d.pobrano) && !pokryte.has(d.dzien))
    .map((d) => d.dzien);
  for (const [od, doDnia] of sklej(nieustalone, dlugosc)) plan.push({ od, do: doDnia, odswiez: true, powod: 'nieustalone' });

  // 3. Dziury w srodku pobranego zakresu.
  const posortowane = [...mamy].sort();
  const pierwszy = posortowane[0];
  const ostatni = posortowane[posortowane.length - 1];
  if (pierwszy && ostatni) {
    const dziury = dniZakresu(pierwszy, ostatni < wczoraj ? ostatni : wczoraj)
      .filter((d) => !mamy.has(d) && !pokryte.has(d));
    for (const [od, doDnia] of sklej(dziury, dlugosc)) plan.push({ od, do: doDnia, odswiez: false, powod: 'dziura' });
  }

  // 4. Historia wstecz, jeden zakres. Bez zadnego dnia w bazie zaczynamy
  //    od ostatniego dnia, ktory jest juz ustalony.
  const koniecHistorii = pierwszy ? dodajDni(pierwszy, -1) : ostatniDoUstalenia;
  if (koniecHistorii >= p.poczatekOkna) {
    const od = dodajDni(koniecHistorii, -(dlugosc - 1));
    plan.push({ od: od < p.poczatekOkna ? p.poczatekOkna : od, do: koniecHistorii, odswiez: false, powod: 'historia' });
  }
  return plan;
}
