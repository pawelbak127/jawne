# Raport: kierunki rozwoju — ocena z 03.10.2026

Powstał z pytań Pawła z 03.10.2026. Oznaczenia: **[Z]** zmierzone na bazie
albo na żywym API tego dnia, **[D]** z dokumentacji lub cudzej publikacji,
**[O]** ocena.

> **Mianownik do całego raportu (zasada 3).** Pomiary SUDOP robione na
> lokalnej kopii: **168 467 wierszy**, nie 4,78 mln jak serwer. Struktura
> prawdopodobnie się utrzyma, **liczby bezwzględne nie są krajowe**.

## Miara: wygoda ÷ praca

Wygoda 1–5 = o ile bliżej czytelnik **bez przygotowania** jest do zobaczenia
*swojej* sprawy w pierwszych dziesięciu sekundach. Praca = dni jednej osoby.
**Ryzyko ma weto**, nie obniża oceny: pomysł łamiący zasadę 1, 2, 6 albo 7
wypada z rankingu niezależnie od ilorazu.

| # | Pomysł | Wygoda | Praca | Co miesiąc | W/P |
|---|---|---|---|---|---|
| 1 | **Streszczenie ustawy z rejestru** (`procesy.opis`) | 5 | 0,5 dnia | 0 | **10,0** |
| 2 | Oś czasu dotacji UE po roku | 3 | 1 dzień | 0 | 3,0 |
| 3 | Komisje posła (`/committees`) | 4 | 1,5 dnia | ~0 | 2,7 |
| 4 | Urodzenia w gminie, 31 lat (GUS BDL) | 3 | 1,5 dnia | 0 | 2,0 |
| 5 | Kategorie ustaw ze słów kluczowych ELI | 4 | 2 dni | ~0 | 2,0 |
| 6 | Pomoc publiczna: komu i na co | 4 | 2,5 dnia | 0 | 1,6 |
| 7 | Wykształcenie w gminie (NSP 2021) | 2 | 1,5 dnia | 0 | 1,3 |
| 8 | BZP/eZamówienia: zamówienia poniżej progów UE | 4 | 6–8 dni | 0,5 dnia | 0,6 |
| 9 | Dokumenty po dotacje | 3 | zablokowane | — | 0 |
| 10 | Inwestycje ze zdjęciami i ocenami od użytkowników | — | — | — | **weto** |

**Zrobione 03.10.2026:** pozycja 1 (pułapka 66), pozycja 2 (`fe_gminy_lata`,
słupki na stronie gminy), pozycja 3 (`/komisje`, `/komisja/[kod]`, sekcja na
stronie posła). Następne w kolejce: 4 i 7 jednym etapem GUS (urodzenia
i wykształcenie), potem 5 (słowa kluczowe ELI).

**Czeka na decyzję Pawła:** pozycja 6 wymaga progu liczebności komórki dla
branż (PKD w gminie z trzema beneficjentami identyfikuje firmę bez nazwy) —
to nowy parametr jawności obok `PROG_JAWNOSCI_EUR`. Pozycja 10 ma weto
z trzech powodów opisanych niżej; jeśli Paweł chce je podważyć, to rozmowa,
nie zadanie.

---

## 1. Ustawy niezrozumiałe — i czemu nie model językowy

Rejestr Sejmu **sam pisze streszczenie** każdego projektu (`description`
w `/sejm/term10/processes/{nr}`). Zmierzone: **943 z 956 projektów ustaw
(98,6%)**, średnio 329 znaków, 952 z 954 zaczyna się od „projekt dotyczy” [Z].
Leżało w `procesy.opis` od 23.09 i **było indeksowane do wyszukiwarki**, ale
nie było w `KOLUMNY_PROCESU`, więc nie docierało na stronę.

**Dlaczego nie model językowy** — argument o mechanizmie, nie o guście:
streszczenie z modelu byłoby **pierwszą treścią na tej stronie, przy której
odnośnik do rejestru byłby nieprawdą**, bo pod tym adresem nie ma tego tekstu.
Postawione nad liczbami uczy czytelnika, że wszystko na stronie ma ten sam
status. Gdy jedno streszczenie okaże się nietrafne (przy 956 ustawach okaże
się), spór nie będzie o ten akapit — będzie o to, czy liczby też są
„generowane”. To ten sam argument, którym odrzucamy rankingi: przenosi spór
na grunt, na którym nie umiemy wygrać.
`jakglosuja.pl` ma streszczenia z modelu i publikuje je na CC-BY 4.0 [D] —
na tym polu bylibyśmy drudzy, a na `opis` z rejestru jesteśmy jedyni.
Precedens: Congress.gov i GovTrack pokazują streszczenia **służby analitycznej
parlamentu**, nie serwisu [D].

