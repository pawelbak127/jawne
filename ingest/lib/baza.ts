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
  /*
   * Czekanie na zwolnienie bazy przez innego pisarza. Bylo 60 s i wystarczalo,
   * dopoki importy nie nachodzily na siebie. ZMIERZONE 29.09.2026: odkad
   * historia SUDOP chodzi ciagle, trafia na nocne zadanie `sejm`, ktorego
   * etap „indeks firm" pisze JEDNA transakcja przez szesnascie minut —
   * i noc konczyla sie bledem `database is locked`. Czekanie jest tansze niz
   * porzucony zakres: te zadania i tak chodza w tle.
   */
  db.exec('pragma busy_timeout = 1800000');
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
  wiekszosc_glosow integer,        -- majorityVotes: ile glosow „za” przesadza o wiekszosci
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
/*
  Indeks wyszukiwania ustaw. Ten sam tokenizer co przy glosowaniach —
  trygram, bo polskiej odmiany nie znamy i szukamy podciagow.
*/
create virtual table if not exists procesy_szukaj using fts5(
  tekst,
  numer unindexed,
  tokenize = 'trigram'
);

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
/*
  Gmina + dzien, nie sama gmina (04.10.2026): eksport CSV gminy idzie dzien po
  dniu, zeby nie trzymac w pamieci i nie czytac naraz 192 tys. wierszy Krakowa
  (pulapka 69). Indeks po samym teryt jest jego przedrostkiem — usuwa go
  zalozSchemat.
*/
create index if not exists pomoc_teryt_dzien on pomoc_publiczna(teryt, dzien);
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

/*
 * Indeks po dniu. Do filtra „dni ustalone" jest bezuzyteczny (obejmuje 97%
 * wierszy — pulapka 52), ale sumy przyrostowe czytaja tabele DZIEN PO DNIU
 * i wtedy jest tym, co odroznia odczyt zakresu od przebiegu po calosci.
 */
create index if not exists pomoc_dzien on pomoc_publiczna(dzien);

/*
 * Sumy pomocy publicznej liczone raz na dzien danych — patrz
 * ingest/lib/sumy-pomocy.ts. Kolumna z_kwota mowi, ILE przypadkow mialo
 * kwote: bez niej suma z samych NULL-i wygladalaby na zmierzone zero
 * (regula 4). UWAGA: w tym szablonie NIE WOLNO uzywac odwrotnych apostrofow
 * — konczy go pierwszy z nich i TypeScript przestaje sie kompilowac.
 */
