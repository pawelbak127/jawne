import { describe, expect, it } from 'vitest';
import { PLIKI_MAPY, xmlIndeksu, xmlMapy } from './mapa-strony';

describe('mapa strony w dwoch plikach', () => {
  it('sklada urlset z data tam, gdzie ja podano', () => {
    const wynik = xmlMapy([
      { url: 'https://zrejestru.pl/' },
      { url: 'https://zrejestru.pl/glosowanie/1-2', lastModified: '2023-11-13' },
    ]);
    expect(wynik).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    expect(wynik).toContain('<url><loc>https://zrejestru.pl/</loc></url>');
    expect(wynik).toContain('<url><loc>https://zrejestru.pl/glosowanie/1-2</loc><lastmod>2023-11-13</lastmod></url>');
    expect(wynik.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('pusta lista to poprawny, pusty plik — nie blad', () => {
    expect(xmlMapy([])).toContain('<urlset');
    expect(xmlMapy([])).not.toContain('<url>');
  });

  it('zamienia znaki XML na encje', () => {
    expect(xmlMapy([{ url: 'https://x.pl/a?b=1&c=<2>' }])).toContain('<loc>https://x.pl/a?b=1&amp;c=&lt;2&gt;</loc>');
  });

  it('indeks wskazuje oba pliki', () => {
    const wynik = xmlIndeksu(PLIKI_MAPY.map((p) => `https://zrejestru.pl${p}`));
    expect(wynik).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(wynik.match(/<sitemap><loc>/g)).toHaveLength(2);
    expect(wynik).toContain('<loc>https://zrejestru.pl/sitemap-strony.xml</loc>');
    expect(wynik).toContain('<loc>https://zrejestru.pl/sitemap-firmy.xml</loc>');
  });
});
