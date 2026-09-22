/**
 * SMUP — System Monitorowania Usług Publicznych (GUS), `api.smup.gov.pl`.
 *
 * Klucz w nagłówku `X-ClientId` (ta sama rodzina co BDL), zmienna
 * `SMUP_KLUCZ`. Hierarchia: obszar → usługa → wskaźnik → dane. Jeden
 * wskaźnik i rok to ok. 3 tys. wierszy, czyli jedno zapytanie przy
 * `page-size=5000` (maksimum). Pomiary: `docs/zrodla.md`.
 *
 * DLACZEGO TO ŹRÓDŁO. Budżet z BDL mówi, ILE gmina wydała. SMUP mówi, jak
 * jej idzie: ile umarza, ile traci na własnych ulgach, ile ma długu i czy
 * dochody bieżące pokrywają wydatki bieżące. Tego nie widać w żadnym innym
 * zbiorze, który dotąd mierzyliśmy.
 */

export const SMUP_BAZA = 'https://api.smup.gov.pl/api/1.0.0';
export const SMUP_ZRODLO_WWW = 'https://smup.gov.pl';

/** Wpis słownika terytorialnego SMUP (KTS). */
export type JednostkaSmup = {
  'id-teryt': number;
  woj?: string;
  pow?: string;
  gmn?: string;
  rodz?: string;
  nazwa?: string;
  'nazwa-dod'?: string;
};

/**
 * TERYT gminy (6 cyfr) z wpisu słownika SMUP — albo `null`, jeśli to nie jest
 * gmina.
 *
 * Rodzaje jak w BDL (pułapka 30 w CLAUDE.md): 1 gmina miejska, 2 wiejska,
 * 3 miejsko-wiejska. Rodzaje 4 i 5 to miasto i obszar wiejski WEWNĄTRZ gminy
 * miejsko-wiejskiej — ich dopuszczenie policzyłoby tę gminę drugi raz.
 * Dzielnice Warszawy (rodzaj 8/9) też odpadają: budżet i pomoc publiczną
 * trzymamy dla Warszawy pod 146501, tak jak w BDL, FE i SUDOP.
 * ZMIERZONE 21.09.2026: miasta na prawach powiatu mają rodzaj 1, więc
 * wchodzą tą samą drogą (66 jednostek).
 */
export function terytGminy(u: JednostkaSmup): string | null {
  const { woj, pow, gmn, rodz } = u;
  if (!woj || !pow || !gmn || !rodz) return null;
  if (!['1', '2', '3'].includes(rodz)) return null;
  const teryt = `${woj}${pow}${gmn}`;
  return /^\d{6}$/.test(teryt) ? teryt : null;
}

/** Wiersz danych SMUP. */
export type WierszSmup = {
  id: number;
  'id-daty': number;
  'id-teryt': number;
  'id-flaga': number;
  wartosc: number | null;
  precyzja: number;
};

/**
 * Flagi, przy których wartości NIE MA (zasada 4: `null` ≠ zero).
 * 2 „zjawisko nie wystąpiło” to zmierzone zero i zostaje zerem;
 * 5 „brak informacji albo tajemnica statystyczna” to brak i musi być `null`.
 */
export const FLAGI_BEZ_WARTOSCI = new Set([5]);

/** Flagi, które znamy ze słownika — nieznana jest raportowana, nie przerywa importu. */
export const FLAGI_ZNANE = new Set([1, 2, 3, 4, 5, 6]);

export const adresDanych = (id: number, rok: number, strona = 1, naStrone = 5000): string =>
  `${SMUP_BAZA}/indicator-date-data?id=${id}&id-daty=${rok}1231&page=${strona}&page-size=${naStrone}&lang=pl`;

export const adresSlownikaTeryt = (naStrone = 5000): string =>
  `${SMUP_BAZA}/teryt-dictionary?page-size=${naStrone}&lang=pl`;

export const adresWskaznikow = (naStrone = 5000): string =>
  `${SMUP_BAZA}/indicator-list?page-size=${naStrone}&lang=pl`;

export const adresLat = (): string => `${SMUP_BAZA}/data-dictionary?page-size=100&lang=pl`;

/**
 * Miara na stronie gminy: nasz klucz i wskaźniki SMUP, z których powstaje.
 *
 * `zrodla` bywa dwuelementowe, bo SMUP trzyma osobne wskaźniki dla gmin
 * i dla miast na prawach powiatu (ZMIERZONE: wskaźnik „…budżetów gmin”
 * oddaje 2 477 wierszy, bez 66 miast). Wzięcie jednego zostawiłoby
 * 66 największych miast z pustą sekcją.
 *
 * `jednostka` jest zmierzona, nie przepisana z nazwy: 4055 ma medianę 16
 * i maksimum 97 (procent), 4074 medianę 1 160 (złote na mieszkańca),
 * wskaźnik 10 medianę 22,17 (procent).
 */
