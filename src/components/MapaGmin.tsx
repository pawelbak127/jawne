'use client';

import Link from 'next/link';
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
 * zbijaja ja do ok. 113 kB. Kwote formatuje przegladarka — `zlote()` jest
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
 *
 * ZGLOSZENIA PAWLA 24.09.2026, oba naprawione tutaj:
 *  1. na mapie pokazywaly sie DWIE chmurki naraz — nasza i systemowa
 *     z <title>. Zostala nasza,
 *  2. na telefonie dotkniecie od razu PRZENOSILO na strone gminy, wiec nie
 *     dalo sie trafic w wybrana. Teraz dotkniecie tylko ZAZNACZA, a przejscie
 *     jest osobnym przyciskiem w karcie pod mapa. Mysz dziala jak dotad.
 * Do tego powiekszanie: przy 2 477 gminach na ekranie telefonu jedna gmina
 * ma kilka pikseli i bez powiekszenia nie da sie w nia trafic.
 */
const BARWY = ['#dbeee9', '#b3ddd3', '#84c7b6', '#55ac97', '#2f8a76', '#1b6152'];
const BEZ_DANYCH = 'var(--kreska-2)';
const KROK_POWIEKSZENIA = 1.6;
const MAKS_POWIEKSZENIE = 12;

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
  const [wybrany, ustawWybranego] = useState<string | null>(null);
  const [powiekszenie, ustawPowiekszenie] = useState(1);
  const [srodek, ustawSrodek] = useState({ x: 0.5, y: 0.5 });
  const ramka = useRef<SVGSVGElement>(null);
  const przeciaganie = useRef<{ x: number; y: number; srodek: { x: number; y: number } } | null>(null);
  // Stan, nie ref: React nie pozwala czytac ref-a przy renderowaniu,
  // a od tego zalezy, czy pokazac chmurke (mysz) czy karte (dotyk).
  const [dotykiem, ustawDotykiem] = useState(false);

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

  const wysokosc = plik
    ? Math.round((1000 * (plik.zakres.ymax - plik.zakres.ymin))
      / ((plik.zakres.xmax - plik.zakres.xmin) * Math.cos(((plik.zakres.ymin + plik.zakres.ymax) / 2) * (Math.PI / 180))))
    : 620;

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

  const opis = (p: PozycjaMapy) => (p[2] === null ? 'brak danych' : `${zlote(Math.round(p[2]))} na mieszkańca`);

  // viewBox po powiekszeniu: srodek trzymamy w ulamkach, zeby dzialal
  // tak samo przy kazdej szerokosci ekranu.
  const szerWidoku = 1000 / powiekszenie;
  const wysWidoku = wysokosc / powiekszenie;
  const vx = Math.min(Math.max(srodek.x * 1000 - szerWidoku / 2, 0), 1000 - szerWidoku);
  const vy = Math.min(Math.max(srodek.y * wysokosc - wysWidoku / 2, 0), wysokosc - wysWidoku);

  const przesun = (dx: number, dy: number) => {
    ustawSrodek((s) => ({
      x: Math.min(Math.max(s.x + dx, 0), 1),
      y: Math.min(Math.max(s.y + dy, 0), 1),
    }));
  };

  const karta = wybrany ? wg.get(wybrany) : null;

  if (blad) {
    return (
      <p className="rounded-2xl border border-kreska bg-papier-2 p-6 text-sm text-atrament-2">
        Nie udało się wczytać konturów gmin.{' '}
        <Link href="/gminy" className="text-akcent underline underline-offset-4">Spis gmin</Link>{' '}
        pokazuje te same dane bez mapy.
      </p>
    );
  }

  return (
    <div>
      {!plik ? (
        <div className="grid h-[420px] place-items-center rounded-2xl border border-kreska bg-papier-2 text-sm text-atrament-3">
          Wczytuję kontury gmin…
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={ramka}
            viewBox={`${vx} ${vy} ${szerWidoku} ${wysWidoku}`}
            className="w-full touch-none rounded-2xl border border-kreska bg-papier-2"
            role="img"
            aria-label="Mapa gmin — kliknięcie wybiera gminę"
            onMouseLeave={() => ustawPod(null)}
            onPointerDown={(e) => {
              if ((e.pointerType !== 'mouse') !== dotykiem) ustawDotykiem(e.pointerType !== 'mouse');
              przeciaganie.current = { x: e.clientX, y: e.clientY, srodek };
            }}
            onPointerMove={(e) => {
              const p = przeciaganie.current;
              if (!p || !(e.buttons & 1) || powiekszenie === 1) return;
              const r = ramka.current?.getBoundingClientRect();
              if (!r) return;
              ustawSrodek({
                x: Math.min(Math.max(p.srodek.x - (e.clientX - p.x) / (r.width * powiekszenie), 0), 1),
                y: Math.min(Math.max(p.srodek.y - (e.clientY - p.y) / (r.height * powiekszenie), 0), 1),
              });
            }}
            onPointerUp={() => { przeciaganie.current = null; }}
          >
            {ksztalty.map((k) => (
              <path
                key={k.teryt}
                d={k.d}
                fill={barwa(k.teryt)}
                stroke={k.teryt === wybrany ? 'var(--atrament)' : 'var(--papier-2)'}
                strokeWidth={k.teryt === wybrany ? 1.6 / powiekszenie : 0.4 / powiekszenie}
                className="cursor-pointer"
                onMouseMove={(e) => {
                  const r = ramka.current?.getBoundingClientRect();
                  if (r) ustawPod({ teryt: k.teryt, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onClick={() => {
                  // Na dotyku klikniecie tylko ZAZNACZA — przejscie jest
                  // osobnym przyciskiem, bo palec trafia w sasiednia gmine.
                  if (dotykiem) { ustawWybranego(k.teryt); return; }
                  if (wg.has(k.teryt)) router.push(`/gmina/${k.teryt}`);
                }}
              />
            ))}
          </svg>

          {/* Chmurka tylko dla myszy — na dotyku jest karta pod mapa. */}
          {pod && wg.get(pod.teryt) && !dotykiem ? (
            <div
              className="pointer-events-none absolute z-10 max-w-[16rem] rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
              style={{ left: Math.min(pod.x + 12, 700), top: pod.y + 12 }}
            >
              <p className="font-medium">{wg.get(pod.teryt)![1]}</p>
              <p className="liczby text-atrament-2">{opis(wg.get(pod.teryt)!)}</p>
            </div>
          ) : null}

          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              aria-label="Powiększ"
              onClick={() => ustawPowiekszenie((z) => Math.min(z * KROK_POWIEKSZENIA, MAKS_POWIEKSZENIE))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-kreska bg-papier text-lg leading-none shadow-karta"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Pomniejsz"
              onClick={() => ustawPowiekszenie((z) => Math.max(z / KROK_POWIEKSZENIA, 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-kreska bg-papier text-lg leading-none shadow-karta"
            >
              −
            </button>
          </div>

          {/* Strzalki: przesuwanie bez przeciagania — na telefonie palec
              sluzy do wybierania gminy, a nie do panoramowania. */}
          {powiekszenie > 1 ? (
            <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1">
              <span />
              <button type="button" aria-label="W górę" onClick={() => przesun(0, -0.12)} className="h-8 w-8 rounded-lg border border-kreska bg-papier shadow-karta">↑</button>
              <span />
              <button type="button" aria-label="W lewo" onClick={() => przesun(-0.12, 0)} className="h-8 w-8 rounded-lg border border-kreska bg-papier shadow-karta">←</button>
              <button type="button" aria-label="Wyśrodkuj" onClick={() => { ustawPowiekszenie(1); ustawSrodek({ x: 0.5, y: 0.5 }); }} className="h-8 w-8 rounded-lg border border-kreska bg-papier text-xs shadow-karta">∘</button>
              <button type="button" aria-label="W prawo" onClick={() => przesun(0.12, 0)} className="h-8 w-8 rounded-lg border border-kreska bg-papier shadow-karta">→</button>
              <span />
              <button type="button" aria-label="W dół" onClick={() => przesun(0, 0.12)} className="h-8 w-8 rounded-lg border border-kreska bg-papier shadow-karta">↓</button>
              <span />
            </div>
          ) : null}
        </div>
      )}

      {/* Karta wybranej gminy — to ona, a nie dotkniecie mapy, prowadzi dalej. */}
      <div className="mt-3 min-h-[4.5rem] rounded-2xl border border-kreska bg-papier-2 p-4">
        {karta ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <div>
              <p className="font-medium">{karta[1]}</p>
              <p className="liczby text-sm text-atrament-2">{opis(karta)}</p>
            </div>
            <Link
              href={`/gmina/${karta[0]}`}
              className="rounded-xl bg-atrament px-4 py-2 text-sm font-medium text-papier transition-opacity hover:opacity-90"
            >
              Zobacz tę gminę →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-atrament-3">
            Dotknij gminy, żeby ją wybrać — potem przycisk przeniesie Cię na jej stronę.
            Przyciskiem <span className="liczby">+</span> powiększysz mapę.
          </p>
        )}
      </div>
    </div>
  );
}
