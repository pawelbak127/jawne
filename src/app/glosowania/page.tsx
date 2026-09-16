import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, liczbaGlosowan, podsumowanie, stronaGlosowan } from '@/lib/dane';
import { dataSlownie, liczba } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { KartaGlosowania } from '@/components/KartaGlosowania';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Głosowania',
  description: 'Wszystkie głosowania Sejmu X kadencji, od najnowszego.',
};

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
  const wszystkich = nadCaloscia ? liczbaGlosowan({ nadCaloscia: true }) : stan.glosowan;
  const stron = Math.max(1, Math.ceil(wszystkich / NA_STRONE));
  const biezaca = Math.min(Math.max(1, Number.parseInt(strona ?? '1', 10) || 1), stron);
  const lista = stronaGlosowan((biezaca - 1) * NA_STRONE, NA_STRONE, { nadCaloscia });

  // Adres zachowuje filtr — strona 7 "nad caloscia" ma sie dac komus wyslac.
  const adres = (nr: number) => `/glosowania?${new URLSearchParams({
    ...(nadCaloscia ? { rodzaj: 'calosc' } : {}),
    ...(nr > 1 ? { strona: String(nr) } : {}),
  })}`;

  const zakladka = (aktywna: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      aktywna ? 'border-atrament bg-atrament text-papier' : 'border-kreska-2 text-atrament-2 hover:border-atrament-3'
    }`;

  return (
    <div className="obszar py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Głosowania</h1>
        <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/votings" etykieta="rejestr głosowań" />
      </div>
      <p className="mt-2 text-atrament-2">
        {`${liczba(stan.glosowan)} głosowań od ${dataSlownie(stan.pierwszeGlosowanie)}, od najnowszego.`}
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Rodzaj głosowań">
        <Link href="/glosowania" className={zakladka(!nadCaloscia)}>
          {`wszystkie · ${liczba(stan.glosowan)}`}
        </Link>
        <Link href="/glosowania?rodzaj=calosc" className={zakladka(nadCaloscia)}>
          {`nad całością projektów · ${liczba(liczbaGlosowan({ nadCaloscia: true }))}`}
        </Link>
      </nav>
      {nadCaloscia ? (
        <p className="mt-3 max-w-2xl text-sm text-atrament-2">
          Ostateczne głosowania nad projektami ustaw i uchwał — rozpoznane po tym, że rejestr
          nazywa je „głosowaniem nad całością”. Bez poprawek, wniosków i spraw porządkowych.
        </p>
      ) : null}

      <ul className="mt-6 space-y-2">
        {lista.map((g) => (
          <li key={`${g.posiedzenie}-${g.numer}`}>
            <KartaGlosowania g={g} uklad="wiersz" />
          </li>
        ))}
      </ul>

      {/*
        Stronicowanie zwyklymi odnosnikami, a nie doladowywaniem: adres strony
        nr 7 daje sie przeslac komus dalej i wroci na to samo miejsce.
      */}
      <nav className="mt-8 flex items-center justify-between gap-4 text-sm" aria-label="Stronicowanie">
        {biezaca > 1 ? (
          <Link href={adres(biezaca - 1)} className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament">
            ← nowsze
          </Link>
        ) : (
          <span />
        )}
        <span className="liczby text-atrament-2">{`strona ${biezaca} z ${stron}`}</span>
        {biezaca < stron ? (
          <Link href={adres(biezaca + 1)} className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament">
            starsze →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
