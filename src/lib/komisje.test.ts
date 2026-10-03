import { describe, expect, it } from 'vitest';
import { adresKomisjiWRejestrze, etykietaTypu, naglowekTypu, rodzajFunkcji } from './komisje';

describe('typ komisji', () => {
  it.each([
    ['STANDING', 'komisja stała'],
    ['EXTRAORDINARY', 'komisja nadzwyczajna'],
    ['INVESTIGATIVE', 'komisja śledcza'],
  ])('%s -> %s', (t, e) => expect(etykietaTypu(t)).toBe(e));

  it('nieznany typ zostaje surowy, a nie zgadniety', () => {
    expect(etykietaTypu('SUBCOMMITTEE')).toBe('SUBCOMMITTEE');
    expect(naglowekTypu('SUBCOMMITTEE')).toBe('SUBCOMMITTEE');
  });
});

describe('funkcja w komisji — oba rodzaje, jak pisze rejestr', () => {
  it.each([
    ['przewodniczący', 'przewodniczy'],
    ['przewodnicząca', 'przewodniczy'],
    ['zastępca przewodniczącego', 'zastepca'],
    ['zastępczyni przewodniczącej', 'zastepca'],
    ['zastępca przewodniczącej', 'zastepca'],
  ])('%s -> %s', (f, r) => expect(rodzajFunkcji(f)).toBe(r));

  it('brak funkcji to zwykly czlonek', () => {
    expect(rodzajFunkcji(null)).toBe('czlonek');
    expect(rodzajFunkcji('')).toBe('czlonek');
  });
});

it('adres w rejestrze koduje kod komisji', () => {
  expect(adresKomisjiWRejestrze('ASW')).toBe('https://api.sejm.gov.pl/sejm/term10/committees/ASW');
});
