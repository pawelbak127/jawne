# Nawigacja i szablony stron

Zasada: **każdy cel widać bez zgadywania**, każda strona mówi, gdzie
jesteś, i każda zaczyna się od odpowiedzi, a kończy metodologią.

---

## 1. Mapa serwisu (bez zmian w adresach)

```
zrejestru.pl
├── Sejm
│   ├── Posłowie ............ /poslowie → /posel/[slug]
│   ├── Głosowania .......... /glosowania → /glosowanie/[id]
│   ├── Ustawy .............. /ustawy → /ustawa/[numer]
│   ├── Komisje ............. /komisje → /komisja/[kod]
│   ├── Okręgi wyborcze ..... /okregi → /okreg/[nr]
│   └── Sala posiedzeń ...... /sala
├── Pieniądze publiczne
│   ├── Gminy ............... /gminy → /gminy/[woj] → /gmina/[teryt]
│   ├── Pomoc publiczna ..... /pomoc-publiczna → /organ/[nip]
│   ├── Firmy ............... /firmy (NOWA: szukanie firm, nazwa albo NIP) → /firma/[nip]
│   └── Mapa ................ /mapa
├── Szukaj .................. /szukaj (wszystko naraz)
└── O serwisie · Stan danych · Prywatność · Kontakt (stopka)
```

Jedyna nowa trasa: **`/firmy`**. Dziś pozycja „Firmy” prowadzi do `/szukaj`
i miesza firmy z posłami. Może być tym samym komponentem co `/szukaj`
z zakresem „tylko firmy”, ale z własnym tytułem, podpowiedzią „Nazwa firmy
albo NIP” i zdaniem, które wyjaśnia brak wyniku (niżej).

## 2. Menu

**Komputer (≥ 1024 px): dwa wiersze, wszystko widoczne, bez rozwijania.**

```
┌────────────────────────────────────────────────────────────────────────┐
│ zrejestru  Sejm i pieniądze publiczne       [ Szukaj: gmina, poseł, firma, NIP… ]  ☾ │
├────────────────────────────────────────────────────────────────────────┤
│ SEJM  Posłowie · Głosowania · Ustawy · Komisje · Okręgi · Sala    │    │
│ PIENIĄDZE PUBLICZNE  Gminy · Pomoc publiczna · Firmy · Mapa            │
└────────────────────────────────────────────────────────────────────────┘
```

- Pole szukania stoi w pasku na stałe (dziś to ikona lupy). Podpowiedź mówi,
  czego można szukać.
- Drugi wiersz to dwie podpisane grupy. Bieżąca sekcja jest podkreślona
  (aktywna pozycja: `aria-current="page"` i gruba kreska pod spodem).
- Bez `<details>` na komputerze: dziesięć odnośników mieści się w 1024 px
  przy 14 px tekstu. Rozwijane menu zostaje tylko na telefonie.

**Telefon (< 1024 px).** Pasek: nazwa, lupa, przycisk **„Menu”** (słowo,
nie same trzy kreski). Panel jak dziś (`<details>`, działa bez JS), ale:
- „Szukaj” raz (dziś dwa razy razem z „Firmy”),
- pierwsza pozycja: pole szukania wprost w panelu,
- grupy podpisane tak samo jak na komputerze.

## 3. Okruszek — na każdej stronie szczegółu, ten sam wzór

```
Sejm › Posłowie › Anna Przykładowa
Sejm › Głosowania › posiedzenie 41, głosowanie 12
Sejm › Ustawy › druk nr 3090
Pieniądze publiczne › Gminy › woj. łódzkie › pow. bełchatowski › Bełchatów
Pieniądze publiczne › Firmy › SPÓŁKA Z O.O.
Pieniądze publiczne › Pomoc publiczna › Wojewoda Łódzki
```

Zastępuje pięć różnych dzisiejszych wzorów („← wszyscy posłowie”,
„woj. · powiat”, „Ustawy · druk nr”, brak powrotu na firmie). Każdy człon
jest odnośnikiem. Na telefonie okruszek zwija środek do „…”, zostawia
pierwszy i przedostatni człon. Dla kogoś z linku to jedyna wskazówka, że
serwis ma też drugą połowę.

## 4. Długie strony: spis działów, który zostaje

Gmina i poseł dostają **spis działów przyklejony pod nagłówkiem**
(`position: sticky`), w jednym wierszu przewijanym w bok na telefonie:

```
1 W liczbach · 2 Budżet · 3 Fundusze UE · 4 Pomoc publiczna · 5 Zamówienia · 6 Dane
```

Numer działu jest ten sam w spisie i w nagłówku sekcji („3. Fundusze UE”).
Bez JS działa jako zwykłe kotwice; z JS (ok. 20 wierszy,
`IntersectionObserver`) podkreśla bieżący dział.

---

## 5. Szablony stron

