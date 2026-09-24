import { describe, expect, it } from 'vitest';
import { kwotaPodejrzana, PROG_PODEJRZANEJ_KWOTY } from './zamowienia';

describe('kwotaPodejrzana', () => {
  it('lapie kwoty zmierzone w rejestrze jako nierealne', () => {
    // 235172-2026: „utrzymanie torow kolejowych”, 257 bln zl.
    expect(kwotaPodejrzana(257_562_861_720_000, 'PLN')).toBe(true);
    // 214475-2026: paliwo dla MPO Warszawa, 34,4 mld zl.
    expect(kwotaPodejrzana(34_400_000_000, 'PLN')).toBe(true);
  });

  it('przepuszcza duze, ale realne zamowienia', () => {
    expect(kwotaPodejrzana(3_828_200_400, 'PLN')).toBe(false);   // 3,8 mld — szpital
    expect(kwotaPodejrzana(PROG_PODEJRZANEJ_KWOTY, 'PLN')).toBe(false);
  });

  it('brak kwoty to nie kwota podejrzana (null ≠ zero)', () => {
    expect(kwotaPodejrzana(null, 'PLN')).toBe(false);
  });

  it('obca waluta nie podlega temu progowi — nie przeliczamy kursow', () => {
    expect(kwotaPodejrzana(99_000_000_000, 'EUR')).toBe(false);
  });
});
