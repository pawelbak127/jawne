# Kierunek stylu — siedem propozycji i jedna rekomendacja

Wspólne dla wszystkich trzech (to treść, nie styl — nie podlega wyborowi):
odnośnik do rejestru przy liczbie, mianownik, półpauza ≠ zero, brak ocen,
reguły jawności, warunki UOKiK, kontrast AA w obu motywach, cele ≥ 24 px,
390 px, `latin-ext`. Nazwy zmiennych CSS zostają (`--papier`, `--atrament`,
`--akcent` …), więc `src/lib/kontrast.test.ts` sprawdzi każdą paletę bez
zmian w teście. Kontrast policzony tym samym wzorem co w teście.

Wagi fontów zmierzone na plikach `@fontsource/*` 5.3.0 (woff2, podzbiory
`latin` + `latin-ext`, które przeglądarka i tak pobiera na polskiej stronie).
Dla porównania dziś: Inter 400 = 23,7 + 35,0 kB, Source Serif 4 600 =
21,5 + 18,4 kB.

---

## A. „Wypis z rejestru” — **rekomendacja**

**Pomysł.** Każda strona jest wypisem: takim, jaki wydaje urząd z rejestru
gruntów albo KRS — nagłówek z oznaczeniem i datą stanu, ponumerowane działy,
przy każdym dziale „podstawa” (rejestr i data pobrania). Domena to
zrejestru.pl; serwis nie komentuje, tylko wypisuje. Forma sama mówi to,
co dziś mówią akapity: „to jest odpis, nie opinia”.

**Typografia.**
- Nagłówki: **Brygada 1918** 600 (polski krój, odtworzenie czcionki z 1918 r.,
  latin-ext 19,9 kB + latin 14,5 kB). Rozpoznawalny, nie z generatora,
  z polskimi znakami rysowanymi od początku, a nie dorobionymi.
- Tekst i liczby: **IBM Plex Sans** 400/600 (79 kB razem). Wyraźne „1/l/I”,
  cyfry tablicowe, dobra czytelność w 13–14 px.
- Sygnatury (NIP, TERYT, nr druku, data stanu, „podstawa”): **IBM Plex Mono**
  500 (28 kB). Mono tylko w sygnaturach — to znak „to jest identyfikator
  z rejestru”, a nie styl tekstu.
- Razem ok. 141 kB wobec ok. 100 kB dziś (Inter + Source Serif). Do
  odchudzenia: Plex Sans tylko 400 + 600, bez kursywy.

**Paleta** (kontrast tekstu wobec `--papier` / `--papier-2` / `--papier-3`):

| token | jasny | ciemny |
|---|---|---|
| `--papier` | `#f5f3ed` (papier kancelaryjny) | `#121210` |
| `--papier-2` | `#fbfaf6` | `#1a1a17` |
| `--papier-3` | `#ebe7dc` | `#24231f` |
| `--atrament` | `#151412` — 16,6 / 17,6 / 14,9 | `#efece4` — 15,9 / 14,8 / 13,3 |
| `--atrament-2` | `#46433c` — 8,9 / 9,5 / 8,0 | `#bdb8ab` — 9,5 / 8,8 / 7,9 |
| `--atrament-3` | `#5c5850` — 6,4 / 6,8 / 5,7 | `#a39e91` — 7,0 / 6,5 / 5,9 |
| `--kreska` | `#d6d0c2` | `#38362f` |
| `--akcent` | `#0b5a52` — 7,3 / 7,7 / 6,5 | `#6fd3c3` — 10,5 / 9,8 / 8,8 |

Dzisiejszy `--atrament-3` ma 4,70 na `--papier-3`; tu najniższa wartość to
5,7. **Zasada barwy: akcent znaczy wyłącznie „to się klika”** (odnośnik,
źródło, fokus). Paski i wykresy dostają atrament albo barwy klubów, nigdy
akcent — dziś akcent jest i odnośnikiem, i paskiem, i ramką organu gminy.

**Siatka.** Na komputerze trzy kolumny wewnątrz `76rem`:
`[numer działu 3rem] [treść] [podstawa 14rem]`. Numer działu („1”, „2.3”)
w lewym marginesie, sygnatura źródła w prawym — jak na marginesie wypisu.
Na telefonie jedna kolumna; „podstawa” schodzi pod liczbę.

**Liczby i źródła.** Zamiast kafla — **wiersz rejestru** (liczby w przykładach w tym pliku są wymyślone, pokazują tylko układ):

```
2.1  Dochody na mieszkańca                     7 412 zł
     54,3 mln zł ÷ 7 326 mieszkańców · mediana w woj. (177 gmin): 6 905 zł
     podstawa: GUS BDL · 2025 · pobrano 12.09.2026 ↗
```

