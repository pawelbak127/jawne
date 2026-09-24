'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { MiejscePosla } from '@/lib/sala';
import { uprosc } from '@/lib/tekst';

/**
 * Plan sali posiedzen: kazde miejsce w tym samym punkcie, w ktorym rysuje je
 * Kancelaria Sejmu.
 *
 * To NIE jest polkole z `Polkole.tsx`. Tamto uklada miejsca po kolei wedlug
 * klubow, bo do 23.09.2026 nie mielismy prawdziwego przydzialu miejsc; tutaj
 * wspolrzedne pochodza z rysunku sali i nie wolno ich „poprawiac" dla estetyki.
 *
 * Kropka NIE MA elementu `<title>`: przegladarka pokazywalaby wtedy druga,
 * systemowa chmurke obok naszej (blad zgloszony przez Pawla na mapie gmin).
 */
export function PlanSali({
  miejsca,
  szerokosc,
  wysokosc,
  wyroznionyId,
  stan,
}: {
  miejsca: MiejscePosla[];
  szerokosc: number;
  wysokosc: number;
  /** Miejsce jednego posla — reszta sali jest tlem (strona posla). */
  wyroznionyId?: number;
  stan: string;
}) {
  const router = useRouter();
  const ramka = useRef<SVGSVGElement>(null);
  const [pod, ustawPod] = useState<{ id: number; x: number; y: number } | null>(null);
  const [wybrany, ustawWybranego] = useState<number | null>(wyroznionyId ?? null);
  const [dotykiem, ustawDotykiem] = useState(false);
  const [szukane, ustawSzukane] = useState('');
  const [klubPodSpodem, ustawKlubPodSpodem] = useState<string | null>(null);

  const wgId = useMemo(() => new Map(miejsca.map((m) => [m.id, m])), [miejsca]);

  const kluby = useMemo(() => {
    const licznik = new Map<string, { etykieta: string; barwa: string; barwaCiemna: string; ile: number }>();
    for (const m of miejsca) {
      const k = m.klubId ?? '—';
      const w = licznik.get(k);
      if (w) w.ile += 1;
      else licznik.set(k, { etykieta: m.klubEtykieta, barwa: m.barwa, barwaCiemna: m.barwaCiemna, ile: 1 });
    }
    return [...licznik.entries()].sort((a, b) => b[1].ile - a[1].ile);
  }, [miejsca]);

  // Szukanie po nazwisku i po numerze miejsca: „Kowal" i „217" maja dzialac
  // tak samo, bo z sali czyta sie jedno i drugie.
  const szukanePrposte = uprosc(szukane.trim());
  const pasuje = useMemo(() => {
    if (!szukanePrposte) return null;
    const zbior = new Set<number>();
    for (const m of miejsca) {
      if (uprosc(m.nazwa).includes(szukanePrposte) || String(m.numer ?? '') === szukanePrposte) zbior.add(m.id);
    }
    return zbior;
  }, [miejsca, szukanePrposte]);

  const przygaszony = (m: MiejscePosla) => {
    if (wyroznionyId !== undefined) return m.id !== wyroznionyId;
    if (pasuje) return !pasuje.has(m.id);
    if (klubPodSpodem) return m.klubId !== klubPodSpodem;
    return false;
  };

  const opis = (m: MiejscePosla) =>
    [m.klubEtykieta, m.okreg, m.numer === null ? null : `miejsce nr ${m.numer}`]
      .filter(Boolean)
      .join(' · ');

  const karta = wybrany === null ? null : (wgId.get(wybrany) ?? null);
  const podKursorem = pod ? wgId.get(pod.id) : null;
  const promien = wyroznionyId === undefined ? 6.2 : 5;

  return (
    <div>
      {wyroznionyId === undefined ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={szukane}
            onChange={(e) => ustawSzukane(e.target.value)}
            placeholder="Znajdź posła lub numer miejsca"
            aria-label="Znajdź posła lub numer miejsca na sali"
            className="w-full max-w-xs rounded-xl border border-kreska bg-papier px-3 py-2 text-sm"
          />
          {pasuje ? (
            <p className="liczby text-sm text-atrament-2">
              {pasuje.size === 0 ? 'nikt nie pasuje' : `podświetlonych: ${pasuje.size}`}
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
        Na telefonie plan jest za gesty, zeby trafic palcem w kropke po
        zmniejszeniu do 390 px — dlatego zostaje w swojej szerokosci
        i przewija sie w poziomie WEWNATRZ ramki. Strona nadal nie ma
        poziomego paska przewijania.
      */}
      <div className="relative overflow-x-auto rounded-2xl border border-kreska bg-papier-2">
        <svg
          ref={ramka}
          viewBox={`0 0 ${szerokosc} ${wysokosc}`}
          className="block h-auto w-full min-w-[46rem]"
          role="img"
          aria-label={`Plan sali posiedzeń Sejmu, stan na ${stan}. Każda kropka to miejsce jednego posła; pełna lista posłów jest na stronie „Posłowie”.`}
          onMouseLeave={() => ustawPod(null)}
          onPointerDown={(e) => {
            if ((e.pointerType !== 'mouse') !== dotykiem) ustawDotykiem(e.pointerType !== 'mouse');
          }}
        >
          {miejsca.map((m) => (
            <circle
              key={m.id}
              cx={m.x}
              cy={m.y}
              r={m.id === wybrany || m.id === pod?.id ? promien + 1.6 : promien}
              className="miejsce cursor-pointer"
              style={
                {
                  '--b': m.barwa,
                  '--bc': m.barwaCiemna,
                  opacity: przygaszony(m) ? 0.16 : 1,
                  stroke: m.id === wybrany ? 'var(--atrament)' : undefined,
                  strokeWidth: m.id === wybrany ? 1.8 : undefined,
                } as React.CSSProperties
              }
              onMouseMove={(e) => {
                const r = ramka.current?.getBoundingClientRect();
                if (r) ustawPod({ id: m.id, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
              onClick={() => {
                // Na dotyku pierwsze dotkniecie tylko ZAZNACZA: kropki sa
                // mniejsze niz palec, a pomylka konczylaby sie cudza strona.
                if (dotykiem) {
                  ustawWybranego(m.id);
                  return;
                }
                router.push(`/posel/${m.slug}`);
              }}
            />
          ))}
        </svg>

        {/* Na waskim ekranie nic nie widac po tym, ze ramka sie przewija —
            trzeba to napisac. Na szerokim plan miesci sie caly. */}
        {podKursorem && !dotykiem ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[18rem] rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
            style={{ left: Math.min(pod!.x + 14, 620), top: pod!.y + 14 }}
          >
            <p className="font-medium">{podKursorem.nazwa}</p>
            <p className="liczby text-atrament-2">{opis(podKursorem)}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-atrament-3 sm:hidden">
        Plan jest szerszy niż ekran — przesuń go palcem w bok.
      </p>

      {wyroznionyId === undefined ? (
        <>
          <div className="mt-3 min-h-[4.5rem] rounded-2xl border border-kreska bg-papier-2 p-4">
            {karta ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="font-medium">{karta.nazwa}</p>
                  <p className="liczby text-sm text-atrament-2">{opis(karta)}</p>
                </div>
                <Link
                  href={`/posel/${karta.slug}`}
                  className="rounded-xl bg-atrament px-4 py-2 text-sm font-medium text-papier transition-opacity hover:opacity-90"
                >
                  Zobacz posła →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-atrament-3">
                Najedź na miejsce, żeby zobaczyć, kto na nim siedzi. Na telefonie dotknięcie
                zaznacza posła, a przejście na jego stronę to osobny przycisk.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {kluby.map(([id, k]) => (
              <button
                key={id}
                type="button"
                onMouseEnter={() => ustawKlubPodSpodem(id === '—' ? null : id)}
                onMouseLeave={() => ustawKlubPodSpodem(null)}
                onFocus={() => ustawKlubPodSpodem(id === '—' ? null : id)}
                onBlur={() => ustawKlubPodSpodem(null)}
                className="flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-opacity hover:bg-papier-3"
                style={{ opacity: klubPodSpodem && klubPodSpodem !== id ? 0.45 : 1 }}
              >
                <span
                  className="miejsce-probka h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties}
                />
                <span className="text-atrament-2">{k.etykieta}</span>
                <span className="liczby font-medium">{k.ile}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
