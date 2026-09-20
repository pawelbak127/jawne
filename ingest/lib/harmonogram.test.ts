import { describe, expect, it } from 'vitest';
import { dodajDni, dzienWarszawa, planHistorii, stanDnia, ustalony, wOknie, zakresyZPlikow } from './harmonogram';

describe('dzienWarszawa', () => {
  it('o 00:30 w Warszawie jest juz nowy dzien, choc w UTC jeszcze stary (lato, UTC+2)', () => {
    expect(dzienWarszawa(new Date('2026-09-18T22:30:00Z'))).toBe('2026-09-19');
  });

  it('zima (UTC+1)', () => {
    expect(dzienWarszawa(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
    expect(dzienWarszawa(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15');
  });
});

describe('dodajDni', () => {
  it('przechodzi przez koniec miesiaca i roku', () => {
    expect(dodajDni('2026-08-31', 1)).toBe('2026-09-01');
    expect(dodajDni('2026-01-01', -1)).toBe('2025-12-31');
    expect(dodajDni('2026-09-19', -14)).toBe('2026-09-05');
  });

  it('zmiana czasu nie przesuwa dnia', () => {
    expect(dodajDni('2026-10-24', 2)).toBe('2026-10-26');
    expect(dodajDni('2026-03-28', 2)).toBe('2026-03-30');
  });
});

describe('ustalony', () => {
  it('14 dni po dacie — tak, 13 — nie', () => {
    expect(ustalony('2026-09-01', '2026-09-15T01:20:00.000Z')).toBe(true);
    expect(ustalony('2026-09-01', '2026-09-14T23:59:00.000Z')).toBe(false);
  });
});

describe('wOknie', () => {
  it('liczy godziny po polsku', () => {
    // 23:30 UTC 18.09 = 01:30 w Warszawie
    expect(wOknie(new Date('2026-09-18T23:30:00Z'), '01:00-06:00')).toBe(true);
    // 04:30 UTC = 06:30 w Warszawie — juz po oknie
    expect(wOknie(new Date('2026-09-19T04:30:00Z'), '01:00-06:00')).toBe(false);
    // 22:30 UTC = 00:30 w Warszawie — jeszcze przed oknem
    expect(wOknie(new Date('2026-09-18T22:30:00Z'), '01:00-06:00')).toBe(false);
  });

  it('koniec okna jest wylaczny', () => {
    expect(wOknie(new Date('2026-09-19T04:00:00Z'), '01:00-06:00')).toBe(false);
    expect(wOknie(new Date('2026-09-19T03:59:00Z'), '01:00-06:00')).toBe(true);
  });

  it('okno przez polnoc', () => {
    expect(wOknie(new Date('2026-09-18T21:30:00Z'), '23:00-05:00')).toBe(true); // 23:30
    expect(wOknie(new Date('2026-09-19T02:30:00Z'), '23:00-05:00')).toBe(true); // 04:30
    expect(wOknie(new Date('2026-09-19T10:00:00Z'), '23:00-05:00')).toBe(false); // 12:00
  });

  it('odrzuca zly zapis', () => {
    expect(() => wOknie(new Date(), '1:00-6:00')).toThrow(/GG:MM/);
  });
});

describe('zakresyZPlikow', () => {
  it('bierze tylko strony przyrostu, zwykle i spakowane, bez powtorzen', () => {
    expect(zakresyZPlikow([
      'przyrost-2026-09-02-2026-09-14-s1.json.gz',
      'przyrost-2026-09-02-2026-09-14-s2.json',
      'przyrost-2026-09-15-2026-09-15-s1.json.gz',
      '100101-od-2016-01-01-s1.json',
      'slownik-forma-pomocy.json',
      '.blokada',
    ])).toEqual(['2026-09-02..2026-09-14', '2026-09-15..2026-09-15']);
  });
});

/** Dni od..do, kazdy pobrany w podanej chwili. */
function dni(od: string, doDnia: string, pobrano: string) {
  const w = [];
  for (let d = od; d <= doDnia; d = dodajDni(d, 1)) w.push({ dzien: d, pobrano });
  return w;
}

describe('planHistorii', () => {
  const OKNO = '2016-01-01';

  it('stan bazy z 19.09.2026: najpierw przerwany zakres, potem dziura, potem historia', () => {
    const plan = planHistorii({
      dni: [
        ...dni('2026-08-19', '2026-09-01', '2026-09-18T12:00:00.000Z'),
        ...dni('2026-09-05', '2026-09-05', '2026-09-18T12:00:00.000Z'),
        ...dni('2026-09-15', '2026-09-15', '2026-09-18T12:00:00.000Z'),
        ...dni('2026-09-17', '2026-09-18', '2026-09-19T05:00:00.000Z'),
      ],
      zakresyPlikow: [
        '2026-08-19..2026-08-25', '2026-08-26..2026-09-01', '2026-09-02..2026-09-14',
        '2026-09-05..2026-09-05', '2026-09-15..2026-09-15', '2026-09-17..2026-09-17', '2026-09-18..2026-09-18',
      ],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan).toEqual([
      { od: '2026-09-02', do: '2026-09-14', odswiez: false, powod: 'przerwane' },
      { od: '2026-09-16', do: '2026-09-16', odswiez: false, powod: 'dziura' },
      { od: '2026-08-12', do: '2026-08-18', odswiez: false, powod: 'historia' },
    ]);
  });

  it('dzien pobrany za wczesnie wraca do odswiezenia dopiero po 14 dniach', () => {
    const baza = [
      ...dni('2026-09-01', '2026-09-03', '2026-09-16T00:00:00.000Z'),
      ...dni('2026-09-04', '2026-09-06', '2026-09-07T01:00:00.000Z'),
    ];
    const nieustalone = (dzis: string) => planHistorii({ dni: baza, zakresyPlikow: [], dzis, poczatekOkna: OKNO })
      .filter((z) => z.powod === 'nieustalone');
    // 01.09 i 02.09 pobrane po 15 i 14 dniach — ustalone. 03.09 po 13 dniach
    // — nie. 17.09 minelo 14 dni tylko dla dni do 03.09 wlacznie.
    expect(nieustalone('2026-09-17')).toEqual([{ od: '2026-09-03', do: '2026-09-03', odswiez: true, powod: 'nieustalone' }]);
    expect(nieustalone('2026-09-18').map((z) => `${z.od}..${z.do}`)).toEqual(['2026-09-03..2026-09-04']);
    expect(nieustalone('2026-09-20').map((z) => `${z.od}..${z.do}`)).toEqual(['2026-09-03..2026-09-06']);
  });

  it('dni do odswiezenia skleja w zakresy najwyzej tygodniowe', () => {
    const plan = planHistorii({
      dni: dni('2026-08-01', '2026-08-10', '2026-08-11T00:00:00.000Z'),
      zakresyPlikow: [],
      dzis: '2026-09-20',
      poczatekOkna: OKNO,
    });
    expect(plan.filter((z) => z.powod === 'nieustalone').map((z) => `${z.od}..${z.do}`))
      .toEqual(['2026-08-01..2026-08-07', '2026-08-08..2026-08-10']);
  });

  it('zakres z plikow, ktorego dni sa juz w bazie, nie jest przerwany', () => {
    const plan = planHistorii({
      dni: dni('2026-08-19', '2026-08-25', '2026-09-18T00:00:00.000Z'),
      zakresyPlikow: ['2026-08-19..2026-08-25'],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan.map((z) => z.powod)).toEqual(['historia']);
  });

  it('historia nie wychodzi przed poczatek okna rejestru', () => {
    const plan = planHistorii({
      dni: dni('2016-01-04', '2016-01-10', '2026-09-18T00:00:00.000Z'),
      zakresyPlikow: [],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan).toEqual([{ od: '2016-01-01', do: '2016-01-03', odswiez: false, powod: 'historia' }]);
  });

  it('kompletna historia bez dziur i zaleglosci daje pusty plan', () => {
    const plan = planHistorii({
      dni: dni('2016-01-01', '2016-01-20', '2026-09-18T00:00:00.000Z'),
      zakresyPlikow: [],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan).toEqual([]);
  });

  it('pusta baza: historia zaczyna sie od ostatniego ustalonego dnia', () => {
    expect(planHistorii({ dni: [], zakresyPlikow: [], dzis: '2026-09-19', poczatekOkna: OKNO }))
      .toEqual([{ od: '2026-08-30', do: '2026-09-05', odswiez: false, powod: 'historia' }]);
  });

  it('swiezego dnia (wczoraj) nie zaczyna — to zadanie dzienne', () => {
    const plan = planHistorii({
      dni: dni('2026-09-10', '2026-09-17', '2026-09-18T00:00:00.000Z'),
      zakresyPlikow: [],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan.map((z) => z.powod)).toEqual(['historia']);
  });

  it('ale swiezy dzien przerwany przez zadanie dzienne wznawia (strony sa na dysku)', () => {
    const plan = planHistorii({
      dni: dni('2026-09-10', '2026-09-17', '2026-09-18T00:00:00.000Z'),
      zakresyPlikow: ['2026-09-18..2026-09-18'],
      dzis: '2026-09-19',
      poczatekOkna: OKNO,
    });
    expect(plan[0]).toEqual({ od: '2026-09-18', do: '2026-09-18', odswiez: false, powod: 'przerwane' });
  });
});

describe('stanDnia', () => {
  it('dnia, ktorego nie mamy, nie odswiezamy pojedynczo — to dziura dla nocy', () => {
    expect(stanDnia('2026-09-07', null)).toBe('brak');
    expect(stanDnia('2026-09-07', undefined)).toBe('brak');
  });

  it('rozroznia dzien ustalony od pobranego za wczesnie', () => {
    expect(stanDnia('2026-09-07', '2026-09-21T01:20:00.000Z')).toBe('ustalony');
    expect(stanDnia('2026-09-07', '2026-09-08T01:20:00.000Z')).toBe('nieustalony');
  });
});
