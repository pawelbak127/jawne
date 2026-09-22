'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Portret } from '@/components/Portret';
import { liczba, zOdmiana } from '@/lib/format';

export type PoselNaLiscie = {
  id: number;
  slug: string;
  nazwa: string;
  nazwisko: string;
  klub: string | null;
  okreg: string | null;
  wojewodztwo: string | null;
  aktywny: boolean;
  maZdjecie: number | null;
};

export type KlubDoFiltra = { id: string; etykieta: string; barwa: string; barwaCiemna: string };

function uprosc(t: string): string {
  return t.replace(/ł/g, 'l').replace(/Ł/g, 'L').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Lista poslow z filtrowaniem w przegladarce.
 *
 * Caly zbior (499 rekordow) idzie na klienta raz i filtruje sie lokalnie —
 * przy tej wielkosci to jest szybsze od zapytania po kazdej literze i dziala
 * bez migania. Mianownik nad lista aktualizuje sie razem z filtrem, bo
 * "23 posłów" bez informacji, z ilu, nie znaczy nic.
 */
export function PrzegladPoslow({
  poslowie,
  kluby,
}: {
  poslowie: PoselNaLiscie[];
  kluby: KlubDoFiltra[];
}) {
  const [fraza, ustawFraze] = useState('');
  const [klub, ustawKlub] = useState<string | null>(null);
  const [tylkoAktywni, ustawTylkoAktywnych] = useState(true);

  const indeks = useMemo(
    () => poslowie.map((p) => ({ ...p, klucz: uprosc(`${p.nazwa} ${p.klub ?? ''} ${p.okreg ?? ''} ${p.wojewodztwo ?? ''}`) })),
    [poslowie],
  );

  const widoczni = useMemo(() => {
    const szukane = uprosc(fraza.trim());
    return indeks.filter((p) => {
      if (tylkoAktywni && !p.aktywny) return false;
      if (klub && p.klub !== klub) return false;
      if (szukane && !p.klucz.includes(szukane)) return false;
      return true;
    });
  }, [indeks, fraza, klub, tylkoAktywni]);

  const wszystkich = indeks.filter((p) => (tylkoAktywni ? p.aktywny : true)).length;
  const barwa = (id: string | null) => kluby.find((k) => k.id === id);

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 bg-papier/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={fraza}
            onChange={(e) => ustawFraze(e.target.value)}
            type="search"
            placeholder="Nazwisko, okręg lub województwo"
            aria-label="Szukaj posła"
            className="h-11 min-w-0 flex-1 rounded-xl border border-kreska-2 bg-papier-2 px-4 text-sm outline-none focus:border-akcent"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-atrament-2">
            <input
              type="checkbox"
              checked={tylkoAktywni}
              onChange={(e) => ustawTylkoAktywnych(e.target.checked)}
              className="h-4 w-4 accent-[var(--akcent)]"
            />
            tylko sprawujący mandat
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => ustawKlub(null)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              klub === null ? 'border-atrament bg-atrament text-papier' : 'border-kreska-2 text-atrament-2 hover:border-atrament-3'
            }`}
          >
            wszystkie kluby
          </button>
          {kluby.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => ustawKlub(klub === k.id ? null : k.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                klub === k.id ? 'border-atrament bg-atrament text-papier' : 'border-kreska-2 text-atrament-2 hover:border-atrament-3'
              }`}
            >
              <span
                className="miejsce-probka h-2 w-2 rounded-full"
                style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties}
              />
              {k.etykieta}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-atrament-2">
          {widoczni.length === wszystkich
            ? zOdmiana(widoczni.length, 'poseł', 'posłów', 'posłów')
            : `${liczba(widoczni.length)} z ${liczba(wszystkich)}`}
        </p>
      </div>

      {widoczni.length === 0 ? (
        <p className="py-16 text-center text-atrament-2">
          Nikt nie pasuje do tych warunków.
        </p>
      ) : (
        <ul className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {widoczni.map((p) => {
            const k = barwa(p.klub);
            // min-w-0: element siatki bez tego nie zejdzie ponizej szerokosci tresci
            return (
              <li key={p.slug} className="min-w-0">
                <Link
                  href={`/posel/${p.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-kreska bg-papier-2 p-3 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <Portret slug={p.slug} imieNazwisko={p.nazwa} maZdjecie={p.maZdjecie} rozmiar="maly" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-akcent">{p.nazwa}</span>
                    {/* min-w-0: bez tego truncate w srodku nie dziala i kafelek rozpycha strone */}
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-atrament-2">
                      {k ? (
                        <span
                          className="miejsce-probka h-2 w-2 shrink-0 rounded-full"
                          style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties}
                        />
                      ) : null}
                      <span className="truncate">{p.klub ?? 'bez klubu'}</span>
                      {p.okreg ? <span className="truncate text-atrament-3">· {p.okreg}</span> : null}
                    </span>
                  </span>
                  {!p.aktywny ? (
                    <span className="shrink-0 rounded-md bg-papier-3 px-1.5 py-0.5 text-[10px] text-atrament-3">
                      mandat wygasł
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
