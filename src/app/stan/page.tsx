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
  'cechy-glosowan': 'Cechy głosowań (nad całością projektu, sprawy porządkowe)',
  'porownania-poslow': 'Porównanie głosów posłów z resztą klubu',
  ludnosc: 'Ludność gmin (GUS, Bank Danych Lokalnych)',
  budzety: 'Budżety gmin — dochody, dochody własne, wydatki (GUS, Bank Danych Lokalnych)',
  'fundusze-2021-2027': 'Projekty z Funduszy Europejskich 2021–2027',
  'fundusze-2014-2020': 'Projekty z Funduszy Europejskich 2014–2020',
  sudop: 'Pomoc publiczna (SUDOP, UOKiK) — pełne dane wybranych gmin',
  'sudop-przyrost': 'Pomoc publiczna (SUDOP) — dni pobrane dla całego kraju',
  'budzety-dzialy': 'Wydatki gmin według działów budżetu (GUS, Bank Danych Lokalnych)',
  smup: 'Wskaźniki finansowe gmin (SMUP, GUS)',
  procesy: 'Procesy legislacyjne — droga ustaw przez Sejm',
  zamowienia: 'Zamówienia publiczne (TED — dziennik zamówień UE)',
  regon: 'Rejestr REGON — kim jest podmiot o danym NIP-ie (GUS)',
  'szukaj-firmy': 'Indeks wyszukiwania firm',
};

/**
 * Klucz bez opisu to sygnal, ze doszedl nowy etap importu, a nikt nie
 * powiedzial czytelnikowi, co to jest. Pokazujemy wtedy klucz i mowimy
 * wprost, ze opisu brakuje — zamiast udawac, ze „budzety-dzialy" to nazwa.
 */
function opisZbioru(co: string): { tytul: string; bezOpisu: boolean } {
  const z = OPISY[co];
  return z ? { tytul: z, bezOpisu: false } : { tytul: co, bezOpisu: true };
}

export default function StronaStanu() {
  if (!bazaDostepna()) return <BrakDanych />;

  const stan = podsumowanie();
  const wpisy = stanImportu();
  const brakujaceGlosy = stan.glosowan - stan.glosowanZGlosami;

  return (
    <div className="obszar max-w-5xl py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">Stan danych</h1>
      <p className="mt-3 text-atrament-2">
        Ta strona istnieje po to, żeby dało się sprawdzić, czego jeszcze nie mamy.
        Serwis, który pokazuje tylko to, co mu wyszło, jest trudniejszy do
        zweryfikowania niż taki, który mówi wprost, gdzie ma dziury.
      </p>

      {/*
        Bez tabeli. ZGLOSZENIE PAWLA 24.09.2026: tabela miala wlasny poziomy
        suwak („do uwalenia”) — na telefonie nie dalo sie jej czytac, a na
        szerokim ekranie i tak siedziala w waskiej kolumnie. Lista kart czyta
        sie tak samo w kazdej szerokosci i nigdzie nie trzeba przewijac w bok.
      */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {wpisy.map((w) => (
          <li key={w.co} className="min-w-0 rounded-2xl border border-kreska bg-papier-2 p-4">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 font-medium">
                {opisZbioru(w.co).tytul}
                {opisZbioru(w.co).bezOpisu ? (
                  <span className="ml-2 text-xs font-normal text-atrament-3">(zbiór bez opisu)</span>
                ) : null}
              </span>
              <span className="liczby shrink-0 text-lg font-semibold">{w.ile === null ? '—' : liczba(w.ile)}</span>
            </div>
            <p className="mt-1 text-xs text-atrament-3">{`zaimportowano ${dataSlownie(w.kiedy)}`}</p>
            {/* Uwagi bywaja jednym dlugim adresem z suma SHA — bez break-all
                rozpychaja karte i cala strone (zmierzone: 613 px z 390). */}
            {w.uwagi ? <p className="mt-2 text-xs leading-relaxed break-all text-atrament-3">{w.uwagi}</p> : null}
          </li>
        ))}
      </ul>

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
            Ludność i budżety gmin:
            <Zrodlo adres="https://bdl.stat.gov.pl" etykieta="GUS — Bank Danych Lokalnych" />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            Projekty z Funduszy Europejskich:
            <Zrodlo adres="https://dane.gov.pl/pl/dataset/13939" etykieta="MFiPR — lista 2021–2027" />
            <Zrodlo adres="https://dane.gov.pl/pl/dataset/1176" etykieta="MFiPR — lista 2014–2020" />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            Pomoc publiczna dla przedsiębiorców:
            <Zrodlo adres="https://sudop.uokik.gov.pl" etykieta="SUDOP — UOKiK" />
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
          Dane trzymamy u siebie i odświeżamy według harmonogramu — nie pytamy
          rejestrów przy każdym wejściu na stronę.
        </p>
      </div>
    </div>
  );
}
