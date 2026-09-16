/**
 * Co pokazac jako naglowek glosowania.
 *
 * Rejestr ma dwa pola i uzywa ich niekonsekwentnie — zmierzone na 4632
 * glosowaniach:
 *  - 3966 tytulow zaczyna sie od "Pkt. N" i niesie tresc sprawy, a temat jest
 *    ogolny ("głosowanie nad całością projektu.", "poprawka 1");
 *  - 350 tytulow to sama nazwa posiedzenia ("65. posiedzenie Sejmu…"), a tresc
 *    jest w temacie ("Wniosek o przerwę", "Głosowanie kworum").
 * Pokazywanie zawsze tematu dawalo karty "głosowanie nad przyjęciem wniosku
 * z druku." bez slowa o tym, jakiego druku.
 */
import { bezNazwiskOsobPrywatnych } from './prywatnosc';

export type OpisGlosowania = {
  /** Glowna linia: o czym jest sprawa. */
  sprawa: string;
  /** Co dokladnie glosowano w tej sprawie (poprawka, calosc, wniosek). */
  przedmiot: string | null;
  /** Numer punktu porzadku obrad, jesli rejestr go podaje. */
  punkt: string | null;
  /** Glosowanie w sprawach porzadku posiedzenia (przerwa, kworum, odroczenie). */
  porzadkowe: boolean;
  /** Ostateczne glosowanie nad projektem — slowo rejestru, nie nasza ocena. */
  nadCaloscia: boolean;
};

const NAZWA_POSIEDZENIA = /^\d+\.\s*posiedzenie Sejmu/i;
// Takze kilka punktow naraz: "Pkt. 10., 11., 12. i 13 Pierwsze czytania…" (4 tytuly).
const PUNKT = /^Pkt\.?\s*(\d+[a-z]?(?:\.?,?\s*(?:i\s+)?\d+[a-z]?)*)\.?\s+/i;
export const NAD_CALOSCIA = /^głosowanie nad całością/i;

function bezKropki(t: string): string {
  return t.trim().replace(/\.$/, '');
}

function wielka(t: string): string {
  return t.charAt(0).toLocaleUpperCase('pl-PL') + t.slice(1);
}

export function opisGlosowania(g: { tytul: string; temat: string | null }): OpisGlosowania {
  // Nazwiska osob prywatnych znikaja TUTAJ, zeby nie trafily ani na strone,
  // ani do podgladu linku, ani do <title> — patrz prywatnosc.ts.
  const tytul = bezNazwiskOsobPrywatnych(g.tytul.trim());
  const temat = g.temat ? bezKropki(bezNazwiskOsobPrywatnych(g.temat)) : null;
  const nadCaloscia = temat !== null && NAD_CALOSCIA.test(temat);

  if (NAZWA_POSIEDZENIA.test(tytul)) {
    return {
      sprawa: temat ? wielka(temat) : tytul,
      przedmiot: null,
      punkt: null,
      porzadkowe: true,
      nadCaloscia,
    };
  }

  const p = PUNKT.exec(tytul);
  const sprawa = p ? tytul.slice(p[0].length) : tytul;
  return {
    sprawa,
    przedmiot: temat && temat !== sprawa ? temat : null,
    punkt: p ? p[1]!.replace(/\./g, '') : null,
    porzadkowe: false,
    nadCaloscia,
  };
}

/** Jedna linia do <title>, podgladu linku i podpowiedzi. */
export function opisJednaLinia(g: { tytul: string; temat: string | null }): string {
  const o = opisGlosowania(g);
  return o.przedmiot ? `${o.sprawa} — ${o.przedmiot}` : o.sprawa;
}
