/**
 * Formatowanie do interfejsu. Czyste funkcje, bez dostepu do bazy i sieci.
 */

/**
 * Polska odmiana liczebnika.
 *
 * Regula ma wyjatek, na ktorym wywraca sie wiekszosc implementacji: koncowki
 * 2-4 daja forme mnoga ("2 glosowania"), ALE nie w zakresie 12-14
 * ("12 glosowan", nie "12 glosowania"). Testy trzymaja ten zakres osobno.
 */
export function odmien(n: number, jeden: string, kilka: string, wiele: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return jeden;
  const dziesiatki = abs % 100;
  const jednosci = abs % 10;
  if (jednosci >= 2 && jednosci <= 4 && !(dziesiatki >= 12 && dziesiatki <= 14)) return kilka;
  return wiele;
}

export function zOdmiana(n: number, jeden: string, kilka: string, wiele: string): string {
  return `${liczba(n)} ${odmien(n, jeden, kilka, wiele)}`;
}

/** Separator tysiecy zgodny z polska typografia: spacja nierozdzielajaca. */
export function liczba(n: number): string {
  return n.toLocaleString('pl-PL').replace(/ /g, ' ');
}

/**
 * Procent albo polpauza.
 *
 * Polpauza, a NIE "0" i nie "brak danych": w kolumnie liczb zero czyta sie
 * jako "zmierzylismy zero", a polpauza jako "nie mamy tej wartosci". To sa
 * dwie rozne informacje i mylenie ich jest tu bledem merytorycznym.
 */
export function procent(n: number | null | undefined, miejsc = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${n.toFixed(miejsc).replace('.', ',')} %`;
}

const MIESIACE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

/** 2026-09-16 -> "16 września 2026". Zamiana jest wylacznie prezentacyjna. */
export function dataSlownie(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, rok, mies, dzien] = m;
  const nazwa = MIESIACE[Number(mies) - 1];
  if (!nazwa) return iso;
  return `${Number(dzien)} ${nazwa} ${rok}`;
}

/** 2026-09-16 -> "16.09.2026". Do tabel, gdzie liczy sie szerokosc kolumny. */
export function dataKrotko(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/**
 * Inicjaly do zastepczego portretu.
 *
 * Nie jest to `imie.slice(0, 2)`. Polskie nazwiska bywaja dwuczlonowe
 * ("Kosiniak-Kamysz"), a imiona zlozone ("Anna Maria"), wiec bierzemy pierwsza
 * litere pierwszego czlonu i pierwsza litere OSTATNIEGO. Wielkie litery
 * podnosimy z locale, bo `toUpperCase()` bez niego psuje czesc alfabetow.
 */
export function inicjaly(pelneImie: string): string {
  const czlony = pelneImie.split(/[\s ]+/).map((c) => c.replace(/^[^\p{L}]+/u, '')).filter(Boolean);
  if (czlony.length === 0) return '?';
  const pierwszy = czlony[0]!;
  const ostatni = czlony[czlony.length - 1]!;
  const litery = czlony.length === 1 ? pierwszy.slice(0, 1) : pierwszy.slice(0, 1) + ostatni.slice(0, 1);
  return litery.toLocaleUpperCase('pl-PL');
}

/** Skraca tytul glosowania do naglowka, nie rozcinajac slowa w polowie. */
export function skroc(tekst: string, ile: number): string {
  if (tekst.length <= ile) return tekst;
  const ciety = tekst.slice(0, ile);
  const spacja = ciety.lastIndexOf(' ');
  return `${(spacja > ile * 0.6 ? ciety.slice(0, spacja) : ciety).replace(/[\s,;:.-]+$/, '')}…`;
}
