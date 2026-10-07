# Prototyp — dwie wersje wyglądu i przełącznik „Wygląd”

Otwórz `index.html` w przeglądarce (dwuklik wystarczy, nic nie trzeba
budować). Przycisk **„Wygląd”** w nagłówku zmienia:
- styl strony: **Standardowy** (domyślny) albo **Wypis z rejestru**;
- jasność: jak w systemie, jasny albo ciemny.

Wybór zostaje zapamiętany. `?k=jg` albo `?k=a` w adresie otwiera wybraną
wersję. Telefon: wąskie okno albo narzędzia deweloperskie, 390 px.

Pozostałe motywy obu rund — działające, z planszami — są
w `../archiwum/`.

| plik | co to jest |
|---|---|
| `styl.css` | **fundament** F1–F14 (`../runda-2.md`): struktura, kolejność, rozmiary minimalne, panel „Wygląd” |
| `skora-jg.css` | **Standardowy**: J „Usługa publiczna” wszędzie, od 1280 px dodatki z G „Pulpit” |
| `skora-a.css` | **Wypis z rejestru** (A) |
| `motyw.js` | przełącznik „Wygląd”, „Jak myślisz, ile…?”, podświetlenie działu w spisie |
| `pomiar.cjs` | pomiar F1–F14 w Playwright: `node pomiar.cjs` (obie wersje, ok. 3 min); surowe dane w `pomiar.json` (poza repozytorium) |
| `fonty/` | woff2 z `@fontsource/*` 5.3.0 (latin + latin-ext): Public Sans, IBM Plex Sans i Mono, Brygada 1918; licencja SIL OFL 1.1 (`OFL-*.txt`) |

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
| `kierunki.html`, `index.html` | obie wersje i odnośniki do archiwum, spis | — |

**Skąd liczby:** przepisane dosłownie z wyrenderowanego tekstu stron na
gałęzi `przebudowa-zrzuty` (lokalna budowa `main` @ 414bc5d, 04.10.2026).
Na zrejestru.pl mogą być inne. Prototyp sam liczy tylko trzy rzeczy:
- zdania porównawcze (rachunek w `../kierunek.md`);
- kwoty na mieszkańca;
- grupowanie przypadków PGE GiEK.

Ramki „PROTOTYP:” to notki projektowe — nie wchodzą do serwisu, a pomiar
je usuwa.

**Sprawdzone 07.10.2026 w Chromium (Playwright):**
- F1–F14 w obu wersjach, na 13 stronach, przy 390 i 1280 px — tabela
  w `../kierunek.md`;
- 120 renderów bez przepełnienia i bez błędów konsoli;
- cele dotykowe ≥ 24 px;
- przełącznik „Wygląd”: zmiana od razu, zapamiętanie między stronami,
  ukryty bez JavaScriptu.

Fonty:
- Standardowy: 50 kB na telefonie, 79 kB na komputerze;
- Wypis z rejestru: 142 kB;
- dziś serwis wysyła 221 kB.

Pliki CSS i JS są tylko dla prototypu — kod strony przebuduje główna sesja
w `src/` (`../kierunek.md`, „Dla głównej sesji”).
