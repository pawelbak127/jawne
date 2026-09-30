/**
 * Przeglad krajowy pomocy publicznej — LICZONY RAZ, przy imporcie.
 *
 * ZMIERZONE 27.09.2026: ta jedna strona robila OSIEM osobnych przebiegow
 * po calej tabeli `pomoc_publiczna`. Filtr „dni ustalone" obejmuje 97%
 * wierszy, wiec indeks nic nie daje — plan zapytania to `SCAN` i tak ma byc.
 * Problem jest w tym, ze tabela rosnie:
 *
 *   168 tys. wierszy  ->  1,6 s na przebieg  ->  ~13 s na strone
 *   2,5 mln wierszy   ->  ~24 s              ->  ponad 3 min  (build padl)
 *   ~30 mln (pelna historia) -> ~5 min       ->  ~40 min
 *
 * Dlatego SQL zyje tutaj, a nie w `dane.ts`: te same zapytania uruchamia
 * import (i zapisuje wynik), a strona czyta gotowe liczby. Gdy w bazie nie
 * ma jeszcze zapisanego przegladu, `dane.ts` policzy go na miejscu — wolno,
 * ale poprawnie. Brak agregatu jest stanem, nie awaria (wzorzec 6).
 */

import type { WartoscNaMapie } from './mapa.js';

/** Minimum, jakiego potrzebuje ten modul od polaczenia z baza. */
export type Czytnik = {
  wszystkie<T>(sql: string, ...params: unknown[]): T[];
  jeden<T>(sql: string, ...params: unknown[]): T | null;
};

export type WierszPrzegladu = { nazwa: string; przypadkow: number; brutto: number | null };

export type PrzegladPomocy = {
  od: string;
  do: string;
  dni: number;
  /** Dni pobrane, ale jeszcze nieustalone — pominiete w sumach. */
  swiezych: number;
  przypadkow: number;
  beneficjentow: number;
  gmin: number;
  brutto: number | null;
  udzielajacy: WierszPrzegladu[];
  przeznaczenia: WierszPrzegladu[];
  formy: WierszPrzegladu[];
  wielkosc: (WierszPrzegladu & { kod: string | null })[];
  wojewodztwa: { wojewodztwo: string; przypadkow: number; brutto: number | null; osob: number | null }[];
  najwieksze: {
    nip: string | null; nazwa: string; max_eur: number | null; dzien: string; brutto: number | null;
    przeznaczenie: string | null; udzielajacy: string | null; teryt: string; gmina: string | null;
  }[];
};

/** Ile dni musi minac, zanim dzien uznamy za ustalony (publikacje w SUDOP). */
export const DNI_DO_USTALENIA = 14;

/** Dni pobrane dla calego kraju, ktore juz sie ustalily (SQL). */
export const DNI_USTALONE = `(select dzien from pomoc_publiczna_dni
  where julianday(coalesce(pobrano_dzien, substr(pobrano, 1, 10))) - julianday(dzien) >= ${DNI_DO_USTALENIA})`;

/** Klucze w tabeli `agregaty`. */
export const KLUCZ_PRZEGLADU = 'przeglad-krajowy';
export const KLUCZ_MAPY_POMOCY = 'mapa-pomoc';
export const KLUCZ_FIRM_DO_MAPY = 'mapa-firmy';

/**
 * Limit adresow w jednym pliku mapy strony (sitemap.xml) — z protokolu
 * sitemaps.org. Nie jest ozdoba: 28.09.2026 mapa liczyla 240 tysiecy adresow
 * i to ona, a nie pamiec maszyny, wywrocila budowe na serwerze.
 */
export const MAKS_ADRESOW_MAPY = 50_000;

/**
 * Odcisk zbioru dni, z ktorych liczymy sumy. Zmienia sie, gdy dojdzie dzien
 * albo gdy ktorys sie ustali — czyli dokladnie wtedy, gdy przeglad przestaje
 * byc aktualny. Sluzy do POKAZANIA, ze agregat jest za stary, nie do jego
 * odrzucenia: lepiej pokazac liczby sprzed nocy i napisac, kiedy policzone,
 * niz kazac czytelnikowi czekac trzy minuty.
 */
export function podpisDni(cz: Czytnik): string {
  const w = cz.jeden<{ dni: number; od: string | null; do: string | null }>(
    `select count(*) as dni, min(dzien) as od, max(dzien) as do from ${DNI_USTALONE}`,
  );
  return `${w?.dni ?? 0}:${w?.od ?? '-'}:${w?.do ?? '-'}`;
}

