import type { DatabaseSync } from 'node:sqlite';
import {
  KLUCZ_FIRM_DO_MAPY, KLUCZ_MAPY_POMOCY, KLUCZ_PRZEGLADU, MAKS_ADRESOW_MAPY, podpisDni, type Czytnik,
} from '../../src/lib/przeglad.js';
import { nazwaPodmiotuJawna } from '../../src/lib/prywatnosc.js';
import { TERYT_WARSZAWY } from './fe.js';
import { delta, mapaZeSum, odswiezSumy, przegladZeSum, sumyFirm } from './sumy-pomocy.js';

/**
 * Liczy gotowe wyniki, ktorych strona nie zdazylaby policzyc przy odbudowie:
 * przeglad krajowy pomocy publicznej, mape gmin i liste beneficjentow
 * do mapy strony.
 *
 * Od 30.09.2026 nie liczy ich od zera. Sumy zbieraja sie DZIEN PO DNIU
 * w `sumy-pomocy.ts`, bo koszt liczenia od zera rosl razem z historia:
 * 11 minut przy 2,5 mln wierszy, 29 minut przy 3,78 mln, a pelne okno
 * rejestru to ~30 mln. Teraz koszt zalezy od liczby NOWYCH dni.
 */
export function policzAgregaty(db: DatabaseSync, wymus = false): { policzono: boolean; opis: string } {
  const czytnik: Czytnik = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };

  const sumy = odswiezSumy(db, wymus);
  const d = delta(db);
  const podpis = podpisDni(czytnik);

  const zapisz = (klucz: string, wartosc: unknown) => db.prepare(
    `insert into agregaty (klucz, podpis, wartosc, policzono) values (?, ?, ?, ?)
       on conflict(klucz) do update set podpis = excluded.podpis,
                                        wartosc = excluded.wartosc,
                                        policzono = excluded.policzono`,
  ).run(klucz, podpis, JSON.stringify(wartosc), new Date().toISOString());

  // Mapa liczy sie z dni USTALONYCH — tak samo jak strona gminy. Patrz
  // naglowek `mapaZeSum`: blad B2 z przegladu 01.10.2026.
  const mapa = mapaZeSum(db, TERYT_WARSZAWY);
  zapisz(KLUCZ_MAPY_POMOCY, mapa);

  /*
   * Firmy do mapy strony. Regule jawnosci sprawdzamy TUTAJ, a nie przy
   * renderowaniu strony — ale nie dlatego, ze jest droga: ZMIERZONE
   * 30.09.2026 to 1,2 mikrosekundy na nazwe, czyli okolo 0,3 s na wszystkich
   * beneficjentow kraju. Tu jest, bo tu jest reszta liczenia.
   *
   * Filtrujemy PRZED przycieciem do limitu, a nie po nim: inaczej limit
   * zjadaly nazwy, ktorych i tak nie wolno pokazac, i mapa strony byla
   * krotsza, niz mogla byc.
   *
   * `typRegon` jest OBOWIAZKOWY: od 24.09.2026 o jawnosci rozstrzyga rejestr.
   * Bez niego ta lista powstawala sama heurystyka i polecala wyszukiwarkom
   * 57 adresow, pod ktorymi `/firma/[nip]` oddaje 404 (zmierzone 01.10.2026).
   */
  const wszystkieFirmy = sumyFirm(db, d);
  const firmy = [...wszystkieFirmy]
    .filter(([, f]) => nazwaPodmiotuJawna(f.nazwa, f.typRegon))
    .sort((a, b) => b[1].brutto - a[1].brutto)
    .slice(0, MAKS_ADRESOW_MAPY)
    .map(([nip]) => nip);
  zapisz(KLUCZ_FIRM_DO_MAPY, firmy);

  const przeglad = przegladZeSum(db, TERYT_WARSZAWY);
  if (!przeglad) {
    // Zaden dzien sie jeszcze nie ustalil — nie ma czego liczyc i nie jest
    // to blad. Stary agregat zostawiamy: mowi prawde o tym, co bylo.
    return {
      policzono: false,
      opis: `${sumy.opis}; mapa: ${mapa.length} gmin, ${firmy.length} firm;`
        + ' brak dni ustalonych — przegladu nie licze',
    };
  }

  zapisz(KLUCZ_PRZEGLADU, przeglad);

  return {
    policzono: true,
    opis: `${sumy.opis}; przeglad krajowy: ${przeglad.dni} dni, ${przeglad.przypadkow} przypadkow; `
      + `mapa: ${mapa.length} gmin, ${firmy.length} firm (delta: ${d.dni} dni, ${d.wierszy} wierszy)`,
  };
}
