# Pismo do UOKiK — szkic z 25.09.2026

**To jest szkic do wysłania, nie dokument wewnętrzny.** Miejsca w nawiasach
kwadratowych trzeba uzupełnić przed wysłaniem. Dane pomiarowe pochodzą
z dziennika serwera i są prawdziwe na dzień 25.09.2026 — jeśli pismo pójdzie
później, sprawdź, czy nadal są aktualne (`sudo jawne logi sudop-dzien`).

Adres do korespondencji: Urząd Ochrony Konkurencji i Konsumentów,
pl. Powstańców Warszawy 1, 00-030 Warszawa, kancelaria: `uokik@uokik.gov.pl`.

---

[miejscowość], 25 września 2026 r.

[imię i nazwisko]
[adres]
[e-mail]

**Urząd Ochrony Konkurencji i Konsumentów**
pl. Powstańców Warszawy 1
00-030 Warszawa

## Wniosek o udostępnienie informacji publicznej oraz zgłoszenie dotyczące działania API SUDOP

Na podstawie art. 2 ust. 1 i art. 10 ust. 1 ustawy z dnia 6 września 2001 r.
o dostępie do informacji publicznej wnoszę o udostępnienie danych
z Systemu Udostępniania Danych o Pomocy Publicznej (SUDOP) oraz przekazuję
informację o stanie technicznym udostępnianego przez Urząd interfejsu API,
która — jak sądzę — może być dla Urzędu użyteczna.

### 1. Czego dotyczy wniosek

Wnoszę o udostępnienie **zbiorczego eksportu przypadków pomocy publicznej**
za okres od 1 stycznia 2016 r. do dnia realizacji wniosku, w postaci pliku
(CSV, JSON lub innej maszynowo odczytywalnej), z zakresem pól odpowiadającym
temu, co zwraca zasób `przypadki-pomocy` interfejsu API SUDOP.

Jeżeli przygotowanie jednego pliku dla całego okresu byłoby nadmiernie
uciążliwe, wnoszę o udostępnienie danych w częściach — na przykład rocznych —
w terminie i trybie dogodnym dla Urzędu.

### 2. Dlaczego proszę o plik zamiast pobierać dane przez API

Prowadzę niekomercyjny serwis obywatelski, który pokazuje publiczne dane
o wydatkach ze środków publicznych, w tym o pomocy publicznej, i przy każdej
liczbie podaje źródło wraz z warunkami korzystania podanymi przez Urząd.
Dane pobieram przez udostępnione API, jednym zapytaniem naraz, w godzinach
nocnych.

**Pobranie całej historii tą drogą wymagałoby około 2 900 zapytań**, z których
każde tworzy pozycję w kolejce Urzędu. Jeden plik byłby dla Urzędu
nieporównanie mniejszym obciążeniem niż kilka tysięcy zapytań rozłożonych
na wiele miesięcy — i z tego powodu, a nie tylko dla własnej wygody, proszę
o taką formę udostępnienia.

### 3. Stan faktyczny działania API — pomiary

Poniższe czasy pochodzą z dziennika systemowego mojego serwera. Chodzi
za każdym razem o tę samą operację: rejestrację zapytania do zasobu
`przypadki-pomocy` i odpytywanie kolejki co 60 sekund.

| Data | Zakres zapytania | Wierszy w wyniku | Czas do wyniku |
|---|---|---|---|
| 21.09.2026 | 7 dni, cały kraj | 62 674 | **1 minuta** |
| 21.09.2026 | kolejne 24 zapytania tej nocy | do 53 073 | 1–14 minut |
| 22.09.2026 | zakresy dzienne i tygodniowe | — | 1–31 minut |
| 23.09.2026 | 1 dzień, cały kraj | 216 | **51 minut** |
| 24.09.2026 | 1 dzień, cały kraj | 229 | **53 minuty** |
| 25.09.2026 | 1 dzień, cały kraj | 254 | **56 minut** |
| 23–25.09.2026 | dni sprzed dwóch tygodni (ok. 4 000–5 000 wierszy) | — | wynik nie nadszedł |

Dwie obserwacje, które mogą być dla Urzędu istotne:

1. **Czas oczekiwania wzrósł w ciągu dwóch dni z około minuty do około
   pięćdziesięciu pięciu minut**, i nie zależy od wielkości zapytania:
   zapytanie zwracające 62 674 wiersze zostało obsłużone w minutę,
   a zapytanie zwracające 254 wiersze — w pięćdziesiąt sześć minut.
   Pomiary z dwóch niezależnych łączy (serwer w chmurze i łącze domowe
   w Polsce) dają ten sam wynik, więc nie jest to kwestia jednego adresu IP.

2. **Rekord kolejki wygasa po równo 60 minutach.** Zmierzyłem to 22 września:
   po 59 kolejnych odpowiedziach `200` sześćdziesiąta próba zwróciła
   `404 „Nie znaleziono rekordu o podanym identyfikatorze"`. Przy obecnym
   czasie obsługi wynoszącym 51–56 minut margines wynosi kilka minut,
   a **zapytania zwracające kilka tysięcy wierszy nie kończą się w ogóle** —
   wynik nie powstaje, zanim rekord zostanie usunięty. W praktyce oznacza to,
   że pojedynczy dzień rejestru jest dziś nie do pobrania.

W związku z tym uprzejmie pytam, czy spowolnienie jest Urzędowi znane
i ma charakter przejściowy, oraz czy rozważane jest wydłużenie czasu życia
rekordu kolejki ponad 60 minut — przy obecnej wydajności ten limit sam
w sobie uniemożliwia pobranie części danych.

### 4. Informacja o moim ruchu

Traktuję zasoby Urzędu jak zasób wspólny. Na dzień dzisiejszy wstrzymałem
nocne zadania pobierające dane historyczne; pozostaje jedno zapytanie na dobę,
pobierające dane z poprzedniego dnia. Jeżeli Urząd wskaże dogodniejszą porę
lub tempo, dostosuję się do wskazania.

Odpowiedź proszę kierować na adres [e-mail].

Z wyrazami szacunku
[imię i nazwisko]
