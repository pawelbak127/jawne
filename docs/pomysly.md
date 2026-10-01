# Pomysły, kierunki i plan — stan na 01.10.2026

Dokument do wracania. Wszystko poniżej ma przy sobie **pomiar albo źródło**;
tam, gdzie piszę z głowy, jest to oznaczone jako ocena.

---

## 1. Dlaczego nie robimy rankingów

Paweł zapytał wprost. Odpowiedź ma trzy warstwy, bo pytanie jest dobre.

### To jest Twoja zasada, nie moja

Zasada 6 w `CLAUDE.md` („Nie oceniamy. Żadnych odznak, rankingów »leniwych«
ani punktów") jest Twoją decyzją i możesz ją zmienić. Poniżej mówię, co
według mnie na niej zyskujemy i co tracimy, żebyś zmieniał ją świadomie,
a nie przez przypadek.

### Powód, który wynika z naszych własnych pomiarów

Ranking wymaga wybrania mianownika, a **mianownik przesądza wynik** — i to
jest u nas zmierzone, nie teoretyczne:

- **B10 (01.10.2026):** 78 z 499 posłów miało mianownik za szeroki, bo
  licznik obejmował czas ich mandatu, a mianownik całą kadencję. Grzegorz
  Rusiecki: 21 z 2 534 zamiast 21 z 20 145 — udział zaniżony **ośmiokrotnie**.
  W rankingu „aktywności" byłby na dnie z powodu naszego błędu, nie swojego
  zachowania.
- **Przekrój „zdrowie":** 313 różnych wzorców głosowania wśród 499 posłów, ale
  tylko **32 wśród 161 obecnych przy wszystkich**. Największy blok to 99 osób
  głosujących identycznie. Czyli prawie cała „różnorodność" w surowych danych
  to różnice w tym, **kto był na sali** — a nie w poglądach.

Ranking zbudowany na takich danych szereguje **okoliczności, nie ludzi**.
I nie jest to problem, który znika po dopracowaniu metodologii: nieobecność
jest nieusuwalnym składnikiem każdego licznika, jaki mamy.

### Powód drugi: ranking przenosi spór na grunt, na którym przegrywamy

Liczba z odnośnikiem do rejestru jest sprawdzalna — albo się zgadza, albo nie.
Ranking jest **opinią przebraną za liczbę**: nie da się go obronić, bo spór
przestaje być o fakt, a zaczyna o to, czy nasza metoda jest sprawiedliwa.
Pierwsze zdanie `CLAUDE.md` mówi, że wiarygodność jest produktem; ranking
wystawia na próbę coś, czego nie umiemy udowodnić.

Do tego ranking **sugeruje przyczynę**, a zasada 2 zabrania nam jej zgadywać.
„Najmniej aktywny poseł" czyta się jako „leniwy". Rejestr nie podaje, czemu
posła nie było — podaje tylko, że go nie było (i, od 28.09, czy
nieobecność była usprawiedliwiona: 4 127 dni z 18 252).

### Co na tym tracimy — i to jest realna cena

Ranking jest **najlepiej rozchodzącym się formatem** w tej kategorii.
`jakglosuja.pl` ma ranking wzrostu majątku, liczby nieruchomości i procentu
nieczytelnych pozycji. My tego nie zrobimy, więc promocja musi działać inaczej
(punkt 4). To nie jest darmowa zasada — płacimy za nią zasięgiem.

### Gdzie widzę uczciwą furtkę (decyzja Twoja)

Zasada 6 mówi „nie oceniamy", a przykłady w niej dotyczą **osób**:
odznaki, „leniwi", punkty. `z-dykty.pl` ma na to własną linię i jest
wyraźna: *„Rankingi dotyczą wyłącznie gmin i instytucji, nigdy osób"*.

To jest sensowne rozróżnienie i da się je obronić: gmina nie ma godności,
nie czyta o sobie i nie traci pracy, a jej wydatki są jawne z ustawy.
**Mogę zbudować porównania gmin i instytucji, nie ruszając osób** — i to
otwiera cały format, który dziś mamy zamknięty. Potrzebuję na to Twojego
zdania, bo to zmiana zasady, nie jej wykonanie.

Czego nie zrobiłbym nawet wtedy: rankingu gmin po kwocie bez mianownika
(zasada 3), rankingu, w którym gmina nie może wyjaśnić wyniku, i rankingu
organów gminy — bo za organem stoi konkretny człowiek z nazwiskiem.

---

## 2. Co jest zbudowane (01.10.2026)

- **„Kto to postanowił"** na stronie gminy — organy, które przyznały pomoc,
  z liczbą decyzji i kwotą **osobno dla każdej z czterech kategorii form**,
  a organ wykonawczy gminy pierwszy i wyróżniony. Zakopane: burmistrz,
  904 decyzje, z tego 560 zwolnień i umorzeń na 4,87 mln zł.
  `nip_udzielajacego` jest wypełnione w 100% wierszy i do dziś nieużywane;
  **żaden polski serwis nie ma SUDOP**, więc tego nie ma nikt.
- Wydatki gmin po 15 działach za 2021–2025 (dział 926 „Kultura fizyczna"
  nie istniał w serwisie wcale — 5,87 → 10,87 mld zł w pięć lat).
- Wykaz gmin uzgadniany z PRG i wykazem GUS (etap `wykaz`).

## 3. Co bym budował dalej, w tej kolejności

**Zero. Zdjąć `noindex`.** Nie jest to funkcja i dlatego ciągle spada na
koniec listy — a trzy niezależne przeglądy wskazały ją jako wąskie gardło.
Serwis bez czytelników nie ma czego mierzyć. Potrzebne: adres e-mail
(`JAWNE_KONTAKT`) i domena. Najdłuższe zadanie to wpisanie adresu.

**1. „Kto to postanowił" w przeglądzie krajowym i na stronie organu.**
Mamy 1 148 z 1 149 organów w REGON. Strona organu („co zrobił Prezes PFRON
w całym kraju") jest naturalnym następnikiem i nie wymaga nowych źródeł.
Uwaga: to **instytucje, nie osoby** — więc mieści się w zasadzie 6 nawet bez
jej zmiany. Koszt: 1–2 dni.

**2. Kontrola drugą drogą wobec SMUP.** `pn_zwolnienia_rady`,
`pn_umorzenia_prawne` i `pn_obnizone_stawki` są już w bazie. Suma kategorii
„niepobrane" z SUDOP dla organu gminy musi być **nie większa** niż skutek ulg
z SMUP. To kontrola na nierówność, wykrywalna automatycznie — i pierwszy
przypadek, gdy dwa niezależne rejestry sprawdzają nam liczbę nawzajem.
Koszt: pół dnia. **Wysoka wartość na jednostkę pracy.**

**3. Test niezmienników** (z przeglądu 01.10): dla próbki bytów wyrenderuj
każdą liczbę z mianownikiem i zakresem czasu, i wymagaj, by ta sama wielkość
na dwóch stronach miała identyczny mianownik. Złapałby **sześć z dwunastu**
błędów tamtego przeglądu, w tym B2, który wrócił tego samego dnia w nowym
miejscu. Pilnuje klasy, nie przypadków.

**4. „Kto był za tą ustawą" na stronie ustawy.** 903 etapy procesów trafiają
już w naszą tabelę głosowań. Pokazuje pogląd posła tam, gdzie jest najmniej
dwuznaczny, bez naszej klasyfikacji i bez modelu. 1–2 dni, zero nowych źródeł.

**5. Centralny Rejestr Umów.** Największa luka treściowa wobec konkurencji
i najdrobniejszy poziom, na jakim w Polsce widać publiczne pieniądze.
Blokuje REGON — patrz `pismo-cru.md`.

**6. Oświadczenia majątkowe.** Dopuszczone przez Pawła („można spróbować").
Blokuje Imperva; obejścia nie budujemy. Pismo gotowe:
`pismo-kancelaria-oswiadczenia.md`. Bez czekania: kilkanaście skanów
pobranych ręcznie wystarczy, żeby **zmierzyć** odczyt przed decyzją.

### Odłożone świadomie, z powodem

- **„Ustawa → wypłacone pod nią pieniądze"** — pętla, której nie robi nikt na
  świecie. Zasięg dziś **4,8%** przypadków, bo `podstawa` cytuje tekst
  jednolity z pierwotną datą aktu, więc nowelizacje tej kadencji są
  niewidoczne. Rośnie samo z każdym rokiem; zero kosztu czekania.
- **„Ile zostaje u miejscowych firm"** — odrzucone po pomiarze: TED obejmuje
  tylko zamówienia powyżej progów unijnych, więc wskaźnik mówiłby „gmina
  kupuje na zewnątrz" z powodu progu rejestru, nie zachowania gminy.
  Wraca razem z eZamówieniami.
- **Kanał „co nowego w mojej gminie"** — zabija to pułapka 37: dzień ustala
  się po 14 dniach, więc „świeże" z definicji kłamie w dół.
- **Siatka „poseł × sprawa"** — pokazuje obecność, nie poglądy (punkt 1).

---

## 4. Monetyzacja — skrót z osobnego przeglądu

Pełny raport powstał 01.10. Najważniejsze:

- **Forma prawna: fundacja**, bez działalności gospodarczej (250 zł do KRS
  + notariusz, realnie 1–2 tys. zł, jeden fundator). Decyduje to, że
  w stowarzyszeniu walne zebranie może przegłosować ranking posłów, a
  w fundacji **nie ma takiego organu** — zasada 6 przestaje zależeć od tego,
  kto przyjdzie na zebranie.
- **Zegar OPP to najważniejsza liczba.** Status wymaga 2 lat działalności,
  a do wykazu 1,5% trzeba wejść **do 30 listopada**. Rejestracja X.2026 →
  1,5% w rozliczeniach 2029. Rejestracja III.2027 → 2030. Kwartał zwłoki
  kosztuje rok.
- **REGON nie jest warunkiem RODO** — administratorem może być osoba
  fizyczna. Osoba prawna kupuje **przeniesienie odpowiedzialności**, a nie
  „odblokowanie RODO". REGON blokuje realnie klucz do CRU i granty.
- **EOG / Fundusze Norweskie**: 83,47 mln EUR do 2032, dotacje 25–80 tys. EUR.
  Największa realna linia na 2027. Konflikt interesów najniższy ze wszystkich
  dużych źródeł (pieniądze nie z polskiego budżetu).
- **Model „otwarty rdzeń": legalny tylko w wersji okrojonej.** Licencje
  pozwalają, ale nasz test równowagi jest napisany pod cel „publiczna kontrola
  wydatków" — hurt pod „badanie konkurencji" to **inny cel**, a art. 21
  przestaje działać, bo sprzeciw po sprzedaży nie dociera do nabywcy.
  Sprzedawać wolno tylko warstwę bez danych osobowych.
- **Czego nie robić:** nie brać dotacji z Funduszy Europejskich — **wpisałaby
  jawne do jego własnej bazy** jako beneficjenta; strona gminy pokazywałaby
  projekt operatora serwisu.
- **Repozytorium jest publiczne i bez licencji** (sprawdzone w API GitHuba:
  `private: false`, `licencja: brak`) — formalnie „wszelkie prawa
  zastrzeżone", co wyklucza NLnet.

---

## 5. Promocja — moja ocena, nie badanie

Agent miał to sprawdzić i padł na limicie sesji; poniżej moje zdanie, do
weryfikacji.

**Pierwsi czytelnicy to dziennikarze lokalni i radni, nie „obywatele".**
Powód jest mechaniczny: przy 2 479 gminach żaden ogólnopolski przekaz nie
zadziała, ale **415 gmin ma dziś wiersz „organ tej gminy"**, a w każdej z nich
jest ktoś, komu zdanie „burmistrz umorzył 4,87 mln zł" jest zawodowo
potrzebne. To treść do jednego telefonu, pomnożonego przez czterysta.

Kolejność: (1) lokalne redakcje pojedynczo, z **gotową liczbą i odnośnikiem
do rejestru**, nie z zaproszeniem na serwis; (2) Sieć Obywatelska Watchdog —
mają aktywistów w gminach, a nasza sekcja to ich narzędzie pracy;
(3) dziennikarze danych — wąskie środowisko, wchodzi się konkretem (nazwisk
**nie sprawdziłem**); (4) darmowy zrzut hurtowy bez danych osobowych jako
narzędzie promocji tańsze od kampanii; (5) Google, ale dopiero po domenie —
2 479 stron gmin to jedyny zasób o realnym potencjale.

**Jak promować bez rankingów** — to najtrudniejsze pytanie i odpowiedź
brzmi: **porównanie czytelnika z medianą, nie lista przegranych.** „Twoja
gmina umorzyła X zł, mediana w województwie to Y" jest osobiste, zaskakujące
i nie ocenia nikogo, bo mediana nie jest wyrokiem. To jedyny udostępnialny
format, który nie łamie zasady 6.

Czego nie robić: komunikatu prasowego do wszystkich redakcji naraz; zaczynania
od mediów ogólnopolskich; obiecywania alertów, dopóki serwer stoi na jednym
rdzeniu.

---

## 6. Plan sali — zmierzone, nie naprawiane

Paweł: „niektóre miejsca są w dziwnym położeniu, może zrób to jakoś równo".
**Zmierzyłem i układ jest już równy**, więc nie wyrównuję:

```
mediana odstepu do najblizszego sasiada:  17,8
srednia:                                  17,8
najwieksze odstepstwo:                    23,2  (+30% wobec mediany)
miejsc nachodzacych na siebie (<8):           0
```

Trzy miejsca bez numeru (id 169, 161, 479) spadają na pozycję **nazwiska**,
którą rysownik przesuwa w pionie — ale leżą w linii swoich rzędów równie
dobrze jak miejsca z numerem (odchylenie 0,4 / 4,7 / −0,5 wobec kontrolnych
0,6 / 0,8 / 1,8).

Wniosek: wrażenie nierówności pochodzi z **rysowania**, nie z danych.
Zastąpienie prawdziwych współrzędnych idealnymi łukami podmieniłoby rejestr
na nasz wymysł i **nie naprawiłoby tego, co widać**. Naprawa idzie po pomiarze
renderu na 390 px (przegląd telefonowy z 01.10).
