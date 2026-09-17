# Źródła danych publicznych — katalog

Stan na 17.09.2026. Każdy wiersz ma status i podstawę:

- **zmierzone** — odpytaliśmy źródło i opisujemy, co naprawdę przyszło,
- **z dokumentacji** — przeczytane u wydawcy, nieodpytane (np. żeby nie zużyć limitu),
- **odrzucone** — świadomie nieużywane, z powodem.

## Używane w serwisie

| Źródło | Co daje | Dostęp | Podstawa |
|---|---|---|---|
| **API Sejmu** `api.sejm.gov.pl/sejm/term10` | posłowie, kluby, głosowania, 2,1 mln głosów imiennych, zdjęcia | bez klucza; F5 potrafi oddać `404 text/html` na poprawny adres przy pierwszym żądaniu | zmierzone |
| **PKW, wybory do Sejmu 2023** — wyniki po gminach | przypisanie 2 494 gmin do 41 okręgów, liczba uprawnionych | plik CSV, kopia w `ingest/zrodla/pkw-2023/` | zmierzone |
| **GUS Bank Danych Lokalnych** `bdl.stat.gov.pl/api/v1` | ludność gmin (zmienna 72305), rok 2025 | bez klucza, 10 000 zapytań / 7 dni; kod jednostki BDL zawiera TERYT | zmierzone |
| **Listy projektów Funduszy Europejskich** (MFiPR, dane.gov.pl, zbiory 13939 i 1176) | 34 348 projektów 2021–2027 i 103 824 z 2014–2020: beneficjent, wartość, dofinansowanie UE, miejsce realizacji | XLSX aktualizowany co miesiąc; adres pliku zmienia się — pytamy katalog | zmierzone |
| **SUDOP** (UOKiK) `api-sudop.uokik.gov.pl/sudop-api` | pomoc publiczna i de minimis: beneficjent z NIP, udzielający, forma, przeznaczenie, wartość, gmina siedziby | bez klucza, **kolejka**; 15 zapytań/min; okno 10 lat; tylko ręcznie, dla wskazanych gmin — patrz `docs/sudop.md` | zmierzone |
| **Imiona w rejestrze PESEL** (MC, dane.gov.pl, zbiór 1667) | 2 324 imiona noszone przez ≥ 200 osób — do rozpoznawania nazw jednoosobowych firm | XLSX raz w roku; wynik w `src/lib/imiona-pesel.ts` | zmierzone |
| **dane.gov.pl** `api.dane.gov.pl/1.4` | katalog zbiorów, adresy aktualnych plików | bez klucza; stronicowanie potrafi zwrócić ten sam zasób dwa razy | zmierzone |

## Warte dołączenia — zmierzone albo sprawdzone

| Źródło | Co daje | Dostęp | Uwagi |
|---|---|---|---|
| **API KRS** `api-krs.ms.gov.pl/api/krs/OdpisAktualny/{krs}?rejestr=P&format=json` | odpis aktualny: nazwa, NIP, REGON, siedziba z gminą, kapitał, lista złożonych sprawozdań finansowych | bez klucza, 0,34 s | **zmierzone.** Nazwiska członków zarządu i PESEL są zanonimizowane (`F*****`). Brak wyszukiwania po nazwie ani NIP — trzeba znać numer KRS. |
| **Biuletyn Zamówień Publicznych** `ezamowienia.gov.pl/mo-board/api/v1/notice` | ogłoszenia, w tym o udzieleniu zamówienia: zamawiający z NIP, wykonawcy z NIP, przedmiot, CPV | bez klucza, wymagane `PublicationDateFrom`/`To` | **zmierzone.** Wartość umowy tylko w polu `htmlBody` (trzeba parsować HTML). Wykonawcy bywają jednoosobowymi firmami z imieniem i nazwiskiem w nazwie — ta sama reguła prywatności co przy dotacjach. |
| **UOKiK na dane.gov.pl** (instytucja 26, 129 zbiorów) | roczne zestawienia pomocy publicznej i de minimis: formy, przeznaczenia, **podmioty udzielające** | CSV, bez klucza | **zmierzone.** Tylko sumy, bez beneficjentów. Oficjalna instrukcja API SUDOP (zbiór 6068) — to z niej wiemy o formacie dat i limicie. |
| **MF — sprawozdania budżetowe JST** (dane.gov.pl, zbiór 872, 272 zasoby) | dochody i wydatki gmin (Rb-27S, Rb-28S), należności, zobowiązania | ZIP/CSV kwartalnie | z dokumentacji; najbardziej naturalny następny krok dla strony gminy („budżet Twojej gminy na mieszkańca”). |
| **MF — udziały JST w PIT/CIT** (zbiory 3313, 1878) | ile gmina dostaje z podatków dochodowych | CSV | z dokumentacji, aktualizacja 2026-09-04 |
| **Biała lista VAT** `wl-api.mf.gov.pl` | status VAT, adres, rachunki, reprezentanci, KRS po NIP/REGON | bez klucza; `search`: **100 zapytań/dzień**, `check`: 5 000 | z dokumentacji MF. Limit wyklucza użycie na żądanie czytelnika; nadaje się do jednorazowego wzbogacenia listy NIP-ów. |
| **API ELI** `api.sejm.gov.pl/eli` | teksty ustaw (PDF tekstowe), zmiany aktów | bez klucza | zmierzone w projekcie „obywatel” |
| **SRPP** `srpp.minrol.gov.pl` | pomoc publiczna w rolnictwie i rybołówstwie | serwis WWW | z dokumentacji Komisji Europejskiej: Polska publikuje tam pomoc rolną zamiast w TAM |
| **Rejestr korzyści i oświadczenia majątkowe posłów** (sejm.gov.pl) | majątek, funkcje, udziały | PDF, w dużej części skany | zmierzone w projekcie „obywatel”; bez API, ręczne przepisywanie z podwójną kontrolą |

