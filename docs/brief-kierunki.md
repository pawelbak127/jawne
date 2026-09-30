# Brief: kierunki rozwoju serwisu „jawne”

**Do czego to jest.** Zadanie dla przeglądu w chmurze (30.09.2026). Nie jest to
dokument dla czytelnika serwisu ani dla Pawła — to instrukcja dla kogoś, kto
dostaje repozytorium i ma wrócić z propozycjami. Wyniki trafią do
[plan.md](plan.md), do sekcji „Pomysły — do oceny”.

---

## Zanim cokolwiek zaproponujesz — przeczytaj

| Plik | Co z niego wziąć |
|---|---|
| `CLAUDE.md` | zasady, których nie wolno złamać, i 58 pułapek **zmierzonych** w tym projekcie |
| `docs/zrodla.md` | katalog źródeł: używane, warte dołączenia, **odrzucone z powodem**, wyniki sond |
| `docs/plan.md` | co zrobione, co otwarte, blokery przed premierą, dotychczasowa lista pomysłów |
| `ingest/lib/baza.ts` | pełny schemat bazy — wszystkie tabele i indeksy |
| `src/lib/dane.ts` | jedyny dostęp do danych dla stron; widać z niego, co już umiemy policzyć |

**Propozycja, która powtarza coś z „Odrzucone” albo z „Sondy” bez nowego
argumentu, jest stratą miejsca.** Tam już sprawdziliśmy i zapisaliśmy dlaczego.

---

## Czym ten serwis jest

Civic tech pokazujący dane publiczne: Sejm (posłowie, głosowania, droga ustaw)
i publiczne pieniądze w gminach (fundusze europejskie, pomoc publiczna dla
firm, zamówienia). Prowadzi go **jedna osoba, po godzinach, bez budżetu**.
Serwis nie jest jeszcze opublikowany (`noindex` do czasu domeny i adresu
kontaktowego).

**Wiarygodność jest produktem.** Błąd w liczbie przy czyimś nazwisku kosztuje
więcej niż tydzień opóźnienia. To nie jest slogan — to kryterium odrzucania
pomysłów.

## Zasady, których nie wolno złamać

1. **Przy każdej liczbie odnośnik do rejestru.** To jedyne, czego nie ma
   konkurencja.
2. **Nie zgadujemy powodów.** Rejestr nie podaje, czemu posła nie było — więc
   my też nie.
3. **Liczba zawsze z mianownikiem.** 60% ze stu głosowań to nie to samo,
   co 60% z czterech tysięcy.
4. **`null` ≠ zero.** Brak danych to stan, nie zmierzone zero.
5. **Nikogo nie ukrywamy.** Poseł z wygasłym mandatem zostaje.
6. **Nie oceniamy.** Żadnych rankingów, odznak, punktów, „indeksów
   aktywności”, „ligi posłów” ani scoringu. Propozycja oparta na rankingu
   zostanie odrzucona bez dyskusji.
7. **Nie powtarzamy nazwisk osób prywatnych.** Nazwę firmy pokazujemy, gdy
   widać w niej formę prawną i nie ma w niej imienia z listy PESEL — albo gdy
   pojedyncza pomoc przekroczyła 100 tys. EUR (próg z art. 9 GBER,
   sprawdzony w tekście przepisu 30.09.2026). Szczegóły: `src/lib/prywatnosc.ts`
   i `docs/test-rownowagi.md`.

## Co już mamy w bazie (zmierzone, stan na 30.09.2026)

| Zbiór | Skala |
|---|---|
| posłowie | 499 (39 z wygasłym mandatem), ze zdjęciami i miejscami na sali |
| głosowania | 4 641, w tym **2 128 618 głosów imiennych** |
| obecność | 74 853 dni poselskich, 4 127 nieobecności usprawiedliwionych |
| interpelacje | 20 145, 36 524 podpisy autorów |
| procesy legislacyjne | 1 692 z etapami |
| pomoc publiczna (SUDOP) | **4 190 306 przypadków** z 631 dni pobranych dla całego kraju + pełna 10-letnia historia 3 gmin |
| zamówienia (TED) | 129 077 ogłoszeń z NIP-ami wykonawców |
| fundusze europejskie | 34 348 projektów 2021–2027, 103 824 z 2014–2020 |
| gminy | 2 477 z ludnością, budżetami (dochody, wydatki, działy), wskaźnikami SMUP |
| REGON | 78 566 NIP-ów: typ podmiotu, siedziba, gmina |
| granice | kontury 2 479 gmin, 380 powiatów, 16 województw (PRG) |

Historia SUDOP rośnie dalej — ok. jednego dnia na dobę, docelowo ~30 mln
wierszy. Serwer ma **1,8 GB pamięci i 2 rdzenie**.

