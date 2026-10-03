/**
 * Komisje sejmowe — slowa dla czytelnika.
 *
 * Typ rejestr podaje po angielsku (STANDING, EXTRAORDINARY, INVESTIGATIVE).
 * Nieznany typ zostaje WYPISANY tak, jak przyszedl: lepsza surowa etykieta
 * niz zgadniete tlumaczenie (wzorzec 2 — nieznana wartosc jest raportowana,
 * nie przerywa).
 */
const TYPY: Record<string, { etykieta: string; mnoga: string }> = {
  STANDING: { etykieta: 'komisja stała', mnoga: 'Komisje stałe' },
  EXTRAORDINARY: { etykieta: 'komisja nadzwyczajna', mnoga: 'Komisje nadzwyczajne' },
  INVESTIGATIVE: { etykieta: 'komisja śledcza', mnoga: 'Komisje śledcze' },
};

export function etykietaTypu(typ: string): string {
  return TYPY[typ]?.etykieta ?? typ;
}

export function naglowekTypu(typ: string): string {
  return TYPY[typ]?.mnoga ?? typ;
}

/** Adres, pod ktorym rejestr podaje te sama komisje — odnosnik przy liczbie (zasada 1). */
export const adresKomisjiWRejestrze = (kod: string) =>
  `https://api.sejm.gov.pl/sejm/term10/committees/${encodeURIComponent(kod)}`;

/**
 * Czy funkcja to prowadzenie komisji. Rejestr pisze ja w obu rodzajach
 * („przewodniczący", „przewodnicząca", „zastępczyni przewodniczącej") —
 * zmierzone 03.10.2026 na 1 051 czlonkostwach.
 */
export function rodzajFunkcji(funkcja: string | null): 'przewodniczy' | 'zastepca' | 'czlonek' {
  if (!funkcja) return 'czlonek';
  const f = funkcja.toLowerCase();
  if (f.startsWith('przewodnicz')) return 'przewodniczy';
  if (f.startsWith('zast')) return 'zastepca';
  return 'czlonek';
}
