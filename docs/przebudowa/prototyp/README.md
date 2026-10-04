# Prototyp — runda 2: dziesięć motywów na jednym fundamencie

Otwórz `index.html` w przeglądarce (dwuklik wystarczy, nic nie trzeba
budować). Motyw wybierasz paskiem „Motyw” nad nagłówkiem albo przez
`?k=a` … `?k=j` w adresie; wybór zostaje zapamiętany. Jasny i ciemny
przełącza przycisk z półkolem w nagłówku. Telefon: wąskie okno albo
narzędzia deweloperskie, 390 px.

| plik | co to jest |
|---|---|
| `styl.css` | **fundament** F1–F14 (`../runda-2.md`): struktura, kolejność, rozmiary minimalne, neutralna paleta |
| `skora-a.css` … `skora-j.css` | **motywy**: własne fonty, paleta jasna i ciemna, linie, rysunek liczby i źródła |
| `motyw.js` | wybór motywu, jasny/ciemny, „Jak myślisz, ile…?”, podświetlenie działu w spisie |
| `pomiar.cjs` | pomiar F1–F14 w Playwright: `node pomiar.cjs` (ok. 10 min) albo `node pomiar.cjs gmina,posel a,j`; tabela na ekranie, surowe dane w `pomiar.json` (poza repozytorium) |
| `fonty/` | pliki woff2 z `@fontsource/*` 5.3.0 (latin + latin-ext), licencja SIL OFL 1.1 (`OFL-*.txt`) |

| strona | trasa | dane (z `tekst/*.txt`) |
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
| `kierunki.html`, `index.html` | porównanie motywów, spis | — |

**Skąd liczby:** przepisane dosłownie z wyrenderowanego tekstu stron na
gałęzi `przebudowa-zrzuty` (lokalna budowa `main` @ 414bc5d, 04.10.2026).
Na zrejestru.pl mogą być inne. Policzone przez prototyp są tylko:
- zdania porównawcze (rachunek w `../kierunek.md`);
- kwoty na mieszkańca z sum i ludności GUS;
- grupowanie przypadków PGE GiEK (50 → 4 wiersze).

Ramki „PROTOTYP:” to notki projektowe — nie wchodzą do serwisu, a pomiar
je usuwa.

**Czego prototyp nie ma:** list w pełnej długości (3–5 pozycji i „pokaż
wszystkie N”), mapy, półkola sali, zdjęć posłów.

**Sprawdzone 04.10.2026 w Chromium (Playwright):**
- F1–F14 we wszystkich 10 motywach na 13 stronach, przy 390 i 1280 px —
  tabela w `../kierunek.md`;
- 600 renderów (15 stron × 10 motywów × 390/1280 × jasny/ciemny): bez
  przepełnienia i bez błędów konsoli;
- cele dotykowe ≥ 24 px;
- kontrast palet ≥ 4,5:1 (najsłabsza para: odnośnik J na szarym pasku,
  4,6:1);
- „Jak myślisz, ile…?” z JavaScriptem i bez niego.

Fonty, zmierzone na załadowanej stronie (dziś serwis: 221 kB):

| motyw | kB |
|---|---|
| A | 142 |
| B | 81 |
| C | 55 |
| D | 108 |
| E | 128 |
| F | 126 |
| G | 84 |
| H | 129 |
| I | 55 |
| J | 50 |

Pliki CSS i JS są tylko dla prototypu — kod strony przebuduje główna sesja
w `src/` (Tailwind 4, te same nazwy zmiennych co w `globals.css`).
