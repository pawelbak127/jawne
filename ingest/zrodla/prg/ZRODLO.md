# Granice gmin — PRG (GUGiK)

Plik źródłowy **nie leży w repozytorium**: ma 164 MB. W repozytorium są
tylko wyniki konwersji — `public/mapa/gminy.json` (ok. 1,0 MB) i
`public/mapa/powiaty.json` (ok. 448 kB) — żeby zbudowanie serwisu nie
wymagało pobierania źródła.

**Dwa pliki, nie jeden.** Mapa ma dwa poziomy i każdy pobiera dokładnie
jeden plik. Dołożenie 380 powiatów do `gminy.json` podniosło go z 1 020 kB
do 1 401 kB — płaciliby za to także czytelnicy, którzy zostają na gminach.
Obrysy województw (7 875 punktów, ok. 77 kB) są w obu plikach: to taniej
niż trzecie żądanie sieciowe.

| | |
|---|---|
| Nazwa | Państwowy Rejestr Granic, warstwy `A03_Granice_gmin`, `A02_Granice_powiatow`, `A01_Granice_wojewodztw` |
| Wydawca | Główny Urząd Geodezji i Kartografii |
| Adres | <https://opendata.geoportal.gov.pl/prg/granice/00_jednostki_administracyjne.zip> |
| Pobrane | 23.09.2026 |
| Rozmiar | 377 736 438 B (archiwum ZIP) |
| SHA-256 | `fea75e56e708b4aaa6c19e72…` (pełna suma w `public/mapa/gminy.json`, pole `sha256`) |
| Układ | ETRS89, stopnie geograficzne |
| Kod gminy | pole `JPT_KOD_JE` (pierwsze 6 znaków = TERYT) |

## Odtworzenie

```bash
mkdir -p dane/zrodla/prg
curl -L -o dane/zrodla/prg/jednostki.zip \
  https://opendata.geoportal.gov.pl/prg/granice/00_jednostki_administracyjne.zip
node --experimental-strip-types scripts/granice-gmin.mjs
```

## Zmierzone przy konwersji (23.09.2026)

- 2 479 gmin, **5 154 114 punktów → 93 492** po uproszczeniu
  (Douglas-Peucker, tolerancja 0,004° ≈ 400 m),
- **0 naszych gmin bez konturu** — pokrycie jest pełne,
- **2 kontury bez naszej gminy: 200216 i 120713.** PRG jest bieżący, a nasza
  lista gmin pochodzi z danych PKW z wyborów 2023 — to gminy powstałe albo
  przekształcone później. Na mapie zostają szare („brak danych”).
- Warszawa jest w PRG **jedną jednostką 146501**, a u nas ma 18 dzielnic
  (pułapka 24). Na mapie pokazujemy jedną Warszawę.

## Warstwy zbiorcze (dołożone 30.09.2026)

- **16 województw**, 7 875 punktów. Granice bierzemy z własnej warstwy PRG,
  a nie sklejamy z gmin: po uproszczeniu każdej gminy osobno wspólne
  krawędzie sąsiadów nie są identyczne (46 327 krawędzi występuje raz,
  22 326 dwa razy), więc scalanie dałoby poszarpany obrys.
- **380 powiatów**, 37 826 punktów. Ta sama tolerancja co gminy, żeby
  po przełączeniu poziomu granica kraju nie „drgała”.
- **Nazwy powiatów bierze strona z naszej tabeli `gminy`** (pisownia PKW),
  nie z PRG — PRG zapisuje miasta na prawach powiatu jako „powiat Warszawa”.
  Skrypt sprawdza tylko zgodność list kodów: **380 = 380, zero rozjazdów**.
