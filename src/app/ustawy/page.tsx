import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, liczbaProcesow, stronaProcesow, type ProcesSkrot } from '@/lib/dane';
import { dataKrotko, liczba, zOdmiana } from '@/lib/format';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Ustawy',
  description: 'Co się stało z projektem ustawy: droga przez Sejm, etap po etapie, z odnośnikiem do imiennego głosowania.',
};

const NA_STRONIE = 40;
const REJESTR = 'https://www.sejm.gov.pl/sejm10.nsf/proces.xsp';

const STANY: { klucz: string; etykieta: string }[] = [
  { klucz: '', etykieta: 'Wszystkie' },
  { klucz: 'uchwalone', etykieta: 'Uchwalone' },
  { klucz: 'w-toku', etykieta: 'W toku' },
  { klucz: 'zakonczone-inaczej', etykieta: 'Odrzucone i wycofane' },
];

/** Stan słowami rejestru — ta sama reguła co na stronie druku. */
function stan(p: ProcesSkrot): string {
  return p.koniec ?? (p.ostatni_etap ? `W toku · ${p.ostatni_etap}` : 'W toku');
}

export default async function StronaUstaw({
  searchParams,
}: {
  searchParams: Promise<{ strona?: string; stan?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { strona, stan: wybranyStan = '' } = await searchParams;
  const filtr = STANY.some((s) => s.klucz === wybranyStan) ? wybranyStan : '';

  const wszystkich = liczbaProcesow('projekt ustawy', filtr);
  const stron = Math.max(1, Math.ceil(wszystkich / NA_STRONIE));
  const biezaca = Math.min(Math.max(1, Number.parseInt(strona ?? '1', 10) || 1), stron);
  const lista = stronaProcesow((biezaca - 1) * NA_STRONIE, NA_STRONIE, 'projekt ustawy', filtr);

  const adres = (nr: number, s = filtr) => ({
    pathname: '/ustawy',
    query: { ...(s ? { stan: s } : {}), ...(nr > 1 ? { strona: String(nr) } : {}) },
  });

  return (
    <div className="obszar max-w-4xl py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Ustawy</h1>
        <Zrodlo adres={REJESTR} etykieta="rejestr procesów legislacyjnych" />
      </div>
      <p className="mt-2 max-w-2xl text-atrament-2">
        Co się stało z projektem: od wpłynięcia do Sejmu, przez czytania i komisje,
        po głosowanie i podpis Prezydenta. Etapy nazywamy tak, jak nazywa je rejestr.
      </p>

      {/* Filtr zwyklymi odnosnikami — adres z filtrem da sie komus wyslac. */}
      <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Stan procesu">
        {STANY.map((s) => (
          <Link
            key={s.klucz}
            href={adres(1, s.klucz)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${
              s.klucz === filtr
                ? 'border-akcent bg-akcent-slaby text-akcent'
                : 'border-kreska text-atrament-2 hover:border-kreska-2'
            }`}
          >
            {s.etykieta}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-atrament-2">
        {`${zOdmiana(wszystkich, 'projekt ustawy', 'projekty ustaw', 'projektów ustaw')} w tej kadencji${
          filtr ? ' w wybranym stanie' : ''
        }. Pokazujemy ${liczba(lista.length)} — strona ${biezaca} z ${stron}.`}
      </p>

      <ul className="mt-6 space-y-2">
        {lista.map((p) => (
          <li key={p.numer}>
            <Link
              href={`/ustawa/${p.numer}`}
              className="group flex flex-col gap-1 rounded-xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="liczby shrink-0 text-xs text-atrament-3">{`druk ${p.numer}`}</span>
                <span className="min-w-0 flex-1 font-medium group-hover:text-akcent">
                  {bezNazwiskOsobPrywatnych(p.tytul)}
                </span>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-atrament-3">
                <span className={p.koniec === 'Uchwalono' ? 'text-akcent' : ''}>{stan(p)}</span>
                {p.ostatnia_data ? <span className="liczby">{dataKrotko(p.ostatnia_data)}</span> : null}
                {p.adres_publikacji ? <span>{p.adres_publikacji}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/*
        Stronicowanie zwyklymi odnosnikami, a nie doladowywaniem: lista, ktora
        urywa sie po cichu, wyglada na kompletna (wzorzec 4).
      */}
      <nav className="mt-8 flex items-center justify-between gap-4 text-sm" aria-label="Stronicowanie">
        {biezaca > 1 ? (
          <Link href={adres(biezaca - 1)} className="rounded-lg border border-kreska px-3 py-2 hover:border-kreska-2">
            ← Poprzednia
          </Link>
        ) : <span />}
        <span className="liczby text-atrament-2">{`strona ${biezaca} z ${stron}`}</span>
        {biezaca < stron ? (
          <Link href={adres(biezaca + 1)} className="rounded-lg border border-kreska px-3 py-2 hover:border-kreska-2">
            Następna →
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
