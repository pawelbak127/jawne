'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { liczba } from '@/lib/format';

export type WierszGlosu = {
  slug: string;
  nazwa: string;
  klub: string | null;
  glos: string;
  ton: string;
};

const TONY: Record<string, string> = {
  za: 'bg-[#1b9e63]/12 text-[#14764a] dark:bg-[#34b87c]/18 dark:text-[#5fd3a0]',
  przeciw: 'bg-[#d2453f]/12 text-[#a8322d] dark:bg-[#e2635d]/18 dark:text-[#f08a85]',
  wstrzymal: 'bg-[#e0a021]/14 text-[#8a6210] dark:bg-[#d9a52e]/20 dark:text-[#e5be62]',
  brak: 'bg-papier-3 text-atrament-2',
  inne: 'bg-papier-3 text-atrament-2',
};

function uprosc(t: string): string {
  return t.replace(/ł/g, 'l').replace(/Ł/g, 'L').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Pelna lista imienna z filtrowaniem po sposobie glosowania i po nazwisku.
 *
 * Filtr nie ukrywa nikogo na stale — licznik nad tabela zawsze podaje, ile
 * z ilu widac. Lista, ktora cicho pomija czesc poslow, jest gorsza od braku
 * listy, bo wyglada na kompletna.
 */
export function TabelaGlosow({ glosy }: { glosy: WierszGlosu[] }) {
  const [fraza, ustawFraze] = useState('');
  const [ton, ustawTon] = useState<string | null>(null);

  const tony = useMemo(() => {
    const m = new Map<string, { etykieta: string; ile: number }>();
    for (const g of glosy) {
      const w = m.get(g.ton) ?? { etykieta: g.glos, ile: 0 };
      w.ile++;
      m.set(g.ton, w);
    }
    return [...m.entries()].sort((a, b) => b[1].ile - a[1].ile);
  }, [glosy]);

  const widoczne = useMemo(() => {
    const szukane = uprosc(fraza.trim());
    return glosy.filter((g) => {
      if (ton && g.ton !== ton) return false;
      if (szukane && !uprosc(`${g.nazwa} ${g.klub ?? ''}`).includes(szukane)) return false;
      return true;
    });
  }, [glosy, fraza, ton]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={fraza}
          onChange={(e) => ustawFraze(e.target.value)}
          type="search"
          placeholder="Szukaj nazwiska lub klubu"
          aria-label="Szukaj w głosach imiennych"
          className="h-10 min-w-0 flex-1 rounded-xl border border-kreska-2 bg-papier-2 px-3.5 text-sm outline-none focus:border-akcent"
        />
        <button
          type="button"
          onClick={() => ustawTon(null)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            ton === null ? 'border-atrament bg-atrament text-papier' : 'border-kreska-2 text-atrament-2 hover:border-atrament-3'
          }`}
        >
          wszyscy
        </button>
        {tony.map(([t, w]) => (
          <button
            key={t}
            type="button"
            onClick={() => ustawTon(ton === t ? null : t)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              ton === t ? 'border-atrament bg-atrament text-papier' : 'border-kreska-2 text-atrament-2 hover:border-atrament-3'
            }`}
          >
            {w.etykieta} <span className="liczby opacity-70">{w.ile}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-atrament-2">
        {widoczne.length === glosy.length
          ? `${liczba(glosy.length)} posłów`
          : `${liczba(widoczne.length)} z ${liczba(glosy.length)}`}
      </p>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {widoczne.map((g) => (
          <li key={g.slug} className="min-w-0">
            <Link
              href={`/posel/${g.slug}`}
              className="flex items-center gap-3 rounded-lg border border-kreska bg-papier-2 px-3 py-2 text-sm transition-colors hover:border-kreska-2 hover:text-akcent"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{g.nazwa}</span>
                <span className="block truncate text-xs text-atrament-3">{g.klub ?? 'bez klubu'}</span>
              </span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${TONY[g.ton] ?? TONY.inne}`}>
                {g.glos}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