/** Liczy przeglad od zera. Kilka minut na duzej bazie — patrz naglowek. */
export function policzPrzeglad(cz: Czytnik, terytWarszawy: string): PrzegladPomocy | null {
  const zakres = cz.jeden<{ od: string | null; do: string | null; dni: number }>(
    `select min(dzien) as od, max(dzien) as do, count(*) as dni from ${DNI_USTALONE}`,
  );
  if (!zakres?.od || !zakres.do) return null;

  const swiezych = cz.jeden<{ c: number }>(
    `select count(*) as c from pomoc_publiczna_dni where dzien not in ${DNI_USTALONE}`,
  )?.c ?? 0;

  const Z = `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;
  const razem = cz.jeden<{ przypadkow: number; beneficjentow: number; gmin: number; brutto: number | null }>(
    `select count(*) as przypadkow, count(distinct nip_beneficjenta) as beneficjentow,
            count(distinct teryt) as gmin, sum(wartosc_brutto) as brutto from ${Z}`,
  )!;

  const grupa = (kolumna: string, ile: number) => cz.wszystkie<WierszPrzegladu>(
    `select ${kolumna} as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
       from ${Z} where ${kolumna} is not null group by ${kolumna} order by brutto desc nulls last limit ?`,
    ile,
  );

  const wielkosc = cz.wszystkie<WierszPrzegladu & { kod: string | null }>(
    `select wielkosc_kod as kod, max(wielkosc) as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
       from ${Z} group by wielkosc_kod order by wielkosc_kod`,
  );

  const wojewodztwa = cz.wszystkie<{ wojewodztwo: string; przypadkow: number; brutto: number | null; osob: number | null }>(
    `with p as (
       select case when z.teryt = '${terytWarszawy}' then 'mazowieckie' else g.wojewodztwo end as wojewodztwo,
              z.wartosc_brutto
         from ${Z} z left join gminy g on g.teryt = z.teryt
     ),
     l as (
       select g.wojewodztwo, sum(l.osob) as osob from gminy g join ludnosc l on l.teryt = g.teryt group by g.wojewodztwo
     )
     select p.wojewodztwo as wojewodztwo, count(*) as przypadkow, sum(p.wartosc_brutto) as brutto, l.osob as osob
       from p left join l on l.wojewodztwo = p.wojewodztwo
      where p.wojewodztwo is not null
      group by p.wojewodztwo order by p.wojewodztwo`,
  );

  const najwieksze = cz.wszystkie<PrzegladPomocy['najwieksze'][number]>(
    `select z.nip_beneficjenta as nip, z.nazwa_beneficjenta as nazwa, z.wartosc_brutto_eur as max_eur,
            z.dzien as dzien, z.wartosc_brutto as brutto, z.przeznaczenie as przeznaczenie,
            z.udzielajacy as udzielajacy, z.teryt as teryt,
            case when z.teryt = '${terytWarszawy}' then 'Warszawa' else g.nazwa end as gmina
       from ${Z} z left join gminy g on g.teryt = z.teryt
      order by z.wartosc_brutto desc nulls last limit 15`,
  );

  return {
    od: zakres.od,
    do: zakres.do,
    dni: zakres.dni,
    swiezych,
    ...razem,
    udzielajacy: grupa('udzielajacy', 12),
    przeznaczenia: grupa('przeznaczenie', 12),
    formy: grupa('forma', 8),
    wielkosc,
    wojewodztwa,
    najwieksze,
  };
}

/** Jedna gmina na mapie: ile pomocy na mieszkanca. Typ zyje w `mapa.ts`. */
export type { WartoscNaMapie } from './mapa.js';

/**
 * Mapa pomocy publicznej na mieszkanca.
 *
 * `/mapa` jest trasa DYNAMICZNA, wiec to zapytanie placi kazdy czytelnik,
 * a nie raz na godzine build. Zmierzone: 508 ms przy 168 tys. wierszy —
 * przy pelnej historii bylby to ponad minuta na wejscie. Dlatego takze ono
 * liczy sie raz, przy imporcie.
 *
 * Liczymy TYLKO z dni pobranych dla calego kraju: pelna historia gmin
 * pokazowych zawyzylaby je kilkudziesieciokrotnie (pulapka 35).
 */
export function policzMapePomocy(cz: Czytnik, terytWarszawy: string): WartoscNaMapie[] {
  const warszawa = cz.jeden<{ osob: number | null }>(
    "select sum(l.osob) as osob from gminy g join ludnosc l on l.teryt = g.teryt where g.rodzaj = 'dzielnica Warszawy'",
  )?.osob ?? 0;
  return cz.wszystkie<WartoscNaMapie>(
    `with ludzie as (
       select teryt, osob from ludnosc
       union all select '${terytWarszawy}', ${warszawa}
     )
     select p.teryt as teryt, sum(p.wartosc_brutto) * 1.0 / l.osob as wartosc
       from pomoc_publiczna p
       join ludzie l on l.teryt = p.teryt
       join pomoc_publiczna_dni d on d.dzien = p.dzien
      where l.osob > 0
      group by p.teryt, l.osob`,
  );
}

/** Firma w mapie strony: NIP i nazwa do sprawdzenia reguly jawnosci. */
export type FirmaDoMapy = { nip: string; nazwa: string };

/**
 * Beneficjenci do mapy strony — NAJWIEKSI, bo wszyscy sie nie miesza.
 *
 * ZMIERZONE 28.09.2026: pelna lista to ~230 tysiecy firm, a kazda z nich
 * przechodzila przy renderowaniu mapy przez `nazwaPodmiotuJawna()`.
 * Trzy proby po ponad 300 sekund i `next build` przerwal wdrozenie —
 * serwis stal przez to dobe. Liczymy to wiec raz, przy imporcie, i tylko
 * tylu, ilu zmiesci sie w limicie protokolu.
 *
 * Kolejnosc po wartosci pomocy nie jest ocena ani rankingiem — to wybor
 * TECHNICZNY, ktory adres podpowiedziec wyszukiwarce jako pierwszy.
 * Zadna strona firmy nie znika: wszystkie sa osiagalne ze stron gmin.
 */
export function policzFirmyDoMapy(cz: Czytnik, ile: number): FirmaDoMapy[] {
  return cz.wszystkie<FirmaDoMapy>(
    `select nip_beneficjenta as nip, max(nazwa_beneficjenta) as nazwa
       from pomoc_publiczna where nip_beneficjenta is not null
      group by nip_beneficjenta
      order by sum(wartosc_brutto) desc nulls last
      limit ?`,
    ile,
  );
}
