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
# 25.09.2026. Udane pobrania sa o 19:17, 22:51 i 15:31, nieudane o 01:36 —
# godzina nie ma znaczenia. Znaczenie ma to, ze kolejka urzedu odpowiada dzis
# po 51-56 minutach zamiast po minucie, a rekord zyje 60 minut (pulapka 26
# w CLAUDE.md). Okno 00:30-07:00 zostaje jako ograniczenie obciazenia urzedu,
# nie jako "pora, o ktorej dziala".
set -euo pipefail

cd "$(dirname "$0")/.."
TSX=node_modules/.bin/tsx

# Jedno pobieranie z SUDOP naraz: zadanie dzienne i nocne moga sie zazebic
# (dzienne czeka w kolejce urzedu, a juz startuje nocne). flock ustawia je
# w kolejce u nas, zamiast wysylac drugie zapytanie. Blokada w sudop.ts
# (dane/zrodla/sudop/.blokada) zostaje jako druga linia obrony.
sudop() {
  mkdir -p dane
  exec flock --wait 14400 dane/.sudop.flock "$TSX" ingest/jobs/sudop.ts "$@"
}

case "${1:-}" in
  sejm)
    etapy="kluby poslowie glosowania glosy procesy"
    # Zdjecia to 499 zapytan do API Sejmu — raz w tygodniu wystarczy.
    if [ "$(date +%u)" = 1 ]; then etapy="$etapy zdjecia"; fi
    # shellcheck disable=SC2086
    exec "$TSX" ingest/jobs/import.ts $etapy wyliczenia
    ;;
  gus)
    # `dzialy` (wydatki wg dzialow) to ok. 600 zapytan = 1,5 h bez klucza GUS,
    # ale rok juz kompletny w bazie jest pomijany, wiec kolejne miesiace sa
    # krotkie. Z kluczem (sudo jawne ustaw GUS_BDL_KLUCZ) to ok. 20 minut.
    exec "$TSX" ingest/jobs/import.ts ludnosc budzety dzialy smup wyliczenia
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
    sudop --dzienny
    ;;
  sudop-historia)
    sudop --historia --maks-zapytan=24 --okno=zawsze
    ;;
  *)
    echo "Uzycie: $0 sejm|gus|fundusze|ted|sudop-dzien|sudop-historia" >&2
    exit 2
    ;;
esac
