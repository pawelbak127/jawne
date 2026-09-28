import { describe, expect, it } from 'vitest';
import { MAKS_ADRESOW_MAPY } from './przeglad';

describe('limit mapy strony', () => {
  it('trzyma sie protokolu sitemaps.org', () => {
    // 28.09.2026 mapa liczyla ~240 tysiecy adresow, bo dokladala wszystkich
    // beneficjentow pomocy. To ona, a nie pamiec maszyny, wywrocila build
    // na serwerze i zostawila serwis wylaczony na dobe.
    expect(MAKS_ADRESOW_MAPY).toBe(50_000);
  });
});
