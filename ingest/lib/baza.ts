/**
 * Magazyn danych: SQLite przez wbudowany `node:sqlite`.
 *
 * DLACZEGO SQLITE, A NIE OD RAZU POSTGRES. Caly zbior jest tylko do odczytu
 * i odtwarzalny z publicznego API w kilkanascie minut. Plik SQLite nie wymaga
 * ani konta, ani poswiadczen, ani sieci przy czytaniu — dzieki temu serwis
 * buduje sie i uruchamia u kazdego bez konfiguracji. Baza sieciowa dokladalaby
 * zaleznosc, ktorej na tym etapie nic nie kupuje.
 *
 * Plik NIE idzie do repozytorium (2,1 mln glosow) — patrz .gitignore.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dzienWarszawa } from './harmonogram.js';
import { dirname, resolve } from 'node:path';

export const SCIEZKA_BAZY = process.env.JAWNE_BAZA ?? resolve(process.cwd(), 'dane', 'sejm.db');

export function otworz(doZapisu = false): DatabaseSync {
  mkdirSync(dirname(SCIEZKA_BAZY), { recursive: true });
  const db = new DatabaseSync(SCIEZKA_BAZY);
  // WAL: czytanie ze stron w trakcie trwajacego importu nie blokuje sie.
  db.exec('pragma journal_mode = WAL');
  db.exec('pragma foreign_keys = on');
  // Import SUDOP trwa minutami i moze pracowac rownolegle z innymi etapami.
  // Bez tego drugi zapis dostaje od razu SQLITE_BUSY zamiast chwile poczekac.
  db.exec('pragma busy_timeout = 60000');
  if (doZapisu) {
    // Import to setki tysiecy wstawek. Bez tego kazda transakcja czeka na fsync.
    db.exec('pragma synchronous = normal');
  }
  return db;
}

/*
  Tabele funduszy UE osobno: etap "fundusze" odbudowuje je w calosci
  (drop + create), wiec zmiana kolumn nie wymaga migracji danych.
*/
export const SCHEMAT_FE = `
/*
  Projekty z Funduszy Europejskich (lista MFiPR na dane.gov.pl). Lokalizacje
  osobno, bo projekt bywa realizowany w wielu miejscach — kwoty takiego
  projektu NIE dzielimy miedzy gminy, bo to byloby zmyslanie.
*/
create table if not exists fe_projekty (
  id                 integer primary key,
  okres              text not null,       -- '2021-2027' | '2014-2020'
  numer_umowy        text,
  tytul              text not null,
  beneficjent        text,
  fundusz            text,
  program            text,
  wartosc            real,
  dofinansowanie_ue  real,
  waluta             text not null,       -- 'PLN' | 'EUR' (Interreg 2014-2020)
  poczatek           text,
  koniec             text,
  miejsc             integer not null,    -- liczba miejsc realizacji
  lokalizacja        text                 -- surowy tekst z listy
);

create table if not exists fe_miejsca (
  projekt_id   integer not null,
  poziom       text not null,             -- 'gmina' | 'powiat' | 'wojewodztwo' | 'kraj'
  teryt        text,                      -- 6 cyfr: gmina albo miasto na prawach powiatu
  teryt_powiatu text,                     -- 4 cyfry, gdy znany powiat
  wojewodztwo  text,
  powiat       text,
  gmina        text,
  foreign key (projekt_id) references fe_projekty(id)
);
create index if not exists fe_miejsca_teryt on fe_miejsca(teryt);
create index if not exists fe_miejsca_powiat on fe_miejsca(teryt_powiatu);
create index if not exists fe_miejsca_projekt on fe_miejsca(projekt_id);

`;

