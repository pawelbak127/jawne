'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zlote } from '@/lib/format';

export type PlikMapy = {
  skala: number;
  zakres: { xmin: number; ymin: number; xmax: number; ymax: number };
  gminy: Record<string, string[]>;
};

/**
 * Jedna gmina: [TERYT, nazwa, wartosc albo null].
 *
 * Krotka, a nie obiekt z nazwami pol: 2 477 gmin razy pieciu nazw pol to
 * 300 kB w odpowiedzi HTML. ZMIERZONE: obiekty daly strone 440 kB, krotki
 * zbijaja ja do ok. 150 kB. Kwote formatuje przegladarka — `zlote()` jest
 * czysta funkcja, wiec import dziala po obu stronach.
 */
export type PozycjaMapy = [teryt: string, nazwa: string, wartosc: number | null];

/**
 * Mapa gmin — kartogram.
 *
 * Kontury sa w osobnym pliku (`/mapa/gminy.json`, ok. 940 kB), pobieranym
 * dopiero w przegladarce: to dane, ktore nie zmieniaja sie latami, wiec niech
 * je cache'uje przegladarka, zamiast wchodzic do kazdej odpowiedzi HTML.
 *
 * SKALA JEST KUBELKOWA, nie ciagla. Kartogram z plynnym gradientem sugeruje
 * dokladnosc, ktorej w tych danych nie ma; szesc kubelkow po kwantylach mowi
 * tylko tyle, ile naprawde widac: czy gmina jest w gornej, srodkowej czy
 * dolnej czesci stawki. Gmina bez danych jest SZARA, nie zerowa (regula 4).
 */
const BARWY = ['#dbeee9', '#b3ddd3', '#84c7b6', '#55ac97', '#2f8a76', '#1b6152'];
const BEZ_DANYCH = 'var(--kreska-2)';

export function MapaGmin({
  pozycje,
  progi,
}: {
  pozycje: PozycjaMapy[];
  /** Granice kubelkow policzone na serwerze — legenda i mapa z jednej listy. */
  progi: number[];
}) {
  const router = useRouter();
  const [plik, ustawPlik] = useState<PlikMapy | null>(null);
  const [blad, ustawBlad] = useState(false);
  const [pod, ustawPod] = useState<{ teryt: string; x: number; y: number } | null>(null);
  const ramka = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let zywe = true;
    fetch('/mapa/gminy.json')
      .then((o) => (o.ok ? o.json() : Promise.reject(new Error(String(o.status)))))
      .then((j: PlikMapy) => zywe && ustawPlik(j))
      .catch(() => zywe && ustawBlad(true));
    return () => {
      zywe = false;
    };
  }, []);

  const wg = useMemo(() => new Map(pozycje.map((p) => [p[0], p])), [pozycje]);

  const ksztalty = useMemo(() => {
    if (!plik) return [];
    const { xmin, xmax, ymin, ymax } = plik.zakres;
    const s = plik.skala;
    // Poludniki zbiegaja sie ku biegunowi: bez tego Polska jest za szeroka.
    const zwezenie = Math.cos(((ymin + ymax) / 2) * (Math.PI / 180));
    const szer = (xmax - xmin) * zwezenie;
    const wys = ymax - ymin;
    const naX = (x: number) => ((x / s - xmin) * zwezenie * 1000) / szer;
    const naY = (y: number) => ((ymax - y / s) * 1000 * (wys / szer)) / wys;

    return Object.entries(plik.gminy).map(([teryt, pierscienie]) => {
      const d = pierscienie
        .map((ciag) => {
          let x = 0;
          let y = 0;
          const kroki: string[] = [];
          for (const para of ciag.split(' ')) {
            const przecinek = para.indexOf(',');
            x += Number(para.slice(0, przecinek));
            y += Number(para.slice(przecinek + 1));
            kroki.push(`${kroki.length === 0 ? 'M' : 'L'}${naX(x).toFixed(1)} ${naY(y).toFixed(1)}`);
          }
          return `${kroki.join('')}Z`;
        })
        .join('');
      return { teryt, d };
    });
  }, [plik]);

  const barwa = (teryt: string) => {
    const w = wg.get(teryt)?.[2];
    if (w === null || w === undefined) return BEZ_DANYCH;
    let i = 0;
    while (i < progi.length && w >= progi[i]!) i++;
    return BARWY[Math.min(i, BARWY.length - 1)]!;
  };

  const wybrana = pod ? wg.get(pod.teryt) : null;
  const wysokosc = plik ? (1000 * (plik.zakres.ymax - plik.zakres.ymin)) / ((plik.zakres.xmax - plik.zakres.xmin) * Math.cos(((plik.zakres.ymin + plik.zakres.ymax) / 2) * (Math.PI / 180))) : 620;

  if (blad) {
    return (
      <p className="rounded-2xl border border-kreska bg-papier-2 p-6 text-sm text-atrament-2">
        Nie udało się wczytać konturów gmin. Dane liczbowe są niżej — mapa jest tylko
        sposobem ich pokazania.
      </p>
    );
  }

  return (
    <div className="relative">
      {!plik ? (
        <div className="grid h-[420px] place-items-center rounded-2xl border border-kreska bg-papier-2 text-sm text-atrament-3">
          Wczytuję kontury gmin…
        </div>
      ) : (
        <svg
          ref={ramka}
          viewBox={`0 0 1000 ${Math.round(wysokosc)}`}
          className="w-full rounded-2xl border border-kreska bg-papier-2"
          role="img"
          aria-label="Mapa gmin"
          onMouseLeave={() => ustawPod(null)}
        >
          {ksztalty.map((k) => (
            <path
              key={k.teryt}
              d={k.d}
              fill={barwa(k.teryt)}
              stroke="var(--papier-2)"
              strokeWidth={0.4}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--akcent)] focus-visible:stroke-[2]"
              tabIndex={-1}
              onMouseMove={(e) => {
                const r = ramka.current?.getBoundingClientRect();
                if (r) ustawPod({ teryt: k.teryt, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
              onClick={() => wg.has(k.teryt) && router.push(`/gmina/${k.teryt}`)}
            >
              <title>{wg.get(k.teryt)?.[1] ?? k.teryt}</title>
            </path>
          ))}
        </svg>
      )}

      {/* Podpowiedz idzie za kursorem; na dotyku i tak dziala <title> w SVG. */}
      {pod && wybrana ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
          style={{ left: Math.min(pod.x + 12, 700), top: pod.y + 12 }}
        >
          <p className="font-medium">{wybrana[1]}</p>
          <p className="liczby text-atrament-2">
            {wybrana[2] === null ? 'brak danych' : `${zlote(Math.round(wybrana[2]))} na mieszkańca`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
