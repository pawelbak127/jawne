# Nazwiska w danych o pieniądzach publicznych — co wolno pokazać

Zapis z 18.09.2026. Dotyczy beneficjentów pomocy publicznej (SUDOP),
projektów z Funduszy Europejskich i przyszłych zamówień publicznych.

## Pytanie Pawła

„Skoro nazwiska są dostępne po API, to chyba można je pokazać?”

## Krótka odpowiedź

Dostępność nie jest zgodą. Publikacja przez urząd i publikacja przez nas to
**dwa osobne przetwarzania danych**. Urząd publikuje, bo nakazuje mu to przepis
o przejrzystości pomocy publicznej. My, powtarzając te dane, stajemy się
odrębnym administratorem i musimy mieć własną podstawę z art. 6 RODO —
najbliższa jest uzasadniony interes (art. 6 ust. 1 lit. f), który wymaga
wyważenia z prawami osoby.

Dwie rzeczy, które to wyważenie zmieniają na naszą niekorzyść:

1. **Robimy z danych coś, czego nie robi urząd.** Wyszukiwarka SUDOP wymaga
   znajomości NIP-u albo gminy i nie jest indeksowana przez Google. Nasza
   strona gminy jest zoptymalizowana pod wyszukiwarki. Wpisanie nazwiska
   w Google i zobaczenie „dostał 8 tys. zł pomocy covidowej” to skutek, który
   wprowadzamy my, a nie urząd.
2. **Instrukcja UOKiK mówi wprost, że baza zawiera dane osobowe** i że dane
   mają charakter pomocniczy. To nie jest zaproszenie do masowej republikacji.

Jest też precedens: w połączonych sprawach C‑92/09 i C‑93/09 (Volker und Markus
Schecke, Eifert) Trybunał Sprawiedliwości uznał za nieważne przepisy nakazujące
publikowanie danych osobowych **wszystkich** beneficjentów dopłat rolnych bez
różnicowania, m.in. według kwoty. Po tym wyroku prawo unijne wprowadziło progi
kwotowe dla nazwisk rolników. Wniosek dla nas: **różnicowanie po kwocie jest tą
drogą, którą prawo UE uznało za proporcjonalną.** (Dokładna wysokość progu
w przepisach rolnych — do sprawdzenia, zanim się na nią powołamy publicznie).

## Trzy warianty

| | Co widać | Ryzyko | Wartość dla czytelnika |
|---|---|---|---|
| **A. Dziś** — nazwa tylko dla osób prawnych i instytucji | w Zakopanem 304 z 5 091 beneficjentów | najmniejsze | sumy i struktura są prawdziwe, ale „kto” pozostaje w dużej części niewidoczne |
| **B. Próg kwotowy** — osoba fizyczna z nazwy dopiero powyżej progu | dochodzą pojedyncze duże przypadki | średnie, ale oparte na logice, którą prawo UE już zastosowało | czytelnik widzi duże pieniądze, drobne wsparcie zostaje anonimowe |
| **C. Wszystko** — powtarzamy dane jak w rejestrze | wszyscy | największe: profilowanie, prawo sprzeciwu, skarga do UODO, a przy pomocy covidowej także wniosek o kondycji firmy | pełny obraz |

## Rekomendacja: wariant B, z czterema zabezpieczeniami

1. **Próg.** Proponuję 100 000 EUR na pojedynczy przypadek pomocy — tyle wynosi
   unijny próg publikowania indywidualnych przypadków pomocy w GBER, więc nie
   jest to liczba wymyślona przez nas. Poniżej progu: „osoba fizyczna
   prowadząca działalność gospodarczą”, kwota, gmina, przeznaczenie, udzielający.
2. **Nigdy do indeksu.** Nazwisko osoby fizycznej nie trafia do naszej
   wyszukiwarki, do tytułu strony ani do podglądu linku. Znosi to główny
   argument „to my sprawiamy, że da się to wygooglować”.
3. **Ścieżka sprzeciwu.** Widoczny adres kontaktowy i zobowiązanie, że sprzeciw
   z art. 21 RODO realizujemy bez pytania o powód, w kilka dni, a wpis wraca
   do postaci anonimowej. Wymaga to opisu w polityce prywatności.
4. **Test równowagi na piśmie.** Jedna strona: cel, dlaczego dane są konieczne,
   co zrobiliśmy, by ograniczyć skutki. To dokument, który pokazuje się UODO,
   gdy pyta — nie po fakcie, tylko od razu.

Spółki jawne, komandytowe i partnerskie zostają jawne z nazwy mimo nazwisk
wspólników: są w KRS, a nazwisko w firmie spółki to element jej oznaczenia,
nie informacja o osobie prywatnej.

## Czego nie wiemy i jak to rozstrzygnąć

- **Czy UODO uzna nasz test równowagi.** Można zapytać wprost — UODO odpowiada
  na pytania, a odpowiedź jest darmowa i ma wartość dowodową. Czas: miesiące.
- **Czy próg 100 000 EUR jest właściwy dla pomocy de minimis**, gdzie limit dla
  jednego przedsiębiorcy wynosi 300 000 EUR w trzy lata. Do sprawdzenia
  w rozporządzeniu, zanim ustawimy próg.

## Jak to wygląda w kodzie

Reguła siedzi w jednym miejscu: `src/lib/prywatnosc.ts`, funkcja
`nazwaDoPokazania`. Wariant B to dodanie do niej kwoty i jednej stałej
z progiem; strony gminy nie trzeba przepisywać. Zmiana jest odwracalna
w obie strony i nie wymaga ponownego importu danych.
