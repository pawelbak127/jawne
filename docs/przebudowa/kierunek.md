# Kierunek stylu — dziesięć motywów i jedna rekomendacja

Wspólne dla wszystkich dziesięciu (to treść, nie styl — nie podlega wyborowi):
odnośnik do rejestru przy liczbie, mianownik, półpauza ≠ zero, brak ocen,
reguły jawności, warunki UOKiK, kontrast AA w obu motywach, cele ≥ 24 px,
390 px, `latin-ext`. Nazwy zmiennych CSS zostają (`--papier`, `--atrament`,
`--akcent` …), więc `src/lib/kontrast.test.ts` sprawdzi każdą paletę bez
zmian w teście. Kontrast policzony tym samym wzorem co w teście.

Dlaczego te wspólne zasady i jak motywy wypadają na tle badań
nad wiarygodnością i klikalnością: `badania.md`.

Wagi fontów zmierzone na plikach `@fontsource/*` 5.3.0 (woff2, podzbiory
`latin` + `latin-ext`, które przeglądarka i tak pobiera na polskiej stronie).
**Dla porównania dziś: 221 kB** — zmierzyła główna sesja na budowie `main`
(`.next/static/media`, 04.10.2026): Inter zmienny 47 + 83 kB i Source
Serif 4 50 + 41 kB, wszystkie cztery pliki wstępnie ładowane. Każdy
z dziesięciu motywów waży mniej: od 50 kB (J) do 141 kB (A).
Zastrzeżenie głównej sesji: przez `next/font/google` Google może podać
krój jako font zmienny o innej wadze — wtedy `next/font/local` z plikami
z `prototyp/fonty/`.

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
- Razem ok. 141 kB wobec **221 kB dziś** (Inter + Source Serif, zmierzone
  przez główną sesję), czyli ok. 80 kB mniej. Plex Sans tylko 400 + 600,
  bez kursywy. Wstępnie ładowane: Plex Sans 400 i Brygada 600 (nagłówek
  strony jest na pierwszym ekranie); Plex Mono bez wstępnego ładowania.

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

**W prototypie mocniej (04.10).** Od 1024 px winieta pośrodku jak tytuł
gazety, pod nią szukanie i menu; akapity wyjustowane z dzieleniem wyrazów;
listy (głosowania, ustawy) w dwóch łamach z linią między nimi.

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
czytają dane urzędowe; najmniej „stylizowany” z dziesięciu.

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
kolumnach. Najcieplejszy z dziesięciu, najbardziej dla mieszkańca.

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

## G. „Dyżur nocny” — pulpit danych

**Pomysł.** Serwis jako narzędzie pracy: na szerokim ekranie menu stoi
w bocznym pasku (przyklejone), działy to panele, liczby pismem maszynowym,
uwagi w bursztynie. Zaprojektowany najpierw jako ciemny — dla dziennikarza
i radnego, który siedzi nad danymi wieczorem. Ma też pełną wersję jasną
i jak wszystkie idzie za ustawieniem systemu.

**Typografia.** Archivo 400/700 w tekście i nagłówkach (nagłówki działów
wersalikami), IBM Plex Mono 500 w liczbach. Ok. **84 kB**.

**Paleta.** Ciemna: `#0d1117` / `#e6edf3` (16,0:1), `--atrament-3`
`#8b96a3` (6,3:1), akcent cyjan `#4cc2ff` (9,4:1), bursztyn `#f2b84b`
(10,6:1). Jasna: `#eef1f4` / `#0d1117` (16,7:1), `--atrament-3` `#505c69`
(6,0:1), akcent `#00609e` (5,8:1), bursztyn `#8a5a00` (5,2:1; na
najciemniejszym tle 4,8:1).

**Czym różni się od AI.** Gęstość narzędzia zamiast „przewiewnej” strony
reklamowej; boczne menu jak w programie, nie hamburger.

**Ryzyko.** Najmniej typowy układ z dziesięciu (badania: pierwsze wrażenie
wygrywają układy typowe). Dla mieszkańca może wyglądać jak narzędzie
„nie dla mnie”. Na telefonie menu wraca na górę — bocznego paska tam nie ma.
„Ciemny najpierw” stoi wbrew badaniom polaryzacji (Piepenbrock 2013:
ciemny tekst na jasnym tle czyta się lepiej w każdym wieku), a panele
podnoszą złożoność wizualną (Reinecke 2013) — `badania-ux.md`.

---

## H. „Atlas” — mapa i legenda

**Pomysł.** Serwis o miejscach (2 479 gmin, 41 okręgów) mówi językiem mapy:
pod nazwą gminy delikatne warstwice, nazwa miejsca kursywą szeryfową jak
na arkuszu mapy, numer działu jak oznaczenie arkusza, „W liczbach” jako
legenda w podwójnej ramce z kluczem przed każdą etykietą, paski
kreskowane zamiast pełnych.

**Typografia.** Newsreader kursywa 400 (nazwy miejsc, marka) i 600
(liczby), Public Sans 400/600 w tekście. Ok. **129 kB** — kursywa jest
prawdziwym krojem, nie pochyleniem dorobionym przez przeglądarkę.

**Paleta.** Jasna: papier mapy `#f6f3ea`, atrament granatowy `#1f2d3a`
(12,7:1), `--atrament-3` `#5a6672` (5,3:1; na najciemniejszym tle
4,7:1), akcent błękit wody `#1d5a8c` (6,5:1). Ciemna: `#121a21` /
`#e9e4d6` (13,8:1), `--atrament-3` `#9d998c` (6,2:1), akcent `#7fb6e6`
(8,1:1).

**Czym różni się od AI.** Ozdobnik wynika z treści (to są miejsca), a nie
z mody; legenda zamiast kart z ikonami.

