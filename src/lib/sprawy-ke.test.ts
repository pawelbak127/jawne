import { describe, expect, it } from 'vitest';
import { adresSprawyKE, numerSprawyKE } from './sprawy-ke';

describe('numer sprawy Komisji Europejskiej z pola SUDOP', () => {
  it.each([
    ['SA.56922(2020/N)', 'SA.56922'],
    ['SA.40525(2015/X)', 'SA.40525'],
    ['SA.34674(2013/N)', 'SA.34674'],
    ['  SA.102345  ', 'SA.102345'],
  ])('%s -> %s', (wej, wyj) => expect(numerSprawyKE(wej)).toBe(wyj));

  it.each([null, undefined, '', 'X123/2019', 'PL/12/2020', 'SA.', 'SA.12', 'sa.56922'])(
    'bez odnosnika dla %o — lepiej brak niz cudza sprawa',
    (wej) => expect(numerSprawyKE(wej)).toBeNull(),
  );
});

it('adres sprawy w wyszukiwarce Komisji', () => {
  expect(adresSprawyKE('SA.56922')).toBe('https://competition-cases.ec.europa.eu/cases/SA.56922');
});
