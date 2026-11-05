'use client';

import { useEffect, useRef } from 'react';

/**
 * Przelacznik wygladu: widok strony (Przystepny / Wypis z rejestru) i jasnosc.
 *
 * Decyzja Pawla z 07.10.2026: dwie wersje, wybiera czytelnik. Zastepuje dawny
 * przycisk jasny/ciemny — ten sam komponent na kazdej z 499 stron poslow, wiec
 * jeden, maly (pulapka 54).
 *
 * Od 05.11.2026 widok jest na komputerze na wierzchu (przelacznik dwusegmentowy),
 * a pod ikona zostaje jasnosc. Na telefonie nie ma miejsca na dwa segmenty, wiec
 * oba wybory leza pod ikona. Stad DWA formularze z tym samym `name` — kazdy ma
 * wlasna grupe radio — i wspolne ustawianie zaznaczenia.
 *
 * Stan trzyma DOKUMENT (`data-styl`, `data-motyw` na <html>), nie React:
 * skrypt w <head> ustawia je z localStorage przed pierwszym malowaniem, a tu
 * tylko je czytamy i zmieniamy. Serwer zawsze renderuje te sama, pusta forme
 * pol — zaznaczenie dochodzi po zamontowaniu — wiec nie ma rozjazdu hydracji.
 * Podswietlenie segmentu idzie za `data-styl` w CSS, wiec nie miga do hydracji.
 * Bez JavaScriptu przelacznika nie widac (CSS: `:root[data-js] .wyglad`).
 */
type Styl = 'standard' | 'a';
type Jasnosc = 'system' | 'jasny' | 'ciemny';

const OPIS_WIDOKU: Record<Styl, { nazwa: string; opis: string }> = {
  standard: { nazwa: 'Przystępny', opis: 'duże pismo, najważniejsze na wierzchu, szczegóły po rozwinięciu' },
  a: { nazwa: 'Wypis z rejestru', opis: 'jak odpis z urzędu: ponumerowane działy, „podstawa” przy liczbie, szczegóły od razu rozwinięte' },
};

function zapisz(klucz: string, wartosc: string | null) {
  try {
    if (wartosc === null) localStorage.removeItem(klucz);
    else localStorage.setItem(klucz, wartosc);
  } catch {
    // Tryb prywatny albo zablokowane dane witryny: wybor dziala w tej karcie,
    // tylko nie zostanie zapamietany.
  }
}

export function Wyglad() {
  const segmenty = useRef<HTMLFormElement>(null);
  const panel = useRef<HTMLFormElement>(null);

  function zaznacz() {
    const d = document.documentElement.dataset;
    const styl: Styl = d.styl === 'a' ? 'a' : 'standard';
    const jasnosc: Jasnosc = d.motyw === 'jasny' || d.motyw === 'ciemny' ? d.motyw : 'system';
    for (const f of [segmenty.current, panel.current]) {
      for (const pole of f?.querySelectorAll<HTMLInputElement>('input[type=radio]') ?? []) {
        pole.checked = (pole.name === 'styl' && pole.value === styl) || (pole.name === 'jasnosc' && pole.value === jasnosc);
      }
    }
  }

  useEffect(zaznacz, []);

  function zmiana(e: React.ChangeEvent<HTMLFormElement>) {
    const pole = e.target as unknown as HTMLInputElement;
    const d = document.documentElement.dataset;
    if (pole.name === 'styl') {
      if (pole.value === 'a') d.styl = 'a';
      else delete d.styl;
      zapisz('styl', pole.value === 'a' ? 'a' : null);
    } else if (pole.name === 'jasnosc') {
      if (pole.value === 'system') delete d.motyw;
      else d.motyw = pole.value;
      zapisz('motyw', pole.value === 'system' ? null : pole.value);
    }
    zaznacz();
  }

  return (
    <>
      <form ref={segmenty} className="widok" onChange={zmiana}>
        <span id="widok-etykieta">Widok:</span>
        <div role="radiogroup" aria-labelledby="widok-etykieta" className="segmenty">
          {(Object.keys(OPIS_WIDOKU) as Styl[]).map((s) => (
            <label key={s} title={OPIS_WIDOKU[s].opis}>
              <input type="radio" name="styl" value={s} />
              <span>{OPIS_WIDOKU[s].nazwa}</span>
            </label>
          ))}
        </div>
      </form>

      <details className="panel wyglad">
        <summary className="przycisk-naglowka" aria-label="Wygląd strony" title="Jasność strony">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
          </svg>
        </summary>
        <form ref={panel} className="wyglad-panel" onChange={zmiana}>
          <fieldset className="widok-w-panelu">
            <legend>Widok</legend>
            {(Object.keys(OPIS_WIDOKU) as Styl[]).map((s) => (
              <label key={s}>
                <input type="radio" name="styl" value={s} />
                {OPIS_WIDOKU[s].nazwa}
                <span>{OPIS_WIDOKU[s].opis}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Jasność</legend>
            <div className="jasnosc">
              <label><input type="radio" name="jasnosc" value="system" />jak w systemie</label>
              <label><input type="radio" name="jasnosc" value="jasny" />jasny</label>
              <label><input type="radio" name="jasnosc" value="ciemny" />ciemny</label>
            </div>
          </fieldset>
        </form>
      </details>
    </>
  );
}
