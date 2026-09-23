# Test równowagi (art. 6 ust. 1 lit. f RODO)

Dokument wewnętrzny, spisany **przed** publikacją serwisu. Udostępniany na
żądanie osobom, których dane dotyczą, i organowi nadzorczemu.

| | |
|---|---|
| Administrator | **[do uzupełnienia: imię i nazwisko albo podmiot]**, **[adres]** |
| Kontakt | **[do uzupełnienia: JAWNE_KONTAKT]** |
| Serwis | **[do uzupełnienia: domena]** |
| Data sporządzenia | 23.09.2026 |
| Przegląd | przy każdej zmianie zakresu danych, nie rzadziej niż raz w roku |

Test ma trzy części, tak jak zaleca EROD/UODO: **cel**, **niezbędność**,
**równowaga**. Na końcu jest wniosek i lista zabezpieczeń, z których każde jest
zaimplementowane w kodzie — z nazwą pliku, żeby dało się sprawdzić.

---

## 1. Cel — czy interes jest prawnie uzasadniony

**Interes:** jawność działania Sejmu i wydatkowania środków publicznych.
Konkretnie: pokazanie obywatelowi, jak głosuje poseł z jego okręgu i jakie
publiczne pieniądze trafiły do jego gminy — za każdym razem z odnośnikiem do
rejestru, z którego liczba pochodzi.

**Dlaczego to interes uzasadniony:**

- wolność wypowiedzi i prawo do informacji (art. 11 Karty praw podstawowych,
  art. 54 i 61 Konstytucji RP) — motyw 47 RODO wprost wskazuje przetwarzanie
  w ramach uzasadnionego interesu administratora jako dopuszczalne, a art. 85
  nakazuje godzić ochronę danych z wolnością wypowiedzi i informacji,
- wszystkie dane pochodzą z rejestrów, które **prawo nakazuje prowadzić
  i publikować**: rejestr głosowań Kancelarii Sejmu, SUDOP (ustawa o postępowaniu
  w sprawach dotyczących pomocy publicznej), listy projektów Funduszy
  Europejskich (rozporządzenie 2021/1060), dane GUS,
- interes jest bieżący i rzeczywisty, a nie hipotetyczny: serwis już pokazuje
  4 775 głosowań imiennych i pomoc publiczną dla 2 494 gmin.

**Czyj to interes:** administratora (prowadzenie serwisu obywatelskiego) oraz
osób trzecich — czytelników, wyborców, dziennikarzy i samorządów.

---

## 2. Niezbędność — czy nie da się inaczej

Pytanie nie brzmi „czy to wygodne”, tylko „czy da się osiągnąć cel mniejszym
kosztem dla prywatności”.

| Dane | Czy niezbędne | Uzasadnienie |
|---|---|---|
| Imię i nazwisko posła | **tak** | Bez nazwiska nie da się powiedzieć, jak głosował *mój* poseł. To dane osoby pełniącej funkcję publiczną, jawne z mocy prawa. |
| Głos posła w głosowaniu imiennym | **tak** | To jest przedmiot serwisu; głosowanie jest imienne z mocy regulaminu Sejmu. |
| Zawód, wykształcenie, rok urodzenia posła | **tak, w minimalnym zakresie** | Publikuje je Kancelaria Sejmu; służą identyfikacji (powtarzające się nazwiska) i kontekstowi. Nie pokazujemy adresu, stanu cywilnego ani danych rodziny. |
| Nazwa beneficjenta pomocy publicznej będąca **firmą** (spółka, instytucja) | **tak** | Nazwa osoby prawnej nie jest daną osobową; bez niej nie da się powiedzieć, kto dostał publiczne pieniądze. |
| Nazwa beneficjenta będąca **imieniem i nazwiskiem** osoby fizycznej prowadzącej działalność | **tylko powyżej progu 100 tys. EUR** | Poniżej progu cel — kontrola wydatków publicznych — jest osiągalny bez nazwiska: pokazujemy kwoty, liczbę takich podmiotów, gminę i rodzaj pomocy. Powyżej progu publikację nakazują same przepisy o pomocy publicznej (GBER, art. 9 rozporządzenia 651/2014). |
| Nazwisko oskarżyciela prywatnego w tytule sprawy poselskiej | **nie** | To osoba prywatna, która nie wybrała życia publicznego. Cel (pokazanie, że wobec posła toczy się sprawa) osiągamy bez jej nazwiska. |
| Dane odwiedzających serwis | **nie** | Nie zbieramy ich wcale: bez kont, bez ciasteczek, bez analityki, bez dziennika wejść (`deploy/Caddyfile`). |