**Następny krok, gdyby `opis` nie wystarczał:** pole `rclLink`
(**31 z 60 losowych projektów, 52%** [Z]) prowadzi do RCL, gdzie leży Ocena
Wpływu z urzędową rubryką „Jaki problem jest rozwiązywany?” [D] — znowu cytat,
nie nasza treść. Sam odnośnik to godzina pracy.

**Wariant b — słowa kluczowe ELI.** `/eli/acts/{ELI}` oddaje `keywords`
(**39 z 40 aktów w próbce** [Z]), np. „medyczne wyroby, refundacja, opieka
zdrowotna”. Mianownik: mamy `eli` dla 781 procesów, z tego **498 Dz.U.** [Z],
czyli tematy pokryją ~52% projektów — **tylko opublikowane**. Projekt odrzucony
nigdy nie dostanie słów kluczowych i strona musi to mówić, inaczej filtr
„ochrona zdrowia” sugeruje, że innych projektów zdrowotnych nie było.
To zarazem najlepsza znaleziona odpowiedź na „pokazać poglądy bez
etykietowania”: kategorię nadał wydawca Dziennika Ustaw, nie my.

## 2. Inwestycje w mojej gminie — część A tak, część B weto

**Planowane inwestycje w dużej mierze NIE ISTNIEJĄ maszynowo.** Wykaz
przedsięwzięć wieloletnich jest w **Załączniku nr 2 do WPF**, a Ministerstwo
Finansów publikuje tylko tablicę główną prognozy, bez wykazu [D] — reszta leży
w BIP każdej gminy osobno, 2 479 niejednolitych PDF-ów rocznie [O].
Co mamy: `budzety_gmin.wydatki_majatkowe` dla **2 477 gmin × 5 lat, 100%** [Z],
ale to **wykonanie, nie plan**. TED to też przeszłość (tylko udzielenia).
Jedyne maszynowe „co gmina robi teraz” to **BZP `ContractNotice`** — pozycja 8.

**Część B (zdjęcia i oceny od użytkowników) — weto, trzy niezależne powody:**

1. „Ocenić jakość” **jest** ocenianiem (zasada 6), a za inwestycją gminy stoi
   **imienny organ wykonawczy**. Ocena remontu to ocena wójta cudzą ręką.
2. Zdjęcie od użytkownika ma odnośnik **do nikogo** — w serwisie, którego cały
   sens polega na tym, że wszystko ma źródło, to nie dodatek, tylko wyjątek
   unieważniający regułę.
3. Koszt jest **utrzymaniowy**: moderacja wizerunku i tablic rejestracyjnych,
   status administratora danych dla fotografii, procedura usuwania,
   odpowiedzialność za zniesławienie, pliki na maszynie z 1,8 GB, która już
   przewraca `next build`. To drugi projekt, nie funkcja.

Zajęte przez **NaprawmyTo.pl** (polski FixMyStreet) [D]. Lepsze wyjście: jedno
zdanie z odnośnikiem na stronie gminy.

## 3. Dokumenty po dotacje — blokada jest formalna, nie techniczna

Stan prawny jest podzielony [D]: wniosek **podmiotu prywatnego NIE jest**
informacją publiczną, wniosek **podmiotu publicznego JEST**, a **przed
rozstrzygnięciem konkursu nic nie jest**. `mapadotacji.gov.pl` nie publikuje
wniosków ani umów i nie ma API [Z].

