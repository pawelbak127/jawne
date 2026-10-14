import type { DatabaseSync } from 'node:sqlite';
import {
  KLUCZ_FIRM_DO_MAPY, KLUCZ_MAPY_POMOCY, KLUCZ_PRZEGLADU, MAKS_ADRESOW_MAPY, podpisDni, type Czytnik,
} from '../../src/lib/przeglad.js';
import { nazwaPodmiotuJawna } from '../../src/lib/prywatnosc.js';
import { gminaOrganu, nazwaOrganu, rodzajOrganu, type GminaWykazu } from '../../src/lib/organy.js';
import {
  KLUCZ_PODSUMOWAN, nowePodsumowanie, podpisPodsumowan, type PodsumowanieGminy, type WierszCzolowki,
} from '../../src/lib/pomoc-gminy.js';
import { wTransakcji } from './baza.js';
import { odswiezTerytNabywcow } from './teryt-regon.js';
import { TERYT_WARSZAWY } from './fe.js';
import { firmyDoMapy, mapaZeSum, odswiezSumy, przegladZeSum } from './sumy-pomocy.js';

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
export function policzAgregaty(
  db: DatabaseSync, wymus = false, podsumowaniaOdNowa = false,
): { policzono: boolean; opis: string } {
  const czytnik: Czytnik = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };

  const sumy = odswiezSumy(db, wymus);
  const organow = przypiszOrganyGmin(db);
  const podsumowan = policzPodsumowaniaGmin(db, wymus || podsumowaniaOdNowa);
  // Kopia gminy zamawiajacego przy ogloszeniu TED — patrz odswiezTerytNabywcow.
  const nabywcow = bezTabeliTed(() => wTransakcji(db, () => odswiezTerytNabywcow(db)));
  /*
   * `delta(db)` juz tu nie ma, i to jest polowa naprawy OOM z 02.10.2026:
   * budowala w pamieci mapy firm i gmin z calej historii gmin pokazowych,
   * a sluzyla potem tylko do wiersza w dzienniku. Liczby do dziennika biora
   * sie teraz z dwoch tanich zapytan.
   */
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
  const firmy = firmyDoMapy(db, MAKS_ADRESOW_MAPY, nazwaPodmiotuJawna);
  zapisz(KLUCZ_FIRM_DO_MAPY, firmy);

  const przeglad = przegladZeSum(db, TERYT_WARSZAWY);
  if (!przeglad) {
    // Zaden dzien sie jeszcze nie ustalil — nie ma czego liczyc i nie jest
    // to blad. Stary agregat zostawiamy: mowi prawde o tym, co bylo.
    return {
      policzono: false,
      opis: `${sumy.opis}; organy gmin: ${organow}; podsumowania gmin: ${podsumowan}; TED: ${nabywcow} zmian gminy; mapa: ${mapa.length} gmin, ${firmy.length} firm;`
        + ' brak dni ustalonych — przegladu nie licze',
    };
  }

  zapisz(KLUCZ_PRZEGLADU, przeglad);

  return {
    policzono: true,
    opis: `${sumy.opis}; organy gmin: ${organow}; podsumowania gmin: ${podsumowan}; TED: ${nabywcow} zmian gminy; przeglad krajowy: ${przeglad.dni} dni, ${przeglad.przypadkow} przypadkow; `
      + `mapa: ${mapa.length} gmin, ${firmy.length} firm`,
  };
}

/**
 * Tabela `organy_gmin` od zera — jest mala (rzedu liczby gmin: 2 548 organow
 * gminnych na serwerze 14.10.2026) i liczona z gotowego stanu sum, nie
 * z tabeli pomocy.
 * Grupowanie po NIP-ie idzie indeksem `pomoc_sumy_organy_nip`.
 */
export function przypiszOrganyGmin(db: DatabaseSync): string {
  const gminy = new Map(
    (db.prepare('select teryt, nazwa, rodzaj, wojewodztwo from gminy').all() as unknown as GminaWykazu[])
      .map((g) => [g.teryt, g]),
  );
  const organy = db.prepare(
    `select o.nip as nip, o.nazwa as nazwa_sudop, r.nazwa as nazwa_regon, r.teryt as teryt
       from (select nip_organu as nip, max(nazwa) as nazwa from pomoc_sumy_organy group by nip_organu) o
       left join regon r on r.nip = o.nip`,
  ).all() as unknown as { nip: string; nazwa_sudop: string | null; nazwa_regon: string | null; teryt: string | null }[];

  let gminnych = 0;
  const przypisane: [string, string][] = [];
  for (const o of organy) {
    const nazwa = nazwaOrganu(o.nazwa_sudop, o.nazwa_regon);
    if (!rodzajOrganu(nazwa)) continue;
    gminnych++;
    const teryt = gminaOrganu(nazwa, o.teryt, gminy);
    if (teryt) przypisane.push([o.nip, teryt]);
  }
  wTransakcji(db, () => {
    db.exec('delete from organy_gmin');
    const wstaw = db.prepare('insert into organy_gmin (nip, teryt) values (?, ?)');
    for (const [nip, teryt] of przypisane) wstaw.run(nip, teryt);
  });
  return `${przypisane.length} z ${gminnych} przypisanych`;
}

