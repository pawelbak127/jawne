import { describe, expect, it } from 'vitest';
import { tytulUstawy } from './tytul-ustawy';

describe('tytulUstawy — przegląd treści 24.10.2026', () => {
  it('przedrostek do metryczki, reszta słowo w słowo', () => {
    expect(tytulUstawy('Rządowy projekt ustawy o zmianie ustawy o podatku dochodowym od osób fizycznych'))
      .toEqual({ krotki: 'Zmiana ustawy o podatku dochodowym od osób fizycznych', autor: 'rządowy' });
    expect(tytulUstawy('Poselski projekt ustawy o ochronie ludności'))
      .toEqual({ krotki: 'Ustawa o ochronie ludności', autor: 'poselski' });
    expect(tytulUstawy('Przedstawiony przez Prezydenta Rzeczypospolitej Polskiej projekt ustawy o szczególnych rozwiązaniach'))
      .toEqual({ krotki: 'Ustawa o szczególnych rozwiązaniach', autor: 'prezydencki' });
    expect(tytulUstawy('Rządowy projekt ustawy budżetowej na rok 2024'))
      .toEqual({ krotki: 'Ustawa budżetowa na rok 2024', autor: 'rządowy' });
    expect(tytulUstawy('Rządowy projekt ustawy zmieniającej ustawę o rynku mocy'))
      .toEqual({ krotki: 'Zmiana ustawy o rynku mocy', autor: 'rządowy' });
    expect(tytulUstawy('Rządowy projekt ustawy o ratyfikacji Umowy między …'))
      .toEqual({ krotki: 'Ustawa o ratyfikacji Umowy między …', autor: 'rządowy' });
  });

  it('nieznany kształt tytułu — zostaje w całości, bez autora', () => {
    expect(tytulUstawy('Projekt uchwały w sprawie …')).toEqual({ krotki: 'Projekt uchwały w sprawie …', autor: null });
    expect(tytulUstawy('Rządowy projekt rozporządzenia …')).toEqual({ krotki: 'Rządowy projekt rozporządzenia …', autor: null });
  });
});
