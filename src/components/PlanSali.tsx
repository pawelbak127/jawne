'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Portret } from '@/components/Portret';
import { BARWY_GLOSU } from '@/lib/barwy-glosu';
import { etykieta } from '@/lib/glosy';
import { PUNKTY_SALI } from '@/lib/plan-sali';
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
/**
 * Rozmiar chmurki. Szerokosc jest pewna (`w-[19rem]`), wysokosc zalezy od
 * dlugosci opisu — ZMIERZONE 78 px przy trzech wierszach. Bierzemy 100 px
 * z zapasem: przeszacowanie tylko odwraca chmurke troche wczesniej,
 * niedoszacowanie wypuszcza ja pod krawedz.
 */
const CHMURKA_SZER = 304;
const CHMURKA_WYS = 100;
const ODSTEP = 14;

/**
 * Gdzie postawic chmurke, zeby nie wyjechala poza plan.
 *
 * Przy prawej krawedzi idzie w LEWO od kursora, przy dolnej — NAD niego.
 * Liczby to rozmiar chmurki: nie da sie go zmierzyc przed narysowaniem,
 * a zmierzony po narysowaniu dawalby przeskok.
 */
function chmurkaStyl(pod: { x: number; y: number; w: number; h: number }): React.CSSProperties {
  const wLewo = pod.x + ODSTEP + CHMURKA_SZER > pod.w;
  const doGory = pod.y + ODSTEP + CHMURKA_WYS > pod.h;
  return {
    left: Math.max(4, wLewo ? pod.x - ODSTEP - CHMURKA_SZER : pod.x + ODSTEP),
    top: Math.max(4, doGory ? pod.y - ODSTEP - CHMURKA_WYS : pod.y + ODSTEP),
  };
}

