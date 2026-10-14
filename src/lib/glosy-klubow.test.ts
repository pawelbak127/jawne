import { describe, expect, it } from 'vitest';
import { klubyWgGlosu, najczestszyGlos } from './glosy-klubow';

const k = (klub_id: string, za: number, przeciw: number, wstrzymalo = 0) => ({ klub_id, za, przeciw, wstrzymalo });

describe('najczestszyGlos', () => {
  it('wybiera wyraznie najczestszy glos', () => {
    expect(najczestszyGlos(k('KO', 150, 2))).toBe('za');
    expect(najczestszyGlos(k('PiS', 0, 3, 140))).toBe('wstrzymał się');
  });
  it('remis i brak glosow to brak stanowiska, nie zgadujemy', () => {
    expect(najczestszyGlos(k('X', 5, 5))).toBeNull();
    expect(najczestszyGlos(k('Y', 0, 0))).toBeNull();
  });
});

describe('klubyWgGlosu', () => {
  it('grupuje od najliczniejszej grupy i pomija niezrzeszonych w mianowniku', () => {
    const w = klubyWgGlosu([k('KO', 150, 0), k('Lewica', 20, 0), k('PiS', 0, 140), k('niez.', 3, 1), k('Razem', 2, 2)]);
    expect(w.klubow).toBe(4);
    expect(w.grupy).toEqual([{ glos: 'za', kluby: ['KO', 'Lewica'] }, { glos: 'przeciw', kluby: ['PiS'] }]);
    expect(w.bezStanowiska).toEqual(['Razem']);
  });
});
