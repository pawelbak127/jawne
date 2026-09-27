import type { DatabaseSync } from 'node:sqlite';
import { KLUCZ_PRZEGLADU, podpisDni, policzPrzeglad, type Czytnik } from '../../src/lib/przeglad.js';
import { TERYT_WARSZAWY } from './fe.js';

/**
 * Liczy gotowe wyniki, ktorych strona nie zdazylaby policzyc przy odbudowie.
 *
 * Dzis jest to jeden agregat: przeglad krajowy pomocy publicznej. SQL siedzi
 * w `src/lib/przeglad.ts`, wspolny dla importu i dla strony — inaczej dwie
 * kopie tych samych zapytan rozjechalyby sie przy pierwszej zmianie regul.
 */
export function policzAgregaty(db: DatabaseSync): { policzono: boolean; opis: string } {
  const czytnik: Czytnik = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };

  const przeglad = policzPrzeglad(czytnik, TERYT_WARSZAWY);
  if (!przeglad) {
    // Zaden dzien sie jeszcze nie ustalil — nie ma czego liczyc i nie jest
    // to blad. Stary agregat zostawiamy: mowi prawde o tym, co bylo.
    return { policzono: false, opis: 'brak dni ustalonych — przegladu nie licze' };
  }

  db.prepare(
    `insert into agregaty (klucz, podpis, wartosc, policzono) values (?, ?, ?, ?)
       on conflict(klucz) do update set podpis = excluded.podpis,
                                        wartosc = excluded.wartosc,
                                        policzono = excluded.policzono`,
  ).run(KLUCZ_PRZEGLADU, podpisDni(czytnik), JSON.stringify(przeglad), new Date().toISOString());

  return {
    policzono: true,
    opis: `przeglad krajowy: ${przeglad.dni} dni, ${przeglad.przypadkow} przypadkow`,
  };
}
