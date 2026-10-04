# Przebudowa wyglądu i nawigacji — zadanie

Zlecone 04.10.2026 przez Pawła. Wykonawca: sesja pomocnicza (chmura).
Kod strony zmienia potem główny agent, po akceptacji Pawła.

## Po co

Paweł, 04.10.2026: „Widać, że do tej strony zostało wiele wprowadzone.
Bardzo dużo informacji, z których ciężko coś wyciągnąć. Chcę, aby poruszanie
po stronie było intuicyjne i aby nie było niedopowiedzeń. Nadać jej konkretny
i specyficzny styl — aktualnie wygląda jak większość stron generowanych
przez AI.”

Fakty z pomiarów (raport UI z 03.10, `docs/raport-pomyslow.md` i commity):
strona gminy na telefonie ma ok. 45 000 px wysokości, lista posłów 37 000 px,
głosowanie 30 000 px; układ jest technicznie czysty (zero poziomego
przewijania, zero błędów konsoli), problemem jest **hierarchia i gęstość**,
nie usterki.

## Kto czyta serwis

1. Mieszkaniec bez przygotowania: „co z moją gminą?”, „jak głosował mój
   poseł?”, „czy ta firma dostała pieniądze?” — chce odpowiedzi w 10 sekund.
2. Dziennikarz lokalny / radny: chce liczby z mianownikiem i źródłem, do
   zacytowania.
3. Ktoś, kto przyszedł z linku (podgląd w mediach społecznościowych) — trafia
   na środek serwisu, nie na stronę główną.

## Czego nie wolno zmienić (to treść, nie styl — `CLAUDE.md`, „Zasady”)

- przy każdej liczbie odnośnik do rejestru, wyglądający jak element
  interfejsu, nie przypis (zasada 1);
- liczba zawsze z mianownikiem (3); półpauza ≠ zero (4);
- nie oceniamy, bez rankingów osób, odznak, czerwono-zielonych „ocen” (6);
- reguły jawności nazw (7) i warunki UOKiK przy SUDOP (10);
- tryb jasny i ciemny, kontrast WCAG AA (test `src/lib/kontrast.test.ts`),
  cele dotykowe ≥ 24 px, telefon 390 px, polskie znaki (fonty `latin-ext`).

Ograniczenia techniczne: Next.js 16 + Tailwind 4 (`@theme` w `globals.css`),
budowa na serwerze z 1,8 GB pamięci (webpack — pułapka 58), waga stron
(pułapka 54: komponent powtarzany na 499 stronach posłów mnoży koszt).
Biblioteki UI i fonty wolno proponować, z podaną wagą.

## Co ma powstać (w `docs/przebudowa/`, bez zmian w `src/`)

1. **`przeglad.md`** — przegląd tego, co jest: trasy (`src/app/*`), menu,
   ścieżki czytelnika z punktu „Kto czyta” (ile kliknięć do odpowiedzi,
   gdzie się gubi), co się powtarza, gdzie brakuje wyjaśnienia
   („niedopowiedzenia”), które sekcje stron są najważniejsze, a które są
   metodologią. Konkretne strony i cytaty, nie ogólniki.
2. **`kierunek.md`** — 2–3 wyraźnie różne kierunki stylu, każdy z nazwą,
   uzasadnieniem z charakteru serwisu (rejestr, dokument, wiarygodność),
   typografią (konkretne fonty), paletą (jasna i ciemna, z kontrastem),
   siatką, sposobem pokazywania liczb i źródeł, i **jedną rekomendacją**.
   Wprost: czym każdy kierunek różni się od „typowej strony z AI”
   (zaokrąglone karty z cieniem wszędzie, gradienty, pastelowe tła,
   generyczne nagłówki).
3. **`nawigacja.md`** — mapa serwisu i menu; szablon każdej głównej strony
   (główna, gmina, poseł, firma, ustawa, głosowanie, pomoc publiczna):
   co widać od razu (3–4 najważniejsze rzeczy), kolejność sekcji, co schodzi
   do rozwijanych „Jak to liczymy”, jak wraca się do szerszego widoku.
4. **`prototyp/`** — statyczne strony HTML w rekomendowanym stylu: strona
   główna, gmina, poseł (i firma, jeśli starczy czasu), na prawdziwych
   liczbach przepisanych z https://zrejestru.pl, z odnośnikami do źródeł jak
   na żywej stronie. Do obejrzenia w przeglądarce, wersja na telefon
   i komputer, motyw jasny i ciemny.
5. **Teksty** — poprzednie zadanie (`przeglad-tekstow-stron`) wchodzi tutaj:
   co skrócić, co schować, co się powtarza, z cytatem miejsca.

Działająca strona: https://zrejestru.pl (może być o jedno wdrożenie starsza
niż `main`). Zrzuty i mierzenie wagi — jeśli masz przeglądarkę bezgłową;
jeśli nie, napisz w raporcie, co oparte jest na samym kodzie.

## Jak oddać

Commity w `docs/przebudowa/`, potem wiadomość `DO-glowny__…__przebudowa.md`
(do ~25 linii: co powstało, rekomendacja w trzech zdaniach, pytania do
Pawła). Paweł wybiera kierunek; główny wdraża w `src/` etapami.
