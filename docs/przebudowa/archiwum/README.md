# Archiwum przebudowy wyglądu — wszystkie motywy, które powstały po drodze

7 października 2026 Paweł wybrał dwie wersje: **Standardowy (J+G)**
i **Wypis z rejestru (A)**, z przełącznikiem „Wygląd” dla czytelnika
(`../kierunek.md`, `../prototyp/`). Wszystko inne jest tutaj — działające
i z planszami prezentacyjnymi, żeby dało się do tego wrócić.

Każdy prototyp otwiera się dwuklikiem (`prototyp/index.html`, bez budowania)
i ma własne fonty. Motyw wybiera pasek „Motyw” nad nagłówkiem albo `?k=…`
w adresie. Liczby we wszystkich rundach pochodzą z tych samych zrzutów
lokalnej budowy `main@414bc5d` z 04.10.2026.

## Runda 1 — dziesięć zupełnie różnych motywów (04.10.2026)

Prośba Pawła: „10 zupełnie różnych motywów … dopiero wtedy wybierzemy”.
Motywy różniły się naraz wyglądem i układem: G miał menu z boku i ciemny
tryb najpierw, I ramki i barwne tła na wszystkim, B winietę pośrodku.

| | |
|---|---|
| `runda-1/prototyp/` | stan z commitu `5892864`: 13 stron × A–J i A+B (`?k=ab`, margines z „Jak to liczymy”) |
| `runda-1/kierunek.md` | opis każdego motywu: pomysł, kroje i ich waga, paleta z kontrastem, czym różni się od strony z AI, ryzyko |
| `runda-1/plansze/` | Kraków na komputerze i telefonie, poseł i strona główna na telefonie — wszystkie motywy obok siebie |

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Wypis z rejestru | Monitor | Tablica | Kartoteka | Rocznik | Reportaż | Dyżur nocny | Atlas | Naklejka | Usługa publiczna |

## Runda 2 — te same dziesięć na wspólnym fundamencie F1–F14 (04.10.2026)

Decyzja Pawła po przeglądzie badań (`../badania-ux.md`): „przebudować
wszystkie motywy na nowo”. Fundament z badań (`../runda-2.md`) stał się
wspólny i obowiązkowy, a motyw został samą warstwą stylu. Każdy motyw
przeszedł pomiar F1–F14. Zmieniły się dwie nazwy: G „Dyżur nocny” to teraz
jasny „Pulpit”, a I „Naklejka” to „Plakat”.

| | |
|---|---|
| `runda-2/prototyp/` | 13 stron × A–J; fundament w `styl.css`, motywy w `skora-*.css`, pomiar w `pomiar.cjs` |
| `runda-2/kierunek.md` | fundament F1–F14 z tabelą pomiaru dla każdego motywu, rachunek zdań porównawczych, co każdy motyw zmienił względem rundy 1 i dlaczego, propozycja A, J, F |
| `runda-2/plansze/` | Kraków (komputer, telefon), poseł (jasny i ciemny), głosowanie, firma i strona główna na telefonie — wszystkie motywy obok siebie |

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Wypis z rejestru | Monitor | Tablica | Kartoteka | Rocznik | Reportaż | Pulpit | Atlas | Plakat | Usługa publiczna |

## Co poszło dalej

| motyw | gdzie jest teraz |
|---|---|
| A „Wypis z rejestru” | wersja do wyboru: „Wypis z rejestru” |
| J „Usługa publiczna” | wersja domyślna: „Standardowy”, na każdej szerokości |
| G „Pulpit” | w „Standardowym” od 1280 px: spis działów z boku, „W liczbach” w polach, etykiety nad liczbami, liczby pismem maszynowym |
| B, C, D, E, F, H, I | tylko tutaj |

Jak oglądać plansze: to pierwsze ekrany stron, bez paska „Motyw” i ramki
prototypu, których w serwisie nie będzie. Na planszach rundy 1 motyw G jest
w trybie ciemnym, bo tak go wtedy zaprojektowano.
