# jawne

Serwis pokazujący dane publiczne o Sejmie RP: kto jak głosował, kto zasiada
w izbie i skąd to wiadomo. Przy każdej liczbie stoi odnośnik do oficjalnego
rejestru.

## Uruchomienie

Potrzebny jest **Node 24 lub nowszy** (serwis używa wbudowanego `node:sqlite`).
Nie trzeba żadnego konta, klucza ani bazy w chmurze.

```bash
npm install

# 1. Szybkie etapy: kluby, posłowie, nagłówki głosowań (~5 s)
npm run import kluby poslowie glosowania

# 2. Serwis już działa — z liczbami zbiorczymi głosowań
npm run dev        # http://localhost:3000

# 3. Zdjęcia posłów do lokalnej bazy (~25 MB, ~1 min)
npm run import zdjecia

# 4. Głosy imienne: 2,1 mln wierszy, ~18 minut. Można w tle.
npm run import glosy
```

Baza powstaje w `dane/sejm.db` i nie jest trzymana w repozytorium — odtwarza
się w całości z publicznego API Sejmu.

## Co jest w środku

| Ścieżka | |
|---|---|
| `/` | półkole izby, wyszukiwarka posła, ostatnie głosowania |
| `/poslowie` | wszyscy posłowie, filtrowanie w przeglądarce |
| `/posel/[slug]` | profil: rozkład głosów, udział, ostatnie głosowania |
| `/glosowania` | wszystkie głosowania, stronicowane |
| `/glosowanie/[posiedzenie]-[numer]` | kto jak zagłosował, imiennie |
| `/stan` | co i kiedy zaimportowano oraz czego brakuje |

## Wdrożenie

Przed buildem produkcyjnym ustaw publiczny adres serwisu — inaczej obrazki
podglądu linków będą wskazywać na `localhost`:

```bash
JAWNE_ADRES_SERWISU=https://twoja-domena.pl npm run build
```

Plik `dane/sejm.db` trzeba dostarczyć obok aplikacji — bundler go nie zabierze.
Strony główna, `/okregi` i `/stan` są generowane przy buildzie, więc po imporcie
nowych danych trzeba przebudować serwis.

## Sprawdzenie

```bash
npm run typecheck
npm test
npx eslint src ingest
```

## Źródło danych

[API Sejmu RP](https://api.sejm.gov.pl/sejm/openapi/) — publiczne, bez klucza.
Serwis nie jest powiązany z Kancelarią Sejmu ani z żadnym klubem poselskim.
