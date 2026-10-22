import type { Metadata } from 'next';
import { bazaDostepna, liczbaGlosowan, podsumowanie, stronaGlosowan, zrodloImportu } from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { PozycjaGlosowania } from '@/components/PozycjaGlosowania';
import { Okruszek, Podstawa, Stronicowanie, Wypis, Zakladki } from '@/components/Szablon';

/**
 * Lista dzielona na strony: kazda strona wskazuje SAMA SIEBIE jako kanoniczna
 * (zalecenie Google dla stronicowania) — a nie pierwsza, jak layout dla
 * pozostalych parametrow. Inaczej strony 2+ wypadlyby z indeksu.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ strona?: string; rodzaj?: string }>;
}): Promise<Metadata> {
  const { strona, rodzaj } = await searchParams;
  const nr = Number.parseInt(strona ?? '1', 10) || 1;
  const q = new URLSearchParams({
    ...(rodzaj === 'calosc' ? { rodzaj: 'calosc' } : {}),
    ...(nr > 1 ? { strona: String(nr) } : {}),
  }).toString();
  return {
    title: 'Głosowania',
    description: 'Wszystkie głosowania Sejmu X kadencji, od najnowszego.',
    alternates: { canonical: q ? `/glosowania?${q}` : '/glosowania' },
  };
}

const NA_STRONE = 40;

export default async function StronaGlosowan({
  searchParams,
}: {
  searchParams: Promise<{ strona?: string; rodzaj?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;

  const { strona, rodzaj } = await searchParams;
  const nadCaloscia = rodzaj === 'calosc';
  const stan = podsumowanie();
  const nadCalosciaIle = liczbaGlosowan({ nadCaloscia: true });
  const wszystkich = nadCaloscia ? nadCalosciaIle : stan.glosowan;
  const stron = Math.max(1, Math.ceil(wszystkich / NA_STRONE));
  const biezaca = Math.min(Math.max(1, Number.parseInt(strona ?? '1', 10) || 1), stron);
  const lista = stronaGlosowan((biezaca - 1) * NA_STRONE, NA_STRONE, { nadCaloscia });
  const importGlosowan = zrodloImportu('glosowania');

  // Adres zachowuje filtr — strona 7 "nad caloscia" ma sie dac komus wyslac.
  const adres = (nr: number) => {
    const q = new URLSearchParams({
      ...(nadCaloscia ? { rodzaj: 'calosc' } : {}),
      ...(nr > 1 ? { strona: String(nr) } : {}),
    }).toString();
    return q ? `/glosowania?${q}` : '/glosowania';
  };

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { nazwa: 'Głosowania' }]} />
      <Wypis
        tytul="Głosowania"
        podtytul={`${liczba(stan.glosowan)} głosowań od ${dataSlownie(stan.pierwszeGlosowanie)}, od najnowszego. Każde z imienną listą głosów i wymaganą większością.`}
      />
      <Zakladki
        etykieta="Rodzaj głosowań"
        pozycje={[
          { adres: '/glosowania', nazwa: 'wszystkie', ile: stan.glosowan, biezaca: !nadCaloscia },
          { adres: '/glosowania?rodzaj=calosc', nazwa: 'nad całością projektów', ile: nadCalosciaIle, biezaca: nadCaloscia },
        ]}
      />
      {nadCaloscia ? (
        <p className="wstep mt-3 text-atrament-2">
          Ostateczne głosowania nad projektami ustaw i uchwał — rozpoznane po tym, że rejestr
          nazywa je „głosowaniem nad całością”. Bez poprawek, wniosków i spraw porządkowych.
        </p>
      ) : null}

      <ul className="pozycje">
        {lista.map((g) => <PozycjaGlosowania key={`${g.posiedzenie}-${g.numer}`} g={g} />)}
      </ul>

      <Stronicowanie biezaca={biezaca} stron={stron} adres={adres} nowsze="← nowsze" starsze="starsze →" />
      <p className="stan-danych">
        <span>{importGlosowan ? `stan danych: rejestr głosowań ${dataKrotko(importGlosowan.kiedy)}` : 'stan danych: —'}</span>
        <span><Podstawa adres="https://api.sejm.gov.pl/sejm/term10/votings" nazwa="rejestr głosowań" /></span>
      </p>
    </div>
  );
}