**Ryzyko.** Strony posła i ustawy nie są „miejscami” — tam warstwice
i kursywa nazw są dekoracją. Ozdobnik pod nazwą może rozpraszać przy
pierwszym spojrzeniu (badania: wygrywa niska złożoność).

---

## I. „Naklejka” — neobrutalizm

**Pomysł.** Grube czarne ramki (3 px), twarde cienie bez rozmycia, płaskie
mocne kolory: żółć na „W liczbach”, mięta na nagłówkach działów, liliowy
na źródłach. **Wszystko, co się klika, wygląda jak przycisk**, który da się
wcisnąć — przy najechaniu unosi się i cień rośnie. Odpowiedź na pytanie
o klikalność wprost: badania NN/g pokazują, że słabe sygnały klikalności
kosztują ok. 22% czasu.

**Typografia.** Archivo 400/700, nic więcej. Ok. **55 kB** — razem z C
najlżejszy.

**Paleta.** Jasna: krem `#fffaf0` / `#111111` (18,1:1), `--atrament-3`
`#4d4d4d` (8,1:1), żółć `#ffd84d`, mięta `#9be7c4` (atrament na niej
13,1:1), liliowy `#cbb7ff` (10,6:1). Ciemna: `#141414` / `#fafafa`
(17,7:1), żółć przyciemniona do `#5c4a00`, mięta `#0b4434`, liliowy
`#3d2c7a` — tekst na każdym z nich ≥ 4,6:1.

**Czym różni się od AI.** Typowa strona z AI ma miękkie cienie,
zaokrąglenia i gradienty — tu wszystko jest ostre i płaskie. Charakter
jak z plakatu, nie z szablonu.

**Ryzyko.** Najmniej urzędowy z dziesięciu: dla części czytelników
„zabawny” wygląd może podważać powagę liczb przy nazwiskach (zasada:
wiarygodność jest produktem). Mocne barwy trzeba trzymać z dala od barw
klubów w wykresach.

---

## J. „Usługa publiczna” — w duchu GOV.UK

**Pomysł.** Najlepiej przebadany wzorzec stron publicznych: czarny pasek
z nazwą serwisu i niebieską kreską, szary pasek menu z podkreślonymi
niebieskimi odnośnikami, duże pismo (19 px od 640 px), żółte tło fokusu
z czarną kreską, „W liczbach” jako lista podsumowania (klucz · wartość ·
źródło) bez ramek, uwaga z wykrzyknikiem w kółku. Zero ozdobników.

**Typografia.** Public Sans 400/600 — krój zrobiony dla administracji
USA (U.S. Web Design System), otwarty. Ok. **50 kB**, najlżejszy
z dziesięciu.

**Paleta.** Jasna: biel / `#0b0c0c` (19,6:1), `--atrament-3` `#505a5f`
(7,1:1), odnośnik `#1d70b8` (5,2:1; na szarym pasku 4,6:1), fokus
`#ffdd00` z `#0b0c0c`. Ciemna: `#0b0c0c` / `#f3f2f1` (17,5:1), odnośnik
`#79b4ec` (8,9:1).

**Czym różni się od AI.** Nie ma w nim niczego „zaprojektowanego na
pokaz”; wygląda jak usługa, z której się korzysta.

**Ryzyko.** Najmniej charakteru: łatwo wziąć zrejestru za stronę urzędu,
a serwis jest niezależny. Trzeba by odróżnić go marką i barwą paska —
nie kopiować GOV.UK jeden do jednego.

---

## Jak oglądać i mieszać

Każdy motyw działa na **każdej** stronie prototypu: pasek „Motyw” nad
nagłówkiem albo `?k=a` … `?k=j` w adresie (wybór zostaje zapamiętany).
Przegląd w `prototyp/kierunki.html`. Jasny i ciemny przełącza przycisk
w nagłówku. A+B nie jest osobnym motywem, tylko dodatkiem do A
(„Jak to liczymy” na marginesie od 1200 px) — jest pod `?k=ab`, poza
paskiem. Kierunki dają się łączyć jak A+B:
z jednego bierze się litery i barwy, z drugiego sposób pokazania liczby
albo marginesu — np. „E z marginesem A+B” albo „D z liczbami F”.

---

## Rekomendacja

**A, „Wypis z rejestru”.** Jako jedyny z dziesięciu przekuwa najważniejszą
cechę serwisu — „każda liczba ma podstawę w rejestrze” — w formę strony,
zamiast opisywać ją akapitami. Wiersz rejestru (etykieta · wartość ·
mianownik · podstawa) jest jednym wzorem dla gminy, posła, firmy i ustawy,
więc przebudowa to jeden komponent zamiast siedemnastu kart. I jest
najtańszy w obsłudze: działa w jednej kolumnie na telefonie, nie wymaga
JavaScriptu, a fonty ważą ok. 80 kB mniej niż dziś (141 wobec 221 kB).

**Po przeglądzie badań (`badania.md`)** dodałbym do A sygnały klikalności
z J: odnośniki wyraźnie podkreślone i żółte tło fokusu. I i J mają
najmocniejsze oparcie w badaniach nad klikalnością, a A najlepiej oddaje
to, czym serwis jest — dlatego na drugą rundę proponuję A, I i J.
Przegląd z pełnych tekstów (`badania-ux.md`) dochodzi do tego samego:
badania nie rozstrzygają między A a J, a „A z widocznym menu i dużym
pismem” mieści wszystkie jego dziesięć wniosków. Widoczne menu na
telefonie jest już w prototypie; wielkość pisma to pierwsza rzecz do
zmierzenia w drugiej rundzie.

Prototyp: `prototyp/` — 15 stron, każda w każdym motywie;
porównanie w `prototyp/kierunki.html`.
Decyzje Pawła: `decyzje.md`.
