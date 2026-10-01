# Pismo do Kancelarii Sejmu — oświadczenia majątkowe X kadencji

**To jest szkic do wysłania, nie dokument wewnętrzny.** Miejsca w nawiasach
kwadratowych trzeba uzupełnić przed wysłaniem.

## Co zmierzyliśmy, zanim napisaliśmy

Pismo opiera się na pomiarach z 01.10.2026, nie na przypuszczeniach:

| Próba | Wynik |
|---|---|
| `curl` → `orka.sejm.gov.pl/osw10.nsf`, `osw9.nsf`, `/web/001` | **403** trzy razy |
| Chrome bezgłowy → `orka.sejm.gov.pl/osw10.nsf` | 224 kB, `<title>Human Verification</title>`, Incapsula |
| Chrome bezgłowy → `www.sejm.gov.pl/sejm10.nsf/page.xsp/poslowie` | 1 002 B, ramka Incapsula z `incident_id` i `edet=15` |
| `api.sejm.gov.pl` | **działa bez zarzutu** — na tym stoi cały nasz serwis |

Czyli część HTML-owa `sejm.gov.pl` jest za ochroną Imperva, która rozpoznaje
przeglądarkę uruchomioną automatycznie. **Nie budujemy obejścia tej ochrony**
i pismo mówi o tym wprost — serwis, którego produktem jest wiarygodność, nie
zaczyna nowego działu od omijania zabezpieczeń instytucji, której dane
publikuje.

Osobno zmierzone wcześniej: **17 z 17 pobranych oświadczeń to czyste skany**
(JBIG2, 1 bit, 300 dpi, zero operatorów tekstu). Nie ma w nich warstwy
tekstowej, więc każdy, kto te dane pokazuje, odczytuje je maszynowo.

## Dlaczego w ogóle o to prosimy

Dwa inne serwisy obywatelskie publikują już te oświadczenia z kwotami:
`z-dykty.pl` („skan czyta model, odczyt przechodzi redakcję adresów i trafia
na stronę z poziomem pewności; wiążący jest skan") oraz `jakglosuja.pl`
(„tekst wyciągamy przez OCR i weryfikujemy przed publikacją", etykieta
„DANE CZĘŚCIOWE" przy ponad 20% pozycji nieczytelnych). Dane są więc już
ponownie wykorzystywane — pytanie jest tylko o to, czy będzie się to robiło
przez oficjalną, stabilną drogę, czy przez pobieranie strony po stronie.

---

[miejscowość], [data] r.

[imię i nazwisko]
[adres]
[e-mail]

**Kancelaria Sejmu**
ul. Wiejska 4/6/8
00-902 Warszawa

## Wniosek o udostępnienie oświadczeń majątkowych posłów X kadencji w postaci nadającej się do ponownego wykorzystania

Szanowni Państwo,

prowadzę nieodpłatny serwis obywatelski oparty w całości na danych
publicznych, w znacznej części na `api.sejm.gov.pl` — z którego korzystam
z wdzięcznością, bo jest jednym z lepiej zrobionych API w polskiej
administracji. Przy każdej liczbie serwis podaje odnośnik do rejestru
źródłowego.

Na podstawie art. 2 ust. 1 i art. 10 ust. 1 ustawy z dnia 6 września 2001 r.
o dostępie do informacji publicznej, a także ustawy z dnia 11 sierpnia 2021 r.
o otwartych danych i ponownym wykorzystywaniu informacji sektora publicznego,
uprzejmie proszę o informację i o udostępnienie danych w zakresie
oświadczeń majątkowych posłów X kadencji.

Pytania i prośby:

1. Czy istnieje — lub jest planowane — **udostępnienie oświadczeń majątkowych
   przez `api.sejm.gov.pl`**, choćby jako sama metryczka: poseł, rodzaj
   oświadczenia, data złożenia i stabilny adres pliku PDF? Samo API już dziś
   oddaje posłów, głosowania, interpelacje i procesy legislacyjne; oświadczenia
   są jedynym publikowanym zasobem, do którego trzeba sięgać przez stronę HTML.
2. Jeżeli nie, proszę o **udostępnienie wykazu oświadczeń X kadencji**
   w formacie maszynowym (CSV, JSON lub XML) — wyłącznie metryczki,
   bez treści — wraz z adresami plików.
3. Zauważyłem, że część serwisu pod `orka.sejm.gov.pl` i `www.sejm.gov.pl`
   jest objęta ochroną przed automatycznym ruchem, która odrzuca także
   pojedyncze, rzadkie żądania o charakterze niekomercyjnym (opis pomiarów
   wyżej). **Nie zamierzam tej ochrony obchodzić.** Proszę natomiast
   o wskazanie drogi przewidzianej dla ponownego wykorzystania — czy jest to
   zgłoszenie adresu IP, osobny punkt dostępu, czy udostępnienie na wniosek.
   Przypominam, że oświadczenia są składane raz w roku, więc mówimy
   o jednorazowym pobraniu ok. 460 dokumentów rocznie, nie o ruchu ciągłym.
4. Czy pliki udostępniane w ORKA mogłyby zawierać **warstwę tekstową**?
   Zmierzyłem, że obecne są czystymi skanami bez tekstu, co zmusza każdego
   odbiorcę do rozpoznawania znaków — a różne odczyty tego samego dokumentu
   dają różne liczby. Warstwa tekstowa po stronie nadawcy usuwa tę
   rozbieżność u wszystkich odbiorców naraz.
5. Jakiej **treści oznaczenia źródła** oczekuje Kancelaria i czy są jakieś
   warunki ponownego wykorzystania, o których powinienem wiedzieć —
   w szczególności co do danych podlegających wyłączeniu (adresy
   zamieszkania), których nie zamierzam publikować.

Jeżeli którakolwiek z tych rzeczy jest już dostępna, a ja jej nie znalazłem,
będę wdzięczny za samo wskazanie adresu.

Z wyrazami szacunku,
[imię i nazwisko]

---

## Status

**NIEWYSŁANE** (stan na 01.10.2026).

**Co zrobić, nie czekając na odpowiedź:** pobrać kilkanaście oświadczeń
ręcznie, w zwykłej przeglądarce — to zwykłe korzystanie z publicznej strony
przez człowieka. Taka próbka wystarczy, żeby zbudować i **zmierzyć** odczyt
(ile pozycji czytelnych, jak często dwa odczyty się różnią) przed podjęciem
decyzji, czy i jak pokazywać kwoty. Decyzja redakcyjna do podjęcia osobno:
czy publikujemy liczbę z poziomem pewności i odnośnikiem do skanu (tak robią
oba konkurencyjne serwisy), czy nie publikujemy jej wcale. Rankingu majątków
nie robimy w żadnym wariancie — zabrania tego zasada 6.
