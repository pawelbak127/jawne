import { describe, expect, it } from 'vitest';
import { KLUBY, MANDATOW_W_IZBIE, klubyZMandatami } from './kluby';
import { dystansBarw } from './barwy';

describe('rejestr klubow', () => {
  it('mandaty sumuja sie do pelnej izby', () => {
    const suma = klubyZMandatami().reduce((a, k) => a + k.mandaty, 0);
    expect(suma).toBe(MANDATOW_W_IZBIE);
  });

  it('kolo bez liczebnosci ma null, a nie zero', () => {
    const kolo = KLUBY.find((k) => k.id === 'Polska2050-TD');
    expect(kolo?.mandaty).toBeNull();
  });

  it('identyfikatory sa unikalne', () => {
    expect(new Set(KLUBY.map((k) => k.id)).size).toBe(KLUBY.length);
  });
});

/*
 * Prog 20 w CIE76. Zmierzone minimum przy tym ukladzie to 22,4 (motyw jasny,
 * para Konfederacja_KP|niez.) i 25,4 (ciemny, Razem|Lewica) — prog stoi tuz
 * pod nim, zeby test wywalil sie przy pierwszej zmianie, ktora zblizy
 * sasiadow, a nie dopiero gdy zrobia sie nieodroznialne.
 */
describe('barwy sasiadujacych blokow', () => {
  const PROG = 20;

  for (const motyw of ['barwa', 'barwaCiemna'] as const) {
    it(`sasiedzi roznia sie w motywie ${motyw}`, () => {
      const bloki = klubyZMandatami();
      const zaBlisko: string[] = [];
      for (let i = 1; i < bloki.length; i++) {
        const a = bloki[i - 1]!.klub;
        const b = bloki[i]!.klub;
        const d = dystansBarw(a[motyw], b[motyw]);
        if (d < PROG) zaBlisko.push(`${a.id}|${b.id} = ${d.toFixed(1)}`);
      }
      expect(zaBlisko).toEqual([]);
    });
  }
});
