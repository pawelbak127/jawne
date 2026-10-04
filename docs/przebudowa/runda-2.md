# Runda 2 — wszystkie motywy od nowa, na wspólnym fundamencie z badań

Zlecone przez Pawła 04.10.2026: „Bazując na tych danych trzeba przebudować
wszystkie motywy na nowo.” Dane: `docs/przebudowa/badania-ux.md` (20 źródeł,
najważniejsze z pełnych tekstów). Wykonawca: sesja `przebudowa`.

## Zasada rundy

W rundzie 1 motywy różniły się NARAZ stylem i użytecznością — G miał inne
menu, C inną hierarchię, E inną gęstość. Paweł nie wybierałby wtedy wyglądu,
tylko przypadkowy zestaw kompromisów. W rundzie 2:

- **Fundament (F1–F14 niżej) jest wspólny i obowiązkowy dla każdego motywu**
  — ta sama struktura strony, ta sama kolejność treści, te same rozmiary
  minimalne. Wynika z badań; motyw go nie zmienia.
- **Motyw to warstwa stylu:** kroje (w granicach F5), paleta (w granicach F4),
  linie, rytm, sposób rysowania źródła i liczby, detale. Tym motywy mają się
  wyraźnie różnić — i tym ma być „nie jak strona z AI”.
- Wszystkie 10 motywów zostaje. Jeśli tożsamość motywu stoi w sprzeczności
  z fundamentem (G „ciemny najpierw”, F3), zmień tożsamość i napisz, jak —
  nazwę też, jeśli przestała pasować.

## Fundament — każdy punkt z pomiarem

Pomiar w Playwright na każdej stronie prototypu, w każdym motywie, 390
i 1280 px, jasny i ciemny — tak jak w rundzie 1. W `kierunek.md` tabela:
motyw × F1–F14, wynik liczbą.

**F1. Pierwszy ekran = odpowiedź** (badania §1, §5: 10 sekund; 57% uwagi
na pierwszym ekranie, 74% na dwóch). Na 390×844 widać: nazwę strony (h1),
jedno zdanie, czym jest zrejestru.pl (na stronach poza główną), i pierwszą
odpowiedź z mianownikiem i źródłem. Wszystkie pozycje „W liczbach” mieszczą
się w pierwszych dwóch ekranach (≤ 1 688 px na telefonie). Pomiar: położenie
elementów oznaczonych `data-odpowiedz`.

**F2. Układ typowy** (§1, Tuch 2012): nazwa serwisu z lewej u góry, szukanie
w nagłówku, menu u góry. Boczny pasek dozwolony **dodatkowo** od 1280 px
(G może go zachować), nie zamiast górnego układu na mniejszych ekranach.

**F3. Jasny domyślnie** (§5, Piepenbrock 2013): bez ustawienia systemu
i bez wyboru czytelnika strona jest jasna. Ciemna wersja pełnowartościowa,
za systemem albo przełącznikiem.

**F4. Mało kolorów, kolor z funkcją** (§1, Reinecke 2013): jeden akcent
(odnośniki, fokus) + barwy znaczące (kluby, głosy, ostrzeżenie). Żadnych
barwnych teł dla ozdoby. Pomiar: lista unikalnych kolorów tła i tekstu.

**F5. Duże pismo** (§5, Rello 2016): tekst ciągły ≥ 18 px na 390, ≥ 20 px
na 1280; interlinia ≥ 1,5; długość wiersza 55–75 znaków; **żaden widoczny
tekst poniżej 15 px** (dziś opisy i źródła mają 14 px i mniej). Pomiar:
`getComputedStyle` wszystkich węzłów tekstowych, lista naruszeń.

**F6. Niska złożoność** (§1): najwyżej jeden obramowany blok na ekran
(„W liczbach”); działy oddzielone linią i odstępem, nie kartami z cieniem.
Pomiar: liczba elementów z obramowaniem lub cieniem na ekran.

**F7. Nagłówki od treści** (§5, NN/g F/warstwy tortu): nagłówek działu
zaczyna się od słów niosących odpowiedź („Pomoc publiczna: 22,2 mln zł
w 16 dni”), nie od nazwy kategorii. Najważniejsze w pierwszych dwóch
akapitach działu. Metodologia w rozwijanym „Jak to liczymy” na końcu działu.

**F8. Kwota: najpierw na mieszkańca, potem suma** (§3, PNAS 2022) —
zasada 9 z CLAUDE.md, teraz z podstawą naukową.

**F9. Zdanie porównawcze przy dużych kwotach** (§3, Barrio 2016) —
**liczone z naszych danych, nigdy wymyślone**: krotność mediany
(„3,8 raza więcej niż mediana województwa”), udział we własnym budżecie
(„tyle, co 5% rocznych dochodów miasta”), równowartość w działach budżetu
gminy („tyle, co 4 miesiące wydatków na oświatę”). Bez rankingów osób
(zasada 6). Pokaż na gminie, firmie i pomocy publicznej.

**F10. „Jak myślisz, ile…?”** (§3, Kim 2017) — jeden komponent na stronie
gminy (np. dochody na mieszkańca) i na stronie głosowania („ilu posłów
było przeciw?”): czytelnik przesuwa suwak albo wybiera przedział, potem widzi
prawdę i różnicę. Opcjonalne, pomijalne jednym kliknięciem, działa bez
JavaScriptu (wtedy po prostu pokazuje liczbę). Tylko liczby o miejscach
i całym Sejmie — nigdy „zgadnij, jak głosował poseł X”.

**F11. Wykresy** (§4): porównania na paskach na wspólnej osi; tytuł
**u góry** i jako zdanie z wnioskiem; mapa gmin tylko jako wejście, liczba
zawsze obok.

**F12. Menu widoczne** (§6, NN/g 2016: schowane −20% znajdowania, −39%
szybkości): na 1280 wszystkie działy Sejmu i Pieniędzy widoczne bez
otwierania czegokolwiek (dziś są w dwóch rozwijanych listach); na 390
co najmniej szukanie oraz „Sejm” i „Pieniądze publiczne” na wierzchu.
Odnośniki mówią, co jest po kliknięciu — żadnego samego „więcej”, „tutaj”,
„zobacz”. Pomiar: tekst wszystkich `<a>`.

**F13. Każda strona szczegółowa jest stroną wejścia** (§8, mySociety 2023):
okruszek, zdanie o serwisie, data stanu danych, droga do szerszego widoku.
Stopka z „kto za tym stoi” i kontaktem na każdej stronie (§2, Stanford 2 i 5).

**F14. Waga**: fonty ≤ 150 kB (latin + latin-ext, zmierzone), żadnych
obrazów ozdobnych. Podaj wagę każdego motywu.

## Co oddać

1. `prototyp/` — wszystkie strony w 10 przebudowanych motywach, fundament
   wspólny w `styl.css`, motyw w `skora-*.css`.
2. `kierunek.md` — dla każdego motywu: co zmienił względem rundy 1 i dlaczego,
   tabela pomiarów F1–F14, czym różni się od „typowej strony z AI”.
3. Popraw `badania.md`: dwa cytaty niezgodne ze źródłem (patrz
   `badania-ux.md`, sekcja „Czego badania NIE mówią”) i odsyłacz do
   `badania-ux.md` jako źródła przeczytanego w pełnym tekście.
4. `decyzje.md` — wpis o rundzie 2.
5. Wiadomość `DO-glowny__…__runda-2.md`: co powstało, które motywy najlepiej
   wypadły w pomiarach, propozycja 2–3 do wyboru dla Pawła.

Kod strony (`src/`) bez zmian — wdraża główna sesja po wyborze Pawła.
