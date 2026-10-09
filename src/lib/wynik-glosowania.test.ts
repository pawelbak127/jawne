import { describe, expect, it } from 'vitest';
import { wynikGlosowania } from './wynik-glosowania';

const g = (o: Partial<Parameters<typeof wynikGlosowania>[0]>) => ({
  rodzaj: 'ELECTRONIC', typ_wiekszosci: 'SIMPLE_MAJORITY', wiekszosc_glosow: 1, za: 0, przeciw: 0, wstrzymalo: 0, ...o,
});

describe('wynikGlosowania', () => {
  it('3/5: wiecej „za” niz „przeciw” to jeszcze nie wiekszosc (pos. 64: 241 za, 198 przeciw, wymagane 266)', () => {
    const w = wynikGlosowania(g({ typ_wiekszosci: 'MAJORITY_THREE_FIFTHS', wiekszosc_glosow: 266, za: 241, przeciw: 198, wstrzymalo: 3 }))!;
    expect(w.osiagnieta).toBe(false);
    expect(w.nazwa).toBe('większość 3/5');
    expect(w.wymagane).toBe(266);
  });

  it('zwykla: rowno wymaganej liczbie to wiekszosc (za >= przeciw + 1)', () => {
    expect(wynikGlosowania(g({ wiekszosc_glosow: 157, za: 157, przeciw: 156 }))!.osiagnieta).toBe(true);
    expect(wynikGlosowania(g({ wiekszosc_glosow: 220, za: 186, przeciw: 219, wstrzymalo: 11 }))!.osiagnieta).toBe(false);
  });

  it('bez wyniku: kworum (zero glosow), glosowanie na liscie, brak liczby z rejestru', () => {
    expect(wynikGlosowania(g({ wiekszosc_glosow: 230 }))).toBeNull();
    expect(wynikGlosowania(g({ rodzaj: 'ON_LIST', typ_wiekszosci: 'ABSOLUTE_MAJORITY', wiekszosc_glosow: 219, za: 5 }))).toBeNull();
    expect(wynikGlosowania(g({ wiekszosc_glosow: null, za: 300, przeciw: 10 }))).toBeNull();
  });

  it('nieznany typ wiekszosci nie wywraca strony — nazwa ogolna i surowy kod z rejestru', () => {
    const w = wynikGlosowania(g({ typ_wiekszosci: 'NOWY_TYP', wiekszosc_glosow: 300, za: 310, przeciw: 5 }))!;
    expect(w.osiagnieta).toBe(true);
    expect(w.regula).toContain('NOWY_TYP');
  });
});
