import type { DatabaseSync } from 'node:sqlite';
import { nazwaPodmiotuJawna } from '../../src/lib/prywatnosc.js';
import {
  KLUCZ_FIRM_DO_MAPY, KLUCZ_MAPY_POMOCY, KLUCZ_PRZEGLADU, MAKS_ADRESOW_MAPY, podpisDni,
  policzFirmyDoMapy, policzMapePomocy, policzPrzeglad, type Czytnik,
} from '../../src/lib/przeglad.js';
import { TERYT_WARSZAWY } from './fe.js';

/**
 * Liczy gotowe wyniki, ktorych strona nie zdazylaby policzyc przy odbudowie.
 *
 * Dzis jest to jeden agregat: przeglad krajowy pomocy publicznej. SQL siedzi
 * w `src/lib/przeglad.ts`, wspolny dla importu i dla strony — inaczej dwie
 * kopie tych samych zapytan rozjechalyby sie przy pierwszej zmianie regul.
 */
export function policzAgregaty(db: DatabaseSync, wymus = false): { policzono: boolean; opis: string } {
  const czytnik: Czytnik = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };

  const podpis = podpisDni(czytnik);

  /*
   * Przeliczamy tylko wtedy, gdy zmienil sie zbior dni ustalonych.
   * ZMIERZONE 28.09.2026 na serwerze: pelne policzenie zajelo 676 sekund
   * (2,5 mln wierszy, maszyna 2 GB). Bez tego warunku KAZDE wdrozenie
   * dokladaloby jedenascie minut przestoju strony — a dane sie w tym czasie
   * nie zmienily. `--wymus` jest na wypadek zmiany samego SQL-a.
   */
  const juz = db.prepare('select podpis from agregaty where klucz = ?').get(KLUCZ_PRZEGLADU) as
    { podpis?: string } | undefined;
  if (!wymus && juz?.podpis === podpis) {
    return { policzono: false, opis: `bez zmian (${podpis}) — nie licze od nowa` };
  }

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

  /*
   * Firmy do mapy strony. Regule jawnosci sprawdzamy TUTAJ, a nie przy
   * renderowaniu: przy 230 tysiacach beneficjentow `nazwaPodmiotuJawna()`
   * liczyla sie ponad 300 sekund i wywracala `next build` (28.09.2026).
   * Bierzemy z zapasem, bo czesc odpadnie na regule, i tniemy do limitu.
   */
  const firmy = policzFirmyDoMapy(czytnik, MAKS_ADRESOW_MAPY * 2)
    .filter((f) => nazwaPodmiotuJawna(f.nazwa))
    .slice(0, MAKS_ADRESOW_MAPY)
    .map((f) => f.nip);
  zapisz(KLUCZ_FIRM_DO_MAPY, firmy);

  const przeglad = policzPrzeglad(czytnik, TERYT_WARSZAWY);
  if (!przeglad) {
    // Zaden dzien sie jeszcze nie ustalil — nie ma czego liczyc i nie jest
    // to blad. Stary agregat zostawiamy: mowi prawde o tym, co bylo.
    return {
      policzono: false,
      opis: `mapa: ${mapa.length} gmin, ${firmy.length} firm; brak dni ustalonych — przegladu nie licze`,
    };
  }

  zapisz(KLUCZ_PRZEGLADU, przeglad);

  return {
    policzono: true,
    opis: `przeglad krajowy: ${przeglad.dni} dni, ${przeglad.przypadkow} przypadkow; `
      + `mapa: ${mapa.length} gmin, ${firmy.length} firm`,
  };
}
