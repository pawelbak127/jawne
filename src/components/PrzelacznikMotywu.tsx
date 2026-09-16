'use client';

/**
 * Przelacznik motywu — BEZ STANU REACTA.
 *
 * Obie ikony sa w HTML-u zawsze, a o tym, ktora widac, decyduje CSS na
 * podstawie `data-motyw` i preferencji systemu. Dzieki temu nie ma tu ani
 * `useEffect`, ani stanu "czy juz zamontowany", ani ryzyka, ze serwer
 * wyrenderuje inna ikone niz przegladarka. Stan trzyma dokument, nie React.
 */
export function PrzelacznikMotywu() {
  function przelacz() {
    const ustawiony = document.documentElement.dataset.motyw;
    const ciemnyWSystemie = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const jestCiemny = ustawiony ? ustawiony === 'ciemny' : ciemnyWSystemie;
    const nowy = jestCiemny ? 'jasny' : 'ciemny';
    document.documentElement.dataset.motyw = nowy;
    try {
      localStorage.setItem('motyw', nowy);
    } catch {
      // Tryb prywatny albo zablokowane dane witryny. Brak zapisu nie moze
      // psuc przelaczania w biezacej karcie, wiec tylko to pomijamy.
    }
  }

  return (
    <button
      type="button"
      onClick={przelacz}
      aria-label="Przełącz motyw jasny i ciemny"
      className="ml-1 grid h-9 w-9 place-items-center rounded-lg text-atrament-2 transition-colors hover:bg-papier-3 hover:text-atrament"
    >
      <svg viewBox="0 0 24 24" className="ikona-jasny h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="ikona-ciemny h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM3 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm16 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1ZM5.6 5.6a1 1 0 0 1 1.4 0l.7.7a1 1 0 0 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4Zm10.7 10.7a1 1 0 0 1 1.4 0l.7.7a1 1 0 0 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4Zm2.1-10.7a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0ZM7.7 16.3a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0Z" />
      </svg>
    </button>
  );
}
