import type { DatabaseSync } from 'node:sqlite';
import { wTransakcji } from './baza.js';
import type { PrzegladPomocy, WierszPrzegladu } from '../../src/lib/przeglad.js';
import {
  DNI_USTALONE, policzMapePomocy as mapaOdZera, policzPrzeglad as przegladOdZera,
} from '../../src/lib/przeglad.js';
import type { WartoscNaMapie } from '../../src/lib/mapa.js';
import { formaZnana, kategoriaFormy, type KategoriaPomocy } from '../../src/lib/formy-pomocy.js';
import { BRAK_W_REJESTRZE } from '../../src/lib/pomoc-gminy.js';

/**
 * Sumy pomocy publicznej liczone PRZYROSTOWO — dzien po dniu, raz na zawsze.
 *
 * DLACZEGO. Przeglad krajowy, mapa i lista firm liczyly sie od zera przy
 * kazdym przebiegu SUDOP, a ten konczy sie mniej wiecej raz na dobe.
 * ZMIERZONE: 11 minut przy 2,5 mln wierszy (28.09.2026), **29 minut przy
 * 3,78 mln** (29.09.2026) — czyli gorzej niz liniowo, bo maszyna ma 2 GB
 * i baza przestaje sie miescic w pamieci podrecznej. Pelne okno rejestru to
 * ~30 mln wierszy, czyli kilka godzin na jednym rdzeniu, ktory w tym samym
 * czasie obsluguje strone.
 *
 * NA CZYM STOI. Dzien SUDOP „ustala sie" 14 dni po dacie zdarzenia i od tej
 * chwili **juz sie nie zmienia** (pulapka 37) — a dzien uznajemy za ustalony
 * dopiero wtedy, gdy zostal POBRANY co najmniej 14 dni po sobie. Dzien
 * pobrany za wczesnie nie jest ustalony i czeka na odswiezenie, wiec do sum
 * wchodzi wylacznie material, ktory sie juz nie rusza. Stan jest przez to
 * DOPISYWANY, nigdy odejmowany — a to jedyna postac, w ktorej suma
 * przyrostowa nie potrafi po cichu rozjechac sie ze zrodlem.
 *
 * CZEGO STAN NIE OBEJMUJE (i dlatego czytamy to na zywo przy kazdym uzyciu):
 *  - dni pobrane, ale jeszcze nieustalone — najwyzej kilkanascie dni,
 *  - wiersze gmin pokazowych, ktorych dzien w ogole nie jest dniem
 *    pobranym dla kraju (pelna 10-letnia historia trzech gmin, pulapka 35).
 * Oba zbiory sa male i STALE — nie rosna razem z historia.
 *
 * KONTROLA. `pomoc_sumy_dni` pamieta, kiedy dzien zostal pobrany. Gdy
 * ktorykolwiek policzony dzien ma w rejestrze inny znacznik pobrania (albo
 * przestal byc ustalony), stan jest budowany od zera — bez pytania i bez
 * cichego poprawiania. `--sprawdz` w `agregaty.ts` liczy dodatkowo obie
 * drogi i porownuje wynik.
 */

/**
 * Jedna nazwa na NIP, wybrana tak samo jak w SQL-owej wersji: `max()`.
 * Rejestr potrafi podac dla tego samego NIP-u dwa zapisy nazwy, a od nazwy
 * zalezy regula jawnosci — wybor „ta, ktora akurat przyszla pierwsza" dawalby
 * wynik zalezny od kolejnosci importu.
 */
const wieksza = (a: string | null, b: string | null): string | null => {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
};

/**
 * Wersja ZAKRESU stanu. Podnosimy ja, gdy stan zaczyna obejmowac cos nowego —
 * wtedy stary stan nie ma tych danych dla dni juz policzonych i trzeba go
 * zbudowac od zera (`odswiezSumy` robi to sam, bez flagi).
 *  1 — przeglad krajowy, mapa, firmy, organy (30.09.2026),
 *  2 — pomoc w gminie: lata, beneficjenci, grupy (04.10.2026, strona gminy).
 */
export const WERSJA_SUM = 2;

/** Jak `wieksza`, dla liczb: max() z SQL-a, ktory pomija NULL. */
const wiekszaLiczba = (a: number | null, b: number | null): number | null => {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
};

/** Ile najwiekszych przypadkow trzymamy w stanie; strona pokazuje 15. */
const NAJWIEKSZYCH = 50;

/** Wymiary liczone w `pomoc_sumy_wymiar`. Wojewodztwa skladamy z gmin. */
type Wymiar = 'udzielajacy' | 'przeznaczenie' | 'forma' | 'wielkosc';

type WierszPomocy = {
  teryt: string;
  dzien: string;
  nip_beneficjenta: string | null;
  nazwa_beneficjenta: string | null;
  nip_udzielajacego: string | null;
  forma_kod: string | null;
  wielkosc_kod: string | null;
  wielkosc: string | null;
  udzielajacy: string | null;
  przeznaczenie: string | null;
  forma: string | null;
  wartosc_brutto: number | null;
  wartosc_brutto_eur: number | null;
};

/** Wklad jednego dnia — wszystko, co z niego zapamietujemy. */
type Kubelek = { przypadkow: number; zKwota: number; brutto: number };

type Wklad = {
  przypadkow: number;
  zKwota: number;
  brutto: number;
  gminy: Map<string, Kubelek>;
  firmy: Map<string, Kubelek & { nazwa: string | null }>;
  wymiary: Map<string, Kubelek & { wymiar: Wymiar; klucz: string; nazwa: string | null }>;
  /** Kto podjal decyzje: klucz `teryt|nip organu|kategoria formy`. */
  organy: Map<string, Kubelek & { teryt: string; nip: string; kategoria: KategoriaPomocy; nazwa: string | null }>;
  /** Beneficjent w gminie: klucz `teryt NUL nip` (pusty NIP = wiersze bez NIP-u). */
  gminyFirmy: Map<string, Kubelek & { teryt: string; nip: string; nazwa: string | null; maxEur: number | null }>;
  /** Grupa w gminie: klucz `teryt NUL wymiar NUL klucz`. */
  gminyWymiar: Map<string, Kubelek & { teryt: string; wymiar: 'przeznaczenie' | 'udzielajacy'; klucz: string }>;
};

const pustyWklad = (): Wklad => ({
  przypadkow: 0,
  zKwota: 0,
  brutto: 0,
  gminy: new Map(),
  firmy: new Map(),
  wymiary: new Map(),
  organy: new Map(),
  gminyFirmy: new Map(),
  gminyWymiar: new Map(),
});

/** Kody form, ktorych nie znamy — zbierane, zeby import mogl je ZGLOSIC. */
export const nieznaneFormy = new Set<string>();

/*
 * Kto PODJAL decyzje. Klucz to NIP organu, nie nazwa: ZMIERZONE 01.10.2026 —
 * 33 NIP-y maja po 2-3 warianty nazwy w rejestrze („MARSZALEK LODZKI",
 * „Marszalek Lodzki", „Marszalek Wojewodztwa Lodzkiego"), wiec grupowanie po
 * nazwie rozsypaloby jeden organ na trzy wiersze.
 *
 * Kategoria formy wchodzi do klucza, bo dotacji NIE WOLNO zsumowac
 * z umorzeniem: jedno jest wydatkiem budzetu, drugie dochodem, ktorego nie
 * pobrano, a trzecie (raty) to tylko korzysc z odsetek. Patrz
 * `src/lib/formy-pomocy.ts`.
 */
