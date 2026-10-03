# Plan i pomysły

Żywy dokument. Zapis z 18.09.2026, uzupełniany (ostatnio 19.09.2026: faza 1
przygotowana). Trzy części: **blokery przed premierą**,
**kolejne kroki** (uzgodnione), **pomysły** (do oceny). Skreślone wpisy zostają
z datą — chcemy widzieć, co odrzuciliśmy i dlaczego.

---

## Jak zacząć nową sesję

1. Otwórz Claude Code **w katalogu `C:\Projects\jawne`** — wtedy automatycznie
   wczytuje się `CLAUDE.md` tego projektu (w `C:\Projects\obywatel` wczytuje
   się stary).
2. `npm run stan` — co mamy, czego brakuje, jakim poleceniem to dociągnąć.
3. Ten plik — co jest zrobione, co następne.

Długa rozmowa to nie pamięć projektu. Wszystko, co trzeba wiedzieć, jest
w `CLAUDE.md` i w `docs/`; nowa sesja jest tańsza i nie traci niczego ważnego.

---

## Przed premierą — blokery

Od 03.10.2026 `noindex` **nie jest już wpisany w kod**: rozstrzyga zmienna
`JAWNE_INDEKSOWANIE` (domyślnie wyłączona), wspólna dla `layout.tsx`
i dla `/robots.txt` — `src/lib/premiera.ts`. Premiera to jedno polecenie:

```bash
sudo jawne ustaw JAWNE_INDEKSOWANIE      # wartość: tak
```

Zdjęcie tego jest ostatnim krokiem, nie pierwszym.

### Czeka na wdrożenie (stan 03.10.2026)

**Serwer chodzi na buildzie z 02.10, 13:54 — dziewięć godzin i kilkanaście
commitów wstecz**, bo `aktualizuj` padł po `git pull`, a przed budową.
Dopóki Paweł nie uruchomi `sudo jawne aktualizuj`, na żywej stronie NIE MA:

- poprawnej domeny w mapie strony (50 000 adresów pod starą `sslip.io`),
- działającego progu jawności (`JAWNE_KONTAKT` jest w pliku, ale proces
  strony go nie widzi — pułapka 63),
- administratora danych i adresu kontaktowego na `/prywatnosc`
  (strona pokazuje „[do uzupełnienia]”),
- `robots.txt`, sekcji „Czego dotyczy” przy ustawach, indeksu `ted_nabywca`
  (pułapka 67 — to on kładł serwis), poprawionego kontrastu i celów dotykowych.

Po wdrożeniu `sudo jawne stan` sam powie, gdyby coś znowu się rozjechało.

| | Co | Dlaczego blokuje | Stan |
|---|---|---|---|
| 1 | **Adres e-mail do kontaktu** (`JAWNE_KONTAKT`) | Bez drogi zgłoszenia sprzeciwu (art. 21 RODO) nie pokazujemy nazwisk osób fizycznych — próg kwotowy jest wyłączony w kodzie | **jest 02.10.2026**: `kontakt@zrejestru.pl`, zapisany w `/etc/jawne/jawne.env`. **Na żywej stronie jeszcze nie działa** — proces wstał przed zapisem, patrz pułapka 63. Włączy się przy najbliższym `aktualizuj` |
| 2 | **Polityka prywatności** | Wymagana, gdy przetwarzamy dane osobowe (art. 13–14 RODO): kto jest administratorem, po co, na jakiej podstawie, jak długo, jakie prawa | **napisana 23.09.2026**: `/prywatnosc`, odnośnik w stopce. Zostają dwa miejsca do uzupełnienia przez Pawła (administrator + adres, `JAWNE_KONTAKT`) — widoczne na stronie na żółto |
| 3 | **Test równowagi na piśmie** | Podstawą jest uzasadniony interes (art. 6 ust. 1 lit. f). Test trzeba mieć *przed* publikacją, nie po pytaniu z UODO | **napisany 23.09.2026**: [test-rownowagi.md](test-rownowagi.md) — cel, niezbędność, ważenie, dziesięć zabezpieczeń z nazwami plików, co uruchamia ponowny test. Do uzupełnienia: administrator i adres |
| 3a | ~~**Sprawdzić próg z rozporządzenia 651/2014 (GBER)**~~ | Gdyby próg publikacji był wyższy, w paśmie między progami pokazywalibyśmy nazwiska, których prawo publikować nie każe | **sprawdzone 30.09.2026: 100 tys. EUR się zgadza.** EUR-Lex nadal oddaje pustą odpowiedź (HTTP 202, zero bajtów), ale tekst nowelizacji GBER jest na stronie Komisji. Art. 9 ust. 1 lit. c) po zmianie z 2023 r.: publikacja „on each individual aid award exceeding EUR 100 000”, 500 tys. EUR dla produktów InvestEU (sekcja 16), 10 tys. EUR dla rolnictwa pierwotnego i rybołówstwa. Przed tą nowelizacją próg ogólny wynosił 500 tys. EUR — stąd rozbieżność w starszych opracowaniach |
| 4 | **Domena i `JAWNE_ADRES_SERWISU`** | Bez tego podglądy linków wskazują na `localhost` | **zrejestru.pl działa z certyfikatem** (02.10.2026). Zmienna zapisana; proces strony widzi jeszcze stary adres — jak wyżej |
| 5 | **Decyzja o `noindex`** | Zdejmujemy dopiero, gdy 1–4 są gotowe | świadoma decyzja Pawła. Od 03.10 to jedno polecenie (`JAWNE_INDEKSOWANIE`), a nie zmiana w kodzie w dwóch miejscach |
| 5a | **Klucz API GUS BDL** (darmowy, portal api.stat.gov.pl) | **Klucz jest generowany automatycznie po rejestracji** — nie trzeba o niego pisać ani na niego czekać (to dotyczyło klucza BIR). Bez klucza: 100 zapytań na 15 minut i **1 000 na 12 godzin**, czyli mniej niż jeden pełny import budżetów z działami. Z kluczem: 500 i 5 000. Klucz do `.env.local` jako `GUS_BDL_KLUCZ`, na serwerze `sudo jawne ustaw GUS_BDL_KLUCZ` | **klucz jest 01.10.2026** - wpisany w `.env.local`, zweryfikowany na zywym imporcie (etap `dzialy` startuje z naglowkiem "z kluczem"). Na serwerze: `sudo jawne ustaw GUS_BDL_KLUCZ`. Etap sam bierze 5 lat, gdy klucz jest, i 1 rok bez niego |
| 6 | ~~**Obrazki podglądu linku dla stron gmin**~~ | Mamy je dla głosowań i posłów; strona gminy jest teraz najbardziej „udostępnialna” | **zrobione 19.09.2026**: nazwa, powiat, dochody i UE na mieszkańca, każda liczba z mianownikiem |

---

### Zgłoszenia Pawła z 24.09.2026 — zrobione tego samego dnia

