#!/usr/bin/env bash
# Polecenie administracyjne na serwerze (instaluje je deploy/instaluj.sh):
#
#   sudo jawne stan          dane (npm run stan), harmonogram, wynik ostatnich przebiegow, dysk
#   sudo jawne plan          co pobierze najblizsza noc z SUDOP — bez pytania urzedu
#   sudo jawne logi [zad]    dziennik: sudop-dzien, sudop-historia, sejm, gus, fundusze, strona
#   sudo jawne uruchom zad   uruchom zadanie teraz i poczekaj na koniec (np. sejm)
#   sudo jawne sprawdz       czy strona odpowiada: lokalnie i pod adresem publicznym
#   sudo jawne sumy          kontrola sum pomocy druga droga (kilkadziesiat minut)
#   sudo jawne agregaty      przelicz stan sum OD ZERA (po dodaniu nowego kubelka)
#   sudo jawne aktualizuj    git pull + instaluj.sh (strona kilka minut niedostepna)
#   sudo jawne wgraj PLIK    baza z komputera (npm run paczka-na-serwer) + instaluj.sh
#   sudo jawne statystyki [DNI]   odwiedziny z dziennika wejsc (domyslnie 30 dni)
#   sudo jawne ustaw NAZWA   GUS_BDL_KLUCZ, GUS_BIR_KLUCZ, SMUP_KLUCZ, JAWNE_KONTAKT,
#                            JAWNE_HOST, JAWNE_INDEKSOWANIE (tak = zdejmij noindex)
#   sudo jawne klucze        ktore z nich sa ustawione (wartosci NIE pokazujemy)
#   sudo jawne kopia         baza + odpowiedzi SUDOP do /tmp, do sciagniecia przez scp
set -euo pipefail

KATALOG=/srv/jawne
USTAWIENIA=/etc/jawne/jawne.env
ZADANIA='sudop-dzien sudop-historia sejm gus fundusze ted'

[ "$(id -u)" = 0 ] || { echo "Uruchom przez sudo: sudo jawne ${1:-stan}"; exit 1; }
jako() { (cd "$KATALOG" && sudo -u jawne -H "$@"); }
# Node ostrzega przy kazdym uzyciu node:sqlite — w wyniku dla czlowieka to szum.
bez_szumu() { grep -v -e 'ExperimentalWarning: SQLite' -e 'node --trace-warnings' || true; }

