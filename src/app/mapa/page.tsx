import type { Metadata } from 'next';
import Link from 'next/link';
import {
  bazaDostepna, gminyWojewodztwa, nazwyPowiatow, wartosciMapy, wartosciMapyPowiatow, wojewodztwaGmin,
  type MiaraMapy,
} from '@/lib/dane';
import { nazwaPowiatu } from '@/lib/mapa';
import { zlote, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { MapaGmin, type PozycjaMapy } from '@/components/MapaGmin';
import { Okruszek, Podstawa, Wypis, Zakladki } from '@/components/Szablon';

/** Tytul idzie za poziomem: dwie rozne mapy nie moga miec jednego tytulu. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ poziom?: string }>;
}): Promise<Metadata> {
  const { poziom } = await searchParams;
  const powiaty = poziom === 'powiaty';
  return {
    title: powiaty ? 'Mapa powiatów' : 'Mapa gmin',
    description: `Publiczne pieniądze w ${powiaty ? 'powiatach' : 'gminach'} na mapie: dochody, `
      + 'fundusze unijne i pomoc publiczna — zawsze na mieszkańca.',
  };
}

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
    opis: 'Pomoc publiczna dla firm z siedzibą w gminie, na mieszkańca — tylko z dni ustalonych, czyli tych, w których minął już termin zgłoszenia pomocy. Te same dni liczy strona gminy.',
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

/** Odmiana rzeczownika, ktory na mapie zmienia sie razem z poziomem. */
const JEDNOSTKI = {
  gminy: { jedna: 'gmina', dwie: 'gminy', pieciu: 'gmin' },
  powiaty: { jedna: 'powiat', dwie: 'powiaty', pieciu: 'powiatów' },
} as const;

/** Adres mapy z zachowaniem drugiego wyboru — chipsy nie kasuja sie nawzajem. */
function adres(miara: MiaraMapy, poziom: 'gminy' | 'powiaty'): string {
  const czesci = [miara === 'dochody' ? null : `miara=${miara}`, poziom === 'gminy' ? null : 'poziom=powiaty'];
  const zapytanie = czesci.filter(Boolean).join('&');
  return zapytanie ? `/mapa?${zapytanie}` : '/mapa';
}

export default async function StronaMapy({
  searchParams,
}: {
  searchParams: Promise<{ miara?: string; poziom?: string; powiat?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { miara: zadana, poziom: zadanyPoziom, powiat: zadanyPowiat } = await searchParams;
  const miara = MIARY.find((m) => m.klucz === zadana) ?? MIARY[0]!;
  const poziom = zadanyPoziom === 'powiaty' ? 'powiaty' : 'gminy';
  const slowo = JEDNOSTKI[poziom];
  // Deep-link z widoku powiatow: „pokaz gminy tego powiatu" wraca na poziom
  // gmin od razu przyblizony. Czterocyfrowy kod albo nic — parametr z adresu
  // nie moze decydowac o niczym wiecej.
  const przyblizDo = /^\d{4}$/.test(zadanyPowiat ?? '') ? zadanyPowiat! : null;

  const wartosci = poziom === 'powiaty' ? wartosciMapyPowiatow(miara.klucz) : wartosciMapy(miara.klucz);
  const wgTerytu = new Map(wartosci.map((w) => [w.teryt, w.wartosc]));

  // Nazwy bierzemy z naszej tabeli; Warszawa jest w granicach PRG jedna
  // jednostka, wiec dopisujemy ja osobno zamiast pokazywac 18 dzielnic.
  const nazwy = new Map<string, string>();
  if (poziom === 'powiaty') {
    for (const [kod, nazwa] of nazwyPowiatow()) nazwy.set(kod, nazwaPowiatu(nazwa));
  } else {
    for (const w of wojewodztwaGmin()) {
      for (const g of gminyWojewodztwa(w.wojewodztwo)) {
        if (g.rodzaj === 'dzielnica Warszawy') continue;
        nazwy.set(g.teryt, g.nazwa);
      }
    }
    nazwy.set('146501', 'Warszawa');
  }

  const pozycje: PozycjaMapy[] = [...nazwy.entries()].map(([teryt, nazwa]) => {
    const w = wgTerytu.get(teryt);
    // Zaokraglamy juz tutaj: grosze na mapie i tak sa nieczytelne, a kazda
    // cyfra po przecinku to tyle znakow w odpowiedzi, ile jednostek.
    return [teryt, nazwa, w === undefined ? null : Math.round(w)];
  });
  const progi = progiKwantylowe(wartosci.map((w) => w.wartosc));
  const bezDanych = pozycje.filter((p) => p[2] === null).length;

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Mapa' }]} />
      <Wypis
        tytul={poziom === 'powiaty' ? 'Mapa powiatów' : 'Mapa gmin'}
        podtytul={`Każda liczba na tej mapie jest w przeliczeniu na mieszkańca. ${poziom === 'gminy'
          ? 'Kliknij gminę, żeby zobaczyć, skąd te pieniądze pochodzą.'
          : 'Powiat to suma jego gmin podzielona przez sumę ich mieszkańców — nie średnia z gmin.'}`}
      />

      <Zakladki
        etykieta="Co pokazuje mapa"
        pozycje={MIARY.map((m) => ({ adres: adres(m.klucz, poziom), nazwa: m.etykieta, biezaca: m.klucz === miara.klucz }))}
      />
      <Zakladki
        etykieta="Poziom podziału"
        pozycje={(['gminy', 'powiaty'] as const).map((p) => ({ adres: adres(miara.klucz, p), nazwa: p === 'gminy' ? 'gminy' : 'powiaty', biezaca: p === poziom }))}
      />

      <p className="wstep mt-3 text-atrament-2">{miara.opis}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <MapaGmin
          key={`${miara.klucz}-${poziom}`}
          pozycje={pozycje}
          progi={progi}
          poziom={poziom}
          przyblizDo={przyblizDo}
          miara={miara.klucz}
        />

        <aside style={{ fontSize: 'var(--sredni)' }}>
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
                {`brak danych (${zOdmiana(bezDanych, slowo.jedna, slowo.dwie, slowo.pieciu)})`}
              </span>
            </li>
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-atrament-3">
            {`Sześć przedziałów po tyle samo ${slowo.pieciu} (kwantyle), a nie równe kwoty: kilka `}
            {poziom === 'gminy' ? 'gmin' : 'powiatów'}
            {` z bardzo wysoką kwotą na mieszkańca sprawiłoby, że cała reszta kraju miałaby
            jeden kolor. Ciemniej nie znaczy „lepiej” — to tylko więcej złotych na
            mieszkańca.`}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            {`Podstawa: ${zOdmiana(wartosci.length, slowo.jedna, slowo.dwie, slowo.pieciu)} z wartością. Źródło liczb: ${miara.zrodlo}.`}
          </p>
          <p className="mt-3">
            <Link href="/gminy" className="text-akcent underline underline-offset-4 hover:no-underline">
              Wolisz listę? Spis wszystkich gmin →
            </Link>
          </p>
        </aside>
      </div>
      <p className="stan-danych">
        <span><Podstawa adres="https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/" nazwa="granice: PRG (GUGiK)" /></span>
      </p>
    </div>
  );
}
