#!/usr/bin/env bash
# Jedno zadanie danych. Wywoluja je jednostki systemd jawne-*.service
# (deploy/systemd/), recznie: sudo systemctl start jawne-sejm.service
#
#   zadanie.sh sejm | gus | fundusze | sudop-dzien | sudop-historia | porzadki
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
    # oswiadczenia: z pliku w repozytorium (wykaz Kancelarii Sejmu), bez sieci, ulamek sekundy.
    # miniatury: bez sieci, tylko brakujace (pierwszy raz ok. 3 s, potem nic).
    etapy="kluby poslowie glosowania glosy procesy streszczenia interpelacje zapytania wystapienia komisje obecnosc oswiadczenia miniatury"
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
    # BZP (zamowienia krajowe) — najnowsze dni najpierw, budzet 45 min na noc,
    # wiec historia od poczatku kadencji domyka sie przez kilka nocy. Awaria
    # e-Zamowien nie moze zabrac REGON-u, ktory sluzy tez TED i SUDOP.
    "$TSX" ingest/jobs/import.ts bzp || echo "BZP: blad (kod $?) — REGON i tak rusza"
    # REGON mowi, kim jest NIP zamawiajacego — bez tego nie ma "zamowien
    # w gminie". Bez klucza po prostu tego nie robimy: brak klucza to stan,
    # nie awaria, a zadanie ma nie padac z tego powodu.
    if [ -n "${GUS_BIR_KLUCZ:-}" ]; then
      exec "$TSX" ingest/jobs/import.ts regon
    else
      echo "Pomijam etap REGON — brak GUS_BIR_KLUCZ (sudo jawne ustaw GUS_BIR_KLUCZ)."
    fi
    ;;
  porzadki)
    # PAMIEC PODRECZNA STRON NA DYSKU MA SUFIT: doba. ZMIERZONE 13.10.2026:
    # .next urosl z ok. 250 MB do 7,2 GB w cztery dni — strony firm (4,1 GB,
    # 22 tys. stron), gmin (1,5 GB, wszystkie 2 479), glosowan, organow.
    # Next zapisuje kazda strone renderowana na zadanie (generateStaticParams
    # zwraca [], revalidate z layout.tsx) i nigdy jej nie usuwa; przy ok.
    # 230 tys. firm to kilkadziesiat GB, czyli wiecej niz dysk. Usuniety plik
    # nic nie psuje: przy nastepnym wejsciu Next wyrenderuje strone od nowa.
    # Usuwamy TYLKO wpisy pamieci podrecznej ({id}.html/.rsc/.meta/.segments),
    # nigdy katalogow z kodem trasy ([nip], [teryt] …).
    #
    # TYLKO FIRMY (zmiana 14.10.2026). Sufitu potrzebuje zbior, ktory rosnie
    # z liczba adresow bez granicy — firm jest ok. 230 tys. Gmin jest 2 479
    # (ok. 1,5 GB), glosowan, ustaw i organow tez skonczona liczba: te strony
    # zostaja, a Next odswieza je w tle (revalidate). Usuwanie ich kosztowalo
    # czytelnika ZIMNE renderowanie: ZMIERZONE na serwerze — Warszawa 9 s,
    # Krakow 5,8 s, a przez ten czas nie odpowiada zadna strona (pulapka 69).
    # Koszt to przeczytanie wszystkich firm miasta (Wroclaw: 82 tys. wierszy,
    # 0,94 s na zimno), nie REGON (0,05 s) — sprawdzone, zanim cos zmienilem.
    for k in .next/server/app/firma; do
      [ -d "$k" ] || continue
      przed=$(du -sm "$k" | cut -f1)
      find "$k" -mindepth 1 -maxdepth 1 \( -name '*.html' -o -name '*.rsc' -o -name '*.meta' -o -name '*.segments' \) \
        -mmin +1440 -exec rm -rf {} +
      echo "$k: ${przed} MB -> $(du -sm "$k" | cut -f1) MB"
    done
    # DZIENNIK WAL tez potrzebuje sufitu (15.10.2026). ZMIERZONE: 2,2 GB doba
    # po wdrozeniu — historia SUDOP pisze co godzine, a skladal go dotad tylko
    # krok migracji przy wdrozeniu. W trybie WAL kazdy odczyt przeglada
    # dziennik, wiec to koszt kazdego wejscia czytelnika (pulapka 67).
    # Ten sam sposob co w migracjach: najwyzej minuta czekania na blokade;
    # gdy czytelnik trzyma dziennik, sqlite oddaje busy=1 i zlozy sie za 6 h.
    # `timeout` ucina bezpiecznie — przerwane skladanie zostawia poprawny WAL.
    if [ -f dane/sejm.db ]; then
      wal_przed=$(du -m dane/sejm.db-wal 2>/dev/null | cut -f1 || echo 0)
      wynik=$(timeout 900 sqlite3 -cmd '.timeout 60000' dane/sejm.db 'pragma wal_checkpoint(truncate);' 2>&1 || true)
      echo "dziennik WAL: ${wal_przed:-0} MB -> $(du -m dane/sejm.db-wal 2>/dev/null | cut -f1 || echo 0) MB (busy|strony|zlozone: ${wynik})"
    fi
    df -h . | tail -1 | awk '{print "dysk: zajete " $3 " z " $2 " (" $5 "), wolne " $4}'
    ;;
  sudop-dzien)
    # Znacznik „czekam na blokade": historia sprawdza go przed kazda strona
    # i ustepuje, zamiast konczyc caly przydzial (17–18.10.2026 dzienne
    # czekalo od 22:00 do 04:38, bo strona szla 20–55 minut). PID to ten
    # proces — po `exec` sam flock, zywy az do konca zadania dziennego.
    mkdir -p dane/zrodla/sudop
    echo $$ > dane/zrodla/sudop/.czeka-dzienne
    sudop 79200 --dzienny
    ;;
  sudop-historia)
    # 20, nie 24: nieudane zapytanie kosztuje 57 min czekania i kwadrans
    # przerwy, czyli 72 min. Dwadziescia razy 72 min to niecala doba, wiec
    # przebieg na pewno skonczy sie w ciagu dnia i zwolni blokade zadaniu
    # dziennemu. Przy samych sukcesach (52 min) to ok. 17 godzin.
    # --maks-minut: jednostka ma TimeoutStartSec=11h. 20.10.2026 systemd zabil
    # przebieg w trakcie czekania na kolejke (20–57 min na strone). 540 min
    # to 11 h minus najdluzsze czekanie (57 min), kwadrans przerwy po bledzie
    # i ok. 30 min na sumy po przebiegu.
    sudop 60 --historia --maks-zapytan=20 --okno=zawsze --maks-minut=540
    ;;
  *)
    echo "Uzycie: $0 sejm|gus|fundusze|ted|sudop-dzien|sudop-historia|porzadki" >&2
    exit 2
    ;;
esac
