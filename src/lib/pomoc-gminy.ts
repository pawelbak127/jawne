import type { Czytnik } from './przeglad';

/**
 * Pomoc publiczna w jednej gminie — liczona na dwa sposoby, ktore musza dac
 * to samo (wzorzec 7).
 *
 * DLACZEGO DWA. ZMIERZONE 04.10.2026 na serwerze: strona Krakowa czytala
 * z dysku 2,5 GB i przez ponad dwie minuty blokowala CALY serwis — takze
 * strony statyczne, bo `node:sqlite` jest synchroniczny i jedno zapytanie
 * zatrzymuje proces. Krakow mial 191 910 wierszy pomocy, rozsianych po pliku
 * 5,6 GB (wiersze zapisuja sie dzien po dniu, wiec wiersze jednej gminy leza
 * w tysiacach miejsc), a strona robila po nich osiem osobnych przebiegow.
 * Lokalnie ten sam Krakow mial 2 485 wierszy i 6 ms — nikt by tego nie
 * zauwazyl (pulapka 67). Z kazda noca historii bylo gorzej.
 *
 * Dlatego tryb „dni ustalone" czyta teraz STAN sum przyrostowych
 * (`pomocGminyZeSum`), liczony przy imporcie dzien po dniu. Liczenie z tabeli
 * zrodlowej (`policzPomocGminy`) zostaje: dla gmin pokazowych z pelna
 * historia (tych dni nie ma w stanie — pulapka 35) i jako druga droga
 * w tescie i w `sudo jawne sumy`.
 */

export type Grupa = { nazwa: string; przypadkow: number; brutto: number | null };

export type PoliczonaPomocGminy = {
  razem: { przypadkow: number; beneficjentow: number; brutto: number | null; pierwszy: string; ostatni: string } | null;
  nazwyBeneficjentow: { nazwa: string; max_eur: number | null; typ_regon: string | null }[];
  lata: { rok: string; przypadkow: number; brutto: number | null }[];
  przeznaczenia: Grupa[];
  udzielajacy: Grupa[];
  beneficjenci: {
    nazwa: string; nip: string | null; przypadkow: number; brutto: number | null;
    max_eur: number | null; typ_regon: string | null;
  }[];
};

/** Ile pozycji w „na co" i „kto udzielil". */
export const GRUP = 6;
/** Beneficjentow bierzemy szerzej niz pokazujemy — filtr nazw dziala dopiero w widoku. */
export const BENEFICJENTOW = 60;
/** Etykieta grupy, gdy rejestr nie podal wartosci. */
export const BRAK_W_REJESTRZE = '(brak w rejestrze)';

/** Suma jak w SQL-u: brak kwot to `null`, a nie zmierzone zero (regula 4). */
const kwota = (zKwota: number, brutto: number): number | null => (zKwota > 0 ? brutto : null);

/**
 * Z tabeli zrodlowej. `zrodlo` to tabela albo podkwerenda wierszy, ktore
 * wchodza do liczenia (cala tabela dla gminy pobranej w calosci, dni
 * ustalone — dla reszty).
 */
export function policzPomocGminy(cz: Czytnik, zrodlo: string, teryt: string): PoliczonaPomocGminy {
  const razem = cz.jeden<NonNullable<PoliczonaPomocGminy['razem']>>(
    `select count(*) as przypadkow, count(distinct nip_beneficjenta) as beneficjentow, sum(wartosc_brutto) as brutto,
            min(dzien) as pierwszy, max(dzien) as ostatni
       from ${zrodlo} where teryt = ?`, teryt,
  );
  // Ta sama regula co przy `beneficjenci` — rejestr, nie heurystyka.
  const nazwyBeneficjentow = cz.wszystkie<{ nazwa: string | null; max_eur: number | null; typ_regon: string | null }>(
    `select max(nazwa_beneficjenta) as nazwa, max(wartosc_brutto_eur) as max_eur,
            (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon
       from ${zrodlo} p where teryt = ? group by nip_beneficjenta`, teryt,
  ).map((r) => ({ nazwa: r.nazwa ?? '', max_eur: r.max_eur, typ_regon: r.typ_regon }));
  const lata = cz.wszystkie<PoliczonaPomocGminy['lata'][number]>(
    `select substr(dzien, 1, 4) as rok, count(*) as przypadkow, sum(wartosc_brutto) as brutto
       from ${zrodlo} where teryt = ? group by rok order by rok`, teryt,
  );
  const grupa = (kolumna: 'przeznaczenie' | 'udzielajacy') => cz.wszystkie<Grupa>(
    `select coalesce(${kolumna}, '${BRAK_W_REJESTRZE}') as nazwa, count(*) as przypadkow, sum(wartosc_brutto) as brutto
       from ${zrodlo} where teryt = ? group by coalesce(${kolumna}, '${BRAK_W_REJESTRZE}')
      order by brutto desc nulls last, nazwa limit ${GRUP}`, teryt,
  );
  /*
   * `typ_regon` jest tu OBOWIAZKOWY, nie ozdobny. Od 24.09.2026 o jawnosci
   * nazwy rozstrzyga rejestr, nie heurystyka — ale decyzja weszla tylko
   * na strone firmy i do wyszukiwarki. ZMIERZONE 01.10.2026 na 93 287
   * nazwach: bez tego strona gminy pokazywala 48 nazw, ktore `/firma`
   * chowa, i chowala 350, ktore `/firma` pokazuje.
   */
  const beneficjenci = cz.wszystkie<PoliczonaPomocGminy['beneficjenci'][number]>(
    `select max(nazwa_beneficjenta) as nazwa, nip_beneficjenta as nip, count(*) as przypadkow, sum(wartosc_brutto) as brutto,
            max(wartosc_brutto_eur) as max_eur,
            (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon
       from ${zrodlo} p where teryt = ? group by nip_beneficjenta
      order by brutto desc nulls last, nip limit ${BENEFICJENTOW}`, teryt,
  );
  return {
    // Zero przypadkow w gminie pobranej w calosci to ZMIERZONE zero — zostaje
    // liczba, nie `null` (regula 4).
    razem,
    nazwyBeneficjentow,
    lata,
    przeznaczenia: grupa('przeznaczenie'),
    udzielajacy: grupa('udzielajacy'),
    beneficjenci,
  };
}

