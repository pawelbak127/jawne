/**
 * SUDOP — pomoc publiczna i de minimis (UOKiK).
 *
 * ZMIERZONE 17.09.2026, czego poprzedni projekt nie widzial:
 *  - Sciezka Z KOLEJKA dziala: rejestracja -> 303 /api/kolejka/{id} ->
 *    trzy razy 200 "czekaj" -> po 4 minutach 303 /api/wynik/{id} -> 200.
 *    Wczesniejsze pomiary odpytywaly godzine wylacznie sciezke `bez-kolejki`.
 *  - Oficjalna instrukcja (dane.gov.pl, zbior 6068): daty RRRR-MM-DD,
 *    limit 15 zapytan na minute, okno danych 10 lat (od 1.01 roku n-10).
 *  - Eksport `?csv=true` jest WADLIWY: pola z przecinkami nie sa w cudzyslowie
 *    (28 kolumn w naglowku, 29 w pierwszym wierszu). Czytamy wylacznie JSON.
 *  - Kod gminy ma 7 cyfr: TERYT + rodzaj (1 miejska, 2 wiejska, 3/4/5 gmina
 *    miejsko-wiejska / jej miasto / obszar wiejski, 8 dzielnica Warszawy).
 *    Gmine miejsko-wiejska trzeba pytac o wszystkie trzy kody naraz.
 *
 * ZASADA (decyzja D13 z projektu "obywatel", nadal wazna): urzad napisal, ze
 * ruch przekracza jego mozliwosci. Nie odpytujemy SUDOP na zadanie
 * czytelnika. Import uruchamia czlowiek, dla wskazanych gmin, jedno
 * zapytanie w toku, odpytywanie co 60 s.
 */

import { createHash } from 'node:crypto';

export const SUDOP_BAZA = 'https://api-sudop.uokik.gov.pl/sudop-api';
export const SUDOP_ZRODLO_WWW = 'https://sudop.uokik.gov.pl';

export type KodGminySudop = { number: string; name: string };

/** Pola odpowiedzi — przepisane z PRAWDZIWEJ odpowiedzi, nie ze specyfikacji. */
export type PrzypadekPomocy = {
  'nip-udzielajacego-pomocy': string | null;
  'nazwa-udzielajacego-pomocy': string | null;
  'srodek-pomocowy-numer': string | null;
  'srodek-pomocowy-nazwa': string | null;
  'podstawa-prawna-2a-kod': string | null;
  'podstawa-prawna-2a-nazwa': string | null;
  'podstawa-prawna-2b': string | null;
  'podstawa-prawna-2c': string | null;
  'podstawa-prawna-3a': string | null;
  'podstawa-prawna-3b': string | null;
  'symbol-aktu-ogolnego': string | null;
  'dzien-udzielenia-pomocy': string | null;
  'nip-beneficjenta': string | null;
  'nazwa-beneficjenta': string | null;
  'wielkosc-beneficjenta-kod': string | null;
  'wielkosc-beneficjenta-nazwa': string | null;
  'sektor-dzialalnosci-kod': string | null;
  'sektor-dzialalnosci-wersja': string | null;
  'sektor-dzialalnosci-nazwa': string | null;
  'gmina-siedziby-kod': string | null;
  'gmina-siedziby-nazwa': string | null;
  'przeznaczenie-pomocy-kod': string | null;
  'przeznaczenie-pomocy-nazwa': string | null;
  'forma-pomocy-kod': string | null;
  'forma-pomocy-nazwa': string | null;
  'wartosc-nominalna-pln': string | null;
  'wartosc-brutto-pln': string | null;
  'wartosc-brutto-eur': string | null;
};

export type OdpowiedzSudop = { 'liczba-wynikow': number; wyniki: PrzypadekPomocy[] };

/**
 * TERYT gminy, pod ktorym trzymamy przypadek o danym kodzie SUDOP.
 *
 * ZMIERZONE 18.09.2026 na slowniku (4 170 pozycji) i na porcji krajowej:
 *  - rodzaj 8 to 18 DZIELNIC Warszawy (1465xx8),
 *  - rodzaj 9 to 19 DELEGATUR Lodzi, Krakowa, Wroclawia i Poznania
 *    (np. 1061039 "LODZ-GORNA"), a miasto macierzyste ma kod xxxx011,
 *  - rodzaj 0 (17 pozycji) to jednostki bez gminy — nie da sie przypisac.
 *
 * Jednego dnia przyszlo 265 przypadkow z kodem Warszawy i kilkanascie
 * z delegatur. Bez tego przelozenia wypadalyby z serwisu po cichu.
 * Warszawe trzymamy w calosci (146501), tak samo jak fundusze UE i budzet.
 */