Każdy szablon ma te same cztery części: **Na górze** (to, co widać bez
przewijania na 390 px — najwyżej 4 rzeczy), **Działy** (kolejność),
**Jak to liczymy** (co schodzi do jednego rozwijanego na dział),
**Powrót** (dokąd prowadzi okruszek i stopka działu).

### Strona główna `/`

- **Na górze:** jedno zdanie, czym jest serwis („Sejm i publiczne
  pieniądze — liczba po liczbie, z odnośnikiem do rejestru”); pole szukania
  z podpowiedzią; trzy drzwi: **Moja gmina · Mój poseł · Firma**.
- **Działy:** 1. Ostatnie głosowania nad całością (6, jak dziś) ·
  2. Układ izby (plan sali, jak dziś) · 3. Co mamy w rejestrach (4 liczby
  z mianownikiem i podstawą; dziś stoją nad głosowaniami) ·
  4. Skąd to wiadomo (lista rejestrów, zamiast karty „Skąd to wiadomo?”).
- **Usunąć:** sześć kart-pytań (zastępują je trzy drzwi i menu), siatkę-tło,
  pigułki przykładów (zostają jako zwykły tekst „np. Kraków, Zakopane,
  podatek”).
- **Jak to liczymy:** „Głosowania nad całością — co to znaczy” (dziś
  akapit) i uwaga o barwach klubów (dziś pełny akapit pod salą).

### Gmina `/gmina/[teryt]`

- **Okruszek:** Pieniądze publiczne › Gminy › woj. › pow. › nazwa.
- **Nagłówek:** nazwa, rodzaj, powiat; jedna linia „stan na: GUS 2025 ·
  FE 12.09.2026 · SUDOP 17.09.2026” (dziś daty pobrania są rozsiane po
  stopkach sekcji).
- **Na górze — „Gmina w liczbach” (jedyna ramka na stronie):**
  1. dochody na mieszkańca + mediana w województwie,
  2. dofinansowanie z UE 2021–2027 na mieszkańca + mediana,
  3. pomoc publiczna dla firm: suma brutto + **okres przy liczbie**
     („w 631 pobranych dniach”, nie w osobnym akapicie),
  4. posłowie z okręgu: **nazwiska** (nie same zdjęcia) i numer okręgu.
  Każdy wiersz kończy się odnośnikiem do swojego działu i do rejestru.
- **Działy:** 1. W liczbach · 2. Budżet (skład dochodów, na co wydaje,
  rok po roku) · 3. Wskaźniki finansowe SMUP (4 widoczne + „pokaż
  wszystkie 15”) · 4. Fundusze UE (dwie perspektywy, największe projekty) ·
  5. Pomoc publiczna (suma, na co, największe podmioty i **„Kto przyznał
  pomoc”** — jedna tabela organ × rodzaj pomocy zamiast dzisiejszych dwóch
  sekcji „Kto udzielił” i „Kto to postanowił”, które pokazują te same
  organy; 5 największych + „pokaż wszystkie 43”; objaśnienia rodzajów raz,
  w legendzie, zamiast 47 razy) · 6. Zamówienia · 7. Dane do pobrania.
- **Wykres lat tylko przy co najmniej dwóch latach** — dziś pomoc publiczna
  Krakowa ma wykres z jednym słupkiem („2026: 22,2 mln zł”).
- **Posłowie okręgu z nazwiskami** w tekście, nie tylko w `title` portretu.
- **Jak to liczymy (jedno na dział):** definicja dochodu; ceny bieżące;
  „wydatki majątkowe ≠ inwestycyjne”; „projekty tylko tutaj”; wartość brutto
  pomocy; dni ustalone; reguła jawności nazw; progi TED.
- **Raz na stronę, pod nagłówkiem:** zdanie o dzielnicy Warszawy (dziś pięć
  razy).
- **Zostaje przy liczbach (zasady):** mediana obok każdej kwoty na
  mieszkańca (9), półpauza (4), warunki UOKiK przy danych SUDOP (10).

### Poseł `/posel/[slug]`

- **Okruszek:** Sejm › Posłowie › imię i nazwisko.
- **Na górze:** zdjęcie, nazwisko, klub (kod + pełna nazwa w drugiej
  linii), okręg (odnośnik); trzy wiersze rejestru:
  1. głosowania inaczej niż reszta klubu: `x%` = `a z b porównywalnych`,
  2. udział w głosowaniach: `y%` = `c z d`,
  3. usprawiedliwione dni nieobecności: `e z f dni`.