function dolozOrgan(w: Wklad, r: WierszPomocy): void {
  if (!r.nip_udzielajacego) return;
  if (r.forma_kod && !formaZnana(r.forma_kod)) nieznaneFormy.add(r.forma_kod);
  const kategoria = kategoriaFormy(r.forma_kod);
  const klucz = `${r.teryt}|${r.nip_udzielajacego}|${kategoria}`;
  const ma = r.wartosc_brutto === null ? 0 : 1;
  const ile = r.wartosc_brutto ?? 0;
  const o = w.organy.get(klucz);
  if (o) {
    o.przypadkow += 1;
    o.zKwota += ma;
    o.brutto += ile;
    o.nazwa = wieksza(o.nazwa, r.udzielajacy);
  } else {
    w.organy.set(klucz, {
      teryt: r.teryt, nip: r.nip_udzielajacego, kategoria, nazwa: r.udzielajacy,
      przypadkow: 1, zKwota: ma, brutto: ile,
    });
  }
}

function dolozWiersz(w: Wklad, r: WierszPomocy): void {
  dolozOrgan(w, r);
  // `null` to nie zero (regula 4): kwoty NIE ma, wiec nie dokladamy jej
  // do sumy, ale liczymy przypadek. `zKwota` mowi potem, czy suma w ogole
  // z czegos powstala.
  const kwota = r.wartosc_brutto;
  const ma = kwota === null ? 0 : 1;
  const ile = kwota ?? 0;
  w.przypadkow += 1;
  w.zKwota += ma;
  w.brutto += ile;

  const g = w.gminy.get(r.teryt);
  if (g) { g.przypadkow += 1; g.zKwota += ma; g.brutto += ile; }
  else w.gminy.set(r.teryt, { przypadkow: 1, zKwota: ma, brutto: ile });

  if (r.nip_beneficjenta) {
    const f = w.firmy.get(r.nip_beneficjenta);
    if (f) { f.przypadkow += 1; f.zKwota += ma; f.brutto += ile; f.nazwa = wieksza(f.nazwa, r.nazwa_beneficjenta); }
    else w.firmy.set(r.nip_beneficjenta, { nazwa: r.nazwa_beneficjenta, przypadkow: 1, zKwota: ma, brutto: ile });
  }

  // Wielkosc ma osobny kod i nazwe; pozostale wymiary to sam tekst rejestru.
  const pary: [Wymiar, string | null, string | null][] = [
    ['udzielajacy', r.udzielajacy, r.udzielajacy],
    ['przeznaczenie', r.przeznaczenie, r.przeznaczenie],
    ['forma', r.forma, r.forma],
    ['wielkosc', r.wielkosc_kod ?? '(brak)', r.wielkosc],
  ];
  for (const [wymiar, klucz, nazwa] of pary) {
    if (klucz === null) continue;
    const k = `${wymiar}\u0000${klucz}`;
    const p = w.wymiary.get(k);
    if (p) { p.przypadkow += 1; p.zKwota += ma; p.brutto += ile; if (!p.nazwa) p.nazwa = nazwa; }
    else w.wymiary.set(k, { wymiar, klucz, nazwa, przypadkow: 1, zKwota: ma, brutto: ile });
  }

  /*
   * Pomoc w gminie — dla strony gminy (WERSJA_SUM 2). Te same reguly co
   * w SQL-u `policzPomocGminy`: wiersz bez NIP-u to jedna grupa, wartosc
   * bez wpisu w rejestrze to „(brak w rejestrze)”, max() pomija NULL.
   */
  const nip = r.nip_beneficjenta ?? '';
  const kf = `${r.teryt}\u0000${nip}`;
  const gf = w.gminyFirmy.get(kf);
  if (gf) {
    gf.przypadkow += 1; gf.zKwota += ma; gf.brutto += ile;
    gf.nazwa = wieksza(gf.nazwa, r.nazwa_beneficjenta);
    gf.maxEur = wiekszaLiczba(gf.maxEur, r.wartosc_brutto_eur);
  } else {
    w.gminyFirmy.set(kf, {
      teryt: r.teryt, nip, nazwa: r.nazwa_beneficjenta, maxEur: r.wartosc_brutto_eur,
      przypadkow: 1, zKwota: ma, brutto: ile,
    });
  }
  for (const [wymiar, wartosc] of [['przeznaczenie', r.przeznaczenie], ['udzielajacy', r.udzielajacy]] as const) {
    const klucz = wartosc ?? BRAK_W_REJESTRZE;
    const kw = `${r.teryt}\u0000${wymiar}\u0000${klucz}`;
    const gw = w.gminyWymiar.get(kw);
    if (gw) { gw.przypadkow += 1; gw.zKwota += ma; gw.brutto += ile; }
    else w.gminyWymiar.set(kw, { teryt: r.teryt, wymiar, klucz, przypadkow: 1, zKwota: ma, brutto: ile });
  }

}

function przytnijNaj(wiersze: WierszPomocy[]): WierszPomocy[] {
  return [...wiersze]
    .sort((a, b) => (b.wartosc_brutto ?? -Infinity) - (a.wartosc_brutto ?? -Infinity))
    .slice(0, NAJWIEKSZYCH);
}

/*
 * Najwieksze: wystarczy trzymac czolowke KAZDEGO dnia — przypadek, ktory
 * jest w pierwszej pietnastce kraju, jest tym bardziej w pierwszej
 * piecdziesiatce swojego dnia. Przycinamy NA BIEZACO, nie na koncu dnia:
 * do 05.10.2026 tablica trzymala kazdy wiersz dnia (846 670 obiektow
 * 17.12.2024). Sortowanie jest stabilne, wiec wynik jest ten sam co przy
 * jednym przycieciu na koncu.
 */
function dolozNaj(naj: WierszPomocy[], r: WierszPomocy): WierszPomocy[] {
  naj.push(r);
  return naj.length >= 4 * NAJWIEKSZYCH ? przytnijNaj(naj) : naj;
}

const KOLUMNY = `teryt, dzien, nip_beneficjenta, nazwa_beneficjenta, nip_udzielajacego,
  forma_kod, wielkosc_kod, wielkosc, udzielajacy, przeznaczenie, forma,
  wartosc_brutto, wartosc_brutto_eur`;

/**
 * Ile wierszy dnia zbieramy w pamieci, zanim dopiszemy je do stanu.
 *
 * ZMIERZONE 05.10.2026 na serwerze: dzien 17.12.2024 ma **846 670
 * przypadkow i 844 179 roznych par gmina–firma**. Wklad calego dnia naraz
 * (mapy firm, par gmina–firma i czolowka ze wszystkimi wierszami) przekroczyl
 * sterte — w migracjach przy wdrozeniu (1 400 MB) i w zadaniu historii
 * (domyslna sterta). Stan stanal na 2024-12-16 i ani wdrozenie, ani zadanie
 * nocne nie umialo go przeskoczyc. Lokalnie najwiekszy dzien ma ok. 20 tys.
 * wierszy, wiec test tego nie widzial.
 *
 * Zapisy do stanu tylko DODAJA (upsert z sumowaniem, max bez NULL-i), wiec
 * dzien moze wejsc kilkoma porcjami — w JEDNEJ transakcji, zeby stan nadal
 * nigdy nie mial polowy dnia.
 */
export const PORCJA_DNIA = 20_000;

/*
 * max(a, b) z DWOMA argumentami jest w SQLite funkcja skalarna i oddaje NULL,
 * gdy ktorykolwiek argument jest NULL-em — inaczej niz agregat max(), ktory
 * NULL-e pomija. Do 04.10.2026 upsert nazwy firmy mial wlasnie max(a, b):
 * jeden dzien z pusta nazwa kasowal nazwe zebrana z poprzednich dni, a druga
 * droga (agregat) podawala nazwe. Od nazwy zalezy regula jawnosci.
 */
const MAKS_BEZ_NULL = (a: string, b: string) => `max(coalesce(${a}, ${b}), coalesce(${b}, ${a}))`;

/**
 * Liczy dzien i dopisuje go do stanu. Jedna transakcja na dzien, w srodku
 * porcje po PORCJA_DNIA wierszy — pamiec nie zalezy od wielkosci dnia.
 */
