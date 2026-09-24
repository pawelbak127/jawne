import type { Metadata } from 'next';
import Link from 'next/link';
import { BrakDanych } from '@/components/BrakDanych';
import { PlanSali } from '@/components/PlanSali';
import { Zrodlo } from '@/components/Zrodlo';
import { bazaDostepna, listaPoslow } from '@/lib/dane';
import { dataSlownie } from '@/lib/format';
import { polaczPlan } from '@/lib/sala';
import { MIEJSCA, PLAN_SZEROKOSC, PLAN_WYSOKOSC, STAN_PLANU, ZRODLO_PLANU } from '@/lib/plan-sali';

export const metadata: Metadata = {
  title: 'Sala posiedzeń — kto gdzie siedzi',
  description:
    'Plan sali posiedzeń Sejmu: miejsce każdego posła, tak jak rysuje je Kancelaria Sejmu. Najedź na miejsce, żeby zobaczyć, kto na nim siedzi.',
};

export default function StronaSali() {
  if (!bazaDostepna()) return <BrakDanych />;

  const { miejsca, bezPosla } = polaczPlan(MIEJSCA, listaPoslow());
  const zNumerem = miejsca.filter((m) => m.numer !== null).length;

  return (
    <div className="obszar py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Sala posiedzeń</h1>
        <Zrodlo adres={ZRODLO_PLANU} etykieta="plan sali, Kancelaria Sejmu" />
      </div>
      <p className="mt-2 max-w-2xl text-atrament-2">
        Każda kropka to jedno miejsce w sali posiedzeń — w tym punkcie, w którym rysuje
        je Kancelaria Sejmu. Najedź, żeby zobaczyć, kto na nim siedzi; kliknięcie prowadzi
        na stronę posła.
      </p>

      <div className="mt-6">
        <PlanSali
          miejsca={miejsca}
          szerokosc={PLAN_SZEROKOSC}
          wysokosc={PLAN_WYSOKOSC}
          stan={dataSlownie(STAN_PLANU)}
        />
      </div>

      <div className="mt-8 grid gap-4 text-sm text-atrament-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5">
          <p className="font-medium text-atrament">Skąd to wiemy</p>
          <p className="mt-2 leading-relaxed">
            API Sejmu nie podaje, kto gdzie siedzi. Jedynym źródłem jest rysunek sali
            wydawany przez Kancelarię Sejmu — ten, z którego korzysta prezydium w czasie
            obrad. Tutejszy plan pochodzi z rysunku ze stanem na{' '}
            <span className="liczby">{dataSlownie(STAN_PLANU)}</span>. Miejsca zmieniają się
            w trakcie kadencji, a my nie odświeżamy ich automatycznie: rysunek jest wydawany
            pod nowym adresem za każdym razem.
          </p>
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5">
          <p className="font-medium text-atrament">Czego tu nie ma</p>
          <p className="mt-2 leading-relaxed">
            Numer miejsca podajemy przy{' '}
            <span className="liczby">
              {zNumerem} z {miejsca.length}
            </span>{' '}
            posłów. Przy pozostałych numer na rysunku daje się przypisać do dwóch nazwisk
            naraz — wolimy nie podać go wcale, niż postawić przy kimś cudzy. Ław rządowych,
            lóż i miejsc dla gości nie pokazujemy: rysunek nie podpisuje ich nazwiskami.
            {bezPosla > 0
              ? ` ${bezPosla} ${bezPosla === 1 ? 'miejsce należy' : 'miejsca należą'} do posłów, których nie ma już w rejestrze — plan jest starszy niż skład izby.`
              : ''}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-atrament-3">
        Szukasz kogoś po nazwisku albo chcesz porównać kluby?{' '}
        <Link href="/poslowie" className="text-akcent underline underline-offset-4">
          Pełna lista posłów
        </Link>{' '}
        ma filtry i wyszukiwanie.
      </p>
    </div>
  );
}
