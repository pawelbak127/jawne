/**
 * Numery druków wymienione w tytule głosowania.
 *
 * Rejestr procesów nie zawsze wiąże głosowania z etapami: ustawa 3147
 * (próg podatkowy, „Uchwalono”) miała przy etapach ZERO głosowań, a strona
 * pisała „Głosowania: jeszcze żadnego nad tym projektem” — choć głosowania
 * z 22.10.2026 „(druki nr 3147 i 3225)” były w bazie (przegląd treści
 * 24.10.2026). Druk w tytule pisze rejestr, nie my; zmierzone 24.10.2026:
 * 4 503 z 4 941 tytułów ma druk, warianty „(druk nr N)”, „(druki nr N i N)”,
 * „(druki nr N, N i N-A)”, a poza nawiasem „z druku nr N”.
 */
export function drukiZTytulu(tytul: string | null | undefined): string[] {
  if (!tytul) return [];
  const wynik = new Set<string>();
  for (const m of tytul.matchAll(/druk(?:i|u)?\s+nr\s+([^)]*?)(?:\)|$)/gi)) {
    for (const t of m[1]!.split(/,|\s+i\s+/)) {
      const n = /^\s*(\d+)(?:-[A-Z]+)?\s*$/.exec(t);
      if (n) wynik.add(n[1]!);
    }
  }
  return [...wynik];
}
