import { describe, expect, it } from 'vitest';
import { ciagiCyfr, MAKS_DLUGOSC, sprawdzStreszczenie } from './streszczenia';

// Prawdziwy opis z rejestru, druk 3101 (pobrany 03.10.2026).
const OPIS_3101 = 'projekt dotyczy ograniczenia liczby zdarzeń drogowych na przejazdach kolejowych poprzez: '
  + '1) wprowadzenie instrumentu natychmiastowego zatrzymania na 3 miesiące prawa jazdy za najbardziej '
  + 'niebezpieczne naruszenia popełnione na przejazdach kolejowych, 2) zaostrzenie sądowego środka karnego '
  + 'w postaci zakazu prowadzenia pojazdów w przypadku przestępstw popełnionych na przejazdach kolejowych.';

describe('bezpiecznik liczb', () => {
  it('przepuszcza streszczenie z liczbami wzietymi z rejestru', () => {
    const s = 'Kierowca, który popełni najgroźniejsze wykroczenia na przejeździe kolejowym, '
      + 'straciłby prawo jazdy od razu na 3 miesiące.';
    expect(sprawdzStreszczenie(s, OPIS_3101)).toEqual({ ok: true, bledy: [] });
  });

  it('odrzuca liczbe, ktorej nie ma w rejestrze — „800+" przy swiadczeniu wychowawczym', () => {
    const opis = 'projekt dotyczy ... warunków, od których uzależnione jest otrzymanie świadczenia wychowawczego';
    const w = sprawdzStreszczenie('Obywatele Ukrainy dostawaliby 800+ tylko wtedy, gdy pracują.', opis);
    expect(w.ok).toBe(false);
    expect(w.bledy[0]).toContain('800');
  });

  it('odrzuca zmieniony termin: 6 miesiecy zamiast 3', () => {
    expect(sprawdzStreszczenie('Prawo jazdy zatrzymane na 6 miesięcy.', OPIS_3101).ok).toBe(false);
  });

  it('porownuje ciagi cyfr: „10 000" pasuje do „10 000", „10000" juz nie', () => {
    const opis = 'kara do 10 000 zł';
    expect(sprawdzStreszczenie('Kara do 10 000 zł.', opis).ok).toBe(true);
    expect(sprawdzStreszczenie('Kara do 10000 zł.', opis).ok).toBe(false);
  });

  it('puste i za dlugie streszczenie odpada', () => {
    expect(sprawdzStreszczenie('   ', OPIS_3101).ok).toBe(false);
    expect(sprawdzStreszczenie('a'.repeat(MAKS_DLUGOSC + 1), OPIS_3101).ok).toBe(false);
  });

  it('streszczenie bez zadnej liczby przechodzi', () => {
    expect(sprawdzStreszczenie('Kierowcy będą surowiej karani.', OPIS_3101).ok).toBe(true);
  });
});

it('ciagi cyfr', () => {
  expect(ciagiCyfr('1) od 2024 r., 3,5 mln i 10 000')).toEqual(['1', '2024', '3', '5', '10', '000']);
});
