# CLAUDE.md — zasady pracy nad „jawne"

Krótko, bo długich plików się nie czyta. Wszystko poniżej zostało w tym
repozytorium **zmierzone**, a nie założone.

---

## Czym to jest

Serwis civic tech pokazujący dane publiczne o Sejmie: posłów, głosowania,
drogę ustaw — i publiczne pieniądze w gminach (Fundusze Europejskie, pomoc
publiczna dla firm). Docelowo także wyszukiwarka firm — stąd nazwa
nie zawężona do Sejmu. Prowadzi to jedna osoba (Paweł), bootstrapowo.

**Wiarygodność jest produktem.** Błąd w liczbie przy czyimś nazwisku kosztuje
więcej niż tydzień opóźnienia.

---

## Stack

```
Next.js 16 (App Router) + React 19
TypeScript strict
Tailwind CSS 4 (@theme inline w globals.css, bez pliku konfiguracyjnego)
SQLite przez wbudowany node:sqlite — bez konta, bez poświadczeń, bez sieci
vitest, tsx
Node >= 24 (node:sqlite)
```

JavaScript po stronie klienta jest **dozwolony i używany**: wyszukiwanie
w trakcie pisania, filtry, podświetlanie bloków w półkolu. Biblioteki UI nie
są zakazane — na razie żadna nie zarobiła na miejsce w zależnościach.

### Gdzie czego szukać

| Katalog | Co tam jest |
|---|---|
| `src/app/` | trasy: `/`, `/gminy`, `/gminy/[wojewodztwo]`, `/okregi`, `/okreg/[nr]`, `/gmina/[teryt]`, `/firma/[nip]`, `/pomoc-publiczna`, `/poslowie`, `/posel/[slug]`, `/glosowania`, `/glosowanie/[id]`, `/ustawy`, `/ustawa/[numer]`, `/mapa`, `/sala`, `/szukaj`, `/api/szukaj`, `/stan`, `/o-serwisie` |
| `src/lib/dane.ts` | **jedyny** dostęp do bazy dla stron |
| `src/lib/` | czyste funkcje z testami: `format`, `polkole`, `kluby`, `barwy`, `glosy`, `tekst`, `niezaleznosc`, `opis-glosowania`, `prywatnosc` |
| `ingest/zrodla/` | pliki źródłowe trzymane bajt w bajt (PKW 2023, plan sali Sejmu) i opisy źródeł zbyt dużych na repozytorium (PRG), z sumą SHA-256 |
| `src/components/` | komponenty; `'use client'` tylko tam, gdzie potrzebna interakcja |
| `ingest/` | import do SQLite: Sejm, PKW, GUS, listy FE; SUDOP osobnym, ręcznym skryptem |
| `docs/zrodla.md` | katalog źródeł danych publicznych (też o firmach) ze statusem: zmierzone / z dokumentacji / odrzucone |
| `docs/sudop.md` | jak działa API SUDOP, co przeoczono w starym projekcie, decyzja do podjęcia |
| `deploy/` | serwer: `instaluj.sh`, zadania danych, jednostki systemd, Caddy, polecenie `sudo jawne …`; instrukcja w `docs/serwer.md` |
| `dane/sejm.db` | baza — **nie w repozytorium**, odtwarzalna w ~20 minut |

---

## Pierwsza rzecz w sesji

```powershell
npm run stan
```

Mówi, co już mamy w bazie, ile dni pomocy publicznej brakuje i jakim
poleceniem to dociągnąć. Nie zmienia niczego i nie pyta żadnego urzędu.
**Zaczynaj od tego** — inaczej łatwo pobrać drugi raz to, co już jest.

Potem **`docs/plan.md`** — co zrobione, co następne, blokery przed premierą
i plan serwera. To żywy dokument: aktualizuj go przy każdym zamkniętym kroku.
Jeśli GitHub Actions działa, najpierw `npm run sudop:artefakty -- --import`
(bez zapytań do urzędu).

## Komendy

```powershell
npm run dev
npm run build                              # webpack, nie Turbopack — patrz pulapka 58
npm run typecheck
npm test
npx eslint src ingest

npm run import wszystko                    # pełny import (~25 min), bez SUDOP
npm run import kluby poslowie glosowania   # szybkie etapy, ~5 s
npm run import procesy                     # droga ustaw przez Sejm, ~70 s (1692 procesy)
npm run import interpelacje                # metryczka interpelacji, ~55 s (20 145 sztuk)
npm run import zamowienia                  # TED: polskie zamowienia, ~13 min (129 tys. ogloszen)
npm run import regon                       # REGON/BIR: kim jest NIP (GUS_BIR_KLUCZ), 3 s na paczke 20 NIP-ow
npm run import zdjecia                     # 499 portretów do bazy, 6,8 MB
npm run import obecnosc                    # dni obrad i usprawiedliwienia, 499 zapytan, ~4,5 min
npm run import okregi wyliczenia           # bez sieci, ~5 s: gminy, sumy klubów, indeks
npm run import wykaz                       # uzgodnienie wykazu gmin z PRG i GUS, ~80 s
npm run import glosy -- --od-nowa          # powtórka po zmianie SPOSOBU zapisu
npm run import ludnosc                     # GUS BDL, ~10 s
npm run import budzety                     # budzety gmin z GUS BDL, ~3,5 min
npm run import smup                        # wskazniki SMUP gmin (SMUP_KLUCZ), ~4 min
npm run import fundusze wyliczenia         # listy FE z dane.gov.pl, ~3 min
npm run import agregaty                    # przeglad krajowy liczony raz, bez sieci (~1 s)
node scripts/imiona-pesel.mjs              # odtwarza src/lib/imiona-pesel.ts (lista PESEL)
node --experimental-strip-types scripts/granice-gmin.mjs   # public/mapa/gminy.json z PRG (patrz ingest/zrodla/prg)
node scripts/plan-sali.mjs                 # src/lib/plan-sali.ts z rysunku sali (ingest/zrodla/sejm-sala)

# SUDOP — tylko ręcznie (patrz Bezpieczeństwo). Dwa tryby:
npx tsx ingest/jobs/sudop.ts --gminy=100101,100102          # 10 lat jednej gminy
npx tsx ingest/jobs/sudop.ts --przyrost=2026-09-15..2026-09-17  # dzień dla CAŁEGO kraju
npx tsx ingest/jobs/sudop.ts --gminy=100101 --z-plikow      # z zapisanych odpowiedzi, bez sieci
npx tsx ingest/jobs/sudop.ts --przyrost=… --tylko-pobierz   # bez bazy (GitHub Actions)
npm run sudop:artefakty -- --import                         # zaciąga to, co pobrał cron w Actions
npx tsx ingest/jobs/sudop.ts --historia --plan              # co pobierze noc serwera — bez sieci
npm run paczka-na-serwer                                    # baza + odpowiedzi SUDOP dla serwera

# Serwer (docs/serwer.md): sudo jawne stan | plan | logi ZAD | sprawdz | sumy | aktualizuj
# Zadania serwera: sudop-dzien, sudop-historia, sejm, gus, fundusze, ted
```

---

## Zasady, które zostają

1. **Przy każdej liczbie odnośnik do rejestru.** To jedyne, czego nie ma
   konkurencja. Ma wyglądać jak element interfejsu, nie jak przypis.
2. **Nie zgadujemy powodów.** Rejestr nie podaje, czemu posła nie było —
   więc my też nie.
