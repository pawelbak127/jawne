# Teksty na stronach — co skrócić, co schować, co się powtarza

Zamyka prośbę `DO-przebudowa__2026-10-04__przeglad-tekstow-stron.md`.
Cytaty z `src/` na `main` @ b48538a; `{…}` to wartość wstawiana przez kod.
**Nie ruszam** (zasady z `CLAUDE.md`): mianownika (3), odnośników do
rejestru (1), półpauzy ≠ zero (4), treści warunków UOKiK (10 —
`WarunkiSudop.tsx` zostaje dosłownie), zdań „nie zgadujemy powodu” (2).

Oznaczenia: **skrócić** · **do „Jak to liczymy”** (`<details>`, jedno na
sekcję) · **usunąć — powtarza X**.

---

## Dziesięć zmian o największym zysku

1. **gmina — zdanie o dzielnicy pięć razy.** `gmina/[teryt]/page.tsx`:
   „Dzielnice nie mają osobnych budżetów — pokazujemy budżet całej Warszawy.”,
   „Dzielnice nie mają osobnych finansów…”, „Lista ministerstwa nie rozpisuje
   projektów na dzielnice…”, „Rejestr nie dzieli firm na dzielnice…”,
   „Dzielnice nie mają osobnych zamawiających…”.
   → **raz, pod nagłówkiem:** „Dzielnica nie ma własnego budżetu ani
   osobnych wpisów w rejestrach — liczby niżej dotyczą całej Warszawy.”
2. **gmina — „Kto to postanowił” + dwa akapity wstępu** („Każda pomoc
   z rejestru ma organ, który ją przyznał. Poniżej organy, które podjęły
   decyzje wobec firm z tej gminy — z liczbą decyzji i kwotą, osobno dla
   każdego rodzaju pomocy, bo te rodzaje znaczą dla budżetu różne rzeczy.”
   i „Liczone z pełnej historii tej gminy…”).
   → nagłówek **„Kto przyznał pomoc”**; wstęp **skrócić do:** „Organy, które
   przyznały pomoc firmom stąd: liczba decyzji i kwota według rodzaju
   pomocy.” Drugi akapit **do „Jak to liczymy”**.
3. **gmina — objaśnienie rodzaju pomocy przy każdym organie**
   (`OPIS_KATEGORII[k.kategoria].wyjasnienie` w `OrganyDecyzji`).
   → **usunąć — powtarza się** przy każdym organie; objaśnienia raz,
   w legendzie pod tabelą („Co znaczy każdy rodzaj”).
4. **gmina — ramka „Ta gmina ma pełne dziesięć lat danych”** (4 zdania).
   → **skrócić do:** „Uwaga: ta gmina ma pełne 10 lat danych, większość
   gmin — tylko pobrane dni. Tych sum nie porównuj z innymi gminami.
   [Stan danych]”
5. **gmina — dochody wyjaśnione trzy razy.** Rozwijane „Co wchodzi
   w dochody gminy?” (5 akapitów), notka pod „Z czego składają się te
   dochody” („Udziały w PIT i CIT oraz podatek od nieruchomości są częścią
   dochodów własnych — dlatego są wcięte, a nie dodane obok. Kredyty
   i obligacje nie są dochodem i nie ma ich w tej kwocie.”) i notka pod
   „Rok po roku” („Kwoty w cenach bieżących, bez korekty o inflację —
   złotówka sprzed kilku lat była warta więcej niż dzisiejsza.”).
   → **jedno „Jak to liczymy”** na końcu działu Budżet; notkę o wcięciu
   **skrócić do:** „Pozycje wcięte są częścią dochodów własnych.”; zdanie
   o inflacji **zostaje raz**, przy wykresie (tam jest potrzebne).
6. **gmina — „to wartości całych umów” dwa razy** w zamówieniach (pod
   kaflem i w ramce koncentracji: „Wartość ogłoszenia obejmuje całą umowę,
   często wieloletnią — to nie jest wydatek jednego roku.”).
   → w ramce koncentracji **usunąć — powtarza** zdanie przy sumie.
