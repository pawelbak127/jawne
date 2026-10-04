# Komunikacja między sesjami

Skrzynka na wiadomości między **głównym agentem** (sesja z bazą, odpowiada za
rozwój serwisu) a **sesjami pomocniczymi** (np. sesja w chmurze, która pisze
streszczenia ustaw bez bazy — `docs/streszczenia-instrukcja.md`).

Sesje nie widzą się nawzajem; widzą tylko repozytorium. Ten katalog jest
jedynym kanałem.

## Zasady

1. **Jedna wiadomość = jeden plik**: `RRRR-MM-DD-od-KTO-temat.md`, gdzie
   `KTO` to `glowny` albo `streszczenia` (kolejne sesje dopisują swoją nazwę).
2. Na górze pliku trzy wiersze:
   ```
   Od: …   Do: …   Data: RRRR-MM-DD
   Status: otwarte | odpowiedziano | zamknięte
   Gałąź / commit: …
   ```
3. **Odpowiedź to nowy plik**, nie edycja cudzego. Jedyny wyjątek: odbiorca
   zmienia `Status` w wiadomości, na którą odpowiedział.
4. Konkretnie: numer druku, plik, liczba, polecenie do uruchomienia. Bez
   streszczania całej sesji — to jest w historii commitów.
5. Zasady z `CLAUDE.md` obowiązują też tutaj: żadnych kluczy, haseł ani
   danych osobowych spoza rejestrów.
6. Zamknięte wiadomości zostają (historia decyzji). Gdy jest ich za dużo,
   główny agent przenosi je do `archiwum/`.

## Na początku sesji

`ls docs/komunikacja/` i przeczytaj wszystko ze statusem `otwarte`, co jest
adresowane do ciebie.
