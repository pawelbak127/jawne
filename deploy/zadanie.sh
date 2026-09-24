#!/usr/bin/env bash
# Jedno zadanie danych. Wywoluja je jednostki systemd jawne-*.service
# (deploy/systemd/), recznie: sudo systemctl start jawne-sejm.service
#
#   zadanie.sh sejm | gus | fundusze | sudop-dzien | sudop-historia
#
# Tempo SUDOP (150 zapytan na noc) to decyzja Pawla z 22.09.2026, nie parametr
# do strojenia. Kod nie przyjmie wiecej niz 150.
# Okno zwezone 24.09.2026 z 22:00-07:00 na 00:30-07:00: dwie noce z rzedu
# zaczynajace sie o 22:20 dały ZERO zapytan, bo kolejka urzedu nie oddawala
# wyniku przez pelne 55 minut. Wszystkie udane pomiary sa z godzin 01:00-04:00.
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
    exec "$TSX" ingest/jobs/import.ts zamowienia
    ;;
  sudop-dzien)
    sudop --dzienny
    ;;
  sudop-historia)
    sudop --historia --maks-zapytan=150 --okno=00:30-07:00
    ;;
  *)
    echo "Uzycie: $0 sejm|gus|fundusze|ted|sudop-dzien|sudop-historia" >&2
    exit 2
    ;;
esac
