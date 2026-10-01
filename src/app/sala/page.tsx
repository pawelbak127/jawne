import type { Metadata } from 'next';
import Link from 'next/link';
import { BrakDanych } from '@/components/BrakDanych';
import { PlanSali } from '@/components/PlanSali';
import { Zrodlo } from '@/components/Zrodlo';
import {
  bazaDostepna, glosowanie, glosyWGlosowaniu, listaPoslow, maGlosyImienne, ostatnieGlosowania,
} from '@/lib/dane';
import { dataSlownie, skroc } from '@/lib/format';
import { rozbijAdresGlosowania } from '@/lib/glosy';
import { opisJednaLinia } from '@/lib/opis-glosowania';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { polaczPlan } from '@/lib/sala';
import { MIEJSCA, PLAN_SZEROKOSC, PLAN_WYSOKOSC, STAN_PLANU, ZRODLO_PLANU } from '@/lib/plan-sali';

export const metadata: Metadata = {
  title: 'Sala posiedzeń — kto gdzie siedzi',
  description:
    'Plan sali posiedzeń Sejmu: miejsce każdego posła, tak jak rysuje je Kancelaria Sejmu. Najedź na miejsce, żeby zobaczyć, kto na nim siedzi.',
};

export default async function StronaSali({
  searchParams,
}: {
  searchParams: Promise<{ glosowanie?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { glosowanie: zadane } = await searchParams;

  const { miejsca: bezGlosow, bezPosla } = polaczPlan(MIEJSCA, listaPoslow());
  const zNumerem = bezGlosow.filter((m) => m.numer !== null).length;

  /*
   * Pokaz glosowania na planie. Plan jest ze stanu na jeden dzien, a glosy
   * siegaja poczatku kadencji — te dwie rzeczy nie musza do siebie pasowac
   * i strona mowi o tym wprost, zamiast pokazywac rozjazd jako nieobecnosc.
   */
  const adres = zadane ? rozbijAdresGlosowania(zadane) : null;
  const pokazywane = adres ? glosowanie(adres.posiedzenie, adres.numer) : null;
  const glosy = pokazywane ? glosyWGlosowaniu(pokazywane.posiedzenie, pokazywane.numer) : [];
  const glosWgPosla = new Map(glosy.map((g) => [g.posel_id, g.glos]));
  // Glosowanie BEZ glosow imiennych pomalowaloby cala sale na szaro —
  // wygladaloby to na 460 nieobecnych. Rejestr publikuje je z opoznieniem
  // (zmierzone 30.09.2026: najnowsze glosowanie nad caloscia, 65-13, mialo
  // juz liczby zbiorcze i zero glosow imiennych).
  const bezImiennych = pokazywane !== null && glosy.length === 0;
  const miejsca = pokazywane && !bezImiennych
    ? bezGlosow.map((m) => ({ ...m, glos: glosWgPosla.get(m.id) ?? null }))
    : bezGlosow;
  const zGlosem = pokazywane ? miejsca.filter((m) => m.glos !== null).length : 0;
  // Poslowie, ktorzy w tym glosowaniu glosowali, a na planie miejsca nie maja:
  // mandat wygasl albo rysunek jest z innego dnia. Mianownik dla „widac na planie".
  const naliscieId = new Set(bezGlosow.map((m) => m.id));
  const glosyBezMiejsca = glosy.filter((g) => !naliscieId.has(g.posel_id)).length;
  // Do wyboru tylko te, ktore maja glosy imienne — lista, ktora oferuje
  // glosowanie do niczego, jest gorsza niz krotsza lista.
  const doWyboru = ostatnieGlosowania(24, { nadCaloscia: true })
    .filter((g) => maGlosyImienne(g.posiedzenie, g.numer))
    .slice(0, 12);

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

      {doWyboru.length > 0 ? (
        <form method="get" action="/sala" className="mt-6 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="glosowanie" className="block text-sm text-atrament-2">
              Pokaż na planie głosowanie
            </label>
            <select
              id="glosowanie"
              name="glosowanie"
              defaultValue={pokazywane ? `${pokazywane.posiedzenie}-${pokazywane.numer}` : ''}
              className="mt-1 w-full max-w-lg rounded-xl border border-kreska bg-papier px-3 py-2 text-sm"
            >
              <option value="">bez głosowania — barwy klubów</option>
              {doWyboru.map((g) => (
                <option key={`${g.posiedzenie}-${g.numer}`} value={`${g.posiedzenie}-${g.numer}`}>
                  {`${dataSlownie(g.data)} · ${skroc(opisJednaLinia(g), 80)}`}
                </option>
              ))}
            </select>
          </div>
          {/* Zwykly formularz GET: dziala takze bez JavaScriptu, a wybrane
              glosowanie zostaje w adresie i da sie go komus wyslac. */}
          <button
            type="submit"
            className="rounded-xl bg-atrament px-4 py-3 text-sm font-medium text-papier transition-opacity hover:opacity-90"
          >
            Pokaż
          </button>
        </form>
      ) : null}

      {zadane && !pokazywane ? (
        <p className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-4 text-sm text-atrament-2">
          Nie mamy głosowania o takim adresie. Plan pokazuje barwy klubów.
        </p>
      ) : null}

      {bezImiennych ? (
        <p className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-4 text-sm text-atrament-2">
          {`Rejestr podaje liczby tego głosowania (${dataSlownie(pokazywane!.data)}), ale nie ma
          jeszcze głosów imiennych — nie wiemy, kto jak zagłosował, więc plan pokazuje barwy
          klubów. `}
          <Link
            href={`/glosowanie/${pokazywane!.posiedzenie}-${pokazywane!.numer}`}
            className="text-akcent underline underline-offset-4"
          >
            Strona głosowania
          </Link>
          {' ma to, co rejestr podał.'}
        </p>
      ) : null}

      {pokazywane && !bezImiennych ? (
        <div className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-5">
          <p className="liczby text-sm text-atrament-2">{dataSlownie(pokazywane.data)}</p>
          <p className="mt-1 font-medium">
            <Link
              href={`/glosowanie/${pokazywane.posiedzenie}-${pokazywane.numer}`}
              className="hover:text-akcent"
            >
              {opisJednaLinia(pokazywane)} →
            </Link>
          </p>
          {/* Liczby rejestru, nie nasze: pasek jest miara kontrolna dla planu. */}
          <PaseczekGlosow g={pokazywane} zOpisem className="mt-4" />
          <p className="mt-4 text-sm leading-relaxed text-atrament-3">
            {`Plan jest ze stanu na ${dataSlownie(STAN_PLANU)}, a to głosowanie odbyło się `}
            <span className="liczby">{dataSlownie(pokazywane.data)}</span>
            {'. Miejsca nie są tego dnia takie same, więc nie każdy głos ma na planie swoją kropkę: '}
            <span className="liczby">{`z ${glosy.length} głosów rejestru widać tu ${zGlosem}`}</span>
            {glosyBezMiejsca > 0
              ? `, a ${glosyBezMiejsca} oddali posłowie, których na tym rysunku nie ma.`
              : '.'}
            {miejsca.length - zGlosem > 0
              ? ` ${miejsca.length - zGlosem} miejsc należy do posłów, których w tym głosowaniu nie ma — te kropki są szare i nie znaczą nieobecności.`
              : ''}
          </p>
        </div>
      ) : null}

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
