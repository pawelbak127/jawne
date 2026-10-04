# Przegląd serwisu — stan na 04.10.2026 (`main` @ b48538a)

**Na czym to stoi.** Na kodzie z `src/`. Żywej strony nie dało się obejrzeć:
polityka sieci środowiska w chmurze odrzuca `zrejestru.pl` (HTTP 403 na
CONNECT, ten sam wynik dla WebFetch). Wysokości stron (45 000 / 37 000 /
30 000 px) są z pomiaru z 03.10 opisanego w `zadanie.md`, nie moje. Wszystko
inne poniżej ma plik i cytat.

---

## 1. Co jest — trasy i menu

| Grupa w menu | Pozycja | Trasa | Szczegół |
|---|---|---|---|
| Sejm ▾ | Posłowie | `/poslowie` | `/posel/[slug]` (499 stron, generowane przy budowie) |
| | Głosowania | `/glosowania` | `/glosowanie/[id]` |
| | Ustawy | `/ustawy` | `/ustawa/[numer]` |
| | Komisje | `/komisje` | `/komisja/[kod]` |
| | Okręgi wyborcze | `/okregi` | `/okreg/[nr]` |
| | Sala posiedzeń | `/sala` | — |
| Pieniądze ▾ | Gminy | `/gminy` | `/gminy/[woj]` → `/gmina/[teryt]` |
| | Pomoc publiczna | `/pomoc-publiczna` | `/firma/[nip]`, `/organ/[nip]` |
| | Firmy | **`/szukaj`** | — |
| | Mapa gmin | `/mapa` | — |
| (tylko w panelu na telefonie) | Szukaj, Stan danych, O serwisie | `/szukaj`, `/stan`, `/o-serwisie` | |
| stopka | O serwisie, Stan danych, Polityka prywatności, Kontakt | | |

Nie ma w menu: `/organ/[nip]` (wejście tylko z gminy i firmy) ani
`/prywatnosc` (tylko stopka). To w porządku: są to strony szczegółu.

## 2. Nawigacja — gdzie czytelnik się gubi

1. **Na komputerze nie widać ani jednego celu.** Pasek ma `Sejm ▾`,
   `Pieniądze ▾`, lupę i księżyc (`Nawigacja.tsx`). Żeby trafić do gmin —
   głównego pytania mieszkańca — trzeba wiedzieć, że gminy są „pieniędzmi”,
   i otworzyć rozwijane menu. Dwa przyciski z rozwijaniem to dla wszystkich
   dziesięciu stron jedna i ta sama decyzja do podjęcia na ślepo.
2. **„Firmy” prowadzi do ogólnej wyszukiwarki.** Pozycja obiecuje „czy firma
   dostała pomoc — szukaj po nazwie albo NIP”, a ląduje na `/szukaj`, gdzie
   pole ma ogólną podpowiedź, a wyniki mieszają gminy, posłów i głosowania.
   Na telefonie `/szukaj` jest w panelu **dwa razy** („Firmy” i „Szukaj”).
   Komentarz w kodzie sam mówi, że dwa wejścia do jednej strony to
   „zgadywanka” (o „Pieniądze w gminie”), a tu wróciło to samo.
3. **Gmina jest w „Pieniądzach”, okręg w „Sejmie”, a strona gminy pokazuje
   oba.** Kto szuka „mojego posła”, nie wie, że droga wiedzie przez gminę
   (kafel „Okręg nr …” i portrety na `/gmina/[teryt]`). Sama strona główna
   mówi „wpisz swoją gminę… a obok — posłów ze swojego okręgu”, a menu tego
   połączenia nie pokazuje.
4. **Powrót z każdej strony wygląda inaczej.**
   - poseł: `← wszyscy posłowie`
   - głosowanie: `← wszystkie głosowania`
   - okręg: `← wszystkie okręgi`
   - gmina: `woj. … · powiat …` (okruszek, klikalne tylko województwo)
   - ustawa: `Ustawy · druk nr 3090`
   - firma: nad nazwą sama nazwa gminy siedziby (odnośnik, gdy gmina jest
     znana), na dole drugi raz „Zobacz wszystkie publiczne pieniądze
     w gminie … →”; do „Pomocy publicznej” ani do szukania firm — nic.

   Kto przyszedł z linku (czytelnik 3), nie wie, w której części serwisu
   jest.
