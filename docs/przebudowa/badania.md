# Co przyciąga i co się dobrze klika — przegląd badań

Prośba Pawła z 04.10.2026: „jak powinna wyglądać strona, która przyciąga
uwagę i będzie dobrze klikalna” — przy tym, że dane mają być rzetelne.

**Zastrzeżenie o źródłach.** Pełnych tekstów nie dało się otworzyć
(serwer pośredniczący tej sesji blokuje pobieranie stron). Wszystko poniżej
pochodzi ze streszczeń wyników wyszukiwarki dla wskazanych adresów, a nie
z lektury całości. Liczby przepisuję tylko tam, gdzie streszczenie podawało
je wprost. Przed cytowaniem na zewnątrz warto otworzyć oryginał.

**Pełniejszy przegląd: `badania-ux.md`** (główna sesja, 04.10.2026 —
20 źródeł, najważniejsze przeczytane w całości, z poziomem dowodu
i działem „czego badania nie mówią”). **Gdzie się różnimy, rozstrzyga
tamten plik.** Poprawki, które z niego wynikły, są niżej oznaczone
„(popr.)”; wnioski z niego przeniesione do prototypu i te, które czekają
na drugą rundę, są w ostatnim dziale.

---

## 1. Wygląd jest częścią wiarygodności, a pierwsze wrażenie estetyczne powstaje w ułamku sekundy

