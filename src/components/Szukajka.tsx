'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

export type PozycjaWyszukiwania = {
  slug: string;
  nazwa: string;
  klub: string | null;
  okreg: string | null;
};

/**
 * Wyszukiwanie posla w trakcie pisania.
 *
 * Caly indeks (499 nazwisk, ~30 kB) jedzie do przegladarki i filtrowanie
 * dzieje sie lokalnie. Zapytanie do serwera przy kazdej literze byloby
 * wolniejsze i nie dalo by nic wiecej przy tej wielkosci zbioru.
 *
 * Porownujemy na tekscie POZBAWIONYM znakow diakrytycznych w obie strony,
 * bo ktos szukajacy "zurek" ma znalezc "Żurek" — a na polskiej klawiaturze
 * ogonki wymagaja dodatkowego klawisza i ludzie ich nie wpisuja.
 */
function uprosc(t: string): string {
  return t
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function Szukajka({
  pozycje,
  etykieta = 'Wpisz nazwisko posła',
}: {
  pozycje: PozycjaWyszukiwania[];
  etykieta?: string;
}) {
  const [fraza, ustawFraze] = useState('');
  const [aktywny, ustawAktywny] = useState(0);
  const poleRef = useRef<HTMLInputElement>(null);

  const indeks = useMemo(
    () => pozycje.map((p) => ({ ...p, klucz: uprosc(`${p.nazwa} ${p.klub ?? ''} ${p.okreg ?? ''}`) })),
    [pozycje],
  );

  const wyniki = useMemo(() => {
    const szukane = uprosc(fraza.trim());
    if (szukane.length < 2) return [];
    return indeks
      .filter((p) => p.klucz.includes(szukane))
      // Trafienie na poczatku nazwiska jest wazniejsze niz gdziekolwiek indziej.
      .sort((a, b) => {
        const pa = uprosc(a.nazwa).indexOf(szukane);
        const pb = uprosc(b.nazwa).indexOf(szukane);
        return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.nazwa.localeCompare(b.nazwa, 'pl');
      })
      .slice(0, 8);
  }, [fraza, indeks]);

  function klawisz(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!wyniki.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      ustawAktywny((a) => (a + 1) % wyniki.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ustawAktywny((a) => (a - 1 + wyniki.length) % wyniki.length);
    } else if (e.key === 'Escape') {
      ustawFraze('');
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-3 rounded-2xl border border-kreska-2 bg-papier-2 px-4 shadow-karta focus-within:border-akcent">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-atrament-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={poleRef}
          value={fraza}
          onChange={(e) => {
            ustawFraze(e.target.value);
            ustawAktywny(0);
          }}
          onKeyDown={klawisz}
          type="search"
          autoComplete="off"
          aria-label={etykieta}
          placeholder={etykieta}
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-atrament-3"
        />
      </div>

      {wyniki.length > 0 ? (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-kreska bg-papier-2 shadow-karta-2">
          {wyniki.map((p, i) => (
            <li key={p.slug}>
              <Link
                href={`/posel/${p.slug}`}
                onMouseEnter={() => ustawAktywny(i)}
                className={`flex items-baseline gap-3 px-4 py-3 text-left transition-colors ${
                  i === aktywny ? 'bg-akcent-slaby' : ''
                }`}
              >
                <span className="font-medium">{p.nazwa}</span>
                <span className="text-sm text-atrament-2">{p.klub ?? '—'}</span>
                {p.okreg ? <span className="ml-auto text-xs text-atrament-3">{p.okreg}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : fraza.trim().length >= 2 ? (
        <p className="absolute z-30 mt-2 w-full rounded-2xl border border-kreska bg-papier-2 px-4 py-3 text-sm text-atrament-2 shadow-karta-2">
          Nikogo takiego nie ma w rejestrze kadencji X.
        </p>
      ) : null}
    </div>
  );
}
