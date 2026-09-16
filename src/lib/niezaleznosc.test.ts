import { describe, expect, it } from 'vitest';
import { porownajZKlubem, wiekszoscReszty, type GlosZKlubem } from './niezaleznosc';

describe('wiekszoscReszty', () => {
  it('odlicza samego posla od liczb klubu', () => {
    // Klub: 3 za, 3 przeciw. Posel glosowal za -> reszta 2 za, 3 przeciw.
    expect(wiekszoscReszty({ za: 3, przeciw: 3, wstrzymalo: 0 }, 'YES')).toBe('NO');
  });

  // Bez odliczenia posel w dwuosobowym kole zawsze "zgadzalby sie z klubem".
  it('w malym kole glos posla nie tworzy wiekszosci, z ktora sie zgadza', () => {
    expect(wiekszoscReszty({ za: 2, przeciw: 0, wstrzymalo: 0 }, 'YES')).toBeNull();
  });

  it('remis w reszcie klubu to brak punktu odniesienia, nie zgoda', () => {
    expect(wiekszoscReszty({ za: 3, przeciw: 2, wstrzymalo: 0 }, 'YES')).toBeNull();
  });

  it('wymaga co najmniej trzech glosow reszty', () => {
    // Klub 2 za + 1 przeciw (to posel) -> reszta ma tylko 2 glosy.
    expect(wiekszoscReszty({ za: 2, przeciw: 1, wstrzymalo: 0 }, 'NO')).toBeNull();
    expect(wiekszoscReszty({ za: 3, przeciw: 1, wstrzymalo: 0 }, 'NO')).toBe('YES');
  });

  it('niespojne dane rzucaja, zamiast dawac ujemna reszte', () => {
    expect(() => wiekszoscReszty({ za: 0, przeciw: 5, wstrzymalo: 0 }, 'YES')).toThrow(/Niespojne/);
  });
});

const wiersz = (nadpis: Partial<GlosZKlubem>): GlosZKlubem => ({
  posiedzenie: 1, numer: 1, data: '2024-01-01', tytul: 't', temat: null,
  klub_id: 'KO', glos: 'YES', za: 100, przeciw: 0, wstrzymalo: 0, ...nadpis,
});

describe('porownajZKlubem', () => {
  it('liczy mianownik i odstepstwa', () => {
    const w = porownajZKlubem([
      wiersz({ numer: 1 }),
      wiersz({ numer: 2, glos: 'NO', za: 99, przeciw: 1 }),
    ]);
    expect(w).toMatchObject({ porownywalnych: 2, odmiennych: 1 });
    expect(w.odstepstwa[0]).toMatchObject({ numer: 2, glos: 'NO', wiekszosc: 'YES' });
  });

  it('nieobecnosc i glos wazny nie sa porownywane', () => {
    const w = porownajZKlubem([
      wiersz({ glos: 'ABSENT' }),
      wiersz({ glos: 'VOTE_VALID' }),
      wiersz({ glos: 'PRESENT' }),
    ]);
    expect(w.porownywalnych).toBe(0);
  });

  it('niezrzeszeni nie tworza klubu', () => {
    expect(porownajZKlubem([wiersz({ klub_id: 'niez.', glos: 'NO', przeciw: 1, za: 6 })]).porownywalnych).toBe(0);
  });

  it('pamieta klub z dnia glosowania i zwraca odstepstwa od najnowszego', () => {
    const w = porownajZKlubem([
      wiersz({ data: '2023-12-01', klub_id: 'Kukiz15', glos: 'NO', za: 3, przeciw: 1 }),
      wiersz({ data: '2025-05-01', klub_id: 'PiS', glos: 'NO', za: 99, przeciw: 1 }),
    ]);
    expect(w.odstepstwa.map((o) => o.klub_id)).toEqual(['PiS', 'Kukiz15']);
    expect(w.kluby.sort()).toEqual(['Kukiz15', 'PiS']);
  });
});
