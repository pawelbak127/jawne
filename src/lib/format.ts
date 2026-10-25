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

/**
 * Udzial (ulamek 0–1) do zdania: „34%”, „8,5%”, „0,4%”. Dwie cyfry znaczace —
 * przeglad tresci 24.10.2026: obok siebie stalo „62%” i „37,4%”, a dziesiate
 * czesci przy kilkudziesieciu procentach tylko udaja precyzje. Ponizej 0,05%
 * piszemy „poniżej 0,1%”, nie „0,0%” (zasada 4: to nie jest zero).
 */
export function udzial(ulamek: number | null | undefined): string {
  if (ulamek === null || ulamek === undefined || !Number.isFinite(ulamek)) return '—';
  const p = 100 * ulamek;
  if (p === 0) return '0%';
  if (p < 0.05) return 'poniżej 0,1%';
  return `${(p >= 9.95 ? Math.round(p).toString() : p.toFixed(1).replace('.', ','))}%`;
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

/**
 * Wojewodztwo w miejscowniku: „mazowieckie” → „mazowieckim” (w mazowieckim,
 * w wojewodztwie mazowieckim). Wszystkie 16 nazw to przymiotniki na „-ie”,
 * takze dwuczlonowe („warmińsko-mazurskie” → „warmińsko-mazurskim”).
 */
export function wojewodztwoWMiejscowniku(woj: string): string {
  return woj.replace(/ie$/, 'im');
}

/** Skraca tytul glosowania do naglowka, nie rozcinajac slowa w polowie. */
export function skroc(tekst: string, ile: number): string {
  if (tekst.length <= ile) return tekst;
  const ciety = tekst.slice(0, ile);
  const spacja = ciety.lastIndexOf(' ');
  return `${(spacja > ile * 0.6 ? ciety.slice(0, spacja) : ciety).replace(/[\s,;:.-]+$/, '')}…`;
}

/**
 * Kwota w zlotych do naglowka: "80,8 mln zł", "8,15 mld zł", "45,6 tys. zł", "1234 zł".
 * Brak kwoty to polpauza — nie "0 zł" (patrz `procent`).
 * Zaokraglamy do trzech cyfr znaczacych: przy miliardach dokladnosc do zlotowki
 * tylko udaje precyzje, ktorej zrodlo i tak nie gwarantuje.
 */
export function zlote(n: number | null | undefined): string {
  return kwotaWJednostce(n, 'zł');
}

/**
 * Kwota w euro, ta sama skala co `zlote`: „1,04 mld euro”, „350 tys. euro”.
 * Euro piszemy OSOBNO od zlotych i nigdy ich nie sumujemy (pulapka 23) —
 * dotyczy to CORDIS (Horyzont), ktory podaje wylacznie euro.
 */
export function euro(n: number | null | undefined): string {
  return kwotaWJednostce(n, 'euro');
}

function kwotaWJednostce(n: number | null | undefined, waluta: string): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const skala = (dzielnik: number, jedn: string) => {
    const v = n / dzielnik;
    const miejsc = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
    return `${v.toFixed(miejsc).replace('.', ',')} ${jedn} ${waluta}`;
  };
  if (abs >= 1e9) return skala(1e9, 'mld');
  if (abs >= 1e6) return skala(1e6, 'mln');
  if (abs >= 1e4) return skala(1e3, 'tys.');
  return `${liczba(Math.round(n))} ${waluta}`;
}

/**
 * Okres danych pobieranych dzien po dniu (SUDOP). Przeglad tresci 24.10.2026:
 * „w 3240 pobranych dniach … nie w całym roku” przy prawie 9 latach ciaglych
 * danych wprowadzalo w blad, a rozne liczby dni na roznych stronach (3240,
 * 3289, 3317) gryzly sie ze soba. Gdy dni sa CIAGLE, wystarczy zakres dat;
 * gdy sa dziury, mowimy ile dni brakuje — wtedy zakres sam by klamal.
 */
export function okresDni(dni: number, od: string, doDnia: string): string {
  const kalendarz = Math.round((Date.parse(`${doDnia.slice(0, 10)}T00:00:00Z`) - Date.parse(`${od.slice(0, 10)}T00:00:00Z`)) / 86_400_000) + 1;
  const zakres = `od ${dataKrotko(od)} do ${dataKrotko(doDnia)}`;
  if (!Number.isFinite(kalendarz) || kalendarz <= 0) return zakres;
  if (dni >= kalendarz) return zakres;
  const braki = kalendarz - dni;
  return `${zakres}, bez ${zOdmiana(braki, 'dnia', 'dni', 'dni')}, ${braki === 1 ? 'którego' : 'których'} jeszcze nie pobraliśmy`;
}
