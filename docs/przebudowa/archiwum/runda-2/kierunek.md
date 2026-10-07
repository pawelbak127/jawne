> **Archiwum — runda 2 (stan z 04.10.2026).** Ścieżki w tekście są względem
> `docs/przebudowa/`; prototyp tej rundy jest w `archiwum/runda-2/prototyp/`.
> Co wybrano 07.10.2026: `docs/przebudowa/kierunek.md`. Przegląd archiwum: `archiwum/README.md`.

# Kierunek stylu — runda 2: dziesięć motywów na jednym fundamencie

Decyzja Pawła z 04.10.2026 po lekturze `badania-ux.md`: „Bazując na tych
danych trzeba przebudować wszystkie motywy na nowo.” Zadanie:
`runda-2.md`.

W rundzie 1 motywy różniły się naraz stylem i użytecznością: G miał inne
menu, C inną hierarchię, E inną gęstość. Wybór motywu byłby wtedy wyborem
przypadkowego zestawu kompromisów. W rundzie 2:

- **fundament F1–F14 jest wspólny** — `prototyp/styl.css` i treść stron.
  To ta sama struktura, ta sama kolejność i te same rozmiary minimalne.
  Wynika z badań; motyw go nie zmienia;
- **motyw to warstwa stylu** — `prototyp/skora-a.css` … `skora-j.css`.
  Zmienia kroje, paletę, linie, rytm oraz sposób rysowania liczby
  i źródła. Każdy motyw (także A) jest osobną nakładką z własnymi fontami.

**Jak oglądać:** `prototyp/index.html` → pasek „Motyw” nad nagłówkiem albo
`?k=a` … `?k=j` w adresie. Zestawienie jest w `prototyp/kierunki.html`.
**Jak mierzyć:** `node prototyp/pomiar.cjs` (Playwright) daje tabelę niżej
i surowe `pomiar.json`.

---

## Fundament — co dostała każda strona, niezależnie od motywu

| | Co jest w prototypie | Skąd (badania-ux.md) |
|---|---|---|
| F1 | Na 390 × 844 px widać nazwę strony, jedno zdanie o serwisie i pierwszą odpowiedź z mianownikiem i źródłem. „W liczbach” stoi przed spisem działów, a identyfikatory (TERYT, NIP, druk) zeszły pod odpowiedź. | §1, §5 |
| F2 | Nazwa serwisu z lewej u góry, pole szukania w nagłówku na każdej stronie (także na głównej — jej osobne pole zniknęło), menu u góry. | §1 Tuch 2012 |
| F3 | Bez ustawienia systemu każdy motyw jest jasny; ciemny ma pełną paletę. | §5 Piepenbrock 2013 |
| F4 | Jeden akcent (odnośniki, fokus) plus barwy z funkcją: kluby, głosy, ostrzeżenie. Żadnych barwnych teł dla ozdoby. | §1 Reinecke 2013 |
| F5 | Tekst 18 px na telefonie i 20 px od 1024 px, interlinia 1,55, miara wiersza 59–71 znaków. Drobny tekst (okruszek, opis pod liczbą, źródło, warunki UOKiK) ma 15/16 px; nic mniejszego. | §5 Rello 2016 |
| F6 | Najwyżej jeden obramowany blok na ekranie — „W liczbach”. Działy oddzielone linią i odstępem. | §1 |
| F7 | Nagłówek działu zaczyna się od odpowiedzi („Budżet 2025: 11,8 tys. zł dochodów na mieszkańca”). „Jak to liczymy” jest zawsze na końcu działu, a warunki UOKiK tuż przy liczbach. | §5 NN/g |
| F8 | Kwoty gminy najpierw na mieszkańca, suma pod nimi. Pomoc publiczna na stronie gminy i w kraju też na mieszkańca. | §3 PNAS 2022, zasada 9 |
| F9 | Zdania porównawcze **policzone z naszych danych** (rachunek niżej): krotność mediany, porównanie z województwem, równowartość w budżecie, średnia na przypadek, udział dużych firm. | §3 Barrio 2016 |
| F10 | „Jak myślisz, ile…?” na gminie (udział oświaty w wydatkach) i na głosowaniu (w ilu klubach najczęściej „przeciw”). Ma suwak, „Sprawdź” i „Pomiń”. Bez JavaScriptu pokazuje od razu liczbę. | §3 Kim 2017 |
| F11 | 10 wykresów, każdy z tytułem u góry jako zdaniem z wnioskiem („Co trzecia złotówka wydatków (34,9%) idzie na oświatę”). Wszystkie to paski na wspólnej osi. | §4 Borkin 2016 |
| F12 | Na 1280 px wszystkie 10 działów widoczne. Na 390 px szukanie i działy obu grup na wierzchu. Żadnego odnośnika „więcej”: „budżet miasta ↓”, „treść wystąpienia z 18 września”. | §6 NN/g 2016 |
| F13 | Strona szczegółu ma okruszek, zdanie o serwisie i linię „stan danych” z datami. Stopka na każdej stronie mówi, kto prowadzi serwis, i podaje kontakt. | §8, §2 Stanford |
| F14 | Fonty 50–142 kB; dziś serwis wysyła 221 kB. Żadnych obrazów ozdobnych (warstwice H zniknęły). | §7 |

