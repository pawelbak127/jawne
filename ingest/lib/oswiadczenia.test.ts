import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wierszeCsv, wykazOswiadczen } from './oswiadczenia';

const NAGLOWEK = '﻿"Nr leg.","Nazwisko i imię","","Data złożenia","Nazwa pliku",""';
const ADRES = (plik: string) => `https://orka.sejm.gov.pl/osw10.nsf/0/BCABAA60BA061079C1258A6200565C75/$file/${plik}`;

describe('wierszeCsv', () => {
  it('BOM, cudzyslowy, przecinek w cudzyslowie i podwojony cudzyslow', () => {
    expect(wierszeCsv('﻿a,"b, c","d ""e"""\r\n\r\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });
});

describe('wykazOswiadczen', () => {
  const poslowie = new Map([[1, 'Andrzej Adamczyk'], [13, 'Władysław Bartoszewski']]);

  it('drugie imie z wykazu nie przeszkadza; zly posel, data i adres odpadaja ze zgloszeniem', () => {
    const tekst = [
      NAGLOWEK,
      `001,"Adamczyk Andrzej","Początek kadencji",2023-11-09,OSW10P_001.pdf,${ADRES('OSW10P_001.pdf')}`,
      `013,"Bartoszewski Władysław Teofil","I rok kadencji",2024-04-30,OSW101_013.pdf,${ADRES('OSW101_013.pdf')}`,
      `013,"Bartoszewski Jan","II rok kadencji",2025-04-30,OSW102_013.pdf,${ADRES('OSW102_013.pdf')}`,
      `999,"Ktoś Inny","I rok kadencji",2024-04-30,OSW101_999.pdf,${ADRES('OSW101_999.pdf')}`,
      `001,"Adamczyk Andrzej","I rok kadencji",30.04.2024,OSW101_001.pdf,${ADRES('OSW101_001.pdf')}`,
      `001,"Adamczyk Andrzej","I rok kadencji",2024-04-30,OSW101_001.pdf,https://example.com/OSW101_001.pdf`,
      `001,"Adamczyk Andrzej","Wygaśnięcie mandatu",2026-01-10,OSW10K_001.pdf,${ADRES('OSW10K_001.pdf')}`,
    ].join('\r\n');
    const w = wykazOswiadczen(tekst, poslowie);
    expect(w.oswiadczenia.map((o) => [o.poselId, o.rodzaj])).toEqual([
      [1, 'Początek kadencji'], [13, 'I rok kadencji'], [1, 'Wygaśnięcie mandatu'],
    ]);
    expect(w.problemy).toHaveLength(4);
    expect(w.nieznaneRodzaje).toEqual(['Wygaśnięcie mandatu']);
  });

  it('obcy naglowek — nic nie wchodzi', () => {
    expect(wykazOswiadczen('a,b\n1,2', poslowie).oswiadczenia).toEqual([]);
  });

  it('plik z repozytorium: 1 874 wiersze, 6 pol, wszystkie adresy na orka.sejm.gov.pl', () => {
    const tekst = readFileSync('ingest/zrodla/sejm-oswiadczenia/osw10.csv', 'utf8');
    const [, ...wiersze] = wierszeCsv(tekst);
    expect(wiersze).toHaveLength(1874);
    expect(wiersze.every((w) => w.length === 6 && w[5]!.startsWith('https://orka.sejm.gov.pl/'))).toBe(true);
  });
});
