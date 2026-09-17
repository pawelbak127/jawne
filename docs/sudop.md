# SUDOP — co przeoczyliśmy i co z tego wynika

Zapis z 17–18.09.2026. Dotyczy też projektu „obywatel”, w którym obowiązuje
decyzja D13 („nie automatyzujemy wyszukiwarki SUDOP”).

## Wynik w jednym zdaniu

**API SUDOP zwraca dane.** Jedno zapytanie ścieżką z kolejką, odpytywane
co 60 sekund, dało wynik po 4 minutach — pierwszy raz w historii obu projektów.

## Co zostało przeoczone

1. **Oficjalna instrukcja UOKiK** (dane.gov.pl, zbiór 6068, DOCX z 5.09.2025)
   nigdy nie była czytana. Podaje:
   - format dat `RRRR-MM-DD` (sonda 32 celowo unikała dat, bo „format nieznany”),
   - limit **15 zapytań na minutę**,
   - okno danych **10 lat** (od 1 stycznia roku n−10) — zapytanie kontrolne
     z 12.09 dotyczyło przypadku z 2008 r., czyli spoza okna,
   - warunki ponownego wykorzystania danych (poniżej),
   - że baza zawiera dane osobowe (RODO).
2. **62-minutowy pomiar z 12.09 (sonda 32) rejestrował wyszukanie wyłącznie
   przez wariant `przypadki-pomocy-bez-kolejki`** i odpytywał adres, który ten
   wariant zwrócił. Wariant **z kolejką** (`przypadki-pomocy` →
   `/api/kolejka/{id}`) — ten, który opisał urząd w liście („sprawdzać co ~60 s,
   `303` = gotowe”) i ten z przykładów w instrukcji — był odpytywany najwyżej
   sześć minut (sonda 29, co 10 s).

## Pomiary z 17.09.2026

### Zapytanie kontrolne — przykład z instrukcji urzędu

```
14:57:10  GET /api/przypadki-pomocy?nip-beneficjenta=7791011327
              &dzien-udzielenia-pomocy-od=2020-01-01&dzien-udzielenia-pomocy-do=2022-12-31
          303 -> /api/kolejka/300806c1-…
14:58–15:00  200 "Przygotowywanie odpowiedzi…"  (3 razy, co 60 s)
15:01:10  303 -> /api/wynik/afbd5ad7-…
          200, 3 przypadki, 28 pól
          ?csv=true: 200, ale CSV wadliwy (pola z przecinkami bez cudzysłowu)
```

Sonda: `scripts/sondy/sudop-kolejka.mjs` (jedno zapytanie na uruchomienie).

### Import trzech gmin pokazowych

`ingest/jobs/sudop.ts --gminy=100101,100102,121701` — jedno zapytanie w toku,
kolejka co 60 s.

| Gmina | Mieszkańców | Przypadków | Beneficjentów | Suma brutto | Stron = zapytań | Czas |
|---|---:|---:|---:|---:|---:|---:|
| Bełchatów (miasto) 100101 | 50 961 | 34 808 | 4 503 | 13,24 mld zł | 4 | 16 min |
| Bełchatów (gmina wiejska) 100102 | 13 340 | 5 283 | 1 046 | 56,7 mln zł | 1 | 3 min |
| Zakopane 121701 | 24 921 | 40 607 | 5 091 | 483 mln zł | 5 | 19 min |

Każda strona czekała w kolejce **2–7 minut**. Razem 17.09: **11 zapytań**
(10 importu + 1 kontrolne), jedno naraz, żadnych błędów.
Zakres dat w danych: 2 stycznia 2017 – 15 września 2026 (okno 10 lat).
W mieście Bełchatów 97 % sumy to jeden beneficjent — PGE GiEK (12,84 mld zł,
głównie od PSE i ministra klimatu). Pojedyncza firma potrafi zdominować sumę
gminy, więc strona pokazuje też udzielających, przeznaczenia i czołówkę
beneficjentów, a nie samą kwotę.

Kształt odpowiedzi potwierdza specyfikację: 28 pól, `gmina-siedziby-kod` ma
7 cyfr (TERYT + rodzaj), kwoty jako tekst z kropką dziesiętną.

## Pomiary z 18.09.2026 — specyfikacja i własne zapytania

Wszystko poniżej odczytane ze specyfikacji OpenAPI usługi albo zmierzone
własnym zapytaniem, nie przepisane z notatek.

**Kształt interfejsu.**

- **Wszystkie parametry są opcjonalne**, ale zapytanie o same daty dostaje
  `HTTP 400`: „Nie podano żadnych wymaganych kryteriów. Dodaj kryteria
  wyszukiwania inne niż strona oraz dzień udzielenia pomocy”. Odmowa przychodzi
  natychmiast i **nie zajmuje miejsca w kolejce** — takie próby są darmowe.
- **Parametr można powtarzać** — nie tylko `gmina-siedziby-kod`, ale też
  `forma-pomocy-kod`. To zmienia sposób cięcia zbioru: nie trzeba pytać
  o 2 477 gmin osobno.
