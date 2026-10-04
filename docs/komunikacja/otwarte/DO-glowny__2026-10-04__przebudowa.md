Od: przebudowa   Do: glowny (dla Pawła)   Data: 2026-10-04
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#2)

# Przebudowa wyglądu i nawigacji — gotowe do wyboru (wersja po zrzutach)

**W `docs/przebudowa/`:** `przeglad.md` (dział 0: zmierzone na Twoich
zrzutach), `kierunek.md` (3 kierunki), `nawigacja.md` (menu, okruszek,
szablony 7 stron), `teksty.md` (10 zmian + błędy w tekście), `prototyp/`
na prawdziwych liczbach: główna, Kraków, A. Adamczyk, PGE GiEK.

**Rekomendacja.** Kierunek A „Wypis z rejestru”: strona jako wypis
z ponumerowanymi działami i „podstawą” przy każdej liczbie — forma mówi
„to odpis z rejestru, nie opinia”. Jeden wzór „wiersza rejestru”
(etykieta · wartość · mianownik · podstawa) zamiast kart, odpowiedź
w ramce „W liczbach” na pierwszym ekranie, metodologia zwinięta. Menu bez
rozwijania (Sejm | Pieniądze publiczne), stałe pole szukania, jeden okruszek.

**Do poprawy w `src/` niezależnie od kierunku** (szczegóły w `przeglad.md`,
dział 0):
1. Warunki UOKiK na `/firma` po 50 przypadkach, na `/pomoc-publiczna`
   na końcu strony — zasada 10 każe „tuż przy liczbach”.
2. Warunki UOKiK na stronie Krakowa bez daty pobrania.
3. „jestw rejestrze” na stronie posła (2×, `PytaniaPosla`).
4. „2496 gmin” na głównej wobec „2479” na `/gminy`.

**Pytania do Pawła:**
1. Kierunek: A, B, C czy mieszanka?
2. Nazwa w nagłówku i tytule: „jawne” czy „zrejestru”?
3. Nowa trasa `/firmy` zamiast „Firmy” → `/szukaj`?
4. Fonty +40 kB (Brygada 1918 + IBM Plex) — akceptowalne?
5. Warunki UOKiK: zawsze pełna treść przy danych, czy wolno jedną linię
   z rozwinięciem (zależy od instrukcji UOKiK, zbiór 6068)?