| Co zgłosił | Co zrobione |
|---|---|
| `sudo jawne ustaw GUS_BIR_KLUCZ` nie znał tego klucza | dopisany do listy dozwolonych nazw |
| Na mapie **dwie chmurki naraz** | zostaje nasza; systemowy `<title>` usunięty |
| Na telefonie dotknięcie mapy **od razu przenosiło** na stronę gminy | dotknięcie tylko zaznacza, przejście jest przyciskiem w karcie pod mapą; doszło powiększanie i strzałki |
| „14,0 tys. zł dochodu na mieszkańca — nie wiem, co w to wchodzi” | rozwijane wyjaśnienie tuż przy liczbie: dochody własne, subwencja, dotacje, i czego tam nie ma (kredyty) |
| Akapit o awariach API Sejmu na `/stan` — „po co to” | usunięty, został jeden rzeczowy zdanie o harmonogramie |
| Poziomy suwak na `/stan` — „do uwalenia” | tabela zamieniona na karty; strona szersza (`max-w-5xl`), nic nie przewija się w bok |
| „Tylko środkowa część ekranu jest wykorzystana” | `/stan` poszerzone; strony tekstowe (`/o-serwisie`, `/prywatnosc`) zostają wąskie, bo tam wąska kolumna jest zaletą |

### Zgłoszenia Pawła z 29.09.2026 — mapa i sala, zrobione 30.09.2026

| Co zgłosił | Co zrobione |
|---|---|
| „Do mapy może dodać też podział na województwa” | granice z własnej warstwy PRG (A01) rysowane nad gminami; nazwa województwa w chmurce i w karcie |
| „Wybór województwa jak najbardziej na plus” | lista szesnastu nad mapą; wybór przybliża widok do prostokąta obejmującego obrys i przygasza resztę kraju do 22% |
| „Powiaty zamiast gmin na plus” | chipsy **Gminy / Powiaty** (`?poziom=powiaty`), 380 powiatów z warstwy A02; kliknięcie powiatu wraca na poziom gmin przybliżony na niego (`?powiat=3027`) |
| „Kropki są mocno rozjechane” (sala) | współrzędne z **numeru miejsca**, nie z podpisu nazwiskiem — rysownik przesuwa nazwiska w pionie, żeby dłuższe się nie nachodziły |
| „Zdjęcia posła w chmurce” | portret w chmurce i w karcie dotykowej |
| „Na stronie głównej poprawić tę mapę sali, żeby była interaktywna” | półkole zastąpione prawdziwym planem sali (bez drugiego pola szukania — strona główna ma własne) |
| „Głosowania na planie sali — możesz zrobić jakiś pokaz” | `/sala?glosowanie=64-44`: barwy mówią o głosie, nie o klubie; wybór z listy ostatnich głosowań nad całością |

**Powiat to suma, nie średnia.** Wartość powiatu liczymy jako sumę kwot jego
gmin przez sumę ich mieszkańców. Średnia z gmin dałaby gminie z tysiącem
mieszkańców tę samą wagę, co stolicy powiatu ze stoma tysiącami — test
w `mapa.test.ts` pokazuje różnicę: 200 zł ważone wobec 550 zł ze średniej.

**Kontury w dwóch plikach.** `gminy.json` (1 020 kB) i `powiaty.json`
(448 kB); każdy poziom pobiera dokładnie jeden. Dołożenie powiatów do
pliku gmin podniosło go do 1 401 kB i płaciliby za to także ci, którzy
zostają na gminach.

**Głosowanie na planie — co tu jest uczciwe.** Plan jest ze stanu na jeden
dzień (21.09.2026), a głosy sięgają początku kadencji, więc strona pisze
wprost, ile z głosów rejestru widać na planie i ile miejsc należy do posłów,
których w tym głosowaniu nie ma (szara kropka ≠ nieobecność). Głosowanie bez
głosów imiennych **nie maluje sali na szaro** — mówi, że rejestr ich jeszcze
nie podał, i zostaje przy barwach klubów; do wyboru trafiają tylko te, które
głosy imienne mają. Sprawdzone drugą drogą: rozkład kolorów na planie zgadza
się co do jednej kropki z nagłówkiem rejestru (64-44: 417/21/0/22;
64-43: 380/2/53/25).

`/sala` jest przez to **trasą dynamiczną** (czyta `searchParams`). Zmierzone
lokalnie: 84 ms bez głosowania, 90 ms z głosowaniem — sprawdzenie, które
z 24 ostatnich głosowań ma głosy imienne, idzie po kluczu głównym tabeli
`glosy` i kosztuje 0 ms.

### Plan sali posiedzeń — zrobione 24.09.2026

Paweł znalazł rysunek sali wydawany przez Kancelarię Sejmu i poprosił, żeby
miejsca były na stronie: najechanie pokazuje, kto siedzi, kliknięcie prowadzi
na profil. Zrobione:

- `ingest/zrodla/sejm-sala/plan-sali.pdf` — rysunek bajt w bajt, z sumą SHA-256
  i opisem, jak go pobrać (`orka.sejm.gov.pl` stoi za Imperva, patrz pułapka 51),
- `scripts/plan-sali.mjs` — czyta tekst z PDF-a razem ze współrzędnymi
  i generuje `src/lib/plan-sali.ts`; **460 z 460 posłów rozpoznanych**,
  457 z numerem miejsca (przy 3 numer dałby się przypisać do dwóch nazwisk,
  więc jest `null`),
- `/sala` — plan całej izby: szukanie po nazwisku i numerze miejsca,
  podświetlanie klubu z legendy, chmurka pod kursorem, na dotyku karta
  z przyciskiem (ta sama reguła, co na mapie gmin),
- sekcja „Gdzie siedzi w sali" na stronie posła, z numerem miejsca,
- `/stan` mówi, że to jedyne źródło odświeżane **ręcznie**: każde wydanie
  rysunku ma inny adres.

**Sprawdzone drugą drogą:** rozkład klubów policzony z rysunku zgadza się
z rejestrem co do jednego mandatu we wszystkich 12 klubach (suma 460).

**Do zrobienia przy następnym rysunku:** podmienić PDF, poprawić `SHA_ZRODLA`
i `ADRES_ZRODLA` w skrypcie, uruchomić go i sprawdzić, czy nadal wychodzi
460 z 460.

### Przejście na agregaty — ZROBIONE 27.09.2026

`next build` na serwerze przewrócił się: `/`, `/okregi`, `/pomoc-publiczna`
i strony posłów przekroczyły limit 60 s na stronę.

**Zmierzona przyczyna.** `przegladKrajowy()` w `dane.ts` robi **osiem osobnych
przebiegów po całej tabeli `pomoc_publiczna`**: razem, trzy grupowania
(udzielający, przeznaczenia, formy), wielkość firm, województwa i piętnaście
największych. Plan zapytania to `SCAN pomoc_publiczna` — i słusznie, bo filtr
`dzien in (dni ustalone)` obejmuje 97% wierszy, więc indeks nic by nie dał.

| wierszy | jeden przebieg | cała strona |
|---|---|---|
| 168 tys. (komputer) | 1,6 s | ~13 s |
| **2,5 mln (serwer dziś)** | **~24 s** | **ponad 3 min** |
| ~30 mln (pełna historia) | ~5 min | ~40 min |

**Zrobione.** SQL przeniesiony do `src/lib/przeglad.ts` — wspólny dla importu
i dla strony, żeby dwie kopie tych samych zapytań się nie rozjechały. Wynik
ląduje w tabeli `agregaty` razem z podpisem zbioru dni i datą policzenia.

| | przed | po |
|---|---|---|
| przegląd krajowy | 1 338 ms | **0 ms** |
| mapa pomocy (`/mapa`, trasa dynamiczna) | 535 ms | **3 ms** |

Zmierzone lokalnie na 168 tys. wierszy; na serwerze przegląd zajmował ponad
trzy minuty. Liczby identyczne co do grosza (mapa: 2 439 gmin, zero rozjazdów).