export function terytGminyZKodu(kod: string | null | undefined): string | null {
  if (!kod || !/^\d{7}$/.test(kod)) return null;
  const rodzaj = kod[6]!;
  if (rodzaj === '0') return null;
  if (kod.startsWith('1465')) return TERYT_WARSZAWY;
  if (rodzaj === '9') return `${kod.slice(0, 4)}01`;
  return kod.slice(0, 6);
}

export const TERYT_WARSZAWY = '146501';

/**
 * Wszystkie 7-cyfrowe kody SUDOP, o ktore trzeba zapytac dla gminy o danym
 * TERYT. Dla miasta z dzielnicami albo delegaturami to kod miasta ORAZ kody
 * jego czesci — inaczej import Warszawy pominalby 18 dzielnic.
 */
export function kodySudopGminy(teryt6: string, slownik: readonly KodGminySudop[]): string[] {
  if (!/^\d{6}$/.test(teryt6)) throw new Error(`TERYT gminy ma miec 6 cyfr: "${teryt6}"`);
  const kody = slownik.map((k) => String(k.number)).filter((k) => k.length === 7);
  const czesciMiasta = teryt6.endsWith('01')
    ? kody.filter((k) => k.startsWith(teryt6.slice(0, 4)) && ['8', '9'].includes(k[6]!))
    : [];
  return [...new Set([...kody.filter((k) => k.startsWith(teryt6)), ...czesciMiasta])].sort();
}

/** Adres rejestracji wyszukania. Gmina jest parametrem tablicowym. */
export function adresWyszukania(kody: readonly string[], od: string, strona = 1): string {
  if (!kody.length) throw new Error('Brak kodow gminy');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) throw new Error(`Data ma format RRRR-MM-DD: "${od}"`);
  const p = new URLSearchParams();
  for (const k of kody) p.append('gmina-siedziby-kod', k);
  p.set('dzien-udzielenia-pomocy-od', od);
  p.set('strona', String(strona));
  return `${SUDOP_BAZA}/api/przypadki-pomocy?${p}`;
}

/**
 * Adres rejestracji wyszukania KRAJOWEGO po zakresie dni.
 *
 * ZMIERZONE 18.09.2026: zapytanie o same daty konczy sie `HTTP 400`
 * ("Nie podano zadnych wymaganych kryteriow"), ale parametr `forma-pomocy-kod`
 * mozna powtarzac tak samo jak gmine. Podanie calego slownika form (70 kodow)
 * daje caly kraj: 3 531 przypadkow z jednego dnia, 1 150 gmin, jedna strona.
 */
export function adresPrzyrostu(formy: readonly string[], od: string, doDnia: string, strona = 1): string {
  if (!formy.length) throw new Error('Brak kodow form pomocy — API odrzuci zapytanie o same daty');
  for (const d of [od, doDnia]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Data ma format RRRR-MM-DD: "${d}"`);
  }
  if (od > doDnia) throw new Error(`Zakres od "${od}" do "${doDnia}" jest odwrocony`);
  const p = new URLSearchParams();
  for (const k of formy) p.append('forma-pomocy-kod', k);
  p.set('dzien-udzielenia-pomocy-od', od);
  p.set('dzien-udzielenia-pomocy-do', doDnia);
  p.set('strona', String(strona));
  return `${SUDOP_BAZA}/api/przypadki-pomocy?${p}`;
}

/** TERYT gminy (6 cyfr) z 7-cyfrowego kodu SUDOP; null, gdy kod jest inny. */
export function terytZKoduSudop(kod: string | null | undefined): string | null {
  return kod && /^\d{7}$/.test(kod) ? kod.slice(0, 6) : null;
}

/**
 * Klucz jednoznaczny przypadku pomocy.
 *
 * API nie zwraca zadnego identyfikatora, a ten sam przypadek moze przyjsc
 * dwa razy: raz przy imporcie calej gminy, raz przy dociaganiu dnia dla
 * calego kraju. Bez klucza drugi import podwoilby kwoty.
 * Bierzemy wszystkie pola, bo kazde moze rozniic dwa podobne przypadki
 * (ta sama firma potrafi dostac tego samego dnia dwie transze tej samej formy).
 */
export function kluczPrzypadku(w: PrzypadekPomocy): string {
  const pola = Object.keys(w).sort().map((k) => `${k}=${w[k as keyof PrzypadekPomocy] ?? ''}`);
  return createHash('sha1').update(pola.join('')).digest('hex');
}

/**
 * Klucze calej porcji — z numerem porzadkowym powtorzen.
 *
 * ZMIERZONE: w 80 698 pobranych przypadkach jest 2 392 grupy wierszy
 * identycznych na wszystkich 28 polach, razem 5 200 wierszy (np. szesc razy
 * 1 550 zl dla tej samej firmy tego samego dnia). To NIE sa bledy zrodla —
 * to osobne transze. Sam skrot pol zlaczylby je w jeden wiersz i zanizyl
 * sume o 2 808 przypadkow, wiec do klucza dokladamy numer w grupie.
 *
 * Numeracja jest stabilna: ta sama porcja (ta sama gmina albo ten sam dzien
 * dla kraju) zawsze daje te same klucze, wiec powtorzony import niczego
 * nie dubluje.
 */
export function kluczePorcji(wyniki: readonly PrzypadekPomocy[]): string[] {
  const licznik = new Map<string, number>();
  return wyniki.map((w) => {
    const skrot = kluczPrzypadku(w);
    const n = licznik.get(skrot) ?? 0;
    licznik.set(skrot, n + 1);
    return `${skrot}#${n}`;
  });
}