export type MiaraSmup = {
  klucz: string;
  etykieta: string;
  jednostka: 'zl_na_mieszkanca' | 'procent';
  zrodla: readonly number[];
};

export const MIARY: readonly MiaraSmup[] = [
  // Budżet i dług — osobno dla gmin i dla miast na prawach powiatu.
  { klucz: 'wynik_budzetu', etykieta: 'Wynik budżetu na mieszkańca', jednostka: 'zl_na_mieszkanca', zrodla: [4068, 4418] },
  { klucz: 'nadwyzka_operacyjna', etykieta: 'Nadwyżka operacyjna na mieszkańca', jednostka: 'zl_na_mieszkanca', zrodla: [4069, 4419] },
  { klucz: 'dlug', etykieta: 'Dług na koniec roku na mieszkańca', jednostka: 'zl_na_mieszkanca', zrodla: [4074, 4424] },
  { klucz: 'dlug_do_dochodow', etykieta: 'Dług w relacji do dochodów', jednostka: 'procent', zrodla: [4055, 4405] },
  { klucz: 'udzial_majatkowych', etykieta: 'Udział wydatków majątkowych w wydatkach', jednostka: 'procent', zrodla: [4053, 4403] },
  { klucz: 'udzial_wynagrodzen', etykieta: 'Udział wynagrodzeń w wydatkach bieżących', jednostka: 'procent', zrodla: [4052, 4402] },
  { klucz: 'pokrycie_majatkowych', etykieta: 'Pokrycie wydatków majątkowych dochodami majątkowymi', jednostka: 'procent', zrodla: [4054, 4404] },

  // Podatek od nieruchomości — jeden wskaźnik obejmuje wszystkie gminy
  // (ZMIERZONE: 2 971 wierszy, w tym wszystkie 66 miast na prawach powiatu).
  { klucz: 'pn_na_mieszkanca', etykieta: 'Dochód z podatku od nieruchomości na mieszkańca', jednostka: 'zl_na_mieszkanca', zrodla: [16] },
  { klucz: 'pn_udzial', etykieta: 'Udział podatku od nieruchomości w dochodach własnych', jednostka: 'procent', zrodla: [10] },
  { klucz: 'pn_obnizone_stawki', etykieta: 'Dochody utracone przez obniżenie stawek (osoby prawne)', jednostka: 'procent', zrodla: [8] },
  { klucz: 'pn_zwolnienia_rady', etykieta: 'Zwolnienia uchwalone przez radę gminy', jednostka: 'procent', zrodla: [11] },
  { klucz: 'pn_umorzenia_prawne', etykieta: 'Umorzone zaległości — osoby prawne', jednostka: 'procent', zrodla: [13] },
  { klucz: 'pn_umorzenia_fizyczne', etykieta: 'Umorzone zaległości — osoby fizyczne', jednostka: 'procent', zrodla: [12] },
  { klucz: 'pn_zaleglosci_prawne', etykieta: 'Zaległości — osoby prawne', jednostka: 'procent', zrodla: [18] },
  { klucz: 'pn_zaleglosci_fizyczne', etykieta: 'Zaległości — osoby fizyczne', jednostka: 'procent', zrodla: [17] },
];

/** Wszystkie wskaźniki do pobrania, bez powtórzeń. */
export const wskaznikiDoPobrania = (): number[] => [...new Set(MIARY.flatMap((m) => m.zrodla))];

/**
 * Kontrola dziedziny porcji: zgodność z zamówionym wskaźnikiem i rokiem,
 * sensowność wartości. Nieznane flagi NIE przerywają importu — są raportem.
 */
export function sprawdzPorcjeSmup(wiersze: readonly WierszSmup[], id: number, rok: number): string[] {
  const problemy: string[] = [];
  wiersze.forEach((w, i) => {
    if (w.id !== id) problemy.push(`wiersz ${i}: wskaznik ${w.id}, a pytalismy o ${id}`);
    if (w['id-daty'] !== rok * 10000 + 1231) problemy.push(`wiersz ${i}: data ${w['id-daty']}, a pytalismy o ${rok}`);
    if (w.wartosc !== null && !Number.isFinite(w.wartosc)) problemy.push(`wiersz ${i}: wartosc "${w.wartosc}"`);
    if (!Number.isInteger(w['id-teryt'])) problemy.push(`wiersz ${i}: id-teryt "${w['id-teryt']}"`);
  });
  return problemy;
}

/** Wartość do zapisu: przy fladze „brak informacji” zapisujemy `null`, nie zero. */
export function wartoscDoZapisu(w: WierszSmup): number | null {
  if (FLAGI_BEZ_WARTOSCI.has(w['id-flaga'])) return null;
  return w.wartosc ?? null;
}
