'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { liczba } from '@/lib/format';
import { uporzadkuj, type Kolejnosc, type Miara, type WierszPorownania } from '@/lib/porownanie-gmin';

/** Krotka zamiast obiektu — 315 gmin mazowieckich to i tak dane strony (pulapka 46). */
export type KrotkaPorownania = [teryt: string, nazwa: string, rodzaj: string, powiat: string, osob: number | null,
  dochody: number | null, ue: number | null, pomoc: number | null];

/** `etykieta` — krotka, do ukladu telefonu (bez naglowka tabeli); dluga nie miescila sie w 390 px. */
export type KolumnaPorownania = { miara: Miara; naglowek: string; etykieta: string; mediana: number | null };

/** Jedna skala w kolumnie: „9 387 zł”, nie raz „9387 zł”, a raz „10,0 tys. zł”. */
function kwota(x: number | null): string {
  if (x === null) return '—';
  return x >= 100 ? `${liczba(Math.round(x))} zł` : `${x.toFixed(2).replace('.', ',')} zł`;
}

const NAZWY: Record<Miara, string> = { dochody: 'dochody', ue: 'dofinansowanie z UE', pomoc: 'pomoc publiczna' };

export function PorownanieGmin({ krotki, kolumny }: { krotki: KrotkaPorownania[]; kolumny: KolumnaPorownania[] }) {
  const [kolejnosc, ustawKolejnosc] = useState<Kolejnosc>('powiat');
  const wiersze = useMemo<WierszPorownania[]>(
    () => krotki.map(([teryt, nazwa, rodzaj, powiat, osob, dochody, ue, pomoc]) => ({ teryt, nazwa, rodzaj, powiat, osob, dochody, ue, pomoc })),
    [krotki],
  );
  const widoczne = useMemo(() => uporzadkuj(wiersze, kolejnosc), [wiersze, kolejnosc]);

  return (
    <>
      <form className="filtry" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="kolejnosc-gmin" className="mr-2 text-sm text-atrament-2">Kolejność</label>
        <select
          id="kolejnosc-gmin"
          className="pole"
          value={kolejnosc}
          onChange={(e) => ustawKolejnosc(e.target.value as Kolejnosc)}
        >
          <option value="powiat">powiat i nazwa</option>
          {kolumny.flatMap((k) => [
            <option key={`${k.miara}-m`} value={`${k.miara}-malejaco`}>{`${NAZWY[k.miara]}: od najwyższej kwoty`}</option>,
            <option key={`${k.miara}-r`} value={`${k.miara}-rosnaco`}>{`${NAZWY[k.miara]}: od najniższej kwoty`}</option>,
          ])}
        </select>
      </form>

      <table className="tabela">
        <thead>
          <tr>
            <th scope="col">Gmina</th>
            <th scope="col" className="l">Mieszkańcy</th>
            {kolumny.map((k) => <th key={k.miara} scope="col" className="l">{k.naglowek}</th>)}
          </tr>
        </thead>
        <tbody>
          {/* Punkt odniesienia na wierzchu i przy kazdej kolejnosci (zasada 9). */}
          <tr className="font-medium">
            <td>Mediana gmin województwa</td>
            {/* Pusta komorka tylko w ukladzie tabeli; na telefonie (karty, < 640 px) robila wciecie. */}
            <td className="l hidden sm:table-cell" />
            {kolumny.map((k) => <td key={k.miara} className="l" data-etykieta={k.etykieta}>{kwota(k.mediana)}</td>)}
          </tr>
          {widoczne.map((w) => (
            <tr key={w.teryt}>
              <td>
                <Link href={`/gmina/${w.teryt}`} className="text-akcent underline decoration-kreska-2 underline-offset-4 hover:decoration-current">{w.rodzaj === 'gmina' ? `Gmina ${w.nazwa}` : w.nazwa}</Link>
                <span className="text-atrament-3">{` · ${w.rodzaj === 'miasto na prawach powiatu' ? 'miasto na prawach powiatu' : `pow. ${w.powiat}`}`}</span>
              </td>
              <td className="l" data-etykieta="mieszkańcy">{w.osob ? liczba(w.osob) : '—'}</td>
              {kolumny.map((k) => <td key={k.miara} className="l" data-etykieta={k.etykieta}>{kwota(w[k.miara])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
