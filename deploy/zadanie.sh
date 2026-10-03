#!/usr/bin/env bash
# Jedno zadanie danych. Wywoluja je jednostki systemd jawne-*.service
# (deploy/systemd/), recznie: sudo systemctl start jawne-sejm.service
#
#   zadanie.sh sejm | gus | fundusze | sudop-dzien | sudop-historia
#
# Tempo SUDOP to decyzja Pawla, nie parametr do strojenia. Kod nie przyjmie
# wiecej niz 150 zapytan na przebieg.
# 22.09.2026: 150 zapytan na noc, gdy kolejka oddawala wynik po 1-3 minutach.
# 25.09.2026: kolejka oddaje wynik po ~52 minutach, wiec doba miesci najwyzej
# ~24 zapytania. Praca ciagla (--okno=zawsze) jest wiec SZESC RAZY LAGODNIEJSZA
# dla urzedu niz zatwierdzone wczesniej tempo, a nie ostrzejsza: liczy sie
# liczba pozycji w kolejce, nie pora ich zlozenia. W kazdej chwili zajmujemy
# najwyzej jedna pozycje.
# UWAGA: teza "kolejka odpowiada tylko miedzy 01:00 a 04:00" zostala OBALONA
# 25.09.2026. Udane pobrania sa o 15:31, 19:17, 22:51 i 23:42, nieudane
# o 01:36 — godzina nie ma znaczenia. Znaczenie ma to, ze kolejka urzedu
# odpowiada dzis po 51-56 minutach zamiast po minucie, a rekord zyje 60 minut
# (pulapka 26 w CLAUDE.md). Dlatego okno godzinowe znika (--okno=zawsze).
set -euo pipefail

cd "$(dirname "$0")/.."
TSX=node_modules/.bin/tsx

# TRZECIE miejsce, w ktorym trzeba podniesc sterte — i przeoczylem je
# 02.10.2026, poprawiajac dwa pierwsze (instaluj.sh i jawne.sh).
# ZMIERZONE: `jawne-sudop-dzien` padl 02.10 o 22:39 z „Ineffective
# mark-compacts near heap limit" przy 911 MB. Maszyna ma 1,8 GB RAM, ale
# domyslna sterta Node to ok. 920 MB i nie rosnie razem z nia.
# NODE_OPTIONS, nie flaga przy `node`: `tsx` uruchamia WLASNY proces potomny
# i argumenty silnika do niego nie dochodza (pulapka z 02.10.2026).
# `instaluj.sh` zatrzymuje te zadania na czas budowy, wiec ten limit nie
# konkuruje z webpackiem.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=1400"

# Jedno pobieranie z SUDOP naraz. flock ustawia zadania w kolejce U NAS,
# zamiast wysylac drugie zapytanie do urzedu. Blokada w sudop.ts
# (dane/zrodla/sudop/.blokada) zostaje jako druga linia obrony.
#
# CZAS CZEKANIA JEST ROZNY DLA ROZNYCH ZADAN i to jest istotne od 25.09.2026,
# odkad historia chodzi w trybie ciaglym (24 zapytania po ~52 min to ok. 21
# godzin jednego przebiegu):
#  - DZIENNE musi sie doczekac, bo inaczej serwis przestaje byc aktualny;
#    czeka wiec 22 godziny, czyli dluzej niz trwa przebieg historii,
#  - HISTORIA ma ustapic: jesli cokolwiek innego trwa, odpuszcza po minucie
#    i sprobuje przy nastepnym tyknieciu timera (co godzine).
# Bez tego rozroznienia historia trzymalaby blokade non stop, a zadanie
# dzienne odpadaloby po czterech godzinach czekania.
sudop() {
  local czekaj=$1; shift
  mkdir -p dane
  exec flock --wait "$czekaj" dane/.sudop.flock "$TSX" ingest/jobs/sudop.ts "$@"
}

case "${1:-}" in
  sejm)
    etapy="kluby poslowie glosowania glosy procesy interpelacje zapytania komisje obecnosc"
    # Zdjecia to 499 zapytan do API Sejmu — raz w tygodniu wystarczy.
    if [ "$(date +%u)" = 1 ]; then etapy="$etapy zdjecia"; fi
    # shellcheck disable=SC2086
    exec "$TSX" ingest/jobs/import.ts $etapy wyliczenia
    ;;
  gus)
    # `dzialy` (wydatki wg dzialow) to ok. 600 zapytan na rok = 1,5 h bez
    # klucza GUS, z kluczem ok. 20 minut. Rok juz kompletny w bazie jest
    # pomijany, wiec kolejne noce sa krotkie.
    #
    # ILE LAT nadrabia, decyduje SAM ETAP po tym, czy jest GUS_BDL_KLUCZ
    # (bez klucza 1 rok, z kluczem 5). Nie dopisuj tu `--lata=N`: te flage
    # czytaja takze `budzety` i `smup`, kazdy z inna wartoscia domyslna,
    # wiec `--lata=5` scieloby SMUP z dziesieciu lat do pieciu.
    # `wykaz` uzgadnia liste gmin z PRG i wykazem jednostek GUS. Gdy wykaz
    # sie zgadza, nie wysyla ani jednego zapytania — pyta tylko wtedy, gdy
    # w PRG jest gmina, ktorej nie mamy (PKW jest zamrozona na dniu wyborow).
    exec "$TSX" ingest/jobs/import.ts wykaz ludnosc budzety dzialy smup wyliczenia
    ;;
  fundusze)
    exec "$TSX" ingest/jobs/import.ts fundusze wyliczenia
    ;;
  ted)
    # TED nie ma limitow poza rozsadkiem; miesiac juz kompletny jest pomijany.
    "$TSX" ingest/jobs/import.ts zamowienia
    # REGON mowi, kim jest NIP zamawiajacego — bez tego nie ma "zamowien
    # w gminie". Bez klucza po prostu tego nie robimy: brak klucza to stan,
    # nie awaria, a zadanie ma nie padac z tego powodu.
    if [ -n "${GUS_BIR_KLUCZ:-}" ]; then
      exec "$TSX" ingest/jobs/import.ts regon
    else
      echo "Pomijam etap REGON — brak GUS_BIR_KLUCZ (sudo jawne ustaw GUS_BIR_KLUCZ)."
    fi
    ;;
  sudop-dzien)
    sudop 79200 --dzienny
    ;;
  sudop-historia)
    # 20, nie 24: nieudane zapytanie kosztuje 57 min czekania i kwadrans
    # przerwy, czyli 72 min. Dwadziescia razy 72 min to niecala doba, wiec
    # przebieg na pewno skonczy sie w ciagu dnia i zwolni blokade zadaniu
    # dziennemu. Przy samych sukcesach (52 min) to ok. 17 godzin.
    sudop 60 --historia --maks-zapytan=20 --okno=zawsze
    ;;
  *)
    echo "Uzycie: $0 sejm|gus|fundusze|ted|sudop-dzien|sudop-historia" >&2
    exit 2
    ;;
esac