Przeliczenie wchodzi tam, gdzie dane się zmieniają: etap `npm run import
agregaty`, koniec każdego przebiegu SUDOP i migracje tuż przed `next build`.
Gdy agregatu nie ma — albo nie ma całej tabeli, bo baza jest starsza —
strona liczy na miejscu zamiast pokazać pusto (sprawdzone z ukrytą tabelą).
Strona pisze, kiedy zestawienie policzono, i mówi, gdy od tego czasu doszły
nowe dni.

`staticPageGenerationTimeout` zostaje na 300 s jako zabezpieczenie, ale nie
jest już tym, co trzyma build przy życiu.

**Zostaje do obserwacji:** sumy na stronie głównej i `/gmina/[teryt]` liczą
się z indeksu po `teryt`, więc na razie są tanie. Gdy baza urośnie do pełnej
historii, sprawdzić je tą samą metodą (`explain query plan` + pomiar).

### Agregaty przyrostowe — ZROBIONE 30.09.2026

**Zmierzone 29.09.2026 na serwerze.** Pełne przeliczenie agregatów przy
3,78 mln wierszy zajęło **29 minut** (16:49 → 17:18: mapa, potem lista firm,
potem przegląd krajowy). Poprzedni pomiar przy 2,5 mln to było 676 sekund,
czyli skaluje się gorzej niż liniowo — maszyna ma 2 GB i baza przestaje się
mieścić w pamięci podręcznej.

To liczy się **na końcu każdego przebiegu SUDOP**, a historia kończy przebieg
mniej więcej raz na dobę. Dziś to akceptowalne. Przy pełnej historii
(~30 mln wierszy, czyli 8× więcej) będzie to **kilka godzin na przeliczenie**
— na maszynie z jednym rdzeniem, który w tym czasie obsługuje też stronę.

**Zrobione 30.09.2026** — `ingest/lib/sumy-pomocy.ts`. Stan zbiera się dzień
po dniu w pięciu tabelach (`pomoc_sumy_dni`, `_gmin`, `_firm`, `_wymiar`,
`_naj`), a przegląd, mapa i lista firm czytają gotowe sumy.

Całość stoi na jednym zdaniu: **dzień ustalony już się nie zmienia**, więc do
stanu tylko się dopisuje i nigdy nie odejmuje. Odejmowanie byłoby pułapką —
jeden przerwany zapis i suma rozjeżdża się ze źródłem po cichu. Czego stan nie
obejmuje (dni jeszcze nieustalone i 10-letnia historia gmin pokazowych),
liczymy na żywo: oba zbiory są **stałe**, nie rosną razem z historią.

Zmierzone lokalnie (168 tys. wierszy, 16 dni ustalonych, 2 628 dni pokazowych):

| | dawniej | teraz |
|---|---|---|
| pełny przebieg agregatów | 2 070 ms | 898 ms |
| kolejny przebieg bez nowych dni | 2 070 ms | 652 ms |
| z tego sama „żywa reszta” | — | 559 ms (stała) |
| `select distinct dzien` | brak indeksu | 7 ms (indeks pokrywający) |

Na serwerze liczy się to, co rośnie: dawniej **cała** tabela przy każdym
przebiegu (29 min przy 3,78 mln), teraz tylko nowe dni — jeden dzień to
ok. 6 tys. wierszy.

**Kontrola drugą drogą:** `npx tsx ingest/jobs/migracje.ts --sprawdz` liczy
to samo SQL-em po całej tabeli i porównuje pole po polu — przegląd,
2 439 gmin mapy i 93 489 sum na NIP (z nazwami, bo od nazwy zależy reguła
jawności). Na prawdziwej bazie **zero rozjazdów**. To samo porównanie robi
`ingest/lib/sumy-pomocy.test.ts` na danych syntetycznych, razem z dniem
pobranym po raz drugi i z kwotą `null`.

**Przy okazji sprostowanie:** „ponad 300 sekund na regule jawności" z pułapki
55 było zgadywaniem. Zmierzone na 93 489 prawdziwych nazwach: **1,2 µs na
nazwę**, czyli ok. 0,3 s na cały kraj. Cały koszt leżał w `group by` po
tabeli pomocy.

Trudny kawałek: `count(distinct nip_beneficjenta)` i lista największych
beneficjentów nie sumują się po dniach. Dla nich trzeba albo osobnej tabeli
per NIP (aktualizowanej przyrostowo), albo przeliczenia rzadziej niż raz
na dobę — do rozstrzygnięcia pomiarem, nie z góry.

## Przegląd w chmurze 30.09/01.10.2026 — co z niego wyszło

Paweł kupił cztery równoległe przeglądy (brief: [brief-kierunki.md](brief-kierunki.md)).
Wróciły wszystkie. Najcenniejszy okazał się ten, którego nie było w planie:
**dwa pierwsze przeglądy, szukając czego innego, znalazły po drodze ciche błędy
w liczbach** — więc piąty dostał zadanie wyłącznie takie i znalazł ich dwanaście.

### Ciche błędy w liczbach — zweryfikowane na bazie

Kolejność po tym, **ilu czytelników widzi złą liczbę**.

