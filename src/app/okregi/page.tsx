import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, okregi } from '@/lib/dane';
import { zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Okręgi wyborcze',
  description: 'Wszystkie okręgi wyborcze do Sejmu: gminy każdego okręgu i liczba wybieranych w nim posłów.',
};

export default function StronaOkregow() {
  if (!bazaDostepna()) return <BrakDanych />;
  const lista = okregi();

  if (lista.length === 0) {
    return (
      <div className="obszar py-16">
        <h1 className="szryft text-3xl font-semibold">Okręgi wyborcze</h1>
        <p className="mt-3 text-atrament-2">
          Okręgi nie zostały jeszcze zaimportowane. Etap nie wymaga sieci:
        </p>
        <pre className="mt-3 inline-block rounded-xl bg-papier-3 px-4 py-2 text-sm">npm run import okregi</pre>
      </div>
    );
  }

  const wojewodztwa = new Map<string, typeof lista>();
  for (const o of lista) {
    const w = wojewodztwa.get(o.wojewodztwo) ?? [];
    w.push(o);
    wojewodztwa.set(o.wojewodztwo, w);
  }
  const posortowane = [...wojewodztwa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pl'));

  return (
    <div className="obszar py-10">
      {/*
        Spis gmin ma własną trasę (/gminy). Tutaj zostają okręgi wyborcze —
        to co innego: jeden okręg obejmuje wiele gmin i służy do wybierania
        posłów, a nie do oglądania pieniędzy gminy.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Okręgi wyborcze</h1>
        <Zrodlo adres="https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach" etykieta="PKW — wybory 2023" />
      </div>
      <p className="mt-2 max-w-2xl text-atrament-2">
        {`Posłów wybiera się w ${zOdmiana(lista.length, 'okręgu', 'okręgach', 'okręgach')}. Każdy okręg ma listę swoich gmin. Szukasz konkretnej gminy? Wpisz jej nazwę albo zajrzyj do spisu gmin.`}
      </p>
      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa Twojej gminy lub miasta" />
      </div>
      <p className="mt-3 text-sm text-atrament-2">
        <Link href="/gminy" className="text-akcent underline underline-offset-4 hover:no-underline">
          Spis wszystkich gmin →
        </Link>
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posortowane.map(([woj, okr]) => (
          <section key={woj}>
            <h2 className="text-xs font-medium tracking-wider text-atrament-3 uppercase">{`woj. ${woj}`}</h2>
            <ul className="mt-2 space-y-1.5">
              {okr.map((o) => (
                <li key={o.nr}>
                  <Link
                    href={`/okreg/${o.nr}`}
                    className="group flex items-baseline gap-3 rounded-lg border border-kreska bg-papier-2 px-3 py-2 transition-colors hover:border-kreska-2"
                  >
                    <span className="liczby w-6 shrink-0 text-right text-sm text-atrament-3">{o.nr}</span>
                    <span className="flex-1 font-medium group-hover:text-akcent">{o.nazwa ?? `Okręg nr ${o.nr}`}</span>
                    <span className="text-xs text-atrament-3">{zOdmiana(o.poslow, 'poseł', 'posłów', 'posłów')}</span>
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
