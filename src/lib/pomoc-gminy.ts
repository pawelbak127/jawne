import type { Czytnik } from './przeglad';
import { nazwaDoPokazania } from './prywatnosc';

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

/**
 * Ilu beneficjentow NIE wymieniamy z nazwy (zasada 7) — w dwoch wariantach,
 * bo prog kwotowy dziala tylko przy ustawionym JAWNE_KONTAKT, a o tym
 * rozstrzyga strona, nie import.
 */
export type Ukrytych = { bezProgu: number; zProgiem: number };
type NazwaBeneficjenta = { nazwa: string | null; max_eur: number | null; typ_regon: string | null };

/** Liczy po WSZYSTKICH beneficjentach — ta sama regula co na stronie firmy. */
export function policzUkrytych(nazwy: Iterable<NazwaBeneficjenta>): Ukrytych {
  const u: Ukrytych = { bezProgu: 0, zProgiem: 0 };
  for (const n of nazwy) dolozUkrytego(u, n);
  return u;
}

function dolozUkrytego(u: Ukrytych, n: NazwaBeneficjenta): void {
  const nazwa = n.nazwa ?? '';
  // Bez progu chowamy co najmniej tyle, co z progiem — drugie sprawdzenie tylko wtedy.
  if (!nazwaDoPokazania(nazwa, { pomocEur: n.max_eur, progAktywny: false, typRegon: n.typ_regon }).pominieta) return;
  u.bezProgu++;
  if (nazwaDoPokazania(nazwa, { pomocEur: n.max_eur, progAktywny: true, typRegon: n.typ_regon }).pominieta) u.zProgiem++;
}

export type PoliczonaPomocGminy = {
  razem: { przypadkow: number; beneficjentow: number; brutto: number | null; pierwszy: string; ostatni: string } | null;
  ukrytych: Ukrytych;
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
  const ukrytych = policzUkrytych(cz.wszystkie<NazwaBeneficjenta>(
    `select max(nazwa_beneficjenta) as nazwa, max(wartosc_brutto_eur) as max_eur,
            (select typ from regon where regon.nip = p.nip_beneficjenta) as typ_regon
       from ${zrodlo} p where teryt = ? group by nip_beneficjenta`, teryt,
  ));
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
    ukrytych,
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
  /*
   * Liczba beneficjentow, ilu z nich ukrywamy i czolowka — z PODSUMOWANIA
   * policzonego przy imporcie, gdy zgadza sie jego podpis ze stanem sum.
   * ZMIERZONE 14.10.2026 na serwerze: Warszawa ma 247 194 firm w stanie,
   * a strona wczytywala wszystkie, zeby policzyc ukrytych (205 002) —
   * 3,7 s przy zimnej pamieci podrecznej plus 0,9 s reguly jawnosci, przy
   * kazdym wejsciu. Przy rozjezdzie podpisu (import wlasnie dolozyl dni)
   * liczymy po staremu: wolniej, ale nigdy z innego zbioru niz reszta strony.
   */
  const pod = podsumowanieGminy(cz, teryt);
  const beneficjentow = pod?.beneficjentow ?? cz.jeden<{ c: number }>(
    `select count(*) as c from pomoc_sumy_gmin_firmy where teryt = ? and nip <> ''`, teryt,
  )?.c ?? 0;
  const razem = r?.przypadkow
    ? {
      przypadkow: r.przypadkow, beneficjentow, brutto: kwota(r.z_kwota ?? 0, r.brutto ?? 0),
      pierwszy: r.pierwszy!, ostatni: r.ostatni!,
    }
    : null;

  const ukrytych = pod?.ukrytych ?? policzUkrytych(cz.wszystkie<NazwaBeneficjenta>(
    `select f.nazwa as nazwa, f.max_eur as max_eur,
            (select typ from regon where regon.nip = f.nip) as typ_regon
       from pomoc_sumy_gmin_firmy f where f.teryt = ?`, teryt,
  ));

  const lata = cz.wszystkie<{ rok: string; przypadkow: number; z_kwota: number; brutto: number }>(
    'select rok, przypadkow, z_kwota, brutto from pomoc_sumy_gmin_lata where teryt = ? order by rok', teryt,
  ).map((w) => ({ rok: w.rok, przypadkow: w.przypadkow, brutto: kwota(w.z_kwota, w.brutto) }));

  const grupa = (wymiar: 'przeznaczenie' | 'udzielajacy'): Grupa[] => cz.wszystkie<
    { nazwa: string; przypadkow: number; z_kwota: number; brutto: number }>(
    `select klucz as nazwa, przypadkow, z_kwota, brutto from pomoc_sumy_gmin_wymiar
      where teryt = ? and wymiar = ?
      order by case when z_kwota > 0 then brutto end desc nulls last, klucz limit ${GRUP}`, teryt, wymiar,
  ).map((w) => ({ nazwa: w.nazwa, przypadkow: w.przypadkow, brutto: kwota(w.z_kwota, w.brutto) }));

  const czolowka = pod?.czolowka ?? cz.wszystkie<WierszCzolowki>(
    `select f.nazwa as nazwa, f.nip as nip, f.przypadkow as przypadkow, f.z_kwota as z_kwota, f.brutto as brutto,
            f.max_eur as max_eur, (select typ from regon where regon.nip = f.nip) as typ_regon
       from pomoc_sumy_gmin_firmy f where f.teryt = ?
      order by case when f.z_kwota > 0 then f.brutto end desc nulls last, nullif(f.nip, '') nulls first, f.nip
      limit ${BENEFICJENTOW}`, teryt,
  );
  const beneficjenci = czolowka.map((w) => ({
    // Bez `?? ''`: brak nazwy zostaje `null`, tak jak w liczeniu z tabeli.
    nazwa: w.nazwa as string, nip: w.nip === '' ? null : w.nip, przypadkow: w.przypadkow,
    brutto: kwota(w.z_kwota, w.brutto), max_eur: w.max_eur, typ_regon: w.typ_regon,
  }));

  return {
    razem, ukrytych, lata,
    przeznaczenia: grupa('przeznaczenie'), udzielajacy: grupa('udzielajacy'), beneficjenci,
  };
}

