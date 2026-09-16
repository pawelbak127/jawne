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

export async function pobierz(url: string, opcje: { json?: boolean } = {}): Promise<Response> {
  await zajmij();
  try {
    let ostatniBlad = '';
    for (let proba = 1; proba <= PROB; proba++) {
      try {
        const odp = await fetch(url, {
          headers: {
            'Accept': opcje.json === false ? '*/*' : 'application/json',
            'User-Agent': 'jawne.pl/0.1 (agregator danych publicznych)',
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

export async function pobierzJson<T>(url: string): Promise<T> {
  const odp = await pobierz(url);
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
