import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, funduszeGminy, gminaPelna, kluby, medianaUeNaMieszkanca, najwiekszeProjektyGminy,
  pomocGminy, poslowieOkregu, zrodloImportu, type FunduszeWOkresie,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { opisGminy } from '@/lib/wyszukiwanie';
import { nazwaDoPokazania, nazwaPodmiotuJawna } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';

const TERYT_WARSZAWY = '146501';
const ZRODLO_FE_2127 = 'https://dane.gov.pl/pl/dataset/13939';
const ZRODLO_FE_1420 = 'https://dane.gov.pl/pl/dataset/1176';
const ZRODLO_GUS = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/zmienna/72305';
const ZRODLO_SUDOP = 'https://sudop.uokik.gov.pl';

export async function generateMetadata({ params }: { params: Promise<{ teryt: string }> }): Promise<Metadata> {
  const { teryt } = await params;
  const g = /^\d{6}$/.test(teryt) && bazaDostepna() ? gminaPelna(teryt) : null;
  if (!g) return { title: 'Nie ma takiej gminy' };
  return {
    title: `${g.nazwa} — posłowie i publiczne pieniądze`,
    description: `${g.nazwa} (${opisGminy(g)}): kto reprezentuje gminę w Sejmie, ile trafiło tu z Funduszy Europejskich i jakiej pomocy publicznej udzielono firmom z jej terenu.`,
  };
}

function naMieszkanca(kwota: number | null, ludnosc: number | null): number | null {
  if (kwota === null || !ludnosc) return null;
  return kwota / ludnosc;
}

