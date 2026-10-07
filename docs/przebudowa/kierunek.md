# Kierunek stylu — dwie wersje i przełącznik „Wygląd”

**Decyzja Pawła z 07.10.2026:** zostają dwie wersje, a wybiera czytelnik.
- **Standardowy (J+G)** — J „Usługa publiczna” na każdej szerokości,
  a od 1280 px dodatki z G „Pulpit”. Wersja domyślna.
- **Wypis z rejestru (A)** — do wyboru przełącznikiem „Wygląd”.

Pozostałe motywy (runda 1: dziesięć zupełnie różnych; runda 2: dziesięć na
wspólnym fundamencie) są w `archiwum/` — działające, z planszami i opisem.

**Jak oglądać:**
- `prototyp/index.html`; przycisk „Wygląd” w nagłówku zmienia styl strony
  i jasność;
- `?k=jg` albo `?k=a` w adresie otwiera wybraną wersję;
- zestawienie: `prototyp/kierunki.html`;
- plansze: `plansze/*.jpg`.

**Domyślny styl to Standardowy** — moje założenie, do potwierdzenia przez
Pawła. Powód: najbardziej typowy układ najlepiej znosi pierwsze wejście
z wyszukiwarki (Tuch 2012, `badania-ux.md` §1).

---

## Standardowy (J+G) — jedna tożsamość, dwie gęstości

Na każdej szerokości to **J „Usługa publiczna”**:
- czarny pasek z nazwą serwisu i niebieską kreską;
- Public Sans, pismo 18/20 px;
- niebieskie, podkreślone odnośniki;
- żółte tło fokusu z czarną kreską (jak w GOV.UK);
- „W liczbach” jako lista podsumowania bez ramki;
- uwaga z wykrzyknikiem w kółku.

**Od 1280 px** dochodzą dodatki z **G „Pulpit”**. Komputer to narzędzie
dziennikarza i radnego, więc tam jest gęściej:

| Dodatek z G | Po co |
|---|---|
| spis działów w bocznym pasku (przyklejony, bieżący dział podświetlony) | długie strony gminy i posła bez przewijania na ślepo; menu serwisu **zostaje u góry** (F2) |
| „W liczbach” jako jedna ramka podzielona liniami na pola, dwa w rzędzie | porównanie liczb obok siebie; nadal jedna ramka na ekranie (F6) |
| etykieta wersalikami **nad** liczbą | liczba czyta się jak odczyt z tablicy |
| liczby, daty i źródła pismem maszynowym (IBM Plex Mono 500) | cyfry równej szerokości łatwiej porównywać w kolumnie |

Nie zmienia się nic, co jest tożsamością: kroje tekstu, pasek, barwy,
odnośniki i fokus. Węższe okno nie zamienia serwisu w inny serwis.
Zmienia się tylko gęstość.

**Fonty:**
- telefon: Public Sans 400/600, **50 kB**;
- komputer: dodatkowo Plex Mono 500, razem **79 kB**;
- przeglądarka pobiera Plex Mono tylko tam, gdzie jest użyty.

**Kontrast** (paleta J):
- jasna: tekst 17,5:1, najsłabszy szary 6,3:1, odnośnik 4,6:1 (na szarym
  pasku menu);
- ciemna: 14,1 / 7,6 / 7,2.

## Wypis z rejestru (A)

Strona jak odpis z rejestru:
- „Dział N” na marginesie;
- sygnatury i daty pismem maszynowym;
- „podstawa:” przy każdym źródle.

Kroje: Brygada 1918 600, IBM Plex Sans 400/600, Plex Mono 500 —
**142 kB**. Kontrast: tekst 14,9:1, szary 5,7:1, akcent 6,5:1 (ciemny:
13,3 / 5,9 / 8,8). Bez zmian względem rundy 2 — opis i powody są
w `archiwum/runda-2/kierunek.md`.

## Przełącznik „Wygląd”

Przycisk w nagłówku, obok szukania (na telefonie obok nazwy serwisu),
otwiera panel z dwiema grupami:

```
Styl strony   ( ) Standardowy        duże pismo, wszystko na wierzchu;
                                      na komputerze gęściej, ze spisem działów z boku
              ( ) Wypis z rejestru   jak odpis z urzędu: ponumerowane działy,
                                      „podstawa” przy każdej liczbie
Jasność       ( ) jak w systemie   ( ) jasny   ( ) ciemny
```

Zachowanie:
- wybór działa od razu, bez przeładowania, i zostaje zapamiętany na
  kolejnych stronach;
- Escape i kliknięcie obok zamykają panel;
- bez JavaScriptu przełącznika nie widać: strona ma styl domyślny,
  a jasność idzie za ustawieniem systemu;
- dawny przycisk ◐ (sam jasny/ciemny) wszedł do panelu jako „Jasność”;
- cele dotykowe mają ≥ 44 px, a pola wyboru 24 px.

**Dla głównej sesji — jak to zbudować w `src/` bez kosztu na serwerze:**
1. **Styl wybiera skrypt w `<head>`, nie ciasteczko.** `layout.tsx` już
   przywraca jasność krótkim skryptem przed pierwszym malowaniem;
   wystarczy tak samo `data-styl` z `localStorage.getItem('styl')`.
   Odczyt ciasteczka w `layout.tsx` zrobiłby z każdej strony trasę
   dynamiczną, a strony posłów i gmin są dziś budowane raz i odświeżane
   co godzinę (pułapki 39 i 52).
