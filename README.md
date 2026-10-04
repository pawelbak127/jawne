# Zrzuty strony dla sesji `przebudowa`

Sesja w chmurze nie ma dostępu do zrejestru.pl (polityka sieci), więc tutaj
jest to, co widzi czytelnik. Gałąź osierocona: nie łączy się z `main`
i nie trzeba jej scalać.

**Skąd:** lokalna budowa (`npm run build`, webpack — tak jak serwer) z `main`
na commicie `414bc5d`, 04.10.2026 ok. 15:40, na lokalnej kopii bazy z tego
samego dnia. To jest **nowszy kod niż na zrejestru.pl** w chwili zrzutu:
jest już menu w dwóch grupach (Sejm / Pieniądze, Gminy w Pieniądzach),
na stronie posła jest jedna linijka „Miejsce na sali” zamiast całego planu,
są wystąpienia, komisje, interpelacje i streszczenia ustaw.

**Różnice wobec żywej strony:** lokalnie nie jest ustawiony `JAWNE_KONTAKT`,
więc próg jawności z zasady 7 nie działa — nazw firm jest MNIEJ niż na
zrejestru.pl (najostrzejszy wariant reguły). Liczby SUDOP mogą się różnić
od serwera, bo serwer pobiera historię co godzinę.

## Co jest w środku

- `obrazy/` — JPEG w kawałkach, żeby dało się je czytać:
  `NAZWA--komputer--NN.jpg` (1280 px, kawałki po 1800 px),
  `NAZWA--telefon--NN.jpg` (390 px przez emulację urządzenia, kawałki po
  1600 px), `NAZWA--komputer--ciemny--NN.jpg` (strona główna, gmina Kraków,
  poseł). Zrzut przycięty do 7 000 px (komputer) i 12 000 px (telefon) —
  pełna wysokość jest w `strony.json`.
- `tekst/NAZWA.txt` — wyrenderowany tekst nagłówka i `<main>`, tak jak
  wygląda po załadowaniu (rozwijane `<details>` zamknięte, ale ich treść
  jest w tekście).
- `strony.json` — adres, waga HTML w kB, pełna wysokość strony w px na
  komputerze i telefonie, lista kawałków.

## Strony

| nazwa | adres | HTML | wysokość komputer / telefon |
|---|---|---|---|
| glowna | `/` | 256 kB | 3 529 / 6 186 px |
| gminy | `/gminy` | 44 kB | 1 427 / 3 288 px |
| gmina-krakow | `/gmina/126101` | 313 kB | 16 743 / 27 046 px |
| gmina-mala | `/gmina/221301` | 170 kB | 7 670 / 13 134 px |
| poslowie | `/poslowie` | 508 kB | 12 943 / 37 244 px |
| posel | `/posel/andrzej-adamczyk` | 122 kB | 5 897 / 9 387 px |
| glosowania | `/glosowania` | 232 kB | 5 713 / 10 704 px |
| glosowanie | `/glosowanie/64-40` | 489 kB | 12 050 / 30 971 px |
| ustawy | `/ustawy` | 130 kB | 6 750 / 9 996 px |
| ustawa | `/ustawa/3101` | 40 kB | 1 861 / 2 739 px |
| komisje | `/komisje` | 62 kB | 3 355 / 5 740 px |
| okregi | `/okregi` | 73 kB | 2 515 / 4 396 px |
| okreg | `/okreg/14` | 141 kB | 2 971 / 4 698 px |
| sala | `/sala` | 212 kB | 2 058 / 2 784 px |
| pomoc-publiczna | `/pomoc-publiczna` | 101 kB | 4 202 / 8 544 px |
| firma | `/firma/7690502495` | 170 kB | 10 256 / 17 005 px |
| organ | `/organ/5251000810` | 46 kB | 2 307 / 3 537 px |
| mapa | `/mapa` | 114 kB | 1 900 / 2 250 px |
| szukaj | `/szukaj?q=krak` | 50 kB | 2 419 / 3 614 px |
| o-serwisie | `/o-serwisie` | 32 kB | 1 885 / 2 906 px |
| stan | `/stan` | 77 kB | 3 553 / 6 677 px |

Żadna strona nie przewija się w poziomie na 390 px (zmierzone
`scrollWidth` przy każdym zrzucie).

Jeśli potrzebujesz innej strony, stanu (rozwinięte menu, otwarte „Jak to
liczymy”) albo pomiaru — napisz w skrzynce `DO-glowny__…`, dorobię.
