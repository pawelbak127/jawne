import { describe, expect, it } from 'vitest';
import {
  doPominiecia, dopiszPorazke, opisPominietych, przerwaGodzin, zapomnij, type Nieudane,
} from './nieudane-zakresy.js';

const T = (iso: string) => new Date(iso);
const ZAKRES = '2024-12-17..2024-12-19';

describe('przerwaGodzin', () => {
  it('rośnie wykładniczo i zatrzymuje się na dobie', () => {
    expect(przerwaGodzin(0)).toBe(0);
    expect(przerwaGodzin(1)).toBe(1);
    expect(przerwaGodzin(2)).toBe(2);
    expect(przerwaGodzin(3)).toBe(4);
    expect(przerwaGodzin(4)).toBe(8);
    expect(przerwaGodzin(5)).toBe(16);
    expect(przerwaGodzin(6)).toBe(24);
    // Dziesiata porazka to nadal doba — zakresu nie porzucamy na zawsze.
    expect(przerwaGodzin(10)).toBe(24);
  });
});

describe('doPominiecia — sedno zgłoszenia Pawła z 02.10.2026', () => {
  it('po pierwszej porażce zakres odpada na GODZINĘ, czyli na jedno tyknięcie timera', () => {
    // Timer historii chodzi co godzine; bez tego ten sam zakres szedl co godzine.
    const n = dopiszPorazke({}, ZAKRES, T('2026-10-02T13:07:00Z'));
    expect(doPominiecia(n, T('2026-10-02T13:40:00Z')).has(ZAKRES)).toBe(true);
    expect(doPominiecia(n, T('2026-10-02T14:08:00Z')).has(ZAKRES)).toBe(false);
  });

  it('po dziesięciu porażkach wraca po dobie, a nie po godzinie', () => {
    let n: Nieudane = {};
    for (let i = 0; i < 10; i++) n = dopiszPorazke(n, ZAKRES, T('2026-10-02T13:00:00Z'));
    expect(n[ZAKRES]!.prob).toBe(10);
    expect(doPominiecia(n, T('2026-10-03T12:00:00Z')).has(ZAKRES)).toBe(true);
    expect(doPominiecia(n, T('2026-10-03T13:30:00Z')).has(ZAKRES)).toBe(false);
  });

  it('inne zakresy nie są dotknięte', () => {
    const n = dopiszPorazke({}, ZAKRES, T('2026-10-02T13:00:00Z'));
    expect(doPominiecia(n, T('2026-10-02T13:10:00Z')).has('2025-01-01..2025-01-07')).toBe(false);
  });

  it('sukces wymazuje pamięć, więc przerwa nie rośnie na zawsze', () => {
    let n = dopiszPorazke({}, ZAKRES, T('2026-10-02T13:00:00Z'));
    n = dopiszPorazke(n, ZAKRES, T('2026-10-02T15:00:00Z'));
    expect(n[ZAKRES]!.prob).toBe(2);
    n = zapomnij(n, ZAKRES);
    expect(ZAKRES in n).toBe(false);
    // Kolejna porazka liczy sie od nowa: znowu godzina, nie cztery.
    n = dopiszPorazke(n, ZAKRES, T('2026-10-03T09:00:00Z'));
    expect(przerwaGodzin(n[ZAKRES]!.prob)).toBe(1);
  });

  it('zapomnienie nieznanego zakresu nie wywraca się', () => {
    expect(zapomnij({}, ZAKRES)).toEqual({});
  });
});

describe('opisPominietych', () => {
  it('mówi ile porażek i kiedy wróci — tylko o tych w przerwie', () => {
    let n = dopiszPorazke({}, ZAKRES, T('2026-10-02T13:00:00Z'));
    n = dopiszPorazke(n, ZAKRES, T('2026-10-02T13:00:00Z'));
    n = dopiszPorazke(n, 'stary..zakres', T('2026-10-01T01:00:00Z'));
    const o = opisPominietych(n, T('2026-10-02T13:30:00Z'));
    expect(o).toHaveLength(1);
    expect(o[0]).toContain(ZAKRES);
    expect(o[0]).toContain('2 porazek');
  });
});
