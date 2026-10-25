import { describe, expect, it } from 'vitest';
import { drukiZTytulu } from './druki';

describe('drukiZTytulu', () => {
  it('warianty zapisu z rejestru (zmierzone 24.10.2026)', () => {
    expect(drukiZTytulu('Pkt. 16 Sprawozdanie Komisji o rządowym projekcie ustawy (druki nr 3147 i 3225)')).toEqual(['3147', '3225']);
    expect(drukiZTytulu('Pierwsze czytanie poselskiego projektu ustawy (druk nr 2724)')).toEqual(['2724']);
    expect(drukiZTytulu('… (druki nr 3132, 3167 i 3167-A)')).toEqual(['3132', '3167']);
    expect(drukiZTytulu('… (druki nr 1, 2-A, 2-B, 2-BA, 2-C i 3)')).toEqual(['1', '2', '3']);
    expect(drukiZTytulu('Wniosek o skrócenie terminu … w sprawie sprawozdania z druku nr 787')).toEqual(['787']);
  });

  it('bez druku, pusty i uszkodzony zapis — nic nie zgadujemy', () => {
    expect(drukiZTytulu('Wybór Marszałka Sejmu')).toEqual([]);
    expect(drukiZTytulu(null)).toEqual([]);
    expect(drukiZTytulu('… (druk nr ...)')).toEqual([]);
    expect(drukiZTytulu('… (druki nr 12, 34 i )')).toEqual(['12', '34']);
  });

  it('numer nie dopasowuje się po fragmencie (3147 to nie 31470)', () => {
    expect(drukiZTytulu('… (druk nr 31470)')).not.toContain('3147');
  });
});