3. **Liczba zawsze z mianownikiem.** 60% ze stu głosowań to nie to samo,
   co 60% z czterech tysięcy.
4. **`null` ≠ zero.** Półpauza znaczy „nie mamy wartości", zero znaczy
   „zmierzyliśmy zero". Mylenie ich jest błędem merytorycznym.
5. **Nikogo nie ukrywamy.** Poseł z wygasłym mandatem i klub, którego już nie
   ma, zostają w serwisie.
6. **Nie oceniamy.** Żadnych odznak, rankingów „leniwych" ani punktów.
7. **Nie powtarzamy nazwisk osób prywatnych** (decyzja z 16.09.2026, do
   odwołania przez Pawła). W sprawach z oskarżenia prywatnego nazwiska
   oskarżycieli i ich pełnomocników znikają z tytułów, podglądów linku
   i z naszego indeksu wyszukiwania; strona dostaje `noindex` i mówi o tym
   wprost. Nazwisko posła zostaje. Jedna reguła dla wszystkich — także gdy
   oskarżycielem jest polityk. Kod: `src/lib/prywatnosc.ts`.
   **To samo dotyczy beneficjentów** funduszy UE i pomocy publicznej
   i podmiotów udzielających pomocy (decyzja z 17.09.2026, próg kwotowy
   zatwierdzony przez Pawła 18.09.2026): nazwę pokazujemy, gdy widać w niej
   formę prawną albo instytucję i nie ma w niej imienia z rejestru PESEL ani
   kodu pocztowego — **albo** gdy pojedyncza pomoc przekroczyła
   `PROG_JAWNOSCI_EUR` (100 tys. EUR, próg GBER) i ustawiony jest
   `JAWNE_KONTAKT` (`nazwaDoPokazania`). Bez adresu do sprzeciwu próg nie
   działa — to warunek techniczny, nie deklaracja. Pozostałych nie wymieniamy, ale zawsze podajemy ich
   liczbę i wliczamy do sum. Spółki jawne i s.k. pokazujemy mimo nazwisk
   w firmie — są w KRS. Spółka cywilna podlega progowi tak jak osoba fizyczna
   (jej wspólnicy to osoby fizyczne), a wspólnota mieszkaniowa jest jawna:
   ma własny NIP, a jej nazwa to adres budynku, nie nazwisko.
   Po każdej zmianie reguły: porównanie na wszystkich nazwach z bazy i przegląd
   próbek (pierwsza wersja przepuszczała „Zakład Fryzjerski Anna …”).
   **Wyszukiwarka oddaje tylko firmy, których nazwę wolno pokazać — także przy
   szukaniu po dokładnym NIP-ie** (`szukajFirm` w `dane.ts`): `/firma/[nip]`
   dla możliwej osoby fizycznej oddaje 404, więc wynik wyszukiwania prowadziłby
   w martwy link i mówiłby więcej niż strona. Kwoty tych podmiotów zostają
   w sumach gminy.
   **Od 24.09.2026 rozstrzyga REGON, nie zgadywanie z nazwy** (decyzja Pawła:
   „pokazujemy tak dużo, jak możemy, nie łamiąc prawa”). Pole `Typ` z BIR:
   `P`/`LP` → osoba prawna, nazwa nie jest daną osobową i pokazujemy ją zawsze;
   `F`/`LF` → osoba fizyczna, obowiązuje reguła jak dotąd. Gdy REGON nie zna
   NIP-u, wracamy do heurystyki. **Wyjątek `NIGDY` stoi PONAD rejestrem**:
   REGON nadaje spółkom cywilnym typ `P`, a ich nazwy to wprost nazwiska
   wspólników („… S.C. GRZEGORZ K… AGNIESZKA K…”) — spółka cywilna nie jest
   osobą prawną, tylko umową osób fizycznych. Zmierzone na 93 287 nazwach:
   54 nazwy się odsłaniają (spółki z literówką w formie prawnej, ZOZ-y,
   PKS), 0 się chowa; osobno 65 nazw ze spółek cywilnych zapisanych bez
   kropek („… SC …”) przeszło do ukrytych.
8. **„Ostatnie głosowania" = głosowania nad całością projektów**, rozpoznane
   po słowach rejestru. Nie wybieramy „ważnych" według siebie.
9. **Kwota w gminie zawsze na mieszkańca i z punktem odniesienia.** Mediana
   w województwie (2021–2027) albo wśród miast na prawach powiatu (2014–2020).
   Grupa porównawcza musi mieć te same szanse na niezerową wartość.
10. **Dane SUDOP pokazujemy z warunkami UOKiK** tuż przy liczbach: źródło,
    data pobrania, „dane mogą ulec zmianie”, odpowiedzialność podmiotów
    udzielających, charakter pomocniczy, RODO.

---

## Zmierzone w tej kadencji (stan na 16.09.2026)

```
499 posłów (39 z wygasłym mandatem)   4632 głosowania   65 posiedzeń
2 128 618 głosów imiennych            12 klubów w /clubs, suma = 460
```

Wartości głosu na pełnym imporcie — **próbka ich nie pokazuje**:

```
YES 1 024 202 | NO 827 527 | ABSENT 137 673 | ABSTAIN 114 416
PRESENT 21 315 | VOTE_VALID 3 485        (VOTE_INVALID: 0 wystąpień)
```

`PRESENT` nie ma w schemacie OpenAPI, a występuje 21 tysięcy razy.

---

## Pułapki zmierzone tutaj, nie przepisane z dokumentacji

1. **API Sejmu stoi za F5 i faluje.** W jednej sesji oddawało kolejno:
   przekroczenie czasu, 503, 200 i **404 `text/html` na poprawny adres**.
   Pięć żądań pod rząd dało 404, 200, 200, 200, 200. Dlatego `ingest/lib/http.ts`
   ponawia także 404 — trzy razy, zanim uzna je za odpowiedź. Bez tego import
   po cichu pomija zasoby, a to błąd, którego nic nie zgłasza.
   **20.09.2026: cała gałąź `/sejm/*` oddawała 404 przez kilkanaście minut**
   (także `/MP` i `/clubs`), a `/eli/acts` i korzeń API odpowiadały 200.
   Ponawianie nie pomaga — import pada wtedy głośno i tak ma być.
2. **Rejestr jest wewnętrznie niespójny.** `/clubs` oddaje 12 klubów, ale
   posłowie wskazują też `Polska2050-TD`, którego w tej liście nie ma.
3. **Głos niesie klub z DNIA GŁOSOWANIA, `/clubs` — stan bieżący.**
   W głosach żyją `Republikanie` (9604), `Kukiz15` (2993), `PSL` (256),
   `Nowa_Lewica` (208). Zapisanie przy nich `null` to cicha utrata informacji:
   głos członka Kukiz15 pokazywałby się jako „bez klubu".
4. **Nazwy klubów mają do 103 znaków.** W legendzie półkola nie da się ich
   użyć — etykietą jest krótki kod rejestrowy, pełna nazwa idzie w podpowiedź.
5. **Barw partyjnych nie da się użyć** i nie naprawi tego zewnętrzny rejestr:
   pomiar logo dał pięć czerwieni, trzy granaty i jeden klub bez barwnych
   pikseli. Paleta w `kluby.ts` jest nasza, zwalidowana pod daltonizm, a test
   mierzy dystans CIE76 każdej pary sąsiadów w obu motywach.
