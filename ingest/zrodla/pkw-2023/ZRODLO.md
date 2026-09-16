# Gminy i okręgi wyborcze do Sejmu — PKW, wybory 2023

Plik `wyniki_gl_na_listy_po_gminach_sejm_utf8.csv` leży tu **bez żadnych zmian**,
tak jak go wydała Państwowa Komisja Wyborcza.

- Źródło: https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/data/csv/wyniki_gl_na_listy_po_gminach_sejm_csv.zip
- Strona z danymi: https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach
- Pobrano: 16.09.2026
- SHA-256: `7d9b86fde5d3a9cd09c22250b4e1a5b27f9511c6f0a9e9fe9a3ce7405dcb7842`

## Dlaczego kopia w repozytorium

Wyniki wyborów się nie zmienią, a serwisy wyborcze PKW bywają przenoszone do
archiwum. Import nie może zależeć od tego, czy ta strona jeszcze istnieje.

**Uwaga przy pobieraniu ponownie:** trzy sąsiednie adresy (`/data/…`, `/pliki/…`,
`/csv/…`) odpowiadają `HTTP 200`, ale zwracają powłokę aplikacji (24 190 bajtów
HTML), a nie plik. Prawdziwy ZIP zaczyna się bajtami `50 4b 03 04`.

## Co sprawdza import (`ingest/lib/pkw.ts`)

- 41 okręgów, każdy w jednym województwie,
- 2494 unikalne kody TERYT (2477 gmin, Warszawa jako 18 dzielnic),
- 91 obwodów za granicą i na statkach, wszystkie w okręgu 19,
- TERYT dopełniony do 6 cyfr — w pliku 608 kodów ma obcięte zero wiodące.
