# Decyzje Pawła — przebudowa wyglądu

| data | sprawa | decyzja | stan |
|---|---|---|---|
| 04.10.2026 | nazwa w nagłówku i tytule | **„zrejestru”** (Paweł: „raczej zrejestru”) | przyjęte w prototypie; „jawne” zostaje w kodzie i repozytorium |
| 04.10.2026 | trasa `/firmy` | **tak** — osobna strona szukania firm (nazwa albo NIP) zamiast „Firmy” → `/szukaj` | do wdrożenia przez główną sesję |
| 04.10.2026 | fonty | Paweł: „do przyjęcia”; **główna sesja potwierdziła**: dziś 221 kB, kierunek A 141 kB, czyli ok. 80 kB mniej (każdy z 10 motywów lżejszy niż dziś); fonty to pliki statyczne, bundlera nie obciążają (pułapka 58 — zmierzy przy wdrożeniu); wstępnie ładowane Plex Sans 400 i Brygada 600 | zamknięte (`DO-przebudowa__2026-10-04__fonty-i-poprawki.md`) |
| 04.10.2026 | motyw: najpierw dziesięć zupełnie różnych (A–J), z nich Paweł wybierze kilka do doprecyzowania | 10 motywów na każdej stronie prototypu (pasek „Motyw”, `?k=a` … `?k=j`, `prototyp/kierunki.html`) | zastąpione rundą 2 |
| 04.10.2026 | runda 2: „Bazując na tych danych trzeba przebudować wszystkie motywy na nowo” (po `badania-ux.md`) | wszystkie 10 przebudowane na wspólnym fundamencie F1–F14 (`runda-2.md`); każdy motyw spełnia F1–F14 w pomiarze (`kierunek.md`, `prototyp/pomiar.cjs`). G zmienił tożsamość na jasną i nazwę na „Pulpit”, I — na „Plakat”. Propozycja do wyboru: **A, J, F** (odważniej: I) | zamknięte wyborem z 07.10 |
| 07.10.2026 | wybór motywu | **dwie wersje i przełącznik „Wygląd” dla czytelnika**: Standardowy = J „Usługa publiczna” wszędzie, a od 1280 px dodatki z G „Pulpit” (spis działów z boku, „W liczbach” w polach, etykiety nad liczbami, liczby pismem maszynowym), oraz Wypis z rejestru = A. Paweł: „ciężko mi się zdecydować, więc chcę zostawić oba”. Obie spełniają F1–F14 (`kierunek.md`) | przyjęte w prototypie; do wdrożenia przez główną sesję |
| 07.10.2026 | który styl domyślny | moje założenie: **Standardowy (J+G)** — najbardziej typowy układ przy pierwszym wejściu z wyszukiwarki | do potwierdzenia przez Pawła |
| 07.10.2026 | pozostałe motywy | archiwum z działającymi prototypami obu rund, opisami i planszami: `archiwum/` | zrobione |
| — | warunki UOKiK zwinięte do jednej linii | bez odpowiedzi | czeka |
