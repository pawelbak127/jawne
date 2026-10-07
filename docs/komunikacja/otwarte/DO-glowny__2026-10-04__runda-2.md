Od: przebudowa   Do: glowny (dla Pawła)   Data: 2026-10-04
Gałąź / commit: claude/add-project-summaries-9fumtv (PR pawelbak127/jawne#2)

# Runda 2 gotowa: 10 motywów na fundamencie F1–F14, każdy zmierzony

> **07.10.2026: Paweł wybrał** dwie wersje z przełącznikiem — Standardowy (J+G) i Wypis z rejestru (A).
> Szczegóły: `DO-glowny__2026-10-07__dwie-wersje.md`. Dziesięć motywów jest w `docs/przebudowa/archiwum/`.

**Co powstało.**
- `prototyp/styl.css` — fundament: struktura, kolejność, rozmiary.
- `prototyp/skora-a…j.css` — 10 motywów jako sama warstwa stylu.
- `prototyp/pomiar.cjs` — pomiar F1–F14 w Playwright.
- `kierunek.md` — tabela pomiarów, rachunek każdego zdania
  porównawczego, a dla każdego motywu: co zmienił względem rundy 1 i czym
  różni się od typowej strony z AI.
- `nawigacja.md`, dział 0 — co fundament zmienia w szablonach stron.

Wynik pomiaru: **wszystkie 10 spełniają F1–F14** na 13 stronach, przy
390 i 1280 px. Do tego 600 renderów bez przepełnienia i bez błędów
konsoli, kontrast ≥ 4,5:1 i cele dotykowe ≥ 24 px. Fonty mają 50–142 kB,
wobec Twoich zmierzonych 221 kB dziś.

**Zmiany tożsamości:**
- **G**: „ciemny najpierw” → jasny „Pulpit”. Menu zostaje u góry, z boku
  od 1280 px jest tylko spis działów (F2/F3).
- **I**: barwne tła i ramki na wszystkim → „Plakat”: jedna naklejka
  z cieniem, a żółć tylko przy wskazaniu (F4/F6).
- **H**: bez warstwic (F14).
- **B**: bez winiety pośrodku i bez łamów (F2/F5).

**Jedno odstępstwo od przykładu w `runda-2.md`:** F10 nie pyta o „dochody na
mieszkańca” ani „ilu było przeciw” — obie liczby stoją na pierwszym ekranie
(F1). Pyta o udział oświaty w wydatkach Krakowa i o to, w ilu z 11 klubów
najczęściej padało „przeciw”.

**Które wypadły najlepiej.** Fundament przestał różnicować — wszystkie
przechodzą. Najmocniejsze wyniki:
- J: 50 kB, zero ramek na ekranie, najbardziej typowy układ;
- E i F: zero ramek na ekranie;
- C i I: zero odcieni poza czernią i bielą.

**Propozycja dla Pawła: A, J, F.**
- **A** najlepiej mówi, czym serwis jest („podstawa:” przy każdej liczbie).
- **J** to najbezpieczniejszy wybór: najbardziej typowy układ i najlżejsze
  fonty.
- **F** najbardziej zaprasza mieszkańca.

Odważniej: I.

**Pytanie do Ciebie przy wdrożeniu:** adres e-mail w stopce bierze się
z `JAWNE_KONTAKT`. Czy stopka może go pokazywać na każdej stronie (F13),
czy ma wskazywać na `/o-serwisie`?

Tę wiadomość zamknij sam (`git mv` do `zamkniete/`), gdy Paweł wybierze.
