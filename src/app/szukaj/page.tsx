import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, szukaj } from '@/lib/dane';
import { liczba, zlote, zOdmiana } from '@/lib/format';
import { opisFirmy, opisGminy } from '@/lib/wyszukiwanie';
import { BrakDanych } from '@/components/BrakDanych';
import { KartaGlosowania } from '@/components/KartaGlosowania';
import { Szukajka } from '@/components/Szukajka';

// Strony wynikow nie maja wlasnej tresci — nie indeksujemy ich nigdy,
// takze po premierze. Wartosc jest jawna, a nie `undefined`.
export const metadata: Metadata = {
  title: 'Szukaj',
  robots: { index: false, follow: true },
};

const GLOSOWAN_NA_STRONIE = 50;

export default async function StronaSzukaj({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { q = '' } = await searchParams;
  const fraza = q.slice(0, 120);
  const w = szukaj(fraza, GLOSOWAN_NA_STRONIE);
  const cokolwiek = w.gminy.length + w.poslowie.length + w.glosowania.length + w.firmy.length > 0;

  return (
    <div className="obszar max-w-4xl py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">Szukaj</h1>
      <div className="mt-5">
        <Szukajka poczatkowa={fraza} />
      </div>

      {fraza.trim().length < 2 ? (
        <p className="mt-8 text-atrament-2">
          Wpisz co najmniej dwa znaki — nazwę swojej gminy, nazwisko posła, słowo z tytułu
          głosowania albo nazwę bądź NIP firmy.
        </p>
      ) : !cokolwiek ? (
        <p className="mt-8 text-atrament-2">{`Nic nie znaleźliśmy dla „${fraza}”.`}</p>
      ) : null}

      {w.gminy.length ? (
        <section className="mt-10">
          <h2 className="szryft text-2xl font-semibold">Gminy</h2>
          <p className="mt-1 text-sm text-atrament-2">
            Kliknij swoją gminę: zobaczysz jej posłów, fundusze unijne i pomoc publiczną dla firm z jej terenu.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {w.gminy.map((g) => (
              <li key={g.teryt}>
                <Link
                  href={`/gmina/${g.teryt}`}
                  className="group flex h-full flex-col rounded-xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <span className="font-medium group-hover:text-akcent">{g.nazwa}</span>
                  <span className="text-xs text-atrament-3">{opisGminy(g)}</span>
                  <span className="mt-2 text-sm text-akcent">
                    {`okręg nr ${g.okreg_nr}${g.okreg_nazwa ? ` · ${g.okreg_nazwa}` : ''} →`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {w.poslowie.length ? (
        <section className="mt-10">
          <h2 className="szryft text-2xl font-semibold">Posłowie</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {w.poslowie.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/posel/${p.slug}`}
                  className="group flex items-baseline gap-3 rounded-xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <span className="font-medium group-hover:text-akcent">{p.imie_nazwisko}</span>
                  <span className="text-sm text-atrament-2">{p.klub_id ?? 'bez klubu'}</span>
                  <span className="ml-auto text-xs text-atrament-3">
                    {p.aktywny ? p.okreg_nazwa : 'mandat wygasł'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {w.firmy.length ? (
        <section className="mt-10">
          <h2 className="szryft text-2xl font-semibold">Firmy</h2>
          <p className="mt-1 text-sm text-atrament-2">
            Beneficjenci pomocy publicznej z rejestru SUDOP. Szukamy po nazwie i po numerze NIP.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {w.firmy.map((f) => (
              <li key={f.nip}>
                <Link
                  href={`/firma/${f.nip}`}
                  className="group flex h-full flex-col rounded-xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <span className="font-medium group-hover:text-akcent">{f.nazwa}</span>
                  <span className="text-xs text-atrament-3">{opisFirmy(f)}</span>
                  {/* Brak kwoty to nie zero: zrodlo czasem nie podaje wartosci brutto. */}
                  <span className="liczby mt-2 text-sm text-akcent">
                    {f.brutto === null ? 'kwota nieznana →' : `${zlote(f.brutto)} →`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {w.glosowania.length ? (
        <section className="mt-10">
          <h2 className="szryft text-2xl font-semibold">Głosowania</h2>
          {/* Mianownik: czytelnik musi wiedziec, ze lista jest ucieta. */}
          <p className="mt-1 text-sm text-atrament-2">
            {w.glosowanWszystkich > w.glosowania.length
              ? `Najnowsze ${liczba(w.glosowania.length)} z ${zOdmiana(w.glosowanWszystkich, 'znalezionego', 'znalezionych', 'znalezionych')}. Doprecyzuj frazę, żeby zawęzić wynik.`
              : zOdmiana(w.glosowanWszystkich, 'głosowanie', 'głosowania', 'głosowań')}
          </p>
          <ul className="mt-4 space-y-2">
            {w.glosowania.map((g) => (
              <li key={`${g.posiedzenie}-${g.numer}`}>
                <KartaGlosowania g={g} uklad="wiersz" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
        Ograniczenia wyszukiwania mowimy wprost. Czytelnik, ktory nie znalazl
        ustawy, ma wiedziec, ze to moze byc wina odmiany, a nie brak glosowania.
      */}
      <details className="mt-12 rounded-xl border border-kreska bg-papier-2 px-4 py-3 text-sm text-atrament-2">
        <summary className="cursor-pointer font-medium text-atrament">Jak działa to wyszukiwanie</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            Szukamy w nazwach gmin (według danych PKW z wyborów w 2023 r.), w nazwiskach
            posłów, w tytułach głosowań i wśród firm z rejestru pomocy publicznej.
            Ogonki można pomijać: „lodz” znajdzie „Łódź”.
          </p>
          <p>
            Nie mamy słownika polskiej odmiany. Ucinamy końcówki słów, więc „podatek”
            znajdzie „podatku”, ale słowa, które zmieniają się w środku („matka” → „matek”),
            mogą umknąć. Jeśli nic nie ma, spróbuj krótszej formy.
          </p>
          <p>
            Firmy znajdziemy po nazwie albo po numerze NIP (dziesięć cyfr, ze spacjami
            lub bez). Gdy beneficjentem może być osoba fizyczna, nie pokazujemy ani jej
            nazwy, ani strony — także wtedy, gdy ktoś wpisze dokładny NIP. Pieniądze
            zostają w sumach: pomoc takich podmiotów jest wliczona w zestawienia gminy
            i w liczbę beneficjentów, pomijamy nazwę, nie kwotę.
          </p>
          <p>
            Wieś nie jest gminą. Jeśli Twojej miejscowości nie ma na liście, wpisz nazwę
            gminy, do której należy.
          </p>
        </div>
      </details>
    </div>
  );
}
