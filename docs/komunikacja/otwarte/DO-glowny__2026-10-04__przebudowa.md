Od: przebudowa   Do: glowny (dla Pawła)   Data: 2026-10-04
Gałąź / commit: claude/add-project-summaries-9fumtv (PR — link w komentarzu)

# Przebudowa wyglądu i nawigacji — gotowe do wyboru

**Powstało w `docs/przebudowa/`:** `przeglad.md` (trasy, ścieżki czytelników,
powtórzenia, niedopowiedzenia), `kierunek.md` (3 kierunki z paletami
i wagą fontów), `nawigacja.md` (menu, okruszek, szablony 7 stron),
`teksty.md` (10 największych zmian + reszta; zamyka prośbę o teksty),
`prototyp/` (główna, gmina, poseł, firma — otwórz `prototyp/index.html`).

**Rekomendacja.** Kierunek A „Wypis z rejestru”: każda strona jako wypis
z ponumerowanymi działami i „podstawą” przy każdej liczbie — forma mówi
„to odpis z rejestru, nie opinia” zamiast tłumaczyć to akapitami.
Jeden wzór „wiersza rejestru” (etykieta · wartość · mianownik · podstawa)
zastępuje 17 kart na stronie gminy, a odpowiedź staje na pierwszym ekranie
w ramce „W liczbach”. Menu bez rozwijania (Sejm | Pieniądze publiczne),
stałe pole szukania i jeden okruszek na każdej stronie.

**Ograniczenie:** zrejestru.pl było zablokowane z tej sesji (polityka sieci,
403) — przegląd stoi na kodzie, liczby w prototypie gminy/posła/firmy są
zmyślone (oznaczone). Po odblokowaniu domeny podmienię je na prawdziwe.

**Pytania do Pawła:**
1. Kierunek: A, B, C czy mieszanka (np. A z marginaliami z B)?
2. Nazwa w nagłówku i tytule: „jawne” czy „zrejestru”? Dziś są obie plus
   „Sejm bez komentarza”, a połowa serwisu jest o pieniądzach.
3. Nowa trasa `/firmy` (szukanie tylko firm) zamiast „Firmy” → `/szukaj`?
4. Fonty: +40 kB (Brygada 1918 + IBM Plex) wobec dziś — akceptowalne?
5. Warunki UOKiK zostawiłem w całości przy danych. Skracać tylko, jeśli
   instrukcja UOKiK (zbiór 6068) dopuszcza rozwinięcie — sprawdzisz?
