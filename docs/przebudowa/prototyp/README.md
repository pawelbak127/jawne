# Prototyp — dziesięć motywów na tych samych stronach

Otwórz `index.html` w przeglądarce (dwuklik wystarczy, nic nie trzeba
budować). Motyw: przycisk z półkolem w nagłówku albo ustawienie systemu. Telefon: wąskie okno
albo narzędzia deweloperskie, 390 px.

| plik | strona | dane (z `tekst/*.txt`) |
|---|---|---|
| `glowna.html` | `/` | glowna |
| `gmina.html` | `/gmina/126101` — Kraków | gmina-krakow |
| `posel.html` | `/posel/andrzej-adamczyk` (bez zdjęcia) | posel |
| `firma.html` | `/firma/7690502495` — PGE GiEK | firma |
| `ustawa.html`, `ustawy.html` | `/ustawa/3101`, `/ustawy` | ustawa, ustawy |
| `glosowanie.html`, `glosowania.html` | `/glosowanie/64-40`, `/glosowania` | glosowanie, glosowania |
| `poslowie.html`, `okreg.html` | `/poslowie`, `/okreg/14` | poslowie, okreg |
| `pomoc-publiczna.html` | `/pomoc-publiczna` | pomoc-publiczna |
| `firmy.html` | `/firmy` — **nowa trasa** | firmy z `szukaj` |
| `szukaj.html` | `/szukaj?q=krak` | szukaj |
| `kierunki.html` | porównanie 10 motywów | — |

**Motywy:** każda strona działa w każdym z dziesięciu motywów (A–J) —
pasek „Motyw” nad nagłówkiem albo `?k=a` … `?k=j` w adresie (wybór
zapamiętany w przeglądarce). Styl B–J to nakładka `skora-*.css`
na `styl.css`; HTML jest jeden. `?k=ab` to dodatek do A (margines
z „Jak to liczymy”), poza paskiem. Opisy motywów: `../kierunek.md`,
badania, na których stoją wspólne zasady: `../badania.md`. Ramki z napisem „PROTOTYP:” to notki
projektowe: pokazują miejsce na coś, czego dziś strona nie podaje.

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

| strona (kierunek A, bez paska wyboru kierunku) | prototyp, telefon | dziś, telefon |
|---|---|---|
| główna | 3 704 px | 6 186 px |
| Kraków | 8 566 px | 27 046 px |
| poseł | 4 682 px | 9 387 px |
| firma | 3 046 px | 17 005 px |

Sprawdzone w Chromium (Playwright), 15 stron × 10 motywów (A–J) × 390/1280 px × jasny/ciemny = 600 renderów:
szerokość dokumentu = szerokość okna (spis działów przewija się w bok
wewnątrz własnego paska, tak ma być), 0 błędów konsoli, fonty z `fonty/`,
żaden cel dotykowy poza tekstem ciągłym poniżej 24 px.

`fonty/`: A — Brygada 1918 600, IBM Plex Sans 400/600, IBM Plex Mono 500
(141 kB); B — Półtawski Nowy 400/600 (81 kB); C — Archivo 400/700 (55 kB);
D — fonty A bez Brygady; E — Source Serif 4 i Public Sans 400/600 (128 kB);
F — Newsreader i Public Sans 400/600 (126 kB); G — Archivo 400/700
i IBM Plex Mono 500 (84 kB); H — Newsreader kursywa 400 i 600, Public
Sans 400/600 (129 kB); I — Archivo 400/700 (55 kB); J — Public Sans
400/600 (50 kB). Podzbiory latin i latin-ext z `@fontsource/*` 5.3.0, licencja SIL
OFL 1.1 (pliki `OFL-*.txt`).

Pliki CSS i JS są tylko dla prototypu — kod strony przebuduje główna sesja
w `src/` (Tailwind 4, te same nazwy zmiennych co w `globals.css`).
