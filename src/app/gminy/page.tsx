import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, wojewodztwaGmin } from '@/lib/dane';
import { liczba, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { BrakDanych } from '@/components/BrakDanych';
import { Szukajka } from '@/components/Szukajka';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

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
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Gminy' }]} />
      <Wypis
        tytul="Gminy"
        podtytul={`Budżet, pieniądze z Unii, pomoc publiczna dla firm i zamówienia — dla każdej z ${liczba(gminRazem)} gmin, zawsze na mieszkańca. Wpisz nazwę albo wybierz województwo.`}
      />

      <div className="mt-5 max-w-xl">
        <Szukajka etykieta="Nazwa Twojej gminy lub miasta" />
      </div>

      <h2 className="szryft mt-8 text-[1.3rem] font-semibold">Województwa</h2>
      <ul className="pozycje sm:grid sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
        {wojewodztwa.map((w) => (
          <li key={w.wojewodztwo}>
            <div className="min-w-0">
              <Link href={`/gminy/${adresWojewodztwa(w.wojewodztwo)}`} className="tytul-poz">{`woj. ${w.wojewodztwo}`}</Link>
              <p className="meta">
                {zOdmiana(w.gmin, 'gmina', 'gminy', 'gmin')}
                {/* Ludnosc to suma z gmin, ktore ja maja — brak pomiaru nie moze wygladac jak zero. */}
                {w.osob ? ` · ${liczba(w.osob)} mieszkańców` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="pliki">
        <Link href="/mapa">Zobacz to na mapie →</Link>
        <Link href="/okregi">Okręgi wyborcze do Sejmu →</Link>
      </p>
      <p className="stan-danych">
        <span>{rok ? `liczba mieszkańców: stan na ${rok} r.` : 'liczba mieszkańców z GUS'}</span>
        <span><Podstawa adres={ZRODLO_GUS} nazwa="GUS — Bank Danych Lokalnych" /></span>
      </p>
    </div>
  );
}