7. **gmina — reguła nazw pod beneficjentami** („Pokazujemy podmioty, po
   których nazwie widać, że nie są osobą fizyczną (spółki, instytucje,
   organizacje), oraz te, których pojedyncza pomoc przekroczyła {próg} euro
   — te same dane publikuje UOKiK w rejestrze SUDOP. {n} z {m} nie
   wymieniamy z nazwy, bo może to być osoba prowadząca działalność na
   własne nazwisko.”).
   → **skrócić do:** „{n} z {m} beneficjentów nie wymieniamy z nazwy — mogą
   to być osoby prowadzące działalność na własne nazwisko. Ich pomoc jest
   w sumie. [Zasady]”. Reguła z progiem **do „Jak to liczymy”**.
8. **pomoc publiczna — akapit nad kaflami** („Dane z {n} dni: od … do ….
   Rejestr obejmuje dziesięć lat, a my pobieramy go stopniowo — wszystkie
   liczby poniżej dotyczą wyłącznie tych dni, nie całego roku. Pomijamy
   {k} świeże dni: urzędy mają 7 dni na zgłoszenie pomocy, więc dzień
   wliczamy dopiero 14 dni po jego dacie. Zestawienie policzone ….”).
   → zostaje pierwsze zdanie i „liczby dotyczą tylko tych dni”, **przy
   każdej liczbie** (mianownik); „pomijamy świeże dni” i „zestawienie
   policzone” **do „Jak to liczymy”**.
9. **poseł — nieobecności** (dwie notki pod kaflem „udział w głosowaniach”).
   „Usprawiedliwienie dotyczy całego dnia obrad, nie pojedynczego głosowania
   — dlatego liczymy tu dni, a nie głosowania.” → **do „Jak to liczymy”**.
   „Rejestr nie podaje, dlaczego posła nie było. Wyjazd służbowy, choroba
   i nieobecność bez powodu wyglądają w danych tak samo — więc nie
   rozstrzygamy tego za rejestr.” → **zostaje widoczne (zasada 2), skrócić
   do:** „Rejestr nie podaje, dlaczego posła nie było — i my tego nie
   rozstrzygamy.”
10. **strona główna — nagłówek i wstęp.** „Kto Cię reprezentuje
    w Sejmie — i jak naprawdę głosuje.” — „naprawdę” brzmi jak zarzut,
    a nagłówek pomija połowę serwisu (pieniądze). → „Sejm i publiczne
    pieniądze — z rejestrów, liczba po liczbie.” Wstęp (3 zdania, 46 słów)
    **skrócić do:** „Przy każdej liczbie jest odnośnik do rejestru, z którego
    pochodzi. Nie oceniamy i nie komentujemy.” — o gminie mówią drzwi
    „Moja gmina” pod polem szukania.

---

## Reszta, strona po stronie

### `src/app/gmina/[teryt]/page.tsx`

- „Te liczby mówią co innego niż budżet: nie ile gmina wydała, tylko czy
  ją na to stać i ile własnego podatku odpuszcza.” + nagłówek „Finanse
  i podatki — jak gminie idzie” → nagłówek „Wskaźniki finansowe (SMUP)”,
  wstęp **skrócić do:** „Czy gminę stać na wydatki i ile podatku
  odpuszcza.”
- „Wartości podane tak, jak publikuje je rejestr — z jego własną
  dokładnością.” → **do „Jak to liczymy”**. Zdanie o półpauzie
  **zostaje przy tabeli** (zasada 4).
- „Liczymy projekty realizowane wyłącznie w tej gminie. Projektów
  prowadzonych w kilku miejscach nie dzielimy między gminy — podajemy
  tylko ich liczbę.” (pod nagłówkiem FE) → **do „Jak to liczymy”**; to samo
  mówi kafel („Do tego {n} projektów realizowanych tu i w innych gminach
  — tych kwot nie przypisujemy gminie.”).
