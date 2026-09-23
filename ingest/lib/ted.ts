/**
 * TED (Tenders Electronic Daily) — unijny rejestr zamowien publicznych.
 *
 * ZMIERZONE 23.09.2026 na api.ted.europa.eu/v3:
 * - `POST /notices/search` z zapytaniem w jezyku TED; `limit` do 250 dziala,
 * - **okno wynikow: page x limit <= 15 000** (powyzej HTTP 400
 *   SEARCH_WINDOW_TOO_WIDE). Dlatego pobieramy miesiac po miesiacu —
 *   polski miesiac to 3-4 tys. ogloszen, czyli ok. 16 stron,
 * - polskich ogloszen o udzieleniu zamowienia od poczatku kadencji
 *   (13.11.2023) jest 129 077,
 * - nazwy i tytuly przychodza jako mapa jezykow: {"pol": [...]}, przy czym
 *   pierwszym jezykiem bywa obcy (widziany "hun" przy polskim ogloszeniu).
 */
import { pobierzJson } from './http.js';

const ADRES = 'https://api.ted.europa.eu/v3/notices/search';

export const POLA = [
  'publication-number', 'publication-date', 'notice-title',
  'organisation-name-buyer', 'organisation-identifier-buyer',
  'winner-identifier', 'organisation-name-tenderer',
  'total-value', 'total-value-cur', 'classification-cpv',
] as const;

export type OgloszenieTed = {
  'publication-number': string;
  'publication-date'?: string;
  'notice-title'?: Record<string, string | string[]>;
  'organisation-name-buyer'?: Record<string, string[]>;
  'organisation-identifier-buyer'?: string[];
  'winner-identifier'?: string[];
  'organisation-name-tenderer'?: Record<string, string[]>;
  'total-value'?: number;
  'total-value-cur'?: string[];
  'classification-cpv'?: string[];
};

export type OdpowiedzTed = { notices?: OgloszenieTed[]; totalNoticeCount?: number };

/** Zapytanie o polskie ogloszenia o udzieleniu zamowienia w danym miesiacu. */
export function zapytanieMiesiaca(od: string, doDnia: string): string {
  return `buyer-country IN (POL) AND notice-type IN (can-standard)`
    + ` AND publication-date >= ${od.replace(/-/g, '')}`
    + ` AND publication-date <= ${doDnia.replace(/-/g, '')}`;
}

export async function szukaj(query: string, strona: number, limit = 250): Promise<OdpowiedzTed> {
  return pobierzJson<OdpowiedzTed>(ADRES, {
    metoda: 'POST',
    cialo: JSON.stringify({ query, limit, page: strona, fields: [...POLA] }),
  });
}

/** Tekst z mapy jezykow: polski, a gdy go nie ma — pierwszy jaki jest. */
export function poPolsku(pole: Record<string, string | string[]> | undefined): string | null {
  if (!pole) return null;
  const wybierz = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return wybierz(pole.pol) ?? wybierz(Object.values(pole)[0]) ?? null;
}
