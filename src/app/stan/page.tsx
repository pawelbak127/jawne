import type { Metadata } from 'next';
import { bazaDostepna, podsumowanie, stanImportu } from '@/lib/dane';
import { dataSlownie, liczba } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Stan danych',
  description: 'Co i kiedy zostało zaimportowane z rejestrów Sejmu.',
};

const OPISY: Record<string, string> = {
  kluby: 'Kluby i koła poselskie',
  poslowie: 'Posłowie',
  glosowania: 'Głosowania (liczby zbiorcze)',
  glosy: 'Głosy imienne',
  'kluby-spoza-listy': 'Kluby wskazane przez posłów, których nie ma w rejestrze klubów',
  zdjecia: 'Zdjęcia posłów',
  okregi: 'Okręgi wyborcze i gminy (PKW, wybory 2023)',
  'glosy-klubow': 'Sumy głosów klubów w każdym głosowaniu',
  'szukaj-glosowania': 'Indeks wyszukiwania głosowań',
};

export default function StronaStanu() {
  if (!bazaDostepna()) return <BrakDanych />;

  const stan = podsumowanie();
  const wpisy = stanImportu();
  const brakujaceGlosy = stan.glosowan - stan.glosowanZGlosami;

  return (
    <div className="obszar max-w-3xl py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">Stan danych</h1>
      <p className="mt-3 text-atrament-2">
        Ta strona istnieje po to, żeby dało się sprawdzić, czego jeszcze nie mamy.
        Serwis, który pokazuje tylko to, co mu wyszło, jest trudniejszy do
        zweryfikowania niż taki, który mówi wprost, gdzie ma dziury.
      </p>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-kreska text-left text-atrament-2">
            <th className="py-2 font-medium">Zbiór</th>
            <th className="py-2 text-right font-medium">Rekordów</th>
            <th className="py-2 text-right font-medium">Zaimportowano</th>
          </tr>
        </thead>
        <tbody>
          {wpisy.map((w) => (
            <tr key={w.co} className="border-b border-kreska align-top">
              <td className="py-3 pr-3">
                <span className="font-medium">{OPISY[w.co] ?? w.co}</span>
                {w.uwagi ? <span className="mt-0.5 block text-xs text-atrament-3">{w.uwagi}</span> : null}
              </td>
              <td className="liczby py-3 text-right">{w.ile === null ? '—' : liczba(w.ile)}</td>
              <td className="py-3 text-right text-atrament-2">{dataSlownie(w.kiedy)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 rounded-2xl border border-kreska bg-papier-2 p-5">
        <h2 className="font-medium">Głosy imienne</h2>
        <p className="mt-2 text-sm text-atrament-2">
          Mamy {liczba(stan.glosow)} głosów imiennych z {liczba(stan.glosowanZGlosami)} głosowań.
          {brakujaceGlosy > 0
            ? ` Dla ${liczba(brakujaceGlosy)} głosowań mamy na razie tylko liczby zbiorcze z nagłówka rejestru — na stronie takiego głosowania jest to napisane wprost.`
            : ' To wszystkie głosowania kadencji.'}
        </p>
      </div>

      <div className="mt-8 text-sm">
        <h2 className="font-medium">Skąd to pochodzi</h2>
        <ul className="mt-3 space-y-2 text-atrament-2">
          <li className="flex flex-wrap items-center gap-2">
            Posłowie, kluby, głosowania, głosy imienne i zdjęcia:
            <Zrodlo adres="https://api.sejm.gov.pl/sejm/openapi/" etykieta="API Sejmu RP" />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            Przypisanie gmin do okręgów wyborczych:
            <Zrodlo
              adres="https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach"
              etykieta="PKW — wyniki wyborów do Sejmu 2023 po gminach"
            />
          </li>
        </ul>
        <p className="mt-4 text-xs text-atrament-3">
          Dane pobieramy w całości i przechowujemy lokalnie, żeby serwis działał,
          gdy rejestr nie odpowiada. Przy budowie tego importu API Sejmu oddawało
          kolejno przekroczenie czasu, błąd 503 i błąd 404 na poprawny adres —
          dlatego nie odpytujemy go przy każdym wejściu na stronę.
        </p>
      </div>
    </div>
  );
}
