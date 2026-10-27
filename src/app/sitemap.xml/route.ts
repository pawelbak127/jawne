import { ADRES_SERWISU } from '@/lib/adres';
import { odpowiedzXml, PLIKI_MAPY, xmlIndeksu } from '@/lib/mapa-strony';

/*
 * Indeks map strony. Adres zostaje ten sam co przed podzialem (27.10.2026),
 * wiec mapa zgloszona w Search Console i wpis w robots.txt dzialaja dalej.
 * Dlaczego dwa pliki — `src/lib/mapa-strony.ts`.
 */
// Trasa GET bez tego liczylaby sie przy kazdym zadaniu (Next 15+).
export const revalidate = 3600;

export function GET(): Response {
  return odpowiedzXml(xmlIndeksu(PLIKI_MAPY.map((p) => new URL(p, ADRES_SERWISU).toString())));
}
