'use client';

import { useId, useMemo, useState } from 'react';
import { przydzielBloki, ulozPolkole } from '@/lib/polkole';

export type MiejsceWBloku = {
  barwa: string;
  barwaCiemna: string;
  /** Tekst do etykiety przy najechaniu, np. nazwisko i sposob glosowania. */
  opis: string;
  adres?: string;
};

export type Blok = {
  id: string;
  /** Krotki kod rejestrowy — jedyne, co miesci sie w legendzie. */
  etykieta: string;
  /** Pelna nazwa z rejestru, pokazywana przy najechaniu. */
  pelnaNazwa?: string | null;
  miejsca: MiejsceWBloku[];
};

/**
 * Polkole izby.
 *
 * Miejsc jest DOKLADNIE tyle, ile wierszy w blokach — bez "przerw miedzy
 * klubami" udawanych pustymi kropkami. Przerwa poprawilaby estetyke kosztem
 * tego, ze z wykresu nie dalo by sie juz policzyc wiekszosci, a po to on jest.
 * Granice blokow niesie kolor i podswietlenie przy najechaniu.
 */
export function Polkole({
  bloki,
  srodek,
  podpis,
}: {
  bloki: Blok[];
  /** Tresc w pustym srodku polkola — zwykle najwazniejsza liczba. */
  srodek?: React.ReactNode;
  podpis?: string;
}) {
  const id = useId();
  const [podswietlony, ustawPodswietlony] = useState<string | null>(null);

  const { uklad, przydzial, plaskie } = useMemo(() => {
    const plaskie = bloki.flatMap((b) => b.miejsca.map((m) => ({ ...m, blok: b.id })));
    const uklad = ulozPolkole(plaskie.length);
    const przydzial = przydzielBloki(uklad.miejsca.length, bloki.map((b) => b.miejsca.length));
    return { uklad, przydzial, plaskie };
  }, [bloki]);

  const polowaX = uklad.szerokosc / 2;

  return (
    <figure className="w-full">
      <svg
        viewBox={`${-polowaX} ${-uklad.wysokosc} ${uklad.szerokosc} ${uklad.wysokosc}`}
        className="w-full overflow-visible"
        role="img"
        aria-labelledby={`${id}-opis`}
      >
        <title id={`${id}-opis`}>{podpis ?? 'Rozkład miejsc w Sejmie'}</title>
        {uklad.miejsca.map((m, i) => {
          const dane = plaskie[i]!;
          const blok = bloki[przydzial[i]!]!;
          const przygaszony = podswietlony !== null && podswietlony !== blok.id;
          return (
            <circle
              key={i}
              cx={m.x}
              cy={m.y}
              r={m.r}
              className="miejsce"
              style={
                {
                  '--b': dane.barwa,
                  '--bc': dane.barwaCiemna,
                  opacity: przygaszony ? 0.18 : 1,
                } as React.CSSProperties
              }
            >
              <title>{dane.opis}</title>
            </circle>
          );
        })}
        {srodek ? (
          <foreignObject
            x={-polowaX * 0.52}
            y={-uklad.wysokosc * 0.36}
            width={polowaX * 1.04}
            height={uklad.wysokosc * 0.34}
          >
            <div className="flex h-full flex-col items-center justify-end text-center">{srodek}</div>
          </foreignObject>
        ) : null}
      </svg>

      <figcaption className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        {bloki.map((b) => (
          <button
            key={b.id}
            type="button"
            onMouseEnter={() => ustawPodswietlony(b.id)}
            onMouseLeave={() => ustawPodswietlony(null)}
            onFocus={() => ustawPodswietlony(b.id)}
            onBlur={() => ustawPodswietlony(null)}
            title={b.pelnaNazwa ?? b.etykieta}
            className="flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-opacity hover:bg-papier-3"
            style={{ opacity: podswietlony && podswietlony !== b.id ? 0.45 : 1 }}
          >
            <span
              className="miejsce-probka h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ '--b': b.miejsca[0]?.barwa, '--bc': b.miejsca[0]?.barwaCiemna } as React.CSSProperties}
            />
            <span className="text-atrament-2">{b.etykieta}</span>
            <span className="liczby font-medium">{b.miejsca.length}</span>
          </button>
        ))}
      </figcaption>
    </figure>
  );
}
