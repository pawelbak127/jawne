/**
 * Klient HTTP do rejestrow publicznych.
 *
 * Trzy rzeczy, ktore ten plik musi robic, bo API Sejmu je wymusza:
 *  1. PONAWIANIE. W trakcie budowy serwis oddawal 503 i timeouty przez
 *     kilkanascie minut. Import ~4600 glosowan nie moze sie przewracac
 *     na jednej takiej odpowiedzi.
 *  2. SEMAFOR. Rownoleglosc podkrecona „bo szybciej" jest najprostsza droga
 *     do tego, zeby publiczne API nas odcielo. Domyslnie 4 polaczenia.
 *  3. PRZERWA MIEDZY PROBAMI rosnaca wykladniczo, z losowym rozrzutem —
 *     bez rozrzutu wszystkie zawieszone zadania wracaja w tej samej chwili.
 */

const ROWNOLEGLE = Number(process.env.JAWNE_ROWNOLEGLE ?? 4);
const PROB = 5;

let wolne = ROWNOLEGLE;
const kolejka: (() => void)[] = [];

async function zajmij(): Promise<void> {
  if (wolne > 0) { wolne--; return; }
  await new Promise<void>((ok) => kolejka.push(ok));
}
function zwolnij(): void {
  const nastepny = kolejka.shift();
  if (nastepny) nastepny(); else wolne++;
}

const spij = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Klucz API GUS BDL z `.env.local` (GUS_BDL_KLUCZ); bez niego dzialamy anonimowo.
 * Funkcja, nie stala: moduly laduja sie przed kodem skryptu, wiec stala
 * przeczytalaby zmienne, zanim import wczyta `.env.local`.
 */
export const kluczBdl = (): string | null => process.env.GUS_BDL_KLUCZ?.trim() || null;

/**
 * Klucz SMUP (`SMUP_KLUCZ` w `.env.local`). SMUP to ta sama rodzina co BDL
 * — klucz idzie w naglowku `X-ClientId` — ale to osobna rejestracja i osobny
 * klucz. Bez niego API odpowiada, ale nie danymi.
 */
export const kluczSmup = (): string | null => process.env.SMUP_KLUCZ?.trim() || null;

/**
 * Przerwa miedzy zapytaniami do BDL, dobrana do limitu 15-minutowego
 * (api.stat.gov.pl/Home/BdlApi): anonimowo 100 zapytan / 15 min, z kluczem 500.
 * Najciasniejszy jest wlasnie limit 15-minutowy — przerwa 1 s (60 na minute)
 * przekraczala go wielokrotnie i GUS odpowiadal 429.
 */
export const przerwaBdlMs = (): number => (kluczBdl() ? 1_900 : 9_500);

export type Postep = (opis: string) => void;

const DO_PONOWIENIA = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * 404 TEZ PONAWIAMY, ale krocej i tylko kilka razy.
 *
 * Zmierzone: api.sejm.gov.pl stoi za F5 (ciasteczko TS0111...), ktory pierwszemu
 * zadaniu po przerwie potrafi oddac 404 text/html dla POPRAWNEJ sciezki —
 * piec wariantow naglowkow pod rzad dalo kolejno 404, 200, 200, 200, 200.
 * Traktowanie takiego 404 jak odpowiedzi konczy sie importem, ktory cicho
 * pomija zasoby — a to najgorszy rodzaj bledu, bo nie zglasza sie niczym.
 *
 * Prawdziwe 404 tez istnieje (posiedzenie bez glosowan), wiec po PROB_404
 * probach oddajemy je jako odpowiedz. Kosztuje to kilka sekund na zasobach,
 * ktorych naprawde nie ma.
 */
const PROB_404 = 3;

export type OpcjeZapytania = {
  json?: boolean;
  metoda?: string;
  cialo?: string;
  /** Domyslnie application/json; BIR (SOAP 1.2) wymaga wlasnego typu. */
  typTresci?: string;
  naglowki?: Record<string, string>;
};

