# Przegląd treści i strony głównej — 24.10.2026

Zlecony przez Pawła („nie wyświetlać informacji zbędnych”, „strona główna nie
przyciąga do dalszego oglądania”). Wykonał agent z modelem Fable na żywej
stronie (komputer 1280 px i telefon 390 px, zrzuty w scratchpadzie sesji),
bez zmian w kodzie. Poniżej streszczenie raportu i to, co sprawdziłem sam.

## Sprawdzone przeze mnie (24.10.2026) — błędy wiarygodności, POTWIERDZONE

| Zarzut | Pomiar |
|---|---|
| `/ustawa/3147` (uchwalona) mówi „Głosowania: jeszcze żadnego nad tym projektem” | w bazie są głosowania 67/34–38… „Pkt. 16 Sprawozdanie Komisji o rządowym projekcie…” z drukiem 3147 w tytule; rejestr nie wiąże ich z etapami procesu, a strona traktuje to jako „brak głosowań” |
| Polskie sortowanie | `/poslowie`: … Burzyńska, **Błaszczak**, Chmielewski — „Ł” sortowane po „Z” (porządek bajtów, `collate nocase`) |
| „nazwa pominięta — może to być osoba fizyczna” 16,6 mld zł wśród udzielających | to **Krajowa Rada Radiofonii i Telewizji** — bez NIP-u w rejestrze, a reguła nazw nie rozpoznaje „Krajowej Rady” jako instytucji |

Warunki UOKiK: instrukcja wymaga sześciu ELEMENTÓW bezpośrednio przy danych
(`docs/sudop.md`, „Warunki ponownego wykorzystania”), nie dosłownego brzmienia —
skrócona wersja z wszystkimi sześcioma jest dozwolona.

Do sprawdzenia przed zmianą: skutek głosowania nad poprawką Senatu. Art. 121
ust. 3 Konstytucji: poprawkę Senatu uważa się za przyjętą, jeśli Sejm nie
odrzuci jej bezwzględną większością — więc „większość bezwzględna
nieosiągnięta” przy wniosku o odrzucenie znaczy „poprawka zostaje”. Trzeba
potwierdzić na brzmieniu `temat` w rejestrze, zanim napiszemy skutek.

## Najważniejsze wnioski raportu

1. **Strona główna mówi o metodzie, nie o tym, co czytelnik dostaje.** Pierwszy
   ekran: hasło z paska powtórzone jako H1, „nie oceniamy”, trzy akapity tekstu;
   ani liczby, ani obrazu, ani pola wyszukiwania (odsyła „do pola u góry”).
   Najmocniejsze rzeczy serwisu (półkole, portrety, mapa, opisy ustaw z
   rejestru) są gdzie indziej.
2. **Powtórzenia:** na głównej „5201 głosowań” ×4, „nie oceniamy” ×4, sekcja
   „Co mamy” dubluje resztę strony; sekcje 1 i 2 pokazują to samo wydarzenie.
3. **Zastrzeżenia metodyczne na wierzchu** zamiast pod „Jak to liczymy”:
   „w 3240 pobranych dniach… nie w całym roku”, „To nie jest cała historia tej
   gminy”, linijka „stan danych” pismem maszynowym pod każdym nagłówkiem, pełne
   warunki UOKiK dwa razy na stronie gminy. Dni są dziś ciągłe — zakres dat
   mówi to samo krócej, a różne liczby dni (3240/3289/3317) przestaną się gryźć.
4. **Kraków waży 2 MB HTML** — lista „Kto przyznał pomoc: 786 organów”, to samo
   zdanie objaśniające powtórzone 1162 razy.

## Proponowany układ strony głównej (od góry)

1. Bohater na jeden ekran telefonu: H1 w słowach czytelnika („Jak głosuje Twój
   poseł. Ile publicznych pieniędzy trafia do Twojej gminy.”), jedno zdanie o
   źródłach, DUŻE pole wyszukiwania z przykładami.
2. Trzy karty z obrazem: gmina (statyczna miniatura mapy), poseł (mini-półkole
   460 kropek), firma (pole NIP).
3. „Ostatnio w Sejmie” zamiast sekcji 1 i 2: 3–4 ustawy z krótkim tytułem bez
   prefiksu „Rządowy projekt ustawy o zmianie ustawy…”, 1–2 zdania z
   `procesy.opis` („opis z rejestru”), pasek wyniku „przyjęta 230 : 206”;
   przy pierwszej półkole (jeden `<path>` na barwę — pułapka 54).
4. „Pieniądze w gminach”: miniatura mapy, jedna liczba z zakresem dat, zwarte
   warunki UOKiK.
5. Usunąć „Co mamy” i nagłówek „KO i PiS mają razem 303 z 460 mandatów”
   (sugeruje blok); w legendzie „Konfederacja KP”, nie „Konfederacja_KP”.

## Podstrony — najważniejsze pozycje

- **Wszędzie:** linijka „zrejestru.pl — niezależny serwis…” do jednej linii;
  „stan danych”/TERYT/NIP/PKD na dół strony; data podstawy w tej samej linii
  co nazwa źródła; bez pisma maszynowego dla liczb (tabular-nums); bez
  podkreśleń tytułów na listach; spis działów nie zaczyna się od „2”.
