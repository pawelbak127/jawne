'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { liczba, zOdmiana } from '@/lib/format';
import { Portret } from '@/components/Portret';

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

type Zakres = 'aktywni' | 'wszyscy' | 'wygasli';
const wZakresie = (p: PoselNaLiscie, z: Zakres) => (z === 'wszyscy' ? true : z === 'aktywni' ? p.aktywny : !p.aktywny);

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
  // Domyslnie sprawujacy mandat, ale wygasli sa o jedno klikniecie i z liczba
  // przy zakladce — nikogo nie ukrywamy (zasada 5).
  const [zakres, ustawZakres] = useState<Zakres>('aktywni');

  const indeks = useMemo(
    () => poslowie.map((p) => ({ ...p, klucz: uprosc(`${p.nazwa} ${p.klub ?? ''} ${p.okreg ?? ''} ${p.wojewodztwo ?? ''}`) })),
    [poslowie],
  );

  const widoczni = useMemo(() => {
    const szukane = uprosc(fraza.trim());
    return indeks.filter((p) => {
      if (!wZakresie(p, zakres)) return false;
      if (klub && p.klub !== klub) return false;
      if (szukane && !p.klucz.includes(szukane)) return false;
      return true;
    });
  }, [indeks, fraza, klub, zakres]);

  const wszystkich = indeks.filter((p) => wZakresie(p, zakres)).length;
  const barwa = (id: string | null) => kluby.find((k) => k.id === id);
  const ZAKRESY = [
    { klucz: 'aktywni', nazwa: 'sprawujący mandat' },
    { klucz: 'wszyscy', nazwa: 'wszyscy w kadencji' },
    { klucz: 'wygasli', nazwa: 'mandat wygasł' },
  ] as const;

  return (
    <>
      <form role="search" className="filtry" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="szukaj-posla" className="sr-only">Znajdź posła</label>
        <input
          id="szukaj-posla"
          className="pole"
          value={fraza}
          onChange={(e) => ustawFraze(e.target.value)}
          type="search"
          placeholder="Nazwisko, okręg lub województwo"
        />
        <label htmlFor="klub-posla" className="sr-only">Klub</label>
        <select id="klub-posla" className="pole" value={klub ?? ''} onChange={(e) => ustawKlub(e.target.value || null)}>
          <option value="">wszystkie kluby</option>
          {kluby.map((k) => <option key={k.id} value={k.id}>{k.etykieta}</option>)}
        </select>
      </form>

      {/* Zakladki jako przyciski: filtr dziala w przegladarce, bez przeladowania. */}
      <div className="zakladki" role="group" aria-label="Kto">
        {ZAKRESY.map((z) => (
          <a
            key={z.klucz}
            href="#"
            role="button"
            aria-current={zakres === z.klucz ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); ustawZakres(z.klucz); }}
          >
            {z.nazwa}
            <span className="znak">{liczba(indeks.filter((p) => wZakresie(p, z.klucz)).length)}</span>
          </a>
        ))}
      </div>

      <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--sredni)' }} aria-live="polite">
        {widoczni.length === wszystkich
          ? zOdmiana(widoczni.length, 'poseł', 'posłów', 'posłów')
          : `${liczba(widoczni.length)} z ${liczba(wszystkich)}`}
      </p>

      {widoczni.length === 0 ? (
        <p className="py-16 text-center text-atrament-2">Nikt nie pasuje do tych warunków.</p>
      ) : (
        <table className="tabela osoby">
          <thead>
            <tr><th>Imię i nazwisko</th><th>Klub</th><th>Okręg</th></tr>
          </thead>
          <tbody>
            {widoczni.map((p) => {
              const k = barwa(p.klub);
              return (
                <tr key={p.slug}>
                  <td>
                    {/* Portret z miniatury (ok. 3 kB, leniwie) — przeglad tresci
                        24.10.2026: na liscie 499 nazwisk twarz szybciej mowi, kto to. */}
                    <span className="flex items-center gap-2.5">
                      <Portret slug={p.slug} imieNazwisko={p.nazwa} maZdjecie={p.maZdjecie} rozmiar="maly" ozdobny />
                      <span>
                        <Link href={`/posel/${p.slug}`} className="font-semibold text-atrament underline decoration-kreska-2 underline-offset-4 hover:text-akcent">{p.nazwa}</Link>
                        {!p.aktywny ? <span className="ml-2 text-atrament-2">· mandat wygasł</span> : null}
                      </span>
                    </span>
                  </td>
                  <td>
                    {k ? <span className="miejsce-probka kropka" style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties} /> : null}
                    {p.klub ?? 'bez klubu'}
                  </td>
                  <td className="text-atrament-2">{p.okreg ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
