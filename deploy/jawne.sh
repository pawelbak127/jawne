#!/usr/bin/env bash
# Polecenie administracyjne na serwerze (instaluje je deploy/instaluj.sh):
#
#   sudo jawne stan          dane (npm run stan), harmonogram, wynik ostatnich przebiegow, dysk
#   sudo jawne plan          co pobierze najblizsza noc z SUDOP — bez pytania urzedu
#   sudo jawne logi [zad]    dziennik: sudop-dzien, sudop-historia, sejm, gus, fundusze, strona
#   sudo jawne uruchom zad   uruchom zadanie teraz i poczekaj na koniec (np. sejm)
#   sudo jawne sprawdz       czy strona odpowiada: lokalnie i pod adresem publicznym
#   sudo jawne aktualizuj    git pull + instaluj.sh (strona kilka minut niedostepna)
#   sudo jawne wgraj PLIK    baza z komputera (npm run paczka-na-serwer) + instaluj.sh
#   sudo jawne ustaw NAZWA   GUS_BDL_KLUCZ, JAWNE_KONTAKT albo JAWNE_HOST (pyta o wartosc)
#   sudo jawne kopia         baza + odpowiedzi SUDOP do /tmp, do sciagniecia przez scp
set -euo pipefail

KATALOG=/srv/jawne
USTAWIENIA=/etc/jawne/jawne.env
ZADANIA='sudop-dzien sudop-historia sejm gus fundusze'

[ "$(id -u)" = 0 ] || { echo "Uruchom przez sudo: sudo jawne ${1:-stan}"; exit 1; }
jako() { (cd "$KATALOG" && sudo -u jawne -H "$@"); }
# Node ostrzega przy kazdym uzyciu node:sqlite — w wyniku dla czlowieka to szum.
bez_szumu() { grep -v -e 'ExperimentalWarning: SQLite' -e 'node --trace-warnings' || true; }

stan() {
  # Wlasciciel katalogu to pierwsza rzecz, ktora sie psuje po recznym
  # "sudo git" albo "sudo chown" — i psuje sie cicho, dopiero przy zapisie.
  local wlasciciel
  wlasciciel=$(stat -c %U "$KATALOG/dane/sejm.db" 2>/dev/null || echo brak)
  if [ "$wlasciciel" != jawne ] && [ "$wlasciciel" != brak ]; then
    echo "UWAGA: dane naleza do uzytkownika \"$wlasciciel\", nie do jawne — zapisy beda odrzucane."
    echo "       Napraw: sudo chown -R jawne:jawne $KATALOG"
    echo
  fi
  jako npm run --silent stan 2>&1 | bez_szumu
  echo
  echo "== Harmonogram"
  systemctl list-timers 'jawne-*' --no-pager | head -n -3
  echo
  echo "== Ostatnie przebiegi"
  # ZMIERZONE 21.09.2026: ExecMainExitTimestamp bywa pusty dla Type=oneshot
  # i ten widok pokazywal "jeszcze nie uruchomione" przy zadaniach, ktore
  # sie wykonaly (a nawet padly). Miara konca przebiegu to
  # InactiveEnterTimestamp; Result mowi, jak sie skonczyl.
  local z wynik kiedy stanUslugi nieudanych=0
  for z in $ZADANIA; do
    wynik=$(systemctl show -p Result --value "jawne-$z.service")
    kiedy=$(systemctl show -p InactiveEnterTimestamp --value "jawne-$z.service")
    stanUslugi=$(systemctl is-active "jawne-$z.service")
    if [ "$stanUslugi" != inactive ] && [ "$stanUslugi" != failed ]; then
      printf '   %-16s %-10s %s\n' "$z" "TRWA" "$stanUslugi"
    elif [ -z "$kiedy" ]; then
      printf '   %-16s %-10s %s\n' "$z" '' 'jeszcze nie uruchomione'
    else
      printf '   %-16s %-10s %s\n' "$z" "$wynik" "$kiedy"
      [ "$wynik" = success ] || nieudanych=$((nieudanych + 1))
    fi
  done
  printf '   %-16s %s\n' strona "$(systemctl is-active jawne-strona)"
  if [ "$nieudanych" -gt 0 ]; then
    echo "   UWAGA: $nieudanych zadan skonczylo sie inaczej niz 'success' — sudo jawne logi <zadanie>"
  fi
  echo
  echo "== Ostatnia noc SUDOP"
  journalctl -u jawne-sudop-dzien -u jawne-sudop-historia --since -30h --no-pager 2>/dev/null \
    | grep -oE '(Zapytan do urzedu[^,]*|Koniec na te noc: [^.]*|== (przerwane|dziura|historia|nieustalone): \S+)' \
    | tail -8 | sed 's/^/   /' || true
  echo "== Dysk"
  df -h "$KATALOG" | tail -1 | awk '{print "   zajete " $3 " z " $2 " (" $5 "), wolne " $4}'
  echo "   dane: $(du -sh "$KATALOG/dane" 2>/dev/null | cut -f1)"
  if [ -f /var/run/reboot-required ]; then echo "   czeka restart po aktualizacji systemu (sam o 12:30)"; fi
}

