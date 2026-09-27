import { describe, expect, it } from 'vitest';
import { DNI_DO_USTALENIA, DNI_USTALONE, podpisDni, policzPrzeglad, type Czytnik } from './przeglad';

/** Czytnik, ktory zapamietuje zapytania i oddaje przygotowane odpowiedzi. */
function czytnikNaSztywno(odpowiedzi: Record<string, unknown>): Czytnik & { zapytania: string[] } {
  const zapytania: string[] = [];
  const dopasuj = (sql: string) => {
    zapytania.push(sql);
    const klucz = Object.keys(odpowiedzi).find((k) => sql.includes(k));
    return klucz ? odpowiedzi[klucz] : null;
  };
  return {
    zapytania,
    wszystkie: <T>(sql: string) => (dopasuj(sql) ?? []) as T[],
    jeden: <T>(sql: string) => (dopasuj(sql) ?? null) as T | null,
  };
}

describe('przeglad krajowy', () => {
  it('bez ustalonych dni nie zmyśla zera — oddaje null', () => {
    // `null` ≠ zero: „nie mamy jeszcze ustalonego dnia" to nie to samo,
    // co „pomocy nie było".
    const cz = czytnikNaSztywno({ 'min(dzien) as od': { od: null, do: null, dni: 0 } });
    expect(policzPrzeglad(cz, '146501')).toBeNull();
  });

  it('liczy dni ustalone regułą 14 dni od daty POBRANIA', () => {
    expect(DNI_DO_USTALENIA).toBe(14);
    expect(DNI_USTALONE).toContain('pobrano_dzien');
    expect(DNI_USTALONE).toContain('>= 14');
  });

  it('podpis zmienia się, gdy dojdzie dzień — po tym strona pozna, że agregat jest stary', () => {
    const przed = podpisDni(czytnikNaSztywno({ 'count(*) as dni': { dni: 341, od: '2025-10-08', do: '2026-09-13' } }));
    const po = podpisDni(czytnikNaSztywno({ 'count(*) as dni': { dni: 342, od: '2025-10-07', do: '2026-09-13' } }));
    expect(przed).not.toBe(po);
    expect(przed).toBe('341:2025-10-08:2026-09-13');
  });

  it('cały przegląd to osiem przebiegów po tabeli — dlatego liczymy go raz, przy imporcie', () => {
    const cz = czytnikNaSztywno({
      'min(dzien) as od': { od: '2025-10-08', do: '2026-09-13', dni: 341 },
      'count(*) as c from pomoc_publiczna_dni': { c: 12 },
      'count(distinct nip_beneficjenta)': { przypadkow: 10, beneficjentow: 8, gmin: 5, brutto: 1000 },
    });
    const p = policzPrzeglad(cz, '146501')!;
    expect(p.przypadkow).toBe(10);
    expect(p.swiezych).toBe(12);
    // Tyle razy dotykamy `pomoc_publiczna`: razem, trzy grupowania, wielkosc,
    // wojewodztwa, najwieksze. Gdy ta liczba urosnie, strona zwolni — i test
    // ma o tym powiedziec, zanim zrobi to build na serwerze.
    const poTabeli = cz.zapytania.filter((q) => q.includes('from (select * from pomoc_publiczna')
      || q.includes('from (select * from pomoc_publiczna where'));
    expect(poTabeli).toHaveLength(7);
  });
});