| | Co | Skala | Stan |
|---|---|---|---|
| B1 | **Kraków, Łódź, Wrocław i Poznań nie mają ani jednego zamówienia.** REGON podaje gminę jako „Kraków-Podgórze", `terytZNazw()` tego nie zna, `teryt` zostaje `null`, a sekcja na stronie gminy w ogóle się nie renderuje — bez słowa wyjaśnienia. To **pułapka 31 naprawiona w SUDOP, a nie w REGON** | 12 957 z 78 566 wpisów REGON bez TERYT-u, z tego 5 534 to „Miasto-Dzielnica"; ok. 10 100 ogłoszeń przepada | **zrobione 01.10** |
| B2 | **Mapa i strona gminy liczą pomoc z innych zbiorów.** Mapa bierze wszystkie 22 pobrane dni, strona gminy tylko 16 ustalonych. Czytelnik klika gminę z mapy i dostaje mniej | **1 604 z 2 439 gmin**, do 81 razy; Gdańsk 21,26 zł wobec 18,90 zł | **zrobione 01.10** — decyzja Pawła: mapa liczy z dni USTALONYCH, tak jak strona gminy. Zmierzone po poprawce: 22 dni → 16, 2 439 gmin → 2 429, **1 609 gmin zmienia wartość**, największy rozjazd 81,5× (gmina 321409: 13,89 zł → 0,17 zł), Gdańsk 21,26 → 18,90 zł, mediana mapy 6,26 → 5,28 zł |
| B3 | **Mapa strony nie zawiera ani jednej strony głosowania.** `sitemap.ts` stawia firmy przed głosowaniami i docina całość tym samym limitem 50 000, którym ograniczona jest sama lista firm | 45 247 stron firm, **0 stron głosowań** z 4 641 | **zrobione 01.10** - po poprawce 4 616 glosowan w mapie |
| B4 | `ted_ogloszenia.nabywca_id` zapisywane surowo („NIP 9570730409", „954-22-69-625"), a złączenie z REGON idzie wprost. To pułapka 45 po stronie zamawiającego | 57 679 do **86 399** ogłoszeń przypisanych do gmin | **zrobione 01.10** |
| B5 | **Decyzja z 24.09 („rozstrzyga REGON") działa na dwóch stronach z sześciu.** `typRegon` nie trafia do strony gminy, `/pomoc-publiczna`, eksportu CSV ani do agregatu `mapa-firmy` | **48 nazw** pokazywanych na stronach gmin, choć własna reguła je chowa; 57 adresów w mapie strony oddaje 404 | **zrobione 01.10** - zostaje 11, patrz nizej |
| B6 | `/firma/[nip]` miesza pod jedną etykietą dziesięć lat (gminy pokazowe) i 22 dni (reszta kraju). Strona gminy ma na to dwa ostrzeżenia, strona firmy — żadnego | 8 598 firm widocznych, o których ich własna gmina nie wie | **zrobione 01.10** — było gorzej, niż opisano: pod zakresem dat stało **„rejestr obejmuje ostatnie dziesięć lat"**, co dla firmy spoza gminy pokazowej jest wprost nieprawdą. Teraz strona podaje trzy rozłączne liczby sumujące się do całości (z pełnej historii gminy / z dni ustalonych / z dni świeżych) i zakres dni kraju. Zmierzone: **10 254 firm** ma dane z pełnej historii gmin, reszta z 16 dni (19.08–06.09.2026) |
| B7 | „2 494 gminy" na stronie głównej, w `/gminy` i na 16 stronach województw. Polska ma **2 477** — 18 dzielnic Warszawy liczy się jako 18 gmin | 18 stron i strona główna | **zrobione 01.10** |
| B8 | `/mapa?miara=unia`: 133 gminy pokazane jako „brak danych", choć to **zmierzone zero**. Przez wypadnięcie z kwantyli **cała skala legendy jest o 28 procent za wysoko** | 133 gminy źle pokolorowane, legenda zła dla 2 477 | **zrobione 01.10** - dolny prog 359,78 zl na 284,78 zl |
| B9 | Mediana SMUP w mazowieckiem liczona **bez Warszawy** — „mediana w województwie (313 gmin)" zamiast 314 | 331 stron | **zrobione 01.10** |
| B10 | Interpelacje: licznik z kadencji posła, mianownik z całej kadencji | 39 posłów z wygasłym mandatem | **zrobione 01.10** - mianownik z OKNA MANDATU, wziety z rejestru (`min(obecnosc.dzien)` i `data_wygasniecia`), wiec obejmuje takze poslow, ktorzy doszli w trakcie kadencji. Zmierzone: **78 z 499 poslow** mialo za szeroki mianownik, z tego **59 z niezerowym licznikiem**. Najgorzej Grzegorz Rusiecki: 21 z 2 534 zamiast 21 z 20 145 - udzial zanizony **osmiokrotnie** (0,10% wobec 0,83%). Najwezsze okno: 23 dni, mianownik 209 zamiast 20 145 |
| B11 | `/firma`: mianownik „z N ogłoszeń" większy niż zbiór, z którego policzono sumę | 12 i 286 stron | **zrobione 01.10** - `ogloszenWSumie` liczy dokladnie zbior zsumowany. Zmierzone po naprawie B1/B4: **295 firm**, razem 497 ogloszen liczonych w mianowniku, a wylaczonych z sumy |
| B12 | `/gmina`: ten sam mechanizm co B11 | 7 gmin, 9 ogłoszeń | **zrobione 01.10** - `wSumie` zamiast `ogloszen - bezKwoty`, bo to drugie wciaz obejmowalo kwoty odrzucone jako bledne. Teraz **11 gmin**, nie 7: naprawa B1/B4 dolaczyla do gmin znacznie wiecej ogloszen, wiec powiekszyla tez powierzchnie tego bledu |

**Reszta po B5 — 11 nazw z 93 287, i to juz inna przyczyna.** Strona firmy
bierze nazwe z **najnowszego** przypadku (`order by dzien desc, id desc`, i jest
to swiadoma decyzja — stare dane bywaja nieaktualne), a lista do mapy strony
sklada ja przez `max()`. Dla 11 NIP-ow te dwie nazwy sie roznia, wiec regula
jawnosci rozstrzyga je inaczej. Naprawienie tego wymagaloby przebiegu po calej
tabeli pomocy z funkcja okna — czyli dokladnie tego, od czego uciekalismy
przy sumach przyrostowych. Zapisane jako znana, zmierzona i ograniczona niespojnosc.

**Najważniejsze zdanie całego przeglądu:** cztery z siedmiu najpoważniejszych
znalezisk to nie błąd rachunku, tylko **dwie strony liczące to samo z dwóch
różnych zbiorów**. Stąd jeden test, który złapałby sześć z nich naraz:
dla próbki bytów wyrenderuj każdą liczbę razem z mianownikiem i zakresem czasu
i wymagaj, żeby ta sama wielkość pokazana na dwóch stronach miała identyczny
mianownik i identyczny zakres. To pilnuje klasy błędów, a nie przypadków.

**Co przegląd sprawdził i jest czyste** (żeby następny tam nie wracał):
`ted_wykonawcy.nip` jest znormalizowany; `pomoc_publiczna.teryt` ma pułapkę 31
naprawioną (3 300 wierszy z kodem delegatury trafia do gminy macierzystej);
146501 to **jedyny** brakujący TERYT w całej bazie i wszystkie jego konsumenty
poza B7 i B9 obsługują to świadomie; pułapka 30 czysta wszędzie; Interreg w euro
dziś nie wpływa na żadną gminę; wszystkie `?? 0` poza B8 są zmierzonym zerem
albo licznikiem; sumy `glosy_klubow` zgadzają się z nagłówkiem rejestru
w **0 rozjazdach na 4 641 głosowaniach**.

### Kierunki po przeglądzie

- **Poglądy posłów.** Pomiar, który zmienia postać zadania: w przekroju „zdrowie"
  jest 313 różnych wzorców głosowania wśród 499 posłów, ale **tylko 32 wśród 161
  obecnych przy wszystkich** — największy blok to 99 osób głosujących identycznie.
  Siatka „poseł razy sprawa" pokazuje więc przede wszystkim, **kto był na sali**.
  Klucz do pogrupowania głosowań istnieje w rejestrze: komisja, do której
  Marszałek skierował druk (669 z 698 głosowań nad całością) — klasyfikacja cudza
  i sprawdzalna, więc nie łamie reguły 6. Rekomendacja: zacząć od „kto był za tą
  ustawą" na stronie ustawy (1–2 dni, zero nowych źródeł).
  Wniosek z przeglądu konkurencji: **każdy serwis, który zaczął grupować głosy
  w „stanowiska", skończył z rankingiem.** Te, które nie skończyły
  (HowTheyVote.eu), po prostu nie agregują wcale.
- **Majątki — odpowiedź brzmi nie.** Zmierzone: **17 z 17 oświadczeń to czyste
  skany** JBIG2, 1 bit, 300 dpi, zero operatorów tekstu. Nie ma podzbioru
  tekstowego, na który liczyliśmy. Stabilny indeks `osw9.nsf/web/<id>` działa dla
  IX kadencji i **404-uje dla X** — maszynowo nie da się pobrać nawet samej listy.
  Pełna baza to ~660 h raz i ~166 h co roku, a JBIG2 w trybie stratnym potrafi
  po cichu podmienić cyfrę, czego podwójny odczyt nie wykryje. Jedyne, co ma sens:
  **indeks bez ani jednej kwoty** — i nawet to jest zablokowane, dopóki nie da się
  pobrać panelu XPages ze strony posła.
- **Połączenia danych.** Najciekawsza propozycja: „ile twoja gmina sama
  odpuściła" — pomoc udzielona **przez organ gminy** (ulgi, umorzenia, raty).
  Zmierzone: 208 organów gminnych, 54,6 mln zł z 22 dni. Tego nie pokazuje nikt.
  Wymaga dołożenia `nip_udzielajacego` do etapu `regon` (~35 wywołań BIR).
- **Krytyka.** Werdykt: „to nie jest serwis obywatelski, to bardzo dobrze
  zbudowana hurtownia danych z warstwą prezentacji, która konsekwentnie odmawia
  powiedzenia czytelnikowi, co znaczy liczba". Sprawdzone osobno i potwierdzone:
  **istnieje z-dykty.pl**, prowadzony przez jedną osobę, z 2 479 gminami,
  budżetami, długiem, przetargami, mapą, głosowaniami, posłami, partiami,
  Senatem, europosłami **i oświadczeniami majątkowymi** — zaindeksowany w Google.
  Czyli dwa filary pierwotnego zamysłu konkurencja ma od dawna, a my mamy
  `noindex` z powodu braku adresu e-mail i domeny.
  Trzy rzeczy do przestania: pobieranie historii SUDOP do czasu wysłania
  sprostowania; budowanie `/firma/[nip]` w obecnej skali; planowanie autopilota.
  Jedna do zaczęcia: **zdjąć `noindex` w tym tygodniu** — cztery zadania na
  łącznie sześć godzin, z których najdłuższe jest wpisaniem adresu e-mail.

**Cichy brak znaleziony przy okazji 01.10.2026: dział 926 „Kultura fizyczna
i sport" nie ma ani jednego wiersza w żadnym roku.** `DZIALY_BUDZETU` ma
15 pozycji, w bazie jest 14 — 34 678 wierszy to dokładnie 14 × 2 477. Zmienna
BDL 202304 oddaje **0 gmin**, i to powtarzalnie: tak samo w 2024 i w 2023,
podczas gdy czternaście pozostałych zmiennych w tych samych przebiegach oddaje
po 2 477. Awaria przejściowa nie trafiałaby dwa razy w tę samą zmienną,
omijając czternaście innych — więc identyfikator jest zły albo ta zmienna nie
jest publikowana na poziomie gminy.

Dlaczego nikt tego nie zauważył: sprawdzane było tylko „ogolem", a kontrola
druga drogą porównuje **sumę** wydatków z `budzety_gmin` — która z podziałem
na działy nie ma nic wspólnego. Przy brakującym dziale pokazywała 0,00%
różnicy. Strona po prostu nie wypisuje działu, którego nie ma w tabeli, więc
czytelnik widzi trzynaście kategorii i nie ma jak się dowiedzieć, że czternasta
istnieje. **Naprawione w kodzie:** każdy dział bez kompletu gmin jest teraz
raportowany (`<-- UWAGA` przy wierszu i osobne ostrzeżenie na koniec roku),
a log roku podaje „N z 15 działów". **Zostaje:** znaleźć właściwy identyfikator
zmiennej — 01.10 nie dało się, bo BDL oddawał trzy różne błędy 500
(„baza bdl_i73 jest w trakcie przywracania", „serwer bdlap73 nie jest w stanie
uzyskać dostępu do bazy", „Value cannot be null (Parameter 'source')").

---

## Usterki — zgłoszone, niepilne

| | Co | Zgłoszone |
|---|---|---|
| U1 | ~~**Na telefonie stronę da się przesunąć w bok**~~ **naprawione 22.09.2026** (pomiar w ramce 390 px: wszystkie 14 tras mieszczą się teraz w 390/390). Pierwotny opis: **na telefonie stronę da się przesunąć w bok** — coś jest szersze niż ekran, przez co treść wygląda na uciętą. Szukać przez ramkę `<iframe style="width:390px">` (pułapka 17 w `CLAUDE.md`), sprawdzić szerokie tabele, `min-width` i długie liczby | Paweł, 20.09.2026 — „raczej na koniec listy” |
| U2 | **Częściowo naprawione 22.09.2026**: w menu jest „Gminy” zamiast „Okręgi”, ta strona zaczyna się od „Znajdź swoją gminę” z wyszukiwarką, a w nagłówku jest lupa (od `sm` w górę). **22.09.2026 doszedł spis gmin** (`/gminy`, `/gminy/[wojewodztwo]`) i menu z grupami (panel na telefonie), więc do gminy da się dojść klikaniem. **Zostaje:** **droga do firmy — wyszukiwarka nie zna firm ani po nazwie, ani po NIP**. Pierwotny opis: **do gminy i firmy dochodzi się tylko wyszukiwarką albo z innej strony.** W nawigacji są cztery pozycje (Okręgi, Posłowie, Głosowania, Pomoc publiczna); spisu gmin nie ma nigdzie. Wyszukiwarka na stronie głównej działa, ale czytelnik musi wiedzieć, że ma czegoś szukać | Paweł, 20.09.2026 |
| U3 | **`/szukaj` na zimno schodzi 19 sekund.** Zmierzone na serwerze 30.09.2026 przez `sudo jawne sprawdz`, pierwsze wejście po restarcie: `/szukaj?q=gmina` **18,98 s**, przy `/gmina/100101` 5,57 s i stronach statycznych poniżej 0,05 s. Drugi przebieg chwilę później: **0,44 s** i 0,72 s. Czyli koszt jest jednorazowy — zimny proces i zimna pamięć podręczna dysku po podmianie wersji — ale trafia w pierwszego czytelnika po każdym wdrożeniu. Podejrzenie pada na indeks pełnotekstowy firm (`firmy_szukaj`, 93 tys. wierszy lokalnie, na serwerze dużo więcej) i na to, że pierwsze zapytanie FTS wczytuje z dysku cały jego początek. **Do sprawdzenia:** `explain query plan` na zapytaniu z `szukajFirm`, pomiar z zimnym i ciepłym cache'em, i czy pomaga rozgrzanie jednym zapytaniem tuż po starcie serwisu. Dopiero potem decyzja, czy to w ogóle warto naprawiać | Paweł, 30.09.2026 — „trzeba będzie to sprawdzić” |

| U4 | **Dwoch gmin nie ma w serwisie w ogole: `120713` i `200216`.** Zmierzone 01.10.2026, BEZ ani jednego zapytania do sieci - kontury PRG lezą u nas na dysku. Zmienne BDL oddaja za 2025 r. po **2 479** jednostek, PRG ma **2 479** kodow TERYT, a nasz wykaz (z PKW 2023) - **2 477**. Roznica to dokladnie te dwa kody i **nie ma ich w tabeli `gminy` w ogole**, nie chodzi wiec o rodzaj jednostki ani o Warszawe. Skoro sa w PRG i w BDL, a nie ma ich w PKW, to powstaly po wyborach 2023 (12-07-13: powiat krakowski, 20-02-16: powiat bialostocki). **Skutek:** na mapie sa rysowane jako szare plamy bez nazwy, nie maja strony, nie ma ich w spisie gmin i nie licza sie do „2 477 gmin". Mapa NIE prowadzi w 404 - `MapaGmin.tsx:365` klika tylko to, co jest w `wg`, czyli ma dane z bazy. Etap `dzialy` odrzuca ich wiersze bez slowa (`if (!oczekiwane.has(teryt)) continue`). **Do zrobienia:** ustalic nazwy (jedno zapytanie do GUS albo do rejestru TERYT - PRG daje tylko geometrie), potem zdecydowac, czy wykaz gmin ma nadal pochodzic z PKW, czy z rejestru TERYT. PKW jest zamrozony na dniu wyborow i bedzie sie rozjezdzal dalej z kazda zmiana administracyjna **USTALONE 01.10.2026:** to `120713` **Szczawa** (powiat limanowski) i `200216` **Grabowka** (powiat bialostocki) - gminy utworzone po tym, jak powstal nasz wykaz z PKW. Nazwy z wykazu jednostek GUS BDL. **WAZNE, bo zmienia plan: BDL NIE NADAJE SIE na zrodlo wykazu gmin.** Zmierzone: rodzaje 1-3 daja 2 705 wpisow, ale tylko **2 535 roznych TERYT** - 170 kodow wystepuje dwukrotnie, bo gmina, ktora zmienila rodzaj, zostaje w wykazie takze pod starym (np. Swiatniki Gorne jako rodzaj 2 i 3). To ten sam mechanizm, co przy wycofanej zmiennej z pulapki 59: GUS nie usuwa, tylko doklada. Wziecie BDL jako wykazu dodaloby **56 gmin, ktore nie istnieja**. PRG podaje 2 479 i zgadza sie ze stanem biezacym. **Wiec zrodlem wykazu ma byc rejestr TERYT (plik TERC), ktory ma daty obowiazywania** - nie BDL i nie PKW. PKW zostaje tam, gdzie jest na miejscu: przypisanie gmin do okregow wyborczych | sam, 01.10.2026 |

### Z przeglądu nawigacji (22.09.2026) — zostało

1. ~~**Menu na telefonie.**~~ **zrobione 22.09.2026**: `src/components/Nawigacja.tsx`.
   Na telefonie panel pod przyciskiem (lupa i motyw zostają w pasku),
   na szerokim ekranie „Gminy”, „Sejm ▾”, „Pieniądze ▾” z krótkim opisem
   przy każdej pozycji. Rozwijane na `<details>`, więc **działa bez
   JavaScriptu**; JS dokłada tylko zamykanie — zmierzone w przeglądarce:
   klik obok = zamyka, Escape = zamyka, przejście na inną stronę = zamyka.
   Pomiar 390 px z otwartym panelem: 375/375, zero przepełnień.
2. ~~**Firmy w wyszukiwarce — po NIP.**~~ **zrobione 23.09.2026**: tabela
   `firmy_szukaj` (etap `wyliczenia`), `szukajFirm()` w `dane.ts`, sekcja
   „Firmy” na `/szukaj` i w podpowiedziach. Szukanie po nazwie też działa,
   ale **wyłącznie wśród nazw, które wolno pokazać** — i to samo przy szukaniu
   po dokładnym NIP-ie, bo `/firma/[nip]` dla możliwej osoby fizycznej oddaje
   404 (sprawdzone na żywej stronie: bez tego wyszukiwarka prowadziła w martwy
   link i podawała nazwisko, którego strona nie pokazuje).
3. ~~**Opis serwisu obiecuje „co się stało z ustawą”**, czego nie ma~~
   **zrobione 23.09.2026**: `/ustawy` i `/ustawa/[numer]` — 1 692 procesy
   kadencji, 16 136 etapów, droga od wpłynięcia do podpisu Prezydenta,
   z odnośnikiem do imiennego głosowania (903 etapy trafiają w naszą tabelę
   głosowań) i do druków PDF. Obietnica z opisu serwisu jest już prawdziwa.
4. ~~**`/o-serwisie` mówi, że pomoc publiczna jest „na razie dla kilku gmin”**~~
   **poprawione 23.09.2026**.
5. ~~**Kontakt i polityka prywatności w stopce**~~ **zrobione 23.09.2026** —
   stopka ma „Polityka prywatności” i „Kontakt”; dopóki nie ma
   `JAWNE_KONTAKT`, „Kontakt” prowadzi do sekcji polityki, która mówi wprost,
   że adresu jeszcze nie ma.
6. ~~**Spis gmin** (`/gminy`) jako cel dla pozycji „Gminy”~~ — **zrobione
   22.09.2026**: `/gminy` (16 województw z liczbą gmin i mieszkańców)
   i `/gminy/[wojewodztwo]` (gminy po powiatach, liczba mieszkańców z GUS
   2025, kolumny CSS zamiast siatki — powiaty mają od 3 do 18 gmin).
   Pozycja „Gminy” w menu, karta na stronie głównej i okruszek „woj. …”
   na stronie gminy prowadzą tam zamiast do listy okręgów; `/okregi`
   wróciło do nagłówka „Okręgi wyborcze” i ma odnośnik do spisu.

---

## Kolejne kroki — uzgodnione 18.09.2026

1. **Dokończyć pieniądze w gminie.**
   - ~~budżety za kilka lat wstecz~~ — **zrobione 19.09.2026**: import `--lata=N`
     ze wznawianiem, na stronie gminy „rok po roku” (dochody i wydatki majątkowe,
     dwa osobne wykresy, kwoty nominalne z adnotacją o inflacji),
   - na co gmina wydaje (oświata, drogi, pomoc społeczna) — GUS BDL ma to
     w podziale na działy (temat P2920 i osobne tematy P2635–P2644), więc
     nie trzeba plików Ministerstwa Finansów. **Stan na 23.09.2026: etapu
     nie ma w kodzie** — `ETAPY` w `import.ts` to `kluby, poslowie,
     glosowania, glosy, zdjecia, okregi, ludnosc, budzety, smup, fundusze,
     wyliczenia`, a zadanie `gus` na serwerze uruchamia `ludnosc budzety
     smup wyliczenia`. Wcześniejszy zapis „wstrzymane przez limit GUS"
     mylił: nic nie czeka samo z siebie, trzeba to napisać. Koszt: ok. 480
     zapytań, czyli bez klucza (100 na 15 min) ok. 1,5–2 h, z kluczem
     (500 na 15 min) ok. 15 minut,
   - udziały gmin w PIT i CIT (zbiory 3313, 1878).
   - ~~**SMUP — import danych**~~ **zrobione 22.09.2026**: `npm run import smup`,
     364 119 wartości dla 2 477 gmin (15 miar × 10 lat), sprawdzone drugą drogą
     wobec budżetów BDL — średnia różnica 0,25 pkt proc. **Sekcja „Finanse
     i podatki — jak gminie idzie” na stronie gminy: zrobiona 22.09.2026**
     (15 miar w dwóch grupach, każda z własnym rokiem i medianą w województwie).
   - **SMUP — klucz API jest od 21.09.2026, źródło zmierzone**
     ([`zrodla.md`](zrodla.md)): 1 285 wskaźników w 10 obszarach, rocznie
     od 2010, w podziale na gminy, z flagą odróżniającą zero od braku danych.
     Obszary „Podatki i opłaty lokalne” oraz „Finanse JST” mówią o tym, czego
     nie widać w budżecie: ile gmina umarza, ile traci na ulgach, jak ściąga
     podatki. Do wyboru 20–30 wskaźników i import ok. 300 zapytań.
2. ~~**Krajowy przegląd pomocy publicznej.**~~ **Zrobione 19.09.2026** —
   `/pomoc-publiczna`: kto udziela, na co, w jakiej formie, jakim firmom,
   województwa na mieszkańca, największe przypadki. Liczone WYŁĄCZNIE z dni
   pobranych dla całego kraju (historia gmin pokazowych nie jest wmieszana).
   Pierwszy wniosek z danych: mikroprzedsiębiorstwa to 86 % przypadków, ale
   27 % pieniędzy; duże firmy — 2 % przypadków i 42 % pieniędzy.
3. ~~**Dane do pobrania przez czytelnika**~~ **Zrobione 19.09.2026** —
   `/gmina/{teryt}/csv/{budzet|fundusze|pomoc}`. Format pod polskiego Excela
   (średnik, przecinek dziesiętny, UTF-8 z BOM). Te same zakresy i ta sama
   reguła nazw co strona; NIP tylko razem z jawną nazwą.
4. ~~**Proces legislacyjny**~~ **zrobione 23.09.2026** (było w „pomysłach”):
   etap importu `procesy`, tabele `procesy` i `etapy_procesow`, strony
   `/ustawy` (filtr: uchwalone / w toku / odrzucone i wycofane, stronicowanie
   jawne) i `/ustawa/[numer]` (oś czasu etapów słowami rejestru). Zadanie
   `sejm` na serwerze odświeża to codziennie.

5. **Pełniejsza strona firmy.** Dziś pomoc publiczna z SUDOP. Dołożyć:
   - ~~zamówienia publiczne z TED~~ **zrobione 23.09.2026**: etap importu
     `zamowienia` (miesiąc po miesiącu, bo okno wyników TED to 15 tys.),
     tabele `ted_ogloszenia` i `ted_wykonawcy`, sekcja „Zamówienia publiczne”
     na stronie firmy. Kwota pokazywana z zastrzeżeniem: sumujemy wyłącznie
     ogłoszenia z jednym wykonawcą, bo `total-value` dotyczy całego
     ogłoszenia. **Zostaje**: zamówienia w gminie (po zamawiającym — trzeba
     powiązać NIP nabywcy z gminą) i zejście do poziomu części,
   - identyfikatory z GLEIF (43 030 polskich podmiotów, pole `registeredAs` to KRS),
   - projekty unijne dopasowane po nazwie (listy FE nie mają NIP-u — dopasowanie
     po nazwie musi mieć próg pewności i być oznaczone jako niepewne).

---

## Serwer testowy na AWS — plan z 19.09.2026

Paweł ma okres próbny AWS: 6 miesięcy i 200 USD kredytu. Cele: pobieranie
danych bez komputera Pawła i bez limitu czasu GitHub Actions (nocny przebieg
z 19.09 trwał 1 h 50 min przy limicie 150 min), oraz strona testowa pod
adresem, który można komuś pokazać.

**Decyzje**
- Jedna maszyna EC2 na ARM (np. `t4g.small`: 2 vCPU, 2 GB RAM) w regionie
  `eu-central-1` (Frankfurt) i dysk gp3 ok. 60 GB. ~~Rząd wielkości 15–20 USD~~
  **ok. 23–24 USD miesięcznie** (poprawka 19.09: szacunek pomijał opłatę
  za publiczny IPv4, ok. 3,7 USD) — przed założeniem sprawdzić w kalkulatorze AWS.
- Na serwerze: Node 24, repozytorium z GitHuba, `dane/` na dysku maszyny,
  `next build && next start` za Caddy (HTTPS sam, gdy będzie domena).
- Build produkcyjny sam włącza filtr nazwisk; `noindex` zostaje.
- Harmonogram przez systemd timers:
  - SUDOP dzienny: świeży dzień + dzień sprzed 14 dni,
  - **SUDOP historia: tylko w nocy, jedno zapytanie naraz, 20–30 zapytań
    na noc** — ok. 2 tys. zapytań w 2–3 miesiące. Serwer nie zmniejsza
    obciążenia urzędu; zmniejsza je tylko tempo. Sprostowanie do UOKiK
    prosi właśnie o wskazanie dopuszczalnego tempa. **Decyzja Pawła
    z 19.09.2026: od pierwszej nocy serwera**, 25 zapytań, okno 01:00–06:00;
    **21.09: 50 zapytań; 22.09: 150 zapytań w oknie 22:00–07:00** — szacunek ze
    zmierzonego rozkładu lat to ok. 2 900 zapytań do pełnych 10 lat (20–30 nocy).
    **Noc 22/23.09 nie dała nic**: zapytanie zarejestrowane o 22:20 czekało
    w kolejce 59 minut, a w 60. urząd oddał `404` — rekord kolejki żyje równo
    godzinę. Poprawione: horyzont 55 minut (kończymy przed wygaśnięciem)
    i błąd jednego zakresu nie kończy nocy. **Do decyzji Pawła: czy przesunąć
    start historii z 22:20 na później** — oba pomiary szybkiej kolejki
    (1–3 min) pochodzą z godzin 01:00–04:00,
  - **strona testowa otwarta dla każdego, kto zna adres** (decyzja Pawła
    z 19.09.2026); `noindex` zostaje, nazwy osób fizycznych ukryte do czasu
    `JAWNE_KONTAKT`,
  - Sejm codziennie, listy UE i GUS co miesiąc.
- GitHub Actions wyłączyć po uruchomieniu serwera — inaczej pytamy urząd
  dwa razy o to samo.
- Bezpieczeństwo: klucz SSH, port 22 tylko z IP Pawła, 80/443 publicznie,
  automatyczne aktualizacje, sekrety w pliku na serwerze, nie w repozytorium.

### Plan działania

**Faza 0 — Paweł, ok. godziny**
- ~~konto AWS~~ **jest (19.09)**; **alarm budżetowy (10 i 50 USD) — jeszcze
  nie**, to krok 1 w [`serwer.md`](serwer.md),
- klucz API GUS — jeszcze nie (`sudo jawne ustaw GUS_BDL_KLUCZ` na serwerze),
- sprostowanie do UOKiK (`docs/uokik-sprostowanie.md`) — stan niepotwierdzony
  w sesji 19.09.

**Faza 1 — sesja z Pawłem: serwer i dane.** Prompt: [`start-sesji.md`](start-sesji.md).
- ~~`docs/serwer.md` z gotowymi poleceniami, skrypt instalacyjny, jednostki
  systemd dla danych, strona testowa za Caddy.~~ **Przygotowane 19.09.2026:**
  [`serwer.md`](serwer.md) (kroki 0–9), `deploy/instaluj.sh`, `deploy/zadanie.sh`,
  5 timerów + strona w `deploy/systemd/`, `sudo jawne stan|plan|logi|uruchom|
  sprawdz|aktualizuj|wgraj|ustaw`, `npm run paczka-na-serwer`.
  W kodzie: tryby `sudop.ts --dzienny` i `--historia` (plan nocy w
  `ingest/lib/harmonogram.ts`, limit 1–30 i okno godzin pilnowane w kodzie),
  kontrola stron z różnych chwil, strony odświeżane co godzinę (ISR).
- Sprawdzone w kontenerze Ubuntu 24.04 z systemd, bez zapytań do urzędów
  (lista w `serwer.md`, ostatnia sekcja). Fałszywy serwer SUDOP: strona 1
  z dysku (62 177) wobec nowych (62 500) → rozjazd wykryty, strona 1 pobrana
  ponownie, strona 2 wzięta z dysku; limit 4 zatrzymał przebieg z czterema
  stronami na dysku; drugi przebieg (limit 3) wziął s1–s4 z dysku, dopytał
  o s5–s7 i zapisał 62 500 przypadków — dokładnie liczbę wyników, bez
  duplikatów — a na następnym zakresie stanął na limicie przed zapytaniem.
- **Serwer stoi od 20.09.2026:** `t4g.small` (ARM), Ubuntu 24.04,
  `eu-central-1`, strona pod `https://52-29-50-167.sslip.io` z certyfikatem
  Let's Encrypt. Budowa 512 stron w 51 s, `jawne sprawdz` 12 × OK, pięć
  timerów włączonych. Pierwsza noc z pobieraniem: **21.09.2026**.
  (Pierwsza maszyna powstała omyłkowo w `us-east-1` i została skasowana —
  dane osobowe z SUDOP nie zostają poza EOG.)
- **Pierwsza noc (21.09.2026) przepracowana:** 25 zapytań w 59 minut, 41 dni
  historii, ok. 213 tys. przypadków, 381 031 w bazie. Kontrola spójności stron
  zadziałała na żywym urzędzie. Zadanie `sejm` padło o 07:15 na awarii API
  (`clubs -> HTTP 404`, cała gałąź `/sejm/*`); API wróciło tego samego dnia.
- **Decyzja Pawła z 21.09.2026: 50 zapytań na noc** zamiast 25 (urząd nie
  odpowiedział na pismo z 12.09). Zostaje ok. 45 nocy do pełnych 10 lat.
  Zmiana wymusiła przepisanie akapitu o tempie w
  [`uokik-sprostowanie.md`](uokik-sprostowanie.md) — pismo mówiło, że pobieramy
  tylko ręcznie pojedyncze gminy, co od 21.09 jest nieprawdą.
- **Zostało do zamknięcia fazy 1:** ~~wyłączenie GitHub Actions~~ (zrobione),
  48 godzin timerów bez błędu, klucz GUS (`sudo jawne ustaw GUS_BDL_KLUCZ`),
  przełączenie kredytów CPU na Standard, wysłanie sprostowania do UOKiK.
- GitHub Actions wyłączone, gdy serwer przejmie przyrost SUDOP — krok 8
  (`gh workflow disable sudop-przyrost.yml`); plik workflow zostaje, żeby dało
  się wrócić jednym poleceniem.
- **Gotowe, gdy:** timery działają 48 godzin bez błędu, `npm run stan` na
  serwerze nie pokazuje dziur, strona testowa odpowiada.

**Faza 2 — autopilot: Claude Code na serwerze co 5 godzin.**
Instrukcje stałe: [`autopilot.md`](autopilot.md) (projekt do zatwierdzenia).
- Timer systemd uruchamia Claude Code w trybie nieinteraktywnym z tym plikiem
  jako poleceniem. Każdy przebieg: stan danych → naprawy → jedno zadanie
  z planu → pull request → wpis w zgłoszeniu „Dziennik autopilota”.
- **Pobieranie danych robią timery, nie autopilot.** Model sprawdza, czy
  działa, i naprawia kod — nie wysyła zapytań do urzędów sam.
- Zmiany tylko przez pull request; scala Paweł.
- Najpierw tydzień próbny: 2 przebiegi na dobę, potem co 5 godzin.
- **Do potwierdzenia przy konfiguracji:**
  - sposób logowania Claude Code na serwerze (token subskrypcji albo klucz API),
  - dokładne flagi trybu nieinteraktywnego i lista dozwolonych narzędzi,
  - zużycie: przebieg co 5 godzin korzysta z tych samych limitów subskrypcji,
    z których Paweł pracuje sam.
- Bezpieczeństwo: token GitHub drobnoziarnisty, tylko do tego repozytorium
  (treść i pull requesty), bez uprawnień administratora.
- **Gotowe, gdy:** co najmniej 3 z 4 pull requestów przechodzą przegląd bez
  poprawek.

**Faza 3 — przegląd po dwóch tygodniach**
Jakość pull requestów, rachunek AWS i zużycie limitów, postęp historii
SUDOP. Na tej podstawie decyzja o częstotliwości autopilota i tempie danych.

**Rozważona alternatywa:** zaplanowane sesje Claude w chmurze Anthropic
(bez serwera). Pracują na repozytorium z GitHuba, ale nie widzą bazy ani
logów serwera — nie sprawdzą, jak idzie pobieranie. Dlatego autopilot
na serwerze, obok danych.

---

## Pomysły — do oceny

- ~~**Mapa gmin**~~ **zrobione 23.09.2026**: `/mapa` — kartogram 2 477 gmin
  (dochody, fundusze UE, pomoc publiczna, zawsze na mieszkańca), kubełki po
  kwantylach, gmina bez danych szara. Granice z PRG (GUGiK), opis źródła
  w `ingest/zrodla/prg/ZRODLO.md`.
- **Porównywarka gmin w województwie.** Dochody, unijne pieniądze i pomoc
  publiczna na mieszkańca, sortowanie, link do konkretnego zestawienia.
  Ryzyko: łatwo zrobić z tego ranking „dobrych i złych gmin” — a to już ocena.
  Trzymamy się liczb z mianownikiem.
- **„Co nowego w mojej gminie”.** Skoro przyrost SUDOP jest dzienny, da się
  pokazać świeże wpisy, a docelowo powiadomienia e-mail dla gminy.
- **Okręg wyborczy jako klamra.** Ile pieniędzy trafia do okręgu i jak głosowali
  posłowie z tego okręgu. **Uwaga:** dane nie mówią, że to zasługa posła.
  Bez zdania sugerującego sprawczość.
- ~~**Interpelacje poselskie**~~ **zrobione 30.09.2026**: etap `interpelacje`
  (20 145 interpelacji, 36 524 podpisy autorów, ~55 s) i sekcja na stronie
  posła — ile podpisał z ilu złożonych w kadencji, ile bez odpowiedzi
  w rejestrze, pięć ostatnich z odnośnikiem do sejm.gov.pl. Trzymamy
  **metryczkę, nie treść**: pełne teksty to dziesiątki tysięcy PDF-ów, które
  rejestr i tak udostępnia.
  Sekcja jest także przy zerze (58 posłów nie podpisało żadnej) — ukrycie
  pokazywałoby niepełny obraz, a powodu rejestr nie podaje, więc go nie
  dopisujemy. Brak odpowiedzi opisujemy jako fakt o adresacie, nie o pośle.
  Prywatność sprawdzona na wszystkich 20 145 tytułach: „Pan/Pani + nazwisko"
  zero trafień, jedyne nazwisko w tytule należy do wiceminister w jej roli
  publicznej. Filtr `bezNazwiskOsobPrywatnych` zostaje mimo to — tytuły piszą
  posłowie i jutro może być inaczej.
- **Proces legislacyjny** (1 681 procesów, 15 907 etapów w starej bazie) —
  „co się stało z ustawą” to jedna z trzech rzeczy z pierwotnego briefu,
  której dziś nie ma.
- **Oświadczenia majątkowe i rejestr korzyści posłów** — w dużej części skany,
  więc to praca ręczna z podwójną kontrolą. Wysoka wartość, wysoki koszt.
- **Rolnictwo: SRPP i dopłaty ARiMR.** Gminy wiejskie mają dziś mało treści:
  funduszy UE niewiele, pomocy publicznej też. Tam idą pieniądze rolne.
  Uwaga: to dane osobowe rolników — ta sama reguła progu.
- **CORDIS** (projekty Horizon z polskimi uczestnikami) — pieniądze, których
  nie ma w polskich listach, bo Komisja płaci beneficjentowi bezpośrednio.
- **Kohesio** — porównanie gminy z regionami w innych krajach UE.
- **Wersja dla mediów lokalnych**: gotowy, cytowalny akapit z liczbami o gminie
  plus odnośniki do rejestrów. To najtańsza droga do tego, żeby ktoś w ogóle
  te dane zobaczył.

---

## Odrzucone

- **TAM (unijny rejestr pomocy państwa)** — 18.09.2026. Polska z niego nie
  korzysta, publikuje w SUDOP i SRPP. Sprawdzone, ślepy zaułek.
- **CRBR (beneficjenci rzeczywiści)** — zawiera wyłącznie osoby fizyczne,
  a po wyroku TSUE (C‑37/20, C‑601/20) powszechny dostęp jest prawnie wątpliwy.
