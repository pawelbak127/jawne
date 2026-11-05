import { describe, expect, it } from 'vitest';
import { LINKI_PASKA, MENU, ROZWIJANE, SKROTY_PIENIADZE, SKROTY_SEJM } from './Nawigacja';

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

/*
 * Pasek na komputerze sklada sie z grup rozwijanych i dwoch linkow. Dzial, ktory
 * wypadlby z obu list, bylby na komputerze nieosiagalny, a nic by tego nie zglosilo.
 */
describe('pasek na komputerze', () => {
  const wPasku = [...ROZWIJANE.flatMap((g) => g.pozycje), ...LINKI_PASKA].map((p) => p.adres);

  it('nie gubi zadnego dzialu z menu', () => {
    for (const g of MENU) for (const p of g.pozycje) expect(wPasku).toContain(p.adres);
  });

  it('kazdy adres ma jedno miejsce', () => {
    expect(new Set(wPasku).size).toBe(wPasku.length);
  });

  it('kazda pozycja rozwijana ma opis, bo to on trafil do panelu', () => {
    for (const p of ROZWIJANE.flatMap((g) => g.pozycje)) expect(p.opis.length).toBeGreaterThan(0);
  });
});
