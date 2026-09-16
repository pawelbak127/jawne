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
import { dirname, resolve } from 'node:path';

export const SCIEZKA_BAZY = process.env.JAWNE_BAZA ?? resolve(process.cwd(), 'dane', 'sejm.db');

export function otworz(doZapisu = false): DatabaseSync {
  mkdirSync(dirname(SCIEZKA_BAZY), { recursive: true });
  const db = new DatabaseSync(SCIEZKA_BAZY);
  // WAL: czytanie ze stron w trakcie trwajacego importu nie blokuje sie.
  db.exec('pragma journal_mode = WAL');
  db.exec('pragma foreign_keys = on');
  if (doZapisu) {
    // Import to setki tysiecy wstawek. Bez tego kazda transakcja czeka na fsync.
    db.exec('pragma synchronous = normal');
  }
  return db;
}

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

create table if not exists import (
  co        text primary key,
  kiedy     text not null,
  ile       integer,
  uwagi     text
);
`;

export function zalozSchemat(db: DatabaseSync): void {
  db.exec(SCHEMAT);
}

export function odnotujImport(db: DatabaseSync, co: string, ile: number, uwagi = ''): void {
  db.prepare('insert into import(co, kiedy, ile, uwagi) values (?,?,?,?) on conflict(co) do update set kiedy=excluded.kiedy, ile=excluded.ile, uwagi=excluded.uwagi')
    .run(co, new Date().toISOString(), ile, uwagi);
}
