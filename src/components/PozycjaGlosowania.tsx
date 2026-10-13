import Link from 'next/link';
import type { GlosowanieSkrot } from '@/lib/dane';
import { opisGlosowania } from '@/lib/opis-glosowania';
import { wynikGlosowania } from '@/lib/wynik-glosowania';
import { dataSlownie, liczba, skroc } from '@/lib/format';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';

/**
 * Glosowanie jako pozycja listy szablonu (`ul.pozycje`): kiedy, czego dotyczy,
 * pasek glosow i — gdy rejestr ja podaje — wymagana wiekszosc. Bez tej linii
 * „232 za, 200 przeciw” przy wecie czyta sie jak przyjecie (12 takich
 * glosowan w kadencji, src/lib/wynik-glosowania.ts).
 */
export function PozycjaGlosowania({ g }: { g: GlosowanieSkrot }) {
  const o = opisGlosowania(g);
  const w = wynikGlosowania(g);
  const rodzaj = o.nadCaloscia ? 'nad całością projektu' : o.porzadkowe ? 'sprawa porządkowa' : o.przedmiot;
  return (
    <li>
      <div className="min-w-0">
        <p className="meta">{[dataSlownie(g.data), `posiedzenie ${g.posiedzenie}`, o.punkt ? `pkt ${o.punkt}` : null].filter(Boolean).join(' · ')}</p>
        {rodzaj ? <p className="meta"><b className="text-atrament">{skroc(rodzaj, 110)}</b></p> : null}
        <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="tytul-poz">{skroc(o.sprawa, 170)}</Link>
        <PaseczekGlosow g={g} className="mt-2 max-w-xl" zOpisem />
        {w ? (
          <p className="meta mt-1">
            {`${w.nazwa}: wymagane ${liczba(w.wymagane)} „za” — `}
            <b className="text-atrament">{w.osiagnieta ? 'osiągnięta' : 'nieosiągnięta'}</b>
          </p>
        ) : null}
      </div>
    </li>
  );
}