6. **`create-next-app` daje fonty z `subsets: ['latin']`** — przy tym polskie
   znaki diakrytyczne lecą na font zastępczy. Zawsze `latin-ext`.
7. **`tsx` w projekcie bez `"type": "module"`** kompiluje do CJS, więc
   `await` na najwyższym poziomie pliku się nie kompiluje. Stąd `main()`.
8. **ESLint wywala zwykły `"` w tekście JSX.** I dobrze — polski cudzysłów
   zamykający to `”` (U+201D), a nie `"`.

9. **Plik PKW zapisuje TERYT jako liczbę** — 608 kodów ma 5 cyfr zamiast 6.
   Trzy sąsiednie adresy PKW odpowiadają `HTTP 200` z HTML-em zamiast pliku.
10. **`core.autocrlf=true` wycina CR z plików źródłowych w repozytorium** —
    stąd `.gitattributes` z `ingest/zrodla/** -text`.
11. **FTS5 `remove_diacritics` nie zamienia „ł" na „l"**, a trygram szuka
    podciągów, więc „podatek" nie znajduje „podatku". Tekst i zapytanie
    przechodzą przez `uprosc()` i `rdzen()` z `src/lib/tekst.ts`.
12. **Tytuł i temat głosowania zamieniają się rolami**: w 3966 tytułach
    „Pkt. N" sprawa jest w tytule, w 350 tytuł to nazwa posiedzenia.
    Zawsze przez `opisGlosowania()`, nigdy `temat ?? tytul`.
13. **za + przeciw + wstrzymał ≠ głosujących** w 59 głosowaniach (kworum,
    wybory na liście). Pasek bez odcinka „obecnych bez głosu" kłamie.
14. **`Math.cos` w Node i w Chrome różni się na ostatniej cyfrze** —
    niezgodność hydracji na `cx`/`cy`. Współrzędne zaokrąglone.
15. **Tailwind 4: `dark:` słucha tylko systemu**, dopóki nie zdefiniujesz
    `@custom-variant dark` pod przełącznik.
16. **Tekst w `foreignObject` skaluje się z SVG** — etykieta półkola rosła
    razem z wykresem i zasłaniała kropki.
17. **Desktopowy Chrome ma minimalną szerokość okna ~500 px** — zrzut
    „390 px" z `--window-size` jest fałszywy. Telefon sprawdza się
    w ramce `<iframe style="width:390px">`.

18. **Zatrzymanie zadania w tle zabija `npx`, nie serwer Node.** Port zostaje
    zajęty, a pomiar trafia w STARY kod (tak zmierzyliśmy „szybką" stronę,
    która wcale nie była nowa). Przed pomiarem: kto słucha na porcie
    (`Get-NetTCPConnection -LocalPort 3222`) i od kiedy.
19. **Klub spoza listy `KLUBY` ląduje na prawym skraju sali.** Kluby
    historyczne (`PSL`, `Nowa_Lewica`, `Kukiz15`, `Republikanie`) mają wpis
    w `kluby.ts` obok następców — inaczej wykres z 2023 r. przestawiał je
    politycznie.

20. **Listy FE mają twarde spacje (U+00A0) w nagłówkach.** Kontrola nagłówka
    normalizuje `\s+`; bez tego zatrzymała import na „Miejsce realizacji”.
21. **Lista FE 2014–2020 ma miejsce realizacji tylko do powiatu.** Do gminy
    trafiają wyłącznie projekty miast na prawach powiatu. Pozostałe gminy
    dostają dla tego okresu wyjaśnienie, nie zero. Mediana liczona po
    wszystkich gminach dawała przez to „0 zł”.
22. **Plik ministerstwa ma U+FFFD już u źródła** („Mst��w”) i nazwy ucięte
    limitem komórki. Nie naprawiamy zgadywaniem — 81 lokalizacji zostaje
    niedopasowanych i jest to raportowane.
23. **Interreg 2014–2020 podaje kwoty w euro** (kolumna `waluta`). Sumy tylko PLN.
24. **Warszawa: lista FE ma jedną gminę 146501, PKW i GUS — 18 dzielnic.**
    Ludność Warszawy składamy z dzielnic (`ludnoscWarszawy`).
25. **228 nazw gmin powtarza się w 470 gminach.** Tytuł strony zawiera
    rodzaj i powiat, inaczej dwie strony mają ten sam tytuł.
26. **API SUDOP:** rejestracja zapytania oddaje `303` na `/api/kolejka/{id}`;
    potem co 60 s: `200` = czekaj, `303` = wynik gotowy. `fetch` musi mieć
    `redirect: 'manual'`. Kod gminy ma 7 cyfr (TERYT + rodzaj), parametr
    powtarzany. Daty `RRRR-MM-DD`, okno 10 lat, 10 000 wierszy na stronę.
    **`?csv=true` jest wadliwy** (przecinki bez cudzysłowu) — tylko JSON.
    Źródłem tych ustaleń jest instrukcja UOKiK (dane.gov.pl, zbiór 6068).
    **Rekord kolejki żyje równo godzinę** (zmierzone 22/23.09.2026: 59 × `200`
    „czeka”, w 60. minucie `404` „Nie znaleziono rekordu”). Czekanie dłużej
    niż godzinę to gwarantowany `404`, więc horyzont ma 57 minut.
    **Ile urząd każe czekać, ZMIENIŁO SIĘ w ciągu dwóch dni** (dziennik serwera):

    | Kiedy | Zapytanie | Odpowiedź |
    |---|---|---|
    | 21.09 | 7 dni, 62 674 przypadki | **1 min** (25 zapytań tej nocy, 1–14 min) |
    | 22.09 | kolejne zakresy | 1–31 min |
    | 23.09 | 1 dzień, 216 przypadków | **51 min** |
    | 24.09 | 1 dzień, 229 przypadków | **53 min** |
    | 24.09 | te same zakresy ponownie | ponad 55 min — wynik nie przyszedł |
    | 25.09 | 1 dzień ustalony, 3 730 przypadków | **51 min** |
    | 27.09 | 7 dni (2025-10-01..07) | **4 × ponad 57 min — nigdy nie wrócił** |

    Czas odpowiedzi **nie zależy od godziny** (udane o 15:31, 19:17, 22:51
    i 23:42, nieudane o 01:36) i **prawie nie zależy od wielkości**: 3 730
    wierszy wróciło po 51 minutach, tyle samo co 216. Ale **przy naprawdę dużym
    wyniku jednak rośnie**: zakres 2025-10-01..2025-10-07 nie wrócił ani razu
    w czterech próbach po 57 minut, podczas gdy 280 innych dni poszło gładko.
    Dlatego po błędzie **długość zakresu tnie się na pół** (7 → 3 → 1 dnia)
    i wraca do siedmiu po sukcesie. Zakres z błędem trzeba przy tym pominąć,
    bo jego strony leżą na dysku i krok „przerwane" podałby go w całości
    niezależnie od nowej długości. Przy ~52 minutach
    przetwarzania i godzinnym życiu rekordu zostaje osiem minut zapasu —
    dlatego czekamy do końca tego, co możliwe.
    **Skrócenie horyzontu do 20 minut (24.09) dało dwie noce po ZERO zapytań**:
    oba zakresy porzucaliśmy w 20. minucie, zanim urząd zdążył odpowiedzieć.
    Lekcja jest ogólniejsza niż SUDOP: pomiar tempa cudzego systemu bywa ważny
    dwa dni, a próg oparty na nim trzeba sprawdzić, zanim się go zacieśni.
    Po nieudanym zakresie kwadrans przerwy. Zakres, którego
    kolejka nie oddała, jest odkładany i wraca następnej nocy; **błąd jednego
    zakresu nie kończy nocy** (dopiero trzy pod rząd), bo inaczej jedna
    nieudana rejestracja kosztuje cały przydział zapytań.