**Realna droga to Centralny Rejestr Umów**, i stan się zmienił od
`docs/pismo-cru.md`: CRU JSFP działa **od 01.07.2026 dla wszystkich jednostek
naraz**, a ostateczna ustawa **skasowała próg 500 zł** — trafiają tam
**wszystkie** umowy [D]. Instytucja zarządzająca funduszami UE jest jednostką
sektora finansów publicznych, więc **umowa o dofinansowanie powinna być w CRU**
[O — wniosek z zakresu podmiotowego, niepotwierdzony pomiarem].
Czego nie ustalono: **nie znaleziono publicznego punktu odczytu bez klucza** —
`/api/umowy`, `/umowy/search`, `/rest/umowy` i `/umowa/1` oddają powłokę
aplikacji Angular, nie dane [Z]. To nie znaczy „nie ma”, znaczy „nie
znaleziono”.

Blokada jest ta sama co przy trzech innych sprawach: urząd prosi o **REGON**,
którego osoba fizyczna bez działalności nie ma [D]. Fundacja odblokowuje CRU,
`JAWNE_KONTAKT` i administratora danych **jednym ruchem**.

## 4. Filtr czasu w dotacjach — połowa już jest

Pomoc publiczna **ma** wymiar roku (`SlupkiLat`, „Według roku udzielenia”).
**Fundusze Europejskie nie mają go wcale**, bo `fe_gminy` agreguje po
`(teryt, okres)` i nie ma kolumny roku [Z]. A dane są: `fe_projekty.poczatek`
i `.koniec` wypełnione w **100% — 138 172 z 138 172** [Z]. Rozkład jest treścią
sam w sobie: 2014 → 1 721 projektów, **2020 → 28 523**, 2023 → 1 971 [Z].

**Warunek, którego nie wolno obejść:** filtr ma być **wyborem spośród
policzonego**, nie zapytaniem czytelnika — pułapki 52, 55 i 57. Nowa tabela
`fe_gminy_lata (teryt, okres, rok, projektow, wartosc, ue)` to **ok. 70 tys.
wierszy, czyli nic**, liczona w `wyliczenia`. Dla czytelnika wygląda identycznie.

Dwa sposoby, w jakie to może skłamać: (1) rozłożenie wartości projektu na lata
jego trwania byłoby **naszym wymysłem** — rejestr podaje jedną kwotę, więc
słupki pokazują **rok rozpoczęcia** i podpis musi to mówić; (2) pułapka 21 —
dla 2014–2020 większość gmin ma **wyjaśnienie, nie zero**.

## 5. Więcej danych

### 5a. Komisje — największa dziura na stronie posła

`/sejm/term10/committees` działa i **nie jest używane wcale** [Z]:
**40 komisji** (31 stałych, 6 nadzwyczajnych, **3 śledcze**), **1 051
członkostw**, **408 z 499 posłów**, **40 przewodniczących i 175 zastępców**,
pole `joinDate` (czyli *od kiedy*) i `scope` — **urzędowy opis zakresu
działania komisji** [Z].

To najlepsza znaleziona odpowiedź na „na czym komu zależy” bez etykietowania:
poseł sam wybrał, gdzie pracuje, Sejm zatwierdził uchwałą, zakres opisał urząd.
Zero naszej klasyfikacji, zero ryzyka wobec zasady 6.

**Dwie rzeczy do zrobienia dobrze:** (1) 91 posłów bez komisji to **zmierzone
zero, ale 39 z 499 ma wygasły mandat** — mianownik musi brzmieć „posłowie
z czynnym mandatem”, inaczej napis czyta się jak zarzut (zasady 2 i 6);
(2) `/committees` oddaje **stan bieżący**, pułapka 3 — trzeba napisać „stan na
dzień pobrania”.

**Uwaga na pułapkę 54:** pełny skład komisji na stronie każdego posła to
1 051 członkostw × 499 stron. Na stronie posła **tylko jego własne komisje**.

### 5b. Pomoc publiczna: komu i na co

Pola wypełnione w **100%** i prawie nieużywane: `pkd`, `wielkosc`,
`przeznaczenie`, `forma`, `podstawa`; `srodek_nazwa` tylko w 41% — tam
`null` ≠ zero [Z/lokalnie].

Liczba, od której warto zacząć:

| wielkość firmy | przypadków | kwota | udział kwoty |
|---|---|---|---|
| duże/pozostałe | 3 564 (2,12%) | 13,47 mld zł | **90,75%** |
| mikro | 146 355 (86,87%) | 0,71 mld zł | 4,82% |
| małe | 14 236 (8,45%) | 0,40 mld zł | 2,69% |
| średnie | 4 310 (2,56%) | 0,26 mld zł | 1,74% |