create table if not exists pomoc_sumy_dni (
  dzien       text primary key,
  pobrano     text not null,          -- zmiana = dzien pobrano od nowa, stan do przeliczenia
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null
);
create table if not exists pomoc_sumy_gmin (
  teryt       text primary key,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null
);
create table if not exists pomoc_sumy_firm (
  nip         text primary key,
  nazwa       text,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null
);
/*
  Kto PODJAL decyzje o pomocy, w rozbiciu na gminy i kategorie form.
  Klucz to NIP organu, nie nazwa: ZMIERZONE 01.10.2026 — 33 NIP-y maja po
  2-3 warianty nazwy w rejestrze („MARSZALEK LODZKI", „Marszalek Lodzki",
  „Marszalek Wojewodztwa Lodzkiego"), wiec grupowanie po nazwie rozsypaloby
  jeden organ na trzy wiersze.
  Kategoria formy jest w kluczu, bo sumowanie dotacji z umorzeniami w jedna
  liczbe byloby bledem merytorycznym — patrz src/lib/formy-pomocy.ts.
*/
create table if not exists pomoc_sumy_organy (
  teryt       text not null,
  nip_organu  text not null,
  kategoria   text not null,
  nazwa       text,                     -- z rejestru; strona nie ma jej szukac w tabeli pomocy
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null,
  primary key (teryt, nip_organu, kategoria)
);
create index if not exists pomoc_sumy_organy_teryt on pomoc_sumy_organy(teryt);
-- Strona organu pyta o JEDEN nip po wszystkich gminach; klucz glowny
-- zaczyna sie od teryt, wiec bez tego indeksu byl przebieg po tabeli.
create index if not exists pomoc_sumy_organy_nip on pomoc_sumy_organy(nip_organu);
create table if not exists pomoc_sumy_wymiar (
  wymiar      text not null,          -- udzielajacy | przeznaczenie | forma | wielkosc
  klucz       text not null,
  nazwa       text,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null,
  primary key (wymiar, klucz)
);
/*
  Pomoc w JEDNEJ gminie: lata, beneficjenci i dwie grupy (na co, kto udzielil).
  ZMIERZONE 04.10.2026: strona Krakowa liczyla to z tabeli pomocy — 191 910
  wierszy rozsianych po pliku 5,6 GB, osiem przebiegow, 2,5 GB odczytu i ponad
  dwie minuty zamrozonego serwisu. Klucz glowny zaczyna sie od teryt, a tabele
  sa WITHOUT ROWID, wiec wiersze jednej gminy leza obok siebie.
  W pomoc_sumy_gmin_firmy wiersze bez NIP-u leza pod nip = '' (jedna grupa,
  tak jak NULL w group by). Grupy maja klucz z rejestru albo
  „(brak w rejestrze)” — tak jak strona gminy.
*/
create table if not exists pomoc_sumy_gmin_lata (
  teryt       text not null,
  rok         text not null,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null,
  pierwszy    text not null,
  ostatni     text not null,
  primary key (teryt, rok)
) without rowid;
create table if not exists pomoc_sumy_gmin_firmy (
  teryt       text not null,
  nip         text not null,
  nazwa       text,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null,
  max_eur     real,                     -- najwieksza POJEDYNCZA pomoc, do progu jawnosci
  primary key (teryt, nip)
) without rowid;
create table if not exists pomoc_sumy_gmin_wymiar (
  teryt       text not null,
  wymiar      text not null,          -- przeznaczenie | udzielajacy
  klucz       text not null,
  przypadkow  integer not null,
  z_kwota     integer not null,
  brutto      real not null,
  primary key (teryt, wymiar, klucz)
) without rowid;
/* Wersja ZAKRESU stanu — gdy kod liczy wiecej niz stan, stan liczy sie od zera. */
create table if not exists pomoc_sumy_wersja (
  id          integer primary key check (id = 1),
  wersja      integer not null
);
/* Czolowka najwiekszych przypadkow — po kazdym dniu przycinana do 50. */
create table if not exists pomoc_sumy_naj (
  id            integer primary key,
  dzien         text not null,
  teryt         text not null,
  nip           text,
  nazwa         text,
  brutto        real,
  max_eur       real,
  przeznaczenie text,
  udzielajacy   text
);

/*
 * Interpelacje poselskie. Tresc zostaje w rejestrze — my trzymamy metryczke
 * i odsylamy do sejm.gov.pl. Autorow moze byc kilku (66 na 500 w probce),
 * stad osobna tabela; opoznienie odpowiedzi dotyczy MINISTRA, nie posla.
 */
create table if not exists interpelacje (
  numer           integer primary key,
  tytul           text not null,
  data_wplywu     text not null,
  data_wyslania   text,
  adresaci        text,                  -- nazwy rozdzielone srednikiem, jak podaje rejestr
  odpowiedzi      integer not null,
  ostatnia_odpowiedz text,
  opoznienie_dni  integer,
  adres           text,                  -- strona opisu w sejm.gov.pl
  zmieniony       text
);
create index if not exists interpelacje_data on interpelacje(data_wplywu desc);

create table if not exists interpelacje_autorzy (
  numer     integer not null references interpelacje(numer),
  posel_id  integer not null references poslowie(id),
  primary key (numer, posel_id)
);
create index if not exists interpelacje_autorzy_posel on interpelacje_autorzy(posel_id);

/*
 * Zapytania poselskie (od 03.10.2026) — ta sama budowa co interpelacje
 * (zmierzone na zywym API: identyczne pola), wiec i te same kolumny.
 * Osobne tabele, nie kolumna „rodzaj": inaczej kazde zapytanie strony
 * interpelacji musialoby pamietac o filtrze, a zapomniany filtr po cichu
 * dodalby zapytania do licznika interpelacji.
 */