27. **`exceljs` ciągnie `uuid` < 11.1.1** (podatność) — `overrides` w
    `package.json`; `exceljs` tylko w devDependencies, bo używa go import.
28. **Import SUDOP pisze do tej samej bazy przez kilkadziesiąt minut.**
    `busy_timeout = 60000` każe równoległemu etapowi czekać na zapis zamiast
    od razu zgłaszać `database is locked` (zabezpieczenie, błąd nie wystąpił).
29. **„kości” (od „kościół”) trafia w ulicę Kościuszki**, „zakład”, „agencja”,
    „centrum” — w nazwy jednoosobowych firm. Znacznik instytucji nie dowodzi,
    że nazwa nie zawiera osoby; dlatego najpierw imię (lista PESEL).
    Dopełniacz imienia męskiego („im. Jana”, „św. Józefa”) bywa żeńskim
    imieniem w mianowniku — w oknie patrona sprawdzamy tylko imiona męskie.
30. **GUS BDL, poziom 6, ma pięć rodzajów jednostek.** Rodzaje 4 i 5 to miasto
    i obszar wiejski **wewnątrz** gminy miejsko-wiejskiej — zsumowanie ich
    z rodzajem 3 policzyłoby tę gminę drugi raz. Bierzemy 1, 2, 3.
    Warszawa jest tam jedną jednostką (146501), a nie 18 dzielnicami.
31. **SUDOP ma jednostki mniejsze niż gmina.** 18 dzielnic Warszawy (kod
    kończy się na 8) i 19 delegatur Łodzi, Krakowa, Wrocławia i Poznania
    (kończy się na 9). W jednym dniu przyszło 265 przypadków z kodem Warszawy
    i kilkanaście z delegatur — bez przełożenia na miasto macierzyste
    (`terytGminyZKodu`) wypadały z serwisu po cichu.
32. **Ten sam przypadek pomocy potrafi wystąpić kilka razy.** W 80 698
    pobranych wierszach jest 2 392 grupy identyczne na wszystkich 28 polach
    (5 200 wierszy) — to osobne transze, nie błąd źródła. Klucz jednoznaczny
    musi mieć numer w grupie, inaczej import gubi 2 808 przypadków.
33. **„Wydatki majątkowe” ≠ „wydatki inwestycyjne”.** Majątkowe obejmują też
    dotacje inwestycyjne (np. dla spółki miejskiej budującej metro): Warszawa
    2025 to 3,07 mld zł majątkowych i 2,57 mld zł inwestycyjnych. Pokazujemy
    majątkowe i nazywamy je majątkowymi.
38. **Zadanie w tle przeżywa zamknięcie sesji.** Pobieranie SUDOP z poprzedniej
    sesji wciąż czekało w kolejce urzędu, gdy uruchomiliśmy drugie — dwa
    zapytania naraz. Teraz `ingest/jobs/sudop.ts` trzyma blokadę
    (`dane/zrodla/sudop/.blokada` z PID-em) i drugi proces odmawia startu.
37. **Dzień SUDOP ustala się po 14 dniach.** Urzędy mają 7 dni na zgłoszenie
    pomocy; dzień pobrany następnego dnia miał 200 przypadków zamiast ~6 tys.
    Sumy liczymy tylko z dni ustalonych, a o tym decyduje data POBRANIA
    zapisana w pliku odpowiedzi (`pobrano`), nie data importu.
35. **Przegląd krajowy liczy tylko dni z `pomoc_publiczna_dni`.** W tej samej
    tabeli leży pełna 10-letnia historia gmin pokazowych — bez filtra Bełchatów
    dodałby do sumy krajowej 13 mld zł.
36. **GUS BDL — pełna tabela limitów** (z api.stat.gov.pl, sprawdzone
    24.09.2026). Klucz podaje się w nagłówku `X-ClientId`:

    | Okres | bez klucza | z kluczem |
    |---|---|---|
    | 1 s | 5 | 10 |
    | 15 min | 100 | 500 |
    | **12 h** | **1 000** | **5 000** |
    | 7 dni | 10 000 | 50 000 |

    Przerwa 1 s przekraczała limit 15-minutowy — `przerwaBdlMs()` w `http.ts`
    dobiera tempo do klucza, a `http.ts` respektuje `Retry-After`. Import
    budżetów pomija lata już kompletne w bazie (`--od-nowa` pobiera znowu).
    **Najgroźniejszy jest limit 12-godzinny**: sam etap `dzialy` to ok. 600
    zapytań, a `budzety` ok. 400 — razem dokładnie tysiąc, czyli cały dobowy
    przydział użytkownika anonimowego. Klucz BDL jest **generowany
    automatycznie po rejestracji** na api.stat.gov.pl (nie trzeba o niego
    pisać, w odróżnieniu od klucza BIR) — i podnosi ten limit pięciokrotnie.
34. **Udzielającym pomocy bywa osoba fizyczna** (firmy szkoleniowe przy
    projektach UE) — lista „Kto udzielił” przechodzi przez ten sam filtr.
49. **REGON: limit liczy się w PODMIOTACH, nie w wywołaniach** — i to my
    liczyliśmy go źle. Pisemna odpowiedź GUS (30.09.2026) na nasze pytanie:
    w instrukcji „każdy podmiot to jedno żądanie”, więc paczka 20 NIP-ów to
    **20 żądań**. Przy limicie 3 żądań na sekundę nasze 500 ms między paczkami
    dawało 40 żądań na sekundę — **trzynaście razy za szybko**, a nie „tuż pod
    progiem”, jak zapisaliśmy tu 24.09. Zerwane połączenie po ok. 400 NIP-ach
    (czyli po 20 wywołaniach) tłumaczyliśmy tempem 2,9 wywołania na sekundę:
    kierunek dobry, jednostka zła. GUS jednocześnie wprowadza **zachętę do pytań
    zbiorczych: paczka dwudziestu może iść raz na 3 sekundy** (zamiast ~6,7 s
    z przeliczenia jeden do jednego) — „szybkość pobierania wzrasta ok.
    dwukrotnie”, zapis trafi do instrukcji przy najbliższej aktualizacji.
    Stąd 3 000 ms w `import.ts`. Limit liczy się **dla adresu IP**, a przy
    poważnym przekroczeniu urząd kontaktuje się; zmiany IP nie trzeba zgłaszać.
    Błąd nie kończy przebiegu: przerwa 30 s, ponowne logowanie i ta sama partia
    jeszcze raz (pięć błędów pod rząd kończy).
    **Pobierając REGON stajemy się niezależnym administratorem danych
    osobowych** — GUS napisał to wprost przy potwierdzeniu licencji CC BY 4.0.
    Oznaczenie źródła: „Źródło: rejestr REGON, Główny Urząd Statystyczny”
    z datą pobrania (urząd potwierdził, że to wystarczy).
