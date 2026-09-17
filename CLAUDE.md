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
| `src/app/` | trasy: `/`, `/okregi`, `/okreg/[nr]`, `/gmina/[teryt]`, `/poslowie`, `/posel/[slug]`, `/glosowania`, `/glosowanie/[id]`, `/szukaj`, `/api/szukaj`, `/stan`, `/o-serwisie` |
| `src/lib/dane.ts` | **jedyny** dostęp do bazy dla stron |
| `src/lib/` | czyste funkcje z testami: `format`, `polkole`, `kluby`, `barwy`, `glosy`, `tekst`, `niezaleznosc`, `opis-glosowania`, `prywatnosc` |
| `ingest/zrodla/` | pliki źródłowe trzymane bajt w bajt (PKW 2023), z sumą SHA-256 |
| `src/components/` | komponenty; `'use client'` tylko tam, gdzie potrzebna interakcja |
| `ingest/` | import do SQLite: Sejm, PKW, GUS, listy FE; SUDOP osobnym, ręcznym skryptem |
| `docs/zrodla.md` | katalog źródeł danych publicznych (też o firmach) ze statusem: zmierzone / z dokumentacji / odrzucone |
| `docs/sudop.md` | jak działa API SUDOP, co przeoczono w starym projekcie, decyzja do podjęcia |
| `dane/sejm.db` | baza — **nie w repozytorium**, odtwarzalna w ~20 minut |

---

## Komendy

```powershell
npm run dev
npm run build
npm run typecheck
npm test
npx eslint src ingest

npm run import wszystko                    # pełny import (~25 min), bez SUDOP
npm run import kluby poslowie glosowania   # szybkie etapy, ~5 s
npm run import zdjecia                     # 499 portretów do bazy, 6,8 MB
npm run import okregi wyliczenia           # bez sieci, ~5 s: gminy, sumy klubów, indeks
npm run import glosy -- --od-nowa          # powtórka po zmianie SPOSOBU zapisu
npm run import ludnosc                     # GUS BDL, ~10 s
npm run import budzety                     # budzety gmin z GUS BDL, ~3,5 min
npm run import fundusze wyliczenia         # listy FE z dane.gov.pl, ~3 min
node scripts/imiona-pesel.mjs              # odtwarza src/lib/imiona-pesel.ts (lista PESEL)

# SUDOP — tylko ręcznie (patrz Bezpieczeństwo). Dwa tryby:
npx tsx ingest/jobs/sudop.ts --gminy=100101,100102          # 10 lat jednej gminy
npx tsx ingest/jobs/sudop.ts --przyrost=2026-09-15..2026-09-17  # dzień dla CAŁEGO kraju
npx tsx ingest/jobs/sudop.ts --gminy=100101 --z-plikow      # z zapisanych odpowiedzi, bez sieci
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
   i podmiotów udzielających pomocy (decyzja z 17.09.2026, do potwierdzenia
   przez Pawła): nazwę pokazujemy tylko, gdy widać w niej formę prawną albo
   instytucję, i nie ma w niej imienia z rejestru PESEL ani kodu pocztowego
   (`nazwaDoPokazania`). Pozostałych nie wymieniamy, ale zawsze podajemy ich
   liczbę i wliczamy do sum. Spółki jawne i s.k. pokazujemy mimo nazwisk
   w firmie — są w KRS; spółki cywilnej i wspólnoty mieszkaniowej nie.
   Po każdej zmianie reguły: porównanie na wszystkich nazwach z bazy i przegląd
   próbek (pierwsza wersja przepuszczała „Zakład Fryzjerski Anna …”).
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
34. **Udzielającym pomocy bywa osoba fizyczna** (firmy szkoleniowe przy
    projektach UE) — lista „Kto udzielił” przechodzi przez ten sam filtr.

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
- Repozytorium starego projektu jest publiczne. Przy zakładaniu zdalnego dla
  tego — decyzja świadoma, żadnych sekretów w workflow.

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
