import type { Metadata } from 'next';
import { bazaDostepna, podsumowanie, stanImportu } from '@/lib/dane';
import { dataSlownie, liczba } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { STAN_PLANU, ZRODLO_PLANU } from '@/lib/plan-sali';
import { Dzial, Okruszek, Podstawa, Uwaga, Wypis } from '@/components/Szablon';

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
  interpelacje: 'Interpelacje poselskie — metryczka (kto, do kogo, czy jest odpowiedź)',
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

  const ZRODLA: { co: string; linki: { adres: string; nazwa: string }[] }[] = [
    { co: 'Posłowie, kluby, głosowania, głosy imienne i zdjęcia', linki: [{ adres: 'https://api.sejm.gov.pl/sejm/openapi/', nazwa: 'API Sejmu RP' }] },
    { co: 'Ludność i budżety gmin', linki: [{ adres: 'https://bdl.stat.gov.pl', nazwa: 'GUS — Bank Danych Lokalnych' }] },
    {
      co: 'Projekty z Funduszy Europejskich',
      linki: [
        { adres: 'https://dane.gov.pl/pl/dataset/13939', nazwa: 'MFiPR — lista 2021–2027' },
        { adres: 'https://dane.gov.pl/pl/dataset/1176', nazwa: 'MFiPR — lista 2014–2020' },
      ],
    },
    { co: 'Pomoc publiczna dla przedsiębiorców', linki: [{ adres: 'https://sudop.uokik.gov.pl', nazwa: 'SUDOP — UOKiK' }] },
    // Jedyne zrodlo, ktorego NIE odswieza zadne zadanie: kazde wydanie
    // rysunku ma inny adres, wiec nowy plan dodaje sie recznie.
    { co: `Plan sali posiedzeń (stan na ${dataSlownie(STAN_PLANU)}, odświeżany ręcznie)`, linki: [{ adres: ZRODLO_PLANU, nazwa: 'Kancelaria Sejmu — rysunek sali' }] },
    {
      co: 'Przypisanie gmin do okręgów wyborczych',
      linki: [{ adres: 'https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach', nazwa: 'PKW — wyniki wyborów do Sejmu 2023 po gminach' }],
    },
  ];

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'O serwisie' }, { nazwa: 'Stan danych' }]} />
      <Wypis
        tytul="Stan danych"
        podtytul="Ta strona istnieje po to, żeby dało się sprawdzić, czego jeszcze nie mamy. Serwis, który pokazuje tylko to, co mu wyszło, jest trudniejszy do zweryfikowania niż taki, który mówi wprost, gdzie ma dziury."
      />

      <Uwaga naglowek="Głosy imienne.">
        {`Mamy ${liczba(stan.glosow)} głosów imiennych z ${liczba(stan.glosowanZGlosami)} głosowań.`}
        {brakujaceGlosy > 0
          ? ` Dla ${liczba(brakujaceGlosy)} głosowań mamy na razie tylko liczby zbiorcze z nagłówka rejestru — na stronie takiego głosowania jest to napisane wprost.`
          : ' To wszystkie głosowania kadencji.'}
      </Uwaga>

      <Dzial id="zbiory" nr={1} tytul={`Co pobraliśmy: ${liczba(wpisy.length)} zbiorów`}>
        {/*
          Bez tabeli. ZGLOSZENIE PAWLA 24.09.2026: tabela miala wlasny poziomy
          suwak („do uwalenia”) — na telefonie nie dalo sie jej czytac. Lista
          z liniami czyta sie tak samo w kazdej szerokosci.
        */}
        <ul className="pozycje">
          {wpisy.map((w) => (
            <li key={w.co}>
              <div className="min-w-0">
                <p className="font-semibold">
                  {opisZbioru(w.co).tytul}
                  {opisZbioru(w.co).bezOpisu ? <span className="ml-2 font-normal text-atrament-2">(zbiór bez opisu)</span> : null}
                </p>
                <p className="meta">{`zaimportowano ${dataSlownie(w.kiedy)}`}</p>
                {/* Uwagi bywaja jednym dlugim adresem z suma SHA — bez break-all
                    rozpychaja wiersz i cala strone (zmierzone: 613 px z 390). */}
                {w.uwagi ? <p className="meta mt-1 break-all">{w.uwagi}</p> : null}
              </div>
              <p className="kwota">{w.ile === null ? '—' : liczba(w.ile)}</p>
            </li>
          ))}
        </ul>
      </Dzial>

      <Dzial id="skad" nr={2} tytul="Skąd to pochodzi">
        <ul className="pozycje">
          {ZRODLA.map((z) => (
            <li key={z.co}>
              <div className="min-w-0">
                <p>{z.co}</p>
                <p className="flex flex-wrap gap-x-4">
                  {z.linki.map((l) => <Podstawa key={l.adres} adres={l.adres} nazwa={l.nazwa} />)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
          Dane trzymamy u siebie i odświeżamy według harmonogramu — nie pytamy rejestrów przy
          każdym wejściu na stronę.
        </p>
      </Dzial>
    </div>
  );
}
