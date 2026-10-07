Od: przebudowa   Do: glowny (dla Pawła)   Data: 2026-10-07
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#2)

# Paweł wybrał: dwie wersje wyglądu i przełącznik „Wygląd” dla czytelnika

**Decyzja (07.10.2026):** „ciężko mi się zdecydować, więc chcę zostawić oba”.
- **Standardowy (J+G)** — J „Usługa publiczna” na każdej szerokości.
  Od 1280 px dochodzą dodatki z G „Pulpit”:
  - spis działów w bocznym pasku;
  - „W liczbach” jako jedna ramka podzielona na pola;
  - etykiety nad liczbami;
  - liczby pismem maszynowym.
- **Wypis z rejestru (A)** — bez zmian względem rundy 2.

Domyślny jest Standardowy. To moje założenie: najbardziej typowy układ
najlepiej znosi pierwsze wejście z wyszukiwarki. Paweł może to zmienić.

**Co jest gotowe:**
- `docs/przebudowa/prototyp/` — 13 stron, obie wersje, przełącznik
  „Wygląd” w nagłówku. Przełącznik zmienia styl strony i jasność
  (zastępuje dzisiejszy ◐).
- Obie wersje spełniają F1–F14 (`docs/przebudowa/kierunek.md`):
  - 120 renderów bez przepełnienia i bez błędów;
  - cele dotykowe ≥ 24 px;
  - fonty: Standardowy 50 kB na telefonie i 79 kB na komputerze,
    Wypis z rejestru 142 kB.
- `docs/przebudowa/archiwum/` — obie rundy z działającymi prototypami,
  opisami i planszami. Wszystkie dziesięć motywów, na wypadek powrotu.
- `docs/przebudowa/plansze/` — plansze obu wybranych wersji.

**Jak to zbudować w `src/`** (szczegóły: `kierunek.md`, „Dla głównej sesji”):
1. Styl ustawiaj w `<head>` tym samym skryptem, którym dziś wraca `motyw`:
   `data-styl` z `localStorage.getItem('styl')`. **Nie z ciasteczka:**
   odczyt cookies w `layout.tsx` zrobiłby każdą stronę dynamiczną
   (pułapki 39 i 52).
2. W `globals.css`: `:root` = Standardowy, `:root[data-styl="a"]` = Wypis;
   reguły różniące wersje z przedrostkiem `[data-styl="a"]`. Jasność dalej
   przez `data-motyw` — obie osie są niezależne, a nazwy zmiennych zostają,
   więc `kontrast.test.ts` sprawdzi obie palety.
3. `next/font` z `preload: false` dla Plex Mono, Plex Sans i Brygady —
   przeglądarka pobierze je dopiero, gdy coś nimi zostanie napisane.
   Wstępnie tylko Public Sans 400 i 600.
4. Przełącznik zastępuje `PrzelacznikMotywu`, a nie dochodzi obok niego.

Lista poprawek w `src/` z `DO-glowny__2026-10-04__przebudowa.md` jest nadal
aktualna. Tę wiadomość i `DO-glowny__2026-10-04__runda-2.md` zamknij sam
(`git mv` do `zamkniete/`).
