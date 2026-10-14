import { describe, expect, it } from 'vitest';
import { mediana, uporzadkuj, type WierszPorownania } from './porownanie-gmin';

const w = (nazwa: string, powiat: string, dochody: number | null, pomoc: number | null = 0): WierszPorownania =>
  ({ teryt: nazwa, nazwa, rodzaj: 'gmina', powiat, osob: 1000, dochody, ue: 0, pomoc });

const W = [w('Zator', 'oświęcimski', 9000), w('Alwernia', 'chrzanowski', null), w('Babice', 'chrzanowski', 7000), w('Chełmek', 'oświęcimski', 7000)];

describe('mediana', () => {
  it('pomija null, liczy zero i podaje, z ilu wartości', () => {
    expect(mediana([3, null, 1, 2])).toEqual({ wartosc: 2, z: 3 });
    expect(mediana([0, 0, 10, 20])).toEqual({ wartosc: 5, z: 4 });
    expect(mediana([null, null])).toBeNull();
  });
});

describe('uporzadkuj', () => {
  it('domyślnie powiat i nazwa, z polskim porządkiem liter', () => {
    expect(uporzadkuj(W, 'powiat').map((x) => x.nazwa)).toEqual(['Alwernia', 'Babice', 'Chełmek', 'Zator']);
    expect(uporzadkuj([w('Łęki', 'a', 1), w('Lubień', 'a', 1), w('Mszana', 'a', 1)], 'powiat').map((x) => x.nazwa))
      .toEqual(['Lubień', 'Łęki', 'Mszana']);
  });

  it('brak wartości na końcu w OBU kierunkach — nie udaje zera', () => {
    expect(uporzadkuj(W, 'dochody-malejaco').map((x) => x.nazwa)).toEqual(['Zator', 'Babice', 'Chełmek', 'Alwernia']);
    expect(uporzadkuj(W, 'dochody-rosnaco').map((x) => x.nazwa)).toEqual(['Babice', 'Chełmek', 'Zator', 'Alwernia']);
  });

  it('nie zmienia tablicy wejściowej', () => {
    const kopia = [...W];
    uporzadkuj(W, 'dochody-malejaco');
    expect(W).toEqual(kopia);
  });
});
