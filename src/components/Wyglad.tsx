'use client';

import { useEffect, useRef } from 'react';

/**
 * Przelacznik „Wyglad”: styl strony (Standardowy / Wypis z rejestru) i jasnosc.
 *
 * Decyzja Pawla z 07.10.2026: dwie wersje, wybiera czytelnik. Zastepuje dawny
 * przycisk jasny/ciemny — ten sam komponent na kazdej z 499 stron poslow, wiec
 * jeden, maly (pulapka 54).
 *
 * Stan trzyma DOKUMENT (`data-styl`, `data-motyw` na <html>), nie React:
 * skrypt w <head> ustawia je z localStorage przed pierwszym malowaniem, a tu
 * tylko je czytamy i zmieniamy. Serwer zawsze renderuje te sama, pusta forme
 * pol — zaznaczenie dochodzi po zamontowaniu — wiec nie ma rozjazdu hydracji.
 * Bez JavaScriptu przelacznika nie widac (CSS: `:root[data-js] .wyglad`).
 */
type Styl = 'standard' | 'a';
type Jasnosc = 'system' | 'jasny' | 'ciemny';

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
  const formularz = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const d = document.documentElement.dataset;
    const styl: Styl = d.styl === 'a' ? 'a' : 'standard';
    const jasnosc: Jasnosc = d.motyw === 'jasny' || d.motyw === 'ciemny' ? d.motyw : 'system';
    const f = formularz.current;
    if (!f) return;
    for (const pole of f.querySelectorAll<HTMLInputElement>('input[type=radio]')) {
      pole.checked = (pole.name === 'styl' && pole.value === styl) || (pole.name === 'jasnosc' && pole.value === jasnosc);
    }
  }, []);

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
  }

  return (
    <details className="panel wyglad">
      <summary className="przycisk-naglowka" aria-label="Wygląd strony">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
        </svg>
        <span className="napis">Wygląd</span>
      </summary>
      <form ref={formularz} className="wyglad-panel" onChange={zmiana}>
        <fieldset>
          <legend>Styl strony</legend>
          <label>
            <input type="radio" name="styl" value="standard" />
            Standardowy
            <span>duże pismo, wszystko na wierzchu; na komputerze gęściej</span>
          </label>
          <label>
            <input type="radio" name="styl" value="a" />
            Wypis z rejestru
            <span>jak odpis z urzędu: ponumerowane działy, „podstawa” przy liczbie</span>
          </label>
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
  );
}
