import { describe, expect, it } from 'vitest';
import { domknij, pole, uprosc, type Punkt } from './geometria';

describe('uprosc', () => {
  it('prosta zostaje dwoma punktami', () => {
    const linia: Punkt[] = [[0, 0], [1, 0.0001], [2, 0], [3, 0.0001], [4, 0]];
    expect(uprosc(linia, 0.01)).toEqual([[0, 0], [4, 0]]);
  });

  it('zalamanie przezywa uproszczenie', () => {
    const linia: Punkt[] = [[0, 0], [1, 0], [2, 5], [3, 0], [4, 0]];
    const w = uprosc(linia, 0.5);
    expect(w).toContainEqual([2, 5]);
    expect(w[0]).toEqual([0, 0]);
    expect(w[w.length - 1]).toEqual([4, 0]);
  });

  it('nigdy nie gubi konca ani poczatku', () => {
    const linia: Punkt[] = Array.from({ length: 500 }, (_, i) => [i, Math.sin(i / 50)] as Punkt);
    const w = uprosc(linia, 0.2);
    expect(w.length).toBeLessThan(linia.length);
    expect(w[0]).toEqual(linia[0]);
    expect(w[w.length - 1]).toEqual(linia[linia.length - 1]);
  });

  it('radzi sobie z dlugim konturem — bez rekurencji i w rozsadnym czasie', () => {
    // Kontur gminy potrafi miec dziesiatki tysiecy punktow; rekurencyjny
    // Douglas-Peucker przepelnilby na tym stos. Okrag, bo to ksztalt
    // zblizony do prawdziwej granicy — na piloksztaltnej sinusoidzie
    // KAZDY punkt jest istotny i algorytm z natury robi sie kwadratowy.
    const dlugi: Punkt[] = Array.from({ length: 60_000 }, (_, i) => {
      const k = (2 * Math.PI * i) / 60_000;
      return [Math.cos(k), Math.sin(k)] as Punkt;
    });
    const start = Date.now();
    const w = uprosc(dlugi, 0.01);
    expect(w.length).toBeLessThan(200);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('dwa punkty zostaja bez zmian', () => {
    expect(uprosc([[0, 0], [1, 1]], 10)).toEqual([[0, 0], [1, 1]]);
  });
});

describe('domknij', () => {
  it('dopisuje pierwszy punkt na koncu, gdy go brak', () => {
    expect(domknij([[0, 0], [1, 0], [1, 1]])).toEqual([[0, 0], [1, 0], [1, 1], [0, 0]]);
  });

  it('nie dubluje juz domknietego pierscienia', () => {
    const p: Punkt[] = [[0, 0], [1, 0], [0, 0]];
    expect(domknij(p)).toEqual(p);
  });
});

describe('pole', () => {
  it('kwadrat 2x2 ma pole 4', () => {
    expect(pole([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]])).toBe(4);
  });

  it('nie zalezy od kierunku obiegu', () => {
    const zgodnie: Punkt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const przeciwnie = [...zgodnie].reverse();
    expect(pole(zgodnie)).toBe(pole(przeciwnie));
  });
});