**Dlaczego F10 nie pyta o liczby z przykładu w `runda-2.md`.** „Dochody na
mieszkańca” i „ilu posłów było przeciw” stoją w „W liczbach” na pierwszym
ekranie (F1). Pytanie o nie musiałoby albo schować odpowiedź z pierwszego
ekranu, albo pytać o coś, co czytelnik już widzi. Dlatego pytania dotyczą
liczb z działów niżej. Obie są o miejscach i całym Sejmie, nie o osobach.

### Pomiar F1–F14 (najgorszy wynik ze wszystkich 13 stron, 04.10.2026)

| motyw | F1 pierwsza / ostatnia odp. (px, tel.) | F2 | F3 jasność tła | F4 | F5 | F6 bloki/ekran | F7 | F8 | F9 g/f/pp | F10 g / gł | F11 | F12 | F13 | F14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 834 / 1466 | tak | 0.896 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 66–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 142 kB, ozdoby 0 |
| B | 821 / 1452 | tak | 0.948 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 61–70 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 81 kB, ozdoby 0 |
| C | 841 / 1560 | tak | 1 | 0 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 59–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 55 kB, ozdoby 0 |
| D | 835 / 1462 | tak | 0.865 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 66–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 108 kB, ozdoby 0 |
| E | 835 / 1422 | tak | 1 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 61–68 zn. | 0 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 128 kB, ozdoby 0 |
| F | 812 / 1660 | tak | 0.915 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 65–69 zn. | 0 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 126 kB, ozdoby 0 |
| G | 837 / 1454 | tak | 0.936 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 59–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 84 kB, ozdoby 0 |
| H | 819 / 1549 | tak | 0.896 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 65–69 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 129 kB, ozdoby 0 |
| I | 841 / 1471 | tak | 0.955 | 0 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 59–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 55 kB, ozdoby 0 |
| J | 824 / 1468 | tak | 1 | 1 odc., 1 tła | 0 < 15 px; 18/20 px; 1.55; 61–67 zn. | 0 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 50 kB, ozdoby 0 |

Jak czytać kolumny:
- **F1:** dolna krawędź pierwszej odpowiedzi; granica to 844 px. Ostatnia
  pozycja „W liczbach” ma granicę 1688 px. Bez paska „Motyw” i ramki
  prototypu, których w serwisie nie będzie.
- **F3:** jasność tła 0–1, liczona bez ustawienia systemu.
- **F4:** odcienie barwne w tekście i tłach poza znakami danych. „1 tła”
  w J to przycisk „Sprawdź” w barwie akcentu.
- **F5:** ile tekstów ma mniej niż 15 px; najmniejszy tekst ciągły na
  telefonie i na komputerze; interlinia; mediana znaków w pełnym wierszu
  na 1280 px.
- **F6:** najwięcej obramowanych bloków na jednym ekranie.
- **F7:** nagłówki działów z liczbą; „Jak to liczymy” na końcu działu.
- **F8:** kwoty „W liczbach” gminy podane na mieszkańca.
- **F9:** zdania porównawcze na gminie, firmie i pomocy publicznej.
- **F11:** wykresy z tytułem u góry i liczbą w tytule; dwie szerokości.

Dodatkowo, poza tabelą:
- 600 renderów (15 stron × 10 motywów × 390/1280 × jasny/ciemny): bez
  przepełnienia i bez błędów konsoli;
- cele dotykowe ≥ 24 px na 13 stronach w obu szerokościach;
- F4 w trybie ciemnym: najwyżej 1 odcień;
- F10 bez JavaScriptu: liczba widoczna we wszystkich motywach.

**Poprawki samego pomiaru** — zanim tabela się ustaliła, skrypt mylił się
w pięciu miejscach. Każdy błąd wyszedł przy sprawdzaniu, na czym dany punkt
„padł”:
- numer działu („2.”) liczył się jako liczba w nagłówku;
- położenie nazwy serwisu było liczone od nazwy strony, którą na stronie
  posła przesuwa portret;
