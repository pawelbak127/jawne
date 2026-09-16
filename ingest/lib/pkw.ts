/**
 * Przypisanie gmin do okregow wyborczych do Sejmu — z danych PKW
 * z wyborow 2023 ("wyniki glosowania na listy po gminach").
 *
 * Dlaczego ten plik, a nie slownik gmin z innego rejestru: to jest wynik
 * wyborow, wiec kazda gmina stoi w nim przy okregu, w ktorym NAPRAWDE
 * glosowala. Zrodlo jest organem wyborczym, nie przepisaniem ustawy.
 *
 * Zmierzone pulapki pliku:
 *  - TERYT jest zapisany jako LICZBA, bez cudzyslowu, wiec 608 kodow
 *    z wojewodztw 02/04/06/08 ma 5 cyfr zamiast 6 ("20101" to Boleslawiec).
 *    Porownanie z jakimkolwiek innym rejestrem po surowym polu po cichu
 *    gubi te gminy — dlatego dopelniamy zerem.
 *  - 91 wierszy nie ma TERYT: to obwody za granica i na statkach,
 *    doliczone do okregu 19.
 *  - Nazwa niesie rodzaj w prefiksie ("m. ", "gm. "), a miasta na prawach
 *    powiatu i dzielnice Warszawy prefiksu nie maja.
 *  - Nazwy sie powtarzaja (228 nazw wystepuje wiecej niz raz; "gm. Boleslawiec"
 *    jest i w dolnoslaskim, i w lodzkim), wiec wynik wyszukiwania zawsze
 *    niesie powiat i wojewodztwo.
 */
import { parsujCsv } from './csv.js';

export type RodzajGminy = 'miasto' | 'gmina' | 'miasto na prawach powiatu' | 'dzielnica Warszawy';

export type GminaPkw = {
  teryt: string;
  nazwa: string;
  rodzaj: RodzajGminy;
  powiat: string;
  wojewodztwo: string;
  okreg: number;
  /** `null`, gdy pole puste — nie zero. */
  uprawnionych: number | null;
};

export type ObwodZagraniczny = { nazwa: string; okreg: number; uprawnionych: number | null };

export type WynikPkw = {
  gminy: GminaPkw[];
  zagranica: ObwodZagraniczny[];
  /** Prefiksy nazw, ktorych nie znamy. Raport, nie blad — patrz CLAUDE.md. */
  nieznanePrefiksy: string[];
};

const KOLUMNY = {
  teryt: 'TERYT Gminy',
  gmina: 'Gmina',
  powiat: 'Powiat',
  wojewodztwo: 'Województwo',
  okreg: 'Nr okręgu',
  uprawnionych: 'Liczba wyborców uprawnionych do głosowania',
} as const;

function liczbaLubNull(t: string | undefined): number | null {
  if (t === undefined || t.trim() === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function czytajGminyPkw(tekst: string): WynikPkw {
  const [naglowek, ...wiersze] = parsujCsv(tekst, ';');
  if (!naglowek) throw new Error('Plik PKW jest pusty');

  // Kolumny po NAZWIE, nie po pozycji — PKW dokleja kolumny miedzy wyborami.
  const idx = Object.fromEntries(
    Object.entries(KOLUMNY).map(([klucz, nazwa]) => {
      const i = naglowek.indexOf(nazwa);
      if (i < 0) throw new Error(`W pliku PKW brakuje kolumny "${nazwa}"`);
      return [klucz, i];
    }),
  ) as Record<keyof typeof KOLUMNY, number>;

  const gminy: GminaPkw[] = [];
  const zagranica: ObwodZagraniczny[] = [];
  const nieznane = new Set<string>();

  for (const w of wiersze) {
    if (w.length === 1 && w[0] === '') continue;
    const surowyTeryt = (w[idx.teryt] ?? '').trim();
    const pelnaNazwa = (w[idx.gmina] ?? '').trim();
    const okreg = Number(w[idx.okreg]);
    const uprawnionych = liczbaLubNull(w[idx.uprawnionych]);

    if (surowyTeryt === '') {
      zagranica.push({ nazwa: pelnaNazwa, okreg, uprawnionych });
      continue;
    }

    const teryt = surowyTeryt.padStart(6, '0');
    const prefiks = /^(\S+\.)\s+/.exec(pelnaNazwa);
    let rodzaj: RodzajGminy;
    let nazwa = pelnaNazwa;
    if (prefiks) {
      nazwa = pelnaNazwa.slice(prefiks[0].length);
      if (prefiks[1] === 'm.') rodzaj = 'miasto';
      else if (prefiks[1] === 'gm.') rodzaj = 'gmina';
      else {
        nieznane.add(prefiks[1]!);
        rodzaj = 'gmina';
        nazwa = pelnaNazwa;
      }
    } else {
      // Kod 1465xx to dzielnice m.st. Warszawy (gmina Warszawa sama nie ma wiersza).
      rodzaj = teryt.startsWith('1465') ? 'dzielnica Warszawy' : 'miasto na prawach powiatu';
    }

    gminy.push({
      teryt,
      nazwa,
      rodzaj,
      powiat: (w[idx.powiat] ?? '').trim(),
      wojewodztwo: (w[idx.wojewodztwo] ?? '').trim(),
      okreg,
      uprawnionych,
    });
  }

  return { gminy, zagranica, nieznanePrefiksy: [...nieznane] };
}

/**
 * Kontrola dziedziny przed zapisem. Zwraca liste problemow — pusta lista
 * znaczy, ze plik mozna zapisac.
 */
export function sprawdzGminyPkw(w: WynikPkw, oczekiwanychOkregow = 41): string[] {
  const problemy: string[] = [];

  const okregi = new Set(w.gminy.map((g) => g.okreg));
  const brakujace = Array.from({ length: oczekiwanychOkregow }, (_, i) => i + 1).filter((n) => !okregi.has(n));
  if (brakujace.length) problemy.push(`okregi bez zadnej gminy: ${brakujace.join(', ')}`);
  const obce = [...okregi].filter((n) => !Number.isInteger(n) || n < 1 || n > oczekiwanychOkregow);
  if (obce.length) problemy.push(`numery okregow spoza 1-${oczekiwanychOkregow}: ${obce.join(', ')}`);

  const widziane = new Set<string>();
  for (const g of w.gminy) {
    if (!/^\d{6}$/.test(g.teryt)) problemy.push(`TERYT nie ma 6 cyfr: "${g.teryt}" (${g.nazwa})`);
    if (widziane.has(g.teryt)) problemy.push(`TERYT powtorzony: ${g.teryt}`);
    widziane.add(g.teryt);
    if (!g.wojewodztwo) problemy.push(`gmina bez wojewodztwa: ${g.teryt}`);
  }

  // Okreg do Sejmu nie przekracza granicy wojewodztwa — jesli w pliku
  // przekracza, to plik jest zle odczytany, a nie prawo sie zmienilo.
  const wojWOkregu = new Map<number, Set<string>>();
  for (const g of w.gminy) {
    const s = wojWOkregu.get(g.okreg) ?? new Set<string>();
    s.add(g.wojewodztwo);
    wojWOkregu.set(g.okreg, s);
  }
  for (const [nr, woj] of wojWOkregu) {
    if (woj.size > 1) problemy.push(`okreg ${nr} lezy w kilku wojewodztwach: ${[...woj].join(', ')}`);
  }

  return problemy;
}