---

## Pierwotny zamysł — i to, że go jeszcze nie ma

**To jest najważniejszy akapit tego briefu.** Serwis miał od początku
pokazywać trzy rzeczy:

1. **poglądy polityków** — na czym komu zależy i jak kto stoi w sprawach,
   które ludzi obchodzą,
2. **ich majątki** — w sposób wizualny, a nie jako tabela z PDF-a,
3. **dokąd idą publiczne pieniądze** — łatwo i przystępnie.

Zbudowane jest głównie to trzecie, i to od strony hydrauliki: mamy dane,
mamy odnośniki do rejestrów, mamy sumy na mieszkańca. Punkty 1 i 2 nie
istnieją wcale. Projekt przez rok szedł w stronę inżynierii danych i tam jest
dobry — ale pierwotny pomysł na to, **po co ktoś miałby tu wejść**, został
z tyłu.

Zadanie ma to odwrócić. Interesuje nas najbardziej to, czego nie ma.

### Poglądy — dlaczego to jest trudne, a nie tylko niezrobione

Mamy 2,1 mln głosów imiennych. Kusi, żeby zrobić z nich „poglądy posła”.
**Głos w konkretnym głosowaniu jest faktem — etykieta światopoglądowa
wyklejona z głosów jest naszą interpretacją.** Reguła 6 zakazuje ocen,
reguła 2 zakazuje zgadywania. Jednocześnie zdanie „ten poseł głosował za
ustawą X, a przeciw Y” jest w pełni uczciwe i to właśnie jest treść, po którą
ludzie przychodzą.

Nie wiemy, gdzie dokładnie biegnie ta granica, i tego od Was chcemy:
**jak pokazać stanowiska posłów tak, żeby czytelnik zobaczył różnice między
nimi, a serwis nie zaczął ich etykietować.** Dodatkowa trudność: temat
głosowania jest w rejestrze tekstem, nie kategorią — pogrupowanie głosowań
w „sprawy” to już nasza decyzja i trzeba ją umieć obronić.

Przypomnienie z pułapki 12 w `CLAUDE.md`: tytuł i temat głosowania zamieniają
się rolami i trzeba czytać je przez `opisGlosowania()`. Mamy też
`glosowania_cechy` z rozpoznanym „głosowaniem nad całością projektu”
i 1 692 procesy legislacyjne z etapami — czyli da się dojść od głosu do
ustawy.

### Majątki — co wiemy o dostępności

`docs/zrodla.md` mówi: oświadczenia majątkowe i rejestr korzyści są na
sejm.gov.pl, **bez API, w dużej części jako skany**. To znaczy: ręczne
przepisywanie z podwójną kontrolą, dla 460 osób, co roku. Przy zasadzie
„błąd w liczbie przy czyimś nazwisku kosztuje więcej niż tydzień opóźnienia”
to jest poważne zobowiązanie, nie weekend pracy.

Pytania: czy istnieje droga, której nie widzimy (inny rejestr, dane
w formie maszynowej, wcześniejsze opracowania na otwartej licencji)? Jeśli
nie — czy da się zrobić wersję ograniczoną, która jest uczciwa
(np. tylko to, co da się odczytać automatycznie i zweryfikować), zamiast
całości przepisanej ręcznie? I jak pokazać majątek **wizualnie**, nie
sugerując przy tym niczego o jego pochodzeniu?

### Przystępność — trzecia noga

„Łatwo i przystępnie” to nie jest to samo, co „dokładnie”. Dziś strona gminy
podaje kwoty na mieszkańca z medianą w województwie i odnośnikiem do
rejestru — to jest rzetelne i nadal wymaga od czytelnika wysiłku. Szukamy
sposobów, żeby ktoś bez przygotowania zobaczył **swoją** sprawę w pierwszych
dziesięciu sekundach.

---

## Zadanie

Cztery pytania. Pierwsze dwa są ważniejsze od pozostałych.

### 0. Jak zrobić poglądy i majątki, nie łamiąc zasad?

Opisane wyżej. Oczekujemy konkretu: co dokładnie widać na ekranie, z czego
to jest policzone i gdzie przebiega granica, za którą byłaby to już ocena.

### 1. Co da się powiedzieć z POŁĄCZENIA tych danych, czego nie mówi nikt inny?

To jest najważniejsze pytanie i nasz jedyny prawdziwy atut. Osobno każdy
z tych zbiorów jest publiczny i ktoś go już pokazuje. **Razem — nie.** Mamy
w jednej bazie SQL: głosy imienne posłów, pomoc publiczną z NIP-em
beneficjenta, zamówienia publiczne z NIP-em wykonawcy i zamawiającego, projekty
unijne z miejscem realizacji, budżety gmin, REGON wiążący NIP z gminą, oraz
przypisanie gmin do okręgów wyborczych.

