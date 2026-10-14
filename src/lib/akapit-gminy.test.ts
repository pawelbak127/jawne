import { describe, expect, it } from 'vitest';
import { akapitGminy, type DaneAkapitu } from './akapit-gminy';

const PELNE: DaneAkapitu = {
  czyja: 'gminy Piątek',
  wWojewodztwie: 'w województwie łódzkim',
  tutaj: 'w tej gminie',
  ludnosc: 6000,
  dochody: { rok: 2025, razem: 60_000_000, naOsobe: 10_000, mediana: 8000, gminWMedianie: 177 },
  ue: { razem: 3_000_000, projektow: 4, naOsobe: 500, mediana: 1000, opisMediany: 'mediana w województwie (177 gmin)' },
  pomoc: {
    pelna: false, od: '2026-09-01', do: '2026-09-16', dni: 16,
    razem: 1_200_000, przypadkow: 52, naOsobe: 200, mediana: 210, udzialNajwiekszego: 0.4,
  },
  adres: 'https://zrejestru.pl/gmina/100406',
  stan: '2026-10-14',
};
const bez = (t: string) => t.replace(/\u00a0/g, ' ');

describe('akapitGminy', () => {
  it('każda kwota na mieszkańca idzie z sumą i mianownikiem, porównanie bez oceny', () => {
    const a = akapitGminy(PELNE)!;
    const t = bez(a.tekst);
    expect(t).toContain('Dochody gminy Piątek w 2025 r. wyniosły 10,0 tys. zł na mieszkańca (60,0 mln zł przy 6000 mieszkańcach).');
    expect(t).toContain('To 1,3 raza więcej niż mediana z 177 gmin w województwie łódzkim: 8000 zł.');
    expect(t).toContain('Wyłącznie w tej gminie realizowane są 4 projekty z Funduszy Europejskich 2021–2027 z dofinansowaniem z UE 3,00 mln zł, czyli 500 zł na mieszkańca.');
    expect(t).toContain('To 2 razy mniej niż mediana w województwie (177 gmin): 1000 zł.');
    expect(t).not.toMatch(/lepiej|gorzej|za mało|za dużo/);
  });

  it('pomoc publiczna: okres, liczba przypadków i zastrzeżenie UOKiK w tym samym zdaniu', () => {
    const t = bez(akapitGminy(PELNE)!.tekst);
    expect(t).toContain('w 16 dniach z okresu od 1 września 2026 do 16 września 2026 otrzymały 52 przypadki pomocy publicznej');
    expect(t).toContain('dane w rejestrze mogą ulec zmianie');
    expect(t).toContain('Mniej więcej tyle'.toLowerCase());
    expect(t).toContain('40% tej kwoty trafiło do jednego podmiotu.');
  });

  it('źródła tylko te, z których jest zdanie, z adresem i datą stanu', () => {
    const z = akapitGminy({ ...PELNE, ue: null, pomoc: null })!.zrodla;
    expect(z).toBe('Źródło: https://zrejestru.pl/gmina/100406, na podstawie danych: GUS, Bank Danych Lokalnych. Stan na 14 października 2026 r.');
  });

  it('brak wartości to brak zdania, nie zero (zasada 4)', () => {
    const t = bez(akapitGminy({ ...PELNE, dochody: null, ue: null })!.tekst);
    expect(t).not.toContain('Dochody');
    expect(t).not.toContain('Funduszy');
    expect(akapitGminy({ ...PELNE, dochody: null, ue: null, pomoc: null })).toBeNull();
  });

  it('miasto mówi „w tym mieście”, nie „w tej gminie”', () => {
    const t = akapitGminy({ ...PELNE, czyja: 'miasta Tychy', tutaj: 'w tym mieście' })!.tekst;
    expect(t).toContain('Wyłącznie w tym mieście realizowane są');
    expect(t).toContain('firmy z siedzibą w tym mieście');
    expect(t).not.toContain('w tej gminie');
  });

  it('zmierzone zero projektów UE to zdanie o zerze', () => {
    const t = akapitGminy({ ...PELNE, ue: { razem: 0, projektow: 0, naOsobe: 0, mediana: 1000, opisMediany: 'x' } })!.tekst;
    expect(t).toContain('nie ma żadnego projektu realizowanego tylko w tej gminie');
  });

  it('bez liczby mieszkańców nie ma kwoty na mieszkańca ani porównania', () => {
    const t = bez(akapitGminy({
      ...PELNE, ludnosc: null,
      dochody: { rok: 2025, razem: 60_000_000, naOsobe: null, mediana: 8000, gminWMedianie: 177 },
      pomoc: { ...PELNE.pomoc!, naOsobe: null, udzialNajwiekszego: 0 },
    })!.tekst);
    expect(t).toContain('Dochody gminy Piątek w 2025 r. wyniosły 60,0 mln zł.');
    expect(t).not.toContain('mediana gmin');
    expect(t).not.toContain('jednego podmiotu');
  });

  it('pomoc bez kwot w rejestrze: liczba przypadków bez „0 zł”', () => {
    const t = bez(akapitGminy({ ...PELNE, pomoc: { ...PELNE.pomoc!, razem: null, naOsobe: null, udzialNajwiekszego: 0 } })!.tekst);
    expect(t).toContain('52 przypadki pomocy publicznej (rejestr nie podaje ich wartości); dane w rejestrze mogą ulec zmianie.');
    expect(t).not.toContain('0 zł brutto');
  });

  it('pełna historia gminy pokazowej — inny opis okresu', () => {
    const t = bez(akapitGminy({ ...PELNE, pomoc: { ...PELNE.pomoc!, pelna: true, od: '2016-10-01', mediana: null } })!.tekst);
    expect(t).toContain('od 1 października 2016 (pełna historia w rejestrze)');
  });
});