function policzDzien(db: DatabaseSync, dzien: string, pobrano: string): void {
  const zapisz = zapisWkladu(db, dzien);
  wTransakcji(db, () => {
    const razem = { przypadkow: 0, zKwota: 0, brutto: 0 };
    let w = pustyWklad();
    let naj: WierszPomocy[] = [];
    let wPorcji = 0;
    const zrzuc = () => {
      zapisz.wklad(w);
      razem.przypadkow += w.przypadkow;
      razem.zKwota += w.zKwota;
      razem.brutto += w.brutto;
      w = pustyWklad();
      wPorcji = 0;
    };
    for (const r of db.prepare(`select ${KOLUMNY} from pomoc_publiczna where dzien = ?`)
      .iterate(dzien) as unknown as Iterable<WierszPomocy>) {
      dolozWiersz(w, r);
      naj = dolozNaj(naj, r);
      if (++wPorcji >= PORCJA_DNIA) zrzuc();
    }
    zrzuc();
    zapisz.naj(przytnijNaj(naj));
    db.prepare(
      'insert or replace into pomoc_sumy_dni (dzien, pobrano, przypadkow, z_kwota, brutto) values (?, ?, ?, ?, ?)',
    ).run(dzien, pobrano, razem.przypadkow, razem.zKwota, razem.brutto);
  });
}