48. **REGON (BIR): `Nipy` przyjmuje NAJWYŻEJ 20 numerów.** Przy 21 usługa
    oddaje **pustą odpowiedź — HTTP 200, bez błędu**. Pierwsza wersja importu
    wysyłała po 100 i „znalazła” 3 podmioty z 28 603. Zmierzone: 20→20, 21→0,
    50→0, 100→0. Usługa zawsze odpowiada **MTOM/XOP** (koperta `--uuid:…`),
    więc trzeba wyciąć z niej `<s:Envelope`. **`\s` w zwykłym szablonie JS to
    litera „s”** — `new RegExp(\`<${t}>([\s\S]*?)</${t}>\`)` cicho zamienia
    się w „(same s i S)”; stąd `String.raw`. Jeden NIP potrafi mieć kilka
    wpisów (5 na 200), ale **typ F/P był w próbce zawsze ten sam**.
47. **TED zawiera kwoty błędne o trzy rzędy wielkości** — i są to błędy
    zamawiającego, nie odczytu: ogłoszenie 235172-2026 ma 257 562 861 720 000 zł
    za utrzymanie torów (85× PKB Polski), a wartości pojedynczych ofert sumują
    się do tego samego. W całej Polsce: 2 ogłoszenia powyżej biliona, 24 powyżej
    10 mld. Jedno takie wpisywało Warszawie 257 752 mld zł. Kwoty powyżej
    `PROG_PODEJRZANEJ_KWOTY` (10 mld zł, **nasz próg, nie rejestru**) nie wchodzą
    do sum, ale są pokazane osobno z odnośnikiem — nie poprawiamy ich i nie
    ukrywamy.
46. **Kontury gmin trzeba uprościć PRZED repozytorium, nie w przeglądarce.**
    PRG ma 5 154 114 punktów na 2 479 gmin; po Douglas-Peuckerze z tolerancją
    0,004° zostaje 93 492 i plik ma 940 kB (426 kB po spakowaniu). Uproszczenie
    „co n-ty punkt” robi białe szpary między gminami — DP upraszcza wspólną
    granicę tak samo z obu stron. Mapa dostaje dane jako **krotki, nie
    obiekty**: 2 477 obiektów z nazwami pól dało stronę 440 kB, krotki 113 kB.
45. **TED: okno wyników to `page × limit ≤ 15 000`** (powyżej HTTP 400
    `SEARCH_WINDOW_TOO_WIDE`), a `limit` sięga 250. Polskich ogłoszeń
    o udzieleniu zamówienia od początku kadencji jest 129 077 — dlatego
    import idzie miesiąc po miesiącu. **`winner-identifier` to WOLNY TEKST**:
    w jednym ogłoszeniu obok siebie stały „NIP 634-012-54-42”, „7281341936”,
    „683-20-98-254” i „NIP 527 105 59 84”. Bez `nipZTekstu()` (z sumą
    kontrolną — w tym polu bywają też REGON-y i numery zagraniczne) nic się
    nie połączy z SUDOP. **Kwota `total-value` dotyczy CAŁEGO ogłoszenia**,
    ze wszystkimi częściami i wykonawcami; 90 na 250 ogłoszeń ma więcej niż
    jednego wykonawcę, więc sumujemy tylko te z jednym.
44. **`systemctl show` dla NIEISTNIEJĄCEJ usługi zwraca wartości domyślne.**
    `sudo jawne uruchom sej` (literówka) wypisało „Unit jawne-sej.service not
    found”, a zaraz pod spodem **„Wynik: success”** — bo `systemctl show -p
    Result` oddał domyślne `success`. Nazwa zadania jest teraz sprawdzana
    z listy, a wynik bierze się z kodu wyjścia `systemctl start`.
43. **Rejestr procesów nie zawsze podaje `stageType`.** W próbce 60 procesów
    42 etapy przyszły z samym `stageName` („Rozpatrywanie na forum Sejmu”).
    Kolumna `typ` jest więc `null`-owalna, a na stronie i tak pokazujemy nazwę.
    Podobnie 485 z 1692 procesów nie ma `documentTypeEnum`. **Kod `committeeCode`
    bywa równy `Sejm`** — to nie komisja, tylko skierowanie na posiedzenie izby;
    napis „komisja Sejm” byłby nieprawdą.
39. **Strony bez parametrów Next renderuje raz, przy `next build`.** `/`,
    `/stan`, `/pomoc-publiczna` i 499 stron posłów miały w manifeście
    `initialRevalidateSeconds: false` — na serwerze pokazywałyby stan z dnia
    budowania. `revalidate = 3600` w `layout.tsx` (i osobno w `sitemap.ts`).
40. **`??` przepuszcza pusty napis.** `JAWNE_ADRES_SERWISU=` w pliku ustawień
    dawało `new URL('')` i wywracało build. Zmienne z pliku: `?.trim() ||`.
42. **Znacznik UTC i polski kalendarz to dwie różne doby.** Zadanie nocne
    o 01:17 w Warszawie zapisuje `pobrano` jako `…T23:17Z` z DNIA POPRZEDNIEGO.
    Reguła „dzień ustala się po 14 dniach" liczona po dacie UTC gubiła całą
    dobę: dzień 08.09 odświeżony 22.09 wyglądał na pobrany 21.09, więc nie
    ustalał się nigdy, a plan nocy wracał do niego w kółko (noc padła po
    3 zapytaniach z 50). Strefę przeliczamy RAZ, przy zapisie —
    `pomoc_publiczna_dni.pobrano_dzien`; SQL i raporty porównują zwykłe daty.
    **Brakująca KOLUMNA nie jest łapana przez `bezTabeli()`** w `dane.ts`,
    więc migracje idą przed `next build` (`ingest/jobs/migracje.ts`).
41. **Strony SUDOP z różnych chwil się przesuwają.** Wznowiony zakres składa
    strony pobrane różnego dnia; strona 1 zakresu 2–14.09 z 18.09 miała
    62 177 wyników, a urząd dopisuje dalej. Strony z jednego ciągu mają liczbę
    identyczną (33 409 × 4, 45 377 × 5) — `pobierzPrzyrost` to sprawdza
    i przy rozjeździe pobiera starsze strony ponownie.

50. **Kto gdzie siedzi, jest TYLKO w rysunku sali.** `/sejm/term10/MP/{id}` ma
    klub, okręg, zawód i wykształcenie — numeru miejsca nie ma. Rysunek
    Kancelarii Sejmu (PDF) jest wektorowy, więc 460 nazwisk i 518 numerów
    miejsc to prawdziwy tekst ze współrzędnymi. Trzy pułapki przy czytaniu:
    nazwisko idzie **glif po glifie i przeskakuje między dwoma fontami
    w środku wyrazu** („Hołownia” to `<B.>` + `(H)` + `<oło>` + `(wnia)`);
    po pokazaniu kilku glifów naraz kolejny `Td` nadrabia ich szerokości, więc
    dopuszczalny odstęp musi rosnąć z liczbą glifów (inaczej „Wawer” rozpada
    się na „Waw” i „er”); podpisy są skracane i rozstrzyga je dopiero
    wykluczenie („K. Bosak” to Krzysztof, bo „K. A. Bosak” to Karina Anna).
    **Kontrola drugą drogą: rozkład klubów z rysunku zgadza się z rejestrem
    co do jednego mandatu** we wszystkich 12 klubach — przy pomylonych
    nazwiskach barwy byłyby szachownicą, a nie blokami.
