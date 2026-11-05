import { describe, expect, it } from 'vitest';
import { OPIS_ZAKRESU, opisFirmy, ZAKRESY, zakresZParametru } from './wyszukiwanie';

describe('zakresZParametru', () => {
  it.each(ZAKRESY)('zna zakres %s', (z) => {
    expect(zakresZParametru(z)).toBe(z);
  });
  it.each([[undefined], [null], [''], ['GMINY'], ['glosowania'], [['gminy', 'firmy']]])('nieznany %j to „wszystko”', (w) => {
    expect(zakresZParametru(w)).toBe('wszystko');
  });
  it('tylko „wszystko” nie zawęża wyników', () => {
    expect(ZAKRESY.filter((z) => OPIS_ZAKRESU[z].wsrod === null)).toEqual(['wszystko']);
  });
});

describe('opisFirmy', () => {
  it.each([[1, '1 przypadek pomocy'], [3, '3 przypadki pomocy'], [12, '12 przypadków pomocy'],
    [22, '22 przypadki pomocy'], [25, '25 przypadków pomocy']])('%i', (n, opis) => {
    expect(opisFirmy({ przypadkow: n })).toBe(opis);
  });
  it('z gmina na poczatku', () => {
    expect(opisFirmy({ gmina: 'Kraków', przypadkow: 2 })).toBe('Kraków · 2 przypadki pomocy');
  });
});
