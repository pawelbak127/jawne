# Plan i pomysły

Żywy dokument. Zapis z 18.09.2026. Trzy części: **blokery przed premierą**,
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
| 5a | **Klucz API GUS BDL** (darmowy, portal api.stat.gov.pl) | Bez klucza 100 zapytań na 15 minut — import jest 5 razy wolniejszy. Rejestrację robi Paweł; klucz do `.env.local` jako `GUS_BDL_KLUCZ` | do zrobienia |
| 6 | ~~**Obrazki podglądu linku dla stron gmin**~~ | Mamy je dla głosowań i posłów; strona gminy jest teraz najbardziej „udostępnialna” | **zrobione 19.09.2026**: nazwa, powiat, dochody i UE na mieszkańca, każda liczba z mianownikiem |

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
  `eu-central-1` (Frankfurt) i dysk gp3 ok. 60 GB. Rząd wielkości 15–20 USD
  miesięcznie — przed założeniem sprawdzić w kalkulatorze AWS.
- Na serwerze: Node 24, repozytorium z GitHuba, `dane/` na dysku maszyny,
  `next build && next start` za Caddy (HTTPS sam, gdy będzie domena).
- Build produkcyjny sam włącza filtr nazwisk; `noindex` zostaje.
- Harmonogram przez systemd timers:
  - SUDOP dzienny: świeży dzień + dzień sprzed 14 dni,
  - **SUDOP historia: tylko w nocy, jedno zapytanie naraz, 20–30 zapytań
    na noc** — ok. 2 tys. zapytań w 2–3 miesiące. Serwer nie zmniejsza
    obciążenia urzędu; zmniejsza je tylko tempo. Sprostowanie do UOKiK
    prosi właśnie o wskazanie dopuszczalnego tempa,
  - Sejm codziennie, listy UE i GUS co miesiąc.
- GitHub Actions wyłączyć po uruchomieniu serwera — inaczej pytamy urząd
  dwa razy o to samo.
- Bezpieczeństwo: klucz SSH, port 22 tylko z IP Pawła, 80/443 publicznie,
  automatyczne aktualizacje, sekrety w pliku na serwerze, nie w repozytorium.

**Kto co robi**
- Paweł: konto AWS, **alarm budżetowy (np. 10 i 50 USD) jako pierwszy krok**,
  utworzenie instancji według instrukcji, podanie adresu.
- Claude (następna sesja): `docs/serwer.md` z gotowymi poleceniami, skrypt
  instalacyjny, jednostki systemd, harmonogram historii SUDOP.

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