- jasny beż papieru liczył się jako kolor;
- tekst opcji listy wyboru wchodził do tekstu ciągłego;
- długość wiersza była dzielona przez liczbę wierszy razem z krótkim
  ostatnim, co zaniżało wynik o ok. 15 znaków.

### Zdania porównawcze — rachunek (F9, każdy z kontrolą w generatorze)

| Gdzie | Zdanie | Rachunek |
|---|---|---|
| gmina | 1,4 raza więcej niż mediana w województwie | 9,67 mld zł ÷ 816 614 = 11 842 zł; ÷ 8288 zł = 1,43 |
| gmina | 3,4 raza więcej niż mediana; 97% wydatków na oświatę | 4392 ÷ 1275 = 3,44; 3,59 ÷ 3,71 mld zł = 0,968 |
| gmina | pomoc: 27 zł na mieszkańca, ok. 2 razy więcej niż w województwie | 22,2 mln zł ÷ 816 614 = 27,2 zł; ÷ 13 zł (małopolskie, te same 16 dni) = 2,09 |
| firma | średnio 9,3 mln zł na przypadek | 12,8 mld zł ÷ 1380 |
| pomoc publiczna | 27 zł na mieszkańca; 43% dla dużych firm, które mają 1,7% przypadków | 992 mln zł ÷ 37 319 859 (GUS 2025, suma z dziennika importu) = 26,6; 425 ÷ 992 = 0,428; 1314 ÷ 78 868 = 0,0167 |
| głosowanie | w 7 z 11 klubów najczęściej „przeciw” | najczęstszy głos w każdym klubie, bez niezrzeszonych |

„13 zł” dla województwa jest zaokrąglone na stronie źródłowej, dlatego
zdanie mówi „ok. 2 razy”, a nie „2,1 raza”.

---

## Motywy — co zmienił każdy względem rundy 1

Wspólne dla wszystkich: zniknęły barwne tła (zieleń, mięta i liliowy
w I; panele w G), małe pismo (11,5–14 px w opisach, menu i źródłach) i
drugie ramki. W rundzie 1 nakładki B–J ładowały też fonty A, np. H ważył
205 kB zamiast 129. Teraz każdy motyw ładuje wyłącznie swoje fonty.
Kontrast liczony wzorem z `src/lib/kontrast.test.ts`, najsłabsza para tekst/tło.

### A „Wypis z rejestru”
**Tożsamość:** odpis z rejestru — „Dział N” na marginesie, sygnatury
i daty pismem maszynowym, przy każdej liczbie „podstawa: …”.
**Zmiana względem rundy 1:**
- przed nazwą rejestru stoi napis „podstawa:”; na komputerze, jak
  w rundzie 1, źródło ma własną kolumnę po prawej;
- „Dział N” stoi wprost na marginesie;
- identyfikatory zeszły pod odpowiedź.

**Fonty:** Brygada 1918 600, IBM Plex Sans 400/600, Plex Mono 500 —
**142 kB**.
**Kontrast:** tekst 14,9, najsłabszy szary 5,7, akcent 6,5 (ciemny: 13,3 /
5,9 / 8,8).
**Nie jak z AI:** dokument z rejestru zamiast kart; polski krój nagłówków
z 1918 r.; maszynopis tylko tam, gdzie jest identyfikator.
**Ryzyko:** spokojny — przyciąga powagą, nie efektem.

### B „Monitor”
**Tożsamość:** gazeta urzędowa — antykwa Półtawskiego w całym tekście,
podwójne linie, kapitaliki w nagłówkach, źródła kursywą jak przypisy.
**Zmiana względem rundy 1:**
- zniknęła winieta pośrodku (F2: nazwa z lewej);
- zniknęły tekst wyjustowany i listy w dwóch łamach. To szacunek, nie
  pomiar: przy 20 px dwa łamy byłyby węższe niż miara 55–75 znaków (F5);
- gazetę niosą teraz linie i kapitaliki.

**Fonty:** Półtawski Nowy 400/600 — **81 kB**.
**Kontrast:** 16,0 / 6,0 / 7,0 (ciemny: 12,7 / 5,9 / 7,3).
**Nie jak z AI:** polska antykwa książkowa zamiast groteski, podwójna linia
zamiast cienia.
**Ryzyko:** antykwa w tabelach liczb jest mniej czytelna niż groteska;
w danych przewagę ma A albo E.

### C „Tablica”
**Tożsamość:** oznakowanie publiczne — czerń i biel, wersaliki, liczba nad
etykietą, źródło jako czarna etykieta, odwrócenie zamiast koloru.
**Zmiana względem rundy 1:**
- liczba stoi teraz nad etykietą w ramach jednego wiersza, a nie jako
  osobny pas;
