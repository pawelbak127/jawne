'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * „Jak myslisz, ile…?” (F10). Kto zgaduje przed zobaczeniem liczby, lepiej ja
 * pamieta i rozumie — takze bez wiedzy o temacie (Kim, Reinecke, Hullman,
 * CHI 2017; docs/przebudowa/badania-ux.md §3).
 *
 * Opcjonalne i pomijalne jednym kliknieciem. Bez JavaScriptu (i do chwili
 * zamontowania) widac od razu odpowiedz — serwer renderuje ja zawsze, wiec
 * tresc jest w HTML-u i w wyszukiwarce. Pytamy tylko o liczby o miejscach
 * i o calym Sejmie, nigdy o to, jak glosowal konkretny posel (zasada 6).
 */
export function Zgadnij({ id, pytanie, prawda, min = 0, max = 100, jednostka = '%', odpowiedz }: {
  id: string;
  pytanie: string;
  prawda: number;
  min?: number;
  max?: number;
  jednostka?: string;
  odpowiedz: ReactNode;
}) {
  // false na serwerze i przy hydracji, true w przegladarce — bez setState
  // w efekcie (react-hooks/set-state-in-effect) i bez rozjazdu hydracji.
  const naKliencie = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [odkryta, ustawOdkryta] = useState(false);
  const [wartosc, ustawWartosc] = useState(Math.round((min + max) / 2));
  const [zgadl, ustawZgadl] = useState(false);
  const pytamy = naKliencie && !odkryta;

  const zapis = (v: number) => `${String(v).replace('.', ',')}${jednostka}`;
  const roznica = Math.round((wartosc - prawda) * 10) / 10;
  const ileRoznicy = `${String(Math.abs(roznica)).replace('.', ',')}${jednostka === '%' ? ' pkt proc.' : jednostka}`;

  return (
    <section className="zgadnij" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>{pytanie}</h3>
      <div className="pytanie" hidden={!pytamy}>
        <label htmlFor={`${id}-s`}>
          <span>Twoja odpowiedź</span>
          <output htmlFor={`${id}-s`}>{zapis(wartosc)}</output>
        </label>
        <input
          id={`${id}-s`}
          type="range"
          min={min}
          max={max}
          step={1}
          value={wartosc}
          onChange={(e) => ustawWartosc(Number(e.target.value))}
        />
        <p className="przyciski">
          <button type="button" className="sprawdz" onClick={() => { ustawZgadl(true); ustawOdkryta(true); }}>Sprawdź</button>
          <button type="button" className="pomin" onClick={() => { ustawZgadl(false); ustawOdkryta(true); }}>Pomiń i pokaż liczbę</button>
        </p>
      </div>
      <div className="odpowiedz" hidden={pytamy}>
        {odpowiedz}
        {zgadl ? (
          <span className="roznica" aria-live="polite">
            {`Twoja odpowiedź: ${zapis(wartosc)}${roznica === 0 ? ' — dokładnie.' : roznica > 0 ? ` — o ${ileRoznicy} za dużo.` : ` — o ${ileRoznicy} za mało.`}`}
          </span>
        ) : null}
      </div>
    </section>
  );
}