export const SCHEMAT = `
create table if not exists kluby (
  id            text primary key,
  nazwa         text,
  mandaty       integer,          -- null znaczy „rejestr nie podaje", nie zero
  email         text,
  telefon       text,
  faks          text
);

create table if not exists poslowie (
  id                integer primary key,
  slug              text not null unique,
  imie              text not null,
  drugie_imie       text,
  nazwisko          text not null,
  imie_nazwisko     text not null,
  klub_id           text,
  okreg_nr          integer,
  okreg_nazwa       text,
  wojewodztwo       text,
  zawod             text,
  wyksztalcenie     text,
  data_urodzenia    text,
  miejsce_urodzenia text,
  glosow_w_wyborach integer,
  email             text,
  aktywny           integer not null,
  przyczyna_wygasniecia text,  -- surowy tekst rejestru; NIE interpretujemy go
  data_wygasniecia  text,
  ma_zdjecie        integer,
  foreign key (klub_id) references kluby(id)
);
create index if not exists poslowie_klub on poslowie(klub_id);

create table if not exists posiedzenia (
  numer   integer primary key,
  tytul   text,
  daty    text                    -- JSON: lista dat
);

create table if not exists glosowania (
  posiedzenie   integer not null,
  numer         integer not null,
  dzien         integer,
  data          text not null,     -- ISO, do sortowania
  tytul         text not null,
  temat         text,
  opis          text,
  rodzaj        text,
  typ_wiekszosci text,
  za            integer not null,
  przeciw       integer not null,
  wstrzymalo    integer not null,
  nieobecnych   integer not null,
  glosowalo     integer not null,
  pdf           text,
  primary key (posiedzenie, numer)
);
create index if not exists glosowania_data on glosowania(data desc);

create table if not exists glosy (
  posiedzenie integer not null,
  numer       integer not null,
  posel_id    integer not null,
  klub_id     text,
  glos        text not null,       -- surowa wartosc rejestru
  primary key (posiedzenie, numer, posel_id)
) without rowid;
create index if not exists glosy_posel on glosy(posel_id);

/*
  Zdjecia trzymamy U SIEBIE, a nie linkujemy przy generowaniu obrazka OG.
  Powod jest zmierzony: przy adresie zdalnym render podgladu wisi tak dlugo,
  jak dlugo milczy API Sejmu, a build 499 stron zamienia sie w loterie.
  Zmierzone: 499 zdjec to 6,8 MB, w pliku, ktory i tak nie idzie do repozytorium.
*/
create table if not exists zdjecia (
  posel_id integer primary key,
  typ      text not null,          -- rozpoznany z SYGNATURY bajtow, nie z naglowka
  bajty    blob not null,
  foreign key (posel_id) references poslowie(id)
);

/* Okregi i gminy — z danych PKW 2023, patrz ingest/zrodla/pkw-2023/ZRODLO.md. */
create table if not exists okregi (
  nr                  integer primary key,
  nazwa               text,          -- siedziba okregu, z rejestru Sejmu
  wojewodztwo         text not null,
  uprawnionych_kraj   integer,       -- suma z gmin, wybory 2023
  uprawnionych_zagr   integer        -- obwody za granica i na statkach (tylko okreg 19)
);

create table if not exists gminy (
  teryt        text primary key,     -- 6 cyfr, DOPELNIONE zerem
  nazwa        text not null,
  rodzaj       text not null,
  powiat       text not null,
  wojewodztwo  text not null,
  okreg_nr     integer not null,
  uprawnionych integer,
  szukaj       text not null,        -- nazwa po uprosc(): bez ogonkow, male litery
  foreign key (okreg_nr) references okregi(nr)
);
create index if not exists gminy_okreg on gminy(okreg_nr);

/*
  Sumy glosow kazdego klubu w kazdym glosowaniu. Wyliczone raz przy imporcie
  z tabeli glosow — na stronie posla porownujemy z nimi jego glos. Liczenie
  tego przy kazdym wejsciu to agregacja setek tysiecy wierszy na strone.
*/
create table if not exists glosy_klubow (
  posiedzenie integer not null,
  numer       integer not null,
  klub_id     text not null,
  za          integer not null,
  przeciw     integer not null,
  wstrzymalo  integer not null,
  nieobecnych integer not null,
  innych      integer not null,      -- PRESENT, VOTE_VALID i wartosci spoza slownika
  primary key (posiedzenie, numer, klub_id)
) without rowid;

/*
  Cechy glosowania wyliczone funkcja opisGlosowania() — ta sama, ktorej uzywa
  interfejs. Dzieki temu filtr "nad caloscia" w SQL-u i etykieta na stronie
  nie moga sie rozjechac.
*/
create table if not exists glosowania_cechy (
  posiedzenie  integer not null,
  numer        integer not null,
  nad_caloscia integer not null,
  porzadkowe   integer not null,
  primary key (posiedzenie, numer)
) without rowid;

/*
  Podsumowanie porownania z klubem dla kazdego posla — liczone przy imporcie
  funkcja porownajZKlubem(), ta sama, ktora pokazuje liste na profilu.
  Strona okregu czyta stad liczby dla nawet 20 poslow naraz; liczenie ich
  przy kazdym wejsciu dawalo ~1 s odpowiedzi.
*/
create table if not exists porownania_poslow (
  posel_id       integer primary key,
  porownywalnych integer not null,
  odmiennych     integer not null
);

/*
  Wyszukiwanie glosowan. Tekst trafia tu JUZ UPROSZCZONY (uprosc()), bo
  tokenizer z remove_diacritics nie zamienia "ł" na "l" — zmierzone.
*/
create virtual table if not exists glosowania_szukaj using fts5(
  tekst,
  posiedzenie unindexed,
  numer unindexed,
  tokenize = 'trigram'
);

/*
  Pomoc publiczna i de minimis z SUDOP (UOKiK), po gminie siedziby
  beneficjenta. Wypelniana WYLACZNIE recznym uruchomieniem ingest/jobs/sudop.ts.
  Kwoty REAL, bo porownujemy je z innymi kwotami, a nie ksiegujemy.
*/
create table if not exists pomoc_publiczna (
  id                  integer primary key,
  teryt               text not null,     -- 6 cyfr, gmina siedziby beneficjenta
  kod_gminy_sudop     text,              -- 7 cyfr, jak w SUDOP
  dzien               text not null,
  nip_beneficjenta    text,
  nazwa_beneficjenta  text,
  wielkosc_kod        text,
  wielkosc            text,
  pkd                 text,
  pkd_nazwa           text,
  nip_udzielajacego   text,
  udzielajacy         text,
  srodek_numer        text,
  srodek_nazwa        text,
  podstawa            text,
  przeznaczenie_kod   text,
  przeznaczenie       text,
  forma_kod           text,
  forma               text,
  wartosc_nominalna   real,
  wartosc_brutto      real,
  wartosc_brutto_eur  real,
  /*
   * API nie zwraca identyfikatora przypadku, a ten sam przypadek przychodzi
   * dwa razy: raz przy imporcie calej gminy, raz przy dociaganiu dnia dla
   * calego kraju. Klucz to skrot wszystkich 28 pol — bez niego drugi import
   * podwoilby kwoty.
   */
  klucz               text
);
create index if not exists pomoc_teryt on pomoc_publiczna(teryt);
create index if not exists pomoc_nip on pomoc_publiczna(nip_beneficjenta);
create unique index if not exists pomoc_klucz on pomoc_publiczna(klucz);

/* Kiedy i w jakim zakresie pobrano SUDOP dla gminy — do metryczki przy danych. */
create table if not exists pomoc_publiczna_pobrania (
  teryt     text primary key,
  od        text not null,
  pobrano   text not null,
  wierszy   integer not null,
  zapytan   integer not null,
  sekund    integer not null
);

/*
 * Dni pobrane dla CALEGO KRAJU (tryb --przyrost). Osobno od pobran gminnych,
 * bo znacza co innego: pobranie gminy to pelne 10 lat jednej gminy, a dzien
 * to wszystkie gminy z jednej daty. Strona gminy musi umiec powiedziec,
 * ktora z tych dwoch rzeczy pokazuje.
 */
/*
 * ZMIERZONE 22.09.2026: zadanie nocne o 01:17 w Warszawie zapisuje znacznik
 * UTC z poprzedniej doby (23:17Z). Regula "dzien ustala sie po 14 dniach"
 * liczona po dacie UTC gubila przez to cala dobe — dzien 08.09 odswiezony
 * 22.09 wygladal na pobrany 21.09 i nie ustalal sie nigdy, a plan nocy wracal
 * do niego w kolko. Strefe przeliczamy RAZ, przy zapisie (pobrano_dzien);
 * SQL i raporty porownuja juz zwykle daty.
 */
create table if not exists pomoc_publiczna_dni (
  dzien          text primary key,         -- RRRR-MM-DD
  pobrano        text not null,            -- znacznik ISO, czyli UTC
  pobrano_dzien  text,                     -- ta sama chwila w POLSKIM kalendarzu
  wierszy        integer not null
);

/* Ludnosc gmin z GUS BDL (zmienna 72305 "ludnosc ogolem"). Mianownik kwot. */
create table if not exists ludnosc (
  teryt  text primary key,               -- 6 cyfr
  rok    integer not null,
  osob   integer not null
);

/*
 * Budzety gmin z GUS BDL. Trzymamy kwoty calkowite, a nie "na mieszkanca":
 * dzielimy sami przez ludnosc z tabeli "ludnosc", zeby mianownik byl ten sam,
 * co przy funduszach UE i pomocy publicznej.
 * TERYT Warszawy to 146501 — w BDL jest jedna jednostka, a nie 18 dzielnic.
 */
create table if not exists budzety_gmin (
  teryt                text not null,            -- 6 cyfr
  rok                  integer not null,
  dochody              integer,
  dochody_wlasne       integer,
  wydatki              integer,
  wydatki_majatkowe    integer,               -- inwestycje i dotacje inwestycyjne
  wydatki_inwestycyjne integer,               -- sama czesc inwestycyjna wydatkow majatkowych
  primary key (teryt, rok)
);

/*
 * Wydatki gmin wedlug dzialow klasyfikacji budzetowej (GUS BDL, temat P2920).
 * Jeden wiersz to jeden dzial jednej gminy w jednym roku; 'ogolem' to suma
 * wszystkich dzialow z TEGO SAMEGO zrodla — mianownik dla procentow.
 *
 * Brak wiersza znaczy "rejestr nie podal wartosci", a nie "gmina wydala zero"
 * (regula 4). Dlatego "pozostale dzialy" liczymy jako 'ogolem' minus to,
 * co mamy — nie jako zero.
 */
create table if not exists budzety_dzialy (
  teryt text not null,                         -- 6 cyfr
  rok   integer not null,
  dzial text not null,                         -- kod dzialu ('801') albo 'ogolem'
  kwota real not null,                         -- zlote
  primary key (teryt, rok, dzial)
) without rowid;

/*
 * SMUP (System Monitorowania Uslug Publicznych, GUS): wskazniki finansowe
 * i podatkowe gmin, rocznie. Wartosc zostaje TAKA, JAK W REJESTRZE — procent
 * jako procent, zlote jako zlote; jednostke trzyma smup_miary, a liczbe
 * miejsc po przecinku samo zrodlo (kolumna precyzja).
 * Pusta wartosc znaczy "brak informacji albo tajemnica statystyczna"
 * (flaga 5), a nie zero — zasada 4 z CLAUDE.md.
 */
create table if not exists smup_miary (
  klucz      text primary key,
  etykieta   text not null,
  jednostka  text not null,            -- 'procent' | 'zl_na_mieszkanca'
  wskazniki  text not null,            -- id-ki SMUP, po przecinku
  nazwy      text                      -- nazwy urzedowe wskaznikow, prosto z rejestru
);

create table if not exists smup_dane (
  teryt      text not null,            -- 6 cyfr
  klucz      text not null,
  rok        integer not null,
  wartosc    real,                     -- null = brak informacji (flaga 5)
  flaga      integer not null,
  precyzja   integer,
  primary key (teryt, klucz, rok)
);

create index if not exists smup_dane_klucz_rok on smup_dane(klucz, rok);

/* Tabele funduszy UE tworzy wylacznie etap "fundusze" (SCHEMAT_FE) — przebudowuje je w calosci. */
create table if not exists import (
  co        text primary key,
  kiedy     text not null,
  ile       integer,
  uwagi     text
);
`;