create table if not exists zapytania (
  numer           integer primary key,
  tytul           text not null,
  data_wplywu     text not null,
  data_wyslania   text,
  adresaci        text,
  odpowiedzi      integer not null,
  ostatnia_odpowiedz text,
  opoznienie_dni  integer,
  adres           text,
  zmieniony       text
);
create index if not exists zapytania_data on zapytania(data_wplywu desc);

create table if not exists zapytania_autorzy (
  numer     integer not null references zapytania(numer),
  posel_id  integer not null references poslowie(id),
  primary key (numer, posel_id)
);
create index if not exists zapytania_autorzy_posel on zapytania_autorzy(posel_id);

/*
 * Streszczenia ustaw prostym jezykiem (od 04.10.2026). Zrodlem jest plik
 * ingest/zrodla/streszczenia/ustawy.json w repozytorium — kazde streszczenie
 * ma tam historie zmian i da sie je przejrzec przed publikacja. Do tej tabeli
 * trafia tylko to, co przeszlo bezpiecznik (src/lib/streszczenia.ts) i czego
 * skrot zrodla zgadza sie z BIEZACYM opisem rejestru: gdy rejestr zmieni
 * opis, stare streszczenie przestaje sie pokazywac samo.
 */
create table if not exists streszczenia (
  numer        text primary key,
  tekst        text not null,
  zrodlo_skrot text not null,
  model        text not null,
  przygotowano text not null
);

/*
 * Wystapienia na sali ze stenogramow (od 03.10.2026). Jeden wiersz to jedno
 * wystapienie: kto, w jakiej funkcji (posel, sprawozdawca, minister bedacy
 * poslem), kiedy, i czy zlozone tylko na pismie. TEMATU rejestr przy
 * wystapieniu nie podaje — jest w tresci, do ktorej strona linkuje.
 * stenogramy_dni pamieta, co pobrano i kiedy: swieze dni pobieramy ponownie,
 * bo wystapienia na pismie dochodza po dniu obrad.
 * (Bez odwrotnych apostrofow w tym komentarzu: caly SCHEMAT to szablon JS.)
 */
create table if not exists wystapienia (
  posiedzenie  integer not null,
  dzien        text not null,
  numer        integer not null,
  posel_id     integer references poslowie(id),   -- NULL: nie posel albo spoza naszej listy
  nazwa        text,
  funkcja      text,
  poczatek     text,
  koniec       text,
  sprawozdawca integer not null,
  sekretarz    integer not null,
  na_pismie    integer not null,
  primary key (posiedzenie, dzien, numer)
) without rowid;
create index if not exists wystapienia_posel on wystapienia(posel_id, dzien);

create table if not exists stenogramy_dni (
  posiedzenie integer not null,
  dzien       text not null,
  wystapien   integer not null,
  pobrano     text not null,
  primary key (posiedzenie, dzien)
) without rowid;

/*
 * Komisje sejmowe i ich sklad (od 03.10.2026). Odpowiedz rejestru na pytanie
 * „na czym komu zalezy" bez naszej klasyfikacji: posel sam wybral komisje,
 * Sejm zatwierdzil uchwala, a zakres dzialania opisal urzad (pole zakres).
 * Sklad to STAN BIEZACY rejestru, nie historia — strona to mowi.
 * zakres jest NULL u 9 z 40 komisji; funkcja jest NULL u zwyklego czlonka.
 * (Bez odwrotnych apostrofow w tym komentarzu: caly SCHEMAT to szablon JS.)
 */
create table if not exists komisje (
  kod          text primary key,
  nazwa        text not null,
  dopelniacz   text,
  typ          text not null,          -- STANDING | EXTRAORDINARY | INVESTIGATIVE
  zakres       text,
  telefon      text,
  powolana     text,
  sklad_z_dnia text
);
create table if not exists komisje_sklad (
  kod       text not null references komisje(kod),
  posel_id  integer not null references poslowie(id),
  funkcja   text,
  od        text,                       -- joinDate: od kiedy w komisji
  klub      text,                       -- klub podany przez rejestr komisji
  primary key (kod, posel_id)
) without rowid;
create index if not exists komisje_sklad_posel on komisje_sklad(posel_id);

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
  -- Z czego SKLADAJA sie dochody. Dopisane 24.09.2026, bo strona pokazywala
  -- „14,0 tys. zl na mieszkanca" i nie bylo jak sprawdzic, co w to wchodzi.
  -- Uklad z ustawy o dochodach JST i z GUS: dochody = wlasne + subwencja
  -- ogolna + dotacje. Udzialy w PIT i CIT sa czescia dochodow WLASNYCH.
  subwencja            integer,
  dotacje              integer,
  udzial_pit           integer,
  udzial_cit           integer,
  podatek_nieruchomosc integer,
  primary key (teryt, rok)
);