sprawdz() {
  local host adres sciezka kod plik bledow=0
  host=$(sed -n 's/^JAWNE_HOST=//p' "$USTAWIENIA")
  plik=$(mktemp)
  for adres in http://127.0.0.1:3000 ${host:+https://$host}; do
    echo "== $adres"
    for sciezka in / /stan /poslowie /glosowania /pomoc-publiczna /gmina/100101; do
      kod=$(curl -s -o "$plik" -w '%{http_code}' --max-time 60 "$adres$sciezka" || true)
      # noindex zostaje do premiery — strona bez niego to blad, nie drobiazg.
      if [ "$kod" = 200 ] && grep -q 'noindex' "$plik"; then
        printf '   OK   %-18s %s\n' "$sciezka" "$(grep -o '<title>[^<]*' "$plik" | head -1 | sed 's/<title>//')"
      else
        printf '   BLAD %-18s HTTP %s%s\n' "$sciezka" "$kod" "$(grep -q noindex "$plik" || echo ', brak noindex')"
        bledow=$((bledow + 1))
      fi
    done
  done
  rm -f "$plik"
  if [ -z "$host" ]; then echo "(JAWNE_HOST pusty — sprawdz w przegladarce http://<publiczne IP>)"; fi
  [ "$bledow" = 0 ] && echo "Wszystko odpowiada." || { echo "Bledow: $bledow"; exit 1; }
}

# Wgranie paczki z komputera. Normalnie raz — potem zrodlem danych jest serwer.
wgraj() {
  local paczka=${1:-}
  [ -f "$paczka" ] || { echo "Podaj plik: sudo jawne wgraj /tmp/do-serwera.tgz"; exit 2; }
  if [ -f "$KATALOG/dane/sejm.db" ] && [ "${2:-}" != --nadpisz ]; then
    echo "Na serwerze jest juz baza. Wgranie ja NADPISZE — dni SUDOP pobrane przez serwer przepadna"
    echo "i noc zapyta o nie urzad ponownie. Jesli na pewno: sudo jawne wgraj $paczka --nadpisz"
    exit 1
  fi
  if systemctl is-active --quiet jawne-sudop-dzien jawne-sudop-historia; then
    echo "Trwa pobieranie z SUDOP — nie przerywam go. Sprobuj po jego koncu (sudo jawne stan)."
    exit 1
  fi
  systemctl stop jawne-strona 'jawne-*.timer' 2>/dev/null || true
  jako mkdir -p dane
  jako tar -xzf "$paczka" -C dane
  # Stary -wal obok nowej bazy to przepis na uszkodzony plik.
  rm -f "$KATALOG/dane/sejm.db-wal" "$KATALOG/dane/sejm.db-shm"
  jako mv -f dane/do-serwera.db dane/sejm.db
  rm -f "$paczka"
  echo "Wgrane: $(du -h "$KATALOG/dane/sejm.db" | cut -f1) bazy, paczka usunieta z $paczka"
  exec bash "$KATALOG/deploy/instaluj.sh"
}