# Co NAPRAWDE chodzi: zbudowana wersja i srodowisko PROCESU — nie plik
# na dysku. To ta sama pomylka co w pulapce 62, tylko o ustawieniach:
# `jawne klucze` czytalo PLIK, a strona dziala ze srodowiskiem, ktore systemd
# wczytal przy JEJ starcie.
#
# ZMIERZONE 03.10.2026 na dzialajacym serwerze:
#   plik ustawien zapisany 02.10 14:24, proces strony wstal 02.10 13:55
#   -> proces mial JAWNE_KONTAKT PUSTY i JAWNE_HOST=…sslip.io
#   -> prog kwotowy byl WYLACZONY, a mapa strony oddawala 50 000 adresow
#      pod stara domena. `jawne klucze` pokazywalo przy tym komplet.
# Drugi rozjazd tej samej ciszy: HEAD 83f116f z 22:39, build z 13:54.
# Oba sa teraz wypisywane obok siebie — widok, ktory czyta inne zrodlo niz
# to, z ktorego zyje strona, potwierdza stan, ktorego nie ma.
wdrozenie() {
  local wlasc build zBuildu head headOpis rozjazd=0 pid n zPliku zProcesu
  echo "== Co jest wdrozone"
  wlasc=$(stat -c %U "$KATALOG/.git" 2>/dev/null || echo jawne)
  head=$(sudo -u "$wlasc" git -C "$KATALOG" log -1 --format=%H 2>/dev/null || echo '')
  headOpis=$(sudo -u "$wlasc" git -C "$KATALOG" log -1 --format='%h %s' 2>/dev/null || echo '?')
  build=$(date -r "$KATALOG/.next/BUILD_ID" '+%Y-%m-%d %H:%M' 2>/dev/null || echo brak)
  zBuildu=$(cat "$KATALOG/.next/ZBUDOWANO_Z" 2>/dev/null || echo '')
  printf '   %-20s %s\n' 'kod w repo' "$headOpis"
  if [ -n "$zBuildu" ]; then
    printf '   %-20s %s\n' 'strona z' "$build  (${zBuildu:0:7})"
    if [ -n "$head" ] && [ "$zBuildu" != "$head" ]; then
      echo "   UWAGA: strona NIE jest zbudowana z tego kodu — czytelnik widzi starsza wersje."
      echo "          Napraw: sudo jawne aktualizuj"
      rozjazd=1
    fi
  else
    # Pierwszy `stan` po tej zmianie: znacznika jeszcze nie ma, wiec
    # porownujemy daty. Slabsza miara, i tak jest nazwana.
    printf '   %-20s %s\n' 'strona z' "$build  (nie wiadomo z jakiego commita)"
    if [ "$(date -r "$KATALOG/.next/BUILD_ID" +%s 2>/dev/null || echo 0)"          -lt "$(sudo -u "$wlasc" git -C "$KATALOG" log -1 --format=%ct 2>/dev/null || echo 0)" ]; then
      echo "   UWAGA: kod jest nowszy niz zbudowana strona. Napraw: sudo jawne aktualizuj"
      rozjazd=1
    fi
  fi
  pid=$(systemctl show -p MainPID --value jawne-strona.service 2>/dev/null || echo 0)
  for n in JAWNE_HOST JAWNE_ADRES_SERWISU JAWNE_KONTAKT; do
    zPliku=$(sed -n "s/^$n=//p" "$USTAWIENIA" 2>/dev/null | tail -1)
    if [ "${pid:-0}" -gt 0 ] && [ -r "/proc/$pid/environ" ]; then
      zProcesu=$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n "s/^$n=//p" | tail -1)
      if [ "$zPliku" = "$zProcesu" ]; then
        printf '   %-20s %s\n' "$n" "${zPliku:-(pusta)}"
      else
        printf '   %-20s %s\n' "$n" "plik: ${zPliku:-(pusta)}  ->  STRONA WIDZI: ${zProcesu:-(pusta)}"
        rozjazd=1
      fi
    else
      printf '   %-20s %s\n' "$n" "${zPliku:-(pusta)}  (strona nie chodzi — nie ma czego porownac)"
    fi
  done
  # Dokad wskazuje www. ZMIERZONE 03.10.2026: www.zrejestru.pl wskazywal na
  # serwer Hostido (185.110.48.29) z jego strona zastepcza, a nie na nas —
  # i nic w naszych narzedziach tego nie pokazywalo, bo adres glowny dzialal.
  local hostWww ipGlowny ipWww
  hostWww=$(sed -n 's/^JAWNE_HOST=//p' "$USTAWIENIA" 2>/dev/null | tail -1)
  if [ -n "$hostWww" ] && [[ $hostWww != *sslip.io ]]; then
    ipGlowny=$(getent ahostsv4 "$hostWww" | awk 'NR==1 {print $1}')
    ipWww=$(getent ahostsv4 "www.$hostWww" | awk 'NR==1 {print $1}')
    if [ -n "$ipWww" ] && [ "$ipWww" = "$ipGlowny" ]; then
      printf '   %-20s %s\n' "www.$hostWww" "wskazuje na ten serwer — przekierowanie na $hostWww dziala"
    else
      printf '   %-20s %s\n' "www.$hostWww" "wskazuje na ${ipWww:-nic}, a serwis jest na ${ipGlowny:-?}"
      echo "   UWAGA: kto wpisze www, nie trafi do serwisu. W panelu DNS domeny ustaw"
      echo "          rekord A dla www na ${ipGlowny:-adres serwera}. Reszte Caddy zrobi sam."
    fi
  fi
  if [ "$rozjazd" = 1 ]; then
    echo "   Samo zapisanie ustawienia nie wystarcza: systemd czyta plik przy STARCIE strony."
    echo "   Najtansza naprawa ustawien: sudo systemctl restart jawne-strona"
  fi
  echo
}

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
  wdrozenie
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
  #
  # ZMIERZONE 24.09.2026: po RESTARCIE SERWERA systemd gubi te znaczniki
  # i widok pokazal "jeszcze nie uruchomione" przy WSZYSTKICH piecu zadaniach,
  # choc noc wczesniej pracowaly — widac to w dzienniku. Gdy systemd nie ma
  # znacznika, pytamy wiec dziennik i mowimy wprost, skad wiemy. Widok, ktory
  # po restarcie kasuje historie, klamie tak samo jak ten, ktory jej nie ma.
  local z wynik kiedy stanUslugi zDziennika nieudanych=0
  for z in $ZADANIA; do
    wynik=$(systemctl show -p Result --value "jawne-$z.service")
    kiedy=$(systemctl show -p InactiveEnterTimestamp --value "jawne-$z.service")
    # is-active konczy sie kodem 3 dla nieaktywnej uslugi, a skrypt ma set -e:
    # bez "|| true" caly widok urywal sie na naglowku (zmierzone 21.09).
    stanUslugi=$(systemctl is-active "jawne-$z.service" || true)
    if [ "$stanUslugi" != inactive ] && [ "$stanUslugi" != failed ]; then
      printf '   %-16s %-10s %s\n' "$z" "TRWA" "$stanUslugi"
    elif [ -n "$kiedy" ]; then
      printf '   %-16s %-10s %s\n' "$z" "$wynik" "$kiedy"
      [ "$wynik" = success ] || nieudanych=$((nieudanych + 1))
    else
      zDziennika=$(journalctl -u "jawne-$z.service" --since -30d -n 1 --no-pager -o short-iso 2>/dev/null | cut -d" " -f1 || true)
      if [ -n "$zDziennika" ]; then
        printf '   %-16s %-10s %s\n' "$z" 'z dziennika' "$zDziennika (systemd zapomnial po restarcie)"
      else
        printf '   %-16s %-10s %s\n' "$z" '' 'jeszcze nie uruchomione'
      fi
    fi
  done
  printf '   %-16s %s\n' strona "$(systemctl is-active jawne-strona || true)"
  if [ "$nieudanych" -gt 0 ]; then
    echo "   UWAGA: $nieudanych zadan skonczylo sie inaczej niz 'success' — sudo jawne logi <zadanie>"
  fi
  # Dwa osobne zadania, wiec i dwa osobne odczyty. ZMIERZONE 23.09.2026:
  # zlozone w jeden widok pokazywaly "Zapytan do urzedu: 0" z zadania
  # DZIENNEGO pod naglowkiem "Ostatnia noc" — a noc padla, nie doszedlszy
  # do swojego podsumowania. To wygladalo, jakby noc nic nie zrobila.
  local noc dzienny
  noc=$(journalctl -u jawne-sudop-historia --since -30h --no-pager 2>/dev/null \
    | grep -oE '(Zapytan do urzedu tej nocy[^,]*|Koniec na te noc: [^.]*|BLAD na [^ ]+: .*|== (przerwane|dziura|historia|nieustalone): \S+)' \
    | tail -10 || true)
  dzienny=$(journalctl -u jawne-sudop-dzien --since -30h --no-pager 2>/dev/null \
    | grep -oE 'Zapytan do urzedu: [0-9]+' | tail -1 || true)
  if [ -n "$noc" ] || [ -n "$dzienny" ]; then
    echo
    echo "== Ostatnia noc SUDOP"
    [ -n "$dzienny" ] && echo "   zadanie dzienne: $dzienny"
    if [ -n "$noc" ]; then
      echo "$noc" | sed 's/^/   historia: /'
    else
      echo "   historia: brak wpisow — zadanie nie doszlo do swojego podsumowania"
    fi
  fi
  echo "== Dysk"
  df -h "$KATALOG" | tail -1 | awk '{print "   zajete " $3 " z " $2 " (" $5 "), wolne " $4}'
  echo "   dane: $(du -sh "$KATALOG/dane" 2>/dev/null | cut -f1)"
  if [ -f /var/run/reboot-required ]; then echo "   czeka restart po aktualizacji systemu (sam o 12:30)"; fi
}

