'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { przydzielBloki, ulozPolkole } from '@/lib/polkole';
import { chmurkaPozycja } from '@/lib/chmurka';

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
/*
 * Rozmiar chmurki w pikselach. `max-w-[18rem]` to 288 px; wysokosc to dwa
 * wiersze tekstu `text-sm` z `py-2`. Liczba jest tu PO TO, zeby dala sie
 * porownac z pudelkiem — chmurka nie zna swoich wymiarow, zanim sie
 * nie pokaze, a wtedy jest juz za pozno na decyzje, gdzie ma stanac.
 */
const CHMURKA = { szer: 288, wys: 64 };

export function Polkole({
  bloki,
  srodek,
  podpis,
  probkiBlokow = true,
}: {
  bloki: Blok[];
  /**
   * `false`, gdy kolor kropki NIE oznacza bloku (np. na stronie glosowania
   * koduje glos). Probka w legendzie klubu pokazywalaby wtedy kolor
   * pierwszego glosu w klubie i sugerowala, ze to barwa klubu.
   */
  probkiBlokow?: boolean;
  /** Tresc w pustym srodku polkola — zwykle najwazniejsza liczba. */
  srodek?: React.ReactNode;
  podpis?: string;
}) {
  const id = useId();
  const router = useRouter();
  const ramka = useRef<HTMLDivElement>(null);
  const [podswietlony, ustawPodswietlony] = useState<string | null>(null);
  const [pod, ustawPod] = useState<{ nr: number; x: number; y: number; w: number; h: number } | null>(null);
  const [wybrane, ustawWybrane] = useState<number | null>(null);
  const [dotykiem, ustawDotykiem] = useState(false);

  const { uklad, przydzial, plaskie } = useMemo(() => {
    const plaskie = bloki.flatMap((b) => b.miejsca.map((m) => ({ ...m, blok: b.id })));
    const uklad = ulozPolkole(plaskie.length, { promienWew: 48 });
    const przydzial = przydzielBloki(uklad.miejsca.length, bloki.map((b) => b.miejsca.length));
    return { uklad, przydzial, plaskie };
  }, [bloki]);

  const polowaX = uklad.szerokosc / 2;
  const klikalne = plaskie.some((m) => m.adres);

  return (
    <figure className="w-full">
      {/*
        Srodek jest ZWYKLYM HTML-em nad wykresem, a nie foreignObject w SVG.
        W foreignObject rozmiar tekstu liczy sie w jednostkach viewBoxu
        (szerokosc ~212), wiec text-5xl rozrastal sie razem z wykresem
        i zaslanial kropki — widac to bylo dopiero na zrzucie ekranu.
      */}
      {/*
        ZGLOSZENIE PAWLA 30.09.2026: chmurka zostawala na wykresie po zjechaniu
        myszka w bok. Nic jej nie kasowalo — `onMouseMove` na kropce tylko
        ustawialo stan. `PlanSali` i mapa gmin mialy to od poczatku, tutaj
        wypadlo. Kasujemy na PUDELKU, nie na `svg`: wykres ma
        `overflow-visible`, wiec kropki wystaja poza jego ramke.
      */}
      <div className="relative" ref={ramka} onMouseLeave={() => ustawPod(null)}>
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
                r={i === pod?.nr || i === wybrane ? m.r * 1.9 : m.r}
                className={dane.adres ? 'miejsce cursor-pointer' : 'miejsce'}
                style={
                  {
                    '--b': dane.barwa,
                    '--bc': dane.barwaCiemna,
                    opacity: przygaszony ? 0.18 : 1,
                  } as React.CSSProperties
                }
                onMouseMove={(e) => {
                  const r = ramka.current?.getBoundingClientRect();
                  // Wymiary pudelka BIERZEMY Z POMIARU, nie zakladamy —
                  // patrz naglowek src/lib/chmurka.ts.
                  if (r) ustawPod({ nr: i, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
                }}
                onPointerDown={(e) => {
                  if ((e.pointerType !== 'mouse') !== dotykiem) ustawDotykiem(e.pointerType !== 'mouse');
                }}
                onClick={() => {
                  if (!dane.adres) return;
                  // Na dotyku pierwsze dotkniecie tylko ZAZNACZA — kropka jest
                  // mniejsza niz palec, a pomylka konczylaby sie cudza strona.
                  if (dotykiem) {
                    ustawWybrane(i);
                    return;
                  }
                  router.push(dane.adres);
                }}
              />
            );
          })}
        </svg>
        {srodek ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4%] flex flex-col items-center text-center">
            {srodek}
          </div>
        ) : null}

        {/* Chmurka JEST NASZA, a kropka nie ma juz elementu `title` —
            przegladarka pokazywalaby wtedy druga, systemowa obok naszej
            (blad zgloszony przez Pawla na mapie gmin). */}
        {pod && !dotykiem ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[18rem] rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
            style={chmurkaPozycja(pod, CHMURKA)}
          >
            {plaskie[pod.nr]?.opis}
          </div>
        ) : null}
      </div>

      {/* Na dotyku to karta, a nie dotkniecie wykresu, prowadzi dalej. */}
      {klikalne && dotykiem ? (
        <div className="mt-3 min-h-[3.5rem] rounded-2xl border border-kreska bg-papier-2 p-3 text-sm">
          {wybrane !== null && plaskie[wybrane] ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span>{plaskie[wybrane]!.opis}</span>
              {plaskie[wybrane]!.adres ? (
                <Link
                  href={plaskie[wybrane]!.adres!}
                  className="rounded-xl bg-atrament px-3 py-3 text-sm font-medium text-papier"
                >
                  Zobacz posła →
                </Link>
              ) : null}
            </div>
          ) : (
            <span className="text-atrament-3">Dotknij kropki, żeby zobaczyć, kto to.</span>
          )}
        </div>
      ) : null}

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
            className="flex items-center gap-2 rounded-md px-1.5 py-3 transition-opacity hover:bg-papier-3"
            style={{ opacity: podswietlony && podswietlony !== b.id ? 0.45 : 1 }}
          >
            {probkiBlokow ? (
              <span
                className="miejsce-probka h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ '--b': b.miejsca[0]?.barwa, '--bc': b.miejsca[0]?.barwaCiemna } as React.CSSProperties}
              />
            ) : null}
            <span className="text-atrament-2">{b.etykieta}</span>
            <span className="liczby font-medium">{b.miejsca.length}</span>
          </button>
        ))}
      </figcaption>
    </figure>
  );
}
