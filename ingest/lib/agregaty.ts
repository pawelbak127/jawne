import type { DatabaseSync } from 'node:sqlite';
import {
  KLUCZ_MAPY_POMOCY, KLUCZ_PRZEGLADU, podpisDni, policzMapePomocy, policzPrzeglad, type Czytnik,
} from '../../src/lib/przeglad.js';
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

  const podpis = podpisDni(czytnik);
  const zapisz = (klucz: string, wartosc: unknown) => db.prepare(
    `insert into agregaty (klucz, podpis, wartosc, policzono) values (?, ?, ?, ?)
       on conflict(klucz) do update set podpis = excluded.podpis,
                                        wartosc = excluded.wartosc,
                                        policzono = excluded.policzono`,
  ).run(klucz, podpis, JSON.stringify(wartosc), new Date().toISOString());

  // Mapa liczy sie z WSZYSTKICH dni pobranych dla kraju, nie tylko ustalonych,
  // wiec ma sens takze wtedy, gdy zaden dzien jeszcze sie nie ustalil.
  const mapa = policzMapePomocy(czytnik, TERYT_WARSZAWY);
  zapisz(KLUCZ_MAPY_POMOCY, mapa);

  const przeglad = policzPrzeglad(czytnik, TERYT_WARSZAWY);
  if (!przeglad) {
    // Zaden dzien sie jeszcze nie ustalil — nie ma czego liczyc i nie jest
    // to blad. Stary agregat zostawiamy: mowi prawde o tym, co bylo.
    return { policzono: false, opis: `mapa: ${mapa.length} gmin; brak dni ustalonych — przegladu nie licze` };
  }

  zapisz(KLUCZ_PRZEGLADU, przeglad);

  return {
    policzono: true,
    opis: `przeglad krajowy: ${przeglad.dni} dni, ${przeglad.przypadkow} przypadkow; mapa: ${mapa.length} gmin`,
  };
}
