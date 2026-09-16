import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, podsumowanie, stronaGlosowan } from '@/lib/dane';
import { dataSlownie, liczba, skroc } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Głosowania',
  description: 'Wszystkie głosowania Sejmu X kadencji, od najnowszego.',
};

const NA_STRONE = 40;

export default async function StronaGlosowan({
  searchParams,
}: {
  searchParams: Promise<{ strona?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;

  const { strona } = await searchParams;
  const nr = Math.max(1, Number.parseInt(strona ?? '1', 10) || 1);
  const stan = podsumowanie();
  const stron = Math.max(1, Math.ceil(stan.glosowan / NA_STRONE));
  const biezaca = Math.min(nr, stron);
  const lista = stronaGlosowan((biezaca - 1) * NA_STRONE, NA_STRONE);

  return (
    <div className="obszar py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Głosowania</h1>
        <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/votings" etykieta="rejestr głosowań" />
      </div>
      <p className="mt-2 text-atrament-2">
        {liczba(stan.glosowan)} głosowań od {dataSlownie(stan.pierwszeGlosowanie)}, od najnowszego.
      </p>

      <ul className="mt-7 space-y-2">
        {lista.map((g) => (
          <li key={`${g.posiedzenie}-${g.numer}`}>
            <Link
              href={`/glosowanie/${g.posiedzenie}-${g.numer}`}
              className="group flex flex-col gap-4 rounded-2xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-atrament-3">
                  {dataSlownie(g.data)} · posiedzenie {g.posiedzenie}, nr {g.numer}
                </span>
                <span className="mt-1 block leading-snug font-medium group-hover:text-akcent">
                  {skroc(g.temat ?? g.tytul, 150)}
                </span>
              </span>
              <PaseczekGlosow
                za={g.za}
                przeciw={g.przeciw}
                wstrzymalo={g.wstrzymalo}
                nieobecnych={g.nieobecnych}
                className="w-full shrink-0 sm:w-64"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/*
        Stronicowanie zwyklymi odnosnikami, a nie doladowywaniem: adres strony
        nr 7 daje sie przeslac komus dalej i wroci na to samo miejsce.
      */}
      <nav className="mt-8 flex items-center justify-between gap-4 text-sm" aria-label="Stronicowanie">
        {biezaca > 1 ? (
          <Link
            href={`/glosowania?strona=${biezaca - 1}`}
            className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament"
          >
            ← nowsze
          </Link>
        ) : (
          <span />
        )}
        <span className="liczby text-atrament-2">
          strona {biezaca} z {stron}
        </span>
        {biezaca < stron ? (
          <Link
            href={`/glosowania?strona=${biezaca + 1}`}
            className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament"
          >
            starsze →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