export function PlanSali({
  miejsca,
  szerokosc,
  wysokosc,
  wyroznionyId,
  stan,
  zSzukaniem = true,
}: {
  miejsca: MiejscePosla[];
  szerokosc: number;
  wysokosc: number;
  /** Miejsce jednego posla — reszta sali jest tlem (strona posla). */
  wyroznionyId?: number;
  stan: string;
  /** `false` tam, gdzie strona ma juz wlasne pole szukania (strona glowna). */
  zSzukaniem?: boolean;
}) {
  const router = useRouter();
  const ramka = useRef<SVGSVGElement>(null);
  /** Pudelko, wzgledem ktorego pozycjonujemy chmurke — nie przycina niczego. */
  const pudelko = useRef<HTMLDivElement>(null);
  const [pod, ustawPod] = useState<{ id: number; x: number; y: number; w: number; h: number } | null>(null);
  const [wybrany, ustawWybranego] = useState<number | null>(wyroznionyId ?? null);
  const [dotykiem, ustawDotykiem] = useState(false);
  const [szukane, ustawSzukane] = useState('');
  const [grupaPodSpodem, ustawGrupePodSpodem] = useState<string | null>(null);

  const wgId = useMemo(() => new Map(miejsca.map((m) => [m.id, m])), [miejsca]);

  /*
   * Gdy pokazujemy glosowanie, barwa miejsca mowi o GLOSIE, nie o klubie.
   * Dwa znaczenia na jednej kropce nie daja sie odczytac naraz, a glos jest
   * tym, po co czytelnik tu przyszedl. Legenda przelacza sie razem z barwami.
   */
  const zGlosami = miejsca.some((m) => m.glos !== undefined);
  const barwyMiejsca = (m: MiejscePosla) => {
    if (!zGlosami) return { b: m.barwa, bc: m.barwaCiemna };
    const t = BARWY_GLOSU[m.glos ? etykieta(m.glos).ton : 'brak'];
    return { b: t.jasny, bc: t.ciemny };
  };

  /**
   * Legenda: kluby albo sposoby glosowania — zaleznie od tego, co pokazuja
   * barwy. Grupa jest zarazem filtrem: najechanie na pozycje legendy
   * przygasza wszystkie miejsca spoza niej.
   *
   * Sposoby glosowania ida w kolejnosci rejestru (za, przeciw, wstrzymal,
   * reszta), a nie po liczebnosci: „za" ma byc zawsze w tym samym miejscu,
   * inaczej legenda przeskakuje przy kazdym glosowaniu.
   */
  const grupy = useMemo(() => {
    const licznik = new Map<string, { etykieta: string; barwa: string; barwaCiemna: string; ile: number }>();
    for (const m of miejsca) {
      const t = zGlosami ? BARWY_GLOSU[m.glos ? etykieta(m.glos).ton : 'brak'] : null;
      const klucz = zGlosami ? (m.glos ?? 'NIEOBECNY_W_GLOSOWANIU') : (m.klubId ?? '—');
      const podpis = zGlosami
        ? (m.glos ? etykieta(m.glos).krotka : 'nie ma w tym głosowaniu')
        : m.klubEtykieta;
      const w = licznik.get(klucz);
      if (w) w.ile += 1;
      else {
        licznik.set(klucz, {
          etykieta: podpis,
          barwa: t?.jasny ?? m.barwa,
          barwaCiemna: t?.ciemny ?? m.barwaCiemna,
          ile: 1,
        });
      }
    }
    const kolejnosc = ['YES', 'NO', 'ABSTAIN', 'PRESENT', 'VOTE_VALID', 'VOTE_INVALID', 'ABSENT', 'NIEOBECNY_W_GLOSOWANIU'];
    return [...licznik.entries()].sort((a, b) => (zGlosami
      ? (kolejnosc.indexOf(a[0]) + 1 || 99) - (kolejnosc.indexOf(b[0]) + 1 || 99)
      : b[1].ile - a[1].ile));
  }, [miejsca, zGlosami]);

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
    if (grupaPodSpodem) {
      return (zGlosami ? (m.glos ?? 'NIEOBECNY_W_GLOSOWANIU') : (m.klubId ?? '—')) !== grupaPodSpodem;
    }
    return false;
  };

  const opis = (m: MiejscePosla) =>
    [
      // Przy glosowaniu najpierw to, po co czytelnik tu jest. Posel, ktorego
      // w tym glosowaniu NIE MA, dostaje zdanie wprost — inaczej szara kropka
      // wygladalaby jak nieobecnosc, a to dwie rozne rzeczy.
      zGlosami ? (m.glos ? etykieta(m.glos).pelna : 'nie ma go w tym głosowaniu') : null,
      m.klubEtykieta,
      m.okreg,
      m.numer === null ? null : `miejsce nr ${m.numer}`,
    ]
      .filter(Boolean)
      .join(' · ');

  const karta = wybrany === null ? null : (wgId.get(wybrany) ?? null);
  const podKursorem = pod ? wgId.get(pod.id) : null;
  const promien = wyroznionyId === undefined ? 6.2 : 5;

  return (
    <div>
      {wyroznionyId === undefined && zSzukaniem ? (
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
      {/*
        DWIE ramki, nie jedna. Chmurka nie moze wisiec w tym samym pudelku,
        ktore przewija plan: `overflow-x: auto` NIE DA SIE polaczyc
        z widocznym `overflow-y` — przegladarka przycina wtedy takze w pionie
        i chmurka przy dolnej krawedzi jest ucieta w polowie zdania
        (zgloszenie Pawla 30.09.2026). Wewnetrzne pudelko przewija, zewnetrzne
        tylko pozycjonuje i niczego nie tnie.
      */}
      <div ref={pudelko} className="relative">
      <div className="overflow-x-auto rounded-2xl border border-kreska bg-papier-2">
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
          {/*
            Punkty orientacyjne z rysunku Kancelarii. Bez nich polkolo kropek
            nie mowi, gdzie jest przod izby — a to pierwsze pytanie, jakie
            zadaje ktos, kto na nie patrzy. Pozycje sa z rysunku, nie z naszego
            domyslu; fotel Prezydenta stoi poza obszarem miejsc i dlatego
            go tu nie ma (skrypt to zglasza).
          */}
          {PUNKTY_SALI.map((p) => (
            <g key={p.etykieta} pointerEvents="none">
              <circle cx={p.x} cy={p.y} r={3} className="fill-atrament-3" />
              <text
                x={p.x}
                y={p.y + 14}
                textAnchor="middle"
                className="fill-atrament-3"
                style={{ fontSize: 11 }}
              >
                {p.etykieta}
              </text>
            </g>
          ))}
          {miejsca.map((m) => (
            <circle
              key={m.id}
              cx={m.x}
              cy={m.y}
              r={m.id === wybrany || m.id === pod?.id ? promien + 1.6 : promien}
              className="miejsce cursor-pointer"
              style={
                {
                  '--b': barwyMiejsca(m).b,
                  '--bc': barwyMiejsca(m).bc,
                  opacity: przygaszony(m) ? 0.16 : 1,
                  stroke: m.id === wybrany ? 'var(--atrament)' : undefined,
                  strokeWidth: m.id === wybrany ? 1.8 : undefined,
                } as React.CSSProperties
              }
              onMouseMove={(e) => {
                // Wzgledem pudelka, w ktorym chmurka NAPRAWDE wisi. Liczenie
                // wzgledem `svg` mijalo sie z celem po przewinieciu planu
                // w bok: svg jest wtedy przesuniety wzgledem pudelka.
                const r = pudelko.current?.getBoundingClientRect();
                if (r) ustawPod({ id: m.id, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
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
      </div>

      {/*
        Chmurka ODBIJA SIE od krawedzi zamiast za nia wyjechac. Przy prawym
        skraju idzie w lewo od kursora, przy dolnym — nad niego. Wczesniej
        stala tu jedna liczba (620 px) i przy szerszym ekranie nie robila nic,
        a przy dolnej krawedzi i tak nie pomagala.
      */}
      {podKursorem && !dotykiem && pod ? (
        <div
          className="pointer-events-none absolute z-10 flex w-[19rem] max-w-[calc(100%-1rem)] items-center gap-3 rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
          style={chmurkaStyl(pod)}
        >
          <Portret
            slug={podKursorem.slug}
            imieNazwisko={podKursorem.nazwa}
            maZdjecie={podKursorem.maZdjecie}
            rozmiar="maly"
          />
          <span className="min-w-0">
            <span className="block font-medium">{podKursorem.nazwa}</span>
            <span className="liczby block text-atrament-2">{opis(podKursorem)}</span>
          </span>
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
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                  <Portret
                    slug={karta.slug}
                    imieNazwisko={karta.nazwa}
                    maZdjecie={karta.maZdjecie}
                    rozmiar="maly"
                  />
                  <div>
                    <p className="font-medium">{karta.nazwa}</p>
                    <p className="liczby text-sm text-atrament-2">{opis(karta)}</p>
                  </div>
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
            {grupy.map(([id, k]) => (
              <button
                key={id}
                type="button"
                onMouseEnter={() => ustawGrupePodSpodem(id)}
                onMouseLeave={() => ustawGrupePodSpodem(null)}
                onFocus={() => ustawGrupePodSpodem(id)}
                onBlur={() => ustawGrupePodSpodem(null)}
                className="flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-opacity hover:bg-papier-3"
                style={{ opacity: grupaPodSpodem && grupaPodSpodem !== id ? 0.45 : 1 }}
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
