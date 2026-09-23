import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, wojewodztwaGmin } from '@/lib/dane';
import { liczba, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Zrodlo } from '@/components/Zrodlo';

const ZRODLO_GUS = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/zmienna/72305';

export const metadata: Metadata = {
  title: 'Gminy',
  description: 'Spis wszystkich gmin w Polsce: budżet, pieniądze z Unii i pomoc publiczna dla firm w każdej z nich.',
};

/**
 * Spis gmin. Powstal, bo pozycja „Gminy” w menu prowadzila do listy okregow
 * wyborczych — czyli do mechanizmu wyborow, a nie do tego, czego czytelnik
 * szuka. Dwa poziomy zamiast jednej sciany: 2 494 gminy w jednym wykazie
 * nie do przejrzenia.
 */
export default function StronaGmin() {
  if (!bazaDostepna()) return <BrakDanych />;
  const wojewodztwa = wojewodztwaGmin();
  const gminRazem = wojewodztwa.reduce((a, w) => a + w.gmin, 0);
  const rok = wojewodztwa.reduce<number | null>((a, w) => (w.rok && (!a || w.rok > a) ? w.rok : a), null);

  return (
    <div className="obszar py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">Gminy</h1>
      <p className="mt-2 max-w-2xl text-atrament-2">
        {`Budżet, pieniądze z Unii i pomoc publiczna dla firm — dla każdej z ${liczba(gminRazem)} gmin. Wpisz nazwę albo wybierz województwo.`}
      </p>

      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa Twojej gminy lub miasta" />
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-atrament-3">
        <span>{rok ? `Liczba mieszkańców: stan na ${rok} r.` : 'Liczba mieszkańców z GUS.'}</span>
        <Zrodlo adres={ZRODLO_GUS} etykieta="GUS — Bank Danych Lokalnych" />
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {wojewodztwa.map((w) => (
          <li key={w.wojewodztwo} className="min-w-0">
            <Link
              href={`/gminy/${adresWojewodztwa(w.wojewodztwo)}`}
              className="group block rounded-2xl border border-kreska bg-papier-2 p-5 transition-all hover:border-kreska-2 hover:shadow-karta"
            >
              <p className="font-medium group-hover:text-akcent">{`woj. ${w.wojewodztwo}`}</p>
              <p className="mt-1 text-sm text-atrament-2">{zOdmiana(w.gmin, 'gmina', 'gminy', 'gmin')}</p>
              {/* Ludnosc to suma z gmin, ktore ja maja — brak pomiaru nie moze wygladac jak zero. */}
              {w.osob ? <p className="mt-0.5 text-xs text-atrament-3">{`${liczba(w.osob)} mieszkańców`}</p> : null}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-atrament-2">
        <Link href="/mapa" className="text-akcent underline underline-offset-4 hover:no-underline">
          Zobacz to na mapie →
        </Link>
        <Link href="/okregi" className="text-akcent underline underline-offset-4 hover:no-underline">
          Okręgi wyborcze do Sejmu →
        </Link>
      </p>
    </div>
  );
}
