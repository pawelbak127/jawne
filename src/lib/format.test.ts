import { describe, expect, it } from 'vitest';
import { dataKrotko, dataSlownie, inicjaly, liczba, odmien, procent, skroc, wojewodztwoWMiejscowniku, zlote, okresDni, udzial, euro, poczatekOknaSudop, wszystkieDniRejestru } from './format';

describe('wojewodztwoWMiejscowniku', () => {
  it.each([
    ['mazowieckie', 'mazowieckim'], ['łódzkie', 'łódzkim'], ['małopolskie', 'małopolskim'],
    ['warmińsko-mazurskie', 'warmińsko-mazurskim'], ['kujawsko-pomorskie', 'kujawsko-pomorskim'],
  ])('%s → %s', (w, m) => {
    expect(wojewodztwoWMiejscowniku(w)).toBe(m);
  });
});

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

describe('okresDni — przegląd treści 24.10.2026', () => {
  it('dni ciągłe: sam zakres dat', () => {
    expect(okresDni(3, '2026-10-01', '2026-10-03')).toBe('od 01.10.2026 do 03.10.2026');
  });
  it('dziury: zakres i ile dni brakuje', () => {
    expect(okresDni(2, '2026-10-01', '2026-10-03')).toBe('od 01.10.2026 do 03.10.2026, bez 1 dnia, którego jeszcze nie pobraliśmy');
  });
});

describe('wszystkieDniRejestru — historia SUDOP pelna od 28.10.2026', () => {
  const dzis = new Date('2026-10-30T12:00:00Z');
  it('okno rejestru zaczyna sie 1 stycznia roku n-10', () => {
    expect(poczatekOknaSudop(dzis)).toBe('2016-01-01');
    expect(poczatekOknaSudop(new Date('2027-01-01T00:00:00Z'))).toBe('2017-01-01');
  });
  it('od poczatku okna i bez dziury: komplet (3 942 dni jak na serwerze)', () => {
    expect(wszystkieDniRejestru(3942, '2016-01-01', '2026-10-16', dzis)).toBe(true);
  });
  it('dziura w srodku: nie komplet, choc zakres dat ten sam', () => {
    expect(wszystkieDniRejestru(3941, '2016-01-01', '2026-10-16', dzis)).toBe(false);
  });
  it('bez poczatku okna: nie komplet, choc dni ciagle', () => {
    expect(wszystkieDniRejestru(3941, '2016-01-02', '2026-10-16', dzis)).toBe(false);
  });
  it('okno przesuwa sie z rokiem, a starsze dni zostaja: dalej komplet', () => {
    expect(wszystkieDniRejestru(4307, '2016-01-01', '2027-10-16', new Date('2027-10-30T12:00:00Z'))).toBe(true);
  });
});

describe('udzial — dwie cyfry znaczace (przeglad tresci 24.10.2026)', () => {
  it('od 10% calosci, ponizej jedno miejsce po przecinku', () => {
    expect(udzial(0.3741)).toBe('37%');
    expect(udzial(0.0996)).toBe('10%');
    expect(udzial(0.085)).toBe('8,5%');
    expect(udzial(0.004)).toBe('0,4%');
  });
  it('zero, prawie zero i brak to trzy rozne rzeczy', () => {
    expect(udzial(0)).toBe('0%');
    expect(udzial(0.0002)).toBe('poniżej 0,1%');
    expect(udzial(null)).toBe('—');
  });
});

describe('euro — ta sama skala co zlote, osobna waluta', () => {
  it('formatuje jak zlote, z twarda spacja przed jednostka', () => {
    expect(euro(1_038_800_000)).toBe('1,04 mld euro');
    expect(euro(350_267.5)).toBe('350 tys. euro');
    expect(euro(4486)).toBe(`${liczba(4486)} euro`);
    expect(euro(null)).toBe('—');
    expect(zlote(350_267.5)).toBe('350 tys. zł');
  });
});