/**
 * Schemat i migracje. Migracje sa tutaj, a nie w osobnym etapie, bo strona
 * czyta `pobrano_dzien` wprost: brakujaca KOLUMNA nie jest lapana przez
 * `bezTabeli()` w `src/lib/dane.ts` i wywrocilaby strone gminy. Kazdy import
 * (i `npx tsx ingest/jobs/migracje.ts`) doprowadza baze do porzadku.
 *
 * Zwraca opis tego, co zmienil — pusty, gdy nie bylo nic do zrobienia.
 */
export function zalozSchemat(db: DatabaseSync): string[] {
  db.exec(SCHEMAT);
  const zrobione: string[] = [];
  const kolumny = db.prepare('pragma table_info(pomoc_publiczna_dni)').all() as unknown as { name: string }[];
  if (kolumny.length && !kolumny.some((k) => k.name === 'pobrano_dzien')) {
    db.exec('alter table pomoc_publiczna_dni add column pobrano_dzien text');
    zrobione.push('dodano kolumne pomoc_publiczna_dni.pobrano_dzien');
  }
  // Wiersze sprzed 22.09.2026 maja tylko znacznik UTC. Przeliczamy je raz na
  // polski kalendarz — inaczej dzien pobrany w nocy nigdy by sie nie ustalil.
  const bezDaty = db.prepare('select dzien, pobrano from pomoc_publiczna_dni where pobrano_dzien is null')
    .all() as unknown as { dzien: string; pobrano: string }[];
  if (bezDaty.length) {
    const uzupelnij = db.prepare('update pomoc_publiczna_dni set pobrano_dzien = ? where dzien = ?');
    db.exec('begin');
    for (const w of bezDaty) uzupelnij.run(dzienWarszawa(new Date(w.pobrano)), w.dzien);
    db.exec('commit');
    zrobione.push(`uzupelniono polska date pobrania dla ${bezDaty.length} dni`);
  }
  return zrobione;
}

export function odnotujImport(db: DatabaseSync, co: string, ile: number, uwagi = ''): void {
  db.prepare('insert into import(co, kiedy, ile, uwagi) values (?,?,?,?) on conflict(co) do update set kiedy=excluded.kiedy, ile=excluded.ile, uwagi=excluded.uwagi')
    .run(co, new Date().toISOString(), ile, uwagi);
}