// ---------------------------------------------------------------------------
// Podsumowanie gminy liczone przy imporcie (ingest/lib/agregaty.ts)
// ---------------------------------------------------------------------------

/** Wiersz stanu `pomoc_sumy_gmin_firmy` z typem z REGON — czolowka i jej zapis. */
export type WierszCzolowki = {
  nazwa: string | null; nip: string; przypadkow: number; z_kwota: number; brutto: number;
  max_eur: number | null; typ_regon: string | null;
};

export type PodsumowanieGminy = { beneficjentow: number; ukrytych: Ukrytych; czolowka: WierszCzolowki[] };

/** Klucz w tabeli `agregaty`, pod ktorym lezy podpis stanu policzonych podsumowan. */
export const KLUCZ_PODSUMOWAN = 'podsumowania-gmin';

/**
 * Podpis tego, z czego licza sie podsumowania: dni policzone w stanie sum
 * (ze znacznikiem pobrania — dzien pobrany ponownie zmienia podpis) i chwila
 * ostatniego importu REGON (typ rozstrzyga o jawnosci nazwy, a zmienia go
 * tylko etap `regon`). Kod reguly jawnosci w podpisie nie siedzi —
 * podsumowania liczy sie od nowa przy kazdym wdrozeniu (migracje).
 *
 * Wolany przy KAZDYM wejsciu na strone gminy, wiec musi byc tani: pierwsza
 * wersja brala `max(pobrano) from regon` — przebieg po calej tabeli, 20 ms
 * lokalnie na kazde wejscie. Dziennik importu to jeden wiersz.
 */
export function podpisPodsumowan(cz: Czytnik): string {
  const d = cz.jeden<{ n: number; dzien: string | null; pobrano: string | null }>(
    'select count(*) as n, max(dzien) as dzien, max(pobrano) as pobrano from pomoc_sumy_dni',
  );
  let regon = '-';
  try {
    regon = cz.jeden<{ kiedy: string }>("select kiedy from import where co = 'regon'")?.kiedy ?? '-';
  } catch {
    // Baza bez dziennika importu — podpis bez tej czesci.
  }
  return `${d?.n ?? 0}:${d?.dzien ?? '-'}:${d?.pobrano ?? '-'}|${regon}`;
}

/** Podsumowanie z bazy albo `null`, gdy go nie ma albo jest z innego stanu. */
function podsumowanieGminy(cz: Czytnik, teryt: string): PodsumowanieGminy | null {
  try {
    const zapisany = cz.jeden<{ podpis: string }>('select podpis from agregaty where klucz = ?', KLUCZ_PODSUMOWAN);
    if (!zapisany || zapisany.podpis !== podpisPodsumowan(cz)) return null;
    const w = cz.jeden<{ beneficjentow: number; ukrytych: number; ukrytych_z_progiem: number; czolowka: string }>(
      'select beneficjentow, ukrytych, ukrytych_z_progiem, czolowka from pomoc_sumy_gmin_podsumowanie where teryt = ?', teryt,
    );
    // Gmina bez zadnej firmy w stanie nie ma wiersza — to zmierzone zero.
    if (!w) return { beneficjentow: 0, ukrytych: { bezProgu: 0, zProgiem: 0 }, czolowka: [] };
    return {
      beneficjentow: w.beneficjentow,
      ukrytych: { bezProgu: w.ukrytych, zProgiem: w.ukrytych_z_progiem },
      czolowka: JSON.parse(w.czolowka) as WierszCzolowki[],
    };
  } catch {
    // Baza sprzed tej zmiany (bez tabeli) — liczymy po staremu.
    return null;
  }
}

/** Kolejnosc czolowki — ta sama co `order by` w `pomocGminyZeSum`. */
export function porownajCzolowke(a: WierszCzolowki, b: WierszCzolowki): number {
  const x = a.z_kwota > 0 ? a.brutto : null;
  const y = b.z_kwota > 0 ? b.brutto : null;
  if (x !== y) {
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x;
  }
  if ((a.nip === '') !== (b.nip === '')) return a.nip === '' ? -1 : 1;
  return a.nip < b.nip ? -1 : a.nip > b.nip ? 1 : 0;
}

/**
 * Zbiera podsumowanie JEDNEJ gminy z jej wierszy stanu, podawanych po kolei.
 * Czolowke przycina na biezaco — Warszawa to 247 tys. wierszy.
 */
export function nowePodsumowanie() {
  const p: PodsumowanieGminy = { beneficjentow: 0, ukrytych: { bezProgu: 0, zProgiem: 0 }, czolowka: [] };
  return {
    doloz(w: WierszCzolowki): void {
      if (w.nip !== '') p.beneficjentow++;
      dolozUkrytego(p.ukrytych, w);
      p.czolowka.push(w);
      if (p.czolowka.length > BENEFICJENTOW * 4) p.czolowka = p.czolowka.sort(porownajCzolowke).slice(0, BENEFICJENTOW);
    },
    wynik(): PodsumowanieGminy {
      return { ...p, czolowka: p.czolowka.sort(porownajCzolowke).slice(0, BENEFICJENTOW) };
    },
  };
}
