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

/** Wszystkie 7-cyfrowe kody SUDOP dla gminy o 6-cyfrowym TERYT. */
export function kodySudopGminy(teryt6: string, slownik: readonly KodGminySudop[]): string[] {
  if (!/^\d{6}$/.test(teryt6)) throw new Error(`TERYT gminy ma miec 6 cyfr: "${teryt6}"`);
  return slownik
    .map((k) => String(k.number))
    .filter((k) => k.length === 7 && k.startsWith(teryt6))
    .sort();
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
    if (!kod.startsWith(teryt6)) problemy.push(`wiersz ${i}: gmina ${kod || '(brak)'} zamiast ${teryt6}`);
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
