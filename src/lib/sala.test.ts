import { describe, expect, it } from 'vitest';
import { MANDATOW_W_IZBIE } from './kluby';
import { MIEJSCA, PLAN_SZEROKOSC, PLAN_WYSOKOSC, STAN_PLANU } from './plan-sali';
import { miejscePosla, polaczPlan, type PoselDoPlanu } from './sala';

const posel = (id: number, nazwisko: string, klub: string | null = 'KO'): PoselDoPlanu => ({
  id,
  slug: `${nazwisko.toLowerCase()}-${id}`,
  imie_nazwisko: `Jan ${nazwisko}`,
  klub_id: klub,
  okreg_nazwa: 'Kraków',
  okreg_nr: 13,
});

describe('plan sali (dane z rysunku Kancelarii Sejmu)', () => {
  it('ma dokladnie tyle miejsc, ilu poslow liczy izba', () => {
    // Plan, z ktorego czytelnik liczy sile klubow, nie moze gubic miejsc.
    expect(MIEJSCA.length).toBe(MANDATOW_W_IZBIE);
  });

  it('nie sadza dwoch poslow na jednym miejscu', () => {
    expect(new Set(MIEJSCA.map((m) => m[0])).size).toBe(MIEJSCA.length);
    const numery = MIEJSCA.map((m) => m[1]).filter((n): n is number => n !== null);
    expect(new Set(numery).size).toBe(numery.length);
  });

  it('trzyma wszystkie miejsca w zadeklarowanym obszarze', () => {
    for (const [, , x, y] of MIEJSCA) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(PLAN_SZEROKOSC);
      expect(y).toBeLessThanOrEqual(PLAN_WYSOKOSC);
    }
  });

  it('ma wspolrzedne zaokraglone — inaczej Node i Chrome rozjadaja sie przy hydracji', () => {
    for (const [, , x, y] of MIEJSCA) {
      expect(Math.round(x * 10)).toBe(+(x * 10).toFixed(6));
      expect(Math.round(y * 10)).toBe(+(y * 10).toFixed(6));
    }
  });

  it('wie, z ktorego dnia jest rysunek', () => {
    expect(STAN_PLANU).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('polaczPlan', () => {
  it('oddaje miejsca z barwa klubu i numerem okregu', () => {
    const { miejsca, bezPosla } = polaczPlan([[7, 217, 10, 20]], [posel(7, 'Kowalski')]);
    expect(bezPosla).toBe(0);
    expect(miejsca).toHaveLength(1);
    expect(miejsca[0]).toMatchObject({ id: 7, numer: 217, x: 10, y: 20, nazwa: 'Jan Kowalski' });
    expect(miejsca[0]!.okreg).toBe('okręg 13 · Kraków');
    expect(miejsca[0]!.barwa).not.toBe('');
  });

  it('nie wyswietla miejsca posla, ktorego nie ma juz w rejestrze — i mowi, ile ich bylo', () => {
    const { miejsca, bezPosla } = polaczPlan(
      [
        [7, 1, 0, 0],
        [8, 2, 0, 0],
      ],
      [posel(7, 'Kowalski')],
    );
    expect(miejsca).toHaveLength(1);
    expect(bezPosla).toBe(1);
  });

  it('posel bez klubu dostaje barwe, a nie pusty kolor', () => {
    const { miejsca } = polaczPlan([[7, null, 0, 0]], [posel(7, 'Kowalski', null)]);
    expect(miejsca[0]!.barwa).toMatch(/^#[0-9a-f]{6}$/);
    expect(miejsca[0]!.klubEtykieta).toBe('bez klubu');
    expect(miejsca[0]!.numer).toBeNull();
  });

  it('znajduje miejsce jednego posla', () => {
    expect(miejscePosla(MIEJSCA, MIEJSCA[0]![0])).toEqual(MIEJSCA[0]);
    expect(miejscePosla(MIEJSCA, -1)).toBeNull();
  });
});