// POST jest potrzebny TED-owi: jego wyszukiwarka przyjmuje zapytanie w ciele.
// Ponawianie, limit rownoleglosci i Retry-After dzialaja tak samo jak przy GET.
export async function pobierz(url: string, opcje: OpcjeZapytania = {}): Promise<Response> {
  await zajmij();
  try {
    let ostatniBlad = '';
    for (let proba = 1; proba <= PROB; proba++) {
      try {
        const odp = await fetch(url, {
          method: opcje.metoda ?? 'GET',
          body: opcje.cialo,
          headers: {
            'Accept': opcje.json === false ? '*/*' : 'application/json',
            ...(opcje.cialo ? { 'Content-Type': opcje.typTresci ?? 'application/json' } : {}),
            ...(opcje.naglowki ?? {}),
            'User-Agent': 'jawne.pl/0.1 (agregator danych publicznych)',
            // Klucz GUS podnosi limit BDL z 100 do 500 zapytan na 15 minut.
            // Wysylamy go tylko do BDL — innym serwerom nic po nim.
            ...(kluczBdl() && url.startsWith('https://bdl.stat.gov.pl/') ? { 'X-ClientId': kluczBdl()! } : {}),
            // SMUP bierze klucz w tym samym naglowku, ale to inny klucz.
            ...(kluczSmup() && url.startsWith('https://api.smup.gov.pl/') ? { 'X-ClientId': kluczSmup()! } : {}),
          },
          signal: AbortSignal.timeout(45_000),
        });
        if (odp.ok) return odp;
        if (odp.status === 404) {
          if (proba >= PROB_404) throw new Error(`${url} -> HTTP 404`);
        } else if (!DO_PONOWIENIA.has(odp.status)) {
          throw new Error(`${url} -> HTTP ${odp.status}`);
        }
        ostatniBlad = `HTTP ${odp.status}`;
        // 429 = serwer prosi, zeby zwolnic. Jesli mowi, na ile — sluchamy
        // (do 5 minut); jesli nie mowi, czekamy minute. Wykladnicze 2-16 s
        // nie wystarczylo: GUS BDL odmawial dalej po czterech probach.
        if (odp.status === 429 && proba < PROB) {
          const naglowek = Number(odp.headers.get('retry-after'));
          const czekaj = Number.isFinite(naglowek) && naglowek > 0 ? Math.min(naglowek, 300) * 1000 : 60_000;
          await spij(czekaj);
          continue;
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('-> HTTP')) throw e;
        ostatniBlad = e instanceof Error ? e.name : String(e);
      }
      if (proba < PROB) {
        const czekaj = Math.min(30_000, 1000 * 2 ** proba) + Math.random() * 1000;
        await spij(czekaj);
      }
    }
    throw new Error(`${url} -> poddaje sie po ${PROB} probach (${ostatniBlad})`);
  } finally {
    zwolnij();
  }
}

export async function pobierzJson<T>(url: string, opcje: OpcjeZapytania = {}): Promise<T> {
  const odp = await pobierz(url, opcje);
  return (await odp.json()) as T;
}

export async function pobierzBajty(url: string): Promise<Buffer> {
  const odp = await pobierz(url, { json: false });
  return Buffer.from(await odp.arrayBuffer());
}

/** Mapuje z ograniczona rownoleglascia i raportuje postep co `co` sztuk. */
export async function dlaKazdego<T, R>(
  elementy: readonly T[],
  fn: (el: T, i: number) => Promise<R>,
  postep?: { opis: string; co?: number },
): Promise<R[]> {
  const wynik = new Array<R>(elementy.length);
  let zrobione = 0;
  const co = postep?.co ?? 100;
  await Promise.all(
    elementy.map(async (el, i) => {
      wynik[i] = await fn(el, i);
      zrobione++;
      if (postep && (zrobione % co === 0 || zrobione === elementy.length)) {
        process.stdout.write(`  ${postep.opis}: ${zrobione}/${elementy.length}\n`);
      }
    }),
  );
  return wynik;
}