51. **`orka.sejm.gov.pl` stoi za Imperva.** Pierwsze żądanie dostaje `302` pod
    **ten sam adres** razem z `Set-Cookie`; bez słoika na ciasteczka `curl`
    kręci się w kółko („too many redirects”). `www.sejm.gov.pl` oddaje `403`
    nawet z ciasteczkami — strony HTML Sejmu nie da się tak pobrać, `api.sejm.gov.pl`
    i `orka` działają.

---

52. **Strona, która liczy sumy przy każdej odbudowie, przewróci build.**
    `/pomoc-publiczna` robiło **osiem osobnych przebiegów po całej tabeli**
    pomocy publicznej. Indeks nic nie daje: filtr „dni ustalone” obejmuje 97%
    wierszy, więc `SCAN` jest planem właściwym. Skaluje się za to fatalnie —
    168 tys. wierszy to 1,6 s na przebieg, 2,5 mln to ~24 s, a pełna historia
    będzie ~5 min. **27.09.2026 `next build` na serwerze padł** na „took more
    than 60 seconds" i zostawił stronę wyłączoną (`instaluj.sh` zatrzymuje ją
    PRZED budową). Od tego dnia przegląd liczy się **raz, przy imporcie**
    (`src/lib/przeglad.ts` + tabela `agregaty`), a strona czyta gotowy wynik:
    1 338 ms → 0 ms, te same liczby. Zasada ogólna: **jeśli zapytanie skaluje
    się z liczbą wierszy, a strona jest odbudowywana automatycznie, to jego
    miejsce jest w imporcie.** Kolejny kandydat: `wartosciMapy('pomoc')`
    (508 ms lokalnie, `/mapa` jest trasą dynamiczną, więc płaci za to każdy
    czytelnik).

53. **Rejestr podaje, czy nieobecność była USPRAWIEDLIWIONA** — i jest to
    jedyne takie miejsce w całym API: pole `absenceExcuse`
    w `/MP/{id}/votings/stats`. Dotyczy **całego dnia obrad**, nie pojedynczego
    głosowania, więc przeliczanie go na głosowania byłoby naszym wymysłem.
    Zmierzone 28.09.2026: 74 853 dni poselskich, 18 252 dni z nieobecnością,
    **4 127 usprawiedliwionych**, 437 z 499 posłów ma choć jeden taki dzień.
    **Dwa końce tego samego rejestru liczą głosowania inaczej**: na 162 dniach
    obrad `/votings` i statystyka posła zgadzają się w 102, a w 60 statystyka
    podaje MNIEJ (raz o 105 głosowań; nigdy więcej). Dlatego głosowania liczymy
    po swojemu (z `glosy`), a dni — po rejestrowemu, i nie sumujemy jednego
    z drugim. Powodu nieobecności rejestr nie podaje nigdy, więc reguła 2
    obowiązuje dalej.
    **Uwaga przy sprawdzaniu:** `glosowania.data` to pełny znacznik czasu
    (`2023-11-13T15:17:22`), a `obecnosc.dzien` to data — porównanie wprost
    daje zero trafień i wygląda jak dziura w imporcie. Tak się nabrałem.

54. **Ten sam komponent na 499 stronach to nie ten sam koszt.** Wstawienie
    interaktywnego planu sali na stronę posła podniosło ją z **88 kB do 258 kB**:
    każda z 499 stron niosła nazwisko, slug, klub i okręg wszystkich 460 posłów
    — raz w HTML-u i drugi raz w danych Reacta. Na serwerze z 2 GB pamięci
    build po ~400 stronach wpadł w swap i **pięciu ostatnim stronom zabrakło
    300 sekund NA STRONĘ** (`/sala`, `/sitemap.xml`, `/stan`, `/szukaj`,
    `/ustawy` — nie dlatego, że są ciężkie, tylko dlatego, że były ostatnie).
    Lekarstwo: na stronie posła plan jest ILUSTRACJĄ, nie narzędziem —
    osobny komponent serwerowy bez nazwisk i bez JavaScriptu, a tło rysowane
    **jednym** `<path>` z odcinków zerowej długości i zaokrąglonym
    zakończeniem zamiast 459 elementów `<circle>`. Zmierzone: 258 → 144 → 103 kB.

55. **To mapa strony wywróciła wdrożenie, nie pamięć maszyny.** 28.09.2026
    `next build` padł na `/sitemap.xml` po trzech próbach po 300 s, a systemd
    zaraportował **`1.2G memory peak, 0B memory swap peak`** — czyli 2 GB
    w zupełności starczyło i teoria o swapie była błędna. Powód: `sitemap.ts`
    robił `group by nip_beneficjenta` po całej tabeli pomocy (2,5 mln wierszy
    → ~230 tys. firm), a potem przepuszczał **każdą** nazwę przez
    `nazwaPodmiotuJawna()`. Przy okazji mapa
    łamała własny limit: deklarowała „poniżej 50 tys. adresów", a generowała
    240 tysięcy.
    **SPROSTOWANIE z 30.09.2026:** winą za te 300 sekund obarczyliśmy tutaj
    także `nazwaPodmiotuJawna()` — i to było zgadywanie, nie pomiar. Zmierzone
    na 93 489 prawdziwych nazwach: **1,2 µs na nazwę**, czyli ok. 0,3 s na
    wszystkich beneficjentów kraju. Cały koszt leżał w `group by` po tabeli
    pomocy. 300 s to był LIMIT, na którym build padł, a nie czas tej funkcji;
    przypisaliśmy go pierwszej rzeczy, która wyglądała na kosztowną. Teraz listę liczy import (`agregaty`, klucz `mapa-firmy`),
    już po regule jawności i przycięta do `MAKS_ADRESOW_MAPY`, a strona tylko
    ją czyta: **22 ms i 21 026 adresów**. Zasada ta sama co w pułapce 52 —
    tyle że tu ofiarą była trasa, o której nikt nie myśli jak o „stronie".

56. **`begin` bez wycofania zamienia jeden błąd w serię.** ZMIERZONE
    29.09.2026 w nocy SUDOP: w dzienniku wyglądało to na trzy różne usterki —
    `database is locked`, potem `kolejka nie oddala wyniku`, potem
    **`cannot start a transaction within a transaction`** — a była jedna.
    Pierwszy błąd wystąpił w środku `db.exec('begin')` … `db.exec('commit')`,
    transakcja została otwarta i **każdy następny zapis w tym procesie padał**.
    Od teraz każda transakcja idzie przez `wTransakcji()` z `ingest/lib/baza.ts`
    (25 miejsc w `import.ts`, 2 w `sudop.ts`); jedno miejsce zostaje po staremu,
    bo jest asynchroniczne i ma własne wycofanie.
    Źródłem pierwszego błędu było `busy_timeout = 60000`: odkąd historia SUDOP
    chodzi ciągle, trafia na nocne zadanie `sejm`, którego etap „indeks firm"
    pisze **jedną transakcją przez szesnaście minut**. Limit podniesiony
    do 30 minut — czekanie jest tańsze niż porzucony zakres, bo oba zadania
    i tak chodzą w tle.

