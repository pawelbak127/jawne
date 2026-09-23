import { describe, expect, it } from 'vitest';
import { nipZTekstu, poprawnyNip } from './nip';

describe('nipZTekstu', () => {
  it('zapisy zmierzone w TED sprowadza do dziesieciu cyfr', () => {
    // Wszystkie cztery stoja obok siebie w JEDNYM ogloszeniu (23.09.2026).
    expect(nipZTekstu('NIP 634-012-54-42')).toBe('6340125442');
    expect(nipZTekstu('7281341936')).toBe('7281341936');
    expect(nipZTekstu('683-20-98-254')).toBe('6832098254');
    expect(nipZTekstu('NIP 527 105 59 84')).toBe('5271055984');
  });

  it('radzi sobie z przedrostkiem kraju', () => {
    expect(nipZTekstu('PL5260152844')).toBe('5260152844');
  });

  it('odrzuca to, co NIP-em nie jest', () => {
    expect(nipZTekstu('REGON 000331501')).toBeNull();      // dziewiec cyfr
    expect(nipZTekstu('0000000000')).toBeNull();           // wypelniacz
    expect(nipZTekstu('1234567890')).toBeNull();           // zla suma kontrolna
    expect(nipZTekstu('brak')).toBeNull();
    expect(nipZTekstu('')).toBeNull();
    expect(nipZTekstu(null)).toBeNull();
  });
});

describe('poprawnyNip', () => {
  it('zna sume kontrolna', () => {
    expect(poprawnyNip('5260152844')).toBe(true);
    expect(poprawnyNip('5260152845')).toBe(false);
  });

  it('wymaga dokladnie dziesieciu cyfr', () => {
    expect(poprawnyNip('526015284')).toBe(false);
    expect(poprawnyNip('52601528440')).toBe(false);
  });
});
