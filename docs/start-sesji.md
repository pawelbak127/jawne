# Prompt startowy do nowej sesji

Otwórz Claude Code **w katalogu `C:\Projects\jawne`** i wklej poniższy tekst.
Uzupełnij tylko nawiasy kwadratowe.

---

```
Pracujemy nad projektem "jawne" (serwis o Sejmie i publicznych pieniądzach
w gminach). Zanim cokolwiek zrobisz:

1. Przeczytaj CLAUDE.md i docs/plan.md — tam są zasady, zmierzone pułapki
   i to, co zrobione oraz co dalej.
2. Uruchom `npm run stan` i `npm run sudop:artefakty -- --import`.
3. Powiedz mi w trzech zdaniach, w jakim stanie są dane i co jest następne.

Cel tej sesji: FAZA 1 z docs/plan.md — serwer na AWS.
- Konto AWS: [założone / nie], alarm budżetowy: [ustawiony / nie]
- Region: eu-central-1 (Frankfurt), maszyna: [jeszcze nie ma / adres IP: …]
- Klucz API GUS: [mam, wpisałem do .env.local / jeszcze nie]
- Sprostowanie do UOKiK: [wysłane / niewysłane]

Przygotuj:
- docs/serwer.md — instrukcję krok po kroku z gotowymi poleceniami,
  które ja wykonam (założenie maszyny, SSH, instalacja, uruchomienie),
- skrypt instalacyjny i jednostki systemd dla zadań z planu
  (SUDOP dzienny, historia SUDOP nocą, Sejm, GUS, listy UE, strona testowa),
- sprawdzenie na serwerze: `npm run stan` i strona testowa działa.

Zasady bez wyjątków: SUDOP jedno zapytanie naraz, historia tylko nocą
20–30 zapytań na noc; żadnych sekretów w repozytorium; małe commity po
polsku; przed commitem tsc, testy i lint; na koniec zaktualizuj docs/plan.md.
Jeśli czegoś nie wiesz o moim koncie albo maszynie — zapytaj, nie zgaduj.
```

---

## Dlaczego tak

- **Katalog `jawne`**: tylko wtedy wczytuje się właściwy `CLAUDE.md`.
  Sesja otwarta w `C:\Projects\obywatel` dostaje zasady starego projektu.
- **Najpierw stan, potem praca**: nowa sesja nie pamięta poprzedniej
  rozmowy. Wie tyle, ile jest w repozytorium i w bazie — i to wystarcza.
- **Trzy zdania na start**: od razu widać, czy sesja dobrze zrozumiała
  stan projektu, zanim zacznie coś zmieniać.
