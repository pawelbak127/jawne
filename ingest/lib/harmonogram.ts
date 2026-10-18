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
/** Wierszy na strone odpowiedzi SUDOP (instrukcja UOKiK: do 10 tys.). */
export const NA_STRONE = 10_000;

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

/**
 * Czy dzien jest juz ustalony: minelo 14 dni miedzy nim a dniem pobrania.
 *
 * `pobranoDzien` to POLSKA data pobrania (kolumna `pobrano_dzien`), nie
 * znacznik UTC. ZMIERZONE 22.09.2026: porownywanie daty UTC gubilo cala dobe
 * przy zadaniach nocnych — dzien 08.09 odswiezony 22.09 o 01:17 mial w UTC
 * date 21.09, wiec nie ustalal sie nigdy, a plan nocy wracal do niego w kolko.
 */
export function ustalony(dzien: string, pobranoDzien: string): boolean {
  return dniMiedzy(pobranoDzien.slice(0, 10), dzien) >= DNI_DO_USTALENIA;
}

/**
 * Ktore dni zakresu zapis ma zostawic NIETKNIETE: te, ktore juz sa w bazie
 * i sa ustalone (15.10.2026). Nakladajacy sie zakres, ktory konczy sie pozniej,
 * przepisywal je z nowa data pobrania, a dla sum przyrostowych to „policzony
 * dzien pobrano od nowa” — stan liczyl sie od zera (7 647 s na serwerze).
 * Dzien ustalony sie nie zmienia (pulapka 37). Jawne --odswiez przepisuje wszystko.
 */
