# Prototyp — kierunek A „Wypis z rejestru”

Otwórz `index.html` w przeglądarce (dwuklik wystarczy, nic nie trzeba
budować). Motyw: przycisk ◐ albo ustawienie systemu. Telefon: wąskie okno
albo narzędzia deweloperskie, 390 px.

| plik | strona | dane |
|---|---|---|
| `glowna.html` | `/` | z `tekst/glowna.txt` |
| `gmina.html` | `/gmina/126101` — Kraków | z `tekst/gmina-krakow.txt` |
| `posel.html` | `/posel/andrzej-adamczyk` | z `tekst/posel.txt` (bez zdjęcia) |
| `firma.html` | `/firma/7690502495` — PGE GiEK | z `tekst/firma.txt` |

**Skąd liczby:** przepisane dosłownie z wyrenderowanego tekstu stron na
gałęzi `przebudowa-zrzuty` (lokalna budowa `main` @ 414bc5d, 04.10.2026).
Na zrejestru.pl mogą być inne — serwer pobiera SUDOP co godzinę, a lokalnie
próg jawności nazw był wyłączony. Jedyna liczba policzona przez prototyp to
grupowanie przypadków PGE GiEK (50 → 4 wiersze: liczba przypadków
i rozpiętość kwot w grupie, tak jak je pokazuje strona; bez sum, bo kwoty
na stronie są zaokrąglone).

**Czego prototyp nie ma:** list w pełnej długości (pokazuje 3–5 pozycji
i „pokaż wszystkie N”), wykresów lat FE, mapy, planu sali, zdjęć.
Dlatego wysokość nie jest uczciwym porównaniem z dzisiejszą stroną —
porównywalny jest układ: odpowiedź na pierwszym ekranie, metodologia
zwinięta, warunki UOKiK przy danych.

| strona | prototyp, telefon | dziś, telefon |
|---|---|---|
| główna | 3 704 px | 6 186 px |
| Kraków | 8 566 px | 27 046 px |
| poseł | 4 682 px | 9 387 px |
| firma | 3 046 px | 17 005 px |

Sprawdzone w Chromium (Playwright), 4 strony × 390/1280 px × jasny/ciemny:
szerokość dokumentu = szerokość okna (spis działów przewija się w bok
wewnątrz własnego paska, tak ma być), 0 błędów konsoli, fonty z `fonty/`,
żaden cel dotykowy poza tekstem ciągłym poniżej 24 px.

`fonty/`: Brygada 1918 600, IBM Plex Sans 400/600, IBM Plex Mono 500,
podzbiory latin i latin-ext z `@fontsource/*` 5.3.0, licencja SIL OFL 1.1
(pliki `OFL-*.txt`). Razem 141 kB.

Pliki CSS i JS są tylko dla prototypu — kod strony przebuduje główna sesja
w `src/` (Tailwind 4, te same nazwy zmiennych co w `globals.css`).
