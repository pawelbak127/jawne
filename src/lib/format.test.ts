import { describe, expect, it } from 'vitest';
import { dataKrotko, dataSlownie, inicjaly, liczba, odmien, procent, skroc, zlote } from './format';

describe('odmien', () => {
  it('forma pojedyncza tylko dla dokladnie jednego', () => {
    expect(odmien(1, 'głosowanie', 'głosowania', 'głosowań')).toBe('głosowanie');
    expect(odmien(21, 'głosowanie', 'głosowania', 'głosowań')).toBe('głosowań');
  });

  it('koncowki 2-4 daja forme mnoga', () => {
    for (const n of [2, 3, 4, 22, 33, 104]) {
      expect(odmien(n, 'głos', 'głosy', 'głosów')).toBe('głosy');
    }
  });

  // To jest wyjatek, na ktorym wywraca sie wiekszosc implementacji.
  it('zakres 12-14 NIE dostaje formy mnogiej mimo koncowki 2-4', () => {
    for (const n of [12, 13, 14, 112, 213]) {
      expect(odmien(n, 'głos', 'głosy', 'głosów')).toBe('głosów');
    }
  });

  it('zero i piec dostaja forme dopelniaczowa', () => {
    expect(odmien(0, 'głos', 'głosy', 'głosów')).toBe('głosów');
    expect(odmien(5, 'głos', 'głosy', 'głosów')).toBe('głosów');
  });
});

describe('liczba', () => {
  it('rozdziela tysiace spacja waska nierozdzielajaca', () => {
    expect(liczba(2_137_000)).toBe('2 137 000');
    expect(liczba(499)).toBe('499');
  });
});

describe('procent', () => {
  it('brak wartosci to polpauza, a nie zero', () => {
    expect(procent(null)).toBe('—');
    expect(procent(undefined)).toBe('—');
    expect(procent(Number.NaN)).toBe('—');
  });

  it('zero to zero, nie polpauza', () => {
    expect(procent(0)).toBe('0,0 %');
  });

  it('przecinek dziesietny, nie kropka', () => {
    expect(procent(93.47)).toBe('93,5 %');
  });
});

describe('daty', () => {
  it('slownie po polsku', () => {
    expect(dataSlownie('2026-09-16')).toBe('16 września 2026');
    expect(dataSlownie('2023-12-13')).toBe('13 grudnia 2023');
  });

  it('krotko z kropkami', () => {
    expect(dataKrotko('2026-09-16')).toBe('16.09.2026');
  });

  it('brak daty to polpauza', () => {
    expect(dataSlownie(null)).toBe('—');
    expect(dataKrotko(undefined)).toBe('—');
  });

  it('nierozpoznany format wraca bez zmiany, zamiast udawac date', () => {
    expect(dataSlownie('kiedyś')).toBe('kiedyś');
  });
});

describe('inicjaly', () => {
  it('bierze pierwsza litere imienia i NAZWISKA, nie dwoch pierwszych liter', () => {
    expect(inicjaly('Anna Maria Żurek')).toBe('AŻ');
    expect(inicjaly('Władysław Kosiniak-Kamysz')).toBe('WK');
  });

  it('jeden czlon daje jedna litere', () => {
    expect(inicjaly('Cher')).toBe('C');
  });

  it('pusty tekst nie wywala sie', () => {
    expect(inicjaly('')).toBe('?');
  });
});

describe('skroc', () => {
  it('nie rozcina slowa w polowie', () => {
    expect(skroc('Ustawa o zmianie ustawy o podatku dochodowym', 20)).toBe('Ustawa o zmianie…');
  });

  it('krotki tekst zostaje bez wielokropka', () => {
    expect(skroc('Ustawa', 20)).toBe('Ustawa');
  });
});

describe('zlote', () => {
  it('skaluje do mln i mld z trzema cyframi znaczacymi', () => {
    expect(zlote(80_779_188)).toBe('80,8 mln zł');
    expect(zlote(8_151_033_446)).toBe('8,15 mld zł');
    expect(zlote(362_200_000_000)).toBe('362 mld zł');
    expect(zlote(45_600)).toBe('45,6 tys. zł');
  });

  it('male kwoty w calosci', () => {
    expect(zlote(1234.4)).toBe('1234 zł');
  });

  it('brak kwoty to polpauza, nie zero', () => {
    expect(zlote(null)).toBe('—');
    expect(zlote(0)).toBe('0 zł');
  });
});