export function dniDoZachowania(wBazie: readonly DzienPobrany[], odswiez: boolean): Set<string> {
  if (odswiez) return new Set();
  return new Set(wBazie.filter((d) => ustalony(d.dzien, d.pobrano)).map((d) => d.dzien));
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
  // „zawsze" to praca ciagla. Ma sens dopiero od 25.09.2026: kolejka urzedu
  // odpowiada po ~52 minutach niezaleznie od pory i od wielkosci zapytania,
  // wiec okno godzinowe nic nie chroni — ogranicza tylko nas.
  if (okno === 'zawsze') return true;
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(okno);
  if (!m) throw new Error(`Okno podaj jako GG:MM-GG:MM albo "zawsze" (jest: "${okno}")`);
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

export type DzienPobrany = {
  dzien: string; pobrano: string;
  /** Ile przypadkow ma dzien w bazie — do oceny, czy wznowienie zakresu sie oplaca. */
  wierszy?: number | null;
};

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
  /**
   * Zakresy, ktorych TERAZ nie probujemy — ich kolejka nie oddala wyniku,
   * a przerwa jeszcze nie minela (patrz `nieudane-zakresy.ts`). Pominiety
   * zakres ze stronami na dysku REZERWUJE swoje brakujace dni — nikt nie
   * zaczyna ich od strony 1 — a historia idzie w tym czasie dalej wstecz
   * (pulapka 77). Zakres, ktorego pierwsza strona nie wrocila, na dysku nic
   * nie ma, wiec tu nie trafia — jego dni bierze krotszy krok „historia".
   */
  pomijaj?: ReadonlySet<string>;
  /**
   * Ile stron zostalo do pobrania w przerwanym zakresie (`null` = nie wiadomo).
   * Wolane tylko dla zakresow, ktore naprawde sa w planie — czytanie pierwszej
   * strony z dysku nie jest darmowe.
   */
  zostaloStron?: (zakres: string) => number | null;
  /** Liczba wynikow przerwanego zakresu z jego pierwszej strony (`null` = nie wiadomo). */
  wynikowZakresu?: (zakres: string) => number | null;
}): ZakresDoPobrania[] {
  const dlugosc = p.dlugosc ?? DNI_W_ZAKRESIE;
  const wczoraj = dodajDni(p.dzis, -1);
  const ostatniDoUstalenia = dodajDni(p.dzis, -DNI_DO_USTALENIA);
  const mamy = new Set(p.dni.map((d) => d.dzien));
  const plan: ZakresDoPobrania[] = [];

  /*
   * 1. Przerwane: strony zakresu leza na dysku, a czesci dni nie ma w bazie.
   *    Wznowienie uzywa zapisanych stron — tanszego kroku nie ma.
   *
   * ZMIERZONE 14.10.2026 na serwerze: historia przez dobe nie dolozyla ani
   * dnia, choc zuzywala caly przydzial. Dzien 2020-06-20 ma 1 203 518
   * przypadkow (121 stron), a urzad oddawal co kilkadziesiat stron blad 500.
   * Kazdy blad odkladal zakres i tworzyl NOWY, krotszy, nakladajacy sie
   * (14–20.06, 15–20.06, 18–20.06, 20.06) — kazdy od strony 1, a przebiegi
   * skakaly miedzy nimi. Na dysku lezalo 71 + 55 + 78 + 116 stron, w wiekszosci
   * tego samego dnia, i zaden zestaw nie dobiegal konca. Dlatego:
   *  - zakres jednodniowy w przerwie REZERWUJE swoje dni: nie ma czego ciac,
   *    a nowy zakres na tym dniu zaczynalby od strony 1;
   *  - z nakladajacych sie przerwanych bierzemy ten, ktoremu zostalo najmniej
   *    stron (bez tej wiedzy — najwezszy), a pozostale pomijamy.
   */
  /*
   * ZMIERZONE 16–18.10.2026 na serwerze: zakres 2020-05-02..2020-05-08 padl
   * na stronie 50 z 62, bo kolejka urzedu zwolnila z 1–5 do 20–55 minut na
   * strone. Przerwa po porazce oddawala jego dni krokowi „historia", ktory
   * tworzyl NOWE zakresy od strony 1: 05-06..08, 05-08, 05-07, 05-01..07,
   * 05-04..06, 04-28..05-03, 05-01..05-03 — w dwa dni ok. 120 stron na dni,
   * ktorym brakowalo 12. Ciecie na pol (pulapka 26) pomaga, gdy kolejka nie
   * policzy wyniku w ogole — wtedy pada strona 1 i na dysku nie ma nic.
   * Gdy strony juz sa, kazda kolejna to osobne zapytanie o 10 tys. wierszy,
   * wiec krotszy zakres nie skraca czekania, tylko zaczyna od nowa. Dlatego:
   *  - zakres W PRZERWIE ze stronami na dysku REZERWUJE swoje brakujace dni
   *    (dawniej tylko jednodniowy), a historia idzie w tym czasie dalej wstecz;
   *  - wybor z nakladajacych sie obejmuje tez zakresy w przerwie — wygrywa
   *    najblizszy konca, a jesli jest w przerwie, dni czekaja na niego;
   *  - zakresu NIE wznawiamy, gdy samych brakujacych dni jest mniej stron niz
   *    zostalo do pobrania (04-28..05-03: 74 strony, a brakujace 28–30.04
   *    to ok. 56) — wtedy wezmie je zwykly krok, od nowa.
   */
  const pokryte = new Set<string>();
  const zarezerwowane = new Set<string>();
  const wierszyDnia = new Map(p.dni.map((d) => [d.dzien, d.wierszy ?? null]));
  const kandydaci: { z: string; od: string; doDnia: string; dni: string[]; wPrzerwie: boolean }[] = [];
  for (const z of p.zakresyPlikow) {
    const [od, doDnia] = z.split('..') as [string, string];
    if (doDnia > wczoraj) continue;
    const dni = dniZakresu(od, doDnia);
    if (dni.every((d) => mamy.has(d))) continue;
    kandydaci.push({ z, od, doDnia, dni, wPrzerwie: p.pomijaj?.has(z) ?? false });
  }
  const zostalo = new Map(kandydaci.map((k) => [k.z, p.zostaloStron?.(k.z) ?? null]));
  /** Czy wznowienie jest tansze niz pobranie od nowa samych brakujacych dni. */
  const oplacaSie = (k: (typeof kandydaci)[number]): boolean => {
    const zo = zostalo.get(k.z) ?? null;
    const wynikow = p.wynikowZakresu?.(k.z) ?? null;
    if (zo === null || wynikow === null) return true;
    let wBazie = 0;
    for (const d of k.dni) {
      if (!mamy.has(d)) continue;
      const w = wierszyDnia.get(d) ?? null;
      if (w === null) return true; // nie wiemy, ile dzien ma — wznawiamy jak dotad
      wBazie += w;
    }
    return Math.ceil(Math.max(0, wynikow - wBazie) / NA_STRONE) >= zo;
  };
  const wartosciowe = kandydaci.filter(oplacaSie);
  wartosciowe.sort((a, b) => {
    const x = zostalo.get(a.z) ?? null;
    const y = zostalo.get(b.z) ?? null;
    if (x !== null && y !== null && x !== y) return x - y;
    if ((x === null) !== (y === null)) return x === null ? 1 : -1;
    return a.dni.length - b.dni.length || a.od.localeCompare(b.od);
  });
  const wybrane: ZakresDoPobrania[] = [];
  for (const k of wartosciowe) {
    if (k.dni.some((d) => pokryte.has(d))) continue;
    for (const d of k.dni) pokryte.add(d);
    if (k.wPrzerwie) {
      for (const d of k.dni) if (!mamy.has(d)) zarezerwowane.add(d);
      continue;
    }
    wybrane.push({ od: k.od, do: k.doDnia, odswiez: false, powod: 'przerwane' });
  }
  // Kolejnosc w planie jak dotad — od najstarszego — zeby nie zmieniac tego,
  // co juz dziala; wybor nakladajacych sie zakresow robi sortowanie wyzej.
  plan.push(...wybrane.sort((a, b) => a.od.localeCompare(b.od)));

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
  //    od ostatniego dnia, ktory jest juz ustalony. Dni zarezerwowane przez
  //    zakres w przerwie przeskakujemy — historia idzie dalej wstecz, a te
  //    dni wroca razem z nim, gdy minie przerwa.
  //    Przeskakujemy tylko blok PRZYLEGLY do pobranych dni; zarezerwowanych
  //    dni dalej wstecz zakres historii nie obejmuje (przycinamy go), zeby
  //    nie zaczynal od strony 1 tego, co czeka na wznowienie.
  let start = pierwszy ?? dodajDni(ostatniDoUstalenia, 1);
  while (zarezerwowane.has(dodajDni(start, -1))) start = dodajDni(start, -1);
  const koniecHistorii = dodajDni(start, -1);
  if (koniecHistorii >= p.poczatekOkna) {
    let od = dodajDni(koniecHistorii, -(dlugosc - 1));
    if (od < p.poczatekOkna) od = p.poczatekOkna;
    for (let d = koniecHistorii; d >= od; d = dodajDni(d, -1)) {
      if (zarezerwowane.has(d)) { od = dodajDni(d, 1); break; }
    }
    plan.push({ od, do: koniecHistorii, odswiez: false, powod: 'historia' });
  }
  return plan;
}

/**
 * Czy zadanie dzienne czeka na blokade SUDOP — wtedy historia ustepuje po
 * biezacej stronie, zamiast konczyc caly przydzial.
 *
 * ZMIERZONE 17–18.10.2026: przy kolejce urzedu po 20–55 minut na strone
 * przebieg historii (20 zapytan) trwal 6–10 godzin, a zadanie dzienne
 * czekalo na blokade od 22:00 do 04:38. Swiezy dzien i dzien do ustalenia
 * spoznialy sie o caly przebieg — dwie noce pod rzad.
 *
 * Znacznik zapisuje `deploy/zadanie.sh` przed `flock`: PID procesu, ktory
 * czeka (po `exec` to sam `flock`, zywy az do konca zadania dziennego).
 * Martwy PID albo znacznik starszy niz doba to resztka po awarii — wtedy nie
 * ustepujemy, bo historia stalaby w miejscu bez powodu.
 */
export function dzienneCzeka(tresc: string | null, wiekMs: number, zyje: (pid: number) => boolean): boolean {
  if (tresc === null) return false;
  const pid = Number(tresc.trim());
  if (!Number.isInteger(pid) || pid <= 1) return false;
  if (wiekMs > 24 * 3600_000) return false;
  return zyje(pid);
}
