# Prototyp — kierunek A „Wypis z rejestru”

Otwórz `index.html` w przeglądarce (dwuklik wystarczy, nic nie trzeba
budować). Motyw: przycisk ◐ albo ustawienie systemu. Telefon: wąskie okno
albo narzędzia deweloperskie, 390 px.

| plik | co | liczby |
|---|---|---|
| `glowna.html` | strona główna | działy 2–3 z dokumentacji repo (stan 30.09.2026), głosowania przykładowe |
| `gmina.html` | gmina | **zmyślone** („Przykładowo”) |
| `posel.html` | poseł | **zmyślone** („Anna Przykładowa”) |
| `firma.html` | firma | **zmyślone** |

Dlaczego zmyślone: sesja w chmurze nie miała dostępu do zrejestru.pl
(polityka sieci środowiska, HTTP 403). Nazwy są celowo fikcyjne, żeby
zrzut ekranu nie mógł uchodzić za dane prawdziwej gminy albo osoby.

Sprawdzone w Chromium (Playwright), 4 strony × 390/1280 px × jasny/ciemny:
szerokość dokumentu = szerokość okna (bez przewijania w bok), 0 błędów
konsoli, wszystkie fonty z `fonty/`, żaden cel dotykowy poza tekstem ciągłym
poniżej 24 px.

Wysokość na 390 px: główna 3 590 px, gmina 7 641 px, poseł 4 294 px, firma
2 749 px. **To nie jest porównanie z dzisiejszymi 45 000 px** — prototyp
ma mniej pozycji na listach niż prawdziwa gmina. Porównywalny jest układ:
odpowiedź mieści się na pierwszym ekranie, a metodologia jest zwinięta.

`fonty/`: Brygada 1918 600, IBM Plex Sans 400/600, IBM Plex Mono 500,
podzbiory latin i latin-ext z `@fontsource/*` 5.3.0, licencja SIL OFL 1.1
(pliki `OFL-*.txt`). Razem 141 kB.

Pliki CSS i JS są tylko dla prototypu — kod strony przebuduje główna sesja
w `src/` (Tailwind 4, te same nazwy zmiennych co w `globals.css`).
