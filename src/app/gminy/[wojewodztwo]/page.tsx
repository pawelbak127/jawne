import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, gminyWojewodztwa, wojewodztwaGmin, type GminaSpisu } from '@/lib/dane';
import { liczba, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Zrodlo } from '@/components/Zrodlo';

const ZRODLO_GUS = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/zmienna/72305';

/** Nazwa wojewodztwa z adresu — porownujemy po uproszczeniu, bez ogonkow. */
function zAdresu(param: string): string | null {
  return wojewodztwaGmin().find((w) => adresWojewodztwa(w.wojewodztwo) === param.toLowerCase())?.wojewodztwo ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ wojewodztwo: string }> }): Promise<Metadata> {
  const { wojewodztwo } = await params;
  const nazwa = bazaDostepna() ? zAdresu(wojewodztwo) : null;
  if (!nazwa) return { title: 'Nie ma takiego województwa' };
  return {
    title: `Gminy — woj. ${nazwa}`,
    description: `Spis gmin województwa ${nazwa}: budżet, pieniądze z Unii i pomoc publiczna dla firm w każdej z nich.`,
  };
}

/** Nazwa gminy tak, jak mowi o niej rejestr — „Gmina X” dla gmin wiejskich. */
function nazwaWlasna(g: GminaSpisu): string {
  if (g.rodzaj === 'dzielnica Warszawy') return `Warszawa, dzielnica ${g.nazwa}`;
  if (g.rodzaj === 'gmina') return `Gmina ${g.nazwa}`;
  return g.nazwa;
}

export default async function StronaGminWojewodztwa({ params }: { params: Promise<{ wojewodztwo: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { wojewodztwo } = await params;
  const nazwa = zAdresu(wojewodztwo);
  if (!nazwa) notFound();

  const gminy = gminyWojewodztwa(nazwa);
  const powiaty = new Map<string, GminaSpisu[]>();
  for (const g of gminy) {
    const lista = powiaty.get(g.powiat) ?? [];
    lista.push(g);
    powiaty.set(g.powiat, lista);
  }
  const rok = gminy.reduce<number | null>((a, g) => (g.rok && (!a || g.rok > a) ? g.rok : a), null);

  return (
    <div className="obszar py-10">
      <p className="text-sm text-atrament-2">
        <Link href="/gminy" className="hover:text-akcent">Gminy</Link>
      </p>

      <h1 className="szryft mt-3 text-3xl font-semibold sm:text-4xl">{`woj. ${nazwa}`}</h1>
      <p className="mt-2 text-atrament-2">
        {`${zOdmiana(gminy.length, 'gmina', 'gminy', 'gmin')} w ${zOdmiana(powiaty.size, 'powiecie', 'powiatach', 'powiatach')}.`}
      </p>

      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa gminy lub miasta" />
      </div>

      {/* Sama liczba przy nazwie nie mowi, co znaczy — mianownik musi byc widoczny. */}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-atrament-3">
        <span>{rok ? `Liczba przy gminie to mieszkańcy, stan na ${rok} r.` : 'Liczba przy gminie to mieszkańcy (GUS).'}</span>
        <Zrodlo adres={ZRODLO_GUS} etykieta="GUS — Bank Danych Lokalnych" />
      </p>

      {/*
        Kolumny CSS, nie siatka: powiaty maja od 3 do 18 gmin, a w siatce
        wiersz jest tak wysoki jak najdluzsza lista w nim — zmierzone na
        mazowieckiem: pol ekranu pustki miedzy wierszami.
      */}
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {[...powiaty.entries()].map(([powiat, lista]) => (
          <section key={powiat} className="mb-7 break-inside-avoid">
            <h2 className="text-xs font-medium tracking-wider text-atrament-3 uppercase">{powiat}</h2>
            <ul className="mt-2 space-y-1.5">
              {lista.map((g) => (
                <li key={g.teryt} className="min-w-0">
                  <Link
                    href={`/gmina/${g.teryt}`}
                    className="group flex items-baseline gap-3 rounded-lg border border-kreska bg-papier-2 px-3 py-2 transition-colors hover:border-kreska-2"
                  >
                    <span className="min-w-0 flex-1 text-sm group-hover:text-akcent">{nazwaWlasna(g)}</span>
                    {/* Gmina bez pomiaru dostaje polpauze, nie zero. */}
                    <span className="liczby shrink-0 text-xs text-atrament-3">{g.osob ? liczba(g.osob) : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
