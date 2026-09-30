import { describe, expect, it } from 'vitest';
import { etykieta, rozbijAdresGlosowania } from './glosy';

describe('etykieta', () => {
  it('nie zgaduje znaczenia wartosci spoza slownika — pokazuje surowy kod', () => {
    expect(etykieta('YES').krotka).toBe('za');
    expect(etykieta('COS_NOWEGO').krotka).toBe('COS_NOWEGO');
    expect(etykieta('COS_NOWEGO').ton).toBe('inne');
  });
});

describe('rozbijAdresGlosowania', () => {
  it('czyta posiedzenie i numer', () => {
    expect(rozbijAdresGlosowania('65-12')).toEqual({ posiedzenie: 65, numer: 12 });
    expect(rozbijAdresGlosowania('1-1')).toEqual({ posiedzenie: 1, numer: 1 });
  });

  it('odrzuca wszystko inne — adres nie jest zaproszeniem do bazy', () => {
    for (const zly of ['', '65', '65-', '-12', '65-12-3', 'a-b', '65 12', "65-12'", '65-1e2']) {
      expect(rozbijAdresGlosowania(zly)).toBeNull();
    }
  });
});