/** Przygotowane zapisy do stanu dla jednego dnia (bez wlasnej transakcji). */
function zapisWkladu(db: DatabaseSync, dzien: string) {
  const gmina = db.prepare(
    `insert into pomoc_sumy_gmin (teryt, przypadkow, z_kwota, brutto) values (?, ?, ?, ?)
       on conflict(teryt) do update set przypadkow = przypadkow + excluded.przypadkow,
                                        z_kwota = z_kwota + excluded.z_kwota,
                                        brutto = brutto + excluded.brutto`,
  );
  const firma = db.prepare(
    `insert into pomoc_sumy_firm (nip, nazwa, przypadkow, z_kwota, brutto) values (?, ?, ?, ?, ?)
       on conflict(nip) do update set nazwa = ${MAKS_BEZ_NULL('pomoc_sumy_firm.nazwa', 'excluded.nazwa')},
                                      przypadkow = przypadkow + excluded.przypadkow,
                                      z_kwota = z_kwota + excluded.z_kwota,
                                      brutto = brutto + excluded.brutto`,
  );
  const wymiar = db.prepare(
    `insert into pomoc_sumy_wymiar (wymiar, klucz, nazwa, przypadkow, z_kwota, brutto)
     values (?, ?, ?, ?, ?, ?)
       on conflict(wymiar, klucz) do update set nazwa = coalesce(pomoc_sumy_wymiar.nazwa, excluded.nazwa),
                                                przypadkow = przypadkow + excluded.przypadkow,
                                                z_kwota = z_kwota + excluded.z_kwota,
                                                brutto = brutto + excluded.brutto`,
  );
  const organ = db.prepare(
    `insert into pomoc_sumy_organy (teryt, nip_organu, kategoria, nazwa, przypadkow, z_kwota, brutto)
     values (?, ?, ?, ?, ?, ?, ?)
       on conflict(teryt, nip_organu, kategoria) do update set
         nazwa = ${MAKS_BEZ_NULL('pomoc_sumy_organy.nazwa', 'excluded.nazwa')},
         przypadkow = przypadkow + excluded.przypadkow,
         z_kwota = z_kwota + excluded.z_kwota,
         brutto = brutto + excluded.brutto`,
  );
  const naj = db.prepare(
    `insert into pomoc_sumy_naj (dzien, teryt, nip, nazwa, brutto, max_eur, przeznaczenie, udzielajacy)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const gminaRok = db.prepare(
    `insert into pomoc_sumy_gmin_lata (teryt, rok, przypadkow, z_kwota, brutto, pierwszy, ostatni)
     values (?, ?, ?, ?, ?, ?, ?)
       on conflict(teryt, rok) do update set przypadkow = przypadkow + excluded.przypadkow,
                                             z_kwota = z_kwota + excluded.z_kwota,
                                             brutto = brutto + excluded.brutto,
                                             pierwszy = min(pierwszy, excluded.pierwszy),
                                             ostatni = max(ostatni, excluded.ostatni)`,
  );
  const gminaFirma = db.prepare(
    `insert into pomoc_sumy_gmin_firmy (teryt, nip, nazwa, przypadkow, z_kwota, brutto, max_eur)
     values (?, ?, ?, ?, ?, ?, ?)
       on conflict(teryt, nip) do update set
         nazwa = ${MAKS_BEZ_NULL('pomoc_sumy_gmin_firmy.nazwa', 'excluded.nazwa')},
         przypadkow = przypadkow + excluded.przypadkow,
         z_kwota = z_kwota + excluded.z_kwota,
         brutto = brutto + excluded.brutto,
         max_eur = ${MAKS_BEZ_NULL('pomoc_sumy_gmin_firmy.max_eur', 'excluded.max_eur')}`,
  );
  const gminaWymiar = db.prepare(
    `insert into pomoc_sumy_gmin_wymiar (teryt, wymiar, klucz, przypadkow, z_kwota, brutto)
     values (?, ?, ?, ?, ?, ?)
       on conflict(teryt, wymiar, klucz) do update set przypadkow = przypadkow + excluded.przypadkow,
                                                       z_kwota = z_kwota + excluded.z_kwota,
                                                       brutto = brutto + excluded.brutto`,
  );
  const rok = dzien.slice(0, 4);

  return {
    wklad(w: Wklad): void {
      for (const [teryt, s] of w.gminy) {
        gmina.run(teryt, s.przypadkow, s.zKwota, s.brutto);
        gminaRok.run(teryt, rok, s.przypadkow, s.zKwota, s.brutto, dzien, dzien);
      }
      for (const f of w.gminyFirmy.values()) {
        gminaFirma.run(f.teryt, f.nip, f.nazwa, f.przypadkow, f.zKwota, f.brutto, f.maxEur);
      }
      for (const g of w.gminyWymiar.values()) {
        gminaWymiar.run(g.teryt, g.wymiar, g.klucz, g.przypadkow, g.zKwota, g.brutto);
      }
      for (const [nip, s] of w.firmy) firma.run(nip, s.nazwa, s.przypadkow, s.zKwota, s.brutto);
      for (const s of w.wymiary.values()) wymiar.run(s.wymiar, s.klucz, s.nazwa, s.przypadkow, s.zKwota, s.brutto);
      for (const o of w.organy.values()) organ.run(o.teryt, o.nip, o.kategoria, o.nazwa, o.przypadkow, o.zKwota, o.brutto);
    },
    naj(wiersze: WierszPomocy[]): void {
      for (const r of wiersze) {
        naj.run(r.dzien, r.teryt, r.nip_beneficjenta, r.nazwa_beneficjenta, r.wartosc_brutto,
          r.wartosc_brutto_eur, r.przeznaczenie, r.udzielajacy);
      }
      // Czolowka nie ma rosnac z liczba dni: po kazdym dniu zostaje 50 najwiekszych.
      db.prepare(
        `delete from pomoc_sumy_naj where id not in (
           select id from pomoc_sumy_naj order by brutto desc nulls last limit ?)`,
      ).run(NAJWIEKSZYCH);
    },
  };
}

function wyczyscStan(db: DatabaseSync): void {
  wTransakcji(db, () => {
    for (const t of ['pomoc_sumy_dni', 'pomoc_sumy_gmin', 'pomoc_sumy_firm', 'pomoc_sumy_wymiar',
      'pomoc_sumy_organy', 'pomoc_sumy_naj', 'pomoc_sumy_gmin_lata', 'pomoc_sumy_gmin_firmy',
      'pomoc_sumy_gmin_wymiar']) {
      db.prepare(`delete from ${t}`).run();
    }
    /*
     * Wersja w TEJ SAMEJ transakcji co czyszczenie: przerwana odbudowa zostawia
     * czysty stan z nowa wersja i czesc dni, a nastepny przebieg dolicza
     * brakujace dni zamiast zaczynac od zera. Kazdy dzien jest osobna,
     * calkowita transakcja, wiec stan nigdy nie ma polowy dnia.
     */
    db.prepare('insert or replace into pomoc_sumy_wersja (id, wersja) values (1, ?)').run(WERSJA_SUM);
  });
}

function wersjaStanu(db: DatabaseSync): number | null {
  const r = db.prepare('select wersja from pomoc_sumy_wersja where id = 1').get() as unknown as { wersja: number } | undefined;
  return r?.wersja ?? null;
}

export type WynikOdswiezenia = { dodanych: number; odBudowy: boolean; opis: string };

/**
 * Doprowadza stan sum do zbioru dni ustalonych.
 *
 * Zwykle dokłada zero albo jeden dzien. Buduje od zera tylko wtedy, gdy
 * policzony wczesniej dzien zmienil znacznik pobrania albo wypadl ze zbioru
 * ustalonych — czyli gdy zalozenie „dzien ustalony sie nie zmienia" przestalo
 * byc prawda. Wtedy lepiej policzyc wszystko jeszcze raz niz zostawic sume,
 * ktora nikt nie umie sprawdzic.
 */
export function odswiezSumy(db: DatabaseSync, odNowa = false): WynikOdswiezenia {
  const ustalone = db.prepare(
    `select d.dzien as dzien, coalesce(d.pobrano_dzien, substr(d.pobrano, 1, 10)) as pobrano
       from pomoc_publiczna_dni d where d.dzien in ${DNI_USTALONE} order by d.dzien`,
  ).all() as unknown as { dzien: string; pobrano: string }[];
  const policzone = new Map(
    (db.prepare('select dzien, pobrano from pomoc_sumy_dni').all() as unknown as { dzien: string; pobrano: string }[])
      .map((r) => [r.dzien, r.pobrano]),
  );

  const wgDnia = new Map(ustalone.map((d) => [d.dzien, d.pobrano]));
  const zmienione = [...policzone].filter(([dzien, pobrano]) => wgDnia.get(dzien) !== pobrano);
  // Stan z poprzedniej wersji nie ma tego, co nowa wersja liczy, dla dni JUZ
  // policzonych — dolozenie samych nowych dni dawaloby gminie pare dni zamiast
  // calej historii. Pusty stan (pierwszy przebieg) nie jest odbudowa.
  const staraWersja = policzone.size > 0 && wersjaStanu(db) !== WERSJA_SUM;
  const odbudowa = odNowa || zmienione.length > 0 || staraWersja;
  if (odbudowa || wersjaStanu(db) === null) wyczyscStan(db);

  const doPoliczenia = odbudowa ? ustalone : ustalone.filter((d) => !policzone.has(d.dzien));
  for (const d of doPoliczenia) policzDzien(db, d.dzien, d.pobrano);

  const powod = odNowa ? ' (na zadanie)'
    : zmienione.length ? ` (${zmienione.length} dni pobrano od nowa)`
      : staraWersja ? ` (nowy zakres sum, wersja ${WERSJA_SUM})` : '';
  return {
    dodanych: doPoliczenia.length,
    odBudowy: odbudowa,
    opis: odbudowa
      ? `sumy policzone od zera${powod}: ${doPoliczenia.length} dni`
      : `sumy: dolozono ${doPoliczenia.length} dni, razem ${ustalone.length}`,
  };
}

// ---------------------------------------------------------------------------
// Czytanie: stan + to, czego stan (celowo) nie obejmuje
// ---------------------------------------------------------------------------

/** Suma jak w SQL-u: brak kwot to `null`, a nie zmierzone zero (regula 4). */
const kwota = (zKwota: number, brutto: number): number | null => (zKwota > 0 ? brutto : null);

type Delta = {
  /** Gminy z dni pobranych dla kraju, ktore jeszcze sie nie ustalily. */
  gminy: Map<string, Kubelek>;
  /** Firmy ze WSZYSTKIEGO, czego nie ma w stanie — takze z gmin pokazowych. */
  firmy: Map<string, Kubelek & { nazwa: string | null }>;
  dni: number;
  wierszy: number;
};

/**
 * Wszystko, czego stan nie obejmuje, policzone na zywo.
 *
 * Dni bierzemy z INDEKSU po dniu i odejmujemy te policzone — nie pytamy
 * „czego nie ma w stanie" warunkiem `not in`, bo taki warunek i tak przechodzi
 * po calej tabeli, a to jest dokladnie to, czego chcemy uniknac. Zadnego
 * zalozenia o tym, skad wiersze pochodza, tu nie ma: dzien albo jest
 * policzony, albo nie.
 */
function policzDelte(db: DatabaseSync): Delta {
  const policzone = new Set(
    (db.prepare('select dzien from pomoc_sumy_dni').all() as unknown as { dzien: string }[]).map((r) => r.dzien),
  );
  const kraju = new Set(
    (db.prepare('select dzien from pomoc_publiczna_dni').all() as unknown as { dzien: string }[]).map((r) => r.dzien),
  );
  const wszystkie = (db.prepare('select distinct dzien from pomoc_publiczna').all() as unknown as
    { dzien: string }[]).map((r) => r.dzien);

  const d: Delta = { gminy: new Map(), firmy: new Map(), dni: 0, wierszy: 0 };
  const zapytanie = db.prepare(`select ${KOLUMNY} from pomoc_publiczna where dzien = ?`);
  for (const dzien of wszystkie) {
    if (policzone.has(dzien)) continue;
    d.dni += 1;
    const wKraju = kraju.has(dzien);
    for (const r of zapytanie.iterate(dzien) as unknown as Iterable<WierszPomocy>) {
      d.wierszy += 1;
      const ma = r.wartosc_brutto === null ? 0 : 1;
      const ile = r.wartosc_brutto ?? 0;
      if (wKraju) {
        const g = d.gminy.get(r.teryt);
        if (g) { g.przypadkow += 1; g.zKwota += ma; g.brutto += ile; }
        else d.gminy.set(r.teryt, { przypadkow: 1, zKwota: ma, brutto: ile });
      }
      if (r.nip_beneficjenta) {
        const f = d.firmy.get(r.nip_beneficjenta);
        if (f) { f.przypadkow += 1; f.zKwota += ma; f.brutto += ile; f.nazwa = wieksza(f.nazwa, r.nazwa_beneficjenta); }
        else d.firmy.set(r.nip_beneficjenta, { nazwa: r.nazwa_beneficjenta, przypadkow: 1, zKwota: ma, brutto: ile });
      }
    }
  }
  return d;
}

/** Przeglad krajowy — wylacznie z dni ustalonych, czyli wprost ze stanu. */
export function przegladZeSum(db: DatabaseSync, terytWarszawy: string): PrzegladPomocy | null {
  const zakres = db.prepare(
    `select min(dzien) as od, max(dzien) as do, count(*) as dni,
            sum(przypadkow) as przypadkow, sum(z_kwota) as z_kwota, sum(brutto) as brutto
       from pomoc_sumy_dni`,
  ).get() as unknown as
    { od: string | null; do: string | null; dni: number; przypadkow: number; z_kwota: number; brutto: number };
  if (!zakres?.od || !zakres.do) return null;

  const swiezych = (db.prepare(
    `select count(*) as c from pomoc_publiczna_dni where dzien not in ${DNI_USTALONE}`,
  ).get() as unknown as { c: number }).c;

  const grupa = (wymiar: Wymiar, ile: number): WierszPrzegladu[] => (db.prepare(
    `select coalesce(nazwa, klucz) as nazwa, przypadkow, z_kwota, brutto from pomoc_sumy_wymiar
      where wymiar = ? order by brutto desc limit ?`,
  ).all(wymiar, ile) as unknown as (WierszPrzegladu & { z_kwota: number })[])
    .map((r) => ({ nazwa: r.nazwa, przypadkow: r.przypadkow, brutto: kwota(r.z_kwota, r.brutto ?? 0) }));

  const wielkosc = (db.prepare(
    `select klucz as kod, nazwa, przypadkow, z_kwota, brutto from pomoc_sumy_wymiar
      where wymiar = 'wielkosc' order by klucz`,
  ).all() as unknown as { kod: string; nazwa: string | null; przypadkow: number; z_kwota: number; brutto: number }[])
    .map((r) => ({
      // Kolumna `wielkosc_kod` bywa pusta — w stanie lezy wtedy pod '(brak)'.
      kod: r.kod === '(brak)' ? null : r.kod,
      nazwa: r.nazwa ?? r.kod,
      przypadkow: r.przypadkow,
      brutto: kwota(r.z_kwota, r.brutto),
    }));

  const wojewodztwa = (db.prepare(
    `with l as (
       select g.wojewodztwo as wojewodztwo, sum(l.osob) as osob
         from gminy g join ludnosc l on l.teryt = g.teryt group by g.wojewodztwo
     ),
     p as (
       select case when s.teryt = ? then 'mazowieckie' else g.wojewodztwo end as wojewodztwo,
              s.przypadkow as przypadkow, s.z_kwota as z_kwota, s.brutto as brutto
         from pomoc_sumy_gmin s left join gminy g on g.teryt = s.teryt
     )
     select p.wojewodztwo as wojewodztwo, sum(p.przypadkow) as przypadkow,
            sum(p.z_kwota) as z_kwota, sum(p.brutto) as brutto, l.osob as osob
       from p left join l on l.wojewodztwo = p.wojewodztwo
      where p.wojewodztwo is not null
      group by p.wojewodztwo order by p.wojewodztwo`,
  ).all(terytWarszawy) as unknown as
    { wojewodztwo: string; przypadkow: number; z_kwota: number; brutto: number; osob: number | null }[])
    .map((r) => ({
      wojewodztwo: r.wojewodztwo, przypadkow: r.przypadkow, brutto: kwota(r.z_kwota, r.brutto), osob: r.osob,
    }));

  const najwieksze = db.prepare(
    `select n.nip as nip, n.nazwa as nazwa, n.max_eur as max_eur, n.dzien as dzien, n.brutto as brutto,
            n.przeznaczenie as przeznaczenie, n.udzielajacy as udzielajacy, n.teryt as teryt,
            case when n.teryt = ? then 'Warszawa' else g.nazwa end as gmina,
            (select typ from regon where regon.nip = n.nip) as typ_regon
       from pomoc_sumy_naj n left join gminy g on g.teryt = n.teryt
      order by n.brutto desc nulls last limit 15`,
  ).all(terytWarszawy) as unknown as PrzegladPomocy['najwieksze'];

  const ile = (sql: string) => (db.prepare(sql).get() as unknown as { c: number }).c;

  return {
    od: zakres.od,
    do: zakres.do,
    dni: zakres.dni,
    swiezych,
    przypadkow: zakres.przypadkow,
    beneficjentow: ile('select count(*) as c from pomoc_sumy_firm'),
    gmin: ile('select count(*) as c from pomoc_sumy_gmin'),
    brutto: kwota(zakres.z_kwota, zakres.brutto),
    udzielajacy: grupa('udzielajacy', 12),
    przeznaczenia: grupa('przeznaczenie', 12),
    formy: grupa('forma', 8),
    wielkosc,
    wojewodztwa,
    najwieksze,
  };
}

/**
 * Mapa pomocy: zlote na mieszkanca w gminie.
 *
 * Liczy sie WYLACZNIE z dni USTALONYCH — tak samo jak strona gminy — a nie
 * z pelnej historii gmin pokazowych: inaczej trzy gminy swiecilyby kwota
 * z dziesieciu lat obok kraju z kilkuset dni (pulapka 35).
 *
 * DO 01.10.2026 mapa doliczala tez dni pobrane, ale jeszcze NIEUSTALONE
 * (delte), zeby miala sens, zanim ustali sie pierwszy dzien. Blad B2
 * z przegladu: strona gminy liczy tylko z ustalonych, wiec czytelnik klikal
 * gmine na mapie i dostawal mniejsza liczbe — **1 604 z 2 439 gmin, do 81
 * razy** (Gdansk 21,26 zl na mapie wobec 18,90 zl na stronie).
 *
 * Wybralismy dni ustalone, bo liczba z dnia nieustalonego nie ma uczciwego
 * mianownika. Urzedy maja 7 dni na zgloszenie pomocy (pulapka 37): dzien
 * pobrany nazajutrz mial 200 przypadkow zamiast ~6 tys. Suma „16 dni
 * kompletnych + 6 czesciowych" nie odpowiada wiec ZADNEMU okresowi —
 * nie da sie pod nia podpisac zakresu dat, a regula 3 wymaga mianownika.
 * Gdy zaden dzien nie jest jeszcze ustalony, mapa jest pusta i strona ma
 * to powiedziec wprost (regula 4: brak danych to stan, nie zero).
 */
export function mapaZeSum(db: DatabaseSync, terytWarszawy: string): WartoscNaMapie[] {
  const sumy = new Map<string, Kubelek>();
  for (const r of db.prepare('select teryt, przypadkow, z_kwota, brutto from pomoc_sumy_gmin').all() as unknown as
    { teryt: string; przypadkow: number; z_kwota: number; brutto: number }[]) {
    sumy.set(r.teryt, { przypadkow: r.przypadkow, zKwota: r.z_kwota, brutto: r.brutto });
  }

  const warszawa = (db.prepare(
    "select sum(l.osob) as osob from gminy g join ludnosc l on l.teryt = g.teryt where g.rodzaj = 'dzielnica Warszawy'",
  ).get() as unknown as { osob: number | null })?.osob ?? 0;
  const osob = new Map<string, number>();
  for (const r of db.prepare('select teryt, osob from ludnosc').all() as unknown as
    { teryt: string; osob: number }[]) osob.set(r.teryt, r.osob);
  if (warszawa > 0) osob.set(terytWarszawy, warszawa);

  const wynik: WartoscNaMapie[] = [];
  for (const [teryt, s] of sumy) {
    const ludzi = osob.get(teryt);
    // Gmina bez ludnosci wypada — tak samo jak w SQL-owej wersji. Dzielenie
    // przez zero dawaloby nieskonczonosc, a nie „brak danych".
    if (!ludzi || ludzi <= 0) continue;
    if (s.zKwota === 0) continue;
    wynik.push({ teryt, wartosc: s.brutto / ludzi });
  }
  return wynik;
}

/**
 * Sumy pomocy na NIP — z calej tabeli, takze z pelnej historii gmin
 * pokazowych: strona firmy istnieje niezaleznie od tego, ktorym trybem
 * pobrano jej pomoc.
 */
/**
 * Lista firm do mapy strony — STRUMIENIEM Z SQL, nie z mapy w pamieci.
 *
 * ZMIERZONE 02.10.2026: `sudo jawne aktualizuj` przewrocil sie w kroku
 * „Migracje bazy" z „Ineffective mark-compacts near heap limit" przy 910 MB.
 * Stara droga budowala mape WSZYSTKICH firm w kraju (`sumyFirm`), a potem
 * rozwijala ja w tablice, filtrowala i sortowala — czyli trzymala dwie kopie
 * naraz. Po dociagnieciu zakresu z 853 tys. wierszy przestalo sie miescic,
 * a skutek byl powazniejszy niz sam blad: **nie dalo sie wdrozyc niczego**,
 * bo migracje ida przed budowa.
 *
 * Tu stan czyta sie strumieniem, posortowany przez SQLite, a w pamieci jest
 * tylko delta (firmy spoza stanu) i najwyzej `limit` napisow. Pamiec nie
 * zalezy od wielkosci rejestru.
 *
 * DELTY NIE WOLNO POMINAC, choc kusi: ZMIERZONE — **18 655 firm (co piata)
 * jest znanych TYLKO** z gmin pokazowych i dni jeszcze nieustalonych, bo ich
 * dni nie weszly do stanu przyrostowego. Sama `pomoc_sumy_firm` pominelaby
 * je w mapie strony po cichu. Dlatego lista sklada jedno z drugim.
 *
 * `wolno` to regula jawnosci — przekazana z zewnatrz, zeby ten plik nie
 * zalezal od `src/lib/prywatnosc.ts`.
 */
export function firmyDoMapy(
  db: DatabaseSync,
  limit: number,
  wolno: (nazwa: string | null, typRegon: string | null) => boolean,
  d: Delta = policzDelte(db),
): string[] {
  /*
   * ZMIERZONE 08.10.2026 (pulapka 72): ta lista liczyla delte warunkiem
   * `nip_beneficjenta is not null and dzien not in (…stan…)`. Plan SQLite to
   * NIE byl przeglad tabeli, tylko gorzej: `SEARCH pomoc_publiczna USING INDEX
   * pomoc_nip (nip_beneficjenta>?)` — zakres obejmujacy prawie kazdy z 8,7 mln
   * wierszy, doczytywanych w kolejnosci NIP-ow, czyli w losowych miejscach
   * pliku 7 GB. Krok agregatow trwal przez to 60–80 minut przy KAZDYM
   * przebiegu, takze przy „dolozono 0 dni”, a zadania czekajace na zapis
   * (`sudop-dzien`, `ted`) padaly na „database is locked”.
   * Delta jest teraz ta sama co dla firm i przegladu: `policzDelte` czyta
   * indeksem po dniu wylacznie dni spoza stanu.
   *
   * Firmy z delty dostaja sume „stan + delta” i sortujemy je osobno; reszte
   * czytamy ze stanu malejaco po kwocie i scalamy oba ciagi. Kolejnosc wychodzi
   * ta sama co z jednego `order by brutto desc` po obu zrodlach (test
   * porownuje to ze starym zapytaniem).
   */
  const zeStanu = db.prepare('select nazwa, brutto from pomoc_sumy_firm where nip = ?');
  const typ = db.prepare('select typ from regon where nip = ?');
  const dotkniete = [...d.firmy].map(([nip, f]) => {
    const s = zeStanu.get(nip) as { nazwa: string | null; brutto: number } | undefined;
    return { nip, nazwa: wieksza(s?.nazwa ?? null, f.nazwa), brutto: (s?.brutto ?? 0) + f.brutto };
  }).sort((a, b) => b.brutto - a.brutto || (a.nip < b.nip ? -1 : 1));

  const nipy: string[] = [];
  /** true, gdy lista jest pelna. */
  const wez = (r: { nip: string; nazwa: string | null }): boolean => {
    const t = (typ.get(r.nip) as { typ: string | null } | undefined)?.typ ?? null;
    if (wolno(r.nazwa, t)) nipy.push(r.nip);
    return nipy.length >= limit;
  };
  let i = 0;
  for (const r of db.prepare('select nip, nazwa, brutto from pomoc_sumy_firm order by brutto desc, nip')
    .iterate() as unknown as Iterable<{ nip: string; nazwa: string | null; brutto: number }>) {
    if (d.firmy.has(r.nip)) continue;
    while (i < dotkniete.length && (dotkniete[i]!.brutto > r.brutto
      || (dotkniete[i]!.brutto === r.brutto && dotkniete[i]!.nip < r.nip))) {
      if (wez(dotkniete[i++]!)) return nipy;
    }
    if (wez(r)) return nipy;
  }
  while (i < dotkniete.length) if (wez(dotkniete[i++]!)) return nipy;
  return nipy;
}

export function sumyFirm(
  db: DatabaseSync,
  delta = policzDelte(db),
): Map<string, { nazwa: string | null; brutto: number | null; typRegon: string | null }> {
  // `zKwota` niesiemy do konca, zeby firma bez zadnej kwoty dostala NULL,
  // a nie zmierzone zero (regula 4) — tak jak `sum()` w drugiej drodze.
  const sumy = new Map<string, { nazwa: string | null; brutto: number; zKwota: number; typRegon: string | null }>();
  for (const r of db.prepare('select nip, nazwa, z_kwota, brutto from pomoc_sumy_firm').all() as unknown as
    { nip: string; nazwa: string | null; z_kwota: number; brutto: number }[]) {
    sumy.set(r.nip, { nazwa: r.nazwa, brutto: r.brutto, zKwota: r.z_kwota, typRegon: null });
  }
  for (const [nip, d] of delta.firmy) {
    const s = sumy.get(nip);
    if (s) { s.brutto += d.brutto; s.zKwota += d.zKwota; s.nazwa = wieksza(s.nazwa, d.nazwa); }
    else sumy.set(nip, { nazwa: d.nazwa, brutto: d.brutto, zKwota: d.zKwota, typRegon: null });
  }
  /*
   * Typ z REGON dociagamy JEDNYM przebiegiem po tabeli, nie zapytaniem na NIP.
   * Bez niego lista do mapy strony powstawala sama heurystyka, a `/firma/[nip]`
   * rozstrzygal rejestrem — ZMIERZONE 01.10.2026: 57 adresow w mapie strony
   * prowadzilo do stron oddajacych 404, bo tam decydowal rejestr i je chowal.
   */
  for (const r of db.prepare('select nip, typ from regon where typ is not null').all() as unknown as
    { nip: string; typ: string }[]) {
    const s = sumy.get(r.nip);
    if (s) s.typRegon = r.typ;
  }
  return new Map([...sumy].map(([nip, s]) => [nip, { nazwa: s.nazwa, brutto: kwota(s.zKwota, s.brutto), typRegon: s.typRegon }]));
}

/** Jedno policzenie delty na przebieg — mapa i firmy czytaja to samo. */
export function delta(db: DatabaseSync): Delta {
  return policzDelte(db);
}

// ---------------------------------------------------------------------------
// Kontrola druga droga (wzorzec 7)
// ---------------------------------------------------------------------------

/** Kwoty sumowane w innej kolejnosci roznia sie na ostatnich bitach. */
const ROWNE = (a: number | null, b: number | null): boolean => {
  if (a === null || b === null) return a === b;
  const skala = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / skala < 1e-9;
};

/**
 * Liczy to samo drugi raz — SQL-em po calej tabeli — i porownuje ze stanem.
 *
 * To jest cena, ktora placimy za sumy przyrostowe: musi istniec droga, ktora
 * sprawdzi je niezaleznie. Przebieg jest DROGI (kilka przebiegow po calej
 * tabeli), wiec uruchamia sie go recznie, a nie przy kazdym imporcie.
 */
export function sprawdzSumy(
  db: DatabaseSync,
  terytWarszawy: string,
  // Bez tego polecenie milczy kilkadziesiat minut i wyglada na zawieszone
  // (zgloszenie Pawla 30.09.2026: „nadal wisza"). Dlugie liczenie ma mowic,
  // co robi — inaczej czlowiek je przerwie, i slusznie.
  mow: (s: string) => void = () => {},
): string[] {
  const rozjazdy: string[] = [];
  /*
   * Sufit na liste rozjazdow. Gdyby rozjechal sie KAZDY z kilkuset tysiecy
   * NIP-ow, sama lista bledow zjadlaby pamiec — a kontrola, ktora pada przy
   * zglaszaniu bledu, nie zglasza niczego. Dwadziescia przykladow wystarczy,
   * zeby zobaczyc wzorzec; liczbe wszystkich podajemy na koncu.
   */
  const MAKS_ROZJAZDOW = 20;
  let wszystkichRozjazdow = 0;
  const dopisz = (co: string) => {
    wszystkichRozjazdow += 1;
    if (rozjazdy.length < MAKS_ROZJAZDOW) rozjazdy.push(co);
  };
  const etap = (co: string) => {
    const t = Date.now();
    return () => mow(`      ${co}: ${Math.round((Date.now() - t) / 1000)} s`);
  };
  const cz = {
    wszystkie: <T>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as unknown as T[],
    jeden: <T>(sql: string, ...p: unknown[]) => (db.prepare(sql).get(...(p as never[])) as unknown as T) ?? null,
  };

  // 1. Przeglad krajowy: pole po polu.
  mow('   licze przeglad krajowy od zera (osiem przebiegow po tabeli pomocy)…');
  let koniec = etap('przeglad');
  const zZera = przegladOdZera(cz, terytWarszawy);
  koniec();
  const zeStanu = przegladZeSum(db, terytWarszawy);
  if (!zZera !== !zeStanu) {
    dopisz(`przeglad: jedna droga oddaje null, druga nie (${!!zZera} vs ${!!zeStanu})`);
  } else if (zZera && zeStanu) {
    for (const k of ['od', 'do', 'dni', 'swiezych', 'przypadkow', 'beneficjentow', 'gmin'] as const) {
      if (zZera[k] !== zeStanu[k]) dopisz(`przeglad.${k}: ${zZera[k]} vs ${zeStanu[k]}`);
    }
    if (!ROWNE(zZera.brutto, zeStanu.brutto)) dopisz(`przeglad.brutto: ${zZera.brutto} vs ${zeStanu.brutto}`);
    const listy: [string, WierszPrzegladu[], WierszPrzegladu[]][] = [
      ['udzielajacy', zZera.udzielajacy, zeStanu.udzielajacy],
      ['przeznaczenia', zZera.przeznaczenia, zeStanu.przeznaczenia],
      ['formy', zZera.formy, zeStanu.formy],
      ['wielkosc', zZera.wielkosc, zeStanu.wielkosc],
    ];
    for (const [nazwa, a, b] of listy) {
      const wgNazwy = (l: WierszPrzegladu[]) => new Map(l.map((r) => [r.nazwa, r]));
      const mb = wgNazwy(b);
      if (a.length !== b.length) dopisz(`przeglad.${nazwa}: ${a.length} vs ${b.length} pozycji`);
      for (const r of a) {
        const s = mb.get(r.nazwa);
        if (!s) { dopisz(`przeglad.${nazwa}: brak „${r.nazwa}" w sumach`); continue; }
        if (s.przypadkow !== r.przypadkow || !ROWNE(s.brutto, r.brutto)) {
          dopisz(`przeglad.${nazwa}/${r.nazwa}: ${r.przypadkow}/${r.brutto} vs ${s.przypadkow}/${s.brutto}`);
        }
      }
    }
    const naj = (l: PrzegladPomocy['najwieksze']) => l.map((r) => `${r.teryt}:${r.dzien}:${r.brutto}`).join(' | ');
    if (naj(zZera.najwieksze) !== naj(zeStanu.najwieksze)) {
      dopisz(`przeglad.najwieksze: ${naj(zZera.najwieksze)} vs ${naj(zeStanu.najwieksze)}`);
    }
  }

  // 2. Mapa gmin.
  mow('   licze mape gmin od zera…');
  koniec = etap('mapa');
  const d = policzDelte(db);
  const mapaA = new Map(mapaOdZera(cz, terytWarszawy).map((w) => [w.teryt, w.wartosc]));
  const mapaB = new Map(mapaZeSum(db, terytWarszawy).map((w) => [w.teryt, w.wartosc]));
  if (mapaA.size !== mapaB.size) dopisz(`mapa: ${mapaA.size} vs ${mapaB.size} gmin`);
  for (const [teryt, w] of mapaA) {
    if (!ROWNE(w, mapaB.get(teryt) ?? null)) dopisz(`mapa/${teryt}: ${w} vs ${mapaB.get(teryt)}`);
  }
  koniec();

  /*
   * 2b. Kto podjal decyzje — druga droga po (teryt, NIP organu, kategoria).
   * STRUMIENIEM, z tego samego powodu co nizej: wynik to kilka tysiecy
   * wierszy dzis i setki tysiecy przy pelnej historii.
   */
  mow('   licze organy od zera…');
  koniec = etap('organy');
  const organyB = new Map<string, { przypadkow: number; brutto: number }>();
  for (const r of db.prepare(
    'select teryt, nip_organu, kategoria, przypadkow, brutto from pomoc_sumy_organy',
  ).iterate() as unknown as Iterable<
    { teryt: string; nip_organu: string; kategoria: string; przypadkow: number; brutto: number }>) {
    organyB.set(`${r.teryt}|${r.nip_organu}|${r.kategoria}`, { przypadkow: r.przypadkow, brutto: r.brutto });
  }
  const organyA = new Map<string, { przypadkow: number; brutto: number }>();
  let organowA = 0;
  for (const r of db.prepare(
    `select teryt, nip_udzielajacego as nip, forma_kod, count(*) as przypadkow,
            coalesce(sum(wartosc_brutto), 0) as brutto
       from pomoc_publiczna where dzien in ${DNI_USTALONE} and nip_udzielajacego is not null
      group by teryt, nip_udzielajacego, forma_kod`,
  ).iterate() as unknown as Iterable<
    { teryt: string; nip: string; forma_kod: string | null; przypadkow: number; brutto: number }>) {
    // Grupujemy po KODZIE formy, a potem skladamy w kategorie — inaczej SQL
    // musialby znac nasza funkcje kategorii, a to nie byloby druga droga.
    const klucz = `${r.teryt}|${r.nip}|${kategoriaFormy(r.forma_kod)}`;
    const biez = organyA.get(klucz) ?? { przypadkow: 0, brutto: 0 };
    organyA.set(klucz, { przypadkow: biez.przypadkow + r.przypadkow, brutto: biez.brutto + r.brutto });
  }
  for (const [klucz, a] of organyA) {
    organowA += 1;
    const b = organyB.get(klucz);
    if (!b) { dopisz(`organy/${klucz}: brak w stanie`); continue; }
    if (a.przypadkow !== b.przypadkow) dopisz(`organy/${klucz}: ${a.przypadkow} vs ${b.przypadkow} przypadkow`);
    if (!ROWNE(a.brutto, b.brutto)) dopisz(`organy/${klucz}: ${a.brutto} vs ${b.brutto}`);
  }
  if (organowA !== organyB.size) dopisz(`organy: ${organowA} vs ${organyB.size} kubelkow`);
  koniec();

  /*
   * 3. Sumy na NIP — druga droga to zwykle „group by" po calej tabeli.
   *
   * STRUMIENIEM, nie `.all()`. ZMIERZONE 30.09.2026 na serwerze: `.all()`
   * na tym zapytaniu przewrocilo proces po 64 minutach — „Reached heap limit
   * Allocation failed", a w stosie `node::sqlite::StatementExecutionHelper::All`.
   * Wynik to kilkaset tysiecy wierszy, a kazdy staje sie osobnym obiektem JS;
   * razem z mapa sum ze stanu nie miesci sie to w domyslnej stercie (920 MB
   * przy 1,8 GB pamieci maszyny). `.iterate()` oddaje wiersz po wierszu
   * i trzyma w pamieci tylko jeden.
   */
  mow('   licze sumy na NIP od zera…');
  koniec = etap('firmy');
  const firmyB = sumyFirm(db, d);
  let ileA = 0;
  for (const r of db.prepare(
    'select nip_beneficjenta as nip, max(nazwa_beneficjenta) as nazwa, sum(wartosc_brutto) as brutto'
    + ' from pomoc_publiczna where nip_beneficjenta is not null group by nip_beneficjenta',
  ).iterate() as unknown as Iterable<{ nip: string; nazwa: string | null; brutto: number | null }>) {
    ileA += 1;
    const s = firmyB.get(r.nip);
    if (!s) { dopisz(`firmy: brak NIP-u ${r.nip} w sumach`); continue; }
    if (!ROWNE(r.brutto, s.brutto)) dopisz(`firmy/${r.nip}: ${r.brutto} vs ${s.brutto}`);
    // Nazwa nie jest ozdoba: od niej zalezy, czy wolno ja pokazac.
    if (r.nazwa !== s.nazwa) dopisz(`firmy/${r.nip} nazwa: „${r.nazwa}" vs „${s.nazwa}"`);
  }
  if (ileA !== firmyB.size) dopisz(`firmy: ${ileA} vs ${firmyB.size} NIP-ow`);
  koniec();

  /*
   * 4. Pomoc w gminie (strona gminy, WERSJA_SUM 2) — trzy zwykle „group by"
   * po dniach ustalonych, STRUMIENIEM. Stan czytamy po kluczu glownym, wiec
   * w pamieci nie lezy zadna z dwoch stron w calosci.
   */
  mow('   licze pomoc w gminach od zera (lata, beneficjenci, grupy)…');
  koniec = etap('gminy');
  const sumyZgodne = (nazwa: string, a: { p: number; z: number; b: number }, s: Kubelek | undefined) => {
    if (!s) { dopisz(`${nazwa}: brak w stanie`); return; }
    if (a.p !== s.przypadkow || a.z !== s.zKwota) dopisz(`${nazwa}: ${a.p}/${a.z} vs ${s.przypadkow}/${s.zKwota} przypadkow`);
    if (!ROWNE(a.b, s.brutto)) dopisz(`${nazwa}: ${a.b} vs ${s.brutto}`);
  };
  const ZRODLO_GMIN = `(select * from pomoc_publiczna where dzien in ${DNI_USTALONE})`;

  const rokStanu = db.prepare(
    'select przypadkow, z_kwota, brutto, pierwszy, ostatni from pomoc_sumy_gmin_lata where teryt = ? and rok = ?',
  );
  let ileLat = 0;
  for (const a of db.prepare(
    `select teryt, substr(dzien, 1, 4) as rok, count(*) as p, count(wartosc_brutto) as z,
            coalesce(sum(wartosc_brutto), 0) as b, min(dzien) as od, max(dzien) as do
       from ${ZRODLO_GMIN} group by teryt, rok`,
  ).iterate() as unknown as Iterable<{ teryt: string; rok: string; p: number; z: number; b: number; od: string; do: string }>) {
    ileLat += 1;
    const s = rokStanu.get(a.teryt, a.rok) as unknown as
      { przypadkow: number; z_kwota: number; brutto: number; pierwszy: string; ostatni: string } | undefined;
    sumyZgodne(`gmina/${a.teryt}/${a.rok}`, a, s && { przypadkow: s.przypadkow, zKwota: s.z_kwota, brutto: s.brutto });
    if (s && (s.pierwszy !== a.od || s.ostatni !== a.do)) {
      dopisz(`gmina/${a.teryt}/${a.rok}: dni ${a.od}..${a.do} vs ${s.pierwszy}..${s.ostatni}`);
    }
  }
  const ileLatStanu = (db.prepare('select count(*) as c from pomoc_sumy_gmin_lata').get() as unknown as { c: number }).c;
  if (ileLat !== ileLatStanu) dopisz(`gminy/lata: ${ileLat} vs ${ileLatStanu} wierszy`);

  const firmaStanu = db.prepare(
    'select nazwa, przypadkow, z_kwota, brutto, max_eur from pomoc_sumy_gmin_firmy where teryt = ? and nip = ?',
  );
  let ileFirm = 0;
  for (const a of db.prepare(
    `select teryt, coalesce(nip_beneficjenta, '') as nip, count(*) as p, count(wartosc_brutto) as z,
            coalesce(sum(wartosc_brutto), 0) as b, max(wartosc_brutto_eur) as max_eur, max(nazwa_beneficjenta) as nazwa
       from ${ZRODLO_GMIN} group by teryt, coalesce(nip_beneficjenta, '')`,
  ).iterate() as unknown as Iterable<
    { teryt: string; nip: string; p: number; z: number; b: number; max_eur: number | null; nazwa: string | null }>) {
    ileFirm += 1;
    const s = firmaStanu.get(a.teryt, a.nip) as unknown as
      { nazwa: string | null; przypadkow: number; z_kwota: number; brutto: number; max_eur: number | null } | undefined;
    const etykieta = `gmina/${a.teryt}/firma ${a.nip || '(bez NIP)'}`;
    sumyZgodne(etykieta, a, s && { przypadkow: s.przypadkow, zKwota: s.z_kwota, brutto: s.brutto });
    // Nazwa i najwieksza pojedyncza pomoc nie sa ozdoba: od nich zalezy regula jawnosci.
    if (s && s.nazwa !== a.nazwa) dopisz(`${etykieta} nazwa: „${a.nazwa}" vs „${s.nazwa}"`);
    if (s && !ROWNE(a.max_eur, s.max_eur)) dopisz(`${etykieta} max_eur: ${a.max_eur} vs ${s.max_eur}`);
  }
  const ileFirmStanu = (db.prepare('select count(*) as c from pomoc_sumy_gmin_firmy').get() as unknown as { c: number }).c;
  if (ileFirm !== ileFirmStanu) dopisz(`gminy/firmy: ${ileFirm} vs ${ileFirmStanu} wierszy`);

  const grupaStanu = db.prepare(
    'select przypadkow, z_kwota, brutto from pomoc_sumy_gmin_wymiar where teryt = ? and wymiar = ? and klucz = ?',
  );
  let ileGrup = 0;
  for (const wymiar of ['przeznaczenie', 'udzielajacy'] as const) {
    for (const a of db.prepare(
      `select teryt, coalesce(${wymiar}, '${BRAK_W_REJESTRZE}') as klucz, count(*) as p, count(wartosc_brutto) as z,
              coalesce(sum(wartosc_brutto), 0) as b
         from ${ZRODLO_GMIN} group by teryt, coalesce(${wymiar}, '${BRAK_W_REJESTRZE}')`,
    ).iterate() as unknown as Iterable<{ teryt: string; klucz: string; p: number; z: number; b: number }>) {
      ileGrup += 1;
      const s = grupaStanu.get(a.teryt, wymiar, a.klucz) as unknown as
        { przypadkow: number; z_kwota: number; brutto: number } | undefined;
      sumyZgodne(`gmina/${a.teryt}/${wymiar}/${a.klucz}`, a, s && { przypadkow: s.przypadkow, zKwota: s.z_kwota, brutto: s.brutto });
    }
  }
  const ileGrupStanu = (db.prepare('select count(*) as c from pomoc_sumy_gmin_wymiar').get() as unknown as { c: number }).c;
  if (ileGrup !== ileGrupStanu) dopisz(`gminy/grupy: ${ileGrup} vs ${ileGrupStanu} wierszy`);
  koniec();

  // Gdy przycielismy liste, czytelnik ma wiedziec, ile bylo naprawde.
  if (wszystkichRozjazdow > rozjazdy.length) {
    rozjazdy.push(`… i ${wszystkichRozjazdow - rozjazdy.length} dalszych rozjazdow (pokazuje ${MAKS_ROZJAZDOW})`);
  }
  return rozjazdy;
}
