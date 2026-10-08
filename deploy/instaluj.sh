#!/usr/bin/env bash
# Instalacja serwera jawne na czystym Ubuntu 24.04 (ARM albo x86).
#
#   sudo bash /srv/jawne/deploy/instaluj.sh
#
# Mozna uruchamiac wielokrotnie — kolejny przebieg dociaga to, czego brakuje,
# i niczego nie kasuje. Bez bazy (dane/sejm.db) konczy na prosbie o wgranie
# danych; z baza buduje strone i wlacza harmonogram. Tak samo dziala
# `sudo jawne aktualizuj` (najpierw git pull).
#
# Sekrety NIE sa w repozytorium: skrypt zaklada /etc/jawne/jawne.env z pustymi
# polami, a klucze wpisuje sie tam recznie.
set -Eeuo pipefail

KATALOG=/srv/jawne
UZYTKOWNIK=jawne
REPO=${JAWNE_REPO:-https://github.com/pawelbak127/jawne.git}
USTAWIENIA=/etc/jawne/jawne.env
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

KROK='start'
krok() { KROK=$*; printf '\n== %s\n' "$*"; }
trap 'echo "BLAD w kroku \"$KROK\" (linia $LINENO). Popraw i uruchom skrypt ponownie — nic nie trzeba cofac." >&2' ERR

# Polecenie jako uzytkownik jawne, w katalogu serwisu.
jako() { (cd "$KATALOG" && sudo -u "$UZYTKOWNIK" -H "$@"); }

# Adres bez domeny: publiczne IP z metadanych EC2 zamienione na nazwe
# sslip.io (1.2.3.4 -> 1-2-3-4.sslip.io), dla ktorej Caddy dostanie
# certyfikat. Poza EC2 (albo bez publicznego IP) — pusto.
publiczne_ip() {
  local token
  token=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)
  curl -s -m 2 -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 || true
}

#
# Wdrozenie jako USLUGA, nie jako proces terminala.
#
# ZMIERZONE 07/08.10.2026: `sudo jawne aktualizuj` o 20:13 zatrzymal timery
# danych i ruszyl z migracjami; o 20:39 Pawel zamknal terminal („disconnected
# by user"), a razem z sesja SSH zginelo cale wdrozenie — w srodku migracji,
# przed budowa. Pulapka EXIT nie wznowila timerow (w dzienniku zadnego startu)
# i przez kilkanascie godzin nie chodzilo ZADNE zadanie danych: ani historia
# SUDOP, ani poranny Sejm, ani TED. Wdrozenie nie moze zalezec od tego, czy
# okno terminala zostanie otwarte przez pol godziny.
#
# Teraz skrypt sam przenosi sie do jednostki `jawne-wdrozenie` (systemd-run),
# a terminal tylko pokazuje jej dziennik. Zamkniecie okna przerywa
# podglad, nie wdrozenie; wrocic do postepu: `sudo jawne logi wdrozenie`.
# INVOCATION_ID ustawia systemd kazdej usludze — po nim poznajemy, ze juz
# jestesmy w srodku. JAWNE_W_TERMINALU=1 przywraca stare zachowanie.
#
w_tle() {
  local skrypt log kod=0
  skrypt=$(readlink -f "$0")
  case "$(systemctl is-active jawne-wdrozenie 2>/dev/null || true)" in
    active|activating|deactivating)
      echo "Wdrozenie juz trwa. Postep: sudo jawne logi wdrozenie"
      exit 1 ;;
  esac
  systemctl reset-failed jawne-wdrozenie 2>/dev/null || true
  echo "Wdrozenie idzie jako usluga jawne-wdrozenie — zamkniecie terminala go NIE przerwie."
  echo "Ponizej jego dziennik. Ctrl+C albo zamkniecie okna przerywa tylko PODGLAD."
  echo "Wrocic do niego pozniej: sudo jawne logi wdrozenie"
  journalctl -f -n 0 -o cat -u jawne-wdrozenie &
  log=$!
  systemd-run --unit=jawne-wdrozenie --collect --wait --quiet \
    --property=StandardOutput=journal --property=StandardError=journal \
    /usr/bin/bash "$skrypt" "$@" || kod=$?
  sleep 2
  kill "$log" 2>/dev/null || true
  echo
  if [ "$kod" = 0 ]; then
    echo "Wdrozenie zakonczone."
  else
    echo "Wdrozenie skonczylo sie bledem (kod $kod). Szczegoly: sudo jawne logi wdrozenie"
  fi
  exit "$kod"
}