/**
 * Kontrola dziedziny porcji krajowej: data w zadanym zakresie i kod gminy,
 * ktory da sie przelozyc na TERYT.
 */
export function sprawdzPorcjePrzyrostu(wyniki: readonly PrzypadekPomocy[], od: string, doDnia: string): string[] {
  const problemy: string[] = [];
  wyniki.forEach((w, i) => {
    const d = w['dzien-udzielenia-pomocy'] ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) problemy.push(`wiersz ${i}: data "${d}"`);
    else if (d < od || d > doDnia) problemy.push(`wiersz ${i}: data ${d} spoza zakresu ${od}..${doDnia}`);
    const kod = w['gmina-siedziby-kod'] ?? '';
    // Kod rodzaju 0 ("jednostka nieznana") jest dopuszczalny — takie wiersze
    // pomijamy przy zapisie i raportujemy, ale nie przerywaja importu.
    if (!/^\d{7}$/.test(kod)) problemy.push(`wiersz ${i}: kod gminy "${kod}"`);
    try {
      kwota(w['wartosc-brutto-pln']);
      kwota(w['wartosc-nominalna-pln']);
    } catch (e) {
      problemy.push(`wiersz ${i}: ${e instanceof Error ? e.message : e}`);
    }
  });
  return problemy;
}

/**
 * Najwczesniejsza data, ktora API jeszcze obejmuje: 1 stycznia roku n-10.
 * Pytanie o starsza pomoc nic nie daje, a obciaza kolejke.
 */
export function poczatekOknaDanych(dzis: Date): string {
  return `${dzis.getUTCFullYear() - 10}-01-01`;
}

/**
 * Kwota z API przychodzi jako tekst z kropka ("36878.61"). Pusty tekst i null
 * to BRAK wartosci, nie zero — zero w sumie pomocy byloby twierdzeniem.
 */
export function kwota(t: string | null | undefined): number | null {
  if (t === null || t === undefined || t.trim() === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Nierozpoznana kwota: "${t}"`);
  return n;
}

/**
 * Kontrola dziedziny porcji przed zapisem: kazdy przypadek musi nalezec do
 * pytanej gminy i miec date. Inaczej zapisalibysmy pomoc pod zla gmina.
 */
export function sprawdzPorcje(wyniki: readonly PrzypadekPomocy[], teryt6: string): string[] {
  const problemy: string[] = [];
  wyniki.forEach((w, i) => {
    const kod = w['gmina-siedziby-kod'] ?? '';
    // Dzielnica i delegatura naleza do miasta — porownujemy po przelozeniu.
    if (terytGminyZKodu(kod) !== teryt6) problemy.push(`wiersz ${i}: gmina ${kod || '(brak)'} zamiast ${teryt6}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w['dzien-udzielenia-pomocy'] ?? '')) problemy.push(`wiersz ${i}: data "${w['dzien-udzielenia-pomocy']}"`);
    try {
      kwota(w['wartosc-brutto-pln']);
      kwota(w['wartosc-nominalna-pln']);
    } catch (e) {
      problemy.push(`wiersz ${i}: ${e instanceof Error ? e.message : e}`);
    }
  });
  return problemy;
}
