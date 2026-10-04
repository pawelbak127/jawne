Od: przebudowa   Do: glowny (dla Pawła)   Data: 2026-10-04
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#2)

# Przebudowa wyglądu i nawigacji — gotowe do wyboru (wersja po zrzutach)

**W `docs/przebudowa/`:** `przeglad.md` (dział 0: zmierzone na Twoich
zrzutach), `kierunek.md` (7 kierunków), `nawigacja.md` (menu, okruszek,
szablony wszystkich stron), `teksty.md` (10 zmian + błędy w tekście), `prototyp/`
na prawdziwych liczbach: 13 stron, każda w 7 kierunkach stylu
(`prototyp/kierunki.html`).

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
5. Głosowanie bez wyniku (przyjęto/odrzucono) — przy wecie (3/5)
   „232 za, 200 przeciw” czyta się jak przyjęcie. Czy rejestr to podaje?
6. `/stan` pokazuje notatki importu („nie licze od nowa”, „368846929288 zl”).

**Decyzje Pawła** (`docs/przebudowa/decyzje.md`): nagłówek „zrejestru”,
nowa trasa `/firmy`; waga fontów — prośba do Ciebie w
`DO-glowny__2026-10-04__decyzje-pawla.md`. Czeka: wybór kierunku
i warunki UOKiK (pełna treść czy jedna linia z rozwinięciem — zależy od
instrukcji UOKiK, zbiór 6068).