- **Gmina:** organy — legenda raz, 5 pozycji, reszta na osobnej stronie; kafel
  pomocy skrócić do kwoty z zakresem dat i mediany; w „Co nowego” bez „dzień
  niepełny” przy każdym wierszu, zdanie o małej gminie nie na stronie Krakowa,
  powtarzające się umowy BZP zwinięte; etykiety „Na co” bez ucinania w pół
  słowa; procenty z 1–2 cyframi znaczącymi; wykres FE od pierwszego roku
  z wartością. Nazwa firmy z imieniem w kaflu (Piątek, 34%) — **decyzja Pawła**.
- **Poseł:** „Ostatnie głosowania” grupowane po punkcie (10 poprawek pod jednym
  tytułem); objaśnienie usprawiedliwień do „Jak to liczymy”; bez opisów zakresu
  komisji; bez powtarzanego „· Poseł ·” w wystąpieniach.
- **Głosowanie:** skutek przy poprawkach Senatu (po sprawdzeniu); krótkie H1
  („Poprawka Senatu nr 10 — …”); bez kafla „za wśród oddanych” (dubluje pasek);
  bez quizu przy tabeli klubów; półkole zaraz pod wynikiem; na listach
  „przyjęto/odrzucono” zamiast „wymagane 3 „za” — osiągnięta”; ucinać prefiks,
  nie numer druku.
- **Ustawy:** prefiks typu projektu do metadanych; opis z rejestru pod H1;
  `/ustawa` bez powiązanych etapów — uczciwe zdanie i odnośnik do głosowań
  z numerem druku.
- **Okręg:** portrety; bez „uprawnionych”; macierz głosowań odwrócona
  (wiersz = głosowanie).
- **Pomoc publiczna:** zakres dat zamiast „w 3289 pobranych dniach / nie
  w całym roku”; „stan danych” na /stan; połączyć podwójne nagłówki; krótkie
  etykiety przeznaczeń.
- **Posłowie:** portrety, polskie sortowanie. **Firmy:** podtytuł nie obiecuje
  zamówień, których wyniki nie zawierają; strona firmy — podsumowanie
  przeznaczeń zamiast 50 identycznych wierszy, bez listy „osobno” dublującej
  tabelę.

## Ranking 10 zmian (efekt / koszt)

1. Główna: usunąć powtórzenia („Co mamy”, H1 = hasło, „nie oceniamy” ×4,
   akapity metodyczne).
2. Główna: opis z rejestru pod ustawą, tytuł bez prefiksu.
3. Pięć błędów wiarygodności (wyżej + nagłówek „KO i PiS”, skutek poprawek Senatu).
4. Gmina: organy — legenda raz, top 5, reszta na osobnej stronie.
5. Zakres dat zamiast „pobranych dni”.
6. Listy głosowań: „przyjęto / odrzucono”.
7. Grupowanie głosowań po punkcie; ucinać prefiks, nie druk.
8. Bohater głównej: pole wyszukiwania i karty z obrazem; półkole ostatniej ustawy.
9. „Stan danych” i stopka metodyczna na dół; zwarte warunki UOKiK.
10. Typografia: bez maszynowego dla liczb, bez podkreśleń tytułów, bez
    numeracji działów; portrety na /poslowie i /okreg.

## Wdrożone 25.10.2026

Trzy rundy: błędy wiarygodności (`c1ca90e`), nowa strona główna (`bceeefa`,
układ zaakceptowany przez Pawła), odchudzenie podstron (`c7d24f2`, `d8229bc`).
Z rankingu: 1–9 w całości, z 10 — portrety na `/okreg`.

## Czego nie wdrożyłem i dlaczego

- **Pismo maszynowe liczb i numeracja działów (pkt 10)** to cecha wyglądu
  z decyzji Pawła z 07.10.2026 (dwa style, „Wypis z rejestru” z numerowanym
  spisem). Zdjąłem numery tylko na stronie głównej (nie jest dokumentem)
  i poprawiłem spis, który zaczynał się od „2”. Reszta — do decyzji Pawła.
- **Bez podkreśleń tytułów na listach** — podkreślenie to jedyny znak, że
  tytuł jest odnośnikiem (styl standardowy, WCAG 1.4.1); bez decyzji Pawła
  nie zmieniam.
- **Portrety na `/poslowie`** — pliki mają ok. 50 kB, więc przewinięcie listy
  499 posłów to ok. 25 MB. Najpierw miniatury (np. 96 px przy imporcie).
- **Odwrócona macierz głosowań na `/okreg`** — przy 12–20 posłach w okręgu
  kolumnami byliby posłowie, a tabela i tak przewijałaby się w bok na
  telefonie; zysk niepewny, zostaje do pomiaru na prawdziwym okręgu.
- **Krótkie etykiety przeznaczeń** pisane przez nas — to byłby nasz tekst
  w miejscu rejestru. Zamiast tego etykiety bez ucinania przy 110 znakach.
- **Opis z rejestru pod H1 ustawy** — strona ma już streszczenie i dział
  „Opis z rejestru”; trzeci raz ten sam tekst byłby powtórzeniem, które
  przegląd sam wytykał. Zrobiłem przedrostek do metryczki.
