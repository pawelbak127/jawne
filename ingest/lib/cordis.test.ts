import { describe, expect, it } from 'vitest';
import { liczbaCordis, projektyCordis, uczestnicyPolscy } from './cordis';

// Naglowek i wiersze jak w organization.csv z 08.10.2026 (srednik, cudzyslowy przy polach z separatorem).
const NAGLOWEK = 'projectID;projectAcronym;organisationID;vatNumber;name;shortName;SME;activityType;street;postCode;city;country;nutsCode;geolocation;organizationURL;contactForm;contentUpdateDate;rcn;order;role;ecContribution;netEcContribution;totalCost;endOfParticipation;active';
const PL = '101069586;BOLSTER;998521008;PL6340008825;UNIWERSYTET EKONOMICZNY W KATOWICACH;;false;HES;UL 1 MAJA 50;40-287;KATOWICE;PL;PL22A;50.258447412,19.044673666;;;2026-08-25;2128307;3;participant;350267.5;350267.5;350267,5;false;';
const DE = '101069586;BOLSTER;999;DE123;FIRMA GMBH;;true;PRC;X;1;BERLIN;DE;DE300;52.5,13.4;;;2026-08-25;1;1;coordinator;100;100;100;false;';
const TRZECI = '101069586;BOLSTER;997;PL5260152844;"INSTYTUT; Z SREDNIKIEM";;false;REC;X;00-001;WARSZAWA;PL;PL911;0,0;;;2026-08-25;2;4;thirdParty;;12000;12000;false;';

describe('uczestnicyPolscy', () => {
  it('bierze tylko polskich, NIP z vatNumber, kwoty z kropka i z przecinkiem', () => {
    const w = uczestnicyPolscy([NAGLOWEK, PL, DE, TRZECI].join('\n'), 'HORIZON');
    expect(w.wszystkich).toBe(3);
    expect(w.brakKolumn).toEqual([]);
    expect(w.wiersze).toHaveLength(2);
    const [uek, inst] = w.wiersze;
    expect(uek).toMatchObject({ nip: '6340008825', wkladNetto: 350267.5, koszt: 350267.5, kolejnosc: 3, szerokosc: 50.258447412, msp: 0 });
    // Wspolrzedne „0,0” to blad zrodla, nie punkt w Polsce; pusty ecContribution to null, nie zero.
    expect(inst).toMatchObject({ nazwa: 'INSTYTUT; Z SREDNIKIEM', szerokosc: null, wklad: null, wkladNetto: 12000, rola: 'thirdParty' });
  });

  it('wiersz bez numeru projektu odpada ze zgloszeniem; zmiana naglowka jest widoczna', () => {
    const w = uczestnicyPolscy([NAGLOWEK, PL.replace('101069586', '')].join('\n'), 'H2020');
    expect(w.wiersze).toHaveLength(0);
    expect(w.problemy).toHaveLength(1);
    expect(uczestnicyPolscy('projectID;name;country\n1;A;PL', 'H2020').brakKolumn).toContain('netEcContribution');
  });
});

describe('projektyCordis i liczbaCordis', () => {
  it('tylko potrzebne projekty', () => {
    const csv = 'id;acronym;status;title;startDate;endDate;totalCost;ecMaxContribution;fundingScheme\n'
      + '1;A;SIGNED;Tytul A;2024-01-01;2026-12-31;10;9,5;HORIZON-RIA\n2;B;SIGNED;Tytul B;2024-01-01;2026-12-31;1;1;X';
    expect(projektyCordis(csv, 'HORIZON', new Set(['1']))).toEqual([{
      program: 'HORIZON', id: '1', akronim: 'A', tytul: 'Tytul A', start: '2024-01-01', koniec: '2026-12-31',
      status: 'SIGNED', schemat: 'HORIZON-RIA', wkladMax: 9.5,
    }]);
    expect([liczbaCordis(''), liczbaCordis('12,5'), liczbaCordis('abc')]).toEqual([null, 12.5, null]);
  });
});
