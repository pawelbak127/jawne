import { describe, expect, it } from 'vitest';
import { czyZwrotAkcyzy, plikiRoczne, terytGminy, zwrotyAkcyzy, type ZasobDaneGov } from './rb28s';

// Naglowek i wiersze jak w Rb28S.csv za IV kw. 2025 (dane.gov.pl, zasob 1498230).
const NAGLOWEK = '﻿REGON;WK;PK;GK;GT;PT;KODMSWIA;ROK;KWARTAL;DAT_SKW;WERSJA;DZIAL;ROZDZIAL;GRUPA;PAR;PAR4;R1;R10;R4;R11;R12;R12U;R12B;R9;R13;NAZWAJST';
const wiersz = (wk: string, pk: string, gk: string, gt: string, pt: string, rozdzial: string, par: string, r4: string) =>
  `000000000;${wk};${pk};${gk};${gt};${pt};;25;4;2026-02-20;0;010;${rozdzial};4400;${par};0;0,00;0,00;${r4};0,00;0,00;0,00;0,00;0,00;0,00;x`;

async function* linie(...l: string[]): AsyncGenerator<string> {
  yield* l;
}

describe('terytGminy', () => {
  it('gmina z GT 1–3 ma swoj kod, miasto na prawach powiatu — kod 01', () => {
    expect(terytGminy('10', '01', '01', '1', '0')).toBe('100101');
    expect(terytGminy('10', '01', '02', '2', '0')).toBe('100102');
    expect(terytGminy('14', '65', '00', '0', '2')).toBe('146501');
  });

  it('powiat, wojewodztwo i zwiazek nie sa gmina', () => {
    expect(terytGminy('10', '01', '00', '0', '1')).toBeNull();
    expect(terytGminy('02', '00', '00', '0', '0')).toBeNull();
    expect(terytGminy('10', '01', '00', 'Z', '0')).toBeNull();
  });
});

describe('zwrotyAkcyzy', () => {
  it('sumuje paragraf 4430 rozdzialu 01095 po gminach, reszte pomija', async () => {
    const w = await zwrotyAkcyzy(linie(
      NAGLOWEK,
      wiersz('10', '01', '02', '2', '0', '01095', '443', '681873,50'),
      wiersz('10', '01', '02', '2', '0', '01095', '443', '100,50'),
      // koszty obslugi zwrotu i inny rozdzial — nie wchodza
      wiersz('10', '01', '02', '2', '0', '01095', '401', '9999,00'),
      wiersz('10', '01', '02', '2', '0', '01010', '443', '5,00'),
      // powiat z tym samym paragrafem — nie gmina
      wiersz('10', '01', '00', '0', '1', '01095', '443', '7,00'),
      wiersz('14', '65', '00', '0', '2', '01095', '443', '12,25'),
      '',
    ));
    expect(w.brakKolumn).toEqual([]);
    expect(w.wierszy).toBe(6);
    expect(w.okresy).toEqual(['25/4']);
    expect(Object.fromEntries(w.gminy)).toEqual({ '100102': 681974, '146501': 12.25 });
  });

  it('plik bez potrzebnej kolumny konczy sie od razu i mowi, czego brakuje', async () => {
    const w = await zwrotyAkcyzy(linie('REGON;WK;PK;GK;GT;PT;ROK;KWARTAL;DZIAL;ROZDZIAL;PAR;R4', 'x'));
    expect(w.brakKolumn).toEqual(['PAR4']);
    expect(w.wierszy).toBe(0);
  });

  it('rozpoznaje paragraf po obu polach: 443 + 0', () => {
    expect(czyZwrotAkcyzy('010', '01095', '443', '0')).toBe(true);
    expect(czyZwrotAkcyzy('010', '01095', '443', '7')).toBe(false);
    expect(czyZwrotAkcyzy('600', '01095', '443', '0')).toBe(false);
  });
});

describe('plikiRoczne', () => {
  const zasob = (id: string, title: string, modified: string, format: string | null = 'csv'): ZasobDaneGov => ({
    id, attributes: { title, modified, files: [{ download_url: `https://api.dane.gov.pl/resources/${id}/file`, format }] },
  });

  it('bierze tylko IV kwartal Rb-28S, rok z tytulu, przy dwoch plikach nowszy', () => {
    // Tytuly przepisane z katalogu zbioru 872 (02.11.2026).
    const p = plikiRoczne([
      zasob('37681', 'Dane o wydatkach JST /Rb28s/ po IV kwartałach 2021', '2022-04-07T07:27:17Z', 'zip'),
      zasob('65823', 'Dane o wydatkach JST (Rb28s) za IV kwartał 2024 r.', '2025-03-18T00:00:00Z'),
      zasob('1498230', 'Dane o wydatkach JST (Rb28s) za IV kwartały 2025 r.', '2026-03-26T09:27:08Z'),
      zasob('1498999', 'Dane o wydatkach JST (Rb28s) za IV kwartały 2025 r.', '2026-01-01T00:00:00Z'),
      zasob('781666', 'Dane o wydatkach JST (Rb28s) za III kwartał 2025 r.', '2025-11-14T00:00:00Z'),
      zasob('2546990', 'Dane o zobowiązaniach JST (RbZ) za IV kwartał 2025 r.', '2026-03-20T00:00:00Z'),
      zasob('1', 'Dane o dochodach JST (Rb27s) za IV kwartał 2025 r.', '2026-03-20T00:00:00Z'),
    ]);
    expect([...p.keys()].sort()).toEqual([2021, 2024, 2025]);
    expect(p.get(2025)!.zasob).toBe('1498230');
    expect(p.get(2021)!.adres).toBe('https://api.dane.gov.pl/resources/37681/file');
  });
});
