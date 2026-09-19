# Autopilot — stałe instrukcje dla przebiegów automatycznych

**Status: PROJEKT.** Wchodzi w życie w fazie 2 planu (`docs/plan.md`), gdy
serwer działa i Paweł zatwierdzi ten dokument. Każdy przebieg uruchamia
harmonogram na serwerze i dostaje ten plik jako polecenie.

Przebieg to **nowa sesja bez pamięci poprzednich**. Wszystko, co trzeba
wiedzieć, jest w `CLAUDE.md`, `docs/plan.md` i w dzienniku autopilota.

---

## Cel jednego przebiegu

Jedna mała, sprawdzona porcja postępu — albo uczciwe „nic nie zrobiłem,
bo…”. Lepiej jeden dobry pull request niż trzy niedokończone.

## Kolejność — zawsze ta sama

1. **Stan.** `npm run stan`, `systemctl list-timers 'jawne-*'`, błędy
   z ostatnich 6 godzin: `journalctl -u 'jawne-*' --since '-6h' -p warning`.
2. **Zdrowie danych.** Jeśli zadanie danych padło: zdiagnozuj przyczynę
   z logów i napraw ją **w kodzie** (gałąź + pull request). Nie uruchamiaj
   ręcznie zapytań do SUDOP — robi to wyłącznie harmonogram.
3. **Jedno zadanie z `docs/plan.md`**, sekcja „Kolejne kroki”: najmniejszy
   sensowny kawałek, który da się skończyć w tym przebiegu.
   - gałąź `auto/RRRR-MM-DD-GG`,
   - `npx tsc --noEmit`, `npm test`, `npx eslint src ingest scripts`, `npm run build`
     — wszystko zielone,
   - sprawdzenie na wyrenderowanej stronie (curl na testowym serwerze),
   - pull request z opisem po polsku: co, dlaczego, jak sprawdzone.
4. **Dziennik.** Dopisz wpis do zgłoszenia „Dziennik autopilota” na GitHubie:
   stan danych w dwóch liczbach, co zrobione (link do PR), co zostawione
   Pawłowi i dlaczego.

## Zakazy

- **Nie wypychaj na `main`.** Tylko gałąź i pull request — scala Paweł.
- **Nie zmieniaj reguł prywatności** (`src/lib/prywatnosc.ts`: próg, lista
  znaczników, tryb lokalny) ani zdań o nich na stronach.
- **Nie zmieniaj tempa ani harmonogramu SUDOP.** Obietnica wobec UOKiK
  („jedno zapytanie naraz, historia nocą”) nie jest parametrem do strojenia.
- **Nie usuwaj danych** z `dane/` ani z bazy; nie rób `--od-nowa` pełnych importów.
- **Nie ruszaj infrastruktury**: konfiguracji AWS, systemd, Caddy, kluczy.
  Jeśli widzisz problem — opisz go w dzienniku.
- **Nie czytaj i nie wypisuj sekretów** (`.env.local`, tokeny).
- **Maksymalnie 3 próby naprawy tego samego błędu.** Potem zatrzymaj się
  i opisz w dzienniku, co próbowałeś i co zmierzyłeś.

## Decyzje, które zawsze zostawiasz Pawłowi

- wszystko o nazwiskach i danych osobowych,
- kontakt z urzędami (UOKiK, GUS, UODO) i treść pism,
- zdjęcie `noindex`, domena, premiera,
- koszty: cokolwiek, co może zwiększyć rachunek AWS,
- zmiana decyzji zapisanych w `docs/plan.md` i `CLAUDE.md`.

## Kiedy nic nie robić

Gdy testy na `main` są czerwone i przyczyna nie jest oczywista, gdy
poprzedni pull request autopilota czeka na przegląd i następne zadanie od
niego zależy, albo gdy plan nie ma zadania dającego się zrobić bez decyzji
Pawła — wpis do dziennika i koniec. Pusty przebieg jest w porządku;
zgadywanie nie jest.
