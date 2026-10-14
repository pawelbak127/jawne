import { uprosc } from './tekst';

/*
 * CZY ORGAN JEST ORGANEM WYKONAWCZYM GMINY — i ktorej.
 *
 * NIE WYSTARCZY porownac TERYT-u siedziby, i to byl moj blad w pierwszej
 * wersji: ZMIERZONE 01.10.2026 — na stronie Warszawy jako „organ tej gminy"
 * wyszly **Zaklad Ubezpieczen Spolecznych, PFRON i Bank Gospodarstwa
 * Krajowego**, bo wszystkie maja siedzibe w Warszawie, wiec ich `regon.teryt`
 * rowna sie 146501. „ZUS to organ tej gminy" jest nieprawda.
 *
 * Rozstrzyga TYTUL z pola `udzielajacy` w SUDOP, bo rejestr zapisuje tam nie
 * nazwe osoby prawnej, a organ, ktory wydal decyzje: „Burmistrz Miasta
 * Zakopane" (904 przypadki), „Prezydent Miasta Belchatow" (353), „Prezydent
 * Wroclawia" (80). Organami wykonawczymi gminy sa w polskim prawie wojt,
 * burmistrz i prezydent miasta — i tylko one. Starosta (282 organy) jest
 * organem POWIATU; w miescie na prawach powiatu jego zadania wykonuje
 * prezydent i tam tytul brzmi „prezydent".
 *
 * Do 14.10.2026 drugim warunkiem byla rownosc TERYT-u siedziby z REGON
 * (`organWykonawczyGminy`) — i to byl drugi blad, patrz `gminaOrganu`.
 */

/**
 * Do ktorej gminy nalezy organ udzielajacy pomocy („Wojt Gminy X”,
 * „Burmistrz Y”, „Prezydent Miasta Z”) — zeby strona gminy mogla pokazac,
 * ile pomocy udzielil SAM samorzad (ulgi, umorzenia, raty).
 *
 * Siedziba z REGON nie wystarcza. ZMIERZONE 14.10.2026 na 2 548 organach
 * gminnych z bazy serwera: 4 urzedy gmin wiejskich maja siedzibe w miescie
 * obok i REGON przypisuje je do miasta — „Wojt Gminy Bodzechow” do Ostrowca
 * Swietokrzyskiego, „Nowosolna” do Lodzi, „Liw” do Wegrowa, „Rynsk” do
 * Wabrzezna (ta sama rodzina bledu co pulapka 60). Dlatego:
 *  1. siedzibe z REGON przyjmujemy, gdy zgadza sie z NAZWA organu (pierwsze
 *     trzy litery nazwy gminy na poczatku ktoregos slowa — tolerancja na
 *     odmiane: „Burmistrz Moniek” to Monki) i z RODZAJEM (wojt -> gmina,
 *     prezydent -> miasto),
 *  2. gdy rodzaj sie nie zgadza, bierzemy gmine o TEJ SAMEJ nazwie w tym samym
 *     powiecie (miasto i okalajaca je gmina wiejska — 31 takich pomylek
 *     REGON na serwerze, od Elblaga po Zamosc),
 *  3. inaczej szukamy gminy, ktorej pelna nazwa stoi w nazwie organu jako
 *     cale slowa, w tym samym wojewodztwie (albo w kraju, gdy REGON nie zna
 *     siedziby) — i bierzemy ja tylko wtedy, gdy jest DOKLADNIE jedna,
 *  4. w kazdym innym razie: nie wiemy. Organ zostaje na wlasnej stronie,
 *     ale nie stoi przy zadnej gminie — lepiej go nie pokazac niz pokazac
 *     przy cudzej (zasada: wiarygodnosc jest produktem).
 *
 * Rodzaj „gmina” w naszym wykazie to gminy wiejskie I miejsko-wiejskie, wiec
 * burmistrz moze trafic w gmine albo w miasto.
 */

