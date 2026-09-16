import { describe, expect, it } from 'vitest';
import { rdzen, uprosc, zapytanieFts } from './tekst';

describe('uprosc', () => {
  it('zamienia "ł", ktorego nie rozklada ani NFD, ani FTS5', () => {
    expect(uprosc('Marszałka')).toBe('marszalka');
    expect(uprosc('ŁÓDŹ')).toBe('lodz');
  });

  it('zdejmuje pozostale ogonki', () => {
    expect(uprosc('Żółć gęślą jaźń')).toBe('zolc gesla jazn');
  });
});

describe('zapytanieFts', () => {
  it('kazde slowo jest fraza — skladnia FTS wpisana przez czytelnika nie dziala', () => {
    expect(zapytanieFts('podatek AND -VAT')).toBe('"podat" AND "and" AND "vat"');
  });

  it('pomija slowa krotsze niz 3 znaki, bo trygram ich nie znajdzie', () => {
    expect(zapytanieFts('o podatku od towarów')).toBe('"podat" AND "towar"');
  });

  it('same krotkie slowa to brak zapytania, nie puste dopasowanie', () => {
    expect(zapytanieFts('o i w')).toBeNull();
    expect(zapytanieFts('   ')).toBeNull();
  });

  it('cudzyslow w zapytaniu nie rozrywa frazy', () => {
    expect(zapytanieFts('abc"def')).toBe('"abc" AND "def"');
  });
});

describe('rdzen', () => {
  // Kazda para: forma wpisana przez czytelnika i forma z tytulu glosowania.
  // Rdzen pierwszej musi byc podciagiem drugiej.
  const pary: [string, string][] = [
    ['podatek', 'podatku'],
    ['sygnalisci', 'sygnalistow'],
    ['lowiectwo', 'lowiectwie'],
    ['lowiectwo', 'prawo lowieckie'],
    ['marszalka', 'marszalek'],
    ['ustawa', 'ustawy'],
    ['szkola', 'szkolach'],
    ['dziecko', 'dzieci'],
  ];
  for (const [wpisane, wTytule] of pary) {
    it(`"${wpisane}" znajduje "${wTytule}"`, () => {
      expect(wTytule).toContain(rdzen(wpisane));
    });
  }

  it('numer druku zostaje w calosci', () => {
    expect(rdzen('1234567')).toBe('1234567');
  });

  it('krotkie slowo zostaje bez zmian', () => {
    expect(rdzen('vat')).toBe('vat');
    expect(rdzen('wiek')).toBe('wiek');
  });
});
