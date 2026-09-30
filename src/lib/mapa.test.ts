import { describe, expect, it } from 'vitest';
import { nazwaPowiatu, zwinDoPowiatow } from './mapa';

describe('zwinDoPowiatow', () => {
  it('waży wartość ludnością, a nie liczbą gmin', () => {
    // 100 zl x 1000 osob + 1000 zl x 100 osob = 200 000 zl na 1100 osob.
    const wynik = zwinDoPowiatow(
      [
        { teryt: '020101', wartosc: 100 },
        { teryt: '020102', wartosc: 1000 },
      ],
      [
        { teryt: '020101', osob: 1000 },
        { teryt: '020102', osob: 100 },
      ],
    );
    expect(wynik).toHaveLength(1);
    expect(wynik[0]!.teryt).toBe('0201');
    expect(wynik[0]!.wartosc).toBeCloseTo(200000 / 1100, 9);
    // Srednia arytmetyczna dalaby 550 zl — dwa i pol raza wiecej.
    expect(wynik[0]!.wartosc).toBeLessThan(200);
  });

  it('gmina bez wartości nie wchodzi do mianownika', () => {
    const [a] = zwinDoPowiatow(
      [{ teryt: '020101', wartosc: 100 }],
      [
        { teryt: '020101', osob: 1000 },
        { teryt: '020102', osob: 9000 },
      ],
    );
    expect(a!.wartosc).toBe(100);
  });

  it('pomija gminę bez ludności — dzielenie przez zero to nie zero', () => {
    expect(zwinDoPowiatow([{ teryt: '020101', wartosc: 100 }], [{ teryt: '020101', osob: 0 }])).toEqual([]);
    expect(zwinDoPowiatow([{ teryt: '020101', wartosc: 100 }], [])).toEqual([]);
  });

  it('rozdziela powiaty po czterech pierwszych cyfrach TERYT-u', () => {
    const wynik = zwinDoPowiatow(
      [
        { teryt: '020101', wartosc: 10 },
        { teryt: '020201', wartosc: 20 },
      ],
      [
        { teryt: '020101', osob: 100 },
        { teryt: '020201', osob: 100 },
      ],
    );
    expect(wynik.map((w) => w.teryt).sort()).toEqual(['0201', '0202']);
  });
});

describe('nazwaPowiatu', () => {
  it('dopisuje „powiat” do nazwy przymiotnikowej', () => {
    expect(nazwaPowiatu('bolesławiecki')).toBe('powiat bolesławiecki');
    expect(nazwaPowiatu('żyrardowski')).toBe('powiat żyrardowski');
    // Ogonek na pierwszej literze to nadal mala litera.
    expect(nazwaPowiatu('łaski')).toBe('powiat łaski');
    expect(nazwaPowiatu('świdnicki')).toBe('powiat świdnicki');
  });

  it('zostawia miasto na prawach powiatu bez „powiatu”', () => {
    expect(nazwaPowiatu('Wrocław')).toBe('Wrocław');
    expect(nazwaPowiatu('Warszawa')).toBe('Warszawa');
    expect(nazwaPowiatu('Świnoujście')).toBe('Świnoujście');
  });
});
