# Plan i pomysły

Żywy dokument. Zapis z 18.09.2026, uzupełniany (ostatnio 19.09.2026: faza 1
przygotowana). Trzy części: **blokery przed premierą**,
**kolejne kroki** (uzgodnione), **pomysły** (do oceny). Skreślone wpisy zostają
z datą — chcemy widzieć, co odrzuciliśmy i dlaczego.

---

## Jak zacząć nową sesję

1. Otwórz Claude Code **w katalogu `C:\Projects\jawne`** — wtedy automatycznie
   wczytuje się `CLAUDE.md` tego projektu (w `C:\Projects\obywatel` wczytuje
   się stary).
2. `npm run stan` — co mamy, czego brakuje, jakim poleceniem to dociągnąć.
3. Ten plik — co jest zrobione, co następne.

Długa rozmowa to nie pamięć projektu. Wszystko, co trzeba wiedzieć, jest
w `CLAUDE.md` i w `docs/`; nowa sesja jest tańsza i nie traci niczego ważnego.

---

## Przed premierą — blokery

Serwis ma dziś `robots: { index: false }` w `src/app/layout.tsx`.
Zdjęcie tego jest ostatnim krokiem, nie pierwszym.

| | Co | Dlaczego blokuje | Stan |
|---|---|---|---|
| 1 | **Adres e-mail do kontaktu** (`JAWNE_KONTAKT`) | Bez drogi zgłoszenia sprzeciwu (art. 21 RODO) nie pokazujemy nazwisk osób fizycznych — próg kwotowy jest wyłączony w kodzie. To jedyna rzecz, która dziś wstrzymuje działanie progu | **czekamy na adres Pawła** |
| 2 | **Polityka prywatności** | Wymagana, gdy przetwarzamy dane osobowe (art. 13–14 RODO): kto jest administratorem, po co, na jakiej podstawie, jak długo, jakie prawa | do napisania |
| 3 | **Test równowagi na piśmie** | Podstawą jest uzasadniony interes (art. 6 ust. 1 lit. f). Test trzeba mieć *przed* publikacją, nie po pytaniu z UODO | do napisania, szkic w [nazwiska.md](nazwiska.md) |
| 4 | **Domena i `JAWNE_ADRES_SERWISU`** | Bez tego podglądy linków wskazują na `localhost` | do kupienia |
| 5 | **Decyzja o `noindex`** | Zdejmujemy dopiero, gdy 1–4 są gotowe | świadoma decyzja Pawła |
| 5a | **Klucz API GUS BDL** (darmowy, portal api.stat.gov.pl) | Bez klucza 100 zapytań na 15 minut — import jest 5 razy wolniejszy. Rejestrację robi Paweł; klucz do `.env.local` jako `GUS_BDL_KLUCZ`, na serwerze `sudo jawne ustaw GUS_BDL_KLUCZ` | do zrobienia (19.09: w `.env.local` go nie ma) |
| 6 | ~~**Obrazki podglądu linku dla stron gmin**~~ | Mamy je dla głosowań i posłów; strona gminy jest teraz najbardziej „udostępnialna” | **zrobione 19.09.2026**: nazwa, powiat, dochody i UE na mieszkańca, każda liczba z mianownikiem |

---

## Usterki — zgłoszone, niepilne

| | Co | Zgłoszone |
|---|---|---|
| U1 | **Na telefonie stronę da się przesunąć w bok** — coś jest szersze niż ekran, przez co treść wygląda na uciętą. Szukać przez ramkę `<iframe style="width:390px">` (pułapka 17 w `CLAUDE.md`), sprawdzić szerokie tabele, `min-width` i długie liczby | Paweł, 20.09.2026 — „raczej na koniec listy” |
| U2 | **Do gminy i firmy dochodzi się tylko wyszukiwarką albo z innej strony.** W nawigacji są cztery pozycje (Okręgi, Posłowie, Głosowania, Pomoc publiczna); spisu gmin nie ma nigdzie. Wyszukiwarka na stronie głównej działa, ale czytelnik musi wiedzieć, że ma czegoś szukać | Paweł, 20.09.2026 |

---

## Kolejne kroki — uzgodnione 18.09.2026

1. **Dokończyć pieniądze w gminie.**
   - ~~budżety za kilka lat wstecz~~ — **zrobione 19.09.2026**: import `--lata=N`
     ze wznawianiem, na stronie gminy „rok po roku” (dochody i wydatki majątkowe,
     dwa osobne wykresy, kwoty nominalne z adnotacją o inflacji),
   - na co gmina wydaje (oświata, drogi, pomoc społeczna) — GUS BDL ma to
     w podziale na działy (temat P2920 i osobne tematy P2635–P2644), więc
     nie trzeba plików Ministerstwa Finansów. **Wstrzymane 19.09.2026 przez
     limit GUS: 1 000 zapytań na 12 godzin** — import 12 działów to ok. 480
     zapytań, wejdzie po odnowieniu limitu,
   - udziały gmin w PIT i CIT (zbiory 3313, 1878).