/*
 * REGON (GUS, usluga BIR): kim jest podmiot o danym NIP-ie.
 *
 * Po to, zeby nie zgadywac dwoch rzeczy, ktore rejestr podaje wprost:
 *  - typ = 'F' (osoba fizyczna) albo 'P' (prawna) — dzis wnioskujemy o tym
 *    z samej nazwy w prywatnosc.ts,
 *  - gmina siedziby — bez niej nie da sie powiedziec, ktore zamowienie
 *    publiczne dotyczy ktorej gminy.
 *
 * Kolumna teryt jest DOPASOWANA po nazwach (gmina + powiat + wojewodztwo), bo BIR
 * oddaje nazwy, nie kody. Gdy dopasowanie sie nie uda, zostaje null — nie
 * zgadujemy. Dla Warszawy BIR podaje dzielnice jako gmine, wiec caly powiat
 * "Warszawa" przypisujemy do 146501, tak jak reszta serwisu.
 */
create table if not exists regon (
  nip          text primary key,
  regon        text,
  nazwa        text,
  typ          text,                  -- 'F' albo 'P', surowo z rejestru
  silos        text,
  wojewodztwo  text,
  powiat       text,
  gmina        text,
  miejscowosc  text,
  kod_pocztowy text,
  teryt        text,                  -- nasz kod gminy, gdy dalo sie dopasowac
  rekordow     integer not null default 1,  -- ile wpisow rejestr ma dla tego NIP-u
  pobrano      text not null
);
create index if not exists regon_teryt on regon(teryt);

/*
 * Zamowienia publiczne z TED (Tenders Electronic Daily) — ogloszenia
 * o UDZIELENIU zamowienia (can-standard) z Polski. Jedno ogloszenie to
 * jeden wiersz, a wykonawcy leza osobno, bo jedno ogloszenie miewa ich
 * kilkunastu (zmierzone: 90 na 250 ogloszen ma wiecej niz jednego).
 *
 * UWAGA NA KWOTE: total-value dotyczy CALEGO ogloszenia, ze wszystkimi
 * czesciami i wszystkimi wykonawcami. Nie wolno jej przypisac jednemu
 * wykonawcy — strona firmy musi to mowic wprost.
 *
 * Kolumna wykonawcow to liczba wykonawcow podana przez TED, a wierszy
 * w ted_wykonawcy bywa mniej: pole z NIP-em jest wolnym tekstem i czesc
 * wpisow to REGON, numer zagraniczny albo smiec (patrz src/lib/nip.ts).
 */
create table if not exists ted_ogloszenia (
  numer      text primary key,    -- numer publikacji, np. '370762-2026'
  data       text not null,       -- data publikacji, RRRR-MM-DD
  tytul      text,
  nabywca    text,
  nabywca_id text,
  wartosc    real,                -- calego ogloszenia
  waluta     text,
  cpv        text,                -- glowny kod klasyfikacji
  wykonawcow integer not null
);
create index if not exists ted_data on ted_ogloszenia(data desc);
/*
 * Indeks po NABYWCY — bez niego strona gminy przemiatala cala tabele.
 *
 * ZMIERZONE 03.10.2026. "zamowieniaGminy" laczy ted_ogloszenia z regon po
 * "nabywca_id" i filtruje po "regon.teryt"; bez tego indeksu plan brzmial
 * "SCAN o", czyli 130 034 wiersze, TRZY RAZY na stronie, dla KAZDEJ
 * z 2 479 gmin — tak samo dla gminy, ktora nie ma ani jednego zamowienia.
 * Lokalnie: 134 ms -> 0,0 ms (typowa gmina), 122 -> 16,5 ms (Krakow).
 * Plan zmienia sie na "SEARCH r USING regon_teryt" + "SEARCH o USING
 * ted_nabywca". Budowa indeksu trwa 91 ms.
 *
 * Na serwerze bylo to znacznie grozniejsze niz lokalnie i polozylo serwis:
 * baza ma tam 4,8 GB przy 1,8 GB pamieci, wiec przemiatanie nie czytalo
 * z pamieci podrecznej, tylko z dysku — "next-server" siedzial w stanie "D"
 * przy 46% iowait, a kolejne zadania ustawialy sie za nim. Z zewnatrz
 * wygladalo to na awarie HTTP: TLS konczyl sie w 0,138 s, a odpowiedz
 * miala zero bajtow.
 * Lekcja ogolniejsza: brak indeksu na maszynie, gdzie tabela miesci sie
 * w pamieci podrecznej, jest kosztem; na maszynie, gdzie sie nie miesci,
 * jest awaria.
 */
