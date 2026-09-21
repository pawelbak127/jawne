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

**Pomiar krajowy: cała Polska z jednego dnia, jednym zapytaniem.**

```
70 × forma-pomocy-kod (cały słownik) + dzień 2026-09-15
303 -> kolejka, gotowe po 4 min
3 531 przypadków, 1 150 gmin, 19 form, 4,3 MB — JEDNA strona
```

Kontrola spójności na dwóch mniejszych zapytaniach tego samego dnia:
A1.1 sam → 311, A1.1+A1.4 → 480, A1.1+A2.5 → 2 933. Powtórzony parametr
sumuje zbiory, a liczby się domykają.

**Cały kraj z jednego dnia mieści się w jednej stronie odpowiedzi**
(limit 10 000 wierszy) i kosztuje urząd jedno zapytanie.

**Import umie już oba tryby** (`ingest/jobs/sudop.ts`):

```
--gminy=100101,100102          cale 10 lat wskazanych gmin
--przyrost=2026-09-15..2026-09-17   wszystkie gminy z tych dni, jedno zapytanie na strone
```

Tryb przyrostowy sprawdzony na prawdziwej odpowiedzi z 15.09 (bez dodatkowego
zapytania do urzędu): 3 531 wierszy, zapisane 3 530 z 1 026 gmin, pominięty
1 wiersz jednostki bez gminy. Dla trzech gmin pobranych wcześniej osobno
liczby i kwoty wyszły **identyczne** — dwie niezależne drogi zapytań dają ten
sam wynik.

**Co z tego wynika dla importu.**

| Zadanie | Sposób | Koszt dla urzędu |
|---|---|---|
| Przyrost dzienny dla całego kraju | 70 form pomocy + jeden dzień; każdy dzień dwa razy (świeży i po 14 dniach) | **2 zapytania na dobę** (zmierzone) |
| Uzupełnienie historii (10 lat) | cięcie po formie pomocy i miesiącach, strony po 10 tys. | tysiące zapytań — to jest ta część, na którą trzeba zgody |

Zwykły dzień to 3 531 przypadków, czyli ok. 0,9 mln na rok roboczy. Lata
2020–2021 mają w naszych danych 7,8 razy więcej przypadków niż rok zwykły
(pomoc covidowa). Stąd szacunek dla kraju na 10 lat: **około 20 mln rekordów**,
czyli ~2 tys. stron po 10 tys. wierszy i **13–15 GB w bazie**.

## Pomiary z 18.09.2026 — pierwszy przebieg w GitHub Actions

