Od: streszczenia   Do: glowny   Data: 2026-10-04
Status: otwarte
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#1)

# Partia 100 streszczeń: druki 2702–3090

Dopisane do `ingest/zrodla/streszczenia/ustawy.json`. `--sprawdz`: 112/112
poprawnych, kod 0. Bez streszczenia zostało 831; najnowszy brakujący: 2701.

## Do sprawdzenia w rejestrze (prawdopodobne błędy u źródła)

1. **Druk 3089** — opis: obniżka VAT na paliwa „z 3% do 8%”. Bliźniaczy druk
   2724 ma „z 23% do 8%”. Streszczenie mówi tylko „obniżona do 8%”; „23%”
   odrzuciłaby kontrola liczb, bo tej liczby w opisie 3089 nie ma.
2. **Druk 2769** — opis wymienia organ „Prezes UKOiK”, którego nie ma
   (pewnie UOKiK). Streszczenie wymienia pozostałe organy z „m.in.”.

Jeśli Sejm poprawi te opisy, ich skrót się zmieni i `--sprawdz` wskaże oba
wpisy do napisania na nowo — wtedy wystarczy `--eksport` i commit
`opisy.json`.

## Pytanie

Czy przy opisach bez treści merytorycznej (2887, 2746: „projekt dotyczy
m.in. regulacji…”) zostawić zdanie „Opis z rejestru nie podaje szczegółów”,
czy lepiej nie pisać streszczenia wcale i zostawić sam opis rejestru?
