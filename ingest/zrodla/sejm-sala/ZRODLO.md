# Plan sali posiedzeń Sejmu — Kancelaria Sejmu

Plik `plan-sali.pdf` leży tu **bez żadnych zmian**, tak jak go wydała Kancelaria
Sejmu. Z niego powstaje `src/lib/plan-sali.ts`.

| | |
|---|---|
| Nazwa u wydawcy | `stan_21.09.26.pdf` |
| Adres | <https://orka.sejm.gov.pl/posiedzenie.nsf/0/3C58F455D89FBD9BC1258E7900293A25/$file/stan_21.09.26.pdf> |
| Pobrano | 24.09.2026 |
| Rozmiar | 1 447 907 B |
| SHA-256 | `23698d7cfd4ca0b7f5ce4a771e52d7af1b9fcfa38cbdc220b26fe6b0e82371b1` |
| Stan planu | 21.09.2026 (data jest wydrukowana w pliku i skrypt ją z niego czyta) |

## Dlaczego kopia w repozytorium

**API Sejmu nie podaje, kto gdzie siedzi.** `/sejm/term10/MP/{id}` ma klub,
okręg, zawód i wykształcenie — numeru miejsca nie ma. Ten rysunek jest jedynym
publicznym źródłem przydziału miejsc, a każde jego wydanie dostaje nowy adres
z identyfikatorem dokumentu (`3C58F455…`). Nie da się go więc pobierać cyklicznie
„spod tego samego linku": nowy plan trzeba znaleźć i dodać ręcznie.

## Pobranie ponowne

`orka.sejm.gov.pl` stoi za Imperva/Incapsula. Pierwsze żądanie dostaje
`HTTP 302` **pod ten sam adres** razem z `Set-Cookie`; dopiero powtórzenie
z tym ciasteczkiem oddaje plik. Bez słoika na ciasteczka `curl` kręci się
w kółko i kończy błędem „too many redirects":

```bash
curl -sL --cookie-jar ciastka.txt --cookie ciastka.txt \
  -A "Mozilla/5.0" -o ingest/zrodla/sejm-sala/plan-sali.pdf \
  'https://orka.sejm.gov.pl/posiedzenie.nsf/0/<ID>/$file/<nazwa>.pdf'
```

Po podmianie pliku trzeba poprawić `SHA_ZRODLA` i `ADRES_ZRODLA`
w `scripts/plan-sali.mjs` i uruchomić `node scripts/plan-sali.mjs`.

## Co jest w pliku (zmierzone 24.09.2026)

- jedna strona A4 poziomo (842 × 595 pkt), 7 fontów, **zero obrazów** —
  cały rysunek jest wektorowy, a nazwiska i numery miejsc to prawdziwy tekst,
- 5 512 pokazań glifu, z czego 460 podpisów posłów i 518 numerów miejsc,
- numeracja miejsc sięga 529: obejmuje także ławy rządowe, loże i miejsca
  dla gości, których rysunek nie podpisuje nazwiskami,
- podpisy są skracane: zwykle samo nazwisko, a przy dwóch posłach o tym samym
  nazwisku — z inicjałami (`K. Bosak` to Krzysztof, `K. A. Bosak` to Karina Anna),
- nazwisko dwuczłonowe bywa rozbite na dwie etykiety (`Borys-` + ` Szopa`),
  a raz jest skrócone (`Wiśniewska` zamiast `Uznańska-Wiśniewska`).

## Co sprawdza skrypt

- suma SHA-256 pliku zgadza się z tą w tabeli powyżej,
- data „stan na …" jest w pliku (bez niej nie wiadomo, czego dotyczy plan),
- **wszystkich 460 posłów sprawujących mandat ma swoje miejsce** — jeśli nie,
  skrypt wypisuje, kogo brakuje, i kończy się kodem błędu,
- żaden poseł nie ma dwóch miejsc i żaden numer nie trafia do dwóch osób.

## Sprawdzone drugą drogą (24.09.2026)

Podpisy z rysunku wiążemy z posłami po nazwisku — więc pomyłka byłaby cicha.
Kontrolą jest **rozkład klubów**: liczba miejsc każdego klubu na planie,
policzona po stronie rysunku, wyszła identyczna jak liczba posłów tego klubu
w rejestrze Sejmu. Dwanaście klubów, **zero rozjazdów**, suma 460:

```
KO 156 · PiS 146 · RozwojPlus 41 · PSL-TD 32 · Lewica 21 · Konfederacja 16
Polska2050 15 · Centrum 15 · niez. 7 · Demokracja 4 · Razem 4 · Konfederacja_KP 3
```

Widać to też gołym okiem na `/sala`: barwy klubów układają się w zwarte bloki,
a nie w szachownicę. Przy pomylonych nazwiskach byłoby odwrotnie.
