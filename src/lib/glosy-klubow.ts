import { NIE_KLUBY } from './niezaleznosc';

export type LiczbyKlubu = { klub_id: string; za: number; przeciw: number; wstrzymalo: number };
export type GlosKlubu = 'za' | 'przeciw' | 'wstrzymał się';

const OPCJE: { klucz: 'za' | 'przeciw' | 'wstrzymalo'; glos: GlosKlubu }[] = [
  { klucz: 'za', glos: 'za' },
  { klucz: 'przeciw', glos: 'przeciw' },
  { klucz: 'wstrzymalo', glos: 'wstrzymał się' },
];

/**
 * Najczestszy glos klubu — albo null przy remisie albo braku glosow.
 * Remis to remis: klub z rowna liczba „za” i „przeciw” nie ma stanowiska,
 * ktore moglibysmy mu przypisac (zasada 2 — nie zgadujemy).
 */
export function najczestszyGlos(w: LiczbyKlubu): GlosKlubu | null {
  const [a, b] = OPCJE.map((o) => ({ ...o, ile: w[o.klucz] })).sort((x, y) => y.ile - x.ile);
  return a!.ile > 0 && a!.ile > b!.ile ? a!.glos : null;
}

/**
 * Kluby pogrupowane po najczestszym glosie, od najliczniejszej grupy.
 * Niezrzeszeni nie tworza klubu (NIE_KLUBY), wiec nie wchodza ani do grup,
 * ani do mianownika — ich wiersz zostaje w tabeli, ale nie w zdaniu.
 */
export function klubyWgGlosu(wyniki: LiczbyKlubu[]): {
  grupy: { glos: GlosKlubu; kluby: string[] }[];
  klubow: number;
  bezStanowiska: string[];
} {
  const prawdziwe = wyniki.filter((w) => !NIE_KLUBY.has(w.klub_id));
  const mapa = new Map<GlosKlubu, string[]>();
  const bezStanowiska: string[] = [];
  for (const w of prawdziwe) {
    const g = najczestszyGlos(w);
    if (g) mapa.set(g, [...(mapa.get(g) ?? []), w.klub_id]);
    else bezStanowiska.push(w.klub_id);
  }
  const grupy = [...mapa.entries()]
    .map(([glos, kluby]) => ({ glos, kluby }))
    .sort((a, b) => b.kluby.length - a.kluby.length);
  return { grupy, klubow: prawdziwe.length, bezStanowiska };
}