**2,12% przypadków to 90,75% pieniędzy** — rozkład z rejestru, z mianownikiem,
bez naszej interpretacji.

**Pułapka do zapisania:** `wielkosc` ma **różne nazwy dla tego samego kodu** —
kod 0 jako „mikroprzedsiębiorstwo” (127 483) i „mikroprzedsiębiorca” (18 872);
kod 3 jako trzy różne napisy [Z/lokalnie]. **Grupowanie po nazwie rozbija jedną
kategorię na trzy** i cicho zaniża największą pozycję. Grupujemy po
`wielkosc_kod` (ten sam kształt co pułapka 60).

**Ryzyko wobec zasady 7:** nazwa PKD przy jednej firmie w małej gminie
**identyfikuje ją bez podania nazwy**. Potrzebny **próg liczebności komórki** —
nowy parametr jawności obok `PROG_JAWNOSCI_EUR`, czyli decyzja Pawła.

### 5c. eZamówienia/BZP — zdejmuje blokadę z odrzuconego pomysłu

`https://ezamowienia.gov.pl/mo-board/api/v1/notice`, **bezpłatny, czytanie bez
procedury integracji** [D], odpowiada bez uwierzytelnienia [Z]. Działające
`NoticeType`: `ContractNotice` i `TenderResultNotice` [Z].
**NIP-y są tu POLAMI, nie wolnym tekstem** (`organizationNationalId` 10 cyfr
w 40/40, `contractors[].contractorNationalId` w 40/40) [Z] — czyli bez problemu
z pułapki 45.

Pięć zmierzonych pułapek, pierwsza groźna:

1. **`PageNumber` jest IGNOROWANY** — strony 1, 2 i 30 oddają **identyczne
   100 rekordów** [Z]. Naiwny import „do pustej strony” zapisywałby pierwszą
   setkę w nieskończoność. Bliźniak pułapki 48: usługa nie zgłasza błędu,
   tylko po cichu mówi nieprawdę.
2. `PageSize` ma **sufit 500** → twardy sufit na okno czasowe; przy dokładnie
   500 wierszach okno trzeba ciąć na pół, jak zakres w `sudop.ts`.
3. **97% objętości to `htmlBody`** — dzień to 13,2 MB, bez `htmlBody` 0,39 MB
   [Z]. Historia to ~29 GB przesyłu [O] — **import lokalnie, na serwer gotowa
   baza**, jak przy SUDOP.
4. **Dławik oddaje `403`, nie `429`** — po ~26 żądaniach; 12–15 s odstępu
   działało bez błędu [Z]. Kod czytający 403 jako „brak uprawnień” stanie na
   stałe.
5. `procedureResult` to lista sklejona średnikami, z pustymi odcinkami [Z] —
   jedno ogłoszenie to wiele części.

**Dwa bloki na stronie gminy, nigdy jedna suma**: TED i BZP to różne zakresy,
a ich zsumowanie dałoby liczbę, której nie ma w żadnym źródle.

### 5d. Czego NIE dodawać o posłach

`zawod`, `wyksztalcenie`, `data_urodzenia`, `glosow_w_wyborach`, `email` —
wszystko ~100% wypełnione [Z] i wszystko to metryczka. Rozkład wykształcenia:
**474 z 499 „wyższe”** [Z] — 95% w jednej kategorii, czyli zmienna bez
informacji. Każde zestawienie „zawód vs. głosowanie” byłoby wnioskowaniem,
którego rejestr nie uprawnia (zasada 2).

`interpelacje.opoznienie_dni`: **531 z opóźnieniem, maksimum 930 dni, 883 bez
odpowiedzi** [Z] — mocna liczba, ale **dotyczy ministerstwa, nie posła**
(`minister infrastruktury` 2 315, `minister zdrowia` 2 249 [Z]). Postawiona
przy nazwisku pytającego sugeruje jego zasługę albo winę za cudze opóźnienie.

**Błąd do naprawy, znaleziony przy okazji:** `budzety_gmin.udzial_pit`
i `udzial_cit` wypełnione **tylko dla 2025**; dla 2021–2024 **zero z 2 477** [Z].
Musi wyglądać jak półpauza, nie jak brak wiersza (zasada 4, pułapka 59).