- długie tytuły (ustawa, firma) nie są już pisane wersalikami (F1);
- wielkie cyfry zostały, ale z mianownikiem tuż pod nimi.

**Fonty:** Archivo 400/700 — **55 kB**.
**Kontrast:** 18,3 / 6,5 / akcent = tekst (ciemny: odwrotnie, 17,0).
**Nie jak z AI:** zero koloru, zero zaokrągleń, zero cieni.
**Ryzyko:** wielkie liczby mogą czytać się sensacyjnie (zasada 6) —
dlatego mianownik i porównanie stoją w tym samym bloku co liczba.

### D „Kartoteka”
**Tożsamość:** segregator — dział zaczyna zakładka nad grubą kreską,
liczby i nagłówki pismem maszynowym, źródło jak pieczątka.
**Zmiana względem rundy 1:**
- zakładka nad kreską ma tło, nie ramkę (F6);
- pieczątka źródła mieści się w jednym wierszu, żeby nie była drugim
  blokiem.

**Fonty:** IBM Plex Mono 500, Plex Sans 400/600 — **108 kB**.
**Kontrast:** 12,5 / 5,0 / 5,5 (ciemny: 11,2 / 5,3 / 7,1).
**Nie jak z AI:** przekładki i pieczątki zamiast kafli i „badge”.
**Ryzyko:** pismo maszynowe w nagłówkach jest szerokie — długie tytuły
łamią się częściej.

### E „Rocznik”
**Tożsamość:** tablica z rocznika statystycznego — linia gruba–cienka–gruba,
„Dział N”, liczby szeryfowe, mianownik kursywą.
**Zmiana względem rundy 1:**
- „W liczbach” nie ma ramki — to tabela drukowana, więc na ekranie nie ma
  żadnego obramowanego bloku (F6 = 0).

**Fonty:** Source Serif 4 400/600, Public Sans 400/600 — **128 kB**.
**Kontrast:** 15,4 / 5,6 / 6,5 (ciemny: 13,3 / 6,4 / 8,6).
**Nie jak z AI:** linie tabeli drukowanej, szeryf w tekście ciągłym.
**Ryzyko:** dla mieszkańca najbardziej „urzędowo-suchy”.

### F „Reportaż”
**Tożsamość:** dziennikarstwo danych — dużo powietrza, liczba duża
i szeryfowa nad opisem, porównanie kursywą, „W liczbach” bez ramki,
w dwóch kolumnach na komputerze.
**Zmiana względem rundy 1:**
- zdanie porównawcze dostało głos redakcyjny — szeryfową kursywę;
- liczba ma 2,4 rem. Większa nie mieści się w dwóch ekranach telefonu:
  ostatnia pozycja kończy się na 1660 z 1688 px.

**Fonty:** Newsreader 400/600, Public Sans 400/600 — **126 kB**.
**Kontrast:** 13,9 / 5,1 / 6,1 (ciemny: 13,1 / 6,1 / 7,4).
**Nie jak z AI:** rytm redakcyjny zamiast siatki kafli; liczba jak
w nagłówku reportażu.
**Ryzyko:** najdłuższa strona na telefonie; najbliżej do „sensacyjnej”
liczby — trzyma ją mianownik w tym samym bloku.

### G „Pulpit” (w rundzie 1 „Dyżur nocny”)
**Tożsamość:** narzędzie pracy — etykieta wersalikami nad liczbą pismem
maszynowym, „W liczbach” jako **jedna** ramka podzielona liniami na pola.
Od 1280 px spis działów stoi w bocznym pasku, dodatkowo do menu u góry.
**Zmiana względem rundy 1 — największa z dziesięciu:**
- „ciemny najpierw” stał w sprzeczności z F3, więc tożsamość jest teraz
  jasna, a dawna nocna paleta została jako wersja ciemna;
- boczne menu zastępowało górne (wbrew F2) — teraz menu jest u góry,
  a z boku stoi tylko spis działów strony;
- działy jako panele z ramkami zniknęły (F6);
- nazwa „Dyżur nocny” przestała pasować i zmieniła się na „Pulpit”.

**Fonty:** Archivo 400/700, IBM Plex Mono 500 — **84 kB**.
**Kontrast:** 16,2 / 5,9 / 5,9 (ciemny: 12,9 / 5,1 / 7,6).
**Nie jak z AI:** gęstość narzędzia zamiast przewiewnej strony reklamowej;
pola oddzielone liniami, nie kafle z cieniem.
**Ryzyko:** nadal wygląda „dla zawodowców”; boczny pasek tylko na stronach
gminy i posła.