export type GminaWykazu = { teryt: string; nazwa: string; rodzaj: string; wojewodztwo: string };
export type RodzajOrganu = 'wojt' | 'burmistrz' | 'prezydent';

const WARSZAWA = '146501';

export function rodzajOrganu(nazwa: string): RodzajOrganu | null {
  const n = uprosc(nazwa).trim();
  if (/^wojt\b/.test(n)) return 'wojt';
  if (/^burmistrz\b/.test(n)) return 'burmistrz';
  if (/^prezydent\b/.test(n)) return 'prezydent';
  return null;
}

function pasujeRodzaj(typ: RodzajOrganu, g: GminaWykazu): boolean {
  if (g.rodzaj === 'dzielnica Warszawy') return false;
  if (typ === 'wojt') return g.rodzaj === 'gmina';
  if (typ === 'prezydent') return g.rodzaj !== 'gmina';
  return true;
}

const slowa = (t: string) => uprosc(t).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const caleSlowa = (gdzie: string, co: string) => {
  const s = ` ${slowa(gdzie).join(' ')} `;
  return s.includes(` ${slowa(co).join(' ')} `);
};

export function gminaOrganu(
  nazwaOrganu: string,
  terytRegon: string | null,
  gminy: Map<string, GminaWykazu>,
): string | null {
  const typ = rodzajOrganu(nazwaOrganu);
  if (!typ) return null;
  const s = slowa(nazwaOrganu);

  // Warszawy nie ma w wykazie (18 dzielnic), a jej strona jest pod 146501.
  if (terytRegon === WARSZAWA && typ === 'prezydent' && s.some((w) => w.startsWith('warszaw'))) return WARSZAWA;

  const kandydat = terytRegon ? gminy.get(terytRegon) : undefined;
  const zgodnaNazwa = (g: GminaWykazu) => {
    const rdzen = slowa(g.nazwa)[0]?.slice(0, 3) ?? '';
    return rdzen.length === 3 && s.some((w) => w.startsWith(rdzen));
  };
  if (kandydat && pasujeRodzaj(typ, kandydat) && zgodnaNazwa(kandydat)) return kandydat.teryt;

  // Blizniak z pulapki 60: miasto i gmina wiejska o tej samej nazwie w tym
  // samym powiecie, a REGON wskazal nie te. ZMIERZONE na serwerze:
  // „Prezydent Miasta Lubina” z kodem gminy wiejskiej Lubin — pelna nazwa
  // nizej by go nie znalazla, bo stoi w dopelniaczu.
  if (kandydat && !pasujeRodzaj(typ, kandydat)) {
    const blizniaki = [...gminy.values()].filter((g) => g.teryt !== kandydat.teryt
      && g.teryt.slice(0, 4) === kandydat.teryt.slice(0, 4) && g.nazwa === kandydat.nazwa
      && pasujeRodzaj(typ, g) && zgodnaNazwa(g));
    if (blizniaki.length === 1) return blizniaki[0]!.teryt;
  }

  const wojewodztwo = kandydat?.wojewodztwo ?? null;
  const trafienia = [...gminy.values()].filter((g) =>
    (wojewodztwo === null || g.wojewodztwo === wojewodztwo) && pasujeRodzaj(typ, g) && caleSlowa(nazwaOrganu, g.nazwa));
  return trafienia.length === 1 ? trafienia[0]!.teryt : null;
}

/**
 * Nazwa organu do pokazania. Pierwszenstwo ma zapis z SUDOP, bo to on mowi,
 * KTO wydal decyzje („Burmistrz Miasta Zakopane"), a REGON podaje nazwe osoby
 * prawnej („GMINA ZAKOPANE”) — prawdziwa, ale nie o tym.
 */
export function nazwaOrganu(zSudop: string | null, zRegon: string | null): string {
  return (zSudop?.trim() || zRegon?.trim() || '').trim();
}