## Zagraniczne źródła z polskimi danymi — zmierzone 18.09.2026

| Źródło | Co daje dla Polski | Dostęp | Uwagi |
|---|---|---|---|
| **GLEIF** `api.gleif.org/api/v1/lei-records` | 43 030 polskich podmiotów z identyfikatorem LEI; pole `registeredAs` to numer KRS | bez klucza, JSON:API | **zmierzone.** Gotowy pomost LEI ↔ KRS ↔ nazwa. Obejmuje tylko podmioty, które wystąpiły o LEI (głównie spółki z rynku finansowego i większe firmy). |
| **TED** `api.ted.europa.eu/v3/notices/search` | ogłoszenia o zamówieniach powyżej progów unijnych, w tym polskie, z danymi zamawiającego i wykonawcy | bez klucza (zapytanie POST, składnia `buyer-country="POL"`) | **zmierzone.** Uzupełnia BZP, który ma zamówienia krajowe. |
| **CORDIS** `cordis.europa.eu/data` | projekty Horizon Europe i H2020 z polskimi uczestnikami, kwoty dofinansowania | ZIP z CSV, 36 MB, bez klucza | **zmierzone (nagłówek HTTP).** Pieniądze, których nie ma w polskich listach — Komisja płaci bezpośrednio beneficjentowi. |
| **Kohesio** `kohesio.ec.europa.eu`, SPARQL `query.linkedopendata.eu` | projekty polityki spójności 2014–2020 z beneficjentami, dla całej UE | CSV/XLSX i RDF, bez klucza | z dokumentacji. Dla Polski nie daje nic ponad listy MFiPR, ale pozwala porównać gminę z regionami w UE. |
| **TAM** (unijny rejestr pomocy państwa) | **nic** | — | **sprawdzone 18.09.2026: Polska nie korzysta z TAM.** Publikuje w SUDOP (przemysł) i SRPP (rolnictwo). Nie ma unijnej drogi na skróty do polskiej pomocy publicznej. |

## Wymagają klucza — do decyzji

| Źródło | Co daje | Klucz |
|---|---|---|
| **GUS REGON (BIR 1.1)** | dane firm i JDG po NIP/REGON/KRS, PKD, adresy | darmowy, na wniosek e-mail |
| **CEIDG API** | jednoosobowe działalności gospodarcze | darmowy token JWT po rejestracji |
| **API KRS pełne** | dane niezanonimizowane | zgoda ministra, logowanie |

## Odrzucone — z powodem

| Źródło | Powód |
|---|---|
| **CRBR** (beneficjenci rzeczywiści) `bramka-crbr.mf.gov.pl` | Zawiera wyłącznie osoby fizyczne. Po wyroku TSUE z 22.11.2022 (C‑37/20, C‑601/20) powszechny dostęp do takich rejestrów jest prawnie wątpliwy. Nie publikujemy. |
| **KRZ** (Krajowy Rejestr Zadłużonych) | Brak API — ministerstwo dopiero je planuje. Wyszukiwarka zawiera głównie osoby fizyczne. |
| **TAM** (unijny rejestr pomocy państwa) | Polska z niego nie korzysta — pomoc publikuje w SUDOP i SRPP. |
| **Słownik gmin z API UOKiK** jako podstawa okręgów | Zastąpiony plikiem PKW, który mówi, gdzie gmina naprawdę głosowała. Słownik SUDOP pobieramy tylko po to, żeby znać 7-cyfrowe kody SUDOP. |

## Katalogi, w których szukać dalej

- **dane.gov.pl** — `api.dane.gov.pl/1.4/search?q=…` (w `curl` dodaj `-g`, bo nawiasy `model[terms]` są wzorcem).
- **otwarteapi.pl** — katalog 92 publicznych API (11 polskich), z informacją o kluczach.

## Pułapki zmierzone przy przeglądzie

1. **Listy UE mają twarde spacje (U+00A0) w nagłówkach** — „Miejsce␣realizacji”, „(w␣zł)”. Porównanie nagłówka bez normalizacji zatrzymało import (i dobrze, że zatrzymało, a nie przepuściło).
2. **Lista 2014–2020 podaje miejsce realizacji tylko do powiatu.** Do gminy da się przypisać wyłącznie projekty w miastach na prawach powiatu.
3. **Plik ministerstwa ma uszkodzone znaki już u źródła** (U+FFFD: „Mst��w”, „MA��OPOLSKIE”) i nazwy ucięte limitem komórki („Wąbrz”). Nie naprawiamy ich zgadywaniem — zostają niedopasowane (81 z 55 413 lokalizacji 2021–2027).
4. **Projekty Interreg 2014–2020 mają kwoty w euro** (167 projektów) — nie sumujemy ich ze złotymi.
5. **Eksport CSV z API SUDOP jest wadliwy**: pola z przecinkami nie są w cudzysłowie (28 kolumn w nagłówku, 29 w wierszu).
6. **Około 21 % beneficjentów funduszy UE** (3 482 z 16 347) nie ma w nazwie żadnego znacznika formy prawnej — wśród nich są imiona i nazwiska. Nazwy pokazujemy tylko wtedy, gdy widać, że to nie osoba (`src/lib/prywatnosc.ts`).