- **Stanford, Fogg i in., 2002** — [How Do People Evaluate a Web Site's
  Credibility](http://credibility.stanford.edu/pdf/How_Do_People_Evaluate_a_Web_Site's_Credibility_v37.pdf).
  2 684 uczestników oceniało wiarygodność prawdziwych serwisów. Wygląd
  („design look”) pojawił się w **46,1%** komentarzy, struktura informacji
  w **28,5%**. Przy serwisach finansowych wygląd padał częściej (54,6%)
  niż przy informacyjnych (39,6%).
  *Dla nas:* ludzie nie czytają metodologii, zanim zaufają — patrzą.
  Staranny wygląd nie jest ozdobą, tylko pierwszym dowodem rzetelności.
- **Google Research, Tuch i in., 2012** — [The role of visual complexity and
  prototypicality…](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/),
  [omówienie na blogu Google](https://research.google/blog/users-love-simple-and-familiar-designs-why-websites-need-to-make-a-great-first-impression/).
  Ocena **atrakcyjności wyglądu** powstaje w **17–50 ms** (popr.: to ocena
  wyglądu, nie zaufania ani decyzji — tak samo „50 ms” u Lindgaard 2006,
  zob. `badania-ux.md`, dział 1). Najlepiej oceniane były strony
  o **niskiej złożoności wizualnej** i **wysokiej prototypowości** — czyli
  takie, które wyglądają jak „typowa strona tego rodzaju”.
  *Dla nas:* oryginalność opłaca się w szczegółach (krój, barwa, sposób
  pokazania liczby), a nie w układzie. Menu na górze, szukanie po prawej,
  treść w kolumnie — to ma zostać we wszystkich motywach.
- **NN/g, Aesthetic-Usability Effect** —
  [nngroup.com](https://www.nngroup.com/articles/aesthetic-usability-effect/).
  Ładniejszy interfejs jest postrzegany jako łatwiejszy i ludzie wybaczają
  mu drobne usterki. Działa też w drugą stronę: ładny wygląd **maskuje**
  problemy w testach z użytkownikami.
  *Dla nas:* przy wyborze motywu oceniać na tych samych zadaniach („ile
  gmina dostała z UE na mieszkańca?”), a nie „który ładniejszy”.

## 2. Klikalne musi wyglądać na klikalne

- **NN/g, Flat UI Elements Attract Less Attention** —
  [nngroup.com](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/).
  9 serwisów, 71 uczestników, okulografia. Przy słabych sygnałach
  klikalności (płaskie przyciski, odnośniki bez podkreślenia) ludzie
  szukali dłużej: **+22% czasu**, **+25% fiksacji** na stronie.
- **NN/g, Beyond Blue Links** —
  [nngroup.com](https://www.nngroup.com/articles/clickable-elements/).
  Najmocniejsze sygnały to kolor odróżniający od tekstu **i** podkreślenie;
  sam kolor nie wystarcza (daltonizm, słaby ekran).
- **GOV.UK Design System** — [Links](https://design-system.service.gov.uk/styles/links/),
  [Focus states](https://design-system.service.gov.uk/get-started/focus-states).
  Odnośniki niebieskie i podkreślone; fokus klawiatury to żółte tło
  `#ffdd00` z czarną kreską `#0b0c0c` — widoczny na każdym tle.
- **Information scent** —
  [uxtigers.com](https://www.uxtigers.com/post/information-scent).
  Ludzie klikają tam, gdzie etykieta zapowiada to, czego szukają. Ogólne
  „Więcej” i „Szczegóły” zapachu nie mają; „Wszystkie 47 przypadków pomocy
  PGE” — ma.

*Dla nas:* w każdym motywie odnośnik w tekście jest podkreślony,
„źródło ↗” wygląda jak element, który się naciska (zasada 1: „ma wyglądać
jak element interfejsu, nie jak przypis”), a etykiety mówią, dokąd prowadzą.

## 3. Jak się czyta — warstwy, nie akapity

- **NN/g, Layer-Cake Pattern** —
  [nngroup.com](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
  i **F-Shaped Pattern** —
  [nngroup.com](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/).
  Najskuteczniejszy sposób czytania stron to „przekładaniec”: oko skacze
  po nagłówkach i zagląda pod ten, który pasuje. Wzór „F” (pierwsze słowa
  linii, potem coraz mniej) pojawia się, gdy nagłówki są słabe.
  *Dla nas:* mocne, opisowe nagłówki działów i liczba w pierwszych słowach
  wiersza. Właśnie dlatego „W liczbach” stoi na pierwszym ekranie, a wiersz
  rejestru zaczyna się od etykiety.

## 4. Szukanie — widoczne, szerokie, z przyciskiem

- **NN/g, Search: Visible and Simple** —
  [nngroup.com](https://www.nngroup.com/articles/search-visible-and-simple/)
  oraz **113 Design Guidelines for Homepage Usability** —
  [nngroup.com](https://www.nngroup.com/articles/113-design-guidelines-homepage-usability/).
  Pole szukania ma być otwarte (nie ikona lupy), na każdej stronie, szerokie
  na ok. **30 znaków** i z przyciskiem.
  *Dla nas:* zrejestru ma trzy rodzaje rzeczy do znalezienia (gmina, poseł,
  firma) — pole w nagłówku jest najważniejszym przyciskiem serwisu.

## 5. Ludzie nie wchodzą przez stronę główną

- **mySociety, 2023** — [Learning from the way people use
  TheyWorkForYou](https://www.mysociety.org/2023/07/04/learning-from-the-way-people-use-theyworkforyou/).
  To najbliższy nam odpowiednik (brytyjski serwis o parlamentarzystach).
  Wejścia z wyszukiwarek i mediów społecznościowych omijają strony
  przeglądowe — ludzie lądują wprost na stronie posła albo debaty. Okienko
  wyskakujące zamknęło **75,7%** osób. Ramka „gdzie dalej” zebrała **0,1%**
  kliknięć. Dziennikarze i badacze potrzebują czego innego niż mieszkańcy.
  *Dla nas:* każda strona, na którą da się wejść z zewnątrz, sama mówi
  jednym zdaniem, czym jest serwis i skąd ma liczby — w nagłówku strony,
  przed „W liczbach” (punkt 8 niżej). Żadnych
  okienek. Odnośniki „dalej” tylko tam, gdzie kontekst je uzasadnia
  („Inne gminy powiatu”), a nie jako ramka na końcu.

## 6. Pozostałe ustalenia

- **NN/g, Dark Mode** — [nngroup.com](https://www.nngroup.com/articles/dark-mode/).
  Do czytania tekstu tryb jasny wypada lepiej u większości ludzi (zwłaszcza
  przy dobrym oświetleniu); ciemny ma sens jako wybór, nie jako domyślny.
  *Dla nas:* wszystkie motywy idą za ustawieniem systemu, a G „Dyżur nocny”,
  zaprojektowany najpierw jako ciemny, też ma pełną wersję jasną.
- **Our World in Data** — [FAQ](https://ourworldindata.org/faqs).
  Serwis, który zbudował zaufanie na danych, ma źródło i pobieralne dane
  przy **każdym** wykresie, a nie w jednym dziale „Metodologia”. To nasza
  zasada 1 — i potwierdzenie, że da się ją połączyć z wyglądem, który
  przyciąga.

---

## Co z tego wynika dla wszystkich dziesięciu motywów

Wpisane w prototyp niezależnie od motywu (to nie podlega wyborowi):

1. Menu u góry, szukanie otwarte w nagłówku, treść w jednej kolumnie
   na telefonie — **typowy układ** (Tuch 2012). Wyjątek: G na szerokim
   ekranie przenosi menu w bok — to świadomie mniej typowe.
2. Odnośnik w tekście **podkreślony**; „źródło ↗” jako element do
   naciśnięcia; cele dotykowe ≥ 24 px (sprawdzone na sześciu stronach
   w każdym motywie).
3. Fokus klawiatury: obrys w barwie akcentu; w J żółte tło z czarną kreską
   jak w GOV.UK — do rozważenia dla każdego motywu, który zostanie.
4. Opisowe nagłówki działów i liczba na początku wiersza (layer-cake).
5. Jasny domyślnie, ciemny według systemu albo przełącznika.
6. Bez okienek wyskakujących, bez ramek „polecane”.
7. Źródło przy każdej liczbie i wykresie.
8. Jedno zdanie „czym jest ten serwis” w nagłówku każdej strony poza
   główną i wynikami szukania — bo ludzie lądują na stronie posła albo
   gminy prosto z wyszukiwarki i mediów społecznościowych
   (mySociety 2023). Treść i miejsce: `nawigacja.md`, dział 3.

   **Dlaczego tego zabrakło w pierwszej wersji (poprawione 04.10).**
   Prototyp powstał przed przeglądem badań, a zdanie o serwisie było
   w nim tylko w dwóch miejscach: w stopce i obok logo — ale obok logo
   dopiero od 1024 px. Na telefonie, czyli tam, dokąd prowadzi link
   z Facebooka, nie było go na pierwszym ekranie w ogóle (stopka jest
   kilka tysięcy pikseli niżej). Tak samo wygląda dziś `src/`: zdanie
   „Niezależny serwis obywatelski…” stoi tylko w stopce `layout.tsx`,
   a obok logo jest samo „Sejm X kadencji”, i to dopiero od 640 px.
   Przegląd badań to wykazał, ale w pierwszym podejściu ustalenie trafiło
   tylko do tego pliku, zamiast od razu do prototypu.

## Jak motywy wypadają na tle tych ustaleń

Moja ocena, nie pomiar na ludziach — do sprawdzenia testem z zadaniami,
gdy zostaną 2–3 motywy.

| Motyw | Typowość układu | Sygnał „to się klika” | Ryzyko |
|---|---|---|---|
| A „Wypis z rejestru” | wysoka | dobry (podkreślenia, ramka źródła) | spokojny — może nie przyciągać |
| B „Monitor” | średnia (łamy) | średni (odnośniki w sepii giną w gęstym tekście ciągłym) | wolny dla kogoś, kto chce liczby |
| C „Tablica” | wysoka | mocny (odwrócenie przy najechaniu) | wielkie liczby czytają się sensacyjnie |
| D „Kartoteka” | wysoka | dobry (zakładki) | biurowy, mono męczy w długim tekście |
| E „Rocznik” | wysoka | średni (dużo linii tabeli) | urzędowo-suchy |
| F „Reportaż” | wysoka | dobry | dłuższa strona |
| G „Dyżur nocny” | **niższa** (boczne menu) | dobry (panele, cyjan) | wygląda jak narzędzie dla zawodowców |
| H „Atlas” | wysoka | dobry | ozdobniki (warstwice) mogą rozpraszać |
| I „Naklejka” | wysoka | **najmocniejszy** (wszystko jak przycisk) | najmniej „urzędowy” — może tracić na powadze |
| J „Usługa publiczna” | **najwyższa** | **mocny** (wzorzec GOV.UK) | najmniej charakteru, „jak strona urzędu” |

## Wnioski z `badania-ux.md` — co już jest w prototypie

**Runda 2 (04.10.2026, decyzja Pawła):** wszystko z listy „czeka na drugą
rundę” niżej weszło do wspólnego fundamentu F1–F14 — większe pismo
(18/20 px, nic poniżej 15 px), tytuły wykresów z wnioskiem, zdania
porównawcze liczone z naszych danych i „Jak myślisz, ile…?”. Każdy punkt
jest zmierzony w każdym motywie: `kierunek.md`. Lista niżej zostaje jako
zapis tego, w jakiej kolejności to przychodziło.

**Przeniesione do prototypu 04.10.2026:**

- **Menu na telefonie nie jest już schowane w całości** (NN/g 2016: schowane
  menu — ponad 20% gorsze znajdowanie, na telefonie 15% wolniej; widoczne
  albo mieszane używano w 89% przypadków, schowane w 44%). Pod nazwą
  serwisu stoi otwarte pole szukania, pod nim rząd sześciu głównych działów
  (Posłowie, Głosowania, Ustawy | Gminy, Pomoc publiczna, Firmy), reszta
  w „Menu”. Wcześniej na telefonie były tylko dwa przyciski: „Szukaj”
  i „Menu” — sprzecznie z działem 4 tego pliku. Szczegóły i pomiar:
  `nawigacja.md`, dział 2.
- **G: „ciemny najpierw” wbrew badaniom polaryzacji** (Piepenbrock 2013:
  ciemny tekst na jasnym tle lepszy u młodszych i starszych) — dopisane
  do ryzyka G w `kierunek.md`. Prototyp i tak idzie za ustawieniem systemu.

**Czekało na drugą rundę (zrobione w rundzie 2):**

- **Większe pismo** (Rello 2016: zrozumienie spada przy małym piśmie;
  autorzy zalecają 24 px na komputerze; czytelnicy serwisów obywatelskich
  to w ponad 70% osoby po 45. roku życia). Prototyp ma 16 px w tekście
  i 13–14,5 px w opisach pod liczbami; J ma 19 px od 640 px. Większe pismo
  wydłuża stronę i spycha odpowiedź pod pierwszy ekran — zmierzyć na
  wybranych motywach, nie zmieniać naraz we wszystkich dziesięciu.
- **Tytuł wykresu u góry jako zdanie z wnioskiem** (Borkin 2016) —
  prototyp ma mało wykresów; zasada dla głównej sesji przy przebudowie.
- **Zdanie perspektywy przy dużej kwocie** (Barrio 2016) i **„Jak myślisz,
  ile…?”** (Kim 2017) — nowe elementy treści; perspektywa tylko policzona
  z naszych danych, nigdy wymyślona. Do decyzji Pawła.