Etykieta po lewej, wartość po prawej w cyfrach tablicowych, mianownik
w drugim wierszu, podstawa w trzecim (mono, akcent, z ikoną ↗ — wygląda jak
przycisk, nie jak przypis). Wiersze oddzielone kreską, bez kart i bez cieni.
Najważniejsze 3–4 wiersze strony stoją na górze w ramce „Gmina w liczbach”
— jedyna ramka na stronie.

**Czym różni się od „typowej strony z AI”.**
- Zero zaokrąglonych kart z cieniem; podział robią kreski i numery działów.
- Zero gradientów, siatek-tła, pigułek i wersalikowych nadtytułów.
- Krój nagłówków z polską historią zamiast Intera/Geista.
- Hierarchia z numeracji (1, 1.1, 1.2), a nie z wielkości kart.
- Ostrzeżenie wygląda jak ostrzeżenie (lewa gruba kreska + „Uwaga:”),
  a nie jak kolejna szara karta.

**Ryzyko.** Może wyglądać urzędowo i chłodno. Lekarstwo: proste słowa
w etykietach („Ile gmina ma pieniędzy”), a „dokumentowość” tylko w formie.

---

## B. „Monitor” — gazeta urzędowa

**Pomysł.** Serwis jako dziennik: winieta, łamy, marginalia. Odnosi się do
„Monitora Polskiego” i „Dziennika Ustaw” — tam, gdzie ustawy z serwisu są
publikowane. Najlepszy do czytania długich stron posła i ustawy.

**Typografia.** **Półtawski Nowy** (Antykwa Półtawskiego, 1928, polski krój
książkowy; 400/600: 25,6 + 14,3 + 26,6 + 14,9 = 81 kB) do nagłówków
i tekstu, **IBM Plex Mono** 500 do liczb w tabelach (28 kB). Razem ok. 109 kB.

**Paleta.** Jasna: papier `#fbf9f4`, atrament `#111111` (17,9:1),
`--atrament-3` `#5e584f` (6,7:1), akcent sepia `#7a3f0c` (7,9:1). Ciemna:
`#171512` / `#f1ebe0` (15,4:1), akcent `#e6a95e` (8,9:1). Sepia nie jest
barwą żadnego klubu.

**Siatka.** Szeroka kolumna tekstu 38rem + wąska kolumna marginaliów 12rem
na źródła i definicje (definicja stoi obok słowa, a nie w rozwijanym).
Na telefonie marginalia zamieniają się w przypisy rozwijane po dotknięciu.

**Liczby i źródła.** Liczby w tekście, pogrubione, z mianownikiem w zdaniu
(„Gmina wydała na inwestycje 12,4 mln zł, czyli 1 690 zł na mieszkańca —
mediana w województwie 1 210 zł.”). Źródło w marginesie na wysokości zdania.

**Czym różni się od AI.** Łamy i marginalia zamiast kart; antykwa zamiast
groteski; tekst ciągły zamiast siatki kafli.

**Ryzyko.** Wolniejszy dla mieszkańca, który chce liczby w 10 sekund.
Tabele i wykresy wymagają osobnego stylu, bo łamów nie da się z nimi
pogodzić. Najwięcej pracy przy przebudowie.

---

## C. „Tablica” — oznakowanie publiczne

**Pomysł.** Jak tablica informacyjna na budowie z funduszy UE albo tablica
odjazdów: czarne na białym, duże cyfry, nic poza informacją.
Interaktywność = odwrócenie (białe na czarnym), a nie kolor.

**Typografia.** **Archivo** 400/700 (14,7 + 12,9 + 14,5 + 13,3 = 55 kB),
grotesk z wąskimi cyframi; nic więcej. Najlżejszy wariant.

**Paleta.** Czysta czerń i biel: `#000` na `#fff` 21:1, `--atrament-3`
`#555555` (7,5:1). Ciemny: odwrotnie. Akcent = atrament; jedyny kolor na
stronie to dane (barwy klubów w wykresach).

**Siatka.** Pasy na całą szerokość, każdy pas = jedna liczba albo jedna
lista. Liczby 56–72 px.

**Liczby i źródła.** Liczba wielka, pod nią mianownik i podstawa wersalikami
w 12 px. Źródło jako czarny prostokąt „ŹRÓDŁO ↗”.

**Czym różni się od AI.** Brak koloru, brak zaokrągleń, brak cieni;
bezkompromisowy kontrast.

**Ryzyko — poważne.** Wielkie liczby czytają się sensacyjnie
(„13,2 MLD ZŁ”), a serwis nie ocenia (zasada 6). Mianownik przy dużej
liczbie przegrywa wizualnie. Zostawiam jako punkt odniesienia, nie polecam.

---

## D. „Kartoteka” — karta katalogowa i segregator

**Pomysł.** Serwis jako szafa z kartoteką: każdy dział to przekładka
segregatora z zakładką, ramka „W liczbach” to karta katalogowa, źródło —
pieczątka w ramce. Bliski A (porządek, rejestr), ale bardziej „biurowy”
i mniej książkowy; dobrze znosi długie listy (posłowie, głosowania).

