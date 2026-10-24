# Wykaz oświadczeń majątkowych posłów X kadencji — Kancelaria Sejmu

Plik `osw10.csv` leży tu **bez żadnych zmian**, tak jak przysłała go Kancelaria
Sejmu. Z niego etap `oswiadczenia` (`npm run import oswiadczenia`) buduje tabelę
`oswiadczenia`, a strona posła — listę odnośników do skanów.

| | |
|---|---|
| Wydawca | Kancelaria Sejmu, Biuro Komunikacji Społecznej |
| Jak otrzymany | załącznik do odpowiedzi na wniosek o informację publiczną z 04.10.2026, sygn. **BKSP.115.15322.2026** (odpowiedź 24.10.2026) |
| Nazwa u wydawcy | `osw10.csv` (w poczcie: `osw10 (5).csv`) |
| Rozmiar | 301 292 B, UTF-8 z BOM |
| SHA-256 | `92f8385c3cb3de45a5e1ee42474870a431082c2d33f132f6e745a39810d83832` |
| Zawartość | 1 874 wiersze: 499 posłów × oświadczenia „Początek kadencji” (499), „I rok” (456), „II rok” (460), „III rok” (459) |

Kolumny: numer legitymacji (w API Sejmu to identyfikator posła), „Nazwisko
i imię” (z drugim imieniem), rodzaj oświadczenia, data złożenia, nazwa pliku,
adres skanu na `orka.sejm.gov.pl`.

## Co z tego wynika — i czego nie robimy

Z odpowiedzi Kancelarii (24.10.2026):

- oświadczenia są wypełniane **ręcznie na papierze** i publikowane jako skany
  po ustawowych wyłączeniach (dane adresowe); plików z warstwą tekstową
  Kancelaria nie ma;
- dane podane do wiadomości publicznej są jawne; zasady ponownego wykorzystania:
  <https://www.sejm.gov.pl/Sejm10.nsf/page.xsp/copyright>;
- **Kancelaria nie przewiduje wyjątków od ochrony serwisów sejmowych przed
  ruchem automatycznym.**

Dlatego **nie pobieramy skanów skryptem** — strona posła podaje tylko odnośnik,
a skan otwiera czytelnik. Żadnych kwot z oświadczeń nie odczytujemy ani nie
pokazujemy: to ręczne pismo na skanie, a błąd w liczbie przy nazwisku kosztuje
więcej niż jej brak.

## Kontrola przy imporcie (zmierzone 24.10.2026)

Wszystkie 499 numerów łączy się z posłami w bazie; nazwisko i pierwsze imię
zgadzają się w 499 na 499 (15 pozornych rozjazdów to drugie imiona, których
rejestr posłów nie podaje). Każdy adres prowadzi na `orka.sejm.gov.pl`
i kończy się nazwą pliku z piątej kolumny.

## Nowe oświadczenia

Wykaz to stan z 24.10.2026. Oświadczenie za IV rok kadencji (termin
30.04.2027) w nim nie wystąpi — nowy wykaz trzeba dostać tak samo (wniosek
albo strona Sejmu otwarta ręcznie w przeglądarce) i podmienić plik razem
z sumą powyżej.