sprawdz() {
  local host adres sciezka kod czas plik bledow=0
  host=$(sed -n 's/^JAWNE_HOST=//p' "$USTAWIENIA")
  plik=$(mktemp)
  for adres in http://127.0.0.1:3000 ${host:+https://$host}; do
    echo "== $adres"
    # Trasy DYNAMICZNE (/mapa, /gmina, /szukaj) czytaja baze przy kazdym
    # wejsciu, a baza dawno nie miesci sie w pamieci maszyny. Czas odpowiedzi
    # jest jedyna miara, ktora mowi, czy dolozenie RAM-u cokolwiek da.
    # Strony statyczne odpowiadaja w kilka ms i sa tu punktem odniesienia.
    for sciezka in / /stan /poslowie /glosowania /pomoc-publiczna /gmina/100101 /mapa "/szukaj?q=gmina"; do
      kod=$(curl -s -o "$plik" -w '%{http_code} %{time_total}' --max-time 60 "$adres$sciezka" || true)
      czas=${kod#* }
      kod=${kod%% *}
      # Gdy curl w ogole nie odpowie, oba pola sa puste — printf %f by sie wywrocil.
      case $czas in ''|*[!0-9.]*) czas=0 ;; esac
      # noindex zostaje do premiery — strona bez niego to blad, nie drobiazg.
      if [ "$kod" = 200 ] && grep -q 'noindex' "$plik"; then
        printf '   OK   %-22s %6.2f s  %s\n' "$sciezka" "$czas" "$(grep -o '<title>[^<]*' "$plik" | head -1 | sed 's/<title>//')"
      else
        printf '   BLAD %-22s %6.2f s  HTTP %s%s\n' "$sciezka" "$czas" "$kod" "$(grep -q noindex "$plik" || echo ', brak noindex')"
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
  # Stan, nie `is-active --quiet`: oneshot w trakcie pracy jest „activating",
  # czego `--quiet` nie uznaje za dzialanie (zmierzone 04.10.2026 w instaluj.sh).
  if systemctl is-active jawne-sudop-dzien jawne-sudop-historia 2>/dev/null | grep -qE '^(active|activating|reloading)$'; then
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
    GUS_BDL_KLUCZ|GUS_BIR_KLUCZ|SMUP_KLUCZ|JAWNE_KONTAKT|JAWNE_HOST|JAWNE_INDEKSOWANIE) ;;
    *) echo "Co ustawic? GUS_BDL_KLUCZ, GUS_BIR_KLUCZ, SMUP_KLUCZ, JAWNE_KONTAKT, JAWNE_HOST albo JAWNE_INDEKSOWANIE (tak)"; exit 2 ;;
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
    GUS_BDL_KLUCZ|GUS_BIR_KLUCZ|SMUP_KLUCZ)
      echo "Import wezmie go przy nastepnym uruchomieniu (sudo jawne uruchom gus)."
      ;;
    *)
      # ZMIERZONE 03.10.2026: tu stalo samo "Strona zobaczy zmiane po
      # przebudowie" — i to byla cala automatyka. JAWNE_KONTAKT zapisany
      # o 14:24 nie dzialal DOBE, bo przebudowa w miedzyczasie padla na brak
      # pamieci, a proces strony chodzil ze starym, pustym srodowiskiem.
      # Restart to kilka sekund za Caddy i nie wymaga pamietania o niczym,
      # wiec robimy go sami — zamiast prosic czlowieka o drugi krok.
      echo "Restartuje strone, zeby ustawienie zaczelo dzialac..."
      if systemctl restart jawne-strona.service; then
        echo "   strona: $(systemctl is-active jawne-strona || true)"
      else
        echo "   NIE UDALO SIE zrestartowac strony: sudo journalctl -u jawne-strona -n 30"
        exit 1
      fi
      echo "Strony zbudowane wczesniej maja stary adres w podgladzie linku"
      echo "jeszcze do godziny (revalidate = 3600). Od razu wszedzie: sudo jawne aktualizuj"
      ;;
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
    [ -n "${2:-}" ] || { echo "Ktore zadanie? $ZADANIA"; exit 2; }
    # ZMIERZONE 23.09.2026: "sudo jawne uruchom sej" (literowka) oddalo
    # "Unit jawne-sej.service not found", a zaraz pod spodem "Wynik: success".
    # Powod: `systemctl show -p Result` dla NIEISTNIEJACEJ uslugi zwraca
    # wartosc domyslna, czyli "success". Dlatego najpierw sprawdzamy nazwe,
    # a potem patrzymy na kod wyjscia `systemctl start`, nie na Result.
    case " $ZADANIA " in
      *" $2 "*) ;;
      *) echo "Nie ma zadania \"$2\". Sa: $ZADANIA"; exit 2 ;;
    esac
    echo "Uruchamiam jawne-$2 i czekam na koniec (log: sudo jawne logi $2)..."
    if systemctl start "jawne-$2.service"; then
      echo "Wynik: $(systemctl show -p Result --value "jawne-$2.service")  (success = dobrze)"
    else
      echo "NIE UDALO SIE uruchomic jawne-$2.service (kod $?). Dziennik: sudo jawne logi $2"
      exit 1
    fi
    ;;
  klucze)
    # Pokazujemy TYLKO, czy klucz jest — nigdy wartosci. Klucz wypisany
    # w terminalu zostaje w historii powloki i w logach sesji.
    echo "Ustawienia w $USTAWIENIA:"
    for n in GUS_BDL_KLUCZ GUS_BIR_KLUCZ SMUP_KLUCZ JAWNE_KONTAKT JAWNE_HOST JAWNE_ADRES_SERWISU JAWNE_INDEKSOWANIE; do
      wartosc=$(sed -n "s/^$n=//p" "$USTAWIENIA" 2>/dev/null | tail -1)
      if [ -z "$wartosc" ]; then
        printf '   %-22s %s\n' "$n" 'BRAK'
      elif [ "$n" != GUS_BDL_KLUCZ ] && [ "$n" != GUS_BIR_KLUCZ ] && [ "$n" != SMUP_KLUCZ ]; then
        printf '   %-22s %s\n' "$n" "$wartosc"
      else
        printf '   %-22s %s\n' "$n" "ustawiony (${#wartosc} znakow)"
      fi
    done
    ;;
  statystyki)
    # Odwiedziny z dziennika wejsc Caddy (od 03.10.2026). Dziennik nalezy do
    # uzytkownika caddy (0600), wiec CZYTA go root, a LICZY uzytkownik jawne —
    # uprawnienia roota sa potrzebne tylko do odczytu plikow.
    dni=${2:-30}
    [[ $dni =~ ^[0-9]+$ ]] || { echo "Ile dni wstecz? np. sudo jawne statystyki 7"; exit 2; }
    shopt -s nullglob
    pliki=(/var/log/caddy/wejscia*.log*)
    shopt -u nullglob
    if [ ${#pliki[@]} -eq 0 ]; then
      echo "Dziennika wejsc jeszcze nie ma. Powstaje od wdrozenia z 03.10.2026: sudo jawne aktualizuj"
      exit 0
    fi
    host=$(sed -n 's/^JAWNE_HOST=//p' "$USTAWIENIA" | tail -1)
    zcat -f "${pliki[@]}" | jako env JAWNE_HOST="$host" node_modules/.bin/tsx ingest/jobs/statystyki.ts --dni="$dni" 2>&1 | bez_szumu
    # Raport z wykresami (przegladarki, systemy, godziny). goaccess dochodzi
    # z `aktualizuj`; bez niego zostaje sam raport tekstowy powyzej.
    if command -v goaccess >/dev/null; then
      domowy=$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)
      cel="${domowy:-/root}/statystyki-zrejestru.html"
      if zcat -f "${pliki[@]}" | goaccess - --log-format=CADDY --ignore-crawlers --keep-last="$dni" -o "$cel" >/dev/null 2>&1; then
        chown "${SUDO_USER:-root}" "$cel" 2>/dev/null || true
        echo
        echo "Raport z wykresami zapisany. Na komputerze (PowerShell):"
        echo "   scp jawne:statystyki-zrejestru.html ."
      else
        echo "(goaccess nie zbudowal raportu HTML — raport tekstowy powyzej jest kompletny)"
      fi
    fi
    ;;
  sprawdz) sprawdz ;;
  sumy)
    # Kontrola druga droga: sumy przyrostowe kontra to samo policzone SQL-em
    # po calej tabeli pomocy. To dokladnie ta droga, od ktorej uciekalismy,
    # wiec trwa KILKADZIESIAT MINUT — na zadanie, nigdy co noc. Bez niej
    # sumy sa liczbami, ktorych nikt nie sprawdza.
    # Zero rozjazdow = wynik oczekiwany.
    # NODE_OPTIONS, nie flaga przy `node` — tsx odpala proces potomny.
    jako env NODE_OPTIONS=--max-old-space-size=1400 node_modules/.bin/tsx ingest/jobs/migracje.ts --sprawdz 2>&1 | bez_szumu
    ;;
  agregaty)
    # Przelicza stan sum pomocy OD ZERA. Potrzebne raz, gdy dochodzi nowy
    # KUBELEK (np. tabela `pomoc_sumy_organy` z 01.10.2026): sumy sa
    # przyrostowe, wiec dni juz policzone nie licza sie powtornie i nowy
    # kubelek zostalby PUSTY — a sekcja, ktora nie ma danych, po prostu sie
    # nie renderuje (ta sama cicha strata co blad B1).
    # ZMIERZONE: przy 3,78 mln wierszy pelne przeliczenie to ok. 29 minut
    # (pulapka 57), wiec przy obecnej bazie licz kilkadziesiat minut.
    # Nie pyta zadnego urzedu — liczy z tego, co juz jest w bazie.
    # NODE_OPTIONS, nie flaga przy `node` — tsx odpala proces potomny.
    jako env NODE_OPTIONS=--max-old-space-size=1400 node_modules/.bin/tsx ingest/jobs/migracje.ts --agregaty-od-nowa 2>&1 | bez_szumu
    ;;
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
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
