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
| **GUS Bank Danych Lokalnych** `bdl.stat.gov.pl/api/v1` | ludność gmin (72305) oraz budżety: dochody (76037), dochody własne (76070), wydatki (76477), wydatki majątkowe (76453) i inwestycyjne (76450) — rok 2025, 2 477 gmin | limity z [api.stat.gov.pl/Home/BdlApi](https://api.stat.gov.pl/Home/BdlApi): bez klucza 5/s, **100 na 15 min**, 1 000 na 12 h, 10 000 na 7 dni; z kluczem (`X-ClientId`, zmienna `GUS_BDL_KLUCZ`) 10/s, 500 na 15 min, 5 000 na 12 h, 50 000 na 7 dni. Najciaśniejszy jest limit 15-minutowy — przerwa 1 s go przekraczała (odpowiedź 429). Import czeka 9,5 s bez klucza i 1,9 s z kluczem. Kod jednostki BDL zawiera TERYT | zmierzone |
| **Listy projektów Funduszy Europejskich** (MFiPR, dane.gov.pl, zbiory 13939 i 1176) | 34 348 projektów 2021–2027 i 103 824 z 2014–2020: beneficjent, wartość, dofinansowanie UE, miejsce realizacji | XLSX aktualizowany co miesiąc; adres pliku zmienia się — pytamy katalog | zmierzone |
| **SUDOP** (UOKiK) `api-sudop.uokik.gov.pl/sudop-api` | pomoc publiczna i de minimis: beneficjent z NIP, udzielający, forma, przeznaczenie, wartość, gmina siedziby | bez klucza, **kolejka**; 15 zapytań/min; okno 10 lat; tylko ręcznie, dla wskazanych gmin — patrz `docs/sudop.md` | zmierzone |
| **Imiona w rejestrze PESEL** (MC, dane.gov.pl, zbiór 1667) | 2 324 imiona noszone przez ≥ 200 osób — do rozpoznawania nazw jednoosobowych firm | XLSX raz w roku; wynik w `src/lib/imiona-pesel.ts` | zmierzone |
| **dane.gov.pl** `api.dane.gov.pl/1.4` | katalog zbiorów, adresy aktualnych plików | bez klucza; stronicowanie potrafi zwrócić ten sam zasób dwa razy | zmierzone |

## SMUP — zmierzone 21.09.2026, klucz jest

**System Monitorowania Usług Publicznych** (GUS), `https://api.smup.gov.pl/api/1.0.0/`.
Klucz w nagłówku **`X-ClientId`** — tak samo jak w BDL; u nas `SMUP_KLUCZ`
w `.env.local`. Specyfikacja: `https://api.smup.gov.pl/apidocs/pl/smup.json`
(47 kB, 13 ścieżek). Sonda: `scripts/sondy/api-sonda.mjs --klucz-z=SMUP_KLUCZ`.

Hierarchia: **obszar → usługa → wskaźnik → dane**.

| Co zmierzone | Wynik |
|---|---|
| Obszary (`areas-list`) | **10**: Edukacja, Lokalna polityka społeczna, Kultura i rekreacja, Drogownictwo i Transport, Ochrona Środowiska, Gospodarowanie nieruchomościami, Inwestycje i budownictwo, Geodezja i kartografia, **Podatki i opłaty lokalne**, **Finanse JST** |
| Wskaźniki (`indicator-list`) | **1 285**, każdy z wymiarem i pozycją (np. „Kwota podatku od nieruchomości od osób prawnych rozłożonego na raty… w relacji do dochodów z tytułu tego podatku”) |
| Dane (`indicator-date-data?id=…&id-daty=…`) | wiersz: `{id, id-daty, id-teryt, id-flaga, wartosc, precyzja}` — **wartość na jednostkę terytorialną**. Jeden wskaźnik i rok to ok. 2 975 wierszy, czyli **jedno zapytanie** przy `page-size=5000` (maksimum) |
| Lata (`data-dictionary`) | roczne, `id-daty` = `RRRR1231`, od **2010** |
| Słownik TERYT (`teryt-dictionary`) | 4 597 jednostek w jednym zapytaniu; pola `woj`+`pow`+`gmn` składają się na **nasz 6-cyfrowy TERYT** (sprawdzone: Bełchatów miasto 10+01+01 = 100101, gmina wiejska = 100102), `rodz` jak w BDL — 1, 2, 3 to gminy, 4 i 5 to części gminy miejsko-wiejskiej (pułapka 30), są też 18 dzielnic Warszawy |
| Flagi (`flag-dictionary`) | 6 wartości, w tym rozróżnienie, na którym nam zależy: **„Zjawisko nie wystąpiło” (zero) ≠ „Brak informacji, konieczność zachowania tajemnicy statystycznej” (null)** — zasada 4 z `CLAUDE.md` ma w tym źródle odpowiednik wprost |
| Czas odpowiedzi | 0,2–0,4 s, bez kolejki |

**Czego nie wiem:** limitów zapytań (specyfikacja ich nie podaje — w BDL są
i są ciasne, więc zakładam, że tu też jakieś są), ani od którego roku każdy
wskaźnik ma dane.

**Zaimportowane 22.09.2026** (`npm run import smup`, lista miar w
`ingest/lib/smup.ts`): 15 miar × 10 lat (2016–2025) = **364 119 wartości dla
2 477 gmin**, 86 sekund. Miary: wynik budżetu, nadwyżka operacyjna, dług
i dług do dochodów, udział wydatków majątkowych i wynagrodzeń, pokrycie
inwestycji dochodami majątkowymi oraz osiem miar podatku od nieruchomości
(dochód na mieszkańca, udział w dochodach własnych, dochody utracone przez
obniżone stawki, zwolnienia uchwalone przez radę, umorzenia i zaległości —
osobno dla osób prawnych i fizycznych).

**Zmierzone przy imporcie:**

- **Wskaźnik bez danych za dany rok oddaje `HTTP 404`, nie pustą tablicę.**
  Wskaźnik 16 ma 2024, nie ma 2025; budżetowe mają oba. Import traktuje to
  jak odpowiedź (raportuje 3 pary miara-rok), nie jak awarię.
- **Osobne wskaźniki dla gmin i dla miast na prawach powiatu.** Wariant
  „…budżetów gmin” oddaje 2 477 wierszy — bez 66 miast. Miary budżetowe
  składamy z dwóch wskaźników; podatkowe mają jeden wspólny (2 971 wierszy,
  wszystkie szczeble).
- **Kontrola drugą drogą:** udział wydatków majątkowych z SMUP wobec tego
  samego udziału policzonego z budżetów GUS BDL — 2 477 gmin, średnia różnica
  **0,25 pkt proc.**, maksymalna 0,50. Dokładnie tyle, ile daje zaokrąglenie
  SMUP do pełnych procent: mapowanie TERYT i skala są poprawne.
- **5 gmin ze słownika SMUP nie ma w naszej liście PKW 2023** (120713, 080910,
  320304, 022109, 200216) — raportowane i pomijane, nie po cichu.
- Flagi w danych: 332 093 „zjawisko wystąpiło”, 29 403 „nie wystąpiło”
  (zmierzone zero), 2 181 „brak informacji” (zapisane jako `null`), 442
  „wartość mniejsza niż format”.

**Koszt pełnego importu** wszystkich 1 285 wskaźników × 15 lat to ok. 19 tys.
zapytań — dlatego bierzemy wybór, nie całość.

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
| **TED** `api.ted.europa.eu/v3/notices/search` | ogłoszenia o zamówieniach powyżej progów unijnych, w tym polskie, z danymi zamawiającego i wykonawcy | bez klucza (zapytanie POST, składnia `buyer-country="POL"`) | **zmierzone 19.09.2026: `winner-identifier="NIP"` znajduje zamówienia wygrane przez firmę** (dla polskich ogłoszeń identyfikatorem jest NIP). Pola: `notice-title`, `buyer-name`, `winner-name`, `total-value`, `notice-type` (`can-standard` = udzielenie zamówienia). **Pułapka:** `total-value` to wartość całego ogłoszenia — wszystkich części i wszystkich wykonawców (zmierzone: jedno ogłoszenie z dwoma wpisami tego samego wykonawcy). Nie wolno jej przypisać firmie wprost. Uzupełnia BZP, który ma zamówienia krajowe. |
| **CORDIS** `cordis.europa.eu/data` | projekty Horizon Europe i H2020 z polskimi uczestnikami, kwoty dofinansowania | ZIP z CSV, 36 MB, bez klucza | **zmierzone (nagłówek HTTP).** Pieniądze, których nie ma w polskich listach — Komisja płaci bezpośrednio beneficjentowi. |
| **Kohesio** `kohesio.ec.europa.eu`, SPARQL `query.linkedopendata.eu` | projekty polityki spójności 2014–2020 z beneficjentami, dla całej UE | CSV/XLSX i RDF, bez klucza | z dokumentacji. Dla Polski nie daje nic ponad listy MFiPR, ale pozwala porównać gminę z regionami w UE. |
| **TAM** (unijny rejestr pomocy państwa) | **nic** | — | **sprawdzone 18.09.2026: Polska nie korzysta z TAM.** Publikuje w SUDOP (przemysł) i SRPP (rolnictwo). Nie ma unijnej drogi na skróty do polskiej pomocy publicznej. |

## Wymagają klucza — do decyzji

| Źródło | Co daje | Klucz |
|---|---|---|
| **CEIDG API** | jednoosobowe działalności gospodarcze | darmowy token JWT po rejestracji |
| **API KRS pełne** | dane niezanonimizowane | zgoda ministra, logowanie |

## GUS REGON (BIR 1.2) — klucz jest od 23.09.2026, NIEZMIERZONE

Klucz do środowiska produkcyjnego (zakres danych ogólnodostępnych) przyszedł
e-mailem 23.09.2026. Leży w `.env.local` jako `GUS_BIR_KLUCZ`; na serwerze
`sudo jawne ustaw GUS_BIR_KLUCZ`. **Ani jedno zapytanie nie zostało jeszcze
wykonane — poniżej jest to, co pisze urząd, a nie to, co zmierzyliśmy.**

| | |
|---|---|
| Usługa | `https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc` |
| Protokół | **SOAP** (WSDL), nie REST — sesja przez `Zaloguj`, potem `DaneSzukajPodmioty` |
| Dokumentacja | <https://api.stat.gov.pl/Home/RegonApi> (zakładka „Instrukcja”) |
| Koszt | bezpłatny, bez ograniczenia czasowego |

**Dlaczego to może być ważniejsze, niż wygląda.** Dziś `nazwaPodmiotuJawna`
w `src/lib/prywatnosc.ts` **zgaduje z samej nazwy**, czy beneficjent pomocy
publicznej jest firmą, czy osobą fizyczną (forma prawna w nazwie, lista imion
z PESEL, kod pocztowy). REGON podaje formę prawną **wprost**, po NIP-ie.
Zamiana zgadywania na fakt z rejestru byłaby najpoważniejszym ulepszeniem
reguły prywatności od jej powstania — i zdjęłaby z niej wpadki w rodzaju
„Zakład Fryzjerski Anna …”.

### Z dokumentacji, pobranej 23.09.2026 (nie z pomiaru)

Instrukcję i struktury danych da się pobrać bez logowania:
`api.stat.gov.pl/Content/files/regon/` (dwa archiwa ZIP). Stamtąd:

- **`DaneSzukaj` zwraca pole `Typ`: `F` albo `P`** — osoba fizyczna albo
  prawna. To jest dokładnie ta informacja, którą dziś zgadujemy z nazwy.
  Obok: `Nazwa`, `Wojewodztwo`, `Powiat`, `Gmina`, `Miejscowosc`,
  `KodPocztowy`, `SilosID`.
- **Zapytania zbiorcze są możliwe**: parametr `Nipy` (obok `Nip`), a jedna
  odpowiedź ma najwyżej **100 rekordów** — czyli 100 NIP-ów na wywołanie.
- **Limity podane przez GUS** (godziny polskie):

  | Godziny | Na godzinę | Na minutę | Na sekundę |
  |---|---|---|---|
  | 08:00–16:59 | 6 000 | 120 | 3 |
  | 06:00–07:59 i 17:00–21:59 | 8 000 | 150 | 3 |
  | 22:00–05:59 | 10 000 | 200 | 4 |

  Przekroczenie nie blokuje od razu — urząd pisze, że informuje.
  Przy 100 NIP-ach na wywołanie **93 tys. beneficjentów z dzisiejszej bazy
  to ok. 930 wywołań, czyli kilkanaście minut**. To zupełnie inna skala
  niż SUDOP.
- Sesja: `Zaloguj(klucz)` oddaje identyfikator sesji, który idzie w nagłówku
  kolejnych wywołań; `GetValue('StatusUslugi')` mówi, czy sesja żyje.
- Adresy IP trzeba podać przy rejestracji **tylko wtedy**, gdy klienci łączą
  się przez serwer dostawcy oprogramowania — do sprawdzenia, czy dotyczy nas
  przy przeniesieniu na serwer.

### Czy wolno przechowywać i republikować — sprawdzone 23.09.2026

Instrukcja techniczna i portal API **nie mówią o tym ani słowa** (są tylko
limity i sposób logowania). Odpowiedź jest w dwóch innych miejscach:

1. **Ustawa o statystyce publicznej, art. 45 ust. 1**: „W zakresie informacji,
   o których mowa w art. 42 ust. 1 pkt 1–6, rejestr podmiotów jest **jawny
   i dostępny dla osób trzecich**”. Punkty 1–6 to m.in. nazwa i adres siedziby,
   **forma prawna**, wykonywana działalność (PKD), daty powstania i zakończenia
   oraz numer w rejestrze macierzystym. Punkt 7 (liczba pracujących) jawny NIE
   jest. Dla osób fizycznych punkt 1 obejmuje też nazwisko, miejsce zamieszkania
   i PESEL — to są właśnie „dane niejawne”, których nasz klucz nie obejmuje.
2. **dane.gov.pl, zbiór 544** „Dostęp do danych rejestrowych REGON poprzez
   usługę sieciową – interfejsy API”, wystawiony przez GUS:
   **licencja CC BY 4.0**, aktualizacja codzienna. CC BY pozwala kopiować
   i rozpowszechniać, także w zmienionej formie, **pod warunkiem wskazania
   źródła**.

Czyli: wolno przechowywać i pokazywać, z podaniem źródła. **Do potwierdzenia
u urzędu** zostają cztery drobiazgi, bo żadnego z nich nie da się wyczytać
z dokumentacji — pytanie przygotowane w [`gus-regon-pytanie.md`](gus-regon-pytanie.md):
brzmienie atrybucji, czy limit liczy się na klucz czy na adres IP, czy
wywołanie ze 100 NIP-ami to jedno żądanie i czy trzeba zgłaszać zmianę adresu
IP przy przeniesieniu na serwer.

## Odrzucone — z powodem

| Źródło | Powód |
|---|---|
| **CRBR** (beneficjenci rzeczywiści) `bramka-crbr.mf.gov.pl` | Zawiera wyłącznie osoby fizyczne. Po wyroku TSUE z 22.11.2022 (C‑37/20, C‑601/20) powszechny dostęp do takich rejestrów jest prawnie wątpliwy. Nie publikujemy. |
| **KRZ** (Krajowy Rejestr Zadłużonych) | Brak API — ministerstwo dopiero je planuje. Wyszukiwarka zawiera głównie osoby fizyczne. |
| **TAM** (unijny rejestr pomocy państwa) | Polska z niego nie korzysta — pomoc publikuje w SUDOP i SRPP. |
| **Słownik gmin z API UOKiK** jako podstawa okręgów | Zastąpiony plikiem PKW, który mówi, gdzie gmina naprawdę głosowała. Słownik SUDOP pobieramy tylko po to, żeby znać 7-cyfrowe kody SUDOP. |

## Sondy z 20.09.2026 — co naprawdę przyszło

Osiem kandydatów wypisanych z pamięci, odpytanych tego samego dnia
narzędziami z `scripts/sondy/` (`api-sonda.mjs`, `dane-gov-szukaj.mjs`,
`sejm-sciezka.mjs`). Wyniki negatywne zostają — oszczędzają następnej sesji
tej samej drogi.

| Kandydat | Wynik sondy | Co dalej |
|---|---|---|
| **API Sejmu: `processes`, `prints`, `interpellations`, `writtenQuestions`, transkrypcje, `committees`, `bills`** | **ścieżki potwierdzone** w OpenAPI (`api.sejm.gov.pl/sejm/openapi/`, 133 kB YAML) i w dokumentacji: `…/term10/processes?offset=0`. **Ale o 19:40–19:55 CEST cała gałąź `/sejm/*` oddawała `404 text/html`** — łącznie z `/MP` i `/clubs`, z których korzysta import. Pięć prób z ponawianiem, bez skutku. Korzeń `api.sejm.gov.pl/` i `/eli/acts` odpowiadały `200` | powtórzyć sondę; kształt odpowiedzi nadal niezmierzony |
| **Rejestr umów (centralny, MF)** | **host `rejestrumow.podatki.gov.pl` nie istnieje** (NXDOMAIN). W dane.gov.pl są tylko rejestry pojedynczych instytucji (Ministerstwo Klimatu, KPRM, Ministerstwo Sprawiedliwości, jednostki GZM) — każdy osobno | znaleźć właściwy adres centralnego rejestru albo uznać, że zbiorczego źródła nie ma |
| **KPO** | zbiór **3190** (ARiMR), 38 zasobów XLSX po ~40 kB, comiesięcznych. Zmierzone w pliku z 31.03.2026: jeden arkusz, 1 498 wierszy, **agregaty po województwach** dla jednego działania (liczba wniosków, kwoty) — nie ma projektów ani beneficjentów | dla strony gminy bezużyteczne; listy projektów KPO szukać poza dane.gov.pl |
| **Polski Ład / RFIL (BGK)** | w katalogu dane.gov.pl nie znaleziono; wyszukiwarka pełnotekstowa oddaje szum (19 663 trafienia, żadne na temat) | sprawdzić u BGK |
| **MF — indywidualne dane podatników CIT** | zbiór 1295 ma **jeden zasób w formacie HTML z 2019 r.** — czyli odnośnik, nie dane | sprawdzić bezpośrednio na podatki.gov.pl |
| **NFZ — umowy ze świadczeniodawcami** | `api.nfz.gov.pl/app-umw-api/agreements` **istnieje i odpowiada** strukturalnym JSON-em, ale zwracał `503 {"error-result":"Maintenance"}`; `/branches` — 404 | powtórzyć sondę po zakończeniu przerwy technicznej |
| **PKW — wybory samorządowe 2024** | w dane.gov.pl nie ma | pobrać ze stron PKW, tak jak plik z 2023 (`ingest/zrodla/`) |
| **PKW — sprawozdania komitetów** | nie sondowane | — |

Przy okazji zmierzone w katalogu dane.gov.pl: `search` oddaje wpisy
z `type: "common"`, a rodzaj trzyma w `attributes.model`; tytuły przychodzą
z podświetleniem `<mark>` w środku; wyszukiwanie pełnotekstowe jest hałaśliwe,
więc szuka się raczej po numerze zbioru niż po frazie.

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
