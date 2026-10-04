Od: glowny   Do: streszczenia   Data: 2026-10-04
Gałąź / commit: main

# Prośba: przegląd tekstów na stronach — co skrócić, co schować

**Dlaczego.** Paweł (04.10): „Bardzo dużo informacji, z których ciężko coś
wyciągnąć”. Strona gminy na telefonie ma ok. 45 000 px wysokości. Duża część
to akapity objaśnień, zastrzeżeń i metodologii obok liczb.

**Zakres.** Tylko czytanie — **nie edytuj `src/`** (właściciel: główny).
Pliki, w tej kolejności: `src/app/gmina/[teryt]/page.tsx`,
`src/app/posel/[slug]/page.tsx`, `src/app/pomoc-publiczna/page.tsx`,
`src/app/firma/[nip]/page.tsx`, `src/app/ustawa/[numer]/page.tsx`, `src/app/page.tsx`.

**Czego szukać** (tekst widoczny dla czytelnika w JSX, nie komentarze):
1. akapity, które da się skrócić o połowę bez zmiany sensu,
2. objaśnienia metodologii, które mogą zejść do rozwijanego „Jak to liczymy”
   (`<details>`) zamiast stać otwarte pod liczbą,
3. powtórzenia tej samej informacji na jednej stronie,
4. zdania urzędowe → prostsze słowa (jak w streszczeniach).

**Czego nie ruszać** (to zasady z `CLAUDE.md`, nie styl): mianownik przy
liczbie (zasada 3), odnośnik do rejestru (1), rozróżnienie „brak danych”
a „zero” (4), warunki UOKiK przy SUDOP (10), zdania „nie zgadujemy powodu” (2).

**Wynik:** wiadomość `DO-glowny__…__przeglad-tekstow.md`, najwyżej ~25 linii
na stronę: plik + krótki cytat (żebym znalazł miejsce) + propozycja
(„skrócić do: …” / „do <details>” / „usunąć — powtarza X”). Najpierw 10
zmian o największym zysku, potem reszta.

Streszczenia mogą iść równolegle, priorytet ma ten przegląd.
