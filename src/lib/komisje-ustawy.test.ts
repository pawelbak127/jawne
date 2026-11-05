import { describe, expect, it } from 'vitest';
import { kodyKomisjiUstawy } from './komisje-ustawy';

describe('kodyKomisjiUstawy', () => {
  it('pomija kod Sejm, bo to skierowanie na posiedzenie izby, a nie komisja', () => {
    expect(kodyKomisjiUstawy([
      { kolejnosc: 1, komisja: 'Sejm' },
      { kolejnosc: 2, komisja: 'INF' },
    ])).toEqual(['INF']);
  });

  it('zachowuje kolejność etapów, a nie kolejność wierszy', () => {
    expect(kodyKomisjiUstawy([
      { kolejnosc: 3, komisja: 'FPB' },
      { kolejnosc: 1, komisja: 'STR' },
    ])).toEqual(['STR', 'FPB']);
  });

  it('każdą komisję podaje raz, a etapy bez komisji pomija', () => {
    expect(kodyKomisjiUstawy([
      { kolejnosc: 1, komisja: 'ZDR' },
      { kolejnosc: 2, komisja: null },
      { kolejnosc: 3, komisja: 'ZDR' },
    ])).toEqual(['ZDR']);
  });

  it('bez komisji oddaje pustą listę, nie zgaduje', () => {
    expect(kodyKomisjiUstawy([{ kolejnosc: 1, komisja: 'Sejm' }])).toEqual([]);
    expect(kodyKomisjiUstawy([])).toEqual([]);
  });
});
