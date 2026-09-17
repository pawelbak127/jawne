# Sprostowanie do UOKiK — projekt do akceptacji Pawła

**Status: NIEWYSŁANE.** Treść zatwierdza i wysyła Paweł.

## Po co to pismo

Pismo wysłane wcześniej (`obywatel/docs/uokik-odpowiedz-projekt.md`) zawiera dwa
zdania, które pomiary z 17.09.2026 obalają:

1. „W żadnym z dwóch przypadków wynik nie stał się dostępny (…) wynik nie może
   zostać odebrany niezależnie od cierpliwości odpytującego”.
2. „Dziś nie pobieramy przez API **żadnych** danych o przypadkach pomocy”.

Pierwsze zdanie jest zarzutem wobec działania systemu urzędu i było oparte na
naszym błędzie — odpytywaliśmy wariant `przypadki-pomocy-bez-kolejki` zamiast
wariantu z kolejką, który urząd opisał w liście. Drugie było prawdziwe w dniu
pisania i przestało być prawdziwe później.

Instytucja, która dostała od nas błędną informację o swoim systemie, ma prawo
dostać sprostowanie. Serwis, którego produktem jest wiarygodność, nie może tego
przemilczeć.

---

Szanowni Państwo,

w nawiązaniu do mojego poprzedniego pisma prostuję zawarte w nim informacje.

**Wariant z kolejką działa.** 17 września 2026 r. wykonałem jedenaście zapytań
do `/api/przypadki-pomocy`, odpytując następnie wyłącznie adres zwrócony
w nagłówku `Location` (`/api/kolejka/{id}`) w odstępach sześćdziesięciu sekund.
Każde z jedenastu zapytań zwróciło wynik — najszybsze po dwóch minutach,
najwolniejsze po siedmiu. Żadne nie wygasło.

Moje wcześniejsze zdanie, że wynik nie może zostać odebrany niezależnie od
cierpliwości odpytującego, było błędne. Wynikało ono z tego, że we wrześniowym
pomiarze rejestrowałem wyszukiwania przez `/api/przypadki-pomocy-bez-kolejki`,
a nie przez wariant z kolejką, który Państwo wskazali. Przepraszam — zarzut
dotyczył w istocie naszego błędu w użyciu interfejsu.

**Prostuję też zdanie o niepobieraniu danych.** W dniu wysłania pisma było ono
prawdziwe; 17 września pobrałem dane trzech gmin (Bełchatów miasto, Bełchatów
gmina wiejska, Zakopane) — łącznie 80 698 przypadków pomocy w dziesięciu
zapytaniach, po jednym naraz, oraz jedno zapytanie kontrolne. 18 września
wykonałem cztery zapytania sprawdzające zachowanie interfejsu; najdłuższe
czekało w kolejce dziewięć minut.

**Co z tego wynika dla mojej prośby.** Podtrzymuję ją, ale opieram na innej
przesłance niż wcześniej: nie na tym, że usługa nie działa, tylko na skali.

- Interfejs wymaga kryterium innego niż data i strona (`HTTP 400`:
  „Nie podano żadnych wymaganych kryteriów”), więc dane dla całego kraju trzeba
  pobierać w plasterkach — po gminie, formie pomocy albo przeznaczeniu.
- Jedna strona odpowiedzi to najwyżej 10 000 rekordów, a każda kolejna strona
  jest osobnym zapytaniem stojącym w kolejce.
- Jedno zapytanie obejmujące wszystkie formy pomocy i jeden dzień zwróciło
  3 531 przypadków z całego kraju (1 150 gmin) — czyli **bieżące dane dla całej
  Polski to jedno zapytanie na dobę**. Kosztowna jest wyłącznie historia:
  przy ok. 20 mln rekordów z dziesięciu lat to około dwóch tysięcy zapytań.
- W strukturze danych nie ma pola daty modyfikacji rekordu, więc nie da się
  pobierać wyłącznie tego, co się zmieniło. Zapytanie po dniu udzielenia pomocy
  pozwala dociągać nowe przypadki, ale nie wychwyci korekt wcześniejszych.

Dlatego ponawiam prośbę o **eksport zbiorczy poza kolejką dla danych
historycznych** — na przykład plik na województwo albo na rok, pobierany
zwykłym `GET`-em. Dane bieżące jestem w stanie utrzymywać jednym zapytaniem
na dobę i tak chciałbym to robić, jeśli uznają Państwo takie tempo za
dopuszczalne.
Gdyby taki eksport nie był możliwy, proszę o wskazanie tempa odpytywania, które
byłoby dla Państwa akceptowalne — dostosujemy się do niego.

Do czasu Państwa odpowiedzi ograniczam się do pojedynczych gmin pobieranych
ręcznie i nie odpytuję systemu przy wejściach czytelników na stronę.

Z wyrazami szacunku,

---

## Do rozważenia przed wysłaniem

1. **Czy w ogóle wysyłać.** Za: urząd dostał od nas nieprawdziwą informację
   o swoim systemie i sprostowanie jest uczciwe, a przy okazji wzmacnia prośbę
   o eksport. Przeciw: kolejne pismo w sprawie, w której czekamy na odpowiedź.
   Uważam, że za przeważa.
2. **Czy podawać liczbę pobranych rekordów.** Podaję ją wprost, bo urząd i tak
   widzi ruch w logach, a przemilczenie byłoby drugą nieścisłością.
3. **Czy prosić o zgodę na powolny import** (np. jedno zapytanie na 10 minut
   w nocy) zamiast eksportu. Można dopisać — ale wtedy pismo prosi o dwie
   rzeczy naraz i łatwiej o odpowiedź „nie” na obie.
