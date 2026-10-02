import { describe, expect, it } from 'vitest';
import { chmurkaPozycja } from './chmurka.js';

// Zmierzone 01.10.2026 na 390 px: pudelko polkola ma 294-308 px, a jego
// chmurka `max-w-[18rem]` to 288 px. Plan sali: pudelko 322-356 px,
// chmurka 304x100.
const POLKOLE = { szer: 288, wys: 64 };
const PLAN = { szer: 304, wys: 100 };

describe('chmurkaPozycja', () => {
  it('w pudełku z zapasem idzie w prawo i w dół', () => {
    const p = chmurkaPozycja({ x: 20, y: 20, w: 800, h: 500 }, PLAN);
    expect(p).toEqual({ left: 34, top: 34 });
  });

  it('PRZY PRAWEJ KRAWĘDZI odbija się w lewo — to był błąd w Polkole', () => {
    // Pudelko 294 px (zmierzone), kursor przy prawej krawedzi. Twarda liczba
    // 420 nigdy by sie nie uruchomila, bo 294 < 420.
    const p = chmurkaPozycja({ x: 280, y: 30, w: 294, h: 300 }, POLKOLE);
    expect(p.left).toBe(4);
    expect(p.left + POLKOLE.szer).toBeLessThanOrEqual(294);
  });

  it('chmurka NIGDY nie wychodzi za prawą krawędź pudełka', () => {
    for (const w of [294, 308, 322, 356, 390, 736]) {
      for (let x = 0; x <= w; x += 7) {
        const p = chmurkaPozycja({ x, y: 50, w, h: 400 }, POLKOLE);
        expect(p.left).toBeGreaterThanOrEqual(0);
        // Gdy pudelko jest wezsze od chmurki, nie da sie zmiescic — ale lewa
        // krawedz musi zostac widoczna, bo tam jest poczatek tekstu.
        if (w >= POLKOLE.szer + 2 * 14) expect(p.left + POLKOLE.szer).toBeLessThanOrEqual(w);
      }
    }
  });

  it('przy DOLNEJ krawędzi odbija się do góry', () => {
    const p = chmurkaPozycja({ x: 20, y: 290, w: 400, h: 320 }, PLAN);
    expect(p.top).toBe(290 - 14 - 100);
    expect(p.top + PLAN.wys).toBeLessThanOrEqual(320);
  });

  it('w pudełku WĘŻSZYM od chmurki nie daje wartości ujemnej', () => {
    // Zdarza sie na bardzo waskich ekranach; lepiej chmurka uciety z prawej
    // niz przesunieta poza ekran w lewo.
    const p = chmurkaPozycja({ x: 10, y: 10, w: 200, h: 120 }, PLAN);
    expect(p.left).toBeGreaterThanOrEqual(4);
    expect(p.top).toBeGreaterThanOrEqual(4);
  });

  it('oba wymiary rozstrzygane są niezależnie', () => {
    // Prawy gorny rog: w lewo, ale w dol.
    const p = chmurkaPozycja({ x: 280, y: 10, w: 300, h: 500 }, POLKOLE);
    expect(p.left).toBe(4);
    expect(p.top).toBe(24);
  });
});
