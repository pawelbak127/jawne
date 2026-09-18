# jawne

Serwis pokazujący dane publiczne o Sejmie RP i o publicznych pieniądzach
w gminach: kto jak głosował, kto reprezentuje Twoją gminę, ile trafiło do niej
z Funduszy Europejskich i jakiej pomocy publicznej udzielono tutejszym firmom.
Przy każdej liczbie stoi odnośnik do oficjalnego rejestru.

## Uruchomienie

Potrzebny jest **Node 24 lub nowszy** (serwis używa wbudowanego `node:sqlite`).
Nie trzeba żadnego konta, klucza ani bazy w chmurze.

```bash
npm install

# 1. Szybkie etapy: kluby, posłowie, nagłówki głosowań (~5 s)
npm run import kluby poslowie glosowania

# 2. Serwis już działa — z liczbami zbiorczymi głosowań
npm run dev        # http://localhost:3000

# 3. Zdjęcia posłów do lokalnej bazy (~25 MB, ~1 min)
npm run import zdjecia

# 4. Głosy imienne: 2,1 mln wierszy, ~18 minut. Można w tle.
npm run import glosy

# 5. Gminy: okręgi (PKW, z pliku w repozytorium), ludność i budżety (GUS),
#    projekty unijne (listy MFiPR, ~3 min), na końcu wyliczenia
npm run import okregi ludnosc budzety fundusze wyliczenia
```

Pomoc publiczna (SUDOP) nie wchodzi do `import wszystko`. Pobiera się ją
ręcznie dla wskazanych gmin — dlaczego, opisuje [docs/sudop.md](docs/sudop.md):

```bash
npx tsx ingest/jobs/sudop.ts --gminy=100101,100102   # kilka minut na gminę
```

Baza powstaje w `dane/sejm.db` i nie jest trzymana w repozytorium — odtwarza
się w całości z publicznego API Sejmu.

## Co jest w środku

| Ścieżka | |
|---|---|
| `/` | półkole izby, wyszukiwarka (posłowie, gminy, głosowania), ostatnie głosowania |
| `/okregi`, `/okreg/[nr]` | 41 okręgów: gminy, posłowie, jak głosowali |
| `/gmina/[teryt]` | posłowie z okręgu, budżet gminy, Fundusze Europejskie na mieszkańca, pomoc publiczna dla firm |
| `/firma/[nip]` | pomoc publiczna dla jednego beneficjenta — tylko gdy jego nazwę wolno pokazać |
| `/pomoc-publiczna` | przegląd krajowy: kto udziela pomocy, na co, jakim firmom, w których województwach |
| `/poslowie` | wszyscy posłowie, filtrowanie w przeglądarce |
| `/posel/[slug]` | profil: rozkład głosów, udział, ostatnie głosowania |
| `/glosowania` | wszystkie głosowania, stronicowane |
| `/glosowanie/[posiedzenie]-[numer]` | kto jak zagłosował, imiennie |
| `/szukaj` | wyniki wyszukiwania |
| `/stan` | co i kiedy zaimportowano oraz czego brakuje |

## Wdrożenie

`JAWNE_KONTAKT` (np. w `.env.local`) to adres, pod który można zgłosić sprzeciw
wobec pokazania nazwiska. Dopóki go nie ma, serwis nie pokazuje nazwisk osób
fizycznych w ogóle — patrz [docs/nazwiska.md](docs/nazwiska.md).

Przed buildem produkcyjnym ustaw publiczny adres serwisu — inaczej obrazki
podglądu linków będą wskazywać na `localhost`:

```bash
JAWNE_ADRES_SERWISU=https://twoja-domena.pl npm run build
```

Plik `dane/sejm.db` trzeba dostarczyć obok aplikacji — bundler go nie zabierze.
Strony główna, `/okregi` i `/stan` są generowane przy buildzie, więc po imporcie
nowych danych trzeba przebudować serwis.

## Co jeszcze trzeba dociągnąć

```bash
npm run stan
```

Raport: co jest w bazie, ile dni pomocy publicznej brakuje i jakie polecenie
je pobierze. Dzienny przyrost może zbierać GitHub Actions
(`.github/workflows/sudop-przyrost.yml`); wtedy lokalnie wystarczy:

```bash
npm run sudop:artefakty -- --import
```

## Sprawdzenie

```bash
npm run typecheck
npm test
npx eslint src ingest
```

## Źródła danych

- [API Sejmu RP](https://api.sejm.gov.pl/sejm/openapi/) — posłowie, kluby, głosowania,
- [PKW, wybory 2023](https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach) — gminy w okręgach,
- [GUS, Bank Danych Lokalnych](https://bdl.stat.gov.pl) — ludność i budżety gmin,
- listy projektów Funduszy Europejskich MFiPR ([2021–2027](https://dane.gov.pl/pl/dataset/13939), [2014–2020](https://dane.gov.pl/pl/dataset/1176)),
- [SUDOP, UOKiK](https://sudop.uokik.gov.pl) — pomoc publiczna, dla wybranych gmin.

Wszystkie publiczne i bez klucza. Pełny katalog, także źródeł jeszcze
niewykorzystanych (KRS, zamówienia publiczne, budżety gmin), jest
w [docs/zrodla.md](docs/zrodla.md).

Serwis nie jest powiązany z Kancelarią Sejmu, z urzędami, których dane
pokazuje, ani z żadnym klubem poselskim.
