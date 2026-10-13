import { describe, expect, it } from 'vitest';
import { MENU, SKROTY_PIENIADZE, SKROTY_SEJM } from './Nawigacja';

/*
 * ZMIERZONE 13.10.2026: adres „Firmy” w MENU zmienil sie z /szukaj na /firmy,
 * a skrot na telefonie zostal na /szukaj. `skrot()` szuka pozycji z `!`,
 * wiec dostal undefined i wywrocil KAZDA strone serwisu (500) — typecheck,
 * lint i testy tego nie widzialy.
 */
describe('menu', () => {
  const adresy = new Set(MENU.flatMap((g) => g.pozycje.map((p) => p.adres)));
  it.each([...SKROTY_SEJM, ...SKROTY_PIENIADZE])('skrot %s jest w menu', (a) => {
    expect(adresy.has(a)).toBe(true);
  });
});