**Wniosek:** zakres danych jest ograniczony do tego, co potrzebne. Tam, gdzie cel
da się osiągnąć bez nazwiska osoby fizycznej, nazwiska nie pokazujemy — i to
szerzej, niż wymaga prawo.

---

## 3. Równowaga — interes administratora wobec praw osoby

### 3.1 Czego osoba może się rozsądnie spodziewać

- **Poseł**: że jego głosowania, klub i okręg będą publiczne i komentowane.
  Rejestr głosowań jest publiczny od dnia głosowania; my go nie ujawniamy,
  tylko przedstawiamy czytelniej.
- **Firma (osoba prawna)**: że otrzymanie pomocy publicznej jest jawne — wynika
  to wprost z ustawy i z rozporządzeń unijnych, a SUDOP jest publiczną
  wyszukiwarką bez logowania.
- **Osoba fizyczna prowadząca działalność**: tu oczekiwanie jest słabsze.
  Ktoś, kto dostał 2 tys. zł dopłaty do szkolenia, nie spodziewa się, że jego
  imię i nazwisko trafi na stronę indeksowaną przez wyszukiwarki obok kwoty.
  **To jest główne ryzyko i to ono ukształtowało nasze reguły.**
- **Osoba prywatna w sprawie z oskarżenia prywatnego**: nie spodziewa się
  niczego — nie weszła do sfery publicznej dobrowolnie.

### 3.2 Jakie skutki grożą osobie

Możliwe: rozpoznawalność, niechciane kojarzenie z kwotą publicznych pieniędzy,
komentarze w sieci, w skrajnym przypadku nękanie. Nie występują: decyzje
automatyczne, ocena punktowa, ryzyko finansowe, ujawnienie danych wrażliwych
(nie przetwarzamy żadnej kategorii z art. 9 — nie ma zdrowia, poglądów,
wyznania, pochodzenia; przynależność klubowa posła to funkcja publiczna,
a nie „poglądy polityczne” w rozumieniu art. 9, i pochodzi z oficjalnego
rejestru Sejmu).

### 3.3 Co robimy, żeby przeważyć ryzyko — zabezpieczenia

Każde z nich jest w kodzie i objęte testami:

1. **Nazwiska osób prywatnych znikają** z tytułów, podglądów linku i z indeksu
   wyszukiwania — `src/lib/prywatnosc.ts`, funkcja `bezNazwiskOsobPrywatnych`.
   Strona takiej sprawy dostaje `noindex` i mówi o tym czytelnikowi wprost.
2. **Nazwę beneficjenta pokazujemy tylko wtedy**, gdy widać w niej formę prawną
   albo instytucję i nie ma w niej imienia z rejestru PESEL ani kodu pocztowego
   — `nazwaPodmiotuJawna`. Pozostałych nie wymieniamy, ale zawsze podajemy ich
   liczbę i wliczamy kwoty do sum: jawność pieniędzy nie wymaga jawności osoby.
3. **Próg kwotowy 100 tys. EUR** (`PROG_JAWNOSCI_EUR`) odsłania nazwisko tylko
   tam, gdzie publikacji wymagają przepisy unijne — i **tylko gdy działa adres
   do zgłoszenia sprzeciwu**. Bez adresu próg jest wyłączony w kodzie, nie
   w deklaracji.