create index if not exists ted_nabywca on ted_ogloszenia(nabywca_id);

create table if not exists ted_wykonawcy (
  numer text not null,
  nip   text not null,            -- znormalizowany do dziesieciu cyfr
  nazwa text,
  primary key (numer, nip),
  foreign key (numer) references ted_ogloszenia(numer)
) without rowid;
create index if not exists ted_wykonawcy_nip on ted_wykonawcy(nip);

/*
 * Proces legislacyjny: co sie stalo z projektem od wplyniecia do Sejmu
 * do podpisu Prezydenta. Jeden wiersz w procesy to jeden druk sejmowy,
 * a etapy_procesow trzyma jego sciezke — SPLASZCZONA, bo rejestr zagniezdza
 * etapy (skierowanie i sprawozdanie komisji sa dziecmi czytania), a kolejnosc
 * czytania jest tym, co czytelnik chce zobaczyc.
 *
 * glos_posiedzenie i glos_numer to nasz klucz glosowania — dzieki nim
 * strona ustawy prowadzi do imiennego glosowania i odwrotnie.
 */
create table if not exists procesy (
  numer            text primary key,      -- numer druku, jak w rejestrze (tekst!)
  tytul            text not null,
  rodzaj           text,                  -- 'projekt ustawy', 'projekt uchwaly', ...
  rodzaj_kod       text,                  -- documentTypeEnum
  uchwalony        integer,               -- 1/0; null = rejestr nie podaje
  data_wplyniecia  text,
  data_zakonczenia text,
  eli              text,                  -- identyfikator aktu, gdy juz opublikowany
  adres_publikacji text,                  -- 'Dz.U. 2024 poz. 1234'
  pilny            text,                  -- urgencyStatus, surowa wartosc rejestru
  skrocony         integer,
  ue               text,                  -- 'YES' | 'NO' — projekt wykonujacy prawo UE
  opis             text,
  zmieniony        text
);
create index if not exists procesy_rodzaj on procesy(rodzaj_kod);

