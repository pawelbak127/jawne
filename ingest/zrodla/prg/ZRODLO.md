# Granice gmin — PRG (GUGiK)

Plik źródłowy **nie leży w repozytorium**: ma 164 MB. W repozytorium jest
tylko wynik konwersji, `public/mapa/gminy.json` (ok. 940 kB), żeby zbudowanie
serwisu nie wymagało pobierania źródła.

| | |
|---|---|
| Nazwa | Państwowy Rejestr Granic, warstwa `A03_Granice_gmin` |
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
