import { describe, expect, it } from 'vitest';
import { opisGlosowania, opisJednaLinia } from './opis-glosowania';

// Pary tytul/temat przepisane z bazy (glosowania 65-3, 65-1, 64-65, 1-4).
describe('opisGlosowania', () => {
  it('tytul bedacy nazwa posiedzenia oddaje glowna linie tematowi', () => {
    const o = opisGlosowania({
      tytul: '65. posiedzenie Sejmu Rzeczypospolitej Polskiej w dniach 15, 16, 17 i 18 września 2026 r.',
      temat: 'Głosowanie kworum',
    });
    expect(o).toEqual({ sprawa: 'Głosowanie kworum', przedmiot: null, punkt: null, porzadkowe: true, nadCaloscia: false });
  });

  it('temat pisany mala litera dostaje wielka, gdy staje sie naglowkiem', () => {
    const o = opisGlosowania({ tytul: '65. posiedzenie Sejmu RP', temat: 'wniosek o odroczenie posiedzenia' });
    expect(o.sprawa).toBe('Wniosek o odroczenie posiedzenia');
  });

  it('przy "Pkt. N" sprawa jest w tytule, a temat mowi, co glosowano', () => {
    const o = opisGlosowania({
      tytul: 'Pkt. 29 Wybór nowego składu osobowego Komisji do Spraw Unii Europejskiej (druk nr 3061)',
      temat: 'głosowanie nad przyjęciem wniosku z druku.',
    });
    expect(o).toMatchObject({
      sprawa: 'Wybór nowego składu osobowego Komisji do Spraw Unii Europejskiej (druk nr 3061)',
      przedmiot: 'głosowanie nad przyjęciem wniosku z druku',
      punkt: '29',
      porzadkowe: false,
    });
  });

  it('rozpoznaje glosowanie nad caloscia po slowach rejestru', () => {
    expect(opisGlosowania({ tytul: 'Pkt. 5 Projekt ustawy', temat: 'głosowanie nad całością projektu.' }).nadCaloscia).toBe(true);
    expect(opisGlosowania({ tytul: 'Pkt. 5 Projekt ustawy', temat: 'poprawka 1' }).nadCaloscia).toBe(false);
  });

  it('kilka punktow naraz trafia do metki, nie do naglowka', () => {
    const o = opisGlosowania({ tytul: 'Pkt. 10., 11., 12. i 13 Pierwsze czytania projektów ustaw', temat: 'wniosek' });
    expect(o).toMatchObject({ sprawa: 'Pierwsze czytania projektów ustaw', punkt: '10, 11, 12 i 13' });
  });

  it('tytul bez punktu zostaje w calosci', () => {
    const o = opisGlosowania({ tytul: 'Głosowanie proceduralne dotyczące projektu uchwały z druku nr 3071', temat: 'wniosek o skrócenie terminu' });
    expect(o).toMatchObject({ sprawa: 'Głosowanie proceduralne dotyczące projektu uchwały z druku nr 3071', punkt: null, porzadkowe: false });
  });

  it('pusty temat nie wywraca opisu', () => {
    expect(opisGlosowania({ tytul: 'Pkt. 3 Wybór Wicemarszałków', temat: null })).toMatchObject({ sprawa: 'Wybór Wicemarszałków', przedmiot: null });
  });
});

describe('nazwiska osob prywatnych', () => {
  // Nazwiska zmyslone — patrz komentarz w prywatnosc.test.ts.
  it('nie przechodza do opisu glosowania', () => {
    const o = opisGlosowania({
      tytul: 'Pkt. 34 Sprawozdanie Komisji w sprawie wniosku oskarżyciela prywatnego Jana Kowalskiego, reprezentowanego przez adwokata Adama Nowaka, z dnia 10 września 2025 r. o wyrażenie zgody na pociągnięcie do odpowiedzialności karnej posła Piotra Posłowskiego (druk nr 1)',
      temat: 'głosowanie nad przyjęciem wniosku z druku.',
    });
    expect(o.sprawa).not.toMatch(/Kowalsk|Nowak/);
    expect(o.sprawa).toMatch(/posła Piotra Posłowskiego/);
  });
});

describe('opisJednaLinia', () => {
  it('skleja sprawe z przedmiotem', () => {
    expect(opisJednaLinia({ tytul: 'Pkt. 5 Projekt ustawy o X', temat: 'poprawka 3' })).toBe('Projekt ustawy o X — poprawka 3');
  });
});
