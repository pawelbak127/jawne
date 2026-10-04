# Streszczenia ustaw „po ludzku" — instrukcja dla sesji, która je pisze

Dla kogo: sesja Claude Code (także w chmurze), która dopisuje streszczenia do
`ingest/zrodla/streszczenia/ustawy.json`. Baza danych **nie jest potrzebna** —
opisy z rejestru są w `ingest/zrodla/streszczenia/opisy.json`.

## Jak pracować

1. Przeczytaj ten plik do końca.
2. Uruchom `npx tsx ingest/jobs/streszczenia.ts --sprawdz` — wypisze, ile
   projektów nie ma streszczenia, i najnowsze numery.
3. Weź partię (np. 50 najnowszych bez streszczenia). Dla każdego numeru:
   przeczytaj `tytul`, `stan` i `opis` z `opisy.json`, napisz streszczenie
   i dopisz wpis do `ustawy.json`:

   ```json
   "3090": {
     "tekst": "Co się zmienia: … Kogo dotyczy: …",
     "zrodlo_skrot": "<przepisz zrodlo_skrot z opisy.json>",
     "model": "<nazwa modelu, np. Claude Opus 5.5>",
     "przygotowano": "<dzisiejsza data RRRR-MM-DD>"
   }
   ```
4. Uruchom `--sprawdz` ponownie. **Kod 1 = coś odpadło** — popraw wskazane
   wpisy, zanim cokolwiek wypchniesz.
5. Commit po polsku („Streszczenia ustaw: druki …”), wypchnij.

Na stronę trafia tylko to, co przejdzie tę samą kontrolę w imporcie na
serwerze. Wpis, który odpadnie, nie psuje strony — czytelnik widzi wtedy sam
opis rejestru.

## Zasady pisania

Czytelnik to ktoś **bez przygotowania prawniczego**, który chce w dziesięć
sekund wiedzieć, czego dotyczy projekt i czy dotyczy jego.

**Forma.** Dwie części, razem 2–4 zdania, najwyżej 700 znaków:
`Co się zmienia: …` oraz `Kogo dotyczy: …`.

**Tylko to, co jest w opisie.** Streszczenie przepisuje opis z rejestru
prostszymi słowami. Nie dodaje faktów, skutków, ocen ani kontekstu
politycznego — nawet jeśli są powszechnie znane.
- Wolno wyjaśnić **pojęcie** prostymi słowami („próg podatkowy — kwota
  dochodu, powyżej której płaci się wyższy podatek”). Nie wolno dopisać
  **faktu**, którego w opisie nie ma.
- Nie wolno zgadywać, kto zyska, a kto straci, jeśli opis tego nie mówi.
  „Kogo dotyczy” ma wynikać z opisu (np. „kierowców”, „dietetyków”).
- Żadnych przymiotników oceniających („słuszny”, „kontrowersyjny”,
  „długo oczekiwany”). Serwis nie ocenia (zasada 6 w CLAUDE.md).
- Nie podawaj, kto zgłosił projekt i z jakiego klubu — strona pokazuje to
  osobno, z rejestru.
- **Tytuł druku też jest z rejestru** i stoi na tej samej stronie, więc fakt
  z tytułu wolno użyć (np. „ratyfikacja traktatu” w druku 2840). Uwaga:
  kontrola liczb sprawdza tylko OPIS — liczby z samego tytułu odpadną.
- **Opis bez treści merytorycznej** (np. „projekt dotyczy m.in. regulacji
  określających tymczasowe aresztowanie”): streszczenie pisz, jeśli coś
  upraszcza — wyjaśnia pojęcie albo porządkuje listę — i zakończ zdaniem
  „Opis z rejestru nie podaje szczegółów”. Nie pisz go, jeśli byłoby tylko
  powtórzeniem opisu innymi słowami (decyzja z 04.10.2026).

**Liczby.** Każdy ciąg cyfr ze streszczenia musi dosłownie występować
w opisie — automatyczna kontrola odrzuci każdą inną liczbę.
- Przepisuj liczby dokładnie tak, jak w opisie („120 000 zł”, „3 miesiące”,
  „1 tys. zł”), ze spacjami jak w źródle: „10 000” to nie to samo co „10000”.
- Rok z **tytułu** nie wystarczy: kontrola sprawdza tylko opis. Jeśli roku nie
  ma w opisie, napisz „czasowy”, „od przyszłego roku” itp. tylko wtedy, gdy
  opis to mówi — inaczej pomiń.
- Przykład, który kontrola odrzuca: „800+” przy świadczeniu wychowawczym —
  tak się o nim potocznie mówi, ale w opisie tej liczby nie ma.

**Tryb zależy od `stan`.**
- `w toku`, `Odrzucono`, `Wycofano` → projekt **nie obowiązuje**: tryb
  przypuszczający („straciłby”, „mogliby dostać”, „zostałyby uproszczone”).
- `Uchwalono` → „Ustawa wprowadza / przewiduje …”. Nie pisz, że już
  obowiązuje — uchwalenie przez Sejm to nie wejście w życie.

**Język.** Proste słowa zamiast urzędowych: „państwo” zamiast „Skarb
Państwa”, gdy to nie zmienia sensu; „ocieplanie” zamiast „termomodernizacja”
z wyjaśnieniem, jeśli trzeba. Bez skrótów, których czytelnik nie zna, albo
z rozwinięciem przy pierwszym użyciu.

## Przykłady z próby (04.10.2026)

> **3101** (w toku). Opis: „…wprowadzenie instrumentu natychmiastowego
> zatrzymania na 3 miesiące prawa jazdy za najbardziej niebezpieczne
> naruszenia popełnione na przejazdach kolejowych, 2) zaostrzenie sądowego
> środka karnego…”
>
> Streszczenie: „Co się zmienia: Kierowca, który popełni najgroźniejsze
> wykroczenia na przejeździe kolejowym, straciłby prawo jazdy od razu na
> 3 miesiące. Sądy surowiej orzekałyby też zakaz prowadzenia pojazdów za
> przestępstwa na przejazdach. Kogo dotyczy: kierowców.”

> **3122** (w toku). Opis: „projekt dotyczy podwyższenia progu podatkowego
> z kwoty 120 000 zł do kwoty 140 000 zł”
>
> Streszczenie: „Co się zmienia: Próg podatkowy — kwota dochodu, powyżej
> której płaci się wyższy podatek — wzrósłby ze 120 000 zł do 140 000 zł.
> Kogo dotyczy: osób z dochodem wyższym niż 120 000 zł.”

## Kiedy odświeżyć `opisy.json`

Sesja w chmurze nie ma bazy, więc nowe druki pojawią się w `opisy.json`
dopiero po `npx tsx ingest/jobs/streszczenia.ts --eksport` na komputerze
z bazą (i commicie). Jeśli Sejm zmieni opis druku, jego skrót się rozjedzie,
a stare streszczenie przestanie się pokazywać samo — `--sprawdz` wskaże je
do napisania na nowo.
