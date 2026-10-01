'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zlote } from '@/lib/format';

export type PlikMapy = {
  skala: number;
  zakres: { xmin: number; ymin: number; xmax: number; ymax: number };
  /** Ksztalty jednego poziomu — plik gmin ma `gminy`, plik powiatow `powiaty`. */
  gminy?: Record<string, string[]>;
  powiaty?: Record<string, string[]>;
  /**
   * Granice wojewodztw z WLASNEJ warstwy PRG (A01), nie sklejone z gmin.
   * ZMIERZONE 29.09.2026: po uproszczeniu kazdej gminy osobno wspolne
   * krawedzie sasiadow nie sa identyczne (46 327 wystepuje raz, 22 326 dwa
   * razy), wiec scalanie po krawedziach daloby poszarpany obrys.
   */
  wojewodztwa?: { kod: string; nazwa: string; ksztalt: string[] }[];
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
export type Poziom = 'gminy' | 'powiaty';
const MAKS_POWIEKSZENIE = 12;

export function MapaGmin({
  pozycje,
  progi,
  poziom = 'gminy',
  przyblizDo = null,
  miara = 'dochody',
}: {
  pozycje: PozycjaMapy[];
  /** Granice kubelkow policzone na serwerze — legenda i mapa z jednej listy. */
  progi: number[];
  /** Ktory podzial rysujemy. Kazdy poziom ma WLASNY plik konturow. */
  poziom?: Poziom;
  /** Kod powiatu, na ktory mapa ma byc od razu przyblizona (`?powiat=`). */
  przyblizDo?: string | null;
  /** Do adresu „pokaz gminy tego powiatu" — wybor miary ma sie nie gubic. */
  miara?: string;
}) {
  const router = useRouter();
  const [plik, ustawPlik] = useState<PlikMapy | null>(null);
  const [blad, ustawBlad] = useState(false);
  const [pod, ustawPod] = useState<{ teryt: string; x: number; y: number } | null>(null);
  const [wybrany, ustawWybranego] = useState<string | null>(null);
  /*
   * Widok to JEDEN stan, a `null` znaczy „czytelnik jeszcze nic nie ruszyl".
   * Dopiero wtedy moze zadzialac przyblizenie z adresu (`?powiat=`). Gdyby
   * powiekszenie bylo stanem ustawianym w efekcie po wczytaniu konturow,
   * kazde wejscie renderowaloby mape dwa razy — i tak samo wygladaloby
   * „cofniecie" widoku, gdyby czytelnik zdazyl nim ruszyc.
   */
  const [widok, ustawWidok] = useState<{ z: number; x: number; y: number } | null>(null);
  const [wojewodztwo, ustawWojewodztwo] = useState<string | null>(null);
  const ramka = useRef<SVGSVGElement>(null);
  const przeciaganie = useRef<{ x: number; y: number; srodek: { x: number; y: number }; ruszyl: boolean } | null>(null);
  // ZGLOSZENIE PAWLA 24.09.2026: przeciagniecie mapy myszka konczylo sie
  // przejsciem na strone gminy, bo po przeciagnieciu przegladarka i tak
  // wysyla `click`. Zapamietujemy, czy kursor sie RUSZYL — jesli tak,
  // to bylo przesuwanie mapy, a nie wybor gminy.
  const bylRuch = useRef(false);
  // Stan, nie ref: React nie pozwala czytac ref-a przy renderowaniu,
  // a od tego zalezy, czy pokazac chmurke (mysz) czy karte (dotyk).
  const [dotykiem, ustawDotykiem] = useState(false);

  useEffect(() => {
    let zywe = true;
    fetch(`/mapa/${poziom}.json`)
      .then((o) => (o.ok ? o.json() : Promise.reject(new Error(String(o.status)))))
      .then((j: PlikMapy) => zywe && ustawPlik(j))
      .catch(() => zywe && ustawBlad(true));
    return () => {
      zywe = false;
    };
  }, [poziom]);

  const wg = useMemo(() => new Map(pozycje.map((p) => [p[0], p])), [pozycje]);

  const wysokosc = plik
    ? Math.round((1000 * (plik.zakres.ymax - plik.zakres.ymin))
      / ((plik.zakres.xmax - plik.zakres.xmin) * Math.cos(((plik.zakres.ymin + plik.zakres.ymax) / 2) * (Math.PI / 180))))
    : 620;

  /**
   * Rzut wspolrzednych geograficznych na uklad SVG (0..1000 w poziomie).
   * Jedna funkcja dla gmin i dla obrysow wojewodztw — dwie kopie tego samego
   * rachunku rozjechalyby sie przy pierwszej zmianie.
   */
  const sciezka = useMemo(() => {
    if (!plik) return null;
    const { xmin, xmax, ymin, ymax } = plik.zakres;
    const s = plik.skala;
    // Poludniki zbiegaja sie ku biegunowi: bez tego Polska jest za szeroka.
    const zwezenie = Math.cos(((ymin + ymax) / 2) * (Math.PI / 180));
    const szer = (xmax - xmin) * zwezenie;
    const wys = ymax - ymin;
    const naX = (x: number) => ((x / s - xmin) * zwezenie * 1000) / szer;
    const naY = (y: number) => ((ymax - y / s) * 1000 * (wys / szer)) / wys;

    // Zwraca takze prostokat obejmujacy — z niego bierze sie przyblizenie
    // na wybrane wojewodztwo. Liczony przy okazji rysowania, bo i tak
    // przechodzimy po wszystkich punktach.
    return (pierscienie: string[]) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const d = pierscienie
        .map((ciag) => {
          let x = 0;
          let y = 0;
          const kroki: string[] = [];
          for (const para of ciag.split(' ')) {
            const przecinek = para.indexOf(',');
            x += Number(para.slice(0, przecinek));
            y += Number(para.slice(przecinek + 1));
            const px = naX(x);
            const py = naY(y);
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;
            kroki.push(`${kroki.length === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`);
          }
          return `${kroki.join('')}Z`;
        })
        .join('');
      return { d, x0, y0, x1, y1 };
    };
  }, [plik]);

  const ksztalty = useMemo(() => {
    if (!plik || !sciezka) return [];
    const jednostki = plik.gminy ?? plik.powiaty ?? {};
    return Object.entries(jednostki).map(([teryt, pierscienie]) => ({ teryt, ...sciezka(pierscienie) }));
  }, [plik, sciezka]);

  /** Obrysy wojewodztw — rysowane NAD gminami, ale nieklikalne. */
  const granice = useMemo(() => {
    if (!plik?.wojewodztwa || !sciezka) return [];
    return plik.wojewodztwa
      .map((w) => ({ kod: w.kod, nazwa: w.nazwa, ...sciezka(w.ksztalt) }))
      // Alfabetycznie po polsku: w liscie do wyboru szuka sie nazwy, nie kodu.
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
  }, [plik, sciezka]);

  /** Nazwa wojewodztwa po dwoch pierwszych cyfrach TERYT-u gminy. */
  const wojewodztwoGminy = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of plik?.wojewodztwa ?? []) m.set(w.kod, w.nazwa);
    return (teryt: string) => m.get(teryt.slice(0, 2)) ?? null;
  }, [plik]);

  const barwa = (teryt: string) => {
    const w = wg.get(teryt)?.[2];
    if (w === null || w === undefined) return BEZ_DANYCH;
    let i = 0;
    while (i < progi.length && w >= progi[i]!) i++;
    return BARWY[Math.min(i, BARWY.length - 1)]!;
  };

  const opis = (p: PozycjaMapy) => (p[2] === null ? 'brak danych' : `${zlote(Math.round(p[2]))} na mieszkańca`);

  /**
   * Prostokat obejmujacy jednostki o danym prefiksie TERYT-u, przeliczony
   * na widok. Sluzy i przyblizeniu z adresu, i wyborowi wojewodztwa.
   */
  const widokNa = useMemo(() => (prefiks: string, zapas: number) => {
    const swoje = ksztalty.filter((k) => k.teryt.startsWith(prefiks));
    if (swoje.length === 0) return null;
    const x0 = Math.min(...swoje.map((k) => k.x0));
    const x1 = Math.max(...swoje.map((k) => k.x1));
    const y0 = Math.min(...swoje.map((k) => k.y0));
    const y1 = Math.max(...swoje.map((k) => k.y1));
    const z = Math.min(1000 / ((x1 - x0) * zapas), wysokosc / ((y1 - y0) * zapas));
    return {
      z: Math.min(Math.max(z, 1), MAKS_POWIEKSZENIE),
      x: (x0 + x1) / 2 / 1000,
      y: (y0 + y1) / 2 / wysokosc,
    };
  }, [ksztalty, wysokosc]);

  /*
   * Deep-link `?powiat=1465`: po kliknieciu w powiat wracamy na poziom gmin
   * przyblizeni na ten powiat. Widok gmin nie zna obrysow powiatow, wiec
   * prostokat skladamy z prostokatow gmin o tym prefiksie TERYT-u.
   * Zapas 1,3 — powiat bez otoczenia nie mowi, gdzie w kraju lezy.
   */
  const zAdresu = przyblizDo ? widokNa(przyblizDo, 1.3) : null;
  const biezacy = widok ?? zAdresu ?? { z: 1, x: 0.5, y: 0.5 };
  const powiekszenie = biezacy.z;
  const srodek = { x: biezacy.x, y: biezacy.y };

  // viewBox po powiekszeniu: srodek trzymamy w ulamkach, zeby dzialal
  // tak samo przy kazdej szerokosci ekranu.
  const szerWidoku = 1000 / powiekszenie;
  const wysWidoku = wysokosc / powiekszenie;
  const vx = Math.min(Math.max(srodek.x * 1000 - szerWidoku / 2, 0), 1000 - szerWidoku);
  const vy = Math.min(Math.max(srodek.y * wysokosc - wysWidoku / 2, 0), wysokosc - wysWidoku);

  const przesun = (dx: number, dy: number) => ustawWidok({
    z: powiekszenie,
    x: Math.min(Math.max(srodek.x + dx, 0), 1),
    y: Math.min(Math.max(srodek.y + dy, 0), 1),
  });

  /**
   * Przyblizenie na wybrane wojewodztwo. Powiekszenie bierze sie z prostokata
   * obejmujacego jego obrys, nie z tabeli — inaczej kazda zmiana konturow
   * wymagalaby poprawienia szesnastu liczb w kodzie.
   */
  const pokazWojewodztwo = (kod: string | null) => {
    ustawWojewodztwo(kod);
    // Zapas 12%: obrys dotykajacy krawedzi ramki wyglada na uciety.
    ustawWidok((kod === null ? null : widokNa(kod, 1.12)) ?? { z: 1, x: 0.5, y: 0.5 });
  };

  /*
   * Powiat nie ma wlasnej strony i nie bedzie jej mial na sile: klikniecie
   * prowadzi na te sama mape, o poziom nizej i przyblizona na ten powiat.
   * To jedyna droga „w dol", jaka te dane naprawde maja.
   */
  const dokad = (teryt: string) => (poziom === 'powiaty'
    ? `/mapa?${[miara === 'dochody' ? null : `miara=${miara}`, `powiat=${teryt}`].filter(Boolean).join('&')}`
    : `/gmina/${teryt}`);

  const karta = wybrany ? wg.get(wybrany) : null;

  if (blad) {
    return (
      <p className="rounded-2xl border border-kreska bg-papier-2 p-6 text-sm text-atrament-2">
        {poziom === 'powiaty' ? 'Nie udało się wczytać konturów powiatów. ' : 'Nie udało się wczytać konturów gmin. '}
        <Link href="/gminy" className="text-akcent underline underline-offset-4">Spis gmin</Link>{' '}
        pokazuje te same dane bez mapy.
      </p>
    );
  }

  return (
    <div>
      {!plik ? (
        <div className="grid h-[420px] place-items-center rounded-2xl border border-kreska bg-papier-2 text-sm text-atrament-3">
          {poziom === 'powiaty' ? 'Wczytuję kontury powiatów…' : 'Wczytuję kontury gmin…'}
        </div>
      ) : (
        <>
          {granice.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="mapa-wojewodztwo" className="text-sm text-atrament-2">
                Województwo
              </label>
              <select
                id="mapa-wojewodztwo"
                value={wojewodztwo ?? ''}
                onChange={(e) => pokazWojewodztwo(e.target.value || null)}
                className="rounded-xl border border-kreska bg-papier px-3 py-2 text-sm"
              >
                <option value="">cała Polska</option>
                {granice.map((w) => (
                  <option key={w.kod} value={w.kod}>{w.nazwa}</option>
                ))}
              </select>
              {wojewodztwo ? (
                <button
                  type="button"
                  onClick={() => pokazWojewodztwo(null)}
                  className="rounded-xl border border-kreska bg-papier px-3 py-2 text-sm transition-colors hover:bg-papier-3"
                >
                  Cała Polska
                </button>
              ) : null}
            </div>
          ) : null}
        <div className="relative">
          <svg
            ref={ramka}
            viewBox={`${vx} ${vy} ${szerWidoku} ${wysWidoku}`}
            className="w-full touch-none rounded-2xl border border-kreska bg-papier-2"
            role="img"
            aria-label={poziom === 'powiaty' ? 'Mapa powiatów — kliknięcie wybiera powiat' : 'Mapa gmin — kliknięcie wybiera gminę'}
            onMouseLeave={() => ustawPod(null)}
            onPointerDown={(e) => {
              if ((e.pointerType !== 'mouse') !== dotykiem) ustawDotykiem(e.pointerType !== 'mouse');
              przeciaganie.current = { x: e.clientX, y: e.clientY, srodek, ruszyl: false };
              bylRuch.current = false;
            }}
            onPointerMove={(e) => {
              const p = przeciaganie.current;
              if (!p || !(e.buttons & 1)) return;
              // Prog 4 px: drzenie reki przy kliknieciu to nie przeciaganie.
              if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 4) {
                p.ruszyl = true;
                bylRuch.current = true;
              }
              if (powiekszenie === 1) return;
              const r = ramka.current?.getBoundingClientRect();
              if (!r) return;
              ustawWidok({
                z: powiekszenie,
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
                /* Gminy z innych wojewodztw zostaja na mapie — przy granicy
                   trzeba widziec, co jest po drugiej stronie — ale przygaszone,
                   zeby kubelki czytalo sie w obrebie wybranego wojewodztwa. */
                opacity={wojewodztwo && k.teryt.slice(0, 2) !== wojewodztwo ? 0.22 : 1}
                className="cursor-pointer"
                onMouseMove={(e) => {
                  const r = ramka.current?.getBoundingClientRect();
                  if (r) ustawPod({ teryt: k.teryt, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onClick={() => {
                  // Przeciagniecie to nie klikniecie — inaczej kazde przesuniecie
                  // mapy konczy sie wyjsciem z niej.
                  if (bylRuch.current) { bylRuch.current = false; return; }
                  // Na dotyku klikniecie tylko ZAZNACZA — przejscie jest
                  // osobnym przyciskiem, bo palec trafia w sasiednia gmine.
                  if (dotykiem) { ustawWybranego(k.teryt); return; }
                  if (wg.has(k.teryt)) router.push(dokad(k.teryt));
                }}
              />
            ))}
            {/*
              Granice wojewodztw NAD gminami i bez lapania myszy: to warstwa
              orientacyjna, a klikalna jednostka pozostaje gmina. Grubosc dzielona
              przez powiekszenie, bo inaczej po przyblizeniu kreska rosnie razem
              z mapa i zalewa male gminy.
            */}
            {granice.map((w) => (
              <g key={w.kod} pointerEvents="none">
                {/*
                  Dwie kreski, nie jedna: jasna otoczka pod spodem i ciemna
                  linia na wierzchu. Sama ciemna linia gubi sie na ciemnych
                  gminach, sama jasna — na jasnych. Tak robi sie granice
                  na mapach papierowych i tu dziala tak samo.
                */}
                <path
                  d={w.d}
                  fill="none"
                  stroke="var(--papier)"
                  strokeWidth={4 / powiekszenie}
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <path
                  d={w.d}
                  fill="none"
                  stroke={w.kod === wojewodztwo ? 'var(--atrament)' : 'var(--atrament-2)'}
                  strokeWidth={(w.kod === wojewodztwo ? 2.6 : 1.6) / powiekszenie}
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </svg>

          {/* Chmurka tylko dla myszy — na dotyku jest karta pod mapa. */}
          {pod && wg.get(pod.teryt) && !dotykiem ? (
            <div
              className="pointer-events-none absolute z-10 max-w-[16rem] rounded-xl border border-kreska bg-papier px-3 py-2 text-sm shadow-karta-2"
              style={{ left: Math.min(pod.x + 12, 700), top: pod.y + 12 }}
            >
              <p className="font-medium">{wg.get(pod.teryt)![1]}</p>
              {wojewodztwoGminy(pod.teryt) ? (
                <p className="text-xs text-atrament-3">{`woj. ${wojewodztwoGminy(pod.teryt)}`}</p>
              ) : null}
              <p className="liczby text-atrament-2">{opis(wg.get(pod.teryt)!)}</p>
            </div>
          ) : null}

          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              aria-label="Powiększ"
              onClick={() => ustawWidok({ ...biezacy, z: Math.min(powiekszenie * KROK_POWIEKSZENIA, MAKS_POWIEKSZENIE) })}
              className="grid h-11 w-11 place-items-center rounded-lg border border-kreska bg-papier text-lg leading-none shadow-karta"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Pomniejsz"
              onClick={() => ustawWidok({ ...biezacy, z: Math.max(powiekszenie / KROK_POWIEKSZENIA, 1) })}
              className="grid h-11 w-11 place-items-center rounded-lg border border-kreska bg-papier text-lg leading-none shadow-karta"
            >
              −
            </button>
          </div>

          {/* Strzalki: przesuwanie bez przeciagania — na telefonie palec
              sluzy do wybierania gminy, a nie do panoramowania. */}
          {powiekszenie > 1 ? (
            <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1">
              <span />
              <button type="button" aria-label="W górę" onClick={() => przesun(0, -0.12)} className="h-11 w-11 rounded-lg border border-kreska bg-papier shadow-karta">↑</button>
              <span />
              <button type="button" aria-label="W lewo" onClick={() => przesun(-0.12, 0)} className="h-11 w-11 rounded-lg border border-kreska bg-papier shadow-karta">←</button>
              <button type="button" aria-label="Wyśrodkuj" onClick={() => pokazWojewodztwo(null)} className="h-11 w-11 rounded-lg border border-kreska bg-papier text-xs shadow-karta">∘</button>
              <button type="button" aria-label="W prawo" onClick={() => przesun(0.12, 0)} className="h-11 w-11 rounded-lg border border-kreska bg-papier shadow-karta">→</button>
              <span />
              <button type="button" aria-label="W dół" onClick={() => przesun(0, 0.12)} className="h-11 w-11 rounded-lg border border-kreska bg-papier shadow-karta">↓</button>
              <span />
            </div>
          ) : null}
        </div>
        </>
      )}

      {/* Karta wybranej gminy — to ona, a nie dotkniecie mapy, prowadzi dalej. */}
      <div className="mt-3 min-h-[4.5rem] rounded-2xl border border-kreska bg-papier-2 p-4">
        {karta ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <div>
              <p className="font-medium">{karta[1]}</p>
              {wojewodztwoGminy(karta[0]) ? (
                <p className="text-xs text-atrament-3">{`woj. ${wojewodztwoGminy(karta[0])}`}</p>
              ) : null}
              <p className="liczby text-sm text-atrament-2">{opis(karta)}</p>
            </div>
            <Link
              href={dokad(karta[0])}
              className="rounded-xl bg-atrament px-4 py-2 text-sm font-medium text-papier transition-opacity hover:opacity-90"
            >
              {poziom === 'powiaty' ? 'Pokaż gminy tego powiatu →' : 'Zobacz tę gminę →'}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-atrament-3">
            {poziom === 'powiaty'
              ? 'Dotknij powiatu, żeby go wybrać — potem przycisk pokaże jego gminy. '
              : 'Dotknij gminy, żeby ją wybrać — potem przycisk przeniesie Cię na jej stronę. '}
            Przyciskiem <span className="liczby">+</span> powiększysz mapę.
          </p>
        )}
      </div>
    </div>
  );
}
