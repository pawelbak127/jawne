import Link from 'next/link';
import { bazaDostepna, kluby, listaPoslow, ostatnieGlosowania, podsumowanie } from '@/lib/dane';
import { dataSlownie, liczba, skroc, zOdmiana } from '@/lib/format';
import { Polkole, type Blok } from '@/components/Polkole';
import { Szukajka } from '@/components/Szukajka';
import { Kafel, Zrodlo } from '@/components/Zrodlo';
import { BrakDanych } from '@/components/BrakDanych';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';

export default function StronaGlowna() {
  if (!bazaDostepna()) return <BrakDanych />;

  const stan = podsumowanie();
  const listaKlubow = kluby();
  const poslowie = listaPoslow();
  const glosowania = ostatnieGlosowania(6);

  const bloki: Blok[] = listaKlubow
    .filter((k) => k.mandaty !== null && k.mandaty > 0)
    .map((k) => ({
      id: k.id,
      etykieta: k.id,
      pelnaNazwa: k.nazwa,
      miejsca: Array.from({ length: k.mandaty ?? 0 }, () => ({
        barwa: k.barwa,
        barwaCiemna: k.barwaCiemna,
        opis: `${k.nazwa ?? k.id} — ${zOdmiana(k.mandaty ?? 0, 'mandat', 'mandaty', 'mandatów')}`,
      })),
    }));

  const mandatow = bloki.reduce((a, b) => a + b.miejsca.length, 0);

  return (
    <>
      <section className="relative">
        <div className="siatka-tla pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="obszar pt-16 pb-12 sm:pt-24">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-akcent">
            Sejm RP · X kadencja
          </p>
          <h1 className="szryft mt-4 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
            Kto jak głosował — <br className="hidden sm:block" />
            i skąd to wiadomo.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-atrament-2">
            {liczba(stan.glosowan)} głosowań, {liczba(stan.poslow)} posłów, jeden rejestr.
            Przy każdej liczbie stoi odnośnik do źródła w Sejmie — możesz sprawdzić nas
            w dwóch kliknięciach.
          </p>

          <div className="mt-8 max-w-xl">
            <Szukajka
              pozycje={poslowie.map((p) => ({
                slug: p.slug,
                nazwa: p.imie_nazwisko,
                klub: p.klub_id,
                okreg: p.okreg_nazwa,
              }))}
            />
          </div>
          <p className="mt-3 text-sm text-atrament-3">
            albo{' '}
            <Link href="/poslowie" className="text-akcent underline underline-offset-4 hover:no-underline">
              przejrzyj wszystkich posłów
            </Link>
          </p>
        </div>
      </section>

      <section className="obszar py-8">
        <div className="rounded-3xl border border-kreska bg-papier-2 p-6 shadow-karta sm:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="szryft text-2xl font-semibold">Układ izby</h2>
            <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/clubs" etykieta="rejestr klubów" />
          </div>

          <div className="mx-auto mt-6 max-w-2xl">
            <Polkole
              bloki={bloki}
              podpis={`Rozkład ${mandatow} mandatów między kluby i koła poselskie`}
              srodek={
                <>
                  <span className="liczby szryft text-5xl font-semibold leading-none">{mandatow}</span>
                  <span className="mt-1 text-xs text-atrament-2">mandatów</span>
                </>
              }
            />
          </div>

          {/*
            Ta uwaga nie jest drobnym drukiem. Czytelnik widzacy kolorowy wykres
            sejmowy zaklada, ze to barwy partyjne — i na tym zalozeniu buduje
            wnioski. Musi wiedziec, ze tak nie jest.
          */}
          <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-atrament-3">
            Barwy są nasze, dobrane pod rozróżnialność przy daltonizmie — nie są
            barwami partyjnymi. Loga klubów dają pięć podobnych czerwieni i trzy
            granaty, więc na ich podstawie nie da się narysować czytelnego wykresu.
          </p>
        </div>
      </section>

      <section className="obszar py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kafel
            wartosc={liczba(stan.glosowan)}
            etykieta="głosowań"
            mianownik={stan.pierwszeGlosowanie ? `od ${dataSlownie(stan.pierwszeGlosowanie)}` : undefined}
            zrodlo="https://api.sejm.gov.pl/sejm/term10/votings"
          />
          <Kafel
            wartosc={liczba(stan.poslow)}
            etykieta="posłów w rejestrze"
            mianownik={`w tym ${liczba(stan.poslow - stan.poslowAktywnych)} z wygasłym mandatem`}
            zrodlo="https://api.sejm.gov.pl/sejm/term10/MP"
          />
          <Kafel
            wartosc={liczba(stan.glosow)}
            etykieta="głosów imiennych"
            mianownik={`z ${liczba(stan.glosowanZGlosami)} głosowań`}
            zrodlo="https://api.sejm.gov.pl/sejm/openapi/"
          />
          <Kafel
            wartosc={liczba(listaKlubow.length)}
            etykieta="klubów i kół"
            mianownik={stan.ostatnieGlosowanie ? `stan na ${dataSlownie(stan.ostatnieGlosowanie)}` : undefined}
            zrodlo="https://api.sejm.gov.pl/sejm/term10/clubs"
          />
        </div>
      </section>

      <section className="obszar py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="szryft text-2xl font-semibold">Ostatnie głosowania</h2>
          <Link href="/glosowania" className="text-sm text-akcent underline underline-offset-4 hover:no-underline">
            wszystkie {liczba(stan.glosowan)}
          </Link>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {glosowania.map((g) => (
            <li key={`${g.posiedzenie}-${g.numer}`}>
              <Link
                href={`/glosowanie/${g.posiedzenie}-${g.numer}`}
                className="group flex h-full flex-col rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta transition-all hover:border-kreska-2 hover:shadow-karta-2"
              >
                <div className="flex items-center gap-2 text-xs text-atrament-3">
                  <span>{dataSlownie(g.data)}</span>
                  <span aria-hidden>·</span>
                  <span>posiedzenie {g.posiedzenie}</span>
                </div>
                <p className="mt-2 flex-1 leading-snug font-medium group-hover:text-akcent">
                  {skroc(g.temat ?? g.tytul, 110)}
                </p>
                <PaseczekGlosow
                  za={g.za}
                  przeciw={g.przeciw}
                  wstrzymalo={g.wstrzymalo}
                  nieobecnych={g.nieobecnych}
                  className="mt-4"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
