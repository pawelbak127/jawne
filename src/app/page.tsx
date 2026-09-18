import Link from 'next/link';
import { bazaDostepna, kluby, liczbaGlosowan, okregi, ostatnieGlosowania, podsumowanie } from '@/lib/dane';
import { dataSlownie, liczba, zOdmiana } from '@/lib/format';
import { Polkole, type Blok } from '@/components/Polkole';
import { Szukajka } from '@/components/Szukajka';
import { Kafel, Zrodlo } from '@/components/Zrodlo';
import { BrakDanych } from '@/components/BrakDanych';
import { KartaGlosowania } from '@/components/KartaGlosowania';

const PRZYKLADY = ['Kraków', 'Zakopane', 'podatek', 'sygnaliści'];

export default function StronaGlowna() {
  if (!bazaDostepna()) return <BrakDanych />;

  const stan = podsumowanie();
  const listaKlubow = kluby();
  const glosowania = ostatnieGlosowania(6, { nadCaloscia: true });
  const glosowanNadCaloscia = liczbaGlosowan({ nadCaloscia: true });
  const listaOkregow = okregi();
  const gminLiczba = listaOkregow.reduce((a, o) => a + o.gmin, 0);

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
          {/* text-balance zamiast twardego <br>: przy <br> "Sejmie" zostawalo samo w linii. */}
          <h1 className="szryft mt-4 max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            Kto Cię reprezentuje w&nbsp;Sejmie — i&nbsp;jak naprawdę głosuje.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-atrament-2">
            Wpisz swoją gminę: zobaczysz posłów ze swojego okręgu, ich głosy, to, czy
            głosują jak klub, i publiczne pieniądze, które do niej trafiły. Przy każdej
            liczbie jest odnośnik do rejestru.
          </p>

          <div className="mt-8 max-w-2xl">
            <Szukajka />
          </div>
          {/*
            Przyklady: dwie miejscowosci i dwa tematy. Celowo bez nazwisk —
            nazwisko wybrane przez nas na stronie glownej czyta sie jak wyroznienie.
          */}
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-atrament-3">
            <span>np.</span>
            {PRZYKLADY.map((p) => (
              <Link
                key={p}
                href={`/szukaj?q=${encodeURIComponent(p)}`}
                className="rounded-full border border-kreska-2 px-2.5 py-0.5 text-atrament-2 transition-colors hover:border-akcent hover:text-akcent"
              >
                {p}
              </Link>
            ))}
          </p>
        </div>
      </section>

      <section className="obszar pb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/okregi" className="group rounded-2xl border border-kreska bg-papier-2 p-5 transition-all hover:border-kreska-2 hover:shadow-karta">
            <p className="font-medium group-hover:text-akcent">Kto mnie reprezentuje i co trafia do mojej gminy?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-atrament-2">
              {`${liczba(gminLiczba)} gmin: posłowie z okręgu, projekty unijne i pomoc publiczna dla firm — zawsze w przeliczeniu na mieszkańca.`}
            </p>
          </Link>
          <Link href="/poslowie" className="group rounded-2xl border border-kreska bg-papier-2 p-5 transition-all hover:border-kreska-2 hover:shadow-karta">
            <p className="font-medium group-hover:text-akcent">Czy mój poseł głosuje jak klub?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-atrament-2">
              {`Każdy głos porównany z resztą klubu — w ${liczba(stan.glosowan)} głosowaniach, zawsze z mianownikiem.`}
            </p>
          </Link>
          <Link href="/pomoc-publiczna" className="group rounded-2xl border border-kreska bg-papier-2 p-5 transition-all hover:border-kreska-2 hover:shadow-karta">
            <p className="font-medium group-hover:text-akcent">Kto rozdaje publiczne pieniądze firmom?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-atrament-2">
              Dotacje, ulgi i pomoc de minimis w całej Polsce: kto udziela, na co i jakim firmom.
            </p>
          </Link>
          <Link href="/o-serwisie" className="group rounded-2xl border border-kreska bg-papier-2 p-5 transition-all hover:border-kreska-2 hover:shadow-karta">
            <p className="font-medium group-hover:text-akcent">Skąd to wiadomo?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-atrament-2">
              Z rejestrów Sejmu, PKW, GUS, ministerstwa funduszy i UOKiK. Przy każdej liczbie jest odnośnik — sprawdzisz nas w dwóch kliknięciach.
            </p>
          </Link>
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
                  <span className="liczby szryft text-3xl font-semibold leading-none sm:text-5xl">{mandatow}</span>
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
            // Liczymy kluby Z REJESTRU KLUBOW, a nie wszystkie wiersze tabeli:
            // te zawieraja rowniez kluby historyczne wystepujace juz tylko
            // w starych glosach.
            wartosc={liczba(listaKlubow.filter((k) => k.mandaty !== null).length)}
            etykieta="klubów i kół"
            mianownik={stan.ostatnieGlosowanie ? `stan na ${dataSlownie(stan.ostatnieGlosowanie)}` : undefined}
            zrodlo="https://api.sejm.gov.pl/sejm/term10/clubs"
          />
        </div>
      </section>

      <section className="obszar py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="szryft text-2xl font-semibold">Ostatnie głosowania nad całością projektów</h2>
          <Link href="/glosowania?rodzaj=calosc" className="text-sm text-akcent underline underline-offset-4 hover:no-underline">
            {`wszystkie ${liczba(glosowanNadCaloscia)}`}
          </Link>
        </div>
        {/*
          Ostatnie glosowania w ogole to prawie zawsze kworum, przerwy
          i poprawki. Nie wybieramy "waznych" wedlug siebie — pokazujemy
          ostateczne glosowania nad projektami, rozpoznane po slowach rejestru.
        */}
        <p className="mt-1 max-w-2xl text-sm text-atrament-2">
          {`Ostateczne głosowania nad projektami ustaw i uchwał — tak nazywa je rejestr. Wszystkich głosowań, łącznie z poprawkami i sprawami porządkowymi, jest ${liczba(stan.glosowan)}.`}
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {glosowania.map((g) => (
            <li key={`${g.posiedzenie}-${g.numer}`}>
              <KartaGlosowania g={g} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
