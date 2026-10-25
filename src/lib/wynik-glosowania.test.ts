import { describe, expect, it } from 'vitest';
import { skutekPoprawkiSenatu, tytulPoprawkiSenatu, wynikGlosowania } from './wynik-glosowania';

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

describe('skutekPoprawkiSenatu — art. 121 ust. 3 Konstytucji (przeglad tresci 24.10.2026)', () => {
  const tytul = 'Pkt. 36 Sprawozdanie Komisji o uchwale Senatu w sprawie ustawy o zmianie ustawy o podatku od towarów i usług (druki nr 3132 i 3167)';
  const glos = (temat: string, za: number, przeciw: number) => ({
    tytul, temat, typ_wiekszosci: 'ABSOLUTE_MAJORITY',
    w: wynikGlosowania(g({ typ_wiekszosci: 'ABSOLUTE_MAJORITY', wiekszosc_glosow: 216, za, przeciw })),
  });

  it('0 „za” i 431 „przeciw” (VAT, 08.10.2026) — poprawki ZOSTAJĄ, bo Sejm ich nie odrzucił', () => {
    const x = glos('poprawki nr 2-3', 0, 431);
    expect(skutekPoprawkiSenatu(x, x.w)).toBe('Poprawki Senatu przyjęte — Sejm ich nie odrzucił');
  });

  it('bezwzględna większość „za” — poprawka odrzucona', () => {
    const x = glos('poprawka 1', 240, 200);
    expect(skutekPoprawkiSenatu(x, x.w)).toBe('Poprawka Senatu odrzucona');
  });

  it('bez uchwały Senatu w tytule albo bez „poprawk” w temacie albo inna większość — nic nie dopowiadamy', () => {
    const x = glos('poprawka 1', 240, 200);
    expect(skutekPoprawkiSenatu({ ...x, tytul: 'Pkt. 5 Sprawozdanie Komisji o projekcie ustawy' }, x.w)).toBeNull();
    expect(skutekPoprawkiSenatu({ ...x, temat: 'wniosek o odrzucenie uchwały Senatu' }, x.w)).toBeNull();
    expect(skutekPoprawkiSenatu({ ...x, typ_wiekszosci: 'SIMPLE_MAJORITY' }, x.w)).toBeNull();
    expect(skutekPoprawkiSenatu(x, null)).toBeNull();
  });
});

describe('tytulPoprawkiSenatu — krotki H1 (przeglad tresci 24.10.2026)', () => {
  const vat = 'Sprawozdanie Komisji o uchwale Senatu w sprawie ustawy o zmianie ustawy o podatku od towarów i usług (druki nr 3132 i 3167)';
  it('slowa z rejestru, przestawione', () => {
    expect(tytulPoprawkiSenatu(vat, 'poprawka 1')).toBe('Poprawka Senatu nr 1 do ustawy o zmianie ustawy o podatku od towarów i usług');
    expect(tytulPoprawkiSenatu(vat, 'poprawki nr 2-3')).toBe('Poprawki Senatu nr 2-3 do ustawy o zmianie ustawy o podatku od towarów i usług');
    expect(tytulPoprawkiSenatu('Sprawozdanie Komisji o uchwale Senatu w sprawie ustawy - Kodeks pracy', 'poprawka 4'))
      .toBe('Poprawka Senatu nr 4 do ustawy - Kodeks pracy');
  });
  it('inny ksztalt — bez zmian', () => {
    expect(tytulPoprawkiSenatu(vat, 'wniosek o odrzucenie uchwały Senatu')).toBeNull();
    expect(tytulPoprawkiSenatu('Sprawozdanie Komisji o rządowym projekcie ustawy o …', 'poprawka 1')).toBeNull();
    expect(tytulPoprawkiSenatu(vat, null)).toBeNull();
  });
});
