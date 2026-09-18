import { describe, expect, it } from 'vitest';
import { doCsv, nazwaPliku } from './eksport-csv';

describe('doCsv', () => {
  it('zaczyna sie od BOM, rozdziela srednikiem, konczy CRLF', () => {
    const csv = doCsv(['a', 'b'], [[1, 'x']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿a;b\r\n1;x\r\n');
  });

  it('pisze liczby ulamkowe z przecinkiem, a calkowite bez zmian', () => {
    expect(doCsv(['k'], [[1234.5], [1234.567], [100]])).toBe('﻿k\r\n1234,5\r\n1234,57\r\n100\r\n');
  });

  // null != 0 — pusta komorka to brak wartosci, zero to zmierzone zero.
  it('brak wartosci zostawia pusta komorke, a zero pisze jako zero', () => {
    expect(doCsv(['a', 'b'], [[null, 0]])).toBe('﻿a;b\r\n;0\r\n');
  });

  it('bierze w cudzyslow pola ze srednikiem, cudzyslowem i nowa linia', () => {
    expect(doCsv(['t'], [['a;b'], ['"U&B" s.c.'], ['x\ny']])).toBe('﻿t\r\n"a;b"\r\n"""U&B"" s.c."\r\n"x\ny"\r\n');
  });
});

describe('nazwaPliku', () => {
  it('usuwa polskie znaki i spacje', () => {
    expect(nazwaPliku('jawne', 'Bełchatów', 'pomoc publiczna')).toBe('jawne-belchatow-pomoc-publiczna.csv');
    expect(nazwaPliku('jawne', 'Łódź')).toBe('jawne-lodz.csv');
  });
});