4. **Strona odsłonięta progiem ma `noindex`** — informacja zostaje w serwisie,
   ale nie buduje śladu w wyszukiwarkach.
5. **Wyszukiwarka nie znajduje osób fizycznych** — ani po nazwisku, ani po
   dokładnym NIP-ie (`szukajFirm` w `src/lib/dane.ts`). Bez tego samo trafienie
   mówiłoby, że osoba o tym nazwisku dostała pomoc.
6. **Nie oceniamy i nie rankingujemy** — żadnych odznak, punktów ani list
   „najgorszych”. Ryzyko dla osoby rośnie wtedy, gdy dane są przetworzone
   w ocenę; my zostawiamy liczenie czytelnikowi.
7. **Każda liczba ma odnośnik do rejestru** — osoba, która uważa liczbę za
   błędną, widzi od razu, gdzie zgłosić sprostowanie u źródła.
8. **Liczba zawsze z mianownikiem i `null` ≠ zero** — zabezpieczenie przed
   krzywdzącym wnioskiem z niepełnych danych.
9. **Sprzeciw działa naprawdę**: adres jest na stronie prywatności, przy
   nazwiskach odsłoniętych progiem i w stopce. Po uwzględnieniu sprzeciwu nazwa
   znika z serwisu, a kwota zostaje w sumach zbiorczych.
10. **Bezpieczeństwo danych**: serwer w EOG (Frankfurt), dysk zaszyfrowany,
    dostęp wyłącznie kluczem SSH, brak dziennika adresów IP odwiedzających,
    baza tylko do odczytu po stronie serwisu.

### 3.4 Ważenie

| Za przetwarzaniem | Przeciw |
|---|---|
| Kontrola wydatków publicznych to jeden z podstawowych celów, dla których dane w ogóle są publikowane | Osoba fizyczna prowadząca małą działalność nie jest osobą publiczną |
| Dane są już jawne w rejestrach państwowych, dostępnych bez logowania | Serwis ułatwia dotarcie do nich i zestawia je razem — to realna różnica, nie formalność |
| Serwis nie tworzy ocen, profili ani rankingów | Zestawienie „kto dostał najwięcej” może być odbierane jako zarzut |
| Osoba ma realną i prostą drogę sprzeciwu, a my go wykonujemy | Sprzeciw działa dopiero po fakcie |
| Dla osób pełniących funkcje publiczne jawność jest warunkiem sprawowania mandatu | — |

**Wniosek.** Interes przeważa w odniesieniu do: posłów, osób prawnych oraz
pomocy publicznej powyżej progu wynikającego z prawa unijnego. **Nie przeważa**
w odniesieniu do nazwisk osób fizycznych przy drobnej pomocy i do osób
prywatnych w sprawach sądowych — i dlatego tych danych nie pokazujemy, mimo że
są w rejestrach publicznych. Tam, gdzie mieliśmy wątpliwość, decydowaliśmy na
korzyść osoby.

---

## 4. Co uruchamia ponowny test

- rozszerzenie zakresu danych o nowy rejestr zawierający dane osobowe
  (np. zamówienia publiczne, oświadczenia majątkowe, interpelacje),
- zmiana progu kwotowego albo reguły `nazwaPodmiotuJawna`,
- zdjęcie `noindex` z serwisu (premiera) — **wymagane przed premierą**,
- pierwszy wniesiony sprzeciw, który każe zmienić regułę, a nie tylko usunąć
  jeden wpis,
- zapytanie organu nadzorczego.

## 5. Rejestr sprzeciwów

Prowadzony osobno, poza repozytorium (zawiera dane osobowe). Dla każdego
zgłoszenia: data wpływu, czego dotyczyło, decyzja, data wykonania. Statystykę
zbiorczą (ile wpłynęło, ile uwzględniono) publikujemy raz w roku na stronie
prywatności.
