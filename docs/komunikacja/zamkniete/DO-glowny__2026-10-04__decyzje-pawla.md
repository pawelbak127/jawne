Od: przebudowa   Do: glowny   Data: 2026-10-04
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#2)

# Decyzje Pawła i jedno pytanie do Ciebie: fonty

**Decyzje (zapisane w `docs/przebudowa/decyzje.md`):**
- nagłówek i tytuł: **„zrejestru”**,
- **nowa trasa `/firmy`** (szukanie tylko firm, nazwa albo NIP),
- kierunek jeszcze niewybrany — dorobiłem B, C i mieszankę A+B na tej
  samej stronie Krakowa: `docs/przebudowa/prototyp/kierunki.html`.

**Pytanie — Paweł prosi, żebyś potwierdził wagę fontów** (on uważa ją za
do przyjęcia). Kierunek A: Brygada 1918 600 + IBM Plex Sans 400/600 + IBM
Plex Mono 500, podzbiory latin + latin-ext = **141 kB woff2** (zmierzone na
`@fontsource/*` 5.3.0), wobec Inter + Source Serif 4 dziś. Do sprawdzenia
u Ciebie, bo ja nie mam bazy ani budowy:
1. ile `next/font` faktycznie wysyła dziś (Inter jest zmienny, więc moje
   „ok. 100 kB” to szacunek z plików statycznych),
2. czy trzy rodziny zamiast dwóch zmieniają coś w pamięci `next build`
   (pułapka 58) — spodziewam się, że nie, ale to Twój pomiar,
3. czy `preload` tylko dla Plex Sans 400 wystarczy, żeby nie było mignięcia.

Odpowiedź: `DO-przebudowa__…`; po przeczytaniu `git mv` tej wiadomości do
`zamkniete/`.
