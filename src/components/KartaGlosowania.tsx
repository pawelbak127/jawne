import Link from 'next/link';
import type { GlosowanieSkrot } from '@/lib/dane';
import { dataSlownie, skroc } from '@/lib/format';
import { opisGlosowania } from '@/lib/opis-glosowania';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';

/**
 * Glosowanie na liscie. Jedna definicja zamiast pieciu kopii — kazda kopia
 * pokazywala sam temat, ktory przy 3966 glosowaniach brzmi np.
 * "głosowanie nad przyjęciem wniosku z druku." i nic nie mowi.
 */
export function KartaGlosowania({
  g,
  uklad = 'kafel',
  dodatek,
}: {
  g: GlosowanieSkrot;
  /** `kafel` — do siatki; `wiersz` — do listy, z paskiem po prawej. */
  uklad?: 'kafel' | 'wiersz';
  /** Np. glos posla przy liscie na jego profilu. */
  dodatek?: React.ReactNode;
}) {
  const o = opisGlosowania(g);
  const metka = [
    dataSlownie(g.data),
    `posiedzenie ${g.posiedzenie}`,
    o.punkt ? `pkt ${o.punkt}` : null,
  ].filter(Boolean).join(' · ');

  const tresc = (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-atrament-3">
        <span>{metka}</span>
        {o.nadCaloscia ? (
          <span className="rounded-md bg-akcent-slaby px-1.5 py-0.5 font-medium text-akcent">nad całością projektu</span>
        ) : null}
        {o.porzadkowe ? (
          <span className="rounded-md bg-papier-3 px-1.5 py-0.5">sprawa porządkowa</span>
        ) : null}
      </span>
      <span className="mt-1.5 block leading-snug font-medium group-hover:text-akcent">
        {skroc(o.sprawa, uklad === 'kafel' ? 130 : 170)}
      </span>
      {o.przedmiot && !o.nadCaloscia ? (
        <span className="mt-0.5 block text-sm text-atrament-2">{skroc(o.przedmiot, 110)}</span>
      ) : null}
    </>
  );

  if (uklad === 'wiersz') {
    return (
      <Link
        href={`/glosowanie/${g.posiedzenie}-${g.numer}`}
        className="group flex flex-col gap-3 rounded-2xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta sm:flex-row sm:items-center"
      >
        <span className="min-w-0 flex-1">{tresc}</span>
        {dodatek ?? <PaseczekGlosow g={g} className="w-full shrink-0 sm:w-64" />}
      </Link>
    );
  }

  return (
    <Link
      href={`/glosowanie/${g.posiedzenie}-${g.numer}`}
      className="group flex h-full flex-col rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta transition-all hover:border-kreska-2 hover:shadow-karta-2"
    >
      <span className="block flex-1">{tresc}</span>
      {dodatek ?? <PaseczekGlosow g={g} className="mt-4" />}
    </Link>
  );
}