- „Rok, w którym projekt ruszył, a nie rok wydatku: rejestr podaje jedną
  kwotę na cały projekt. Te same {n} projektów co wyżej, bez wspólnych
  z innymi gminami.” → **skrócić do:** „Według roku rozpoczęcia projektu,
  nie roku wydatku.”; reszta **do „Jak to liczymy”**.
- „Zwolnienia z podatków, dopłaty, preferencyjne pożyczki i pomoc de
  minimis udzielone przedsiębiorcom, którzy mają tu siedzibę — według
  systemu SUDOP prowadzonego przez UOKiK.” → **skrócić do:** „Ulgi,
  dotacje, tanie pożyczki i pomoc de minimis dla firm z siedzibą
  w gminie.” (źródło jest w warunkach UOKiK tuż niżej).
- „Co znaczy „wartość brutto”” (rozwijane w kaflu) → zostaje, ale jako
  część jednego „Jak to liczymy” sekcji pomocy.
- „Do tego {n} organów, których nazw nie pokazujemy, bo rejestr wskazuje
  osoby fizyczne — razem {k} decyzji. Liczby zostają, nazwiska nie.”
  → wiersz w tabeli organów: „{n} organy bez nazwy (osoby fizyczne) ·
  {k} decyzji”. Ostatnie zdanie **usunąć**.
- „Ogłoszenia o udzieleniu zamówienia, w których zamawiający ma siedzibę
  w tej gminie. To nie są wydatki samego urzędu gminy: zamawiającym bywa
  szpital, spółka komunalna albo uczelnia. Do TED trafiają zamówienia
  powyżej progów unijnych, a nie wszystkie.” → **skrócić do:** „Zamówienia
  instytucji z siedzibą w gminie — urzędu, ale też szpitala czy spółki
  komunalnej. Tylko powyżej progów unijnych.”
- „W rejestrze zdarzają się pomyłki o trzy rzędy wielkości — kwota bywa
  wpisana w złych jednostkach. Nie poprawiamy jej i nie ukrywamy; nie
  wliczamy jej tylko do sumy, bo jedna taka pozycja czyni ją bezużyteczną.
  Próg jest nasz, nie rejestru.” → **skrócić do:** „Pomyłki w rejestrze —
  pokazujemy je, ale nie wliczamy do sumy. Próg jest nasz.”
- „Ogłoszenia od 13 listopada 2023 (początek kadencji) do dziś, dane
  pobrane …. Siedzibę zamawiającego ustalamy po NIP-ie w rejestrze REGON
  (Główny Urząd Statystyczny, licencja CC BY 4.0, pobrany …).” → **do „Jak
  to liczymy”**, ale oznaczenie REGON z datą zostaje widoczne jako
  „podstawa” przy sumie (wymóg GUS, pułapka 49).
- „Pliki CSV przygotowane pod polskiego Excela: średnik jako separator,
  przecinek dziesiętny, kodowanie UTF-8.” → **skrócić do:** „CSV pod
  polskiego Excela (średnik, przecinek dziesiętny).”

### `src/app/posel/[slug]/page.tsx`

- „W tym czasie należał(a) do klubów: {…}. Każdy głos porównujemy z klubem
  z dnia głosowania.” → pierwsze zdanie zostaje (to mianownik porównania),
  drugie **do „Jak to liczymy”** jako nowy, szósty punkt.
- „Na podstawie {n} głosowań, w których rejestr odnotował tego posła.”
  → zostaje (mianownik).
- „Rejestr nie podaje tematu wystąpienia — jest w treści pod odnośnikiem.
  Wystąpienia złożone na piśmie dochodzą do stenogramu po dniu obrad,
  więc dla ostatnich dni liczba może jeszcze urosnąć.” → **do „Jak to
  liczymy”**.
- „Skład według rejestru z …. Rejestr nie przechowuje historii: kto
  odszedł z komisji, znika z listy.” → zostaje (to granica danych), jedna
  linia.
