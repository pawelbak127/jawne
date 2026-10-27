/**
 * Mapa strony w dwoch plikach i indeks, ktory je wskazuje (protokol
 * sitemaps.org). Czyste funkcje — dane sklada `mapa-strony-dane.ts`.
 *
 * Dlaczego dwa pliki (decyzja Pawla z 27.10.2026): Search Console liczy
 * indeksowanie osobno dla kazdego pliku mapy. Raport z 27.10 mial 46 857
 * adresow „wykrytych — niezindeksowanych”, w probce 73% to strony firm —
 * ale jedna wspolna liczba nie mowi, czy strony gmin, ustaw i glosowan
 * czekaja w kolejce za firmami, czy wchodza normalnie. Po podziale widac
 * to wprost, a decyzja o przycieciu firm opiera sie na pomiarze.
 */

export type WpisMapy = { url: string; lastModified?: string };

/** Pliki wskazywane przez indeks `/sitemap.xml`, w tej kolejnosci. */
export const PLIKI_MAPY = ['/sitemap-strony.xml', '/sitemap-firmy.xml'] as const;

const ENCJE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (s: string) => s.replace(/[&<>"']/g, (z) => ENCJE[z]!);

const NAGLOWEK = '<?xml version="1.0" encoding="UTF-8"?>';
const PRZESTRZEN = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

export function xmlMapy(wpisy: WpisMapy[]): string {
  const wiersze = wpisy.map((w) => `<url><loc>${xml(w.url)}</loc>`
    + `${w.lastModified ? `<lastmod>${xml(w.lastModified)}</lastmod>` : ''}</url>`);
  return [NAGLOWEK, `<urlset ${PRZESTRZEN}>`, ...wiersze, '</urlset>', ''].join('\n');
}

export function xmlIndeksu(pliki: string[]): string {
  const wiersze = pliki.map((p) => `<sitemap><loc>${xml(p)}</loc></sitemap>`);
  return [NAGLOWEK, `<sitemapindex ${PRZESTRZEN}>`, ...wiersze, '</sitemapindex>', ''].join('\n');
}

export function odpowiedzXml(tresc: string): Response {
  return new Response(tresc, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
