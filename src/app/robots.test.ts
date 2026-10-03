import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * ZMIERZONE 03.10.2026 na zrejestru.pl: /robots.txt oddawal nasza strone 404.
 * Serwis mowil „nie indeksuj" tylko meta-tagiem w HTML-u, a kanalu, ktory
 * roboty czytaja pierwszy, nie mial wcale.
 *
 * Test pilnuje rzeczy, ktorej nie widac w kodzie: ze oba kanaly mowia TO SAMO.
 * Rozjazd (robots.txt pozwala, meta zabrania) jest gorszy niz kazdy z nich
 * osobno, bo nie wiadomo, co serwis wlasciwie oswiadcza.
 */
const wczytaj = async (wartosc: string | undefined) => {
  vi.resetModules();
  if (wartosc === undefined) vi.stubEnv('JAWNE_INDEKSOWANIE', '');
  else vi.stubEnv('JAWNE_INDEKSOWANIE', wartosc);
  const { default: robots } = await import('./robots');
  const { INDEKSOWANIE_WLACZONE } = await import('@/lib/premiera');
  return { wynik: robots(), wlaczone: INDEKSOWANIE_WLACZONE };
};

afterEach(() => vi.unstubAllEnvs());

describe('robots.txt', () => {
  it('przed premiera zabrania wszystkiego i nie podaje mapy strony', async () => {
    const { wynik, wlaczone } = await wczytaj(undefined);
    expect(wlaczone).toBe(false);
    expect(wynik.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    // Wskazywanie 50 tys. adresow i jednoczesne zabranianie ich odwiedzania
    // to sprzeczny komunikat.
    expect(wynik.sitemap).toBeUndefined();
  });

  it('po premierze pozwala i podaje mape strony', async () => {
    const { wynik, wlaczone } = await wczytaj('tak');
    expect(wlaczone).toBe(true);
    expect(wynik.rules).toEqual([{ userAgent: '*', allow: '/' }]);
    expect(String(wynik.sitemap)).toMatch(/\/sitemap\.xml$/);
  });

  it.each(['TAK', 'true', '1', 'nie', ' '])('nie wlacza sie na %o', async (w) => {
    // Jedna wartosc wlacza indeksowanie i tylko jedna. „true" albo „1"
    // wygladaja na zgode, a nie sa nia — zgoda to decyzja, nie literowka.
    const { wlaczone } = await wczytaj(w);
    expect(wlaczone).toBe(false);
  });
});