- „Pokazujemy metryczkę, nie treść: pełny tekst {interpelacji} i odpowiedzi
  jest w rejestrze Sejmu, pod odnośnikiem przy każdej pozycji.” →
  **skrócić do:** „Pełny tekst i odpowiedź — pod odnośnikiem.”
- Sekcje „Interpelacje” i „Zapytania poselskie” → jedna sekcja z dwiema
  listami (ten sam szablon, dziś dwa razy nagłówek, źródło i zdanie
  o metryczce).
- Zawód, wykształcenie, e-mail, głosy w wyborach, miejsce na sali →
  „Metryczka” (zwinięta na telefonie).

### `src/app/pomoc-publiczna/page.tsx`

- Kafle „wartość pomocy brutto”, „przypadków pomocy”, „beneficjentów”,
  „gmin, w których mają siedzibę” — **brak źródła i okresu przy liczbie**
  (`<Kafel …>` bez `zrodlo` i `mianownik`). → dodać mianownik „w {n}
  pobranych dniach” i odnośnik do SUDOP. To nie skrót, tylko brak
  względem zasad 1 i 3.
- „Liczy się siedziba beneficjenta, nie miejsce inwestycji. Duża firma
  z siedzibą w Warszawie podnosi wynik województwa mazowieckiego, nawet gdy
  zakład ma gdzie indziej.” → zostaje (to wyjaśnia wykres, który inaczej
  myli), ale jako podpis wykresu, jedno zdanie: „Według siedziby firmy,
  nie miejsca inwestycji.” + przykład **do „Jak to liczymy”**.

### `src/app/firma/[nip]/page.tsx`

- „Wartość brutto to ekwiwalent dotacji brutto, czyli tyle, ile pomoc
  jest warta dla firmy. Przy dotacji to cała kwota, ale przy pożyczce,
  gwarancji czy płatnościach rozłożonych w czasie bywa niższa niż kwota
  nominalna. Rejestr podaje obie; sumujemy brutto.” → **do „Jak to
  liczymy”** (ta sama definicja stoi na stronie gminy — jeden tekst
  w jednym miejscu kodu).
- „Źródłem jest TED, unijny dziennik zamówień publicznych — trafiają tam
  zamówienia powyżej progów unijnych, a nie wszystkie. Kwota dotyczy
  całego ogłoszenia, ze wszystkimi częściami i wykonawcami; przy
  ogłoszeniach z kilkoma wykonawcami nie da się z niej wyczytać, ile
  przypadło tej firmie.” → **skrócić do:** „Tylko zamówienia powyżej
  progów unijnych. Przy kilku wykonawcach kwota dotyczy całego ogłoszenia
  — nie wiadomo, ile przypadło tej firmie.”
- „zakres dat w naszych danych” + `zakresDanych()` („Tylko z {n} dni — nie
  z pełnych dziesięciu lat rejestru.”) → zostaje; to mianownik.
- „Zobacz wszystkie publiczne pieniądze w gminie {gmina} →” (na dole, za
  zamówieniami) → **usunąć — powtarza** odnośnik do gminy nad nazwą; ten
  górny dostaje pełne brzmienie zamiast samej nazwy gminy.

### `src/app/ustawa/[numer]/page.tsx`

- „Streszczenie napisał automatycznie model językowy ({model}) wyłącznie
  na podstawie opisu z rejestru, który jest niżej. Może zawierać błędy —
  rozstrzyga tekst rejestru. Każda liczba w streszczeniu została
  sprawdzona: musi występować w opisie rejestru.” → **skrócić do:**
  „Napisał model językowy ({model}) tylko na podstawie opisu z rejestru
  niżej. Liczby sprawdziliśmy z opisem. Rozstrzyga rejestr.” Autor
  zostaje — bez niego tekst przypisywałby się nam.
- „Nazwy etapów pochodzą z rejestru Sejmu. Nie dopisujemy do nich
  własnych wyjaśnień.” → **usunąć** drugie zdanie (wynika z pierwszego).
