#!/usr/bin/env bash
# Jedno zadanie danych. Wywoluja je jednostki systemd jawne-*.service
# (deploy/systemd/), recznie: sudo systemctl start jawne-sejm.service
#
#   zadanie.sh sejm | gus | fundusze | sudop-dzien | sudop-historia
#
# Tempo SUDOP (150 zapytan na noc, okno 22:00-07:00) to decyzja Pawla
# z 22.09.2026, nie parametr do strojenia. Kod nie przyjmie wiecej niz 150.
# Godziny pracy urzedu zostaja wolne — w dzien kolejka czeka 54 min zamiast 1-3.
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
    etapy="kluby poslowie glosowania glosy"
    # Zdjecia to 499 zapytan do API Sejmu — raz w tygodniu wystarczy.
    if [ "$(date +%u)" = 1 ]; then etapy="$etapy zdjecia"; fi
    # shellcheck disable=SC2086
    exec "$TSX" ingest/jobs/import.ts $etapy wyliczenia
    ;;
  gus)
    exec "$TSX" ingest/jobs/import.ts ludnosc budzety smup wyliczenia
    ;;
  fundusze)
    exec "$TSX" ingest/jobs/import.ts fundusze wyliczenia
    ;;
  sudop-dzien)
    sudop --dzienny
    ;;
  sudop-historia)
    sudop --historia --maks-zapytan=150 --okno=22:00-07:00
    ;;
  *)
    echo "Uzycie: $0 sejm|gus|fundusze|sudop-dzien|sudop-historia" >&2
    exit 2
    ;;
esac