# Kopia do sciagniecia na komputer. Plik w /tmp nalezy do tego, kto wywolal
# sudo (ubuntu), bo scp loguje sie jako ubuntu. Zawiera dane osobowe: 600.
kopia() {
  local plik
  plik=/tmp/jawne-kopia-$(date +%F).tgz
  # .backup SQLite: spojna kopia mimo trwajacych zapisow (WAL).
  jako sqlite3 dane/sejm.db '.backup dane/sejm-z-serwera.db'
  tar -czf "$plik" --exclude=.blokada -C "$KATALOG/dane" sejm-z-serwera.db zrodla/sudop
  rm -f "$KATALOG/dane/sejm-z-serwera.db"
  chown "${SUDO_USER:-root}" "$plik"
  chmod 600 "$plik"
  echo "Gotowe: $plik ($(du -h "$plik" | cut -f1)). Na komputerze:"
  echo "   scp jawne:$plik ."
  echo "   ssh jawne rm $plik"
}

# Wpis do /etc/jawne/jawne.env bez edytora. Wartosc wpisuje sie po pytaniu,
# nie w poleceniu — klucz nie zostaje w historii powloki.
ustaw() {
  local nazwa=${1:-} wartosc tmp
  case "$nazwa" in
    GUS_BDL_KLUCZ|JAWNE_KONTAKT|JAWNE_HOST) ;;
    *) echo "Co ustawic? GUS_BDL_KLUCZ, JAWNE_KONTAKT albo JAWNE_HOST"; exit 2 ;;
  esac
  read -rp "Wartosc $nazwa (Enter = pusta): " wartosc
  # Plik czyta i systemd, i bash (set -a; . plik) — spacje i cudzyslowy by go zepsuly.
  if [[ ! $wartosc =~ ^[A-Za-z0-9@._:/+=-]*$ ]]; then echo "Niedozwolone znaki (spacja, cudzyslow?). Nic nie zmienilem."; exit 1; fi
  wpisz() {
    tmp=$(mktemp)
    NAZWA=$1 WARTOSC=$2 awk 'BEGIN { n = ENVIRON["NAZWA"]; w = ENVIRON["WARTOSC"] }
      index($0, n "=") == 1 { print n "=" w; jest = 1; next } { print }
      END { if (!jest) print n "=" w }' "$USTAWIENIA" > "$tmp"
    cat "$tmp" > "$USTAWIENIA"   # cat, nie mv: zostaja wlasciciel i prawa pliku
    rm -f "$tmp"
  }
  wpisz "$nazwa" "$wartosc"
  if [ "$nazwa" = JAWNE_HOST ]; then wpisz JAWNE_ADRES_SERWISU "${wartosc:+https://$wartosc}"; fi
  echo "Zapisane w $USTAWIENIA."
  case "$nazwa" in
    GUS_BDL_KLUCZ) echo "Import GUS wezmie go przy nastepnym uruchomieniu (sudo jawne uruchom gus)." ;;
    *) echo "Strona zobaczy zmiane po przebudowie: sudo jawne aktualizuj" ;;
  esac
}

case "${1:-stan}" in
  stan) stan ;;
  plan) jako node_modules/.bin/tsx ingest/jobs/sudop.ts --historia --plan 2>&1 | bez_szumu ;;
  logi)
    if [ -n "${2:-}" ]; then
      journalctl -u "jawne-$2" --since -48h --no-pager | bez_szumu | tail -n 300
    else
      journalctl -u 'jawne-*' --since -24h --no-pager | bez_szumu | tail -n 200
    fi
    ;;
  uruchom)
    [ -n "${2:-}" ] || { echo "Ktore? $ZADANIA"; exit 2; }
    echo "Uruchamiam jawne-$2 i czekam na koniec (log: sudo jawne logi $2)..."
    systemctl start "jawne-$2.service" || true
    echo "Wynik: $(systemctl show -p Result --value "jawne-$2.service")  (success = dobrze)"
    ;;
  sprawdz) sprawdz ;;
  aktualizuj)
    # ZMIERZONE 20.09.2026 na serwerze: "git pull" wykonany jako ubuntu konczy
    # sie "dubious ownership", a ratunkowy "sudo chown -R ubuntu:ubuntu
    # /srv/jawne" zabiera katalog uzytkownikowi jawne — wtedy strona i zadania
    # dostaja "attempt to write a readonly database". Oddajemy CALY katalog,
    # nie samo .git: git sprawdza wlasciciela katalogu roboczego.
    chown -R jawne:jawne "$KATALOG"
    jako git pull --ff-only
    exec bash "$KATALOG/deploy/instaluj.sh"
    ;;
  wgraj) wgraj "${2:-}" "${3:-}" ;;
  ustaw) ustaw "${2:-}" ;;
  kopia) kopia ;;
  *)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
