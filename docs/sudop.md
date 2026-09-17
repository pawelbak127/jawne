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
2. **62-minutowy pomiar z 12.09 odpytywał wyłącznie ścieżkę `bez-kolejki`**
   (`/api/wynik/{id}`). Ścieżka **z kolejką** — ta, którą opisał urząd w liście
   („sprawdzać `/api/kolejka/{id}` co ~60 s, `303` = gotowe”) i ta z przykładów
   w instrukcji — była odpytywana najwyżej sześć minut (sonda 29, co 10 s).

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

| Gmina | Przypadków | Stron = zapytań | Czas |
|---|---:|---:|---:|
| Bełchatów (miasto) | 34 808 | 4 | 16 min |

(pozostałe dopisać po zakończeniu importu)

Kształt odpowiedzi potwierdza specyfikację: 28 pól, `gmina-siedziby-kod` ma
7 cyfr (TERYT + rodzaj), kwoty jako tekst z kropką dziesiętną.

## Co z tego wynika — do decyzji Pawła

**Przesłanka D13 „kolejka nie oddaje wyniku przed jego wygaśnięciem” dziś nie
zachodzi.** Zostaje przesłanka mocniejsza: urząd napisał, że ruch przekracza
jego możliwości. Skala importu całego kraju:

- 2 477 gmin, gminy miejsko-wiejskie pytane jednym zapytaniem o trzy kody,
- miasto średniej wielkości (Bełchatów, 51 tys. mieszkańców) = 4 strony,
- szacunkowo **kilka tysięcy zapytań** na cały kraj, każde kilka minut w kolejce
  → **tygodnie ciągłej pracy** przy jednym zapytaniu naraz.

Trzy drogi:

1. **Wysłać urzędowi pismo** (projekt w `obywatel/docs/uokik-odpowiedz-projekt.md`)
   uzupełnione o dzisiejszy pomiar i konkretną prośbę: eksport zbiorczy albo
   zgoda na powolny import (np. jedno zapytanie na 10 minut, nocą).
2. **Importować powoli bez zgody** — technicznie gotowe, ale to dokładnie ta
   sytuacja, przed którą chroni D13.
3. **Zostać przy gminach pokazowych** i czekać na odpowiedź urzędu.

Rekomendacja: 1, a do czasu odpowiedzi — 3.

## Warunki ponownego wykorzystania (z instrukcji UOKiK)

Bezpośrednio przy danych trzeba podać: dokładne źródło (link), datę pobrania,
informację, że dane mogą ulec zmianie, że za ich kompletność i poprawność
odpowiadają podmioty udzielające pomocy, że dane są pomocnicze wobec
zaświadczeń beneficjenta i że baza zawiera dane osobowe (RODO).
Strona gminy (`src/app/gmina/[teryt]/page.tsx`) spełnia to w bloku pod danymi.