2. ~~**Krajowy przegląd pomocy publicznej.**~~ **Zrobione 19.09.2026** —
   `/pomoc-publiczna`: kto udziela, na co, w jakiej formie, jakim firmom,
   województwa na mieszkańca, największe przypadki. Liczone WYŁĄCZNIE z dni
   pobranych dla całego kraju (historia gmin pokazowych nie jest wmieszana).
   Pierwszy wniosek z danych: mikroprzedsiębiorstwa to 86 % przypadków, ale
   27 % pieniędzy; duże firmy — 2 % przypadków i 42 % pieniędzy.
3. ~~**Dane do pobrania przez czytelnika**~~ **Zrobione 19.09.2026** —
   `/gmina/{teryt}/csv/{budzet|fundusze|pomoc}`. Format pod polskiego Excela
   (średnik, przecinek dziesiętny, UTF-8 z BOM). Te same zakresy i ta sama
   reguła nazw co strona; NIP tylko razem z jawną nazwą.
4. **Pełniejsza strona firmy.** Dziś pomoc publiczna z SUDOP. Dołożyć:
   - zamówienia publiczne z TED — **zmierzone 19.09.2026: wyszukiwanie po NIP
     wykonawcy działa** (`winner-identifier`). Zamiast pytać TED przy każdym
     wejściu na stronę: import wszystkich polskich ogłoszeń o udzieleniu
     zamówienia do lokalnej tabeli i złączenie po NIP. To samo da potem
     „zamówienia w gminie” (po zamawiającym). Kwota ogłoszenia obejmuje
     wszystkie części i wykonawców — trzeba zejść do poziomu części albo
     pokazywać ją z tym zastrzeżeniem,
   - identyfikatory z GLEIF (43 030 polskich podmiotów, pole `registeredAs` to KRS),
   - projekty unijne dopasowane po nazwie (listy FE nie mają NIP-u — dopasowanie
     po nazwie musi mieć próg pewności i być oznaczone jako niepewne).

---

## Serwer testowy na AWS — plan z 19.09.2026

Paweł ma okres próbny AWS: 6 miesięcy i 200 USD kredytu. Cele: pobieranie
danych bez komputera Pawła i bez limitu czasu GitHub Actions (nocny przebieg
z 19.09 trwał 1 h 50 min przy limicie 150 min), oraz strona testowa pod
adresem, który można komuś pokazać.

**Decyzje**
- Jedna maszyna EC2 na ARM (np. `t4g.small`: 2 vCPU, 2 GB RAM) w regionie
  `eu-central-1` (Frankfurt) i dysk gp3 ok. 60 GB. ~~Rząd wielkości 15–20 USD~~
  **ok. 23–24 USD miesięcznie** (poprawka 19.09: szacunek pomijał opłatę
  za publiczny IPv4, ok. 3,7 USD) — przed założeniem sprawdzić w kalkulatorze AWS.
- Na serwerze: Node 24, repozytorium z GitHuba, `dane/` na dysku maszyny,
  `next build && next start` za Caddy (HTTPS sam, gdy będzie domena).
- Build produkcyjny sam włącza filtr nazwisk; `noindex` zostaje.
- Harmonogram przez systemd timers:
  - SUDOP dzienny: świeży dzień + dzień sprzed 14 dni,
  - **SUDOP historia: tylko w nocy, jedno zapytanie naraz, 20–30 zapytań
    na noc** — ok. 2 tys. zapytań w 2–3 miesiące. Serwer nie zmniejsza
    obciążenia urzędu; zmniejsza je tylko tempo. Sprostowanie do UOKiK
    prosi właśnie o wskazanie dopuszczalnego tempa. **Decyzja Pawła
    z 19.09.2026: od pierwszej nocy serwera**, 25 zapytań, okno 01:00–06:00,
  - **strona testowa otwarta dla każdego, kto zna adres** (decyzja Pawła
    z 19.09.2026); `noindex` zostaje, nazwy osób fizycznych ukryte do czasu
    `JAWNE_KONTAKT`,
  - Sejm codziennie, listy UE i GUS co miesiąc.
- GitHub Actions wyłączyć po uruchomieniu serwera — inaczej pytamy urząd
  dwa razy o to samo.
