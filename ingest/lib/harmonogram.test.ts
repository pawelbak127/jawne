import { describe, expect, it } from 'vitest';
import { dniDoZachowania, dodajDni, dzienneCzeka, dzienWarszawa, planHistorii, stanDnia, ustalony, wOknie, zakresyZPlikow } from './harmonogram';

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
    expect(ustalony('2026-09-01', '2026-09-15')).toBe(true);
    expect(ustalony('2026-09-01', '2026-09-14')).toBe(false);
  });

  it('liczy po POLSKIEJ dacie pobrania — zadanie nocne o 01:17 (zmierzone 22.09.2026)', () => {
    // Dzien 08.09 odswiezony 22.09 o 01:17 w Warszawie ma znacznik UTC
    // 2026-09-21T23:17Z. Po dacie UTC wychodzilo 13 dni i dzien nie ustalal
    // sie nigdy — plan nocy wracal do niego w kolko.
    const polskaData = dzienWarszawa(new Date('2026-09-21T23:17:00Z'));
    expect(polskaData).toBe('2026-09-22');
    expect(ustalony('2026-09-08', polskaData)).toBe(true);
    expect(ustalony('2026-09-08', '2026-09-21')).toBe(false);
  });
});

describe('wOknie', () => {
  it('„zawsze" znaczy praca ciagla — o kazdej porze', () => {
    // Od 25.09.2026: kolejka UOKiK odpowiada po ~52 min niezaleznie od pory,
    // wiec okno godzinowe nie chroni urzedu, tylko nas spowalnia.
    for (const chwila of ['2026-09-19T02:00:00Z', '2026-09-19T12:00:00Z', '2026-09-19T20:00:00Z']) {
      expect(wOknie(new Date(chwila), 'zawsze')).toBe(true);
    }
  });

  it('zly zapis okna konczy sie bledem, zanim cokolwiek zapytamy urzad', () => {
    expect(() => wOknie(new Date(), '22-07')).toThrow(/GG:MM-GG:MM/);
  });

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

  it('krotsza dlugosc daje krotszy krok historii, mimo dlugiego zakresu z dysku', () => {
    // ZMIERZONE 27.09.2026: zakres 2025-10-01..2025-10-07 nie wrocil ani razu
    // w czterech probach po 57 minut. Po bledzie skracamy `dlugosc`, ale krok
    // „przerwane" i tak poda caly zakres z dysku — dlatego pobieranie MUSI
    // go pomijac, a wtedy te same dni wracaja krokiem „historia", juz krotsze.
    const wejscie = {
      dni: dni('2025-10-08', '2025-10-20', '2026-09-27T05:00:00.000Z'),
      zakresyPlikow: ['2025-10-01..2025-10-07'],
      dzis: '2026-09-27',
      poczatekOkna: OKNO,
    };
    const siedem = planHistorii(wejscie);
    expect(siedem[0]).toMatchObject({ od: '2025-10-01', do: '2025-10-07', powod: 'przerwane' });
    expect(siedem.at(-1)).toMatchObject({ od: '2025-10-01', do: '2025-10-07', powod: 'historia' });

    const trzy = planHistorii({ ...wejscie, dlugosc: 3 });
    expect(trzy[0]).toMatchObject({ powod: 'przerwane' });
    expect(trzy.at(-1)).toMatchObject({ od: '2025-10-05', do: '2025-10-07', powod: 'historia' });
  });

  it('ZAKRES W PRZERWIE PO PORAZKACH wypada z kroku „przerwane", a jego dni czekaja na niego', () => {
    /*
     * ZGLOSZENIE PAWLA 02.10.2026: dziennik serwera pokazal DZIESIEC RAZY ten
     * sam wiersz „przerwane: 2024-12-17..2024-12-19". Timer historii chodzi
     * co godzine, a pamiec o porazkach zyla tylko w procesie — wiec kazdy
     * przebieg bral ten sam zakres. Teraz plan przyjmuje zbior do pominiecia.
     */
    const wejscie = {
      dni: dni('2024-12-20', '2024-12-31', '2026-10-02T05:00:00.000Z'),
      zakresyPlikow: ['2024-12-17..2024-12-19'],
      dzis: '2026-10-02',
      poczatekOkna: OKNO,
      dlugosc: 1,
    };
    const bez = planHistorii(wejscie);
    expect(bez[0]).toMatchObject({ od: '2024-12-17', do: '2024-12-19', powod: 'przerwane' });

    const z = planHistorii({ ...wejscie, pomijaj: new Set(['2024-12-17..2024-12-19']) });
    expect(z.some((x) => x.powod === 'przerwane')).toBe(false);
    // Do 18.10.2026 te dni wracaly krokiem „historia" od strony 1 — teraz
    // zakres ma strony na dysku, wiec je rezerwuje, a historia idzie dalej
    // wstecz (pulapka 77).
    expect(z.some((x) => x.od <= '2024-12-19' && x.do >= '2024-12-17')).toBe(false);
    expect(z.at(-1)).toMatchObject({ od: '2024-12-16', do: '2024-12-16', powod: 'historia' });
  });

  describe('kolejka urzedu zwalnia — stan serwera z 16–18.10.2026', () => {
    // W bazie od 2020-05-09 w gore. Na dysku zestaw stron 05-02..05-08:
    // 618 979 wynikow (62 strony), pobrane 50 — padla strona 51.
    const W_BAZIE = dni('2020-05-09', '2020-07-31', '2026-10-01T05:00:00.000Z').map((d) => ({ ...d, wierszy: 50_000 }));
    const wejscie = {
      dni: W_BAZIE,
      zakresyPlikow: ['2020-05-02..2020-05-08'],
      dzis: '2026-10-17',
      poczatekOkna: OKNO,
      dlugosc: 3,
      zostaloStron: (z: string) => ({ '2020-05-02..2020-05-08': 12 } as Record<string, number>)[z] ?? null,
      wynikowZakresu: (z: string) => ({ '2020-05-02..2020-05-08': 618_979 } as Record<string, number>)[z] ?? null,
    };

    it('zakres w przerwie ze stronami na dysku rezerwuje dni — historia nie tnie go na nowe od strony 1', () => {
      // Dawniej: 05-06..08, 05-08, 05-07, 05-01..07, 05-04..06… kazdy od strony 1.
      const plan = planHistorii({ ...wejscie, pomijaj: new Set(['2020-05-02..2020-05-08']) });
      expect(plan.some((x) => x.od <= '2020-05-08' && x.do >= '2020-05-02')).toBe(false);
      expect(plan.at(-1)).toMatchObject({ od: '2020-04-29', do: '2020-05-01', powod: 'historia' });
    });

    it('po przerwie wraca ten sam zakres — 12 stron do konca', () => {
      expect(planHistorii(wejscie)[0]).toMatchObject({ od: '2020-05-02', do: '2020-05-08', powod: 'przerwane' });
    });

    it('wybor z nakladajacych sie obejmuje zakresy w przerwie: blizszy konca czeka, dalszy nie rusza', () => {
      const zostalo: Record<string, number> = { '2020-05-02..2020-05-08': 12, '2020-05-01..2020-05-07': 48 };
      const plan = planHistorii({
        ...wejscie,
        zakresyPlikow: ['2020-05-02..2020-05-08', '2020-05-01..2020-05-07'],
        zostaloStron: (z: string) => zostalo[z] ?? null,
        wynikowZakresu: () => null,
        pomijaj: new Set(['2020-05-02..2020-05-08']),
      });
      expect(plan.filter((x) => x.powod === 'przerwane')).toEqual([]);
      // 05-02..05-08 czekaja na swoj zakres; wolny 05-01 bierze historia.
      expect(plan.some((x) => x.od <= '2020-05-08' && x.do >= '2020-05-02')).toBe(false);
      expect(plan.at(-1)).toMatchObject({ od: '2020-04-29', do: '2020-05-01', powod: 'historia' });
    });

    it('nie wznawia, gdy samych brakujacych dni jest mniej stron niz zostalo (04-28..05-03 po imporcie 05-01..05-03)', () => {
      // 920 326 wynikow, 19 stron na dysku = 74 do konca. 05-01..05-03 juz
      // w bazie (370 059), wiec brakujace 28–30.04 to ok. 56 stron od nowa.
      const baza = [
        ...dni('2020-05-01', '2020-05-03', '2026-10-01T05:00:00.000Z').map((d, i) => ({ ...d, wierszy: [120_000, 125_000, 125_059][i]! })),
        ...dni('2020-05-04', '2020-07-31', '2026-10-01T05:00:00.000Z').map((d) => ({ ...d, wierszy: 50_000 })),
      ];
      const plan = planHistorii({
        dni: baza,
        zakresyPlikow: ['2020-04-28..2020-05-03'],
        dzis: '2026-10-18',
        poczatekOkna: OKNO,
        dlugosc: 3,
        zostaloStron: () => 74,
        wynikowZakresu: () => 920_326,
      });
      expect(plan.filter((x) => x.powod === 'przerwane')).toEqual([]);
      expect(plan.at(-1)).toMatchObject({ od: '2020-04-28', do: '2020-04-30', powod: 'historia' });
    });

    it('wznawia, gdy brakujace dni sa wieksza czescia zakresu (05-02..05-08: 12 stron wobec ok. 42)', () => {
      const baza = [
        ...dni('2020-05-04', '2020-05-06', '2026-10-01T05:00:00.000Z').map((d) => ({ ...d, wierszy: 49_234 })),
        ...dni('2020-05-08', '2020-07-31', '2026-10-01T05:00:00.000Z').map((d) => ({ ...d, wierszy: 58_000 })),
      ];
      const plan = planHistorii({ ...wejscie, dni: baza });
      expect(plan[0]).toMatchObject({ od: '2020-05-02', do: '2020-05-08', powod: 'przerwane' });
    });

    it('bez liczby wierszy dnia nie zgaduje — wznawia jak dotad', () => {
      // Z liczbami: brakujace 05-02, 05-03, 05-07, 05-08 to ok. 48 stron < 60 — od nowa.
      const baza = (wierszy: number | null) => [
        ...dni('2020-05-04', '2020-05-06', '2026-10-01T05:00:00.000Z').map((d) => ({ ...d, wierszy })),
        ...W_BAZIE,
      ];
      const z = { ...wejscie, zostaloStron: () => 60 };
      expect(planHistorii({ ...z, dni: baza(49_234) }).some((x) => x.powod === 'przerwane')).toBe(false);
      expect(planHistorii({ ...z, dni: baza(null) })[0]).toMatchObject({ od: '2020-05-02', do: '2020-05-08', powod: 'przerwane' });
    });

    it('historia nie siega w zarezerwowane dni, ktore nie przylegaja do bazy', () => {
      // Rezerwacja 04-20..04-25, a 04-26..05-08 brak: historia konczy sie
      // na 05-08 i nie schodzi ponizej 04-26.
      const plan = planHistorii({
        dni: W_BAZIE,
        zakresyPlikow: ['2020-04-20..2020-04-25'],
        dzis: '2026-10-18',
        poczatekOkna: OKNO,
        dlugosc: 7,
        zostaloStron: () => 3,
        wynikowZakresu: () => null,
        pomijaj: new Set(['2020-04-20..2020-04-25']),
      });
      const h = plan.at(-1)!;
      expect(h).toMatchObject({ do: '2020-05-08', powod: 'historia' });
      expect(h.od >= '2020-04-26').toBe(true);
    });
  });

  describe('nakladajace sie przerwane zakresy — stan serwera z 14.10.2026', () => {
    // Pierwszy dzien w bazie: 2020-06-21. Na dysku cztery zestawy stron tych
    // samych dni (dzien 20.06 ma 1 203 518 przypadkow, 121 stron).
    const ZAKRESY = ['2020-06-14..2020-06-20', '2020-06-15..2020-06-20', '2020-06-18..2020-06-20', '2020-06-20..2020-06-20'];
    const ZOSTALO: Record<string, number> = {
      '2020-06-14..2020-06-20': 145 - 71, '2020-06-15..2020-06-20': 145 - 55,
      '2020-06-18..2020-06-20': 130 - 78, '2020-06-20..2020-06-20': 121 - 116,
    };
    const wejscie = {
      dni: dni('2020-06-21', '2020-07-31', '2026-10-01T05:00:00.000Z'),
      zakresyPlikow: ZAKRESY,
      dzis: '2026-10-14',
      poczatekOkna: OKNO,
      zostaloStron: (z: string) => ZOSTALO[z] ?? null,
    };

    it('z nakladajacych sie bierze JEDEN — ten, ktoremu zostalo najmniej stron', () => {
      const przerwane = planHistorii(wejscie).filter((x) => x.powod === 'przerwane');
      expect(przerwane).toEqual([{ od: '2020-06-20', do: '2020-06-20', odswiez: false, powod: 'przerwane' }]);
    });

    it('bez wiedzy o stronach — najwezszy', () => {
      const przerwane = planHistorii({ ...wejscie, zostaloStron: undefined }).filter((x) => x.powod === 'przerwane');
      expect(przerwane.map((x) => `${x.od}..${x.do}`)).toEqual(['2020-06-20..2020-06-20']);
    });

    it('jednodniowy w przerwie rezerwuje dzien: nikt go nie dubluje, historia idzie dalej wstecz', () => {
      const plan = planHistorii({ ...wejscie, pomijaj: new Set(ZAKRESY) });
      expect(plan.some((x) => x.od <= '2020-06-20' && x.do >= '2020-06-20')).toBe(false);
      expect(plan.at(-1)).toMatchObject({ od: '2020-06-13', do: '2020-06-19', powod: 'historia' });
    });

    it('szerszy zakres po przerwie NIE wraca na zarezerwowany dzien', () => {
      // 14–20.06 wyszedl z przerwy wczesniej niz 20.06 — dawniej wracal
      // i zaczynal od strony 72, dublujac dzien, ktoremu brakuje 5 stron.
      const plan = planHistorii({ ...wejscie, pomijaj: new Set(['2020-06-20..2020-06-20', '2020-06-15..2020-06-20', '2020-06-18..2020-06-20']) });
      expect(plan.filter((x) => x.powod === 'przerwane')).toEqual([]);
      expect(plan.at(-1)).toMatchObject({ od: '2020-06-13', do: '2020-06-19', powod: 'historia' });
    });
  });

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

describe('dniDoZachowania — serwer, 15.10.2026: 13–19.06 przepisal 18–19.06 i stan liczyl sie 7 647 s', () => {
  const wBazie = [
    { dzien: '2020-06-18', pobrano: '2026-10-15' },   // ustalony (6 lat po dacie)
    { dzien: '2020-06-19', pobrano: '2026-10-15' },
    { dzien: '2026-10-10', pobrano: '2026-10-11' },   // pobrany za wczesnie — wolno przepisac
  ];

  it('ustalone dni zostaja nietkniete, nieustalone ida do przepisania', () => {
    expect([...dniDoZachowania(wBazie, false)].sort()).toEqual(['2020-06-18', '2020-06-19']);
  });

  it('jawne --odswiez przepisuje wszystko', () => {
    expect(dniDoZachowania(wBazie, true).size).toBe(0);
  });

  it('dnia, ktorego nie ma w bazie, nie ma czego zachowywac', () => {
    expect(dniDoZachowania([], false).size).toBe(0);
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

describe('dzienneCzeka — 17–18.10.2026 zadanie dzienne czekalo na blokade 6,5 godziny', () => {
  const zyje = (pid: number) => pid === 4242;
  it('zywy PID w swiezym znaczniku — historia ustepuje', () => {
    expect(dzienneCzeka('4242\n', 60_000, zyje)).toBe(true);
  });
  it('brak znacznika, martwy PID, smieci albo znacznik sprzed doby — nie ustepuje', () => {
    expect(dzienneCzeka(null, 0, zyje)).toBe(false);
    expect(dzienneCzeka('999', 60_000, zyje)).toBe(false);
    expect(dzienneCzeka('abc', 60_000, zyje)).toBe(false);
    expect(dzienneCzeka('1', 60_000, () => true)).toBe(false);
    expect(dzienneCzeka('4242', 25 * 3600_000, zyje)).toBe(false);
  });
});
