/**
 * "Czy posel glosowal tak jak reszta jego klubu?"
 *
 * DEFINICJA (ta sama jest opisana czytelnikowi na stronie posla):
 *
 * 1. Porownujemy tylko glosy ZA, PRZECIW i WSTRZYMAL SIE. Nieobecnosc nie jest
 *    stanowiskiem, a "glos wazny" w glosowaniach tajnych nie mowi, jak ktos
 *    zaglosowal.
 * 2. Klub to klub Z DNIA GLOSOWANIA (zapisany przy glosie), nie dzisiejszy.
 * 3. Punktem odniesienia jest RESZTA klubu — bez samego posla. Inaczej
 *    w malym kole glos posla sam tworzy "wiekszosc", z ktora sie zgadza.
 * 4. Reszta klubu musi oddac co najmniej MIN_RESZTY glosow i miec jeden
 *    najczestszy glos. Przy remisie nie ma z czym porownac — glosowanie
 *    wypada z mianownika, zamiast byc liczone na korzysc ktorejs strony.
 * 5. Posłowie niezrzeszeni nie tworza klubu — ich glosy nie sa porownywane.
 *
 * To jest fakt o glosowaniu, nie ocena. Glos inny niz klub moze byc
 * wiernoscia programowi, bledem przy przycisku albo umowa w klubie — rejestr
 * tego nie mowi, wiec my tez nie.
 */

export type GlosOddany = 'YES' | 'NO' | 'ABSTAIN';

export const MIN_RESZTY = 3;

/** Klubow, ktorych glosow nie porownujemy, bo nie sa klubami. */
export const NIE_KLUBY = new Set(['niez.']);

export type LiczbyKlubu = { za: number; przeciw: number; wstrzymalo: number };

export function jestOddany(glos: string): glos is GlosOddany {
  return glos === 'YES' || glos === 'NO' || glos === 'ABSTAIN';
}

/** Najczestszy glos pozostalych czlonkow klubu albo `null`, gdy nie ma z czym porownac. */
export function wiekszoscReszty(klub: LiczbyKlubu, glosPosla: GlosOddany): GlosOddany | null {
  const reszta: Record<GlosOddany, number> = {
    YES: klub.za - (glosPosla === 'YES' ? 1 : 0),
    NO: klub.przeciw - (glosPosla === 'NO' ? 1 : 0),
    ABSTAIN: klub.wstrzymalo - (glosPosla === 'ABSTAIN' ? 1 : 0),
  };
  // Posel jest wliczony w liczby klubu, wiec ujemna reszta znaczy, ze liczby
  // klubu i glos posla pochodza z roznych zrodel. Tego nie wolno przemilczec.
  for (const [k, v] of Object.entries(reszta)) {
    if (v < 0) throw new Error(`Niespojne dane: reszta klubu ma ${v} glosow ${k}`);
  }
  const suma = reszta.YES + reszta.NO + reszta.ABSTAIN;
  if (suma < MIN_RESZTY) return null;

  const uporzadkowane = (Object.entries(reszta) as [GlosOddany, number][]).sort((a, b) => b[1] - a[1]);
  const [pierwszy, drugi] = uporzadkowane;
  if (pierwszy![1] === drugi![1]) return null;
  return pierwszy![0];
}

export type GlosZKlubem = LiczbyKlubu & {
  posiedzenie: number;
  numer: number;
  data: string;
  tytul: string;
  temat: string | null;
  klub_id: string;
  glos: string;
};

export type Odstepstwo = GlosZKlubem & { glos: GlosOddany; wiekszosc: GlosOddany };

export type PorownanieZKlubem = {
  /** Mianownik: glosowania, w ktorych bylo z czym porownac. */
  porownywalnych: number;
  odmiennych: number;
  /** Od najnowszego. */
  odstepstwa: Odstepstwo[];
  /** Kluby, w ktorych posel glosowal w porownywanych glosowaniach. */
  kluby: string[];
};

export function porownajZKlubem(wiersze: readonly GlosZKlubem[]): PorownanieZKlubem {
  let porownywalnych = 0;
  const odstepstwa: Odstepstwo[] = [];
  const kluby = new Set<string>();

  for (const w of wiersze) {
    if (NIE_KLUBY.has(w.klub_id) || !jestOddany(w.glos)) continue;
    const wiekszosc = wiekszoscReszty(w, w.glos);
    if (wiekszosc === null) continue;
    porownywalnych++;
    kluby.add(w.klub_id);
    if (wiekszosc !== w.glos) odstepstwa.push({ ...w, glos: w.glos, wiekszosc });
  }

  odstepstwa.sort((a, b) => b.data.localeCompare(a.data) || b.posiedzenie - a.posiedzenie || b.numer - a.numer);
  return { porownywalnych, odmiennych: odstepstwa.length, odstepstwa, kluby: [...kluby] };
}
