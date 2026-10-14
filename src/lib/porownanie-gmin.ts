/**
 * PORÓWNYWARKA GMIN W WOJEWÓDZTWIE (14.10.2026) — z listy pomysłów, z jej
 * własnym ostrzeżeniem: „łatwo zrobić z tego ranking dobrych i złych gmin,
 * a to już ocena”. Dlatego:
 *  - żadnych miejsc („1.”, „2.”), odznak ani kolorów lepszy/gorszy
 *    (zasada 6) — kolejność ustawia czytelnik, domyślnie powiat i nazwa,
 *  - każda liczba na mieszkańca, a w wierszu mediany jej liczba gmin
 *    (zasady 3 i 9),
 *  - brak wartości zostaje półpauzą i przy KAŻDYM sortowaniu idzie na koniec:
 *    `null` posortowany jak zero udawałby gminę z zerem (zasada 4).
 *
 * Mediany liczy się tu z tych samych wierszy, które widać w tabeli,
 * i z tej samej populacji co mediany na stronie gminy (`JEDNOSTKI_FE`
 * w dane.ts) — sprawdzone drugą drogą przy wprowadzeniu.
 */

export type Miara = 'dochody' | 'ue' | 'pomoc';

export type WierszPorownania = {
  teryt: string;
  nazwa: string;
  /** Rodzaj z wykazu: miasto i gmina wiejska bywaja imiennikami w jednym powiecie. */
  rodzaj: string;
  powiat: string;
  osob: number | null;
  dochody: number | null;
  ue: number | null;
  pomoc: number | null;
};

export type Kolejnosc = 'powiat' | `${Miara}-malejaco` | `${Miara}-rosnaco`;

/** Mediana z wartości ZNANYCH — `null` nie wchodzi, zero wchodzi. */
export function mediana(wartosci: (number | null)[]): { wartosc: number; z: number } | null {
  const l = wartosci.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!l.length) return null;
  const s = Math.floor(l.length / 2);
  return { wartosc: l.length % 2 ? l[s]! : (l[s - 1]! + l[s]!) / 2, z: l.length };
}

const porownajNazwy = (a: WierszPorownania, b: WierszPorownania) =>
  a.powiat.localeCompare(b.powiat, 'pl') || a.nazwa.localeCompare(b.nazwa, 'pl') || a.rodzaj.localeCompare(b.rodzaj, 'pl');

export function uporzadkuj(wiersze: WierszPorownania[], k: Kolejnosc): WierszPorownania[] {
  const kopia = [...wiersze];
  if (k === 'powiat') return kopia.sort(porownajNazwy);
  const [miara, kierunek] = k.split('-') as [Miara, 'malejaco' | 'rosnaco'];
  return kopia.sort((a, b) => {
    const x = a[miara];
    const y = b[miara];
    if (x === null || y === null) return x === y ? porownajNazwy(a, b) : x === null ? 1 : -1;
    return (kierunek === 'malejaco' ? y - x : x - y) || porownajNazwy(a, b);
  });
}
