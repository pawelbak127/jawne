import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, okregi } from '@/lib/dane';
import { zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

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
    <div className="obszar">
      {/*
        Spis gmin ma własną trasę (/gminy). Tutaj zostają okręgi wyborcze —
        to co innego: jeden okręg obejmuje wiele gmin i służy do wybierania
        posłów, a nie do oglądania pieniędzy gminy.
      */}
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { nazwa: 'Okręgi wyborcze' }]} />
      <Wypis
        tytul="Okręgi wyborcze"
        podtytul={`Posłów wybiera się w ${zOdmiana(lista.length, 'okręgu', 'okręgach', 'okręgach')}. Każdy okręg ma listę swoich gmin. Szukasz konkretnej gminy? Wpisz jej nazwę albo zajrzyj do spisu gmin.`}
      />
      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa Twojej gminy lub miasta" />
      </div>
      <p className="pliki">
        <Link href="/gminy">Spis wszystkich gmin →</Link>
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posortowane.map(([woj, okr]) => (
          <section key={woj}>
            <h2 className="border-b-2 border-atrament pb-1 font-semibold">{`woj. ${woj}`}</h2>
            <ul>
              {okr.map((o) => (
                <li key={o.nr} className="border-b border-kreska">
                  <Link href={`/okreg/${o.nr}`} className="group flex min-h-11 items-baseline gap-3 py-2">
                    <span className="znak w-7 shrink-0 text-right text-atrament-2">{o.nr}</span>
                    <span className="flex-1 text-akcent underline decoration-kreska-2 underline-offset-4 group-hover:decoration-current">{o.nazwa ?? `Okręg nr ${o.nr}`}</span>
                    <span className="text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>{zOdmiana(o.poslow, 'poseł', 'posłów', 'posłów')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="stan-danych">
        <span>okręgi i ich gminy: PKW, wybory do Sejmu 2023</span>
        <span><Podstawa adres="https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach" nazwa="PKW — wybory 2023" /></span>
      </p>
    </div>
  );
}
