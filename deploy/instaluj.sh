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

main() {
  local ip host adres
  [ "$(id -u)" = 0 ] || { echo "Uruchom przez sudo: sudo bash $0"; exit 1; }

  krok "System: strefa czasowa, pakiety, automatyczne aktualizacje"
  timedatectl set-timezone Europe/Warsaw 2>/dev/null || ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime
  apt-get update -q
  apt-get install -y -q git curl ca-certificates gnupg sqlite3 sudo unattended-upgrades \
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

  krok "Caddy: ${host:-:80}"
  sed "s|^ADRES {|${host:-:80} {|" "$KATALOG/deploy/Caddyfile" > /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  systemctl enable caddy >/dev/null
  systemctl reload-or-restart caddy

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

  krok "Budowa strony (kilka minut; strona w tym czasie nie odpowiada)"
  systemctl stop jawne-strona 2>/dev/null || true
  jako bash -c "set -a; . '$USTAWIENIA'; set +a; exec npm run build"
  systemctl enable jawne-strona >/dev/null
  systemctl restart jawne-strona

  krok "Harmonogram danych"
  for t in sudop-dzien sudop-historia sejm gus fundusze; do
    systemctl enable --now "jawne-$t.timer" >/dev/null
  done
  systemctl list-timers 'jawne-*' --no-pager

  krok "Gotowe"
  if [ -n "$host" ]; then echo "Strona:   https://$host"; else echo "Strona:   http://<publiczne IP maszyny>"; fi
  echo "Stan:     sudo jawne stan"
  echo "Kontrola: sudo jawne sprawdz"
}

main "$@"