Szukamy **pytań, na które ta baza umie odpowiedzieć jednym zapytaniem**, a na
które dziś trzeba by tydzień pracy z czterema stronami WWW. Dla każdego
pomysłu napisz, którymi kolumnami się łączy i co dokładnie zobaczy czytelnik.

Uwaga na pułapkę, w którą łatwo tu wpaść: **zestawienie dwóch liczb sugeruje
związek przyczynowy, nawet gdy go nie ma.** „Poseł X głosował za, a do jego
okręgu poszło Y” to insynuacja przebrana za dane. Jeśli proponujesz takie
zestawienie, napisz, jak je pokazać, żeby nie kłamało — albo nie proponuj go
wcale.

### 2. Jakich danych jeszcze nie mamy, a są dostępne i pasują?

Tylko źródła, które: są publiczne, mają licencję pozwalającą na
przechowywanie i pokazywanie, i **da się je pobrać maszynowo bez umowy
z urzędem**. Dla każdego sprawdź i podaj: dokładny adres API lub pliku, czy
działa (sprawdź, nie zakładaj), format, wolumen, licencję, limity, i **co
w nich jest nie tak** — każde źródło ma haczyk, a my zapisujemy haczyki.

Nie proponuj: rejestrów zawierających wyłącznie osoby fizyczne, danych
wymagających zgody ministra, źródeł bez licencji na republikację.

### 3. Co sprawi, że ktoś tu wróci drugi raz — i zrozumie, co widzi?

Serwis pokazuje liczby i nie ocenia. To uczciwe, ale bierne. Szukamy
sposobów, żeby czytelnik znalazł **swoją** sprawę: swoją gminę, swojego posła,
firmę z sąsiedztwa — i miał powód wrócić. Bez powiadomień push, bez kont
użytkowników, bez newslettera wymagającego obsługi.

### 4. Co w tym produkcie jest ZŁE?

Pytanie zadane wprost przez Pawła: „mogę się też mylić i moje wybory mogą być
błędne, chętnie przyjmę również krytykę, nie muszą być to tylko przytakiwania”.

Odpowiedź, która głównie chwali, jest **niewykonaniem zadania**. Do zaatakowania
jest wszystko, łącznie z założeniami tego briefu: czy ktokolwiek tego
potrzebuje, czy to nie istnieje już lepiej, czy zasada „nie oceniamy” nie jest
wymówką, czy standard wiarygodności nie zjada projektu, czy utrzyma to jedna
osoba, czy sam pierwotny zamysł (poglądy, majątki) jest dobry — i co
najprawdopodobniej sprawi, że za rok tego nie będzie.

Przy każdym zarzucie: czy jest odwracalny. Błąd w kodzie się poprawia, błędny
wybór produktu kosztuje rok.

---

## Czego wymagamy od każdej propozycji

Bez tego propozycja jest nieprzydatna:

1. **Co zobaczy czytelnik** — jedno, dwa zdania, konkretnie. Nie „panel
   analityczny”, tylko „na stronie gminy blok: ile zamówień publicznych
   wygrały firmy z tej gminy i u kogo”.
2. **Skąd dane** — tabele i kolumny, które już mamy, albo źródło zewnętrzne
   ze sprawdzonym adresem.
3. **Ile to kosztuje raz** — mniej więcej: godziny, dni czy tygodnie pracy
   jednej osoby.
4. **Ile kosztuje CO MIESIĄC** — to ważniejsze od kosztu jednorazowego.
   Import, który trzeba pilnować, jest droższy niż strona, która sama się
   liczy.
5. **Jak może skłamać** — co musi pójść nie tak, żeby serwis pokazał
   nieprawdę, i jak to wychwycić. To sekcja obowiązkowa.
6. **Czy łamie którąś z zasad** wyżej — jeśli tak, napisz to wprost zamiast
   udawać, że nie.

## Czego nie chcemy

- list dwudziestu pomysłów bez oceny — wolimy pięć przemyślanych,
- czegokolwiek, co wymaga zespołu, pieniędzy albo zgody urzędu,
- rankingów, ocen, scoringu, „indeksów” i porównań osób,
- „sztucznej inteligencji podsumowującej” cokolwiek — nie będziemy stawiać
  wygenerowanego tekstu obok liczb z rejestru,
- pomysłów opartych na danych, których nie sprawdziłeś,
- przepisywania tego, co już jest w `plan.md` i `zrodla.md`.

## Format odpowiedzi

Dla każdej propozycji osobna sekcja z sześcioma punktami wyżej. Na końcu
**jedna rekomendacja**: co zrobić jako następne i dlaczego akurat to.
Jeśli któreś pytanie z trzech uważasz za źle postawione — napisz to.