5. **Nazwa nie mówi, czym serwis jest.** Nagłówek: „jawne · Sejm X kadencji”.
   Tytuł: „jawne — Sejm bez komentarza”. Domena: zrejestru.pl. Połowa stron
   jest o pieniądzach w gminach i firmach, a podpis mówi tylko o Sejmie.
   Trzy nazwy na jedno miejsce (pytanie do Pawła).
6. **Kotwice na stronie gminy są, ale znikają po pierwszym ekranie.**
   Siedem odnośników (`Budżet · Finanse i podatki · Fundusze UE · …`) stoi
   raz pod nagłówkiem. Na stronie o wysokości ok. 45 000 px po przewinięciu
   nie ma jak wrócić do spisu ani zobaczyć, w której sekcji się jest.

## 3. Ścieżki trzech czytelników (liczone kliknięcia, wg kodu)

| Pytanie | Droga dziś | Kliknięcia | Gdzie się gubi |
|---|---|---|---|
| „Co z moją gminą?” (telefon) | główna → pole szukania → wpisanie → podpowiedź | 2 + pisanie | Odpowiedź nie stoi na górze: na górze są ludność, okręg i portrety, a pieniądze zaczynają się od „Budżet gminy — {rok}” z rozpisanymi dochodami. Pierwszej liczby o pieniądzach szuka się za kaflami. |
| „Jak głosował mój poseł?” | główna → menu → Sejm → Posłowie → szukanie na liście (37 000 px) → poseł | 4 + przewijanie | Albo przez gminę: główna → szukaj gminy → kafel z portretem (zdjęcie 32 px z kolorową kropką, bez nazwiska widocznego bez najechania — `title`). |
| „Czy ta firma dostała pieniądze?” | menu → Pieniądze → Firmy → `/szukaj` → wpisanie NIP → wynik | 4 + pisanie | Pole nie mówi „NIP”. Gdy firma jest możliwą osobą fizyczną, wyszukiwarka nic nie oddaje (słusznie, zasada 7) — i nie mówi, dlaczego. Dla czytelnika to wygląda jak „nie dostała”. |
| Dziennikarz: „liczba do zacytowania” | strona gminy → sekcja → kafel | — | Odnośnik do rejestru ma 11 px i kolor objaśnień (`Zrodlo.tsx`): wygląda jak przypis, nie jak element interfejsu (zasada 1). Data pobrania stoi w innym akapicie niż liczba. |
| Z linku (np. głosowanie) | wejście w środek | 0 | Brak okruszka „Sejm › Głosowania”; nie wiadomo, że serwis ma też gminy i pieniądze. |

## 4. Co się powtarza

Strona gminy (`src/app/gmina/[teryt]/page.tsx`):

- **„Dzielnice nie mają osobnych …”** — pięć razy na stronie dzielnicy
  Warszawy (budżet, finanse, fundusze, pomoc, zamówienia). Wystarczy raz,
  pod nagłówkiem.
- **„Kwoty w cenach bieżących, bez korekty o inflację”** — w rozwijanym
  „Co wchodzi w dochody gminy?” i drugi raz pod wykresem „Rok po roku”.
- **„Kredyty i obligacje nie są dochodem”** — w tym samym rozwijanym i znowu
  pod „Z czego składają się te dochody”.
- **„To wartości całych umów — często wieloletnich”** — dwa razy w sekcji
  zamówień (pod kaflem i w ramce o koncentracji).
- **Objaśnienie kategorii pomocy** (`OPIS_KATEGORII[...].wyjasnienie`)
  w „Kto to postanowił” powtarza się przy KAŻDYM organie, więc przy pięciu
  organach z „ulgą w podatku” jest to samo zdanie pięć razy.
- **Zasady jawności nazw** — akapit pod listą beneficjentów, osobny akapit
  pod organami, osobny o osobach fizycznych. Trzy zdania o jednej regule.

Cały serwis:

- **Kafel** = zaokrąglona karta z ramką i cieniem. 93 użycia `rounded-2xl/3xl`,
  79 użyć `shadow-karta` w `src/`. Na stronie gminy 17 kart i 5 szarych
  ramek z uwagami. Wszystko jest „kartą”, więc nic się nie wyróżnia:
  ostrzeżenie o niepełnych danych wygląda tak samo jak ciekawostka
  o koncentracji (`bg-papier-3 p-4`).

## 5. Niedopowiedzenia — miejsca, gdzie czytelnik zostaje z pytaniem

