import { describe, expect, it } from 'vitest';
import { opisFirmy } from './wyszukiwanie';

describe('opisFirmy', () => {
  it.each([[1, '1 przypadek pomocy'], [3, '3 przypadki pomocy'], [12, '12 przypadków pomocy'],
    [22, '22 przypadki pomocy'], [25, '25 przypadków pomocy']])('%i', (n, opis) => {
    expect(opisFirmy({ przypadkow: n })).toBe(opis);
  });
  it('z gmina na poczatku', () => {
    expect(opisFirmy({ gmina: 'Kraków', przypadkow: 2 })).toBe('Kraków · 2 przypadki pomocy');
  });
});
