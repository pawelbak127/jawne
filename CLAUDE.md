# CLAUDE.md — zasady pracy nad „jawne"

Krótko, bo długich plików się nie czyta. Wszystko poniżej zostało w tym
repozytorium **zmierzone**, a nie założone.

---

## Czym to jest

Serwis civic tech pokazujący dane publiczne o Sejmie: posłów, głosowania,
drogę ustaw. Docelowo także pieniądze publiczne i wyszukiwarkę firm — stąd
nazwa nie zawężona do Sejmu. Prowadzi to jedna osoba (Paweł), bootstrapowo.

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
| `src/app/` | trasy: `/`, `/okregi`, `/okreg/[nr]`, `/poslowie`, `/posel/[slug]`, `/glosowania`, `/glosowanie/[id]`, `/szukaj`, `/api/szukaj`, `/stan`, `/o-serwisie` |
| `src/lib/dane.ts` | **jedyny** dostęp do bazy dla stron |
| `src/lib/` | czyste funkcje z testami: `format`, `polkole`, `kluby`, `barwy`, `glosy`, `tekst`, `niezaleznosc`, `opis-glosowania`, `prywatnosc` |
| `ingest/zrodla/` | pliki źródłowe trzymane bajt w bajt (PKW 2023), z sumą SHA-256 |
| `src/components/` | komponenty; `'use client'` tylko tam, gdzie potrzebna interakcja |
| `ingest/` | import z API Sejmu do SQLite |
| `dane/sejm.db` | baza — **nie w repozytorium**, odtwarzalna w ~20 minut |

---

## Komendy

```powershell
npm run dev
npm run build
npm run typecheck
npm test
npx eslint src ingest

npm run import wszystko                    # pełny import (~20 min)
npm run import kluby poslowie glosowania   # szybkie etapy, ~5 s
npm run import zdjecia                     # 499 portretów do bazy, 6,8 MB
npm run import okregi wyliczenia           # bez sieci, ~5 s: gminy, sumy klubów, indeks
npm run import glosy -- --od-nowa          # powtórka po zmianie SPOSOBU zapisu
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
8. **„Ostatnie głosowania" = głosowania nad całością projektów**, rozpoznane
   po słowach rejestru. Nie wybieramy „ważnych" według siebie.

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
- **Nie odpytujemy API UOKiK/SUDOP.** To nie jest ograniczenie techniczne:
  Paweł czeka na odpowiedź urzędu na oficjalne pismo, a każde zapytanie tworzy
  pozycję w kolejce. Dotyczy osób trzecich — **zapytaj, zanim cokolwiek dotkniesz**.
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