57. **Suma przyrostowa jest bezpieczna tylko wtedy, gdy nigdy się nie
    odejmuje.** Przegląd krajowy, mapa i lista firm liczyły się od zera przy
    każdym przebiegu SUDOP: 11 min przy 2,5 mln wierszy, **29 min przy
    3,78 mln** — gorzej niż liniowo, bo maszyna ma 2 GB i baza przestaje się
    mieścić w pamięci podręcznej. Przy pełnym oknie rejestru (~30 mln) to
    kilka godzin na jednym rdzeniu, który obsługuje też stronę.
    Rozwiązanie stoi na tym, co rejestr już gwarantuje: **dzień ustala się
    14 dni po dacie i od tej chwili się nie zmienia** (pułapka 37), a za
    ustalony uznajemy go dopiero wtedy, gdy został POBRANY co najmniej 14 dni
    po sobie. Do sum wchodzi więc wyłącznie materiał, który się już nie rusza
    — stan jest DOPISYWANY, nigdy odejmowany. Odejmowanie byłoby tu pułapką:
    wystarczy jeden przerwany zapis i suma rozjeżdża się ze źródłem po cichu,
    a nikt tego nie zauważy.
    Czego stan nie obejmuje, to liczymy na żywo przy każdym użyciu: dni
    pobrane, ale jeszcze nieustalone (najwyżej kilkanaście) i pełna
    10-letnia historia gmin pokazowych (pułapka 35). Oba zbiory są **stałe**
    — nie rosną razem z historią.
    Kontrola: `pomoc_sumy_dni` pamięta znacznik pobrania każdego policzonego
    dnia; gdy się zmieni, stan liczy się od zera bez pytania.
    `npx tsx ingest/jobs/migracje.ts --sprawdz` (`sudo jawne sumy`) liczy to
    samo drugą drogą — SQL po całej tabeli — i porównuje pole po polu.
    **Ta kontrola musi czytać STRUMIENIEM.** Zmierzone 30.09.2026 na serwerze:
    `.all()` na grupowaniu po NIP-ie przewróciło proces po 64 minutach
    („Reached heap limit”, w stosie `StatementExecutionHelper::All`) — wynik
    to kilkaset tysięcy wierszy, a każdy staje się osobnym obiektem JS i nie
    mieści się w domyślnej stercie 920 MB. `.iterate()` trzyma jeden wiersz.
    Z tego samego powodu lista rozjazdów ma sufit: kontrola, która pada przy
    zgłaszaniu błędu, nie zgłasza niczego. Indeks `pomoc_dzien` jest do tego konieczny:
    `select distinct dzien` idzie wtedy indeksem pokrywającym (7 ms przy
    168 tys. wierszy), a nie przebiegiem po tabeli.

58. **Turbopack kompiluje w Ruście, więc `--max-old-space-size` go nie
    dotyczy.** 30.09.2026 `next build` na serwerze został zabity przez jądro
    **trzy razy**, zawsze w fazie „Creating an optimized production build”.
    `Killed` bez słowa wyjaśnienia to komunikat POWŁOKI, nie Next — przyczynę
    podaje dopiero `dmesg -T | grep -i "killed process"`:
    `anon-rss:1525048kB`, czyli 1,5 GB przy 1,8 GB pamięci maszyny.
    Zmierzone lokalnie na samej kompilacji (`next build
    --experimental-build-mode compile`, szczyt sumy procesów node):

    | bundler | szczyt pamięci | czas |
    |---|---|---|
    | Turbopack (domyślny) | **1 357 MB** | 5 s |
    | webpack (`--webpack`) | **912 MB** | 14 s |

    Te 445 MB to dokładnie brakujący margines. Od tego dnia `npm run build`
    ma `--webpack`, a `next.config.ts` — `webpackMemoryOptimizations` i mapy
    źródeł wyłączone. **Lokalnie budujemy tak samo jak serwer**: inaczej
    „u mnie działa” przestaje cokolwiek znaczyć, a to właśnie ten rozjazd
    kosztował trzy nieudane wdrożenia.
    Pierwsza hipoteza — że winne jest zadanie SUDOP w tle — była tylko
    częścią prawdy: `jawne-sudop-historia` startuje o :07 każdej godziny
    i czeka na kolejkę do 57 minut, więc rzeczywiście zabierało pamięć
    (`instaluj.sh` zatrzymuje teraz zadania na czas budowy). Ale po ich
    wyłączeniu build padł znowu — przy 1 158 MB wolnej pamięci i 1 567 MB
    wolnego swapu. Dopiero pomiar obu bundlerów pokazał, gdzie jest różnica.

---

## Wzorce obowiązujące

1. **Kontrola dziedziny przed zapisem.** Importer sprawdza wartości porcji,
   zanim cokolwiek zapisze. To ona złapała niespójność z punktu 2 wyżej.
2. **Nieznana wartość słownikowa jest RAPORTOWANA, nie przerywa importu.**
   Import, który wywraca się na nowej wartości, traci cały przebieg; import,
   który ją zapisuje i zgłasza, traci najwyżej etykietę w interfejsie.
   Tak wyszły cztery kluby historyczne.
3. **Geometria wykresu to czysta funkcja z testem na liczbę elementów.**
   Półkole, z którego czytelnik liczy większość, nie może gubić kropek.
4. **Stronicowanie jawne.** Lista, która urywa się po cichu, wygląda
   na kompletną.
5. **Sprawdzaj na wyrenderowanym HTML-u, nie w kodzie.** Typecheck, lint,
   testy i build przepuszczają komentarz JSX widoczny jako tekst, wycięty
   atrybut i brakującą kropkę.
6. **Brak danych to stan, nie awaria.** Nie ma pliku bazy → `<BrakDanych>`
   z poleceniem. Nie ma tabeli → `bezTabeli()` w `dane.ts`.
7. **Liczba z serwisu sprawdzona drugą drogą.** Porównanie z klubem liczone
   funkcją TS i niezależnym SQL-em (0 rozjazdów); tabela klubów na stronie
   głosowania zsumowana i porównana z nagłówkiem rejestru.
8. **Zrzut ekranu i konsola przeglądarki przed commitem.**
   `chrome --headless=new --screenshot` oraz `--enable-logging=stderr
   --dump-dom` (niezgodności hydracji). Osobny `--user-data-dir` na każdy
   zrzut, inaczej Chrome oddaje kod 0 i nic nie zapisuje.


