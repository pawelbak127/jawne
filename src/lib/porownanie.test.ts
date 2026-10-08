import { describe, expect, it } from 'vitest';
import { ileRazy, zdaniePorownania } from './porownanie';

describe('ileRazy', () => {
  it('ułamek bierze „raza”, liczba całkowita „razy”', () => {
    expect(ileRazy(1.43)).toBe('1,4 raza');
    expect(ileRazy(3.44)).toBe('3,4 raza');
    expect(ileRazy(2.04)).toBe('2 razy');
    expect(ileRazy(2.5)).toBe('2,5 raza');
  });
  it('od 10 bez części dziesiętnej', () => {
    expect(ileRazy(12.6)).toBe('13 razy');
  });
});

describe('zdaniePorownania', () => {
  const MED = 'mediana w województwie';
  it('rachunki z prototypu (docs/przebudowa/kierunek.md)', () => {
    expect(zdaniePorownania(11842, 8288, MED)).toBe('1,4 raza więcej niż mediana w województwie.');
    expect(zdaniePorownania(4392, 1275, MED)).toBe('3,4 raza więcej niż mediana w województwie.');
  });
  it('mniej — odwrotna krotność, bez ułamka „0,3 raza”', () => {
    expect(zdaniePorownania(1255, 1922, MED)).toBe('1,5 raza mniej niż mediana w województwie.');
  });
  it('różnica w granicach szumu to „mniej więcej tyle”', () => {
    expect(zdaniePorownania(105, 100, MED)).toBe('Mniej więcej tyle, co mediana w województwie.');
  });
  it('bez zdania, gdy porównanie nic by nie znaczyło (zasada 4)', () => {
    expect(zdaniePorownania(null, 100, MED)).toBeNull();
    expect(zdaniePorownania(100, null, MED)).toBeNull();
    expect(zdaniePorownania(100, 0, MED)).toBeNull();
    expect(zdaniePorownania(0, 100, MED)).toBeNull();
  });
});