**Typografia.** IBM Plex Mono 500 w nagłówkach, etykietach i liczbach, IBM
Plex Sans w tekście — bez kroju szeryfowego. Ok. **107 kB** (Plex Sans
400/600 + Plex Mono 500).

**Paleta.** Jasna: karton `#f4efe2`, grafit `#1b1f24` (14,4:1),
`--atrament-3` `#575d66` (5,8:1), akcent petrol `#155e75` (6,3:1),
niebieskawe linie karty. Ciemna: `#14171a` / `#e8e4da` (14,2:1), akcent
`#67c3db` (8,9:1).

**Czym różni się od AI.** Zakładki-przekładki zamiast kart z cieniem,
pismo maszynowe zamiast Intera, pieczątka zamiast „badge”.

**Ryzyko.** Mono w nagłówkach jest szerokie — długie tytuły ustaw łamią
się częściej; trzeba trzymać mono tylko w krótkich etykietach.

---

## E. „Rocznik” — rocznik statystyczny GUS

**Pomysł.** Strona jak tablica z „Rocznika Statystycznego”: liczby w tabeli
drukowanej (gruba linia, cienkie, gruba), „Dział N” na marginesie,
mianownik kursywą pod liczbą. Najbliższy temu, jak dziennikarz i radny
czytają dane urzędowe; najmniej „stylizowany” z siedmiu.

**Typografia.** Source Serif 4 400/600 do tekstu i liczb (ten sam krój co
dziś w nagłówkach — znany, z cyframi tablicowymi), Public Sans 400/600 do
nagłówków tabel. Ok. **128 kB**.

**Paleta.** Biel, czerń `#1a1a1a` (17,4:1), `--atrament-3` `#5f5f5f`
(6,4:1), akcent oliwkowy `#4f5b17` (7,4:1). Ciemna: `#121212` / `#ececea`
(15,8:1), akcent `#b9c86a` (10,3:1).

**Czym różni się od AI.** Linie tabeli drukowanej zamiast kart; szeryf
w tekście ciągłym; nagłówki jak w publikacji statystycznej.

**Ryzyko.** Dla mieszkańca może wyglądać „urzędowo-sucho” — mniej
zaproszenia niż A czy F.

---

## F. „Reportaż” — dziennikarstwo danych

**Pomysł.** Jak duże redakcje piszą o danych: dużo powietrza, liczba duża
i szeryfowa, a tuż pod nią opis i mianownik; „W liczbach” w dwóch
kolumnach. Najcieplejszy z siedmiu, najbardziej dla mieszkańca.

**Typografia.** Newsreader 400/600 do nagłówków i liczb, Public Sans
400/600 do tekstu. Ok. **126 kB**.

**Paleta.** Ciepła szarość `#f7f5f2`, atrament `#1d1b19` (15,8:1),
`--atrament-3` `#665f57` (5,8:1), akcent terakota `#8f3b1f` (6,9:1).
Ciemna: `#161412` / `#f1ece4` (15,6:1), akcent `#f0a07e` (8,8:1).

**Czym różni się od AI.** Szeryfowe liczby i redakcyjny rytm zamiast siatki
kafli; brak ramek.

**Ryzyko.** Bliżej C, niż wygląda: duża liczba nad opisem to pokusa
„nagłówka”. Trzyma się dzięki temu, że mianownik stoi zaraz pod liczbą
i jest w tym samym bloku. Strona dłuższa o 15–25% niż w A (zmierzone na Krakowie).

---

## Jak oglądać i mieszać

Każdy kierunek działa na **każdej** stronie prototypu: pasek „Kierunek” nad
nagłówkiem albo `?k=a|b|c|ab|d|e|f` w adresie (wybór zostaje zapamiętany).
Przegląd w `prototyp/kierunki.html`. Kierunki dają się łączyć jak A+B:
z jednego bierze się litery i barwy, z drugiego sposób pokazania liczby
albo marginesu — np. „E z marginesem A+B” albo „D z liczbami F”.

---

## Rekomendacja

**A, „Wypis z rejestru”.** Jako jedyny z trzech przekuwa najważniejszą
cechę serwisu — „każda liczba ma podstawę w rejestrze” — w formę strony,
zamiast opisywać ją akapitami. Wiersz rejestru (etykieta · wartość ·
mianownik · podstawa) jest jednym wzorem dla gminy, posła, firmy i ustawy,
więc przebudowa to jeden komponent zamiast siedemnastu kart. I jest
najtańszy w obsłudze: działa w jednej kolumnie na telefonie, nie wymaga
JavaScriptu, a fonty kosztują ok. 40 kB więcej niż dziś.

Prototyp: `prototyp/` — 13 stron, każda w każdym kierunku;
porównanie w `prototyp/kierunki.html`.
Decyzje Pawła: `decyzje.md`.
