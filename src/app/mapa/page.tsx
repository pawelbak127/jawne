import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, gminyWojewodztwa, wartosciMapy, wojewodztwaGmin, type MiaraMapy } from '@/lib/dane';
import { zlote, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { MapaGmin, type PozycjaMapy } from '@/components/MapaGmin';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Mapa gmin',
  description: 'Publiczne pieniądze w gminach na mapie: dochody, fundusze unijne i pomoc publiczna — zawsze na mieszkańca.',
};

const MIARY: { klucz: MiaraMapy; etykieta: string; opis: string; zrodlo: string; adres: string }[] = [
  {
    klucz: 'dochody',
    etykieta: 'Dochody gminy',
    opis: 'Dochody budżetu gminy w przeliczeniu na mieszkańca, za ostatni rok z kompletem danych.',
    zrodlo: 'GUS, Bank Danych Lokalnych',
    adres: 'https://bdl.stat.gov.pl/bdl/dane/podgrup/temat/G423',
  },
  {
    klucz: 'unia',
    etykieta: 'Fundusze europejskie',
    opis: 'Dofinansowanie z Unii dla projektów realizowanych wyłącznie w tej gminie (2021–2027), na mieszkańca.',
    zrodlo: 'Listy projektów Funduszy Europejskich',
    adres: 'https://dane.gov.pl/pl/dataset/13939',
  },
  {
    klucz: 'pomoc',
    etykieta: 'Pomoc publiczna dla firm',
    opis: 'Pomoc publiczna dla firm z siedzibą w gminie, na mieszkańca — tylko z dni pobranych dla całego kraju.',
    zrodlo: 'SUDOP (UOKiK)',
    adres: 'https://sudop.uokik.gov.pl',
  },
];

/**
 * Kubelki po kwantylach, nie po rownych przedzialach.
 *
 * Rozklad jest skosny: kilka gmin z ogromna kwota na mieszkanca rozciaga
 * skale tak, ze cala reszta kraju ma jeden kolor. Kwantyle pokazuja to,
 * co czytelnik moze z mapy odczytac uczciwie: w ktorej czesci stawki
 * jest jego gmina.
 */
function progiKwantylowe(wartosci: number[], ile = 6): number[] {
  const p = [...wartosci].sort((a, b) => a - b);
  return Array.from({ length: ile - 1 }, (_, i) => p[Math.floor(((i + 1) * p.length) / ile)] ?? 0);
}

export default async function StronaMapy({ searchParams }: { searchParams: Promise<{ miara?: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { miara: zadana } = await searchParams;
  const miara = MIARY.find((m) => m.klucz === zadana) ?? MIARY[0]!;

  const wartosci = wartosciMapy(miara.klucz);
  const wgTerytu = new Map(wartosci.map((w) => [w.teryt, w.wartosc]));

  // Nazwy gmin bierzemy z naszej tabeli; Warszawa jest w granicach PRG jedna
  // jednostka, wiec dopisujemy ja osobno zamiast pokazywac 18 dzielnic.
  const nazwy = new Map<string, string>();
  for (const w of wojewodztwaGmin()) {
    for (const g of gminyWojewodztwa(w.wojewodztwo)) {
      if (g.rodzaj === 'dzielnica Warszawy') continue;
      nazwy.set(g.teryt, g.nazwa);
    }
  }
  nazwy.set('146501', 'Warszawa');

  const pozycje: PozycjaMapy[] = [...nazwy.entries()].map(([teryt, nazwa]) => {
    const w = wgTerytu.get(teryt);
    // Zaokraglamy juz tutaj: grosze na mapie i tak sa nieczytelne, a kazda
    // cyfra po przecinku to 2 477 znakow w odpowiedzi.
    return [teryt, nazwa, w === undefined ? null : Math.round(w)];
  });
  const progi = progiKwantylowe(wartosci.map((w) => w.wartosc));
  const bezDanych = pozycje.filter((p) => p[2] === null).length;

  return (
    <div className="obszar py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Mapa gmin</h1>
        <Zrodlo adres="https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/" etykieta="granice: PRG (GUGiK)" />
      </div>
      <p className="mt-2 max-w-2xl text-atrament-2">
        Każda liczba na tej mapie jest w przeliczeniu na mieszkańca. Kliknij gminę,
        żeby zobaczyć, skąd te pieniądze pochodzą.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Co pokazuje mapa">
        {MIARY.map((m) => (
          <Link
            key={m.klucz}
            href={m.klucz === 'dochody' ? '/mapa' : `/mapa?miara=${m.klucz}`}
            className={`rounded-full border px-3 py-1.5 transition-colors ${
              m.klucz === miara.klucz
                ? 'border-akcent bg-akcent-slaby text-akcent'
                : 'border-kreska text-atrament-2 hover:border-kreska-2'
            }`}
          >
            {m.etykieta}
          </Link>
        ))}
      </nav>

      <p className="mt-3 max-w-2xl text-sm text-atrament-2">{miara.opis}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <MapaGmin key={miara.klucz} pozycje={pozycje} progi={progi} />

        <aside className="text-sm">
          <p className="font-medium">Legenda — złote na mieszkańca</p>
          <ul className="mt-3 space-y-1.5">
            {['#dbeee9', '#b3ddd3', '#84c7b6', '#55ac97', '#2f8a76', '#1b6152'].map((kolor, i) => (
              <li key={kolor} className="flex items-center gap-2">
                <span className="h-4 w-6 shrink-0 rounded" style={{ backgroundColor: kolor }} aria-hidden />
                <span className="liczby text-xs text-atrament-2">
                  {i === 0
                    ? `poniżej ${zlote(progi[0] ?? 0)}`
                    : i === 5
                      ? `powyżej ${zlote(progi[4] ?? 0)}`
                      : `${zlote(progi[i - 1] ?? 0)} – ${zlote(progi[i] ?? 0)}`}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1">
              <span className="h-4 w-6 shrink-0 rounded bg-kreska-2" aria-hidden />
              <span className="text-xs text-atrament-2">
                {`brak danych (${zOdmiana(bezDanych, 'gmina', 'gminy', 'gmin')})`}
              </span>
            </li>
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-atrament-3">
            Sześć przedziałów po tyle samo gmin (kwantyle), a nie równe kwoty: kilka gmin
            z bardzo wysoką kwotą na mieszkańca sprawiłoby, że cała reszta kraju miałaby
            jeden kolor. Ciemniej nie znaczy „lepiej” — to tylko więcej złotych na
            mieszkańca.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            {`Podstawa: ${zOdmiana(wartosci.length, 'gmina', 'gminy', 'gmin')} z wartością. Źródło liczb: ${miara.zrodlo}.`}
          </p>
          <p className="mt-3 text-xs">
            <Link href="/gminy" className="text-akcent underline underline-offset-4 hover:no-underline">
              Wolisz listę? Spis wszystkich gmin →
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