- **Rekord nie ma daty modyfikacji** (28 pól, żadne nie mówi o aktualizacji).
  Przyrost da się dociągać po `dzien-udzielenia-pomocy`, ale korekt starych
  wpisów nie da się wychwycić inaczej niż ponownym pobraniem.
- Słowniki (bez kolejki, zwykły `GET`): formy pomocy 70, przeznaczenia 450,
  środki pomocowe 1 848, sektory 3 518, gminy 4 155.

**Pomiar krajowy: jeden dzień, dwie formy pomocy.**

```
forma-pomocy-kod=A1.1 & forma-pomocy-kod=A2.5, dzień 2026-09-15
303 -> kolejka, gotowe po 4 min
2 933 przypadki, 1 028 gmin, 97 podmiotów udzielających, 3,5 MB
```

W trzech pobranych gminach te dwie formy to 63,5 % rekordów, więc cała Polska
w jednym dniu to rząd **4–5 tysięcy przypadków — mieści się w jednej stronie
odpowiedzi (10 000 wierszy)**.

**Co z tego wynika dla importu.**

| Zadanie | Sposób | Koszt dla urzędu |
|---|---|---|
| Przyrost dzienny dla całego kraju | jedno zapytanie: wszystkie formy pomocy + zakres jednego dnia | **1–2 zapytania na dobę** |
| Uzupełnienie historii (10 lat) | cięcie po formie pomocy i miesiącach, strony po 10 tys. | tysiące zapytań — to jest ta część, na którą trzeba zgody |

Lata 2020–2021 mają w naszych danych ~7,8 razy więcej przypadków niż rok
zwykły (pomoc covidowa). Stąd szacunek dla kraju na 10 lat: **rzędu 20–30 mln
rekordów**, czyli 2–3 tys. stron po 10 tys. wierszy i **15–20 GB w bazie**.

## Co z tego wynika — do decyzji Pawła

**Przesłanka D13 „kolejka nie oddaje wyniku przed jego wygaśnięciem” dziś nie
zachodzi.** Zostaje przesłanka mocniejsza: urząd napisał, że ruch przekracza
jego możliwości. Skala importu całego kraju:

- szacunek **20–30 mln przypadków** na cały kraj (z pomiaru krajowego wyżej,
  nie z ekstrapolacji po liczbie mieszkańców),
- to **2–3 tys. zapytań** przy cięciu po formie pomocy (a nie 4–6 tys. przy
  pytaniu o każdą gminę), po 2–7 minut każde → **ok. 8–15 dni ciągłej pracy**
  przy jednym zapytaniu naraz,
- **rozmiar**: 80 698 przypadków to 114 MB surowego JSON-u i 56 MB w SQLite
  (z indeksami), czyli ok. 700 bajtów na rekord. Cały kraj: **15–20 GB bazy**.

**Decyzja rozpada się na dwie, bo koszty są nieporównywalne.**

| | Koszt dla urzędu | Co daje | Rekomendacja |
|---|---|---|---|
| **Przyrost dzienny** (cały kraj, jedno zapytanie na dobę) | 1–2 zapytania | serwis pokazuje nową pomoc dla wszystkich 2 477 gmin | zacząć, ale dopiero po odpowiedzi urzędu albo po wyraźnej zgodzie Pawła — D13 mówi o zamiarze, nie o liczbie zapytań |
| **Historia 10 lat** | 2–3 tys. zapytań, 8–15 dni | pełne dane wstecz | nie robić bez zgody urzędu; prosić o eksport zbiorczy |
| **Gminy pokazowe na żądanie** | kilka zapytań na gminę | strona gminy działa tam, gdzie pobrano | robić dalej, ręcznie |

Rozmiar bazy przy pełnej historii (15–20 GB) i tak wymusiłby zmianę: trzymamy
agregaty gmin i czołówkę beneficjentów, a nie 25 mln pojedynczych rekordów.

### Pismo zostało wysłane w starej formie — potrzebne sprostowanie

Paweł wysłał pismo z `obywatel/docs/uokik-odpowiedz-projekt.md` **przed** tymi
pomiarami. Zawiera ono dwa zdania, które pomiar z 17.09 obala: że wynik nie może
zostać odebrany oraz że nie pobieramy przez API żadnych danych. Pierwsze jest
zarzutem wobec systemu urzędu opartym na naszym błędzie (odpytywaliśmy wariant
`bez-kolejki`). Projekt sprostowania: [`uokik-sprostowanie.md`](uokik-sprostowanie.md).

**Wniosek na przyszłość:** wniosek z cudzego pomiaru (także z naszego sprzed
tygodnia) nie jest faktem, dopóki go nie powtórzymy. Pismo do instytucji
powtarza pomiar w dniu wysłania.

## Warunki ponownego wykorzystania (z instrukcji UOKiK)

Bezpośrednio przy danych trzeba podać: dokładne źródło (link), datę pobrania,
informację, że dane mogą ulec zmianie, że za ich kompletność i poprawność
odpowiadają podmioty udzielające pomocy, że dane są pomocnicze wobec
zaświadczeń beneficjenta i że baza zawiera dane osobowe (RODO).
Strona gminy (`src/app/gmina/[teryt]/page.tsx`) spełnia to w bloku pod danymi.
