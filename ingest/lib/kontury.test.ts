import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KonturyGmin } from './kontury';

// Pierscien w zapisie pliku: pierwszy punkt bezwzglednie, dalej przyrosty, razy skala.
const kwadrat = (x: number, y: number, bok: number) => `${x},${y} ${bok},0 0,${bok} ${-bok},0`;

describe('KonturyGmin', () => {
  // Gmina wiejska 0002 (10 x 10) z dziura na miasto 0001 (4 x 4 w srodku)
  // i gmina 0003 bez dziury, z miastem 0004 w srodku.
  const k = new KonturyGmin({
    skala: 1,
    gminy: {
      '000001': [kwadrat(3, 3, 4)],
      '000002': [kwadrat(0, 0, 10), kwadrat(3, 3, 4)],
      '000003': [kwadrat(20, 0, 10)],
      '000004': [kwadrat(23, 3, 4)],
    },
  });

  it('dziura w gminie wiejskiej nalezy do miasta', () => {
    expect(k.gmina(5, 5)).toBe('000001');
    expect(k.gmina(1, 1)).toBe('000002');
  });

  it('kontur bez dziury — wygrywa mniejsza gmina, czyli miasto w srodku', () => {
    expect(k.gmina(25, 5)).toBe('000004');
    expect(k.gmina(21, 1)).toBe('000003');
  });

  it('poza konturami — null, nie najblizsza gmina', () => {
    expect(k.gmina(15, 5)).toBeNull();
  });

  it('prawdziwe kontury PRG: znane adresy trafiaja do swoich gmin', () => {
    const plik = JSON.parse(readFileSync('public/mapa/gminy.json', 'utf8'));
    const prg = new KonturyGmin(plik);
    // Uniwersytet Ekonomiczny w Katowicach, ul. 1 Maja 50 (wspolrzedne z CORDIS).
    expect(prg.gmina(19.044673666, 50.258447412)).toBe('246901');
    // Palac Kultury i Nauki — Warszawa jest w PRG jedna jednostka.
    expect(prg.gmina(21.0067, 52.2318)).toBe('146501');
    // Rynek w Belchatowie — miasto, nie okalajaca je gmina wiejska.
    expect(prg.gmina(19.3713, 51.3683)).toBe('100101');
  });
});
