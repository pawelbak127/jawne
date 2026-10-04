# Co zatrzymuje ludzi na stronie i każe im wracać — przegląd badań

Zlecone przez Pawła 04.10.2026. Uzupełnia `badania.md` sesji przebudowy, która
nie miała dostępu do internetu i opierała się na streszczeniach wyszukiwarki.
Tu najważniejsze źródła są **przeczytane w pełnym tekście** (oznaczone ✔),
reszta z abstraktu albo strony autora (○). Na końcu: czego badania NIE mówią.

**Poziomy dowodu**, bo nie każde „badanie” waży tyle samo:
- **[N]** recenzowana praca naukowa (eksperyment, duża próba),
- **[B]** badanie branżowe (Nielsen Norman Group, Google) — metodycznie
  przyzwoite, ale bez recenzji,
- **[D]** dane rynkowe o Polsce (Gemius/PBI, Reuters Institute).

---

## Najkrócej: dziesięć wniosków dla zrejestru.pl

1. **Pierwsze 10 sekund decyduje, a wygrywa strona prosta i typowa.** Ludzie
   najpierw przesiewają stronę, potem czytają; prosty i „typowy” układ jest
   oceniany jako najładniejszy już po 17–50 ms (sekcja 1).
2. **Czytelnicy serwisów obywatelskich to w ponad 70% osoby po 45. roku
   życia** — i właśnie ta grupa najbardziej nie lubi złożonych stron
   (sekcje 1 i 8). Duże pismo, mało elementów naraz.
3. **Kwota na mieszkańca to nie nasz wymysł, tylko zmierzone lepsze
   rozumienie** — przeliczenie miliardów na osobę poprawia ocenę proporcji
   (sekcja 3). Zasada 9 ma podstawę naukową.
4. **Zdanie porównawcze przy liczbie („tyle, co…”) poprawia zapamiętanie
   i wykrywanie błędów** (sekcja 3) — to najtańszy sposób, żeby liczba
   „zostawała w głowie”.
5. **Tytuł wykresu ma mówić wniosek, i to u góry** — tytuł jest najczęściej
   oglądanym i zapamiętywanym elementem wykresu (sekcja 4).
6. **Pytanie „jak myślisz, ile…?” przed pokazaniem liczby poprawia
   zapamiętanie i zrozumienie** — także u osób, które nic o temacie nie wiedzą
   (sekcja 3). To uczciwy sposób na zaangażowanie, zgodny z zasadą 6.
7. **Źródło i niepewność przy liczbie nie obniżają zaufania do serwisu**
   (sekcja 2) — przeciwnie, „łatwo sprawdzić” to pierwsza z wytycznych
   wiarygodności. Nasz najsilniejszy wyróżnik jest zgodny z badaniami.
8. **Menu widoczne, nie schowane** — schowana nawigacja obniża znajdowanie
   treści o ponad 20% i spowalnia o 39% na komputerze (sekcja 6).
9. **¾ czasu online w Polsce to telefon** — projektujemy najpierw na 390 px
   (sekcja 8). Wejścia z wyszukiwarki i mediów społecznościowych omijają stronę
   główną — każda strona posła i gminy musi sama mówić, czym jest serwis.
10. **Szybkość ma znaczenie, ale to korelacja** — 0,1 s szybciej wiąże się
    z wyraźnie lepszymi wskaźnikami (sekcja 7). Lekka strona to też koszt
    serwera, o czym wiemy z pułapek 52–69.

---

## 1. Pierwsze sekundy: przesiać, potem czytać

