import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, gminaPelna, organyPomocy, TERYT_WARSZAWY, zrodloImportu } from '@/lib/dane';
import { adresWojewodztwa } from '@/lib/tekst';
import { zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Wypis } from '@/components/Szablon';
import { LegendaKategorii, ListaOrganow, OpisOrganow, OrganyBezNazwy } from '@/components/OrganyGminy';
import { WarunkiSudop } from '@/components/WarunkiSudop';

/*
 * Pelna lista organow, ktore przyznaly pomoc firmom z gminy (przeglad tresci
 * 24.10.2026). Na stronie gminy zostaje piec pierwszych: lista Krakowa
 * (786 organow) w ukrytym „Pokaz wszystkie” robila z niej 2 MB HTML-u,
 * ktore kazdy czytelnik pobieral, choc prawie nikt ich nie rozwijal.
 * Ta sama kolejnosc i ten sam zbior co na stronie gminy (organyPomocy).
 */
export async function generateStaticParams(): Promise<{ teryt: string }[]> {
  return [];
}

function nazwaWlasna(g: { nazwa: string; rodzaj: string }): string {
  if (g.rodzaj === 'dzielnica Warszawy') return `Warszawa, dzielnica ${g.nazwa}`;
  if (g.rodzaj === 'gmina') return `Gmina ${g.nazwa}`;
  return g.nazwa;
}

export async function generateMetadata({ params }: { params: Promise<{ teryt: string }> }): Promise<Metadata> {
  const { teryt } = await params;
  const g = /^\d{6}$/.test(teryt) && bazaDostepna() ? gminaPelna(teryt) : null;
  if (!g) return { title: 'Nie ma takiej gminy' };
  const nazwa = g.rodzaj === 'gmina' || g.rodzaj === 'miasto' ? `${nazwaWlasna(g)} (pow. ${g.powiat})` : nazwaWlasna(g);
  return {
    title: `Kto przyznał pomoc firmom — ${nazwa}`,
    description: `Organy, które przyznały pomoc publiczną firmom z siedzibą w gminie ${g.nazwa}: liczba decyzji i kwoty według rodzaju pomocy, z rejestru SUDOP (UOKiK).`,
  };
}

export default async function OrganyGminy({ params }: { params: Promise<{ teryt: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { teryt } = await params;
  if (!/^\d{6}$/.test(teryt)) notFound();
  const g = gminaPelna(teryt);
  if (!g) notFound();
  // Jak na stronie gminy: SUDOP trzyma Warszawe jako jedno miasto.
  const dzielnica = g.rodzaj === 'dzielnica Warszawy';
  const organy = organyPomocy(dzielnica ? TERYT_WARSZAWY : teryt);
  if (!organy.organy.length && !organy.bezNazwy) notFound();
  const imp = zrodloImportu('sudop-przyrost');

  return (
    <div className="obszar">
      <Okruszek
        ogniwa={[
          { nazwa: 'Pieniądze publiczne' },
          { adres: '/gminy', nazwa: 'Gminy', srodek: true },
          { adres: `/gminy/${adresWojewodztwa(g.wojewodztwo)}`, nazwa: `woj. ${g.wojewodztwo}`, srodek: true },
          { adres: `/gmina/${g.teryt}`, nazwa: nazwaWlasna(g) },
          { nazwa: 'Kto przyznał pomoc' },
        ]}
      />
      <Wypis
        tytul={`Kto przyznał pomoc firmom: ${nazwaWlasna(g)}`}
        podtytul={`${zOdmiana(organy.organy.length + organy.bezNazwy, 'organ', 'organy', 'organów')} · kolejność według liczby decyzji dla firm z tej gminy${dzielnica ? ' · rejestr nie dzieli firm na dzielnice, więc to cała Warszawa' : ''}`}
      >
        <p className="mt-1">
          <Link href={`/gmina/${g.teryt}#pomoc`} className="text-akcent underline underline-offset-4">
            ← pomoc publiczna na stronie gminy
          </Link>
        </p>
      </Wypis>
      <Dzial id="organy" tytul="Organy i ich decyzje">
        <OpisOrganow pelna={organy.pelna} />
        <LegendaKategorii organy={organy.organy} />
        <ListaOrganow organy={organy.organy} />
        <OrganyBezNazwy organy={organy} />
        <WarunkiSudop pobrano={imp?.kiedy ?? null} />
      </Dzial>
    </div>
  );
}