- „Druki otwierają się prosto z API Sejmu. Zdarza mu się oddać błąd na
  poprawny adres — jeśli plik się nie otworzy, spróbuj ponownie za
  chwilę. Nie kopiujemy druków do siebie: to dokumenty Kancelarii Sejmu
  i mają pochodzić od niej.” → **skrócić do:** „Jeśli druk się nie
  otworzy, spróbuj za chwilę — serwer Sejmu bywa chwilowo niedostępny.”

### `src/app/page.tsx` (główna)

- Sześć kart-pytań („Co trafia do mojej gminy?”, „Gdzie w Polsce jest
  tych pieniędzy więcej?”, „Czy mój poseł głosuje jak klub?”, „Co się
  stało z tą ustawą?”, „Kto rozdaje publiczne pieniądze firmom?”, „Skąd
  to wiadomo?”) → trzy drzwi (gmina, poseł, firma); pozostałe trzy są
  w menu, które jest teraz widoczne bez rozwijania.
- „Barwy są nasze, dobrane pod rozróżnialność przy daltonizmie — nie są
  barwami partyjnymi. Loga klubów dają pięć podobnych czerwieni i trzy
  granaty, więc na ich podstawie nie da się narysować czytelnego wykresu.”
  → pierwsze zdanie zostaje pod wykresem (zapobiega złemu odczytowi),
  drugie **do „Jak to liczymy”**.
- „Ostateczne głosowania nad projektami ustaw i uchwał — tak nazywa je
  rejestr. Wszystkich głosowań, łącznie z poprawkami i sprawami
  porządkowymi, jest {n}.” → zostaje, to mianownik (zasada 8).

---

## Błędy w tekście — zmierzone na zrzutach (lokalna budowa `main` @ 414bc5d)

Tego nie widać w kodzie, tylko w wyrenderowanej stronie (wzorzec 5
z `CLAUDE.md`). Do poprawy niezależnie od wyboru kierunku:

- **„jestw rejestrze Sejmu”** — `posel/[slug]/page.tsx`, `PytaniaPosla`:
  `{`…i odpowiedzi jest`}` i w następnym wierszu `w rejestrze Sejmu…` —
  JSX zjada przejście do nowej linii po wyrażeniu. Na stronie posła
  dwa razy (interpelacje i zapytania).
- **Procent na dwa sposoby:** poseł „0,7 %”, „52,4 %”, „92,5 %” (funkcja
  `procent()`), gmina „88,6%”, „89%”, „81%” (budowane w miejscu). Jeden
  zapis w całym serwisie; w polskiej typografii oba są spotykane,
  ważne, żeby był jeden.
- **Dywiz zamiast minusa:** „-148 zł”, „-1168 zł” (SMUP). Znak minus to
  „−” (U+2212); dywiz w kwocie łatwo przeoczyć i łamie się z liczbą.
- **„2496 gmin”** na głównej wobec „2479 gmin” na `/gminy` — strona główna
  sumuje gminy po okręgach (`okregi().reduce(... o.gmin)`), a `/gminy`
  liczy wykaz gmin — skąd dokładnie 17 różnicy, nie sprawdzałem (nie mam
  bazy). Jedna liczba w serwisie.
- **Warunki UOKiK bez daty** na stronie Krakowa („Źródło: System
  Udostępniania Danych o Pomocy Publicznej (UOKiK). Dane mogą…”), z datą
  na stronie firmy. Zasada 10 wymaga daty pobrania.
- **„zagłosował(a)”, „głosował(a)”, „należał(a)”** — dziś na każdej stronie
  posła. Zamiast zgadywać rodzaj gramatyczny z imienia (rejestr go nie
  podaje, a pomyłka przy czyimś nazwisku kosztuje więcej niż nawias), pisać
  bezosobowo: „Głosowania inaczej niż reszta klubu”, „Rozkład głosów”,
  „Kluby w tym czasie: …”.