- Bezpieczeństwo: klucz SSH, port 22 tylko z IP Pawła, 80/443 publicznie,
  automatyczne aktualizacje, sekrety w pliku na serwerze, nie w repozytorium.

### Plan działania

**Faza 0 — Paweł, ok. godziny**
- ~~konto AWS~~ **jest (19.09)**; **alarm budżetowy (10 i 50 USD) — jeszcze
  nie**, to krok 1 w [`serwer.md`](serwer.md),
- klucz API GUS — jeszcze nie (`sudo jawne ustaw GUS_BDL_KLUCZ` na serwerze),
- sprostowanie do UOKiK (`docs/uokik-sprostowanie.md`) — stan niepotwierdzony
  w sesji 19.09.

**Faza 1 — sesja z Pawłem: serwer i dane.** Prompt: [`start-sesji.md`](start-sesji.md).
- ~~`docs/serwer.md` z gotowymi poleceniami, skrypt instalacyjny, jednostki
  systemd dla danych, strona testowa za Caddy.~~ **Przygotowane 19.09.2026:**
  [`serwer.md`](serwer.md) (kroki 0–9), `deploy/instaluj.sh`, `deploy/zadanie.sh`,
  5 timerów + strona w `deploy/systemd/`, `sudo jawne stan|plan|logi|uruchom|
  sprawdz|aktualizuj|wgraj|ustaw`, `npm run paczka-na-serwer`.
  W kodzie: tryby `sudop.ts --dzienny` i `--historia` (plan nocy w
  `ingest/lib/harmonogram.ts`, limit 1–30 i okno godzin pilnowane w kodzie),
  kontrola stron z różnych chwil, strony odświeżane co godzinę (ISR).
- Sprawdzone w kontenerze Ubuntu 24.04 z systemd, bez zapytań do urzędów
  (lista w `serwer.md`, ostatnia sekcja). Fałszywy serwer SUDOP: strona 1
  z dysku (62 177) wobec nowych (62 500) → rozjazd wykryty, strona 1 pobrana
  ponownie, strona 2 wzięta z dysku; limit 4 zatrzymał przebieg z czterema
  stronami na dysku; drugi przebieg (limit 3) wziął s1–s4 z dysku, dopytał
  o s5–s7 i zapisał 62 500 przypadków — dokładnie liczbę wyników, bez
  duplikatów — a na następnym zakresie stanął na limicie przed zapytaniem.
- **Serwer stoi od 20.09.2026:** `t4g.small` (ARM), Ubuntu 24.04,
  `eu-central-1`, strona pod `https://52-29-50-167.sslip.io` z certyfikatem
  Let's Encrypt. Budowa 512 stron w 51 s, `jawne sprawdz` 12 × OK, pięć
  timerów włączonych. Pierwsza noc z pobieraniem: **21.09.2026**.
  (Pierwsza maszyna powstała omyłkowo w `us-east-1` i została skasowana —
  dane osobowe z SUDOP nie zostają poza EOG.)
- **Pierwsza noc (21.09.2026) przepracowana:** 25 zapytań w 59 minut, 41 dni
  historii, ok. 213 tys. przypadków, 381 031 w bazie. Kontrola spójności stron
  zadziałała na żywym urzędzie. Zadanie `sejm` padło o 07:15 na awarii API
  (`clubs -> HTTP 404`, cała gałąź `/sejm/*`); API wróciło tego samego dnia.
- **Decyzja Pawła z 21.09.2026: 50 zapytań na noc** zamiast 25 (urząd nie
  odpowiedział na pismo z 12.09). Zostaje ok. 45 nocy do pełnych 10 lat.
  Zmiana wymusiła przepisanie akapitu o tempie w
  [`uokik-sprostowanie.md`](uokik-sprostowanie.md) — pismo mówiło, że pobieramy
  tylko ręcznie pojedyncze gminy, co od 21.09 jest nieprawdą.
- **Zostało do zamknięcia fazy 1:** ~~wyłączenie GitHub Actions~~ (zrobione),
  48 godzin timerów bez błędu, klucz GUS (`sudo jawne ustaw GUS_BDL_KLUCZ`),
  przełączenie kredytów CPU na Standard, wysłanie sprostowania do UOKiK.
- GitHub Actions wyłączone, gdy serwer przejmie przyrost SUDOP — krok 8
  (`gh workflow disable sudop-przyrost.yml`); plik workflow zostaje, żeby dało
  się wrócić jednym poleceniem.
- **Gotowe, gdy:** timery działają 48 godzin bez błędu, `npm run stan` na
  serwerze nie pokazuje dziur, strona testowa odpowiada.