- **Działy:** 1. W liczbach · 2. Głosowania inaczej niż klub (lista 8) ·
  3. Ostatnie głosowania (przeniesione wyżej — dziś są na samym końcu, za
  interpelacjami; **przy każdym rodzaj**: nad całością / poprawka / sprawa
  porządkowa, bo u A. Adamczyka pierwsze cztery to kworum, przerwa
  i odroczenie) · 4. Jak głosował (rozkład) · 5. Wystąpienia ·
  6. Komisje · 7. Interpelacje i zapytania (jedna sekcja z dwoma
  zakładkami-kotwicami zamiast dwóch powtórzonych sekcji).
- **Dane osobowe (zawód, wykształcenie, e-mail, głosy w wyborach, miejsce
  na sali):** jedna tabelka „Metryczka” pod nagłówkiem, zwinięta na
  telefonie.
- **Jak to liczymy:** porównanie z klubem (5 punktów, jak dziś); dni zamiast
  głosowań przy usprawiedliwieniach; „rejestr nie podaje, dlaczego” —
  **to zdanie zostaje widoczne** przy liczbie nieobecności (zasada 2), nie
  w rozwijanym.

### Firma `/firma/[nip]`

- **Okruszek:** Pieniądze publiczne › Firmy › nazwa.
- **Na górze:** nazwa, NIP (mono), gmina siedziby (odnośnik), typ z REGON;
  wiersze: wartość pomocy brutto · liczba przypadków · zakres dat ·
  zamówienia (suma z ogłoszeń z jednym wykonawcą).
- **Zaraz pod „W liczbach”:** warunki UOKiK z datą pobrania (dziś stoją
  po 50 przypadkach, kilkanaście ekranów pod kwotą — zasada 10).
- **Działy:** 1. W liczbach · 2. Przypadki pomocy — **zgrupowane**: ta sama
  data, organ i rodzaj pomocy = jeden wiersz z liczbą przypadków
  i rozpiętością kwot (PGE GiEK: 50 przypadków → 4 wiersze), podstawa
  prawna raz pod tabelą, „pokaż wszystkie osobno” · 3. Zamówienia publiczne.
- **Powrót:** okruszek + „Wszystkie publiczne pieniądze w gminie X” na
  górze, nie na dole.

### Ustawa `/ustawa/[numer]`

- **Okruszek:** Sejm › Ustawy › druk nr N.
- **Na górze:** tytuł, stan (uchwalona / w toku / odrzucona), „Po ludzku”
  (streszczenie z podpisem, że pisał je model), odnośnik do głosowania nad
  całością, jeśli było.
- **Działy:** 1. Po ludzku · 2. Opis z rejestru · 3. Droga przez Sejm
  (etapy) · 4. Głosowania.
- **Jak to liczymy:** jak powstaje streszczenie i jego bezpiecznik liczb
  (dziś pełne zdanie pod streszczeniem — zostaje krótsze: „Napisał model
  na podstawie opisu niżej; rozstrzyga opis”).

### Głosowanie `/glosowanie/[id]`

- **Okruszek:** Sejm › Głosowania › posiedzenie N, głosowanie M.
- **Na górze:** czego dotyczyło (`opisGlosowania`), wynik (przyjęto /
  odrzucono), pasek za–przeciw–wstrzymało się–obecni bez głosu (pułapka 13),
  odnośnik do ustawy.
- **Działy:** 1. Wynik · 2. Jak głosowały kluby (tabela) · 3. Półkole ·
  4. Wszystkie głosy (zwinięte do szukania po nazwisku — dziś pełna lista
  460 nazwisk to większość z 30 000 px).
- **Jak to liczymy:** kworum i głosowania na listę kandydatów (dziś
  zdania w treści).

### Pomoc publiczna `/pomoc-publiczna`

- **Okruszek:** Pieniądze publiczne › Pomoc publiczna.
- **Na górze:** cztery wiersze rejestru (brutto, przypadki, beneficjenci,
  gminy) — **każdy z okresem i z odnośnikiem do SUDOP** (dziś kafle bez
  `zrodlo`, okres tylko w akapicie nad nimi); pole „Sprawdź firmę: nazwa
  albo NIP”.
- **Działy:** 1. W liczbach · 2. Kto udzielił · 3. Na co · 4. Na mieszkańca
  według województwa · 5. Jakie firmy · 6. Największe przypadki ·
  7. Warunki UOKiK.
- **Jak to liczymy:** dni ustalone (14 dni), siedziba a miejsce inwestycji,
  wartość brutto.

---

## 6. Brak wyniku też jest odpowiedzią

Wyszukiwarka i `/firmy`, gdy nic nie znalazły:

> Nie znaleźliśmy firmy o tej nazwie ani NIP-ie wśród tych, które pokazujemy.
> Nie pokazujemy podmiotów, których nazwa może być imieniem i nazwiskiem
> osoby — ich pomoc jest wliczona w sumy gmin. [Jak to działa]

To zdanie zamyka niedopowiedzenie „nie dostała czy nie pokazujecie?”, nie
zdradzając, czy ten konkretny NIP jest w bazie (zasada 7).
