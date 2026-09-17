# SUDOP — co przeoczyliśmy i co z tego wynika

Zapis z 17.09.2026. Dotyczy też projektu „obywatel”, w którym obowiązuje
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

## Co z tego wynika — do decyzji Pawła

**Przesłanka D13 „kolejka nie oddaje wyniku przed jego wygaśnięciem” dziś nie
zachodzi.** Zostaje przesłanka mocniejsza: urząd napisał, że ruch przekracza
jego możliwości. Skala importu całego kraju:

- trzy gminy dały 0,4–1,6 przypadku na mieszkańca (średnio 0,9) — to gminy
  nietypowe (siedziba PGE, turystyka i pomoc covidowa), więc szacunek jest zgrubny:
  **15–34 mln przypadków** na cały kraj,
- to **3,5–5,5 tys. zapytań** (każda gmina co najmniej jedno, duże po kilka
  stron po 10 tys. wierszy), przy 2–7 minutach na zapytanie
  → **od tygodnia do miesiąca ciągłej pracy** przy jednym zapytaniu naraz,
- **rozmiar**: 80 698 przypadków to 114 MB surowego JSON-u i 56 MB w SQLite
  (z indeksami). Cały kraj: **20–50 GB JSON-u i 10–25 GB bazy**. Tego nie da się
  wdrożyć obok aplikacji jak dzisiejszej `sejm.db` — przy pełnym imporcie
  trzeba by trzymać tylko agregaty gmin i czołówkę beneficjentów,
  a szczegóły zostawić pod odnośnikiem do SUDOP.

Trzy drogi:

1. **Wysłać urzędowi pismo** (projekt w `obywatel/docs/uokik-odpowiedz-projekt.md`)
   uzupełnione o dzisiejszy pomiar i konkretną prośbę: eksport zbiorczy albo
   zgoda na powolny import (np. jedno zapytanie na 10 minut, nocą).
2. **Importować powoli bez zgody** — technicznie gotowe, ale to dokładnie ta
   sytuacja, przed którą chroni D13.
3. **Zostać przy gminach pokazowych** i czekać na odpowiedź urzędu.

Rekomendacja: 1, a do czasu odpowiedzi — 3.

### Projekt pisma w starym repozytorium trzeba przepisać przed wysłaniem

`obywatel/docs/uokik-odpowiedz-projekt.md` (status: niewysłane) po dzisiejszym
pomiarze zawiera dwa zdania, które **nie są już prawdziwe**, i jedno niepełne:

1. **„W żadnym z dwóch przypadków wynik nie stał się dostępny (…) wynik nie może
   zostać odebrany niezależnie od cierpliwości odpytującego”.** Ścieżka z kolejką
   oddała wynik po 3–7 minutach, za każdym z zapytań. 12.09 używaliśmy
   drugiego wariantu wyszukiwania, nie tego, który opisał urząd.
2. **Niepełne: „odpytujemy wyłącznie adres zwrócony w nagłówku `Location`”.**
   To prawda, ale pismo nie mówi, że rejestrowaliśmy wyszukanie przez
   `przypadki-pomocy-bez-kolejki`. Uczciwiej napisać wprost, że to był nasz
   wybór i że w wariancie z kolejką usługa działa.
3. **„Dziś nie pobieramy przez API żadnych danych o przypadkach pomocy”** —
   17.09 pobraliśmy przez API dane trzech gmin (liczba zapytań w tabeli wyżej,
   plus jedno kontrolne).

Co w piśmie zostaje aktualne i najcenniejsze: kim jesteśmy, że chcemy jednego
zapytania na gminę, prośba o **eksport zbiorczy** i o przyrost „zmienione po
dacie”. Do tego warto dopisać konkretną skalę: ile zapytań wymaga cały kraj
(szacunek wyżej) i propozycję tempa, na które urząd mógłby się zgodzić.

## Warunki ponownego wykorzystania (z instrukcji UOKiK)

Bezpośrednio przy danych trzeba podać: dokładne źródło (link), datę pobrania,
informację, że dane mogą ulec zmianie, że za ich kompletność i poprawność
odpowiadają podmioty udzielające pomocy, że dane są pomocnicze wobec
zaświadczeń beneficjenta i że baza zawiera dane osobowe (RODO).
Strona gminy (`src/app/gmina/[teryt]/page.tsx`) spełnia to w bloku pod danymi.