main() {
  local ip host adres
  [ "$(id -u)" = 0 ] || { echo "Uruchom przez sudo: sudo bash $0"; exit 1; }
  if [ -z "${INVOCATION_ID:-}" ] && [ -z "${JAWNE_W_TERMINALU:-}" ]; then w_tle "$@"; fi

  krok "System: strefa czasowa, pakiety, automatyczne aktualizacje"
  timedatectl set-timezone Europe/Warsaw 2>/dev/null || ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime
  # ZMIERZONE 20.09.2026 na EC2: swiezo uruchomiona maszyna ma wlasny
  # unattended-upgrades w tle, ktory trzyma blokade dpkg — apt-get padal
  # z "Could not get lock /var/lib/dpkg/lock-frontend". Plik dziala takze
  # dla apt-a uruchamianego przez skrypt NodeSource.
  cat > /etc/apt/apt.conf.d/99jawne-lock-timeout <<'EOF'
DPkg::Lock::Timeout "600";
EOF
  if pgrep -x unattended-upgr >/dev/null; then
    echo "   w tle dziala unattended-upgrades — apt poczeka na blokade (do 10 min)"
  fi
  apt-get update -q
  # goaccess: raport HTML z dziennika wejsc (sudo jawne statystyki), od 03.10.2026.
  apt-get install -y -q git curl ca-certificates gnupg sqlite3 sudo unattended-upgrades goaccess \
    debian-keyring debian-archive-keyring apt-transport-https
  cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
  cat > /etc/apt/apt.conf.d/52jawne-restart <<'EOF'
// Restart po aktualizacji jadra: w poludnie, poza oknem SUDOP (01:00-07:00)
// i poza importami (07:15, 10:00). Strona znika na okolo minute.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "12:30";
EOF

  krok "Swap 2 GB (next build na 2 GB RAM)"
  if swapon --show | grep -q .; then
    echo "swap juz jest"
  elif [ -f /swapfile ] || fallocate -l 2G /swapfile; then
    chmod 600 /swapfile
    { mkswap /swapfile >/dev/null && swapon /swapfile; } || echo "UWAGA: nie udalo sie wlaczyc swapu"
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  krok "Node.js 24"
  if ! node --version 2>/dev/null | grep -q '^v24\.'; then
    curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
    bash /tmp/nodesource_setup.sh
    apt-get install -y -q nodejs
  fi
  node --version

  krok "Caddy"
  if ! command -v caddy >/dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -q
    apt-get install -y -q caddy
  fi
  caddy version

  krok "Uzytkownik $UZYTKOWNIK i repozytorium w $KATALOG"
  id "$UZYTKOWNIK" >/dev/null 2>&1 \
    || useradd --system --create-home --home-dir "/home/$UZYTKOWNIK" --shell /usr/sbin/nologin "$UZYTKOWNIK"
  [ -d "$KATALOG/.git" ] || git clone "$REPO" "$KATALOG"
  chown -R "$UZYTKOWNIK:$UZYTKOWNIK" "$KATALOG"
  jako git log --oneline -1

  krok "Zaleznosci (npm ci)"
  jako npm ci --no-audit --no-fund

  krok "Ustawienia $USTAWIENIA"
  mkdir -p /etc/jawne
  if [ ! -f "$USTAWIENIA" ]; then
    ip=$(publiczne_ip)
    if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then host="${ip//./-}.sslip.io"; adres="https://$host"; else host=''; adres=''; fi
    cat > "$USTAWIENIA" <<EOF
# Ustawienia serwera jawne. Ten plik NIE trafia do repozytorium.
# Po zmianie: sudo jawne aktualizuj
#
# Adres strony. Bez domeny: publiczne IP z myslnikami + .sslip.io — Caddy
# sam pobierze certyfikat. Pusty JAWNE_HOST = sam HTTP pod adresem IP.
JAWNE_HOST=$host
JAWNE_ADRES_SERWISU=$adres
# Klucz GUS BDL (api.stat.gov.pl): limit 500 zamiast 100 zapytan na 15 minut.
GUS_BDL_KLUCZ=
# Adres do sprzeciwu (art. 21 RODO). Pusty = prog jawnosci nazw wylaczony.
JAWNE_KONTAKT=
NEXT_TELEMETRY_DISABLED=1
EOF
    echo "zalozony; adres: ${host:-brak (sam HTTP)}"
  else
    echo "juz jest — nie nadpisuje"
  fi
  chown "root:$UZYTKOWNIK" "$USTAWIENIA"
  chmod 640 "$USTAWIENIA"
  host=$(sed -n 's/^JAWNE_HOST=//p' "$USTAWIENIA")

  krok "Jednostki systemd i polecenie 'jawne'"
  install -m 644 "$KATALOG"/deploy/systemd/jawne-* /etc/systemd/system/
  systemctl daemon-reload
  printf '#!/bin/sh\nexec bash %s/deploy/jawne.sh "$@"\n' "$KATALOG" > /usr/local/bin/jawne
  chmod 755 /usr/local/bin/jawne

  if [ ! -f "$KATALOG/dane/sejm.db" ]; then
    krok "Brak bazy danych"
    echo "System gotowy, ale nie ma $KATALOG/dane/sejm.db."
    echo "Wgraj dane z komputera (docs/serwer.md, krok 8): sudo jawne wgraj /tmp/do-serwera.tgz"
    echo "Harmonogram NIE jest wlaczony — bez bazy nie ma czego uzupelniac."
    exit 0
  fi

  # Migracje i budowa NIE dziela maszyny z zadaniami danych.
  #
  # ZMIERZONE 04.10.2026: do tego dnia zadania zatrzymywalismy dopiero przed
  # budowa, czyli PO migracjach. Od 03.10 migracje sa ciezkie (sumy, skladanie
  # dziennika WAL), a historia SUDOP pisala w tym samym czasie do tej samej
  # 4,8 GB bazy: historia dostala „database is locked", a migracje staly
  # ponad godzine, nic nie czytajac i nic nie piszac — czekaly na proces,
  # ktory i tak mial byc zatrzymany kilka minut pozniej.
  #
  #
  # ZMIERZONE 30.09.2026: wdrozenie o 17:52 zostalo zabite przez jadro
  # („Killed" w fazie kompilacji). O :07 kazdej godziny startuje
  # jawne-sudop-historia, ktore czeka na kolejke urzedu DO 57 MINUT — wiec
  # w czasie budowy zyl drugi proces Node, trzymajacy pamiec i baze.
  # Na maszynie z 2 GB przegrywa ten wiekszy, czyli build.
  #
  # Zatrzymanie pobierania SUDOP kosztuje najwyzej jedno zapytanie: zakres,
  # ktorego kolejka nie oddala, wraca w nastepnym przebiegu, a blokada
  # (.blokada) jest zdejmowana na SIGTERM. Timery wracaja ZAWSZE — takze
  # po nieudanej budowie, przez pulapke nizej.
  krok "Zatrzymanie zadan danych na czas migracji i budowy"
  local timery=()
  local zadanie
  for zadanie in sudop-dzien sudop-historia sejm gus fundusze ted; do
    if systemctl is-enabled --quiet "jawne-$zadanie.timer" 2>/dev/null; then timery+=("jawne-$zadanie.timer"); fi
    systemctl stop "jawne-$zadanie.timer" 2>/dev/null || true
    # Stan, nie `is-active --quiet`: zadanie Type=oneshot W TRAKCIE pracy ma
    # stan „activating", a `--quiet` uznaje za dzialajace tylko „active".
    # ZMIERZONE 04.10.2026: timery wylaczone, a sudop-historia pisala do bazy
    # dalej — razem z migracjami i z budowa, czyli dokladnie to, przed czym
    # ten krok mial chronic.
    local stan
    stan=$(systemctl is-active "jawne-$zadanie.service" 2>/dev/null || true)
    if [[ "$stan" == active || "$stan" == activating || "$stan" == reloading ]]; then
      echo "   przerywam trwajace zadanie: $zadanie"
      systemctl stop "jawne-$zadanie.service" 2>/dev/null || true
    fi
  done
  # shellcheck disable=SC2064
  trap "systemctl start ${timery[*]:-} 2>/dev/null || true" EXIT
  echo "   wylaczone na czas migracji i budowy: ${#timery[@]} timerow"
  free -m | sed 's/^/   /'

  krok "Migracje bazy"
  # Przed budowa, nie po: strona czyta kolumny wprost, a brakujaca kolumna
  # nie jest lapana jak brakujaca tabela — wywrocilaby strone gminy.
# ZMIERZONE 02.10.2026: `migracje.ts` przewrocilo wdrozenie z „Ineffective
# mark-compacts near heap limit" przy 910 MB. Domyslna sterta Node na maszynie
# z 2 GB RAM to ok. 920 MB, a `policzAgregaty` buduje w pamieci mape WSZYSTKICH
# firm w kraju — po dociagnieciu zakresu z 853 tys. wierszy przestala sie
# miescic. Maszyna ma 1,8 GB RAM i 2 GB swapu, a ten krok chodzi SAM (budowa
# jest pozniej), wiec 1 400 MB jest bezpieczne.
# To ZATRZYMANIE KRWAWIENIA, nie naprawa: mapa rosnie razem z rejestrem, wiec
# predzej czy pozniej przebije i ten limit. Wlasciwa naprawa to liczenie listy
# firm strumieniem z SQL — patrz docs/plan.md.
# NODE_OPTIONS, a nie flaga przy `node` — i to jest roznica, ktora kosztowala
# jedno nieudane wdrozenie. `node_modules/.bin/tsx` to skrypt powloki, a tsx
# odpala PROCES POTOMNY, ktory robi cala robote. Flaga podana przy `node`
# dotyczy rodzica; dziecko dziedziczy tylko zmienne srodowiska. ZMIERZONE:
# po dodaniu flagi przy `node` proces nadal padal przy 914 MB, czyli dokladnie
# na domyslnym limicie.
  jako env NODE_OPTIONS=--max-old-space-size=1400 node_modules/.bin/tsx ingest/jobs/migracje.ts


  # Budujemy OBOK i podmieniamy dopiero po sukcesie. Przedtem bylo odwrotnie:
  # najpierw `stop`, potem budowa w `.next` w miejscu — wiec nieudana budowa
  # zostawiala i wylaczony serwis, i uszkodzony katalog. Tak zniknela strona
  # na dobe 27.09.2026 i drugi raz 28.09.2026. Teraz stara wersja serwuje
  # przez caly czas budowy, a przerwa trwa tyle, co restart.
  krok "Budowa strony (kilkanascie minut; strona dziala na starej wersji)"
  jako rm -rf .next-budowa
  # „Killed" bez zadnego wyjasnienia to komunikat POWLOKI o zabiciu procesu
  # przez jadro. Nazwijmy mechanizm od razu, zamiast kazac go szukac.
  if ! jako bash -c "set -a; . '$USTAWIENIA'; set +a; JAWNE_KATALOG_BUDOWY=.next-budowa exec npm run build"; then
    echo "Budowa nie doszla do konca. Ostatnie zabicia procesu przez jadro (brak pamieci):"
    dmesg -T 2>/dev/null | grep -iE 'killed process|out of memory' | tail -3 | sed 's/^/   /'       || echo "   (dziennik jadra niedostepny — sprawdz: sudo dmesg -T | grep -i 'killed process')"
    exit 1
  fi
  [ -f "$KATALOG/.next-budowa/prerender-manifest.json" ]     || { echo "Budowa nie zostawila kompletu plikow — nie podmieniam dzialajacej strony."; exit 1; }

  # Next dopisuje do tsconfig.json sciezki katalogu budowy. Wpisy dla
  # `.next-budowa` sa juz w repozytorium, ale gdyby kiedys dopisal cokolwiek
  # jeszcze, brudny plik zatrzymalby NASTEPNE wdrozenie na `git pull --ff-only`.
  jako git checkout -- tsconfig.json 2>/dev/null || true

  krok "Podmiana wersji (tu strona na chwile milknie)"
  systemctl stop jawne-strona 2>/dev/null || true
  jako rm -rf .next-poprzednia
  [ -d "$KATALOG/.next" ] && jako mv .next .next-poprzednia
  jako mv .next-budowa .next
  # Z CZEGO zbudowano — zeby `sudo jawne stan` mogl to porownac z HEAD.
  # ZMIERZONE 03.10.2026: HEAD stal piec commitow i dziewiec godzin PRZED
  # dzialajaca strona, bo `aktualizuj` padl po `git pull`, a przed budowa —
  # i nic tego nie mowilo. Potrzebny jest commit, nie data pliku: pull
  # starszego commita dalby „nowszy build" przy starym kodzie.
  jako bash -c 'git log -1 --format=%H > .next/ZBUDOWANO_Z'
  systemctl reset-failed jawne-strona 2>/dev/null || true
  systemctl enable jawne-strona >/dev/null
  systemctl restart jawne-strona

  krok "Caddy: ${host:-:80}"
  # PO podmianie wersji, nie przed nia (do 03.10.2026 byl przed budowa).
  # Od tego dnia Caddy prowadzi dziennik wejsc, a polityka prywatnosci
  # mowi o nim dopiero w nowej wersji strony. W starej kolejnosci dziennik
  # ruszalby kwadrans wczesniej, a czytelnik czytalby w tym czasie „nie
  # prowadzimy dziennika wejsc" — czyli nieprawde. Przy okazji zmiana domeny
  # wchodzi razem z wersja, ktora ja zna, a nie ze stara.
  if [ -n "$host" ]; then
    sed -e "s|ADRES|$host|g" "$KATALOG/deploy/Caddyfile" > /etc/caddy/Caddyfile
  else
    # Bez domeny: sam HTTP pod adresem IP, bez bloku www.
    sed -e '/^# WWW-POCZATEK/,/^# WWW-KONIEC/d' -e "s|^ADRES {|:80 {|" \
      "$KATALOG/deploy/Caddyfile" > /etc/caddy/Caddyfile
  fi
  # Walidacja jako uzytkownik caddy, NIE jako root. ZMIERZONE 03.10.2026:
  # `caddy validate` OTWIERA plik dziennika („opening log writer … wejscia.log").
  # Uruchomiona jako root utworzylaby go z wlascicielem root, a usluga Caddy
  # (uzytkownik caddy) nie moglaby potem do niego pisac — przeladowanie by
  # padlo, a dziennik nie ruszylby nigdy, bez slowa w tym skrypcie.
  sudo -u caddy -H caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  systemctl enable caddy >/dev/null
  systemctl reload-or-restart caddy

  krok "Harmonogram danych"
  for t in sudop-dzien sudop-historia sejm gus fundusze ted; do
    systemctl enable --now "jawne-$t.timer" >/dev/null
  done
  systemctl list-timers 'jawne-*' --no-pager

  krok "Gotowe"
  if [ -n "$host" ]; then echo "Strona:   https://$host"; else echo "Strona:   http://<publiczne IP maszyny>"; fi
  echo "Stan:     sudo jawne stan"
  echo "Kontrola: sudo jawne sprawdz"
}

main "$@"
