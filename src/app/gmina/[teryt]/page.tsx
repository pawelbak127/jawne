import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, budzetGminy, funduszeGminy, gminaPelna, historiaBudzetu, kluby, ludnoscWarszawy,
  medianaUeNaMieszkanca, najwiekszeProjektyGminy, pomocGminy, porownanieBudzetu,
  poslowieOkregu, TERYT_WARSZAWY, zrodloImportu,
  type BudzetGminy, type FunduszeWOkresie, type MedianaUe,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { opisGminy } from '@/lib/wyszukiwanie';
import { nazwaDoPokazania, PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { KONTAKT } from '@/lib/adres';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { SlupkiLat } from '@/components/SlupkiLat';
import { Zestawienie } from '@/components/Zestawienie';

const ZRODLO_FE_2127 = 'https://dane.gov.pl/pl/dataset/13939';
const ZRODLO_FE_1420 = 'https://dane.gov.pl/pl/dataset/1176';
const ZRODLO_GUS = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/zmienna/72305';
const ZRODLO_GUS_BUDZET = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/temat/G423';
const ZRODLO_GUS_INFLACJA = 'https://stat.gov.pl/obszary-tematyczne/ceny-handel/wskazniki-cen/wskazniki-cen-towarow-i-uslug-konsumpcyjnych-pot-inflacja-/roczne-wskazniki-cen-towarow-i-uslug-konsumpcyjnych/';

export async function generateMetadata({ params }: { params: Promise<{ teryt: string }> }): Promise<Metadata> {
  const { teryt } = await params;
  const g = /^\d{6}$/.test(teryt) && bazaDostepna() ? gminaPelna(teryt) : null;
  if (!g) return { title: 'Nie ma takiej gminy' };
  return {
    title: `${tytulGminy(g)} — posłowie i publiczne pieniądze`,
    description: `${nazwaWlasna(g)} (${opisGminy(g)}): kto reprezentuje gminę w Sejmie, ile trafiło tu z Funduszy Europejskich i jakiej pomocy publicznej udzielono firmom z jej terenu.`,
  };
}

// 228 nazw powtarza sie w 470 gminach (miasto i gmina wiejska o tej samej
// nazwie, Dabrowa w kilku powiatach). Unikalna jest dopiero para rodzaj + powiat,
// wiec tytul musi je zawierac — inaczej dwie strony dostaja ten sam tytul.
function nazwaWlasna(g: { nazwa: string; rodzaj: string }): string {
  if (g.rodzaj === 'dzielnica Warszawy') return `Warszawa, dzielnica ${g.nazwa}`;
  if (g.rodzaj === 'gmina') return `Gmina ${g.nazwa}`;
  return g.nazwa;
}

function tytulGminy(g: { nazwa: string; rodzaj: string; powiat: string }): string {
  const nazwa = nazwaWlasna(g);
  return g.rodzaj === 'gmina' || g.rodzaj === 'miasto' ? `${nazwa} (pow. ${g.powiat})` : nazwa;
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
  // Warszawa jest w SUDOP jednym miastem (146501), a jej dzielnice maja wlasne
  // kody — wszystkie trzymamy pod miastem, tak jak fundusze UE i budzet.
  const pomoc = pomocGminy(terytFunduszy);
  // Warszawa ma w BDL jeden budzet, nie 18 dzielnicowych — jak przy funduszach.
  const budzet = budzetGminy(terytFunduszy);
  const ludnoscDoPrzeliczen = dzielnica ? ludnoscWarszawy() : g.ludnosc;
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
        <h1 className="szryft text-4xl font-semibold sm:text-5xl">{nazwaWlasna(g)}</h1>
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
      {budzet ? (
        <Budzet teryt={terytFunduszy} budzet={budzet} ludnosc={ludnoscDoPrzeliczen} wojewodztwo={g.wojewodztwo} dzielnica={dzielnica} />
      ) : null}

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
              ludnosc={ludnoscDoPrzeliczen}
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
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="szryft text-3xl font-semibold">Pomoc publiczna dla firm z tej gminy</h2>
          <Link href="/pomoc-publiczna" className="text-sm text-akcent underline underline-offset-4 hover:no-underline">
            cała Polska →
          </Link>
        </div>
        <p className="mt-2 max-w-3xl text-atrament-2">
          Zwolnienia z podatków, dopłaty, preferencyjne pożyczki i pomoc de minimis udzielone
          przedsiębiorcom, którzy mają tu siedzibę — według systemu SUDOP prowadzonego przez UOKiK.
        </p>
        {pomoc.zrodlo && pomoc.razem ? <PomocPubliczna pomoc={pomoc} /> : <BrakPomocy />}
      </section>

      {/*
        Dane do pobrania. Plik pokazuje dokladnie to, co strona: te same
        zakresy i ta sama regula nazw (src/app/gmina/[teryt]/csv/[zestaw]).
      */}
      <section className="mt-14 rounded-2xl border border-kreska bg-papier-2 p-6">
        <h2 className="text-lg font-medium">Pobierz dane tej gminy</h2>
        <p className="mt-1 text-sm text-atrament-2">
          Pliki CSV przygotowane pod polskiego Excela: średnik jako separator, przecinek dziesiętny, kodowanie UTF-8.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            ['budzet', 'budżet rok po roku', Boolean(budzet)],
            ['fundusze', 'projekty unijne', fundusze.some((f) => f.tylko_tu || f.wspolnych)],
            ['pomoc', 'pomoc publiczna', Boolean(pomoc.zrodlo && pomoc.razem)],
          ].filter(([, , jest]) => jest).map(([zestaw, opis]) => (
            <li key={String(zestaw)}>
              <a
                href={`/gmina/${g.teryt}/csv/${String(zestaw)}`}
                className="inline-block rounded-full border border-kreska-2 px-3 py-1 text-atrament-2 transition-colors hover:border-akcent hover:text-akcent"
              >
                {`${String(opis)} (CSV)`}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Czy warto pokazac obie kwoty. W wiekszosci gmin wydatki majatkowe to w
 * calosci inwestycje — powtorzenie tej samej liczby tylko zaciemnia.
 */
function rozniSie(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && a > 0 && (a - b) / a > 0.01;
}

function Budzet({ teryt, budzet, ludnosc, wojewodztwo, dzielnica }: {
  teryt: string;
  budzet: BudzetGminy;
  ludnosc: number | null;
  wojewodztwo: string;
  dzielnica: boolean;
}) {
  const naOsobe = naMieszkanca(budzet.dochody, ludnosc);
  const mediana = ludnosc ? porownanieBudzetu(wojewodztwo, budzet.rok) : null;
  const historia = historiaBudzetu(teryt);
  const majatkoweNaOsobe = naMieszkanca(budzet.wydatki_majatkowe, ludnosc);
  const udzialWlasnych = budzet.dochody && budzet.dochody_wlasne !== null
    ? (100 * budzet.dochody_wlasne) / budzet.dochody
    : null;
  const udzialMajatkowych = budzet.wydatki && budzet.wydatki_majatkowe !== null
    ? (100 * budzet.wydatki_majatkowe) / budzet.wydatki
    : null;
  return (
    <section className="mt-14">
      <h2 className="szryft text-3xl font-semibold">{`Budżet gminy — ${budzet.rok}`}</h2>
      <p className="mt-2 max-w-3xl text-atrament-2">
        {dzielnica
          ? 'Dzielnice nie mają osobnych budżetów — pokazujemy budżet całej Warszawy.'
          : 'Ile gmina miała pieniędzy, ile z tego wypracowała sama i ile przeznaczyła na inwestycje.'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold">{zlote(naOsobe)}</p>
          <p className="mt-1 text-sm font-medium">dochodów na mieszkańca</p>
          <p className="mt-0.5 text-xs text-atrament-2">{`w sumie ${zlote(budzet.dochody)}`}</p>
          <p className="mt-3 border-t border-kreska pt-3 text-xs text-atrament-2">
            {mediana
              ? `mediana w województwie (${zOdmiana(mediana.gmin, 'gmina', 'gminy', 'gmin')}): ${zlote(mediana.dochodyNaOsobe)}`
              : `wydatki ogółem: ${zlote(budzet.wydatki)}`}
          </p>
        </div>

        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold">{udzialWlasnych === null ? '—' : `${Math.round(udzialWlasnych)}%`}</p>
          <p className="mt-1 text-sm font-medium">dochodów to dochody własne</p>
          <p className="mt-0.5 text-xs text-atrament-2">{`podatki i opłaty gminy: ${zlote(budzet.dochody_wlasne)}`}</p>
          {/*
            Reszta to subwencje i dotacje z budzetu panstwa. Nie nazywamy tego
            "samodzielnoscia" ani "uzaleznieniem" — to ocena, a my podajemy udzial.
          */}
          <p className="mt-3 border-t border-kreska pt-3 text-xs text-atrament-2">
            {mediana
              ? `resztę stanowią subwencje i dotacje · mediana w województwie: ${Math.round(mediana.udzialWlasnych)}%`
              : 'resztę stanowią subwencje i dotacje'}
          </p>
        </div>

        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold">{zlote(majatkoweNaOsobe)}</p>
          <p className="mt-1 text-sm font-medium">wydatków majątkowych na mieszkańca</p>
          {/*
            "Majatkowe", nie "inwestycyjne": ta pozycja obejmuje tez dotacje
            inwestycyjne, np. dla spolki miejskiej budujacej metro. Sama czesc
            inwestycyjna jest wezsza i podajemy ja obok, zeby nazwa zgadzala sie
            z tym, co liczymy.
          */}
          <p className="mt-0.5 text-xs text-atrament-2">
            {`w sumie ${zlote(budzet.wydatki_majatkowe)}${rozniSie(budzet.wydatki_majatkowe, budzet.wydatki_inwestycyjne) ? `, z tego na inwestycje ${zlote(budzet.wydatki_inwestycyjne)}` : ''}`}
          </p>
          <p className="mt-3 border-t border-kreska pt-3 text-xs text-atrament-2">
            {udzialMajatkowych === null
              ? `wydatki ogółem: ${zlote(budzet.wydatki)}`
              : `${Math.round(udzialMajatkowych)}% wydatków gminy${mediana ? ` · mediana w województwie: ${zlote(mediana.majatkoweNaOsobe)} na mieszkańca` : ''}`}
          </p>
        </div>
      </div>

      {historia.length >= 2 ? (
        <div className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="font-medium">{`Rok po roku, ${historia[0]!.rok}–${historia[historia.length - 1]!.rok}`}</p>
          {/*
            Dwa osobne wykresy, nie jedna os: dochody sa kilka razy wieksze niz
            wydatki majatkowe i na wspolnej skali inwestycje wygladalyby na zero.
          */}
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SlupkiLat tytul="Dochody" wiersze={historia.map((h) => ({ rok: h.rok, wartosc: h.dochody }))} />
            <SlupkiLat tytul="Wydatki majątkowe" wiersze={historia.map((h) => ({ rok: h.rok, wartosc: h.wydatki_majatkowe }))} />
          </div>
          {/*
            Kwoty nominalne. Nie liczymy "realnego" wzrostu: wskaznik cen w BDL
            jest kwartalny i w nowej klasyfikacji, a korekta wlasna bylaby liczba
            wyprowadzona przez nas. Mowimy wprost, czego kwoty nie uwzgledniaja.
          */}
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-relaxed text-atrament-3">
            <span>Kwoty w cenach bieżących, bez korekty o inflację — złotówka sprzed kilku lat była warta więcej niż dzisiejsza.</span>
            <Zrodlo adres={ZRODLO_GUS_INFLACJA} etykieta="inflacja według GUS" />
          </p>
        </div>
      ) : null}

      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-atrament-3">
        <span>{`Źródło: GUS, Bank Danych Lokalnych, sprawozdania budżetowe gmin za ${historia.length >= 2 ? `lata ${historia[0]!.rok}–${historia[historia.length - 1]!.rok}` : `${budzet.rok} r.`}`}</span>
        <Zrodlo adres={ZRODLO_GUS_BUDZET} etykieta="Bank Danych Lokalnych" />
      </p>
    </section>
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
                <span className="text-atrament-2">{` · ${opisMediany(mediana)}: ${zlote(mediana.mediana)}`}</span>
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

function opisMediany(m: MedianaUe): string {
  return m.grupa === 'wojewodztwo'
    ? `mediana w województwie (${zOdmiana(m.jednostek, 'gmina', 'gminy', 'gmin')})`
    : `mediana miast na prawach powiatu (${zOdmiana(m.jednostek, 'miasto', 'miasta', 'miast')})`;
}

function PomocPubliczna({ pomoc }: { pomoc: ReturnType<typeof pomocGminy> }) {
  const r = pomoc.razem!;
  const z = pomoc.zrodlo!;
  const pobrano = pomoc.pobranie?.pobrano ?? null;
  // Prog kwotowy dziala tylko wtedy, gdy jest gdzie zlozyc sprzeciw.
  const progAktywny = Boolean(KONTAKT);
  const widoczna = (nazwa: string, maxEur: number | null) =>
    !nazwaDoPokazania(nazwa, { pomocEur: maxEur, progAktywny }).pominieta;
  const jawni = pomoc.beneficjenci.filter((b) => widoczna(b.nazwa, b.max_eur));
  // Liczymy po WSZYSTKICH beneficjentach, nie po pokazanej czolowce — inaczej
  // spolki spoza czolowki trafialy do "niewymienionych z nazwy".
  const ukrytych = pomoc.nazwyBeneficjentow.filter((n) => !widoczna(n.nazwa, n.max_eur)).length;
  return (
    <>
      {/*
        Dane z trybu przyrostowego to kilka dni dla calego kraju, a nie cala
        historia gminy. Suma bez tego zdania czytalaby sie jak "tyle pomocy
        dostaly firmy z tej gminy" — czyli falszywie.
      */}
      {z.rodzaj === 'dni' ? (
        <p className="mt-6 rounded-2xl border border-kreska bg-papier-3 p-4 text-sm leading-relaxed text-atrament-2">
          <span className="font-medium text-atrament">To nie jest cała historia tej gminy.</span>
          {` Pełnych danych jeszcze nie pobraliśmy — poniżej jest wyłącznie pomoc udzielona ${z.dni === 1 ? 'w jednym dniu, który pobraliśmy' : `w ${liczba(z.dni)} dniach, które pobraliśmy`} dla całego kraju (${dataSlownie(z.od)}${z.od === z.do ? '' : ` – ${dataSlownie(z.do)}`}).`}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold">{zlote(r.brutto)}</p>
          {/* Mianownik przy samej liczbie, nie tylko w ramce obok — to liczba,
              ktora ktos wytnie do udostepnienia. */}
          <p className="mt-1 text-sm font-medium">
            {z.rodzaj === 'dni' ? 'wartość pomocy brutto w pobranych dniach' : 'wartość pomocy brutto'}
          </p>
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
          <SlupkiLat tytul="Według roku udzielenia" wiersze={pomoc.lata.map((l) => ({ rok: l.rok, wartosc: l.brutto }))} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Zestawienie tytul="Na co" wiersze={pomoc.przeznaczenia} />
        {/* Udzielajacym bywa firma szkoleniowa osoby fizycznej (pomoc de minimis
            przy szkoleniach z funduszy UE) — ta sama regula co dla beneficjentow. */}
        <Zestawienie tytul="Kto udzielił" wiersze={pomoc.udzielajacy} ukrywajOsoby />
      </div>

      <div className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
        <p className="text-sm font-medium">Największe podmioty, które otrzymały pomoc</p>
        <ul className="mt-3 divide-y divide-kreska">
          {jawni.slice(0, 10).map((b) => (
            <li key={b.nip ?? b.nazwa} className="flex items-baseline gap-4 py-2 text-sm">
              <span className="min-w-0 flex-1">
                {b.nip ? (
                  <Link href={`/firma/${b.nip}`} className="hover:text-akcent hover:underline">{b.nazwa}</Link>
                ) : b.nazwa}
              </span>
              <span className="liczby shrink-0 text-xs text-atrament-3">{zOdmiana(b.przypadkow, 'przypadek', 'przypadki', 'przypadków')}</span>
              <span className="liczby w-24 shrink-0 text-right font-medium">{zlote(b.brutto)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-atrament-3">
          {`Pokazujemy podmioty, po których nazwie widać, że nie są osobą fizyczną (spółki, instytucje, organizacje)${progAktywny ? `, oraz te, których pojedyncza pomoc przekroczyła ${liczba(PROG_JAWNOSCI_EUR)} euro — tyle wynosi unijny próg publikowania pomocy indywidualnej` : ''}. ${zOdmiana(ukrytych, 'beneficjenta', 'beneficjentów', 'beneficjentów')} z ${liczba(r.beneficjentow)} nie wymieniamy z nazwy, bo może to być osoba prowadząca działalność na własne nazwisko.`}
        </p>
        {progAktywny ? (
          <p className="mt-2 text-xs leading-relaxed text-atrament-3">
            {`Jeśli jesteś osobą, której nazwisko tu widać, i nie chcesz tego — napisz na ${KONTAKT}. Usuniemy je bez pytania o powód.`}
          </p>
        ) : null}
      </div>

      <WarunkiSudop pobrano={pobrano} />
    </>
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
