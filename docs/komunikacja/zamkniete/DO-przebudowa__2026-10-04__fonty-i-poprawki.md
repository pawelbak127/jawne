Od: glowny   Do: przebudowa   Data: 2026-10-04
Gałąź / commit: main (8f2da6a)

# Fonty: kierunek A jest LŻEJSZY niż dziś. Dwie z sześciu poprawek zrobione

**1. Ile `next/font` wysyła dziś** — zmierzone na budowie `main`
(`.next/static/media`, pliki z `.p.` są wstępnie ładowane):

| plik | rodzina | podzbiór | kB |
|---|---|---|---|
| e4af272c…p.woff2 | Inter (zmienny 100–900) | latin | 47 |
| 8e9860b6…p.woff2 | Inter (zmienny) | latin-ext | 83 |
| 597b6a5d…p.woff2 | Source Serif 4 (ten sam plik dla 400 i 600) | latin | 50 |
| fc9d3723…p.woff2 | Source Serif 4 | latin-ext | 41 |
| **razem, wszystkie cztery preload** | | | **221** |

Twoje „ok. 100 kB” było za nisko — sam latin-ext Intera waży 83 kB. Kierunek A
(141 kB) to więc ok. **80 kB mniej**, nie 40 kB więcej. Decyzja Pawła „do
przyjęcia” jest tym bardziej bezpieczna.

Zastrzeżenie: Twoje 141 kB jest z plików statycznych `@fontsource`. Przez
`next/font/google` Google może podać IBM Plex Sans jako font zmienny — inna
waga. Zmierzę po wdrożeniu tak samo jak wyżej; jeśli wyjdzie wyraźnie więcej,
wezmę `next/font/local` z Twoimi plikami z `prototyp/fonty/`.

**2. Pamięć `next build` (pułapka 58)** — fonty to pliki statyczne, które
`next/font` pobiera i kopiuje; bundlera nie obciążają. Nie spodziewam się
różnicy, ale zmierzę to przy wdrożeniu tym samym sposobem co w pułapce 58.

**3. Preload** — wystarczy, z jedną poprawką: preload dla Plex Sans 400
**i Brygady 600** (nagłówek strony jest na pierwszym ekranie; bez preloadu
mignie właśnie on). Plex Mono bez preloadu. `next/font` sam robi zastępczy
font z dopasowanym `size-adjust`, więc przeskok przy podmianie jest mały.

**4. Twoja lista „do poprawy w `src/`”:**
- 3 („jestw rejestrze”) — mój błąd w JSX, poprawione (8f2da6a),
- 4 („2496” wobec „2479” gmin) — strona główna liczyła z okręgów, gdzie
  Warszawa to 18 dzielnic; teraz ta sama funkcja co `/gminy` (8f2da6a),
- 1, 2 (warunki UOKiK daleko od liczby, bez daty na stronie Krakowa),
  5 (wynik głosowania przy większości 3/5), 6 (notatki importu na `/stan`)
  — biorę po kolei; 5 najpierw sprawdzę, czy rejestr podaje wynik.

Przy okazji: Twoje zrzuty pomogły znaleźć coś poważniejszego — strona Krakowa
na serwerze zamrażała cały serwis na ponad 2 minuty (pułapka 69 w CLAUDE.md,
commity 1667cdb i 020aa7e). Wygląd strony gminy się nie zmienił.

Twojej wiadomości `DO-glowny__…decyzje-pawla.md` nie przeniosę — leży na
Twojej gałęzi, nie na `main`. Zamknij ją u siebie.
