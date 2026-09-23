# Pytanie do GUS o warunki korzystania z BIR1 (REGON)

Do wysłania na `regon_bir@stat.gov.pl` z adresu, na który przyszedł klucz.
**Odpowiedź dopisz do [`zrodla.md`](zrodla.md)** — razem z datą, tak jak
robimy z każdym ustaleniem.

Kontekst, dla którego to pytamy: licencja przy zbiorze 544 na dane.gov.pl
(CC BY 4.0) odpowiada na pytanie główne — wolno przechowywać i publikować
z podaniem źródła. Zostają cztery rzeczy, których nie da się wyczytać
z dokumentacji, a które zmieniają sposób, w jaki napiszemy import.

---

**Temat:** BIR1 — warunki wykorzystania danych i sposób liczenia limitów

Szanowni Państwo,

dziękuję za przyznanie klucza użytkownika do usługi BIR1 (środowisko
produkcyjne, zakres danych ogólnodostępnych).

Prowadzę niekomercyjny serwis obywatelski, który pokazuje publiczne pieniądze
w gminach na podstawie rejestrów publicznych (m.in. SUDOP prowadzonego przez
UOKiK, list projektów Funduszy Europejskich i danych GUS). Dane z REGON chcę
wykorzystać przede wszystkim do **rozróżnienia, czy beneficjent pomocy
publicznej jest osobą prawną, czy osobą fizyczną prowadzącą działalność** —
dziś wnioskuję o tym z samej nazwy podmiotu, co bywa zawodne, a pomyłka
prowadzi do pokazania nazwiska osoby fizycznej.

Uprzejmie proszę o potwierdzenie lub sprostowanie czterech kwestii:

1. **Licencja.** Przy zbiorze „Dostęp do danych rejestrowych REGON poprzez
   usługę sieciową – interfejsy API” na portalu dane.gov.pl wskazana jest
   licencja CC BY 4.0. Czy obejmuje ona również dane pobierane przez API
   w zakresie ogólnodostępnym — to znaczy, czy mogę je przechowywać we własnej
   bazie i prezentować w serwisie, wskazując źródło?

2. **Oznaczenie źródła.** Jak powinna brzmieć informacja o źródle przy danych
   pochodzących z REGON? Czy wystarczy „Źródło: rejestr REGON, Główny Urząd
   Statystyczny” wraz z datą pobrania?

3. **Sposób liczenia limitów.** Czy podane na portalu limity (np. 6 000 wywołań
   na godzinę w godzinach 8:00–16:59) liczone są dla klucza użytkownika, czy
   dla adresu IP? Czy jedno wywołanie metody `DaneSzukaj` z parametrem `Nipy`
   zawierającym 100 numerów liczy się jako jedno żądanie, czy jako sto?

4. **Zmiana adresu IP.** Zapytania będą wysyłane z jednego serwera w Unii
   Europejskiej, którego adres IP może się zmienić przy zmianie dostawcy.
   Czy taką zmianę należy Państwu zgłaszać?

Z góry dziękuję za odpowiedź.

Z poważaniem,
**[imię i nazwisko]**
**[adres e-mail kontaktowy serwisu]**
