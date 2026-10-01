# Pismo do Ministerstwa Finansów — dostęp do API Centralnego Rejestru Umów

**To jest szkic do wysłania, nie dokument wewnętrzny.** Miejsca w nawiasach
kwadratowych trzeba uzupełnić przed wysłaniem.

Ustalone 01.10.2026 (źródła na końcu):

- CRU JSFP ma **API od marca 2026**, autoryzacja nagłówkiem `X-API-KEY`.
  Pozwala nie tylko publikować umowy, ale też **wyszukiwać streszczenia
  i pobierać szczegóły** — czyli to, czego potrzebujemy.
- Adres dla **integratorów zewnętrznych**: `pomoc.cru@mf.gov.pl`
  (`wsparcie.cru.jsfp@mf.gov.pl` jest dla samych jednostek zobowiązanych).
- Przy wniosku urząd prosi o **REGON, nazwę systemu i szacowaną liczbę
  użytkowników**.
- Zbioru **nie ma na dane.gov.pl** i nie ma eksportu zbiorczego. Sieć
  Obywatelska Watchdog apelowała o publiczne API, formaty maszynowe i historię
  zmian — na dziś rejestr pozostaje głównie wyszukiwarką pojedynczych umów.
- Dostęp dla podmiotu spoza sektora finansów publicznych **nie jest nigdzie
  wprost potwierdzony** — i to jest pierwsze pytanie tego pisma.

**PROBLEM DO ROZSTRZYGNIĘCIA PRZED WYSŁANIEM:** urząd prosi o REGON.
Osoba fizyczna bez działalności gospodarczej go nie ma. To ten sam brak,
który blokuje `JAWNE_KONTAKT` i wskazanie administratora danych (bloker 1
w `plan.md`) — warto rozwiązać raz, dla wszystkich trzech spraw.

---

[miejscowość], [data] r.

[imię i nazwisko]
[adres]
[e-mail]

**Ministerstwo Finansów**
Departament obsługujący system Centralny Rejestr Umów JSFP
`pomoc.cru@mf.gov.pl`

## Wniosek o dostęp do API systemu Centralny Rejestr Umów JSFP

Szanowni Państwo,

prowadzę nieodpłatny serwis obywatelski, który pokazuje dane publiczne
o wydatkach jednostek samorządu terytorialnego — budżety gmin (GUS BDL),
projekty finansowane z funduszy europejskich, pomoc publiczną dla firm
(SUDOP/UOKiK) oraz zamówienia publiczne. Serwis nie ma charakteru
komercyjnego, a przy każdej liczbie podaje odnośnik do rejestru źródłowego.

W związku z udostępnieniem API do systemu CRU JSFP uprzejmie proszę
o informację i — jeżeli jest to możliwe — o nadanie klucza `X-API-KEY`
w zakresie **wyłącznie odczytu** (wyszukiwanie streszczeń umów i pobieranie
ich szczegółów). Nie zamierzam publikować ani modyfikować żadnych danych
w systemie.

Proszę przy tym o odpowiedź na pytania:

1. Czy klucz do API w zakresie odczytu może otrzymać podmiot **niebędący
   jednostką sektora finansów publicznych** — w szczególności osoba fizyczna
   prowadząca serwis obywatelski? Jeżeli wymagane jest posiadanie numeru
   REGON, proszę o wskazanie tego wprost.
2. Jakie są **limity liczby zapytań** (na sekundę, dobę, miesiąc) i czy
   zależą one od rodzaju podmiotu? Chcę od początku dobrać tempo pobierania
   tak, aby nie obciążać systemu — w innych rejestrach ustalam je na podstawie
   pisemnej odpowiedzi urzędu, a nie zgadywania.
3. Czy istnieje — lub jest planowane — **udostępnienie danych zbiorczo**:
   eksport w formacie maszynowym (CSV, JSON, XML) albo publikacja zbioru
   na portalu dane.gov.pl? Pobranie całości przez API zapytanie po zapytaniu
   jest dla systemu kosztowniejsze niż jeden plik.
4. Jakie są **warunki ponownego wykorzystania** tych danych (ustawa z dnia
   11 sierpnia 2021 r. o otwartych danych i ponownym wykorzystywaniu
   informacji sektora publicznego) i jakiej **treści oznaczenia źródła**
   oczekuje Ministerstwo? Chcę umieścić je przy każdej prezentowanej liczbie.
5. Czy w ocenie Ministerstwa pobieranie i publikowanie danych z CRU przez
   podmiot zewnętrzny czyni z niego **odrębnego administratora danych
   osobowych** w zakresie danych kontrahentów będących osobami fizycznymi,
   i czy Ministerstwo formułuje w tej sprawie jakieś zalecenia?

Dane do wniosku:

- nazwa systemu: **[nazwa serwisu]**
- adres: **[adres serwisu]**
- REGON: **[REGON albo informacja o jego braku — patrz pytanie 1]**
- szacowana liczba użytkowników: **[liczba]**
- zakres: wyłącznie odczyt, bez publikacji i aktualizacji umów

Z wyrazami szacunku,
[imię i nazwisko]

---

## Źródła ustaleń

- Ministerstwo Finansów, „Udostępnienie API do systemu Centralny Rejestr
  Umów JSFP”, gov.pl/web/finanse — adresy kontaktowe i zakres API.
- Dokumentacja API: `jsfp.rejestrumow.gov.pl/api-gw/docs/int/api.html`
  (produkcja), `jsfp-cru-test.mf.gov.pl/api-gw/docs/int/api.html` (test).
- Sieć Obywatelska Watchdog, „CRU i otwarte API” — apel o publiczne API,
  formaty maszynowe i historię zmian.
- `monitorumow.pl` — serwis zbudowany na tych danych; podaje, że korzysta
  z portalu rejestrumow.gov.pl i z API CRU JSFP, ma **879 831 umów**
  na 50,64 mld zł i aktualizuje je codziennie. Dowód, że droga działa.

## Status

**NIEWYSŁANE** (stan na 01.10.2026). Przed wysłaniem rozstrzygnąć sprawę
REGON-u — patrz uwaga na początku.
