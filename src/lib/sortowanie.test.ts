import { describe, expect, it } from 'vitest';
import { poPolsku, porownajPl } from './sortowanie';

describe('poPolsku — przegląd treści 24.10.2026', () => {
  it('„Ł” po „L”, „Ś” po „S”, nie po „Z” (Błaszczak przed Burzyńską)', () => {
    const nazwiska = ['Burzyńska', 'Błaszczak', 'Wassermann', 'Ścigaj', 'Sadowski', 'Lis', 'Łukaszewicz', 'Żukowska', 'Zalewski'];
    expect(poPolsku(nazwiska, (x) => x)).toEqual([
      'Błaszczak', 'Burzyńska', 'Lis', 'Łukaszewicz', 'Sadowski', 'Ścigaj', 'Wassermann', 'Zalewski', 'Żukowska',
    ]);
  });

  it('województwa: łódzkie po lubuskim, nie na końcu', () => {
    expect(poPolsku(['zachodniopomorskie', 'łódzkie', 'lubuskie', 'śląskie', 'świętokrzyskie'], (x) => x))
      .toEqual(['lubuskie', 'łódzkie', 'śląskie', 'świętokrzyskie', 'zachodniopomorskie']);
  });

  it('kilka kluczy, w tym liczbowy; null na końcu; kopia, nie zmiana w miejscu', () => {
    const lista = [{ a: 0, n: 'Ąb' }, { a: 1, n: 'Zz' }, { a: 1, n: 'Ab' }, { a: 0, n: null }];
    const wynik = poPolsku(lista, (x) => -x.a, (x) => x.n);
    expect(wynik.map((x) => x.n)).toEqual(['Ab', 'Zz', 'Ąb', null]);
    expect(lista[0]!.n).toBe('Ąb');
    expect(porownajPl('a', 'A')).toBe(0);
  });
});
