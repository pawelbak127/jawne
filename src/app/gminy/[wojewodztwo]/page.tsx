import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, gminyWojewodztwa, wojewodztwaGmin, type GminaSpisu } from '@/lib/dane';
import { liczba, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ wojewodztwo: string }[]> {
  return [];
}

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
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { adres: '/gminy', nazwa: 'Gminy' }, { nazwa: `woj. ${nazwa}` }]} />
      <Wypis
        tytul={`woj. ${nazwa}`}
        podtytul={`${zOdmiana(gminy.length, 'gmina', 'gminy', 'gmin')} w ${zOdmiana(powiaty.size, 'powiecie', 'powiatach', 'powiatach')}. Liczba przy gminie to mieszkańcy${rok ? `, stan na ${rok} r.` : ' (GUS)'}.`}
      />

      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa gminy lub miasta" />
      </div>

      {/* Sama liczba przy nazwie nie mowi, co znaczy — dlatego zdanie w podtytule i zrodlo tutaj. */}
      <p className="mt-2"><Podstawa adres={ZRODLO_GUS} nazwa="ludność: GUS — Bank Danych Lokalnych" data={rok ? String(rok) : null} /></p>

      {/*
        Kolumny CSS, nie siatka: powiaty maja od 3 do 18 gmin, a w siatce
        wiersz jest tak wysoki jak najdluzsza lista w nim — zmierzone na
        mazowieckiem: pol ekranu pustki miedzy wierszami.
      */}
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {[...powiaty.entries()].map(([powiat, lista]) => (
          <section key={powiat} className="mb-7 break-inside-avoid">
            <h2 className="border-b-2 border-atrament pb-1 font-semibold">{powiat}</h2>
            {/* Warszawy nie ma w tabeli gmin — sa dzielnice. Odnosnik do calego
                miasta stoi na czele ich listy, bo wiekszosc ludzi szuka
                „Warszawy", a nie „Bemowa". */}
            {powiat === 'Warszawa' ? (
              <p className="mt-2">
                <Link href="/gmina/146501" className="flex min-h-11 items-center font-semibold text-akcent underline underline-offset-4">
                  Warszawa — całe miasto →
                </Link>
              </p>
            ) : null}
            <ul>
              {lista.map((g) => (
                <li key={g.teryt} className="min-w-0 border-b border-kreska">
                  <Link href={`/gmina/${g.teryt}`} className="group flex min-h-11 items-baseline gap-3 py-2">
                    <span className="min-w-0 flex-1 text-akcent underline decoration-kreska-2 underline-offset-4 group-hover:decoration-current">{nazwaWlasna(g)}</span>
                    {/* Gmina bez pomiaru dostaje polpauze, nie zero. */}
                    <span className="znak shrink-0 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>{g.osob ? liczba(g.osob) : '—'}</span>
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