/**
 * Ze stanu sum przyrostowych — wylacznie dni USTALONE, policzone przy
 * imporcie (`ingest/lib/sumy-pomocy.ts`). Kazde zapytanie czyta wiersze
 * jednej gminy lezace obok siebie (klucz glowny zaczyna sie od TERYT-u),
 * a nie wiersze rozsiane po calej tabeli pomocy.
 *
 * W stanie wiersze bez NIP-u leza pod `nip = ''` — tak jak w SQL-u, gdzie
 * `group by nip_beneficjenta` sklada je w jedna grupe z NULL-em.
 */
export function pomocGminyZeSum(cz: Czytnik, teryt: string): PoliczonaPomocGminy {
  const r = cz.jeden<{ przypadkow: number | null; z_kwota: number | null; brutto: number | null; pierwszy: string | null; ostatni: string | null }>(
    `select sum(przypadkow) as przypadkow, sum(z_kwota) as z_kwota, sum(brutto) as brutto,
            min(pierwszy) as pierwszy, max(ostatni) as ostatni
       from pomoc_sumy_gmin_lata where teryt = ?`, teryt,
  );
  const beneficjentow = cz.jeden<{ c: number }>(
    `select count(*) as c from pomoc_sumy_gmin_firmy where teryt = ? and nip <> ''`, teryt,
  )?.c ?? 0;
  const razem = r?.przypadkow
    ? {
      przypadkow: r.przypadkow, beneficjentow, brutto: kwota(r.z_kwota ?? 0, r.brutto ?? 0),
      pierwszy: r.pierwszy!, ostatni: r.ostatni!,
    }
    : null;

  const nazwyBeneficjentow = cz.wszystkie<{ nazwa: string | null; max_eur: number | null; typ_regon: string | null }>(
    `select f.nazwa as nazwa, f.max_eur as max_eur,
            (select typ from regon where regon.nip = f.nip) as typ_regon
       from pomoc_sumy_gmin_firmy f where f.teryt = ?`, teryt,
  ).map((w) => ({ nazwa: w.nazwa ?? '', max_eur: w.max_eur, typ_regon: w.typ_regon }));

  const lata = cz.wszystkie<{ rok: string; przypadkow: number; z_kwota: number; brutto: number }>(
    'select rok, przypadkow, z_kwota, brutto from pomoc_sumy_gmin_lata where teryt = ? order by rok', teryt,
  ).map((w) => ({ rok: w.rok, przypadkow: w.przypadkow, brutto: kwota(w.z_kwota, w.brutto) }));

  const grupa = (wymiar: 'przeznaczenie' | 'udzielajacy'): Grupa[] => cz.wszystkie<
    { nazwa: string; przypadkow: number; z_kwota: number; brutto: number }>(
    `select klucz as nazwa, przypadkow, z_kwota, brutto from pomoc_sumy_gmin_wymiar
      where teryt = ? and wymiar = ?
      order by case when z_kwota > 0 then brutto end desc nulls last, klucz limit ${GRUP}`, teryt, wymiar,
  ).map((w) => ({ nazwa: w.nazwa, przypadkow: w.przypadkow, brutto: kwota(w.z_kwota, w.brutto) }));

  const beneficjenci = cz.wszystkie<{
    nazwa: string; nip: string; przypadkow: number; z_kwota: number; brutto: number;
    max_eur: number | null; typ_regon: string | null;
  }>(
    `select f.nazwa as nazwa, f.nip as nip, f.przypadkow as przypadkow, f.z_kwota as z_kwota, f.brutto as brutto,
            f.max_eur as max_eur, (select typ from regon where regon.nip = f.nip) as typ_regon
       from pomoc_sumy_gmin_firmy f where f.teryt = ?
      order by case when f.z_kwota > 0 then f.brutto end desc nulls last, nullif(f.nip, '') nulls first
      limit ${BENEFICJENTOW}`, teryt,
  ).map((w) => ({
    nazwa: w.nazwa, nip: w.nip === '' ? null : w.nip, przypadkow: w.przypadkow,
    brutto: kwota(w.z_kwota, w.brutto), max_eur: w.max_eur, typ_regon: w.typ_regon,
  }));

  return {
    razem, nazwyBeneficjentow, lata,
    przeznaczenia: grupa('przeznaczenie'), udzielajacy: grupa('udzielajacy'), beneficjenci,
  };
}