59. **BDL nie usuwa zmiennej, ktorej przestal zasilac — i to jest cicha
    strata.** Dzial 926 zmienil w 2011 r. nazwe („Kultura fizyczna i sport"
    → „Kultura fizyczna") i dostal **nowy identyfikator**: stary `202304` ma
    lata **2008–2010**, nowy `273898` ma **2011–2025**. Nasz import pytal
    o stary, a BDL odpowiadal **HTTP 200 z pustym wynikiem** — bez bledu,
    bez ostrzezenia. Efekt: w `budzety_dzialy` bylo 14 dzialow z 15 (34 678
    wierszy to dokladnie 14 × 2 477), strona nie wypisywala wydatkow gminy na
    sport, a czytelnik nie mial jak sie dowiedziec, ze taka kategoria istnieje.
    **Dwa zabezpieczenia minely sie z problemem**: sprawdzany byl tylko dzial
    `ogolem`, a kontrola druga droga porownuje **sume** wydatkow z `budzety_gmin`
    — ktora z podzialem na dzialy nie ma nic wspolnego, wiec przy brakujacym
    dziale pokazywala **0,00% roznicy** i wygladala jak dowod poprawnosci.
    Od 01.10.2026 import pobiera **lata kazdej zmiennej osobno**
    (`/variables/{id}` dla wszystkich 15, nie dla jednej wzorcowej) i z tego
    wie, ilu dzialow ma prawo oczekiwac w danym roku. Rok jest kompletny
    dopiero wtedy, gdy ma **wszystkie** nalezne dzialy — inaczej zaden nocny
    przebieg juz by go nie uzupelnil. Zasada ogolniejsza: **gdy rejestr
    identyfikuje wskaznik liczba, pytaj go takze o to, jakie LATA ta liczba
    obejmuje.** Brak wiersza i brak zmiennej wygladaja z zewnatrz identycznie.


60. **`Map.set` na kluczu, ktory nie jest jednoznaczny, gubi dane bez slowa.**
    ZMIERZONE 01.10.2026: `slownikGmin()` mapowal
    `nazwa|powiat|wojewodztwo` → TERYT, a **143 pary gmin maja te sama nazwe
    w tym samym powiecie** — miasto i okalajaca je gmina wiejska (Belchatow
    100101/100102, Augustow, Bochnia, Boleslawiec, Brodnica…). Drugie `set`
    nadpisywalo pierwsze i zawsze wygrywala gmina wiejska: **8 512 wpisow
    REGON po jej stronie i ZERO po stronie miasta**, w 286 gminach.
    „MIASTO BELCHATOW" mialo kod gminy wiejskiej, a „MIEJSKI ZAKLAD
    GOSPODARKI MIESZKANIOWEJ W BOLESLAWCU" siedzial na wsi. Wisialo na tym
    7 092 ogloszen TED i 12 600 wierszy wykonawcow.
    Rozstrzyga `miejscowosc` z BIR — nie heurystyka, a wniosek z rejestru:
    **miasto X jest dokladnie jedna miejscowoscia X**, wsie okalajacej gminy
    nazywaja sie inaczej. Wyjatek: wlasne organy gminy wiejskiej maja siedzibe
    w miescie, ale rejestr sam je nazywa (`GMINA `, `GMINN…`, `URZAD GMINY` —
    147 wpisow). **Wzorzec musi byc WASKI**: wsrod nazw z „GMIN" sa
    „GMINA-MIASTO TOMASZOW MAZOWIECKI", „GMINA-MIASTO DZIALDOWO"
    i „GMINA-MIASTO STARGARD" (same miasta) oraz 20 zwiazkow gmin — reguła
    „zawiera GMIN" wyrzucilaby je w zla strone.
    Po naprawie: 6 181 wpisow przeszlo do miast, 2 331 zostalo. Dwie lekcje
    ogolniejsze: (1) **migracja, ktora patrzy tylko na `where teryt is null`,
    nie naprawi wiersza, ktory ma wartosc BLEDNA** — trzeba przeliczac takze
    kody z par kolizyjnych; (2) gdy klucz moze pasowac do kilku wierszy,
    slownik ma trzymac **liste kandydatow**, a nie ostatniego, ktory wygral.

---

## Bezpieczeństwo

- **Nie otwieramy `C:\Projects\obywatel\.env.local`** — zawiera klucz omijający
  zabezpieczenia tamtej bazy. Ten projekt nie potrzebuje żadnych poświadczeń.
- **API UOKiK/SUDOP odpytujemy tylko ręcznie i oszczędnie.** 17.09.2026 Paweł
  poprosił o ponowne sprawdzenie; ścieżka z kolejką działa (`docs/sudop.md`)
  i zaimportowano trzy gminy pokazowe. **Import całego kraju to decyzja Pawła**
  (D13 w starym projekcie): urząd pisał, że ruch przekracza jego możliwości,
  a każde zapytanie tworzy pozycję w kolejce. Nigdy na żądanie czytelnika,
  nigdy z crona bez tej decyzji. Jedno zapytanie naraz, odpytywanie co 60 s.
  **Decyzja Pawła z 19.09.2026:** historia całego kraju od pierwszej nocy
  serwera. Tempo podnoszone dwa razy na podstawie pomiarów: 25 → 50
  (21.09) → **150 zapytań na noc (22.09, kod odrzuca więcej niż 150)**.
  **Teoria „kolejka odpowiada tylko nocą" była błędna** (postawiona 24.09,
  obalona dziennikiem 25.09): udane pobrania są o 19:17 i 22:51, nieudane
  o 01:36. Godzina nie ma znaczenia — znaczenie ma tylko to, czy czekamy
  pełne 57 minut (pułapka 26). Okno 00:30–07:00 zostaje, ale jako ograniczenie
  obciążenia urzędu, nie jako „pora, o której działa".
  **Decyzja Pawła z 25.09.2026: praca ciągła** (`--okno=zawsze`, 20 zapytań
  na przebieg, timer co godzinę; systemd pomija start jednostki, która już
  działa). Zadanie dzienne czeka na blokadę 22 h, historia ustępuje po minucie
  — bez tego rozróżnienia ciągła historia trzymałaby blokadę non stop,
  a zadanie dzienne odpadałoby po czterech godzinach czekania. Podstawa: pora nie ma znaczenia, a doba mieści najwyżej ~24 zapytania
  — czyli **sześć razy mniej niż zatwierdzone 22.09 tempo 150 na noc**.
  Obciążeniem urzędu jest liczba pozycji w kolejce, nie pora ich złożenia,
  a my zajmujemy najwyżej jedną naraz. Historia (ok. 2 750 zapytań) to przy
  tym tempie ok. **cztery miesiące** zamiast 20–30 nocy sprzed spowolnienia.
  Tempa nie stroimy parametrem; zmiana to decyzja Pawła, a pismo do UOKiK
  (`docs/pismo-uokik.md`) musi opisywać stan faktyczny w dniu wysłania.
- Repozytorium starego projektu jest publiczne. Przy zakładaniu zdalnego dla
  tego — decyzja świadoma, żadnych sekretów w workflow.
- **Klucze mają dwa miejsca i tylko dwa**: `.env.local` na komputerze
  (`GUS_BDL_KLUCZ`, `SMUP_KLUCZ`, `GUS_BIR_KLUCZ`, `JAWNE_KONTAKT`)
  i `/etc/jawne/jawne.env` na serwerze przez `sudo jawne ustaw NAZWA`.
  Nigdy w repozytorium, nigdy w treści commita, nigdy w dokumentacji —
  także jako „przykład”.
- **Załączniki od urzędów** (pisma, instrukcje z przykładowymi kluczami,
  np. `BIR1_Przyklady.docx` od GUS) idą do katalogu `prywatne/`, którego
  nie ma w repozytorium. `.gitignore` odrzuca też `*.docx`, `*.xlsx`,
  `*.eml` i `*.msg` w całym drzewie. Plik źródłowy, który ma być trzymany
  bajt w bajt (jak CSV z PKW), dodaje się świadomie: `git add -f`.

---

## Jak pracować z Pawłem

- Jest Lead Developerem, nie zawodowym programistą. Rozumie architekturę
  i zadaje trafne pytania. **Kilka razy jego wątpliwość okazała się słuszna,
  a pewność modelu błędna.** „To dziwne, że tak musi być" traktuj jako sygnał
  do sprawdzenia, nie do obrony tezy.
- Chce gotowych komend, krok po kroku, z zaznaczoną kolejnością.
- **Nie każ mu usuwać linii z plików konfiguracyjnych.**
- Małe, atomowe commity. Commity i dokumentacja po polsku, kod po angielsku
  poza nazwami dziedzinowymi.
- Gdy popełnisz błąd, nazwij go wprost i wyjaśnij mechanizm. Ten projekt stoi
  na wiarygodności.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
