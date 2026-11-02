import { describe, expect, it } from 'vitest';
import { BRAKUJACE_2025, RAPORTY_2025, pensjaRoczna, wynagrodzenie } from './wynagrodzenia-zarzadow';

/*
 * Dane sa przepisane recznie z osmiu raportow, wiec test jest kontrola
 * literowek: kazda liczba stoi w co najmniej jednej sumie, ktora podal sam
 * raport. Pomylka w jednej cyfrze rozjezdza wiersz albo kolumne.
 */
describe('wynagrodzenia zarzadow 2025', () => {
  it.each(RAPORTY_2025.map((r) => [r.skrot, r] as const))('%s: kazdy wiersz sie sumuje', (_, r) => {
    for (const o of r.osoby) {
      // Skladniki sa zaokraglone osobno, wiec wiersz moze sie roznic o jedna jednostke raportu.
      expect(Math.abs(o.stale + o.zmienne + o.inne - o.razem), o.osoba).toBeLessThanOrEqual(r.dokladnosc * 1.01);
    }
  });

  it.each(RAPORTY_2025.filter((r) => r.razemWRaporcie).map((r) => [r.skrot, r] as const))('%s: suma osob = wiersz „Razem” raportu', (_, r) => {
    const tolerancja = r.dokladnosc * r.osoby.length;
    for (const [pole, oczekiwana] of Object.entries(r.razemWRaporcie!)) {
      const suma = r.osoby.reduce((a, o) => a + o[pole as 'stale' | 'zmienne' | 'inne' | 'razem'], 0);
      expect(Math.abs(suma - oczekiwana), `${r.skrot} ${pole}`).toBeLessThanOrEqual(tolerancja);
    }
  });

  it('kazda spolka ma zrodlo, sume kontrolna pliku i punkt odniesienia', () => {
    for (const r of RAPORTY_2025) {
      expect(r.raport).toMatch(/^https:\/\//);
      expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(r.pracownik.kwota).toBeGreaterThan(5000);
      expect(r.osoby.filter((o) => !o.byly).length).toBeGreaterThan(0);
    }
  });

  it('nikt nie jest wymieniony dwa razy w tej samej spolce', () => {
    for (const r of RAPORTY_2025) expect(new Set(r.osoby.map((o) => o.osoba)).size).toBe(r.osoby.length);
  });

  it('dziesiec spolek: przepisane plus brakujace z powodem', () => {
    expect(RAPORTY_2025.length + BRAKUJACE_2025.length).toBe(10);
  });

  it('wynagrodzenie to stale + zmienne, pensja roczna z miesiecznej razy 12', () => {
    const kghm = RAPORTY_2025.find((r) => r.skrot === 'KGHM')!;
    expect(wynagrodzenie(kghm.osoby[0]!)).toBe(1482367 + 1149606);
    expect(pensjaRoczna(kghm)).toBe(19119 * 12);
    expect(pensjaRoczna(RAPORTY_2025.find((r) => r.skrot === 'Orlen')!)).toBe(169000);
  });
});