## 6. Demografia

**6a. Urodzenia — TAK, i to z 31-letnim szeregiem.** Zmienna `59` „Urodzenia
żywe”, **poziom 6 = gmina, lata 1995–2025** [Z]; `450540` na 1000 ludności,
2002–2025 [Z]; podział na płeć: `60` i `61`. Spełnia warunek „dane zbierane
regularnie” w stu procentach.

To jedyna liczba w serwisie, przy której czytelnik **rozpoznaje własne życie
bez tłumaczenia** — nie trzeba wiedzieć, co to pomoc de minimis, żeby zrozumieć
„rodzi się tu o połowę mniej dzieci niż w 1998”.

Trzy sposoby, w jakie to może skłamać: (1) **3 918 jednostek ≠ liczba gmin** —
pułapka 30, filtr na rodzaje 1, 2, 3; (2) **Warszawa jest tu jedną jednostką**
146501, więc `ludnoscWarszawy` tu **nie wolno** stosować; (3) rok bez danych
oddaje pusty wynik z HTTP 200 — pułapka 59, lata brać z `/variables/{id}`.

**6b. Wykształcenie — TAK, ale to spis, nie szereg.** Gminny poziom istnieje:
zbiór **P4315, 30 zmiennych, poziom 6, 3 800 jednostek — ale tylko 2021** [Z].
Poprzedni gminny pomiar to **2002**, z innym słownikiem kategorii [Z], więc
porównanie 2002 → 2021 byłoby **naszą konstrukcją**: „wzrost wykształcenia
wyższego” po części artefaktem zmiany słownika.

**Uwaga, w którą łatwo wpaść:** zbiór P4313/P4314 o prawie identycznej nazwie
jest na poziomie **powiatu**, a `unit-level=6` oddaje `totalRecords: 0`
z HTTP 200 [Z] — znowu pułapka 59. Przy BDL nie wystarczy znaleźć zmiennej,
trzeba przeczytać jej `level`.

**Czego nie robić:** nie stawiać wykształcenia obok pieniędzy bez odstępu.
Jeden wykres z obiema wielkościami byłby insynuacją przebraną za dane.

---

## Sprostowanie do naszych własnych dokumentów

`CLAUDE.md` i `docs/pomysly.md` mówią „żaden polski serwis nie ma SUDOP”.
**To jest nieścisłe:** `rejestr.io` pokazuje pomoc publiczną i dotacje UE
otrzymane przez organizację — **odpłatnie, w planach Premium/Biznes** [D].
Zdanie, które obroni się w rozmowie z dziennikarzem:

> Pomoc publiczna jest w `rejestr.io` **odpłatnie i w przekroju jednego
> podmiotu KRS**. U nas jest **bezpłatnie, w przekroju gminy, z przeglądem
> krajowym i z organem, który ją przyznał.**

Dla porządku: `z-dykty.pl` **nie ma** SUDOP ani pomocy publicznej [Z], ma za to
gminy, Sejm, finanse partii, zamówienia, umowy, fundusze UE, **majątki**,
obietnice partii i 366 181 aktów notarialnych [D] — jest konkurentem **znacznie
szerszym, niż wynika z naszych dokumentów** — i trzyma linię „rankingi tylko
gmin i instytucji, nigdy osób” [D].

---

## Lista Pawła z 03.10.2026, w jego słowach

Żeby nic nie przepadło między raportem a zadaniami:

- wyjaśnienia ustaw — „nazwy ustaw nie są intuicyjne”, ewentualnie AI →
  **zrobione**, pozycja 1
- jakie jeszcze dane o posłach i politykach → pozycje 3 i 5d
- jakie jeszcze dane o gminach → pozycje 2, 4, 6, 7
- jakie jeszcze dane o firmach → pozycje 6 i 8
- inwestycje w mojej gminie, zdjęcia, ocena jakości → pozycja 10
  (część A do zrobienia, część B weto)
- dokumenty składane po dotacje → pozycja 9
- filtr zakresu czasu w dotacjach → pozycja 2
- błędy po przejściu na domenę → **zrobione**, pułapki 63–65
- rozkład urodzeń dla gmin → pozycja 4
- stopień wykształcenia → pozycja 7
- statystyki odwiedzin serwisu → osobno, nie jest funkcją serwisu