create table if not exists etapy_procesow (
  proces           text not null,
  kolejnosc        integer not null,      -- pozycja po splaszczeniu
  poziom           integer not null,      -- 0 etap glowny, 1 podetap
  -- ZMIERZONE 23.09.2026: rejestr NIE ZAWSZE podaje stageType. W probce
  -- 60 procesow 42 etapy przyszly z samym stageName (np. "Rozpatrywanie
  -- na forum Sejmu"). Nazwa jest zawsze — i to ona idzie na strone.
  typ              text,                  -- stageType, gdy rejestr go poda
  nazwa            text not null,         -- stageName
  data             text,
  druk             text,
  komisja          text,
  decyzja          text,
  komentarz        text,
  posiedzenie      integer,
  glos_posiedzenie integer,
  glos_numer       integer,
  primary key (proces, kolejnosc),
  foreign key (proces) references procesy(numer)
) without rowid;
create index if not exists etapy_glosowanie on etapy_procesow(glos_posiedzenie, glos_numer);

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

/*
  Obecnosc posla w dniach obrad — z /MP/{id}/votings/stats.
  Jedyne miejsce w API, gdzie rejestr podaje, czy nieobecnosc byla
  usprawiedliwiona; dotyczy calego DNIA, nie pojedynczego glosowania.
  Nie wyliczamy z tego zadnej oceny — pokazujemy to, co zapisal rejestr.
*/
create table if not exists obecnosc (
  posel_id        integer not null,
  posiedzenie     integer not null,
  dzien           text not null,
  glosowan        integer not null,
  glosowal        integer not null,
  opuscil         integer not null,
  usprawiedliwiony integer not null,
  primary key (posel_id, posiedzenie, dzien),
  foreign key (posel_id) references poslowie(id)
) without rowid;

create index if not exists obecnosc_dzien on obecnosc(dzien);

/*
  Gotowe wyniki liczone RAZ, przy imporcie. Powod jest zmierzony: przeglad
  krajowy pomocy publicznej to osiem przebiegow po calej tabeli, czyli ponad
  trzy minuty przy 2,5 mln wierszy i kilkanascie przy pelnej historii.
  Kolumna podpis mowi, z jakiego zbioru dni policzono wynik — strona po nim
  pozna, ze agregat jest starszy niz dane, i moze to napisac zamiast udawac.
  (Bez odwrotnych apostrofow w tym komentarzu: caly SCHEMAT to szablon JS.)
*/
create table if not exists agregaty (
  klucz     text primary key,
  podpis    text not null,
  wartosc   text not null,
  policzono text not null
);

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
  const kolumnyBudzetu = db.prepare('pragma table_info(budzety_gmin)').all() as unknown as { name: string }[];
  for (const k of ['subwencja', 'dotacje', 'udzial_pit', 'udzial_cit', 'podatek_nieruchomosc']) {
    if (kolumnyBudzetu.length && !kolumnyBudzetu.some((x) => x.name === k)) {
      db.exec(`alter table budzety_gmin add column ${k} integer`);
      zrobione.push(`dodano kolumne budzety_gmin.${k}`);
    }
  }

  const kolumnyGlosowan = db.prepare('pragma table_info(glosowania)').all() as unknown as { name: string }[];
  if (kolumnyGlosowan.length && !kolumnyGlosowan.some((k) => k.name === 'wiekszosc_glosow')) {
    db.exec('alter table glosowania add column wiekszosc_glosow integer');
    zrobione.push('dodano kolumne glosowania.wiekszosc_glosow');
  }

  const kolumnyRegon = db.prepare('pragma table_info(regon)').all() as unknown as { name: string }[];
  if (kolumnyRegon.length && !kolumnyRegon.some((k) => k.name === 'rekordow')) {
    db.exec('alter table regon add column rekordow integer not null default 1');
    zrobione.push('dodano kolumne regon.rekordow');
  }

  // Przedrostek nowego indeksu (teryt, dzien) — zbedny, a zajmuje miejsce
  // i spowalnia kazdy zapis pomocy.
  if (db.prepare("select 1 from sqlite_master where type = 'index' and name = 'pomoc_teryt'").get()) {
    db.exec('drop index pomoc_teryt');
    zrobione.push('usunieto indeks pomoc_teryt (zastapiony przez pomoc_teryt_dzien)');
  }

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

/**
 * Transakcja, ktora NA PEWNO sie zamyka.
 *
 * ZMIERZONE 29.09.2026: `db.exec('begin')` bez wycofania zostawial otwarta
 * transakcje po kazdym bledzie w srodku — i kazdy nastepny zapis w tym
 * procesie konczyl sie `cannot start a transaction within a transaction`.
 * W dzienniku wygladalo to na trzy rozne usterki, a bylo jedna: pierwszy
 * blad (`database is locked`) psul cala reszte przebiegu.
 */
export function wTransakcji<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('begin');
  try {
    const wynik = fn();
    db.exec('commit');
    return wynik;
  } catch (e) {
    try {
      db.exec('rollback');
    } catch {
      /* Transakcja mogla sie juz zamknac sama — wtedy nie ma czego wycofywac. */
    }
    throw e;
  }
}

export function odnotujImport(db: DatabaseSync, co: string, ile: number, uwagi = ''): void {
  db.prepare('insert into import(co, kiedy, ile, uwagi) values (?,?,?,?) on conflict(co) do update set kiedy=excluded.kiedy, ile=excluded.ile, uwagi=excluded.uwagi')
    .run(co, new Date().toISOString(), ile, uwagi);
}