**Liu, White, Dumais 2010** [N] ○ — *Understanding web browsing behaviors
through Weibull analysis of dwell time*, SIGIR 2010
([ACM](https://dl.acm.org/doi/10.1145/1835449.1835513)). Ponad 2 mld
pomiarów czasu na 205 873 stronach. **99% stron ma „ujemne starzenie”**:
szansa opuszczenia strony jest największa na początku i maleje z czasem.
Autorzy nazywają to „screen-and-glean” — najpierw przesiew, potem czytanie.
Omówienie NN/g ✔ ([nngroup.com](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/)):
„Users often leave Web pages in 10–20 seconds”; po ok. 30 sekundach krzywa
się wypłaszcza, a kto został, potrafi zostać „2 minuty lub dłużej”. Przeciętnie
czyta się **ok. ¼ tekstu** strony.

**Lindgaard i in. 2006** [N] ○ — *Attention web designers: You have 50
milliseconds…*, Behaviour & IT 25
([Semantic Scholar](https://www.semanticscholar.org/paper/f9715b117c57d4e7064afe1c1cb95d5bf4cc1831)).
Oceny atrakcyjności wizualnej po 50 ms i po 500 ms są silnie skorelowane.
**Uwaga:** to ocena wyglądu, nie zaufania ani decyzji — popularne „masz 50 ms
na przekonanie klienta” to przekręcenie wyniku.

**Tuch i in. 2012** [N] ✔ (abstrakt u Google Research) — *The role of visual
complexity and prototypicality regarding first impression of websites*, IJHCS 70
([Google Research](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)).
119 zrzutów prawdziwych stron. **Najwyżej oceniane: niska złożoność wizualna
i wysoka typowość** („websites with low VC and high PT were perceived as highly
appealing”). Złożoność działa już po **17 ms**, typowość nieco później, po
dłuższym oglądaniu oba czynniki ważą tyle samo.

**Reinecke i in. 2013** [N] ✔ — *Predicting users' first impressions of website
aesthetics with a quantification of perceived visual complexity and
colorfulness*, CHI 2013
([PDF](https://www.eecs.harvard.edu/~kgajos/papers/2013/reinecke13aesthetics.pdf)).
450 stron, 548 + 242 uczestników z 34 krajów. Złożoność i kolorowość razem
z wiekiem i wykształceniem wyjaśniają **48% zmienności** ocen po 500 ms.
Ocena **silnie spada przy wysokiej złożoności** i lekko przy bardzo niskiej.
Z pełnego tekstu: **„participants older than 45 years liked websites with a low
visual complexity level more than other age groups”**; osoby z doktoratem
najbardziej nie lubiły dużej kolorowości, a osoby z wykształceniem średnim też
wolały stonowane strony. Płeć nie miała znaczenia.

**Dla nas:** pierwszy ekran każdej strony to jedno pytanie i jedna odpowiedź
z mianownikiem, bez ścian kafli. „Typowość” przemawia za układem, który
czytelnik zna (menu u góry, szukanie w nagłówku) — to argument za A i J,
a przeciw bocznemu paskowi G jako jedynej nawigacji. Mało kolorów: barwa ma
nieść informację (klub, głos), a nie dekorować.

---

## 2. Wiarygodność

**Fogg i in. 2003** [N] ○ — *How do users evaluate the credibility of Web
sites?*, DUX 2003 ([ACM](https://dl.acm.org/doi/10.1145/997078.997097)).
2 684 osób oceniało prawdziwe serwisy. Wygląd („design look”) pojawiał się
w **46,1%** komentarzy — najczęściej; potem struktura i koncentracja treści.
Wniosek nie brzmi „ładne = prawdziwe”, tylko: **ludzie oceniają wiarygodność
po tym, co widać, bo treści nie umieją sprawdzić**.

**Stanford Web Credibility Guidelines** [N, zbiorczo] ✔
([credibility.stanford.edu](https://credibility.stanford.edu/guidelines/index.html)).
Dziesięć zasad z kilku badań; najważniejsze dla nas:
1. „Make it easy to verify the accuracy of the information on your site”,
2. „Show that there's a real organization behind your site”,
5. „Make it easy to contact you”,
8. „Update your site's content often (at least show it's been reviewed
   recently)”,
10. „Avoid errors of all types, no matter how small they seem”.

**van der Bles i in. 2020** [N] ○ — *The effects of communicating uncertainty
on public trust in facts and numbers*, PNAS 117(14)
([Groningen](https://research.rug.nl/en/publications/the-effects-of-communicating-uncertainty-on-public-trust-in-facts/)).
Podanie niepewności **liczbowo** lekko obniża pewność co do samej liczby, ale
**nie obniża zaufania do źródła** — także w tematach spornych. Niepewność
opisana słowami („pewna niepewność”) działa gorzej niż liczbowa.

**Dla nas:** zasady 1, 3 i 4 to nie tylko etyka, ale też to, co buduje
zaufanie. Konkretnie: data stanu danych w nagłówku strony (wytyczna 8),
„kto za tym stoi” i kontakt widoczne z każdej strony (2, 5), literówki
i błędy liczb traktowane jak błędy merytoryczne (10). „Tylko 16 dni pobranych
dla kraju” podawać liczbą, nie słowem „częściowe”.

---

## 3. Liczby: jak sprawić, żeby ktoś je zrozumiał i zapamiętał

**Boyce-Jacino, Peters, Galvani, Chapman 2022** [N] ✔ — *Large numbers cause
magnitude neglect: The case of government expenditures*, PNAS
([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9282355/)). Cztery
eksperymenty po ok. 400 osób. Ludzie nie odróżniają milionów od miliardów
w wydatkach publicznych. Przeliczenie **na osobę** poprawia ocenę proporcji
i kolejności programów (np. 19,22 wobec 17,90 poprawnych par, p = 0,021)
i zmienia wybory (67% wobec 63% tańszych programów). To samo daje jednostka
porównawcza („tyle, co kopuła Kapitolu”).

**Barrio, Goldstein, Hofman 2016** [N] ○ — *Improving Comprehension of
Numbers in the News*, CHI 2016
([Microsoft Research](https://www.microsoft.com/en-us/research/publication/improving-comprehension-of-numbers-in-the-news/)).
Trzy eksperymenty, ponad 3 200 osób. Krótkie zdania-„perspektywy” (proporcja,
miejsce w rankingu, zmiana jednostki) **poprawiają zapamiętanie liczb,
szacowanie liczb nieczytanych i wykrywanie zmanipulowanych liczb**.

**Kim, Reinecke, Hullman 2017** [N] ○ — *Explaining the Gap: Visualizing
One's Predictions Improves Recall and Comprehension of Data*, CHI 2017,
nagroda za najlepszą pracę
([Northwestern](https://mucollective.northwestern.edu/project/explaining-the-gap)).
Kto przed zobaczeniem danych **zgaduje** i potem porównuje z prawdą, lepiej
pamięta i rozumie dane niż grupa kontrolna — **także przy małej wiedzy
o temacie**.

**Dla nas:**
- kwota na mieszkańca zawsze pierwsza, suma w miliardach pod nią (zasada 9
  ma pokrycie w PNAS);
- przy dużych kwotach jedno zdanie perspektywy, **policzone z naszych danych,
  nie wymyślone**: „to tyle, ile gmina wydała na oświatę przez 4 miesiące”,
  „3,8 raza więcej niż mediana w województwie”;
- opcjonalne „Jak myślisz, ile…?” na stronie gminy albo przy głosowaniu
  („ilu posłów było przeciw?”) — pytanie o liczbę, nie o człowieka, więc bez
  konfliktu z zasadą 6.

---

## 4. Wykresy

**Cleveland, McGill 1984** [N] ○ i **Heer, Bostock 2010** (powtórzenie na
dużej próbie) — kolejność dokładności odczytu: **położenie na wspólnej osi >
długość > kąt > pole > nasycenie koloru**
([omówienie](https://www.textbookofusability.com/references/clevelandmcgill1984.html)).

**Borkin i in. 2016** [N] ✔ — *Beyond Memorability: Visualization Recognition
and Recall*, IEEE TVCG 22
([PDF](http://olivalab.mit.edu/Papers/07192646.pdf)). 393 wykresy,
33 osoby w okulografie, tysiące opisów z pamięci. **Tytuł oglądano w 59%
przypadków**, a w opisach z pamięci w 46% ludzie powtarzali treść tytułu.
Wykresy z tytułem opisywano wyraźnie lepiej (1,90 wobec 1,30, p < 0,001).
**Tytuł u góry oglądano w 76% przypadków, u dołu w 63%.** Najsłabiej
zapamiętywano wykresy… rządowe, które najczęściej mają tytuł na dole.

**Dla nas:** paski (długość na wspólnej osi) zamiast kół i map tam, gdzie
liczy się porównanie; mapa gmin tylko jako wejście, liczba zawsze obok.
Tytuł wykresu u góry, jako zdanie z wnioskiem („Kraków dostał na mieszkańca
3,4 raza więcej niż mediana województwa”), a nie etykieta („Fundusze UE”).

---

## 5. Jak się czyta stronę

**NN/g 2018, przewijanie** [B] ✔
([nngroup.com](https://www.nngroup.com/articles/scrolling-and-attention/)).
120 osób, ponad 130 tys. fiksacji, ekrany 1920×1080: **57%** czasu
oglądania na pierwszym ekranie, **74%** na dwóch pierwszych. W 2010 roku
pierwszy ekran zbierał 80% — ludzie przewijają chętniej, ale spadek uwagi
pod pierwszym ekranem zostaje.

**NN/g 2006/2017, wzorzec F i „warstwy tortu”** [B] ✔
([nngroup.com](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)).
Wzorzec F (czytanie pierwszych linijek i lewego brzegu) pojawia się, gdy
tekst nie ma struktury. Z nagłówkami ludzie skaczą po nagłówkach i czytają
tylko to, co ich dotyczy. Zalecenie: **najważniejsze w pierwszych dwóch
akapitach; nagłówek zaczyna się od słów niosących treść** („po dwóch
pierwszych słowach czytelnik ma wiedzieć, o co chodzi”).

**NN/g 2017, prosty język** [B] ○
([omówienie](https://digitalgovernmenthub.org/library/plain-language-is-for-everyone-even-experts/)):
także eksperci i osoby z wyższym wykształceniem wolą krótki, prosty tekst.
Nie trzeba osobnej „wersji dla dziennikarzy”.

**Rello, Pielot, Marcos 2016** [N] ✔ — *Make it Big! The Effect of Font Size
and Line Spacing on Online Readability*, CHI 2016
([PDF](https://pielot.org/pubs/Rello2016-Fontsize.pdf),
[omówienie autora](https://pielot.org/2016/01/optimal-font-size-for-web-pages/)).
104 osoby, okulograf, Wikipedia. Czytelność i **zrozumienie** rosną przy
dużym piśmie; przy 10 i 12 pt odpowiedzi na pytania o treść były istotnie
gorsze. Zalecenie autorów: 18 pt, czyli **24 px w przeglądarce na
komputerze**. Zastrzeżenie autorów: estetyki nie badali.

**Piepenbrock, Mayr, Mund, Buchner 2013** [N] ○ — *Positive display polarity
is advantageous for both younger and older adults*, Ergonomics 56
([PDF](https://www.psychologie.hhu.de/fileadmin/redaktion/Oeffentliche_Medien/Fakultaeten/Mathematisch-Naturwissenschaftliche_Fakultaet/Psychologie/AAP/Publikationen/2013/Piepenbrock-2013-Positive_display_polarity_is_.pdf)).
Ciemny tekst na jasnym tle daje lepszą ostrość i lepszą korektę tekstu —
u młodszych i u starszych.

**Dla nas:** pismo tekstu ciągłego 18–20 px na telefonie, większe na
komputerze (dziś 16 px, a opisy pod liczbami i podpisy źródeł 14 px —
`text-sm` — i mniej); jasny motyw domyślny, ciemny jako wybór lub za
ustawieniem systemu. Odpowiedź na pierwszym ekranie, metodologia niżej
w rozwijanych „Jak to liczymy”. Nagłówki działów zaczynać od treści
(„Pomoc publiczna: 22,2 mln zł”), nie od nazwy kategorii.

---

## 6. Nawigacja

**Pirolli, Card 1999** [N] ○ — teoria „żerowania informacyjnego”
([omówienie NN/g](https://www.nngroup.com/articles/information-foraging/)).
Ludzie idą za „zapachem informacji” — słowami odnośników, które obiecują
odpowiedź — i odchodzą, gdy zapach słabnie. Odnośnik „więcej” nic nie
obiecuje; „Wszystkie 31 głosowań inaczej niż klub” obiecuje konkret.

**NN/g 2016, schowane menu** [B] ✔
([hamburger](https://www.nngroup.com/articles/hamburger-menus/),
[mobile](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)).
179 osób, 6 serwisów, komputer i telefon. Menu schowane: **ponad 20% gorsze
znajdowanie treści**, trudność wyżej o 21%, **na komputerze co najmniej 39%
wolniej**, na telefonie 15% wolniej. Na telefonie widoczne lub mieszane menu
używano w 89% przypadków, schowane w 44%.

**Dla nas:** na komputerze menu zawsze widoczne (dziś to dwa rozwijane
„Sejm” i „Pieniądze” — czyli w praktyce schowane); na telefonie co najmniej
szukanie i dwa główne działy na wierzchu. Treść odnośników mówi, co jest
po kliknięciu.

---

## 7. Szybkość

**Deloitte / 55 dla Google 2020, „Milliseconds Make Millions”** [B] ✔
([web.dev](https://web.dev/case-studies/milliseconds-make-millions)).
37 marek, ponad 30 mln sesji. Poprawa o 0,1 s wiązała się m.in. z **+7%
odsłon** w serwisach z formularzami i +8,4% konwersji w handlu.
**Autorzy sami zaznaczają: korelacja, nie przyczynowość.**

**Dla nas:** nie gonimy milisekund dla sprzedaży, ale lekka strona to mniej
porzuceń na słabym zasięgu i mniej pracy dla serwera z 1,8 GB pamięci.
Waga fontów i komponentów powtarzanych na 499 stronach posłów — jak
w pułapkach 54 i 58.

---

## 8. Kto przychodzi i skąd

**PBI/Gemius, IV kw. 2025** [D] ✔
([pbi.org.pl](https://pbi.org.pl/informacje-prasowe/polski-internet-w-iv-kwartale-2025-r/)).
Internauci 7–75 lat: **telefony 76% czasu online**, komputery 23%,
tablety 1%; aplikacje 70% czasu. Średnio 3 h 49 min dziennie.

**mySociety 2015, „Who Benefits From Civic Technology?”** [N, ankieta] ○
([PDF](https://www.mysociety.org/files/2015/10/demographics-report.pdf)).
3 705 ankiet użytkowników serwisów obywatelskich. W USA i Wielkiej Brytanii
**ponad 70% ma powyżej 45 lat** i zwykle wyższe wykształcenie; **97%
skorzystałoby ponownie**; ponad 90% użytkowników TheyWorkForYou uważa, że
taka forma danych pozwala rozliczać posłów.

**mySociety 2023, TheyWorkForYou** [B] ✔
([mysociety.org](https://www.mysociety.org/2023/07/04/learning-from-the-way-people-use-theyworkforyou/)).
Coraz więcej wejść przychodzi z wyszukiwarek i mediów społecznościowych
**wprost na stronę posła albo głosowania**, z pominięciem strony głównej —
i ci ludzie „mijali część informacji”. Odpowiedź serwisu: kontekst
przeniesiony na strony docelowe. W roku wyborczym ruch rośnie
(13 mln odsłon w 2019 wobec ok. 6 mln normalnie) i skupia się na
przywódcach partii. 16% subskrybentów powiadomień to zawodowcy.

**Reuters Institute, Digital News Report 2026 — Polska** [D] ○
([reutersinstitute](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/poland)).
Zaufanie do wiadomości **39%** (spadek o 8 punktów), unikanie wiadomości
**46%**.

**Dla nas:** telefon najpierw. Każda strona posła, gminy i firmy ma działać
jako strona wejścia: jedno zdanie „czym jest zrejestru.pl”, okruszek i droga
do szerszego widoku. Starszy czytelnik to argument za dużym pismem i małą
złożonością (sekcja 1). Niskie zaufanie do mediów to szansa, nie przeszkoda:
odnośnik do rejestru przy liczbie odróżnia nas od komentarza.

---

## Co z tego dla wyboru motywu

| motyw | zgodność z badaniami | zastrzeżenie z badań |
|---|---|---|
| A „Wypis z rejestru” | prosty, typowy, źródło przy liczbie, jasny domyślnie | menu u góry w dwóch grupach — sprawdzić, czy na telefonie nie chowa się całe |
| G „Dyżur nocny” | widoczne menu na komputerze (sekcja 6), liczby wyrównane | układ najmniej typowy (Tuch 2012), panele zwiększają złożoność, „ciemny najpierw” wbrew Piepenbrock 2013 |
| J „Usługa publiczna” | najbardziej typowy, duże pismo (19 px) | ryzyko „jak urząd” — badania nie mówią, czy to obniża chęć powrotu |

Badania nie rozstrzygają między A a J; oba spełniają wnioski 1, 2, 5 i 8.
**A z widocznym menu i dużym pismem** mieści wszystkie dziesięć wniosków.

---

## Czego badania NIE mówią (i czego nie znalazłem)

- **Nie ma badań, które obiecywałyby „więcej użytkowników” dzięki wyglądowi.**
  Wygląd wpływa na pierwsze wrażenie i zaufanie; ruch przychodzi z treści,
  wyszukiwarek i udostępnień. Najwięcej wejść da wartość strony posła i gminy
  jako odpowiedzi na konkretne pytanie.
- **„24% mniej porzuceń przy dobrych Core Web Vitals”** — szeroko cytowane
  jako dane Google, ale w źródłowych wpisach Google tego zdania nie
  znalazłem. Nie powołujemy się.
- **„Ludzie oceniają stronę w 50 ms”** — dotyczy atrakcyjności wyglądu,
  nie zaufania ani decyzji (Lindgaard 2006).
- **Czas na stronie to nie miara wartości.** Krótka wizyta, w której ktoś
  dostał odpowiedź, jest sukcesem; NN/g mierzy, kiedy ludzie odchodzą, nie
  czy byli zadowoleni.
- **Grywalizacja i powiadomienia** — brak mocnych badań dla serwisów
  obywatelskich; jedyne twarde dane to powiadomienia TheyWorkForYou,
  z których korzystają w dużej części zawodowcy. Ewentualne powiadomienia
  („nowe głosowanie mojego posła”) to osobna decyzja, nie element wyglądu.

---

## Metoda

Źródła wyszukane 04.10.2026. Oznaczone ✔ przeczytane w pełnym tekście
(PDF albo strona autora). Oznaczone ○ — z abstraktu lub oficjalnej strony
publikacji, liczby przepisane stamtąd. Tam, gdzie popularny cytat nie zgadzał
się ze źródłem (Lindgaard, Core Web Vitals), zostawiłem źródło.
