# Serwer testowy na AWS — krok po kroku

Zapis z 19.09.2026. Faza 1 z [`plan.md`](plan.md). Wykonuje Paweł; każdy krok
ma oznaczone **gdzie**: 🖥 komputer (PowerShell w `C:\Projects\jawne`),
☁ konsola AWS w przeglądarce, 🐧 serwer (po `ssh jawne`).

Całość: ok. 1,5 godziny, z czego większość to czekanie.

**Co dostajemy:** maszynę, która co noc pobiera SUDOP (dzień dzienny i 150 zapytań
historii), codziennie Sejm, co miesiąc GUS i listy UE — i stronę testową pod
adresem `https://<ip-z-myślnikami>.sslip.io`. Strona ma `noindex`, a nazwy osób
fizycznych są ukryte (nie ma jeszcze `JAWNE_KONTAKT`).

---

## Koszt — szacunek do sprawdzenia

Z cennika, który znam (Frankfurt, na żądanie). **Ceny się zmieniają —
sprawdź w [kalkulatorze AWS](https://calculator.aws) przed krokiem 4.**

| Co | Miesięcznie |
|---|---:|
| maszyna `t4g.small` (2 vCPU ARM, 2 GB RAM) | ok. 14 USD |
| dysk 60 GB gp3 | ok. 5,7 USD |
| publiczny adres IPv4 (AWS liczy go od 2024 r. osobno) | ok. 3,7 USD |
| **razem** | **ok. 23–24 USD** |

Plan zakładał 15–20 USD — nie liczył opłaty za adres IPv4. Sześć miesięcy to
ok. 140 USD z kredytu 200 USD. **Sprawdź w konsoli (Billing → Credits / Free
Tier), co dzieje się z kontem po 6 miesiącach albo po wyczerpaniu kredytu** —
tego nie wiem na pewno dla Twojego planu.

---

## Kolejność w skrócie

| # | Gdzie | Co |
|---|---|---|
| 0 | 🖥 | wypchnij kod na GitHub |
| 1 | ☁ | alarmy budżetowe 10 i 50 USD |
| 2 | 🖥 | klucz SSH |
| 3 | ☁ | import klucza |
| 4 | ☁ | maszyna |
| 5 | ☁ | stały adres IP |
| 6 | 🖥 | połączenie SSH |
| 7 | 🐧 | instalacja |
| 8 | 🖥→🐧 | wyłączenie GitHub Actions, dane z komputera |
| 9 | 🐧 | sprawdzenie |

---

## 0. Kod na GitHubie 🖥

Serwer pobiera repozytorium z GitHuba, więc skrypty z tej sesji muszą tam być.

```powershell
git push
```

## 1. Alarmy budżetowe ☁

Pierwszy krok, zanim cokolwiek zacznie kosztować. Przy okazji: **włącz MFA
na koncie głównym** (prawy górny róg → Security credentials → Assign MFA
device). Przejęte konto AWS z kartą to najczęściej rachunek za cudzą
koparkę kryptowalut. Kluczy dostępowych (access keys) dla konta głównego nie
twórz — nie są potrzebne.

1. Konsola AWS → wyszukaj **Budgets** → **Create budget**.
2. **Customize (advanced)** → **Cost budget** → Next.
3. Name: `jawne-10usd`, Period: **Monthly**, Budget renewal: **Recurring**,
   Budgeting method: **Fixed**, Amount: **10**.
4. **Advanced options** → Supported charge types: **odznacz „Credits”**
   (i „Refunds”). Inaczej kredyt 200 USD zeruje koszt i alarm nigdy nie
   zadzwoni, choć kredyt będzie się wyczerpywał.
5. Next → **Add an alert threshold**: 100 %, **Actual**, Twój e-mail → Next → Create.
6. Powtórz dla `jawne-50usd` z kwotą **50**.

Jeśli konsola wygląda inaczej, trzymaj się sensu: kwota, e-mail, bez
odliczania kredytów.

## 2. Klucz SSH 🖥

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\jawne_aws -C "pawel@jawne-aws"
Get-Content $HOME\.ssh\jawne_aws.pub | Set-Clipboard
```

Ustaw hasło do klucza, gdy zapyta — bez niego kradzież pliku daje dostęp do
serwera. Plik `jawne_aws` (bez `.pub`) **nigdy nie opuszcza komputera**;
do AWS idzie tylko część publiczna, która jest teraz w schowku.

## 3. Import klucza ☁

1. Prawy górny róg konsoli: region **Europe (Frankfurt) eu-central-1**.
2. **EC2** → Network & Security → **Key Pairs** → Actions → **Import key pair**.
3. Name: `jawne-pawel`, wklej (Ctrl+V) → **Import key pair**.

## 4. Maszyna ☁

**EC2** → Instances → **Launch instances**:

| Pole | Wartość |
|---|---|
| Name | `jawne` |
| Application and OS Images | **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**, Architecture **64-bit (Arm)**. **Nie „Ubuntu Pro”** — jest płatne za godzinę |
| Instance type | **t4g.small** |
| Key pair | `jawne-pawel` |
| Network settings → Edit | VPC: domyślny; Subnet: No preference; Auto-assign public IP: **Enable** |
| Firewall | **Create security group**, nazwa `jawne-sg`; reguły: **SSH 22 — My IP**, **HTTP 80 — Anywhere**, **HTTPS 443 — Anywhere**. Nic więcej |
| Configure storage | **60** GiB, **gp3** (IOPS 3000, throughput 125 — domyślne); Advanced → Encrypted: **Encrypted**, klucz `aws/ebs`; Delete on termination: Yes |
| Advanced details → IAM instance profile | **brak** — serwer nie potrzebuje dostępu do API AWS |
| Advanced details → Termination protection | **Enable** |
| Advanced details → Detailed CloudWatch monitoring | **Disable** (płatne) |
| Advanced details → Credit specification | zostaw domyślne (**Unlimited**); po instalacji przełącz na Standard (krok 9) |
| Advanced details → Metadata accessible / version | **Enabled** / **V2 only (token required)** — `instaluj.sh` czyta stąd publiczny IP |
| Advanced details → User data | **puste** — instalację uruchamiasz sam, widząc każdy krok |
| Summary → Number of instances | **1** |

→ **Launch instance**. Pozostałe pola zostaw domyślne.

- Port 80 musi być otwarty: przez niego Caddy dostaje certyfikat HTTPS.
- **Nie otwieraj** portu 22 dla „Anywhere” ani portu 3000 — strona idzie
  wyłącznie przez Caddy.
- Szyfrowanie dysku nic nie kosztuje, a na dysku będą surowe odpowiedzi SUDOP
  z danymi osobowymi.
- Jeśli kreator nie pozwoli wybrać `t4g.small` (ograniczenia planu próbnego) —
  zatrzymaj się i napisz mi, co pokazuje. Nie wybieraj większej maszyny na ślepo.

## 5. Stały adres IP ☁

Bez tego adres zmienia się przy każdym zatrzymaniu maszyny — a z nim adres
strony i certyfikat.

1. **EC2** → Network & Security → **Elastic IPs** → **Allocate Elastic IP address** → Allocate.
2. Zaznacz nowy adres → Actions → **Associate Elastic IP address** →
   Instance: `jawne` → **Associate**.
3. Zapisz adres, np. `3.121.45.67`. Dalej w tekście: `<IP>`.

Adres przypięty do maszyny kosztuje tyle co zwykły publiczny (w tabeli wyżej).
**Nieprzypiętego nie zostawiaj** — też kosztuje.

## 6. Połączenie SSH 🖥

W poleceniu zamień `<IP>` na adres z kroku 5:

```powershell
Add-Content $HOME\.ssh\config "`nHost jawne`n    HostName <IP>`n    User ubuntu`n    IdentityFile ~/.ssh/jawne_aws`n"
ssh jawne
```

Przy pierwszym połączeniu SSH zapyta `Are you sure you want to continue
connecting` — wpisz `yes`. Znak zachęty `ubuntu@ip-…:~$` znaczy, że jesteś
na serwerze.

## 7. Instalacja 🐧

```bash
sudo git clone https://github.com/pawelbak127/jawne.git /srv/jawne
sudo bash /srv/jawne/deploy/instaluj.sh
```

Trwa 5–10 minut. Instaluje Node 24, Caddy, swap 2 GB, automatyczne
aktualizacje bezpieczeństwa, użytkownika `jawne` i zależności. Zakłada
`/etc/jawne/jawne.env` z adresem `<ip-z-myślnikami>.sslip.io` i pustymi polami
na klucze.

**Kończy się komunikatem „Brak bazy danych” — tak ma być.** Harmonogram
jeszcze nie działa. Skrypt można uruchamiać wielokrotnie; jeśli pokaże
`BLAD w kroku …`, skopiuj mi ostatnie 30 linii.

## 8. Dane z komputera 🖥 → 🐧

Baza jedzie z komputera, a nie z importu od zera: na komputerze są już
pobrane dni SUDOP, a ich ponowne pobranie to zapytania do UOKiK.

**Najpierw wyłącz GitHub Actions** — od tej nocy SUDOP pobiera serwer.
Gdyby działały oba, urząd dostałby te same zapytania dwa razy.

🖥 w `C:\Projects\jawne`, po kolei:

```powershell
gh workflow disable sudop-przyrost.yml
npm run sudop:artefakty -- --import
npm run paczka-na-serwer
scp dane/do-serwera.tgz jawne:/tmp/
Remove-Item dane\do-serwera.tgz
```

- `paczka-na-serwer` odmówi, jeśli na komputerze trwa pobieranie z SUDOP —
  poczekaj, aż skończy.
- Paczka (ok. 80 MB) zawiera dane osobowe z SUDOP; stąd `Remove-Item` od razu
  po wysłaniu.

🐧 na serwerze:

```bash
sudo jawne wgraj /tmp/do-serwera.tgz
```

Rozpakowuje bazę, usuwa paczkę z `/tmp`, buduje stronę (kilka minut) i włącza
harmonogram. Na końcu wypisuje tabelę timerów i adres strony.

**Od tej chwili źródłem danych jest serwer.** Nie importuj już SUDOP na
komputerze — dni pobrane tam nie trafią na serwer, a serwer zapyta o nie
urząd ponownie. Świeżą kopię bazy do pracy lokalnej ściągniesz z serwera
(„Kopia z serwera” niżej).

## 9. Sprawdzenie 🐧

```bash
sudo jawne stan
sudo jawne sprawdz
sudo jawne plan
```

- `stan` — `npm run stan`, timery (najbliższy SUDOP dziś o 22:00), wynik
  ostatnich przebiegów, dysk.
- `sprawdz` — sześć stron lokalnie i pod adresem publicznym: `OK`, tytuł,
  obecny `noindex`. Na końcu „Wszystko odpowiada.”
- `plan` — co pobierze najbliższa noc, bez pytania urzędu.

Otwórz w przeglądarce adres z `sudo jawne stan` → `/stan` albo z końca
kroku 8 (`https://<ip-z-myślnikami>.sslip.io`).

☁ Po udanym sprawdzeniu: **EC2 → Instances → `jawne` → Actions → Instance
settings → Change credit specification → odznacz Unlimited (= Standard)**.
Instalacja i budowa potrzebowały pełnej mocy; potem obciążenie jest lekkie,
a w trybie Standard zawieszony proces zwalnia maszynę zamiast dopisywać
opłaty za dodatkowy czas procesora.

**Przyślij mi wynik `sudo jawne stan` i `sudo jawne sprawdz`** — po pierwszej
nocy także `sudo jawne logi sudop-historia`.

**Faza 1 gotowa, gdy:** timery działają 48 godzin bez błędu (`stan` →
„Ostatnie przebiegi”: `success`), `npm run stan` nie pokazuje nowych dziur,
strona odpowiada.

---

## Co serwer robi sam

| Kiedy (czas polski) | Zadanie | Zapytań do urzędu |
|---|---|---|
| codziennie 22:00 | SUDOP: wczoraj (świeży) i dzień sprzed 14 dni (ustalony; pomijany, jeśli już ustalony) | 0–2 |
| codziennie 22:20 | SUDOP noc: przerwane zakresy → dni do odświeżenia → dziury → historia tygodniami wstecz | **najwyżej 150**, tylko 22:00–07:00 |
| codziennie 07:15 | Sejm: kluby, posłowie, głosowania, głosy, wyliczenia; w poniedziałki zdjęcia | — |
| 3. dnia miesiąca 10:00 | GUS BDL: ludność i budżety gmin | — |
| 5. dnia miesiąca 10:00 | listy projektów FE z dane.gov.pl | — |

Zasady wbudowane w kod, nie tylko w harmonogram:

- **Jedno zapytanie do SUDOP naraz.** Zadania czekają na siebie (`flock`),
  a `sudop.ts` ma własną blokadę z PID-em.
- **Historia tylko poza godzinami pracy urzędu.** Poza oknem 22:00–07:00 `sudop.ts` nie zacznie
  zapytania, nawet uruchomiony ręcznie. Limit powyżej 150 odrzuca.
- **Strony z różnych nocy się nie sklejają.** Wznowiony zakres sprawdza, czy
  każda strona ma tę samą liczbę wyników co pierwsza; jeśli nie — starsze
  strony pobiera ponownie.
- Strony odświeżają się same co godzinę (ISR) — nocny import nie wymaga
  przebudowy.

Pełna historia 10 lat to ok. 2 900 zapytań — szacunek ze zmierzonego rozkładu
lat, bo 2020 ma pięciokrotność zwykłego roku — czyli **20–30 nocy**.

---

## Codzienna obsługa 🐧

| Polecenie | Co robi |
|---|---|
| `sudo jawne stan` | dane, timery, wynik ostatnich przebiegów, dysk |
| `sudo jawne logi sudop-historia` | dziennik zadania (też: `sudop-dzien`, `sejm`, `gus`, `fundusze`, `strona`) |
| `sudo jawne plan` | co pobierze najbliższa noc |
| `sudo jawne uruchom sejm` | zadanie teraz, z czekaniem na koniec |
| `sudo jawne sprawdz` | czy strona odpowiada |
| `sudo jawne aktualizuj` | `git pull` i przebudowa (strona kilka minut niedostępna) |
| ⚠ nie rób | `git pull`, `npm`, `sudo chown` ręcznie w `/srv/jawne` — katalog należy do użytkownika `jawne`, a ręczne polecenia zabierają mu go i strona traci prawo zapisu |
| `sudo jawne ustaw GUS_BDL_KLUCZ` | wpis klucza — pyta o wartość, nie zostaje w historii |
| `sudo jawne kopia` | kopia bazy i odpowiedzi SUDOP do ściągnięcia na komputer |

**Klucz GUS**, gdy go dostaniesz: `sudo jawne ustaw GUS_BDL_KLUCZ`, potem
`sudo jawne uruchom gus`. **Adres kontaktowy** (bloker 1):
`sudo jawne ustaw JAWNE_KONTAKT`, potem `sudo jawne aktualizuj` — dopiero wtedy
zaczyna działać próg jawności nazw. **Domena** (bloker 4): rekord A domeny na
`<IP>`, `sudo jawne ustaw JAWNE_HOST` (sama nazwa, bez `https://`),
`sudo jawne aktualizuj`.

**Zmieniło się Twoje IP w domu** i `ssh jawne` wisi: ☁ EC2 → Security Groups →
grupa maszyny → Edit inbound rules → reguła SSH → Source: **My IP** → Save.

### Kopia z serwera 🖥

Surowe odpowiedzi SUDOP to jedyne dane, których odtworzenie kosztuje urząd.
Raz w miesiącu — 🐧 potem 🖥:

```bash
sudo jawne kopia
```

Wypisze dwa polecenia z dzisiejszą datą, np.:

```powershell
scp jawne:/tmp/jawne-kopia-2026-10-01.tgz .
ssh jawne rm /tmp/jawne-kopia-2026-10-01.tgz
```

W środku: `sejm-z-serwera.db` (spójna kopia bazy) i `zrodla/sudop/`.
Nie ściągaj przez `ssh … > plik` — Windows PowerShell przekodowuje wtedy
bajty jak tekst i archiwum jest uszkodzone.

Plik zawiera dane osobowe — trzymaj go poza repozytorium i poza chmurą
publiczną. Migawki dysku w AWS (Data Lifecycle Manager) są wygodniejsze, ale
kosztują — to decyzja o rachunku, nie techniczna.

---

## Bezpieczeństwo — co jest ustawione

- SSH tylko kluczem, port 22 tylko z Twojego IP. Logowanie hasłem w obrazie
  Ubuntu z AWS jest wyłączone.
- 80 i 443 publicznie; Next słucha wyłącznie na `127.0.0.1:3000`, na zewnątrz
  tylko przez Caddy.
- Automatyczne aktualizacje bezpieczeństwa; gdy wymagają restartu — sam
  o 12:30 (poza SUDOP i importami).
- Sekrety w `/etc/jawne/jawne.env` (`root:jawne`, `640`), **nie w repozytorium**.
- Dysk zaszyfrowany. Caddy bez dziennika wejść — IP czytelnika to dana
  osobowa, a nam do niczego niepotrzebna.
- Wszystko działa jako użytkownik `jawne` bez `sudo`.

## Gdy coś nie działa

| Objaw | Co zrobić |
|---|---|
| strona pod `sslip.io` nie wstaje, a `jawne sprawdz` lokalnie jest OK | certyfikat: `sudo journalctl -u caddy -n 50`. Awaryjnie sam HTTP: `sudo jawne ustaw JAWNE_HOST` (Enter = pusto), `sudo jawne aktualizuj`, adres `http://<IP>` |
| `instaluj.sh` pada przy `npm run build` | pamięć: `free -h` (swap powinien mieć 2 GB). Przyślij mi ostatnie 30 linii |
| przebieg z wynikiem innym niż `success` | `sudo jawne logi <zadanie>` i przyślij mi ostatnie 50 linii. Nie uruchamiaj SUDOP ręcznie w kółko |
| `dubious ownership`, `Permission denied` w `.git`, `attempt to write a readonly database` | katalog przestał należeć do użytkownika `jawne` (po ręcznym `git pull` albo `sudo chown`). Napraw: `sudo chown -R jawne:jawne /srv/jawne`, potem `sudo systemctl restart jawne-strona`. `sudo jawne stan` ostrzega o tym na górze |

---

## Co sprawdziłem przed wysłaniem, a czego nie

Test 19.09.2026 w kontenerze **Ubuntu 24.04 z systemd** (Docker, x86 — nie ARM),
z adresami SUDOP, Sejmu, GUS i dane.gov.pl przekierowanymi na `127.0.0.1`,
czyli **bez żadnego zapytania do urzędu**:

- `instaluj.sh`: pierwszy przebieg bez bazy (Node 24.21.0, Caddy 2.11.4),
  drugi — idempotentny, `jawne aktualizuj` z `git pull`,
- `jawne wgraj` z paczką 80 MB: budowa, strona, pięć timerów o właściwych
  godzinach; świeżo włączony timer z `Persistent=true` nie uruchomił zadania
  od razu (potwierdzone na serwerze 21.09 dziennikiem, nie tabelą),
- `jawne sprawdz`: 6 × OK z `noindex`; strona przez Caddy (`Via: 1.1 Caddy`),
- `jawne uruchom sudop-dzien`: 0 zapytań (dzień z pliku, drugi już ustalony),
  `success`, blokada zdjęta,
- `sudop-historia` o 13:35: „Poza oknem 01:00–06:00 — nie pytam urzędu”,
- błąd sieci: kod wyjścia 1, blokada zdjęta,
- fałszywy serwer SUDOP (rejestracja → kolejka → wynik): strona 1 z dysku
  miała 62 177 wyników, nowe 62 500 → rozjazd wykryty, strona 1 pobrana
  ponownie; limit 4 zatrzymał noc ze stronami na dysku; następny przebieg
  wznowił je bez zapytań i zapisał 62 500 przypadków — dokładnie liczbę
  wyników; na kolejnym zakresie stanął na limicie przed zapytaniem,
- `shellcheck` bez uwag, `systemd-analyze verify` bez uwag.

## Zmierzone na prawdziwym serwerze 20.09.2026

Instalacja na `t4g.small` (ARM), Ubuntu 24.04, `eu-central-1`:

- `instaluj.sh` od zera do „Brak bazy danych”: kilka minut. Node 24.21.0,
  Caddy 2.11.4 — oba z repozytoriów, wersje jak w kontenerze,
- `jawne wgraj` z paczką: baza 268 MB, budowa **512 stron w 51 s** (jeden
  worker, 2 GB RAM — swap nie był potrzebny), pięć timerów włączonych
  o polskich godzinach,
- adres z metadanych EC2 zadziałał: `52-29-50-167.sslip.io`, **certyfikat
  Let's Encrypt pobrany bez ingerencji**,
- `jawne sprawdz`: 12 × OK (6 lokalnie, 6 przez HTTPS), `noindex` obecny,
- dysk po instalacji: 5,8 GB z 58 GB, z czego `dane/` 389 MB.

**Pułapka, która wyszła dopiero tutaj:** świeża maszyna EC2 uruchamia własne
`unattended-upgrades`, które trzyma blokadę `dpkg`, i drugi przebieg skryptu
padał na `apt-get install` („Could not get lock … lock-frontend”). Od commita
`d57e484` skrypt ustawia `DPkg::Lock::Timeout "600"` i czeka zamiast przerywać.

**Wciąż nie sprawdzone:** restart po automatycznej aktualizacji, zakładanie
swapu (obraz AWS ma już swap).

## Zmierzone po pierwszej nocy — 21.09.2026

- **Historia SUDOP: 21 → 61 dni w jedną noc** (2026-07-22 … 2026-09-20),
  wszystkie wcześniejsze dziury zasypane, 381 031 przypadków w bazie,
  `dane/` urosło z 389 MB do 609 MB. Przy tym tempie pełne 10 lat to ok.
  3 miesiące.
- **Kolumna LAST przy świeżo włączonym timerze `Persistent=true` to NIE jest
  przebieg.** `jawne-gus` i `jawne-fundusze` pokazywały LAST 20.09 14:39:30
  (czas instalacji), a w dzienniku **nie ma po nich ani jednej linijki** —
  bo systemd zapisuje wtedy znacznik odniesienia, żeby nie nadrabiać
  przebiegu, którego nigdy nie było. Najpierw wyciągnąłem z tego wniosek
  odwrotny („timer wystartował od razu”) na podstawie samej tabeli; dziennik
  go obalił. **LAST mówi o timerze, `sudo jawne logi` — o zadaniu.**
- **`LAST -` przy timerze z `Persistent=false` nie znaczy „nie uruchomił
  się”.** Ten czas żyje tylko w pamięci i ginie przy restarcie jednostki
  (czyli przy każdym `aktualizuj`). Prawdę o przebiegu mówi
  `sudo jawne logi <zadanie>`, nie kolumna LAST.
- **`ExecMainExitTimestamp` bywa pusty dla `Type=oneshot`** i `sudo jawne
  stan` pokazywał przez to „jeszcze nie uruchomione” przy zadaniach, które
  się wykonały — łącznie z tymi, które padły. Teraz widok bierze
  `InactiveEnterTimestamp` i `Result`, a niepowodzenia wypisuje osobno.