2. **Dwa zestawy zmiennych w `globals.css`:** `:root` = Standardowy,
   `:root[data-styl="a"]` = Wypis. Do tego reguły różniące wersje (kroje,
   „Dział N”, „podstawa:”, ramka „W liczbach”) z przedrostkiem
   `[data-styl="a"]`. Jasność dalej przez `data-motyw` — obie osie są
   niezależne. Nazwy zmiennych są te same co dziś, więc test kontrastu
   (`kontrast.test.ts`) sprawdzi obie palety bez zmian w teście.
3. **Fonty przez `next/font` z `preload: false` dla wszystkiego poza
   Public Sans.** Przeglądarka pobiera krój dopiero wtedy, gdy coś jest
   nim napisane. Czytelnik Standardowego na telefonie ściągnie 50 kB, nie
   wszystkie 4 rodziny. Wstępnie ładowany tylko Public Sans 400 i 600
   (pierwszy ekran).
4. Komponent przełącznika to `'use client'`, ale mały (dwie grupy pól
   wyboru). Ma zastąpić `PrzelacznikMotywu`, a nie dojść obok niego —
   pułapka 54: ten sam komponent na 499 stronach.

---

## Pomiar F1–F14 obu wersji (07.10.2026)

Ten sam skrypt i te same zasady co w rundzie 2 (`prototyp/pomiar.cjs`,
opis kolumn w `archiwum/runda-2/kierunek.md`): 13 stron, 390 i 1280 px,
najgorszy wynik ze wszystkich stron.

| motyw | F1 pierwsza / ostatnia odp. (px, tel.) | F2 | F3 jasność tła | F4 | F5 | F6 bloki/ekran | F7 | F8 | F9 g/f/pp | F10 g / gł | F11 | F12 | F13 | F14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J+G | 824 / 1468 | tak | 1 | 1 odc., 1 tła | 0 < 15 px; 18/20 px; 1.55; 61–67 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 79 kB, ozdoby 0 |
| A | 834 / 1466 | tak | 0.896 | 1 odc., 0 tła | 0 < 15 px; 18/20 px; 1.55; 66–71 zn. | 1 | 34/34; metoda na końcu 8/8 | 3/3 | 3/1/1 | jest / jest | 20/20 | 10 na 1280; tel. Sejm+Pieniądze; ogólne 0 | tak | 142 kB, ozdoby 0 |

„1 tła” w J+G to przycisk „Sprawdź” w barwie odnośników.

Do tego:
- 120 renderów (15 stron × 2 wersje × 390/1280 × jasny/ciemny): bez
  przepełnienia i bez błędów konsoli;
- cele dotykowe ≥ 24 px na 13 stronach, w obu wersjach i szerokościach;
- przełącznik sprawdzony w Playwright: styl i jasność zmieniają się od
  razu, zostają po przejściu na inną stronę, a bez JavaScriptu przełącznik
  jest ukryty.

## Zdania porównawcze — rachunek (F9)

Wspólne dla obu wersji, bo to treść, nie styl. Każde wyliczenie ma kontrolę
w generatorze prototypu.

| Gdzie | Zdanie | Rachunek |
|---|---|---|
| gmina | 1,4 raza więcej niż mediana w województwie | 9,67 mld zł ÷ 816 614 = 11 842 zł; ÷ 8288 zł = 1,43 |
| gmina | 3,4 raza więcej niż mediana; 97% wydatków na oświatę | 4392 ÷ 1275 = 3,44; 3,59 ÷ 3,71 mld zł = 0,968 |
| gmina | pomoc: 27 zł na mieszkańca, ok. 2 razy więcej niż w województwie | 22,2 mln zł ÷ 816 614 = 27,2 zł; ÷ 13 zł (małopolskie, te same 16 dni) = 2,09 |
| firma | średnio 9,3 mln zł na przypadek | 12,8 mld zł ÷ 1380 |
| pomoc publiczna | 27 zł na mieszkańca; 43% dla dużych firm, które mają 1,7% przypadków | 992 mln zł ÷ 37 319 859 (GUS 2025) = 26,6; 425 ÷ 992 = 0,428; 1314 ÷ 78 868 = 0,0167 |
| głosowanie | w 7 z 11 klubów najczęściej „przeciw” | najczęstszy głos w każdym klubie, bez niezrzeszonych |

---

## Jak do tego doszło

| kiedy | co | gdzie |
|---|---|---|
| 04.10.2026 | runda 1: dziesięć zupełnie różnych motywów (A–J i A+B) | `archiwum/runda-1/` |
| 04.10.2026 | przegląd badań z pełnych tekstów (główna sesja) | `badania-ux.md` |
| 04.10.2026 | runda 2: wszystkie dziesięć od nowa na fundamencie F1–F14, każdy zmierzony; propozycja A, J, F | `archiwum/runda-2/` |
| 07.10.2026 | wybór Pawła: J z dodatkami z G na komputerze oraz A, z przełącznikiem | ten plik, `prototyp/` |

Fundament F1–F14 (odpowiedź na pierwszym ekranie, pismo 18/20 px, jedna
ramka na ekran, nagłówki od odpowiedzi, kwoty na mieszkańca, „Jak myślisz,
ile…?”, menu widoczne i reszta) obowiązuje obie wersje bez zmian. Pełny
opis: `runda-2.md` i `archiwum/runda-2/kierunek.md`; co zmienia
w szablonach stron: `nawigacja.md`, dział 0.