export default async function StronaGminy({ params }: { params: Promise<{ teryt: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { teryt } = await params;
  if (!/^\d{6}$/.test(teryt)) notFound();
  const g = gminaPelna(teryt);
  if (!g) notFound();

  const dzielnica = g.rodzaj === 'dzielnica Warszawy';
  const miastoPowiat = g.rodzaj === 'miasto na prawach powiatu';
  // Lista UE nie rozpisuje Warszawy na dzielnice — dzielnica pokazuje cale miasto.
  const terytFunduszy = dzielnica ? TERYT_WARSZAWY : teryt;
  const fundusze = funduszeGminy(terytFunduszy);
  const projekty = najwiekszeProjektyGminy(terytFunduszy, 8);
  const pomoc = pomocGminy(teryt);
  const poslowie = poslowieOkregu(g.okreg_nr).filter((p) => p.aktywny === 1);
  const listaKlubow = kluby();
  const importFe = zrodloImportu('fundusze-2021-2027');

  return (
    <div className="obszar py-10">
      <p className="text-sm text-atrament-2">
        <Link href="/okregi" className="hover:text-akcent">{`woj. ${g.wojewodztwo}`}</Link>
        {' · '}
        <span>{miastoPowiat || dzielnica ? g.powiat : `powiat ${g.powiat}`}</span>
      </p>

      <header className="mt-3">
        <h1 className="szryft text-4xl font-semibold sm:text-5xl">{dzielnica ? `Warszawa — ${g.nazwa}` : g.nazwa}</h1>
        <p className="mt-2 text-atrament-2">{opisGminy(g)}</p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{g.ludnosc ? liczba(g.ludnosc) : '—'}</p>
          <p className="mt-1 text-sm font-medium">mieszkańców</p>
          <p className="mt-0.5 text-xs text-atrament-2">{g.ludnosc_rok ? `GUS, stan na koniec ${g.ludnosc_rok} r.` : 'GUS nie podaje'}</p>
          <Zrodlo adres={ZRODLO_GUS} etykieta="Bank Danych Lokalnych" className="mt-3" />
        </div>
        <Link href={`/okreg/${g.okreg_nr}?gmina=${g.teryt}`} className="group rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta transition-all hover:border-kreska-2">
          <p className="szryft text-3xl font-semibold">{`Okręg nr ${g.okreg_nr}`}</p>
          <p className="mt-1 text-sm font-medium group-hover:text-akcent">{`${g.okreg_nazwa ?? ''} →`}</p>
          <p className="mt-0.5 text-xs text-atrament-2">okręg wyborczy do Sejmu (PKW, wybory 2023)</p>
        </Link>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="text-sm font-medium">{zOdmiana(poslowie.length, 'poseł z tego okręgu', 'posłów z tego okręgu', 'posłów z tego okręgu')}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {poslowie.map((p) => {
              const k = listaKlubow.find((x) => x.id === p.klub_id);
              return (
                <li key={p.slug}>
                  <Link href={`/posel/${p.slug}`} title={`${p.imie_nazwisko} (${p.klub_id ?? 'bez klubu'})`} className="relative block">
                    <Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="maly" />
                    <span
                      className="miejsce-probka absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-papier-2"
                      style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-14">
        <h2 className="szryft text-3xl font-semibold">Fundusze Europejskie</h2>
        <p className="mt-2 max-w-3xl text-atrament-2">
          {dzielnica
            ? 'Lista ministerstwa nie rozpisuje projektów na dzielnice, więc pokazujemy całą Warszawę.'
            : 'Liczymy projekty realizowane wyłącznie w tej gminie. Projektów prowadzonych w kilku miejscach nie dzielimy między gminy — podajemy tylko ich liczbę.'}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {fundusze.map((f) => (
            <KartaOkresu
              key={f.okres}
              f={f}
              ludnosc={dzielnica ? null : g.ludnosc}
              wojewodztwo={g.wojewodztwo}
              tylkoPowiat={f.okres === '2014-2020' && !miastoPowiat && !dzielnica}
            />
          ))}
        </div>

        {projekty.length ? (
          <div className="mt-8">
            <h3 className="text-lg font-medium">Największe projekty realizowane tylko tutaj</h3>
            <ul className="mt-3 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
              {projekty.map((p) => {
                const b = nazwaDoPokazania(p.beneficjent);
                return (
                  <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-medium">{skroc(p.tytul, 160)}</p>
                      <p className={`mt-1 text-sm ${b.pominieta ? 'text-atrament-3 italic' : 'text-atrament-2'}`}>{b.tekst}</p>
                      <p className="mt-1 text-xs text-atrament-3">
                        {`${p.okres}${p.program ? ` · ${skroc(p.program, 70)}` : ''}${p.poczatek ? ` · ${dataKrotko(p.poczatek)}–${dataKrotko(p.koniec)}` : ''}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="liczby font-semibold">{zlote(p.dofinansowanie_ue)}</p>
                      <p className="liczby text-xs text-atrament-2">{`z UE, wartość ${zlote(p.wartosc)}`}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-atrament-3">
          <span>{`Źródło: listy projektów Ministerstwa Funduszy i Polityki Regionalnej${importFe ? `, pobrane ${dataSlownie(importFe.kiedy)}` : ''}.`}</span>
          <Zrodlo adres={ZRODLO_FE_2127} etykieta="lista 2021–2027" />
          <Zrodlo adres={ZRODLO_FE_1420} etykieta="lista 2014–2020" />
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-14">
        <h2 className="szryft text-3xl font-semibold">Pomoc publiczna dla firm z tej gminy</h2>
        <p className="mt-2 max-w-3xl text-atrament-2">
          Zwolnienia z podatków, dopłaty, preferencyjne pożyczki i pomoc de minimis udzielone
          przedsiębiorcom, którzy mają tu siedzibę — według systemu SUDOP prowadzonego przez UOKiK.
        </p>
        {pomoc.pobranie && pomoc.razem ? <PomocPubliczna pomoc={pomoc} /> : <BrakPomocy />}
      </section>

    </div>
  );
}

function KartaOkresu({ f, ludnosc, wojewodztwo, tylkoPowiat }: {
  f: FunduszeWOkresie;
  ludnosc: number | null;
  wojewodztwo: string;
  tylkoPowiat: boolean;
}) {
  const naOsobe = naMieszkanca(f.tylko_tu_ue, ludnosc);
  const mediana = ludnosc ? medianaUeNaMieszkanca(wojewodztwo, f.okres) : null;
  return (
    <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
      <p className="text-xs font-medium tracking-wider text-atrament-3 uppercase">{`Perspektywa ${f.okres.replace('-', '–')}`}</p>
      {tylkoPowiat ? (
        <>
          <p className="mt-3 leading-relaxed text-atrament-2">
            Lista z lat 2014–2020 podaje miejsce realizacji tylko do poziomu powiatu,
            więc nie da się uczciwie powiedzieć, które projekty trafiły do tej gminy.
          </p>
          <p className="mt-3 text-sm">
            <span className="liczby font-semibold">{liczba(f.w_powiecie)}</span>
            {` ${f.w_powiecie === 1 ? 'projekt wskazany' : 'projektów wskazanych'} dla całego powiatu.`}
          </p>
        </>
      ) : (
        <>
          <p className="liczby szryft mt-3 text-4xl font-semibold">{zlote(f.tylko_tu_ue ?? 0)}</p>
          <p className="mt-1 text-sm font-medium">dofinansowania z UE</p>
          <p className="mt-0.5 text-xs text-atrament-2">
            {`${zOdmiana(f.tylko_tu, 'projekt realizowany', 'projekty realizowane', 'projektów realizowanych')} tylko tutaj, łączna wartość ${zlote(f.tylko_tu_wartosc ?? 0)}`}
          </p>
          {naOsobe !== null ? (
            <p className="mt-4 border-t border-kreska pt-3 text-sm">
              <span className="liczby font-semibold">{zlote(naOsobe)}</span>
              {' na mieszkańca'}
              {mediana ? (
                <span className="text-atrament-2">{` · mediana w województwie (${zOdmiana(mediana.gmin, 'gmina', 'gminy', 'gmin')}): ${zlote(mediana.mediana)}`}</span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            {`Do tego ${zOdmiana(f.wspolnych, 'projekt realizowany', 'projekty realizowane', 'projektów realizowanych')} tu i w innych gminach`}
            {f.w_powiecie ? ` oraz ${zOdmiana(f.w_powiecie, 'projekt wskazany', 'projekty wskazane', 'projektów wskazanych')} tylko dla całego powiatu` : ''}
            {' — tych kwot nie przypisujemy gminie.'}
          </p>
        </>
      )}
    </div>
  );
}

function PomocPubliczna({ pomoc }: { pomoc: ReturnType<typeof pomocGminy> }) {
  const r = pomoc.razem!;
  const p = pomoc.pobranie!;
  const maxRok = Math.max(1, ...pomoc.lata.map((l) => l.brutto ?? 0));
  const jawni = pomoc.beneficjenci.filter((b) => nazwaPodmiotuJawna(b.nazwa));
  // Liczymy po WSZYSTKICH beneficjentach, nie po pokazanej czolowce — inaczej
  // spolki spoza czolowki trafialy do "niewymienionych z nazwy".
  const ukrytych = pomoc.nazwyBeneficjentow.filter((n) => !nazwaPodmiotuJawna(n)).length;
  return (
    <>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold">{zlote(r.brutto)}</p>
          <p className="mt-1 text-sm font-medium">wartość pomocy brutto</p>
          <p className="mt-0.5 text-xs text-atrament-2">
            {`${zOdmiana(r.przypadkow, 'przypadek pomocy', 'przypadki pomocy', 'przypadków pomocy')} dla ${zOdmiana(r.beneficjentow, 'beneficjenta', 'beneficjentów', 'beneficjentów')}, udzielonych od ${dataSlownie(r.pierwszy)} do ${dataSlownie(r.ostatni)}`}
          </p>
          <details className="mt-4 border-t border-kreska pt-3 text-xs leading-relaxed text-atrament-2">
            <summary className="cursor-pointer font-medium text-atrament">Co znaczy „wartość brutto”</summary>
            <p className="mt-2">
              To ekwiwalent dotacji brutto, czyli tyle, ile pomoc jest warta dla firmy. Przy dotacji
              to cała kwota, ale przy pożyczce czy gwarancji tylko korzyść z lepszych warunków —
              nie cała pożyczona suma. Dlatego sumujemy wartość brutto, a nie nominalną.
            </p>
          </details>
        </div>

        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="text-sm font-medium">Według roku udzielenia</p>
          <ul className="mt-3 space-y-1.5">
            {pomoc.lata.map((l) => (
              <li key={l.rok} className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3 text-sm">
                <span className="liczby text-atrament-2">{l.rok}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-papier-3">
                  <span className="block h-full rounded-full bg-akcent" style={{ width: `${((l.brutto ?? 0) / maxRok) * 100}%` }} />
                </span>
                <span className="liczby text-right text-xs">{zlote(l.brutto)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Zestawienie tytul="Na co" wiersze={pomoc.przeznaczenia} />
        <Zestawienie tytul="Kto udzielił" wiersze={pomoc.udzielajacy} />
      </div>

      <div className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
        <p className="text-sm font-medium">Największe podmioty, które otrzymały pomoc</p>
        <ul className="mt-3 divide-y divide-kreska">
          {jawni.slice(0, 10).map((b) => (
            <li key={b.nip ?? b.nazwa} className="flex items-baseline gap-4 py-2 text-sm">
              <span className="min-w-0 flex-1">{b.nazwa}</span>
              <span className="liczby shrink-0 text-xs text-atrament-3">{zOdmiana(b.przypadkow, 'przypadek', 'przypadki', 'przypadków')}</span>
              <span className="liczby w-24 shrink-0 text-right font-medium">{zlote(b.brutto)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-atrament-3">
          {`Pokazujemy tylko podmioty, po których nazwie widać, że nie są osobą fizyczną (spółki, instytucje, organizacje). ${zOdmiana(ukrytych, 'beneficjenta', 'beneficjentów', 'beneficjentów')} z ${liczba(r.beneficjentow)} nie wymieniamy z nazwy, bo może to być osoba prowadząca działalność na własne nazwisko.`}
        </p>
      </div>

      {/*
        Warunki ponownego wykorzystania danych SUDOP z instrukcji UOKiK
        (dane.gov.pl, zbior 6068). Maja stac BEZPOSREDNIO przy danych.
      */}
      <div className="mt-4 rounded-xl border border-kreska bg-papier-3 px-4 py-3 text-xs leading-relaxed text-atrament-2">
        <p>
          <span className="font-medium text-atrament">Źródło:</span>{' '}
          <a href={ZRODLO_SUDOP} className="underline underline-offset-2 hover:text-akcent" target="_blank" rel="noreferrer">
            System Udostępniania Danych o Pomocy Publicznej (UOKiK)
          </a>
          {`, dane pobrane ${dataSlownie(p.pobrano)}. Dane mogą ulec zmianie. Za ich kompletność, prawidłowość i aktualność odpowiadają wyłącznie podmioty udzielające pomocy. Dane mają charakter pomocniczy i są drugorzędne wobec zaświadczeń oraz oświadczeń beneficjenta. Baza zawiera dane osobowe przetwarzane zgodnie z RODO.`}
        </p>
      </div>
    </>
  );
}

function Zestawienie({ tytul, wiersze }: { tytul: string; wiersze: { nazwa: string; przypadkow: number; brutto: number | null }[] }) {
  return (
    <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
      <p className="text-sm font-medium">{tytul}</p>
      <ul className="mt-3 divide-y divide-kreska">
        {wiersze.map((w) => (
          <li key={w.nazwa} className="flex items-baseline gap-4 py-2 text-sm">
            <span className="min-w-0 flex-1 leading-snug">{skroc(w.nazwa, 110)}</span>
            <span className="liczby w-24 shrink-0 text-right font-medium">{zlote(w.brutto)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrakPomocy() {
  return (
    <div className="mt-6 max-w-3xl rounded-2xl border border-kreska bg-papier-2 p-6 text-sm leading-relaxed text-atrament-2">
      <p className="font-medium text-atrament">Tej gminy jeszcze nie pobraliśmy.</p>
      <p className="mt-2">
        SUDOP wydaje dane przez kolejkę, a UOKiK napisał nam, że ruch przekracza możliwości jego
        serwerów. Dlatego nie pytamy urzędu przy każdym wejściu na stronę: gminy pobieramy
        ręcznie, jedną po drugiej. Do tego czasu dane tej gminy można sprawdzić w wyszukiwarce urzędu.
      </p>
      <Zrodlo adres={`${ZRODLO_SUDOP}/search/aidEvent`} etykieta="wyszukiwarka SUDOP" className="mt-3" />
    </div>
  );
}