### H „Atlas”
**Tożsamość:** mapa i legenda — nazwy miejsc kursywą szeryfową, „W liczbach”
w podwójnej ramce jak legenda, paski z podziałką co 25% jak skala mapy.
**Zmiana względem rundy 1:**
- zniknęły warstwice pod nazwą (obraz ozdobny, F14) i kreskowanie pasków;
- podziałka ma funkcję: wspólna oś (F11).

**Fonty:** Newsreader 400 kursywa / 600, Public Sans 400/600 —
**129 kB**.
**Kontrast:** 11,2 / 5,0 / 5,8 (ciemny: 10,6 / 5,0 / 6,3).
**Nie jak z AI:** język mapy wynika z treści (gminy, okręgi), nie z mody.
**Ryzyko:** na stronach posła i ustawy kursywa nazw jest tylko stylem.

### I „Plakat” (w rundzie 1 „Naklejka”)
**Tożsamość:** plakat — czarno-biały, ciężkie wersaliki, grube kreski;
jedyna „naklejka” z twardym cieniem to „W liczbach”, a żółć pojawia się
tylko pod tym, co właśnie wskazujesz albo naciskasz.
**Zmiana względem rundy 1:**
- miętowe nagłówki, liliowe źródła i żółte „W liczbach” to były barwne tła
  dla ozdoby (F4);
- ramki i cienie na wszystkim to był brak F6;
- z neobrutalizmu zostały grube kreski, jedna naklejka i „przycisk, który
  się wciska” — teraz jako stan przy wskazaniu, nie stała ozdoba;
- nazwa zmieniła się na „Plakat”.

**Fonty:** Archivo 400/700 — **55 kB**.
**Kontrast:** 16,1 / 7,2 / akcent = tekst; żółć pod tekstem #111: 13,7
(ciemny: 14,5 / 8,1).
**Nie jak z AI:** ostre, płaskie, ciężkie — przeciwieństwo miękkich cieni
i gradientów.
**Ryzyko:** najmniej urzędowy; dla części czytelników może tracić na
powadze.

### J „Usługa publiczna”
**Tożsamość:** w duchu GOV.UK Design System — czarny pasek z nazwą
i niebieską kreską, niebieskie podkreślone odnośniki, żółty fokus z czarną
kreską, „W liczbach” jako lista podsumowania bez ramki.
**Zmiana względem rundy 1:**
- pismo 20 px na komputerze (było 19);
- zielony przycisk „Sprawdź” to był drugi akcent, więc jest teraz w barwie
  odnośników (F4).

**Fonty:** Public Sans 400/600 — **50 kB**, najlżejszy.
**Kontrast:** 17,5 / 6,3 / 4,6 (ciemny: 14,1 / 7,6 / 7,2). 4,6 to odnośnik
na szarym pasku menu — najsłabsza para ze wszystkich motywów, nadal
powyżej 4,5.
**Nie jak z AI:** nic „zaprojektowanego na pokaz”; wygląda jak usługa.
**Ryzyko:** łatwo wziąć zrejestru za stronę urzędu, choć to niezależny
serwis. Nazwa i zdanie o serwisie (F1) muszą to mówić, a pasek nie może
kopiować GOV.UK jeden do jednego.

---

## Rekomendacja na wybór Pawła: A, J i F

W pomiarach F1–F14 wszystkie dziesięć przechodzi, więc fundament przestał
różnicować. Różnią się charakterem, wagą i ryzykiem:

- **A „Wypis z rejestru”** — najlepiej oddaje to, czym serwis jest:
  „podstawa” przy każdej liczbie to zasada 1 zamieniona w formę strony.
  142 kB, wciąż o 79 kB mniej niż dziś.
- **J „Usługa publiczna”** — najbardziej typowy układ (Tuch 2012),
  najlżejszy (50 kB), F6 = 0. Wybór, jeśli liczy się przede wszystkim
  „od razu wiem, jak tego używać”.
- **F „Reportaż”** — najbardziej zapraszający dla mieszkańca: liczba
  i porównanie jak w dobrym dziennikarstwie danych. F6 = 0.

Dla odważniejszej wersji: **I „Plakat”** (55 kB) — najbardziej
rozpoznawalny, ale z ryzykiem powagi.

Kroki po wyborze, wspólne dla każdego motywu:
- test z zadaniami na 5–6 osobach („ile gmina dostała z UE na
  mieszkańca?”) na 2–3 wybranych motywach;
- zmierzenie, czy duże pismo nie wydłuża strony za bardzo dla stałych
  czytelników.
