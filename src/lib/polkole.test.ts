import { describe, expect, it } from 'vitest';
import { przydzielBloki, ulozPolkole } from './polkole';
import { klubyZMandatami, MANDATOW_W_IZBIE } from './kluby';

describe('ulozPolkole', () => {
  // To jest test merytoryczny, nie kosmetyczny: z wykresu izby czytelnik
  // liczy wiekszosc, wiec brakujaca kropka jest bledem w liczbie.
  it('daje dokladnie tyle miejsc, ile mandatow', () => {
    for (const n of [460, 100, 13, 3, 1, 559]) {
      expect(ulozPolkole(n).miejsca).toHaveLength(n);
    }
  });

  it('wszystkie miejsca leza w gornej polowce', () => {
    for (const m of ulozPolkole(460).miejsca) {
      expect(m.y).toBeLessThanOrEqual(0.0001);
    }
  });

  it('miejsca sa uporzadkowane od lewej do prawej', () => {
    const m = ulozPolkole(460).miejsca;
    const x = m.map((p) => p.x);
    expect(x[0]!).toBeLessThan(0);
    expect(x[x.length - 1]!).toBeGreaterThan(0);
  });

  it('kropki nie wychodzza poza plotno', () => {
    const u = ulozPolkole(460);
    for (const m of u.miejsca) {
      expect(Math.abs(m.x) + m.r).toBeLessThanOrEqual(u.szerokosc / 2);
      expect(Math.abs(m.y) + m.r).toBeLessThanOrEqual(u.wysokosc);
    }
  });

  // Serwer i przegladarka licza trygonometrie z roznica na ostatniej cyfrze.
  // Bez zaokraglenia React zglasza niezgodnosc hydracji na atrybutach cx/cy.
  it('wspolrzedne maja najwyzej trzy miejsca po przecinku', () => {
    for (const m of ulozPolkole(460).miejsca) {
      for (const v of [m.x, m.y, m.r]) {
        expect(Math.abs(v * 1000 - Math.round(v * 1000))).toBeLessThan(1e-6);
      }
    }
  });

  it('zadna kropka nie ma zerowego ani ujemnego promienia', () => {
    for (const m of ulozPolkole(460).miejsca) expect(m.r).toBeGreaterThan(0);
  });
});

describe('przydzielBloki', () => {
  it('rozdaje miejsca po kolei', () => {
    expect(przydzielBloki(5, [2, 3])).toEqual([0, 0, 1, 1, 1]);
  });

  // Cicha rozbieznosc miedzy liczba mandatow a liczba kropek to dokladnie
  // ten rodzaj bledu, ktorego nie zglosi ani typecheck, ani build.
  it('rzuca, gdy bloki nie sumuja sie do liczby miejsc', () => {
    expect(() => przydzielBloki(5, [2, 2])).toThrow(/sumuja sie do 4.*miejsc jest 5/);
  });

  it('mandaty klubow zgadzaja sie z miejscami w izbie', () => {
    const rozmiary = klubyZMandatami().map((k) => k.mandaty);
    const uklad = ulozPolkole(MANDATOW_W_IZBIE);
    expect(() => przydzielBloki(uklad.miejsca.length, rozmiary)).not.toThrow();
  });
});