/** Baza bez tabel TED (np. swieza, przed pierwszym importem zamowien) to nie blad. */
function bezTabeliTed(f: () => number): number {
  try {
    return f();
  } catch (e) {
    if (/no such (table|column)/.test(String(e))) return 0;
    throw e;
  }
}

/**
 * Podsumowania pomocy dla stron gmin (`pomoc_sumy_gmin_podsumowanie`).
 *
 * Liczone od zera, ale tylko wtedy, gdy zmienil sie podpis stanu (doszly
 * dni albo REGON) — albo na zadanie: migracje wymuszaja to przy kazdym
 * wdrozeniu, bo w podpisie nie ma kodu reguly jawnosci. ZMIERZONE
 * 14.10.2026 na serwerze: przebieg po 3 057 681 wierszach stanu to ok. 57 s.
 *
 * Czytamy STRUMIENIEM w kolejnosci klucza (teryt, nip), wiec w pamieci jest
 * jedna gmina naraz (pulapka 57), a zapis idzie jedna krotka transakcja na
 * koniec — dluga transakcja zapisu blokowalaby inne zadania (pulapka 72).
 */
export function policzPodsumowaniaGmin(db: DatabaseSync, odNowa: boolean): string {
  const czytnik = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };
  const podpis = podpisPodsumowan(czytnik);
  const zapisany = czytnik.jeden<{ podpis: string }>('select podpis from agregaty where klucz = ?', KLUCZ_PODSUMOWAN);
  if (!odNowa && zapisany?.podpis === podpis) return 'bez zmian';

  const typy = new Map(
    (db.prepare('select nip, typ from regon').all() as unknown as { nip: string; typ: string | null }[]).map((r) => [r.nip, r.typ]),
  );
  const wyniki: [string, PodsumowanieGminy][] = [];
  let teryt: string | null = null;
  let akum = nowePodsumowanie();
  const wiersze = db.prepare(
    'select teryt, nip, nazwa, przypadkow, z_kwota, brutto, max_eur from pomoc_sumy_gmin_firmy order by teryt, nip',
  ).iterate() as Iterable<Omit<WierszCzolowki, 'typ_regon'> & { teryt: string }>;
  for (const w of wiersze) {
    if (w.teryt !== teryt) {
      if (teryt !== null) wyniki.push([teryt, akum.wynik()]);
      teryt = w.teryt;
      akum = nowePodsumowanie();
    }
    akum.doloz({
      nazwa: w.nazwa, nip: w.nip, przypadkow: w.przypadkow, z_kwota: w.z_kwota, brutto: w.brutto,
      max_eur: w.max_eur, typ_regon: typy.get(w.nip) ?? null,
    });
  }
  if (teryt !== null) wyniki.push([teryt, akum.wynik()]);

  wTransakcji(db, () => {
    db.exec('delete from pomoc_sumy_gmin_podsumowanie');
    const wstaw = db.prepare(
      'insert into pomoc_sumy_gmin_podsumowanie (teryt, beneficjentow, ukrytych, ukrytych_z_progiem, czolowka) values (?, ?, ?, ?, ?)',
    );
    for (const [t, p] of wyniki) wstaw.run(t, p.beneficjentow, p.ukrytych.bezProgu, p.ukrytych.zProgiem, JSON.stringify(p.czolowka));
    db.prepare(
      `insert into agregaty (klucz, podpis, wartosc, policzono) values (?, ?, ?, ?)
         on conflict(klucz) do update set podpis = excluded.podpis, wartosc = excluded.wartosc, policzono = excluded.policzono`,
    ).run(KLUCZ_PODSUMOWAN, podpis, JSON.stringify({ gmin: wyniki.length }), new Date().toISOString());
  });
  return `${wyniki.length} gmin`;
}
