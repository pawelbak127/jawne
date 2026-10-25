/**
 * Polski porządek alfabetyczny. SQLite (`collate nocase`) porównuje bajty,
 * więc „Ł” lądowało po „Z”: na /poslowie Błaszczak stał po Burzyńskiej,
 * Ścigaj po Wassermann, a województwo łódzkie na końcu listy (zmierzone
 * 24.10.2026, przegląd treści). `node:sqlite` nie przyjmuje własnych
 * porównań, więc sortujemy w kodzie, po zapytaniu.
 */
const PL = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });

/** Porównanie dwóch napisów po polsku; `null` na końcu. */
export function porownajPl(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  return PL.compare(a, b);
}

/**
 * Kopia listy posortowana kolejnymi kluczami po polsku. Klucz liczbowy
 * (np. „aktywny desc”) podaj jako funkcję zwracającą liczbę — porównujemy
 * go jako liczbę.
 */
export function poPolsku<T>(lista: readonly T[], ...klucze: ((x: T) => string | number | null | undefined)[]): T[] {
  return [...lista].sort((x, y) => {
    for (const k of klucze) {
      const a = k(x);
      const b = k(y);
      const w = typeof a === 'number' || typeof b === 'number'
        ? (Number(a ?? 0) - Number(b ?? 0))
        : porownajPl(a as string | null | undefined, b as string | null | undefined);
      if (w !== 0) return w;
    }
    return 0;
  });
}
