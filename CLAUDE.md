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
| `src/app/` | trasy: `/`, `/poslowie`, `/posel/[slug]`, `/glosowania`, `/glosowanie/[id]`, `/stan`, `/o-serwisie` |
| `src/lib/dane.ts` | **jedyny** dostęp do bazy dla stron |
| `src/lib/` | czyste funkcje: `format`, `polkole`, `kluby`, `barwy`, `glosy` (+ testy) |
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
npm run import poslowie -- --zdjecia       # sprawdza HEAD-em, kto ma zdjęcie
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
   z poleceniem. Nie ma głosów imiennych → strona mówi to wprost.

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