**Dzień pobrany następnego dnia jest niekompletny.** Czwartek 17.09 pobrany
18.09 miał 200 przypadków; czwartki pobrane po 3–4 tygodniach — 5 657 i 7 850.
Powód jest w przepisach: podmiot udzielający pomocy ma **7 dni** na przesłanie
sprawozdania do SHRIMP, a korekty kolejne 7 dni od uzyskania informacji
(§ 6 ust. 2 rozporządzenia RM z 7.08.2008, [UOKiK](https://uokik.gov.pl/sprawozdawanie-udzielonej-pomocy-publicznej)).

Z tego wynika reguła: **dzień jest ustalony, gdy od jego daty do pobrania
minęło 14 dni** (7 dni ustawowych i tydzień zapasu na publikację w SUDOP).
Strony liczą sumy wyłącznie z dni ustalonych (`DNI_DO_USTALENIA` w
`src/lib/dane.ts`) i mówią, ile świeżych pominęły. Dlatego każdy dzień
pobieramy dwa razy: dzień później (świeży, dla „co nowego”) i po 14 dniach
(`--odswiez`). To dwa zapytania na dobę, nie jedno.

**Weekendy są prawie puste**: 18–124 przypadków wobec 4–20 tys. w dni robocze.
Wtorki potrafią mieć 14–20 tys. (zbiorcze decyzje, np. dopłaty do wynagrodzeń).

**Pora dnia ma znaczenie.** Przebieg zaplanowany na 04:17 UTC GitHub uruchomił
o 09:00 UTC (opóźnienie harmonogramu po stronie GitHuba), a kolejka urzędu
w godzinach pracy czekała **54 minuty** — w nocy 2–9. Przy 62-minutowym
horyzoncie to blisko porażki. Cron przesunięty na 01:17 UTC.

**Data pobrania jest w pliku, nie w chwili importu.** Dane z Actions
importujemy lokalnie nawet kilka dni później; gdyby liczyła się data importu,
świeży dzień wyglądałby na ustalony. Każda zapisana odpowiedź ma pole
`pobrano`, a nowsza wersja pliku wygrywa ze starszą.

## Co z tego wynika — do decyzji Pawła

**Przesłanka D13 „kolejka nie oddaje wyniku przed jego wygaśnięciem” dziś nie
zachodzi.** Zostaje przesłanka mocniejsza: urząd napisał, że ruch przekracza
jego możliwości. Skala importu całego kraju:

- szacunek **około 20 mln przypadków** na cały kraj (z pomiaru krajowego wyżej,
  nie z ekstrapolacji po liczbie mieszkańców),
- to **ok. 2 tys. zapytań** przy cięciu po dniach albo formach (a nie 4–6 tys.
  przy pytaniu o każdą gminę), po 2–9 minut każde → **ok. 7–12 dni ciągłej
  pracy** przy jednym zapytaniu naraz,
- **rozmiar**: 80 698 przypadków to 114 MB surowego JSON-u i 56 MB w SQLite
  (z indeksami), czyli ok. 700 bajtów na rekord. Cały kraj: **15–20 GB bazy**.

**Decyzja rozpada się na dwie, bo koszty są nieporównywalne.**

| | Koszt dla urzędu | Co daje | Rekomendacja |
|---|---|---|---|
| **Przyrost dzienny** (cały kraj, jedno zapytanie na dobę) | 1–2 zapytania | serwis pokazuje nową pomoc dla wszystkich 2 477 gmin | zacząć, ale dopiero po odpowiedzi urzędu albo po wyraźnej zgodzie Pawła — D13 mówi o zamiarze, nie o liczbie zapytań |
| **Historia 10 lat** | ok. 2 tys. zapytań, 7–12 dni | pełne dane wstecz | nie robić bez zgody urzędu; prosić o eksport zbiorczy |
| **Gminy pokazowe na żądanie** | kilka zapytań na gminę | strona gminy działa tam, gdzie pobrano | robić dalej, ręcznie |

Rozmiar bazy przy pełnej historii (15–20 GB) i tak wymusiłby zmianę: trzymamy
agregaty gmin i czołówkę beneficjentów, a nie 25 mln pojedynczych rekordów.

**Decyzja Pawła z 19.09.2026: historia od pierwszej nocy serwera.** Tempo:
najwyżej 25 zapytań na noc, nowe zapytanie tylko 01:00–06:00 czasu polskiego,
jedno naraz — ok. 80 nocy na całe okno.

**Zmierzona pierwsza noc (21.09.2026):** 25 zapytań w 59 minut z pięciu godzin
okna, kolejka oddawała wynik najczęściej po minucie (najdłużej 14), zysk to
41 dni historii i ok. 213 tys. przypadków. Kontrola spójności zadziałała przy
pierwszym zetknięciu z urzędem: strona 1 zakresu 2–14.09 pochodziła z 18.09
i miała 62 177 wyników, nowa strona 2 — już 62 690, więc stara strona została
pobrana ponownie.

**Decyzja Pawła z 21.09.2026: 50 zapytań na noc** (urząd nie odpowiedział na
pismo z 12.09). To ok. dwie godziny okna i ok. 45 nocy do pełnych 10 lat.
Pilnuje tego kod (`sudop.ts
--historia`: limit powyżej 50 odrzucony, poza oknem zapytanie się nie zaczyna),
nie tylko harmonogram. Kolejność nocy: przerwane zakresy, dni do odświeżenia,
dziury, historia tygodniami wstecz (`ingest/lib/harmonogram.ts`). Serwer:
[`serwer.md`](serwer.md).

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