**Faza 2 — autopilot: Claude Code na serwerze co 5 godzin.**
Instrukcje stałe: [`autopilot.md`](autopilot.md) (projekt do zatwierdzenia).
- Timer systemd uruchamia Claude Code w trybie nieinteraktywnym z tym plikiem
  jako poleceniem. Każdy przebieg: stan danych → naprawy → jedno zadanie
  z planu → pull request → wpis w zgłoszeniu „Dziennik autopilota”.
- **Pobieranie danych robią timery, nie autopilot.** Model sprawdza, czy
  działa, i naprawia kod — nie wysyła zapytań do urzędów sam.
- Zmiany tylko przez pull request; scala Paweł.
- Najpierw tydzień próbny: 2 przebiegi na dobę, potem co 5 godzin.
- **Do potwierdzenia przy konfiguracji:**
  - sposób logowania Claude Code na serwerze (token subskrypcji albo klucz API),
  - dokładne flagi trybu nieinteraktywnego i lista dozwolonych narzędzi,
  - zużycie: przebieg co 5 godzin korzysta z tych samych limitów subskrypcji,
    z których Paweł pracuje sam.
- Bezpieczeństwo: token GitHub drobnoziarnisty, tylko do tego repozytorium
  (treść i pull requesty), bez uprawnień administratora.
- **Gotowe, gdy:** co najmniej 3 z 4 pull requestów przechodzą przegląd bez
  poprawek.

**Faza 3 — przegląd po dwóch tygodniach**
Jakość pull requestów, rachunek AWS i zużycie limitów, postęp historii
SUDOP. Na tej podstawie decyzja o częstotliwości autopilota i tempie danych.

**Rozważona alternatywa:** zaplanowane sesje Claude w chmurze Anthropic
(bez serwera). Pracują na repozytorium z GitHuba, ale nie widzą bazy ani
logów serwera — nie sprawdzą, jak idzie pobieranie. Dlatego autopilot
na serwerze, obok danych.

---

## Pomysły — do oceny

- **Porównywarka gmin w województwie.** Dochody, unijne pieniądze i pomoc
  publiczna na mieszkańca, sortowanie, link do konkretnego zestawienia.
  Ryzyko: łatwo zrobić z tego ranking „dobrych i złych gmin” — a to już ocena.
  Trzymamy się liczb z mianownikiem.
- **„Co nowego w mojej gminie”.** Skoro przyrost SUDOP jest dzienny, da się
  pokazać świeże wpisy, a docelowo powiadomienia e-mail dla gminy.
- **Okręg wyborczy jako klamra.** Ile pieniędzy trafia do okręgu i jak głosowali
  posłowie z tego okręgu. **Uwaga:** dane nie mówią, że to zasługa posła.
  Bez zdania sugerującego sprawczość.
- **Interpelacje poselskie** (23 846 w starej bazie Supabase) — mają temat
  i adresata, więc da się je powiązać z gminą albo tematem.
- **Proces legislacyjny** (1 681 procesów, 15 907 etapów w starej bazie) —
  „co się stało z ustawą” to jedna z trzech rzeczy z pierwotnego briefu,
  której dziś nie ma.
- **Oświadczenia majątkowe i rejestr korzyści posłów** — w dużej części skany,
  więc to praca ręczna z podwójną kontrolą. Wysoka wartość, wysoki koszt.
- **Rolnictwo: SRPP i dopłaty ARiMR.** Gminy wiejskie mają dziś mało treści:
  funduszy UE niewiele, pomocy publicznej też. Tam idą pieniądze rolne.
  Uwaga: to dane osobowe rolników — ta sama reguła progu.
- **CORDIS** (projekty Horizon z polskimi uczestnikami) — pieniądze, których
  nie ma w polskich listach, bo Komisja płaci beneficjentowi bezpośrednio.
- **Kohesio** — porównanie gminy z regionami w innych krajach UE.
- **Wersja dla mediów lokalnych**: gotowy, cytowalny akapit z liczbami o gminie
  plus odnośniki do rejestrów. To najtańsza droga do tego, żeby ktoś w ogóle
  te dane zobaczył.

---

## Odrzucone

- **TAM (unijny rejestr pomocy państwa)** — 18.09.2026. Polska z niego nie
  korzysta, publikuje w SUDOP i SRPP. Sprawdzone, ślepy zaułek.
- **CRBR (beneficjenci rzeczywiści)** — zawiera wyłącznie osoby fizyczne,
  a po wyroku TSUE (C‑37/20, C‑601/20) powszechny dostęp jest prawnie wątpliwy.