| Gdzie | Cytat | Pytanie czytelnika |
|---|---|---|
| gmina, nagłówek sekcji | „Kto to postanowił” | Co postanowił? (Chodzi o organy, które przyznały pomoc.) |
| gmina, nagłówek sekcji | „Finanse i podatki — jak gminie idzie” | „Idzie” brzmi jak ocena (zasada 6), a pod spodem są wskaźniki SMUP bez oceny. |
| gmina, kafel | „Okręg nr {nr}” + „okręg wyborczy do Sejmu (PKW, wybory 2023)” | Co mi to daje? Kafel nie mówi, że za nim są posłowie i ich głosowania. |
| gmina, portrety posłów | sama fotografia 32 px, nazwisko w `title` | Kto to jest? (Na telefonie `title` nie działa w ogóle.) |
| pomoc publiczna, 4 kafle | `<Kafel wartosc=… etykieta="przypadków pomocy" />` — bez `zrodlo`, bez mianownika na kaflu | Z jakiego okresu? (Zakres dat stoi w akapicie nad kaflami, kafel wycięty do udostępnienia go traci.) |
| główna, h1 | „…i jak naprawdę głosuje.” | „Naprawdę” sugeruje, że ktoś coś ukrywa — to komentarz, a serwis „bez komentarza”. |
| wyszukiwarka | brak wyniku dla NIP-u osoby fizycznej | „Nie dostała?” — a to reguła jawności, nie brak danych. |
| menu | „Pieniądze” | Czyje? Publiczne — warto napisać. |
| strona posła | „udział w głosowaniach {x}%” obok „Rejestr uznał za usprawiedliwione {a} z {b} dni” | Dlaczego raz głosowania, a raz dni? Wyjaśnienie jest, ale małym drukiem pod spodem. |

## 6. Co jest najważniejsze, a co jest metodologią

Strona gminy dziś ma 7 sekcji `h2`, 38 elementów `text-xs`, 9 odnośników
do źródeł i 2 rozwijane `<details>`. Podział, jaki proponuję w `nawigacja.md`:

| Sekcja | Rola | Gdzie |
|---|---|---|
| dochody na mieszkańca + mediana | **odpowiedź** | na górę, w „Gmina w liczbach” |
| fundusze UE na mieszkańca + mediana | **odpowiedź** | na górę |
| pomoc publiczna (suma, okres) | **odpowiedź** | na górę, z zastrzeżeniem o okresie przy liczbie |
| posłowie okręgu (z nazwiskami) | **odpowiedź** | na górę |
| skład dochodów, działy wydatków, rok po roku | rozwinięcie | sekcja „Budżet” |
| wskaźniki SMUP (15 pozycji) | rozwinięcie | sekcja, zwinięta do 4 najczęściej czytanych + „pokaż wszystkie” |
| „Kto przyznał pomoc” (organy × kategorie) | rozwinięcie | sekcja „Pomoc publiczna”, jako tabela |
| definicje: dochód, wartość brutto, mediana, ceny bieżące, „tylko tutaj” | **metodologia** | jedno „Jak to liczymy” na sekcję, zwinięte |
| warunki UOKiK | **obowiązek (zasada 10)** | zostają przy danych SUDOP, ale jako jedna linia + rozwinięcie pełnej treści (do potwierdzenia z UOKiK — patrz pytania) |

## 7. Wygląd — dlaczego „wygląda jak strona z AI”

Nie przez kolory ani błędy, tylko przez zestaw elementów, które ma każda
strona z generatora:

- **Inter + zaokrąglone karty z miękkim cieniem w siatce 3 kolumn**
  (`rounded-2xl border bg-papier-2 p-5 shadow-karta`) — strona główna to
  sześć takich kart z pytaniem i opisem.
- **Siatka-tło z maską w elipsie** (`.siatka-tla`) i **nadtytuł wersalikami
  z rozstrzeleniem** („SEJM RP · X KADENCJA”, `tracking-[0.2em]`).
- **Pigułki** z przykładami pod polem szukania (`rounded-full border`).
- **Jedna barwa akcentu do wszystkiego** — odnośniki, paski, obramowanie
  organu gminy, zaznaczenie.
- **Liczba w karcie, opis pod liczbą, przypis pod opisem** — ten sam układ
  dla ludności, budżetu, pomocy i zamówień, więc żadna liczba nie jest
  ważniejsza od innej.

Co zostaje, bo jest dobre i rzadkie: bezbarwna chromatyka z kolorem tylko
w danych (komentarz w `globals.css`), liczby tablicowe (`.liczby`), menu
działające bez JavaScriptu, kontrast pilnowany testem, cele dotykowe ≥ 24 px.
