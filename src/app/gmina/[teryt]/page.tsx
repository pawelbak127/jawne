import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, budzetGminy, funduszeGminy, funduszeGminyLata, gminaPelna, historiaBudzetu, kluby, ludnoscWarszawy,
  medianaPomocyNaMieszkanca, medianaUeNaMieszkanca, najwiekszeProjektyGminy, organyPomocy, pomocGminy, porownanieBudzetu,
  poslowieOkregu, smupGminy, TERYT_WARSZAWY, wydatkiDzialami, zamowieniaGminy, zrodloImportu,
  type BudzetGminy, type FunduszeWOkresie, type FunduszeWRoku, type MedianaUe, type WartoscSmup, type WydatkiDzialami,
  type ZamowieniaGminy,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { opisGminy } from '@/lib/wyszukiwanie';
import { nazwaDoPokazania, PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { KONTAKT } from '@/lib/adres';
import { PROG_PODEJRZANEJ_KWOTY } from '@/lib/zamowienia';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { OPIS_KATEGORII } from '@/lib/formy-pomocy';
import { SlupkiLat } from '@/components/SlupkiLat';
import { Zestawienie } from '@/components/Zestawienie';
import { Dzial, ListaPaskow, Okruszek, Podstawa, Uwaga, Wiecej, Wiersz, Wiersze, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import { Zgadnij } from '@/components/Zgadnij';
import { zdaniePorownania } from '@/lib/porownanie';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ teryt: string }[]> {
  return [];
}

/*
 * Ile pozycji listy widac od razu; reszta pod „Pokaż wszystkie N ↓”.
 * ZMIERZONE 08.10.2026: z pelnymi listami (organy, dzialy wydatkow, SMUP,
 * projekty, zamowienia) strona Krakowa miala na telefonie 31,8 tys. px,
 * a Belchatowa 53 tys. px — badania-ux.md §5: 74% uwagi na dwoch ekranach.
 */
const NA_WIERZCHU = 5;

const ZRODLO_FE_2127 = 'https://dane.gov.pl/pl/dataset/13939';
const ZRODLO_FE_1420 = 'https://dane.gov.pl/pl/dataset/1176';
const ZRODLO_GUS = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/zmienna/72305';
const ZRODLO_GUS_BUDZET = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/temat/G423';
const ZRODLO_SMUP = 'https://smup.gov.pl';
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
  const funduszeLata = funduszeGminyLata(terytFunduszy);
  const projekty = najwiekszeProjektyGminy(terytFunduszy, 8);
  // Warszawa jest w SUDOP jednym miastem (146501), a jej dzielnice maja wlasne
  // kody — wszystkie trzymamy pod miastem, tak jak fundusze UE i budzet.
  const pomoc = pomocGminy(terytFunduszy);
  const organy = organyPomocy(terytFunduszy);
  // Warszawa ma w BDL jeden budzet, nie 18 dzielnicowych — jak przy funduszach.
  const budzet = budzetGminy(terytFunduszy);
  // Warszawa ma w SMUP jedna jednostke (146501) — dzielnica dostaje miasto.
  const smup = smupGminy(terytFunduszy, g.wojewodztwo);
  const ludnoscDoPrzeliczen = dzielnica ? ludnoscWarszawy() : g.ludnosc;
  const poslowie = poslowieOkregu(g.okreg_nr).filter((p) => p.aktywny === 1);
  const listaKlubow = kluby();
  const importFe = zrodloImportu('fundusze-2021-2027');
  const zamowienia = zamowieniaGminy(terytFunduszy);
  const importTed = zrodloImportu('zamowienia');
  const importRegon = zrodloImportu('regon');

  /* ---- liczby do „W liczbach” i do naglowkow dzialow (F1, F7, F8, F9) ---- */
  const dochodyNaOsobe = budzet ? naMieszkanca(budzet.dochody, ludnoscDoPrzeliczen) : null;
  const medianaBudzetu = budzet && ludnoscDoPrzeliczen ? porownanieBudzetu(g.wojewodztwo, budzet.rok) : null;
  const ue2127 = fundusze.find((f) => f.okres === '2021-2027') ?? null;
  const ueNaOsobe = ue2127 ? naMieszkanca(ue2127.tylko_tu_ue ?? 0, ludnoscDoPrzeliczen) : null;
  const medianaUe = ue2127 && ludnoscDoPrzeliczen ? medianaUeNaMieszkanca(g.wojewodztwo, '2021-2027') : null;
  const jestPomoc = Boolean(pomoc.zrodlo && pomoc.razem);
  const pomocNaOsobe = jestPomoc ? naMieszkanca(pomoc.razem!.brutto, ludnoscDoPrzeliczen) : null;
  // Porownanie tylko w trybie dni: gmina z pelna 10-letnia historia nie ma
  // z kim sie porownac — reszta kraju ma kilkanascie dni (pulapka 35).
  const medianaPomocy = jestPomoc && pomoc.zrodlo!.rodzaj === 'dni' && ludnoscDoPrzeliczen
    ? medianaPomocyNaMieszkanca(g.wojewodztwo)
    : null;
  const miasto = /miasto/.test(g.rodzaj) || dzielnica;
  /*
   * KONCENTRACJA w „W liczbach”, nie dopiero w dziale. Uwaga z przegladu
   * 24.09.2026: „13,2 mld zl” w Belchatowie to w 97% jedna elektrownia,
   * a liczba „na mieszkanca” czyta sie jak opis calej gminy. Udzial liczony
   * z NAJWIEKSZEGO beneficjenta (a nie pierwszego z nazwa do pokazania);
   * nazwa tylko wtedy, gdy wolno ja pokazac (zasada 7).
   */
  const najwiekszy = jestPomoc ? pomoc.beneficjenci[0] ?? null : null;
  const udzialNajwiekszego = najwiekszy?.brutto && pomoc.razem?.brutto ? najwiekszy.brutto / pomoc.razem.brutto : 0;
  const nazwaNajwiekszego = najwiekszy && !nazwaDoPokazania(najwiekszy.nazwa, {
    pomocEur: najwiekszy.max_eur, progAktywny: Boolean(KONTAKT), typRegon: najwiekszy.typ_regon,
  }).pominieta ? najwiekszy.nazwa : null;
  const zdanieKoncentracji = udzialNajwiekszego >= 0.25
    ? `${Math.round(100 * udzialNajwiekszego)}% tej kwoty trafiło do jednego podmiotu${nazwaNajwiekszego ? `: ${skroc(nazwaNajwiekszego, 70)}` : ''}`.replace(/…?$/, (k) => k || '.')
    : null;
  const czyje = miasto ? 'miasta' : 'gminy';

  const pliki = ([
    ['budzet', 'budżet rok po roku', Boolean(budzet)],
    ['fundusze', 'projekty unijne', fundusze.some((f) => f.tylko_tu || f.wspolnych)],
    ['pomoc', 'pomoc publiczna', jestPomoc],
  ] as const).filter(([, , jest]) => jest);

  const dzialy: { id: string; nazwa: string }[] = [
    ...(budzet ? [{ id: 'budzet', nazwa: 'Budżet' }] : []),
    ...(smup.length ? [{ id: 'finanse', nazwa: 'Finanse i podatki' }] : []),
    { id: 'fundusze', nazwa: 'Fundusze UE' },
    { id: 'pomoc', nazwa: 'Pomoc publiczna' },
    ...(zamowienia.ogloszen ? [{ id: 'zamowienia', nazwa: 'Zamówienia' }] : []),
    { id: 'dane', nazwa: 'Dane do pobrania' },
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  const dlug = smup.find((w) => w.klucz === 'dlug' && w.wartosc !== null && w.jednostka === 'zl_na_mieszkanca');

  return (
    <>
      <div className="obszar">
        <Okruszek
          ogniwa={[
            { nazwa: 'Pieniądze publiczne' },
            { adres: '/gminy', nazwa: 'Gminy', srodek: true },
            { adres: `/gminy/${adresWojewodztwa(g.wojewodztwo)}`, nazwa: `woj. ${g.wojewodztwo}` },
            { nazwa: nazwaWlasna(g) },
          ]}
        />
        <Wypis
          tytul={nazwaWlasna(g)}
          podtytul={`${opisGminy(g)}${g.ludnosc ? ` · ${liczba(g.ludnosc)} mieszkańców (GUS, koniec ${g.ludnosc_rok} r.)` : ''}`}
        >
          {/* Liczba mieszkancow tez ma zrodlo (zasada 1) — jest mianownikiem
              kazdej kwoty „na mieszkanca” nizej. */}
          {g.ludnosc ? <p className="mt-1"><Podstawa adres={ZRODLO_GUS} nazwa="ludność: GUS BDL" data={g.ludnosc_rok ? String(g.ludnosc_rok) : null} /></p> : null}
        </Wypis>

        <WLiczbach
          tytul={`${nazwaWlasna(g)} w liczbach`}
          stopka={jestPomoc ? <WarunkiSudop pobrano={pomoc.pobranie?.pobrano ?? null} /> : null}
        >
          {budzet ? (
            <Wiersz
              duzy
              co={`Dochody ${czyje} na mieszkańca`}
              ile={zlote(dochodyNaOsobe)}
              zCzego={
                <>
                  {`${budzet.rok} r. · ${ludnoscDoPrzeliczen ? `${zlote(budzet.dochody)} ÷ ${liczba(ludnoscDoPrzeliczen)} mieszkańców` : `w sumie ${zlote(budzet.dochody)}`}`}
                  {medianaBudzetu ? ` · mediana w województwie (${zOdmiana(medianaBudzetu.gmin, 'gmina', 'gminy', 'gmin')}): ${zlote(medianaBudzetu.dochodyNaOsobe)}` : ''}
                  {dzielnica ? ' · cała Warszawa' : ''}
                  {' '}
                  <a href="#budzet">budżet ↓</a>
                </>
              }
              porownanie={zdaniePorownania(dochodyNaOsobe, medianaBudzetu?.dochodyNaOsobe ?? null, 'mediana w województwie')}
              podstawa={<Podstawa adres={ZRODLO_GUS_BUDZET} nazwa="GUS BDL" data={String(budzet.rok)} />}
            />
          ) : null}
          {ue2127 ? (
            <Wiersz
              duzy
              co="Dofinansowanie z UE na mieszkańca, 2021–2027"
              ile={ueNaOsobe === null ? null : zlote(ueNaOsobe)}
              zCzego={
                <>
                  {`${zlote(ue2127.tylko_tu_ue ?? 0)} w ${zOdmiana(ue2127.tylko_tu, 'projekcie realizowanym', 'projektach realizowanych', 'projektach realizowanych')} tylko tutaj`}
                  {medianaUe ? ` · ${opisMediany(medianaUe)}: ${zlote(medianaUe.mediana)}` : ''}
                  {' '}
                  <a href="#fundusze">fundusze UE ↓</a>
                </>
              }
              porownanie={zdaniePorownania(ueNaOsobe, medianaUe?.mediana ?? null, 'mediana w województwie')}
              podstawa={<Podstawa adres={ZRODLO_FE_2127} nazwa="lista projektów FE" data={importFe ? dataKrotko(importFe.kiedy) : null} />}
            />
          ) : null}
          {jestPomoc ? (
            <Wiersz
              duzy
              co="Pomoc publiczna dla firm stąd, na mieszkańca"
              ile={pomocNaOsobe === null ? zlote(pomoc.razem!.brutto) : zlote(pomocNaOsobe)}
              zCzego={
                <>
                  {pomoc.zrodlo!.rodzaj === 'dni'
                    ? <b>{`tylko z ${zOdmiana(pomoc.zrodlo!.dni, 'dnia pobranego', 'dni pobranych', 'dni pobranych')} dla całego kraju`}</b>
                    : <b>pełna historia z rejestru</b>}
                  {pomoc.zrodlo!.rodzaj === 'dni'
                    ? ` (${dataKrotko(pomoc.zrodlo!.od)}–${dataKrotko(pomoc.zrodlo!.do)}), nie z 10 lat`
                    : ` od ${dataKrotko(pomoc.zrodlo!.od)}`}
                  {` · ${zlote(pomoc.razem!.brutto)}${ludnoscDoPrzeliczen ? ` ÷ ${liczba(ludnoscDoPrzeliczen)} mieszkańców` : ''}`}
                  {` · ${zOdmiana(pomoc.razem!.przypadkow, 'przypadek', 'przypadki', 'przypadków')}`}
                  {medianaPomocy ? ` · mediana w województwie (${zOdmiana(medianaPomocy.jednostek, 'gmina', 'gminy', 'gmin')}): ${zlote(medianaPomocy.mediana)}` : ''}
                  {' '}
                  <a href="#pomoc">pomoc publiczna ↓</a>
                </>
              }
              porownanie={[zdaniePorownania(pomocNaOsobe, medianaPomocy?.mediana ?? null, 'mediana gmin województwa w tych samych dniach'), zdanieKoncentracji]
                .filter(Boolean).join(' ') || null}
              podstawa={<Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" data={pomoc.pobranie?.pobrano ? dataKrotko(pomoc.pobranie.pobrano) : null} />}
            />
          ) : null}
          <Wiersz
            co={`Posłowie z okręgu nr ${g.okreg_nr}${g.okreg_nazwa ? ` ${g.okreg_nazwa}` : ''}`}
            ile={liczba(poslowie.length)}
            zCzego={
              <>
                <span className="mb-2 flex flex-wrap gap-1.5">
                  {poslowie.map((p) => {
                    const k = listaKlubow.find((x) => x.id === p.klub_id);
                    return (
                      <Link key={p.slug} href={`/posel/${p.slug}`} title={`${p.imie_nazwisko} (${p.klub_id ?? 'bez klubu'})`} className="relative block">
                        <Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="maly" />
                        <span
                          className="miejsce-probka absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-papier-2"
                          style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                        />
                      </Link>
                    );
                  })}
                </span>
                <Link href={`/okreg/${g.okreg_nr}?gmina=${g.teryt}`}>{`wszyscy na stronie okręgu nr ${g.okreg_nr}`}</Link>
              </>
            }
            podstawa={<Podstawa adres="https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach" nazwa="PKW, wybory 2023" />}
          />
        </WLiczbach>

        {/* Stan danych i sygnatura — zaraz pod odpowiedzia (F13, Stanford 8). */}
        <p className="stan-danych">
          <span>{`TERYT ${g.teryt}`}</span>
          <span>{`okręg wyborczy nr ${g.okreg_nr}`}</span>
          <span>
            {'stan danych: '}
            {[
              g.ludnosc_rok ? `GUS ${budzet?.rok ?? g.ludnosc_rok}` : null,
              importFe ? `fundusze UE ${dataKrotko(importFe.kiedy)}` : null,
              pomoc.zrodlo?.rodzaj === 'dni' ? `SUDOP ${zOdmiana(pomoc.zrodlo.dni, 'dzień', 'dni', 'dni')} do ${dataKrotko(pomoc.zrodlo.do)}` : null,
              importTed ? `TED ${dataKrotko(importTed.kiedy)}` : null,
              importRegon ? `REGON ${dataKrotko(importRegon.kiedy)}` : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </p>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          {budzet ? (
            <Budzet
              nr={nr('budzet')}
              teryt={terytFunduszy}
              budzet={budzet}
              ludnosc={ludnoscDoPrzeliczen}
              mediana={medianaBudzetu}
              dzielnica={dzielnica}
              czyje={czyje}
            />
          ) : null}

          {smup.length ? <Smup nr={nr('finanse')} wartosci={smup} dzielnica={dzielnica} dlug={dlug ?? null} /> : null}

          <Dzial
            id="fundusze"
            nr={nr('fundusze')}
            tytul={ue2127 && ueNaOsobe !== null
              ? `Fundusze UE: ${zlote(ueNaOsobe)} na mieszkańca w latach 2021–2027`
              : 'Fundusze Europejskie'}
            metoda={
              <p>
                Liczymy projekty realizowane wyłącznie w tej gminie; projektów prowadzonych w kilku
                gminach nie dzielimy — podajemy ich liczbę. Dla lat 2014–2020 porównujemy z miastami
                na prawach powiatu, bo lista z tych lat podaje miejsce realizacji tylko do powiatu.
                Wykres lat pokazuje rok rozpoczęcia projektu, nie rok wydatku: rejestr podaje jedną
                kwotę na cały projekt.
              </p>
            }
          >
            {dzielnica ? (
              <p className="wstep">Lista ministerstwa nie rozpisuje projektów na dzielnice, więc pokazujemy całą Warszawę.</p>
            ) : null}
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              {fundusze.map((f) => (
                <KartaOkresu
                  key={f.okres}
                  f={f}
                  lata={funduszeLata.filter((l) => l.okres === f.okres)}
                  ludnosc={ludnoscDoPrzeliczen}
                  wojewodztwo={g.wojewodztwo}
                  tylkoPowiat={f.okres === '2014-2020' && !miastoPowiat && !dzielnica}
                />
              ))}
            </div>

            {projekty.length ? (
              <>
                <h3>{`${zlote(projekty[0]!.dofinansowanie_ue)} z UE na największy projekt realizowany tylko tutaj`}</h3>
                <ListaProjektow projekty={projekty.slice(0, 3)} />
                {projekty.length > 3 ? (
                  <Wiecej napis={`Pokaż ${zOdmiana(projekty.length, 'największy projekt', 'największe projekty', 'największych projektów')}`}>
                    <ListaProjektow projekty={projekty.slice(3)} />
                  </Wiecej>
                ) : null}
              </>
            ) : null}

            <p className="podpis-wykresu flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{`Źródło: listy projektów Ministerstwa Funduszy i Polityki Regionalnej${importFe ? `, pobrane ${dataSlownie(importFe.kiedy)}` : ''}.`}</span>
              <Podstawa adres={ZRODLO_FE_2127} nazwa="lista 2021–2027" />
              <Podstawa adres={ZRODLO_FE_1420} nazwa="lista 2014–2020" />
            </p>
          </Dzial>

          <Dzial
            id="pomoc"
            nr={nr('pomoc')}
            tytul={jestPomoc
              ? `Pomoc publiczna: ${pomocNaOsobe === null ? zlote(pomoc.razem!.brutto) : `${zlote(pomocNaOsobe)} na mieszkańca`} ${pomoc.zrodlo!.rodzaj === 'dni' ? `w ${zOdmiana(pomoc.zrodlo!.dni, 'pobranym dniu', 'pobranych dniach', 'pobranych dniach')}` : 'w pełnej historii'}`
              : 'Pomoc publiczna dla firm z tej gminy'}
            obok={<Podstawa adres="/pomoc-publiczna" nazwa="cała Polska" />}
            metoda={
              <ul>
                <li><b>Wartość brutto</b> to ekwiwalent dotacji: przy dotacji cała kwota, przy pożyczce lub gwarancji tylko korzyść z lepszych warunków — nie cała pożyczona suma.</li>
                <li>Dzień wliczamy dopiero wtedy, gdy pobraliśmy go co najmniej 14 dni po jego dacie — urzędy mają 7 dni na zgłoszenie pomocy.</li>
                <li>Mediana w województwie: pomoc dla firm z siedzibą w każdej gminie województwa ÷ jej mieszkańcy, w tych samych dniach. Gmina bez żadnego przypadku liczy się jako zero — dni są pobrane dla całego kraju.</li>
                <li>Rodzajów pomocy (dotacje, zwolnienia, ulgi w terminie, pożyczki) nie sumujemy w jedną kwotę organu — znaczą dla budżetu różne rzeczy.</li>
              </ul>
            }
          >
            <p className="wstep">
              Zwolnienia z podatków, dopłaty, preferencyjne pożyczki i pomoc de minimis udzielone
              przedsiębiorcom, którzy mają tu siedzibę — według systemu SUDOP prowadzonego przez UOKiK.
              {dzielnica ? ' Rejestr nie dzieli firm na dzielnice — pokazujemy całą Warszawę.' : ''}
            </p>
            {jestPomoc ? <PomocPubliczna pomoc={pomoc} /> : <BrakPomocy />}

            {organy.organy.length || organy.bezNazwy ? (
              <>
                <h3>{`Kto przyznał pomoc: ${zOdmiana(organy.organy.length + organy.bezNazwy, 'organ', 'organy', 'organów')}`}</h3>
                <p className="wstep">
                  Każda pomoc z rejestru ma organ, który ją przyznał — z liczbą decyzji i kwotą,
                  osobno dla każdego rodzaju pomocy.{' '}
                  {organy.pelna
                    ? 'Liczone z pełnej historii tej gminy w rejestrze — z tego samego zbioru, co liczby wyżej.'
                    : 'Liczone z tych samych dni, co liczby wyżej, czyli z dni już ustalonych.'}
                </p>
                <OrganyDecyzji organy={organy} />
              </>
            ) : null}
          </Dzial>

          {zamowienia.ogloszen ? (
            <ZamowieniaWGminie
              nr={nr('zamowienia')}
              z={zamowienia}
              dzielnica={dzielnica}
              pobrano={importTed?.kiedy ?? null}
              pobranoRegon={importRegon?.kiedy ?? null}
            />
          ) : null}

          {/*
            Dane do pobrania. Plik pokazuje dokladnie to, co strona: te same
            zakresy i ta sama regula nazw (src/app/gmina/[teryt]/csv/[zestaw]).
          */}
          <Dzial
            id="dane"
            nr={nr('dane')}
            tytul={`Dane do pobrania: ${zOdmiana(pliki.length, 'plik CSV', 'pliki CSV', 'plików CSV')}`}
          >
            <p className="wstep">Pliki pod polskiego Excela: średnik jako separator, przecinek dziesiętny, kodowanie UTF-8.</p>
            <p className="pliki">
              {pliki.map(([zestaw, opis]) => (
                <a key={zestaw} href={`/gmina/${g.teryt}/csv/${zestaw}`}>{`${opis} (CSV)`}</a>
              ))}
            </p>
          </Dzial>
        </div>
      </div>
    </>
  );
}

/**
 * Czy warto pokazac obie kwoty. W wiekszosci gmin wydatki majatkowe to w
 * calosci inwestycje — powtorzenie tej samej liczby tylko zaciemnia.
 */
function rozniSie(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && a > 0 && (a - b) / a > 0.01;
}

/**
 * Liczba dokladnie tak, jak podaje ja rejestr — z jego wlasna precyzja
 * i z jego wlasnym rozroznieniem zera od "mniej, niz umiemy zapisac".
 *
 * ZMIERZONE 22.09.2026: umorzenia sa podawane z czterema miejscami po
 * przecinku, wiec zaokraglenie do dwoch zamienialoby 0,0006 % w zero.
 * Z drugiej strony "0,0000 %" wyglada jak zero, a flaga 3 znaczy
 * "wartosc mniejsza niz przyjety format" — to nie to samo.
 */
function liczbaSmup(wartosc: number | null, jednostka: string, precyzja: number | null, flaga = 1): string {
  if (wartosc === null) return '—';
  const miejsc = precyzja ?? 0;
  const zapisz = (n: number) => (jednostka === 'zl_na_mieszkanca'
    ? zlote(n)
    : `${n.toLocaleString('pl-PL', { minimumFractionDigits: miejsc, maximumFractionDigits: miejsc })}%`);
  if (flaga === 3) return `poniżej ${zapisz(10 ** -miejsc)}`;
  // Flaga 2 to zmierzone zero ("zjawisko nie wystapilo") — piszemy je krotko.
  if (wartosc === 0) return jednostka === 'zl_na_mieszkanca' ? '0 zł' : '0%';
  return zapisz(wartosc);
}

const GRUPY_SMUP: { tytul: string; opis: string; klucze: string[] }[] = [
  {
    tytul: 'Budżet i dług',
    opis: 'Czy dochody bieżące pokrywają wydatki bieżące, ile gmina jest winna i na co idą jej pieniądze.',
    klucze: ['nadwyzka_operacyjna', 'wynik_budzetu', 'dlug', 'dlug_do_dochodow', 'udzial_majatkowych', 'pokrycie_majatkowych', 'udzial_wynagrodzen'],
  },
  {
    tytul: 'Podatek od nieruchomości',
    opis: 'Największy podatek, o którym decyduje sama gmina: ile przynosi, ile gmina z niego odpuszcza i ile nie wpływa.',
    klucze: ['pn_na_mieszkanca', 'pn_udzial', 'pn_obnizone_stawki', 'pn_zwolnienia_rady', 'pn_umorzenia_prawne', 'pn_umorzenia_fizyczne', 'pn_zaleglosci_prawne', 'pn_zaleglosci_fizyczne'],
  },
];

/**
 * Wskazniki z SMUP (GUS). Budzet z BDL mowi, ILE gmina wydala; te liczby
 * mowia, jak jej idzie. Kazda z mediana w wojewodztwie (zasada 9) i z rokiem,
 * bo zrodlo publikuje poszczegolne wskazniki w roznym tempie.
 */
function Smup({ nr, wartosci, dzielnica, dlug }: { nr: number; wartosci: WartoscSmup[]; dzielnica: boolean; dlug: WartoscSmup | null }) {
  const poKluczu = new Map(wartosci.map((w) => [w.klucz, w]));
  const brakujace = wartosci.some((w) => w.wartosc === null);
  return (
    <Dzial
      id="finanse"
      nr={nr}
      tytul={dlug ? `Finanse i podatki: dług ${liczbaSmup(dlug.wartosc, dlug.jednostka, dlug.precyzja, dlug.flaga)} na mieszkańca (${dlug.rok})` : 'Finanse i podatki'}
      obok={<Podstawa adres={ZRODLO_SMUP} nazwa="SMUP, GUS" />}
      metoda={
        <p>
          Wartości podane tak, jak publikuje je rejestr — z jego własną dokładnością.
          {brakujace ? ' Półpauza znaczy, że źródło nie podaje wartości (brak informacji albo tajemnica statystyczna), a nie że wynosi zero.' : ''}
          {' Mediana w województwie: połowa gmin ma więcej, połowa mniej — punkt odniesienia, nie ocena.'}
        </p>
      }
    >
      <p className="wstep">
        {dzielnica
          ? 'Dzielnice nie mają osobnych finansów — pokazujemy całą Warszawę.'
          : 'Te liczby mówią co innego niż budżet: nie ile gmina wydała, tylko czy ją na to stać i ile własnego podatku odpuszcza.'}
      </p>
      {GRUPY_SMUP.map((grupa) => {
        const wiersze = grupa.klucze.map((k) => poKluczu.get(k)).filter((w): w is WartoscSmup => Boolean(w));
        if (!wiersze.length) return null;
        return (
          <div key={grupa.tytul}>
            <h3>{grupa.tytul}</h3>
            <p className="wstep">{grupa.opis}</p>
            <WierszeSmup wiersze={wiersze.slice(0, 3)} />
            {wiersze.length > 3 ? (
              <Wiecej napis={`Pokaż wszystkie ${zOdmiana(wiersze.length, 'wskaźnik', 'wskaźniki', 'wskaźników')}`}>
                <WierszeSmup wiersze={wiersze.slice(3)} />
              </Wiecej>
            ) : null}
          </div>
        );
      })}
    </Dzial>
  );
}

function WierszeSmup({ wiersze }: { wiersze: WartoscSmup[] }) {
  return (
    <Wiersze>
      {wiersze.map((w) => (
        <Wiersz
          key={w.klucz}
          co={<span title={w.nazwy ?? undefined}>{w.etykieta}</span>}
          ile={liczbaSmup(w.wartosc, w.jednostka, w.precyzja, w.flaga)}
          zCzego={`${w.rok} r.${w.mediana !== null
            ? ` · mediana w województwie (${zOdmiana(w.gmin, 'gmina', 'gminy', 'gmin')}): ${liczbaSmup(w.mediana, w.jednostka, w.precyzja)}`
            : ''}`}
        />
      ))}
    </Wiersze>
  );
}

function Budzet({ nr, teryt, budzet, ludnosc, mediana, dzielnica, czyje }: {
  nr: number;
  teryt: string;
  budzet: BudzetGminy;
  ludnosc: number | null;
  mediana: ReturnType<typeof porownanieBudzetu>;
  dzielnica: boolean;
  czyje: string;
}) {
  const naOsobe = naMieszkanca(budzet.dochody, ludnosc);
  const historia = historiaBudzetu(teryt);
  const dzialy = wydatkiDzialami(teryt);
  const majatkoweNaOsobe = naMieszkanca(budzet.wydatki_majatkowe, ludnosc);
  const udzialWlasnych = budzet.dochody && budzet.dochody_wlasne !== null
    ? (100 * budzet.dochody_wlasne) / budzet.dochody
    : null;
  const udzialMajatkowych = budzet.wydatki && budzet.wydatki_majatkowe !== null
    ? (100 * budzet.wydatki_majatkowe) / budzet.wydatki
    : null;
  const oswiata = dzialy?.pozycje.find((p) => p.dzial === '801') ?? null;
  const podstawaGus = <Podstawa adres={ZRODLO_GUS_BUDZET} nazwa="GUS BDL" data={String(budzet.rok)} />;
  return (
    <Dzial
      id="budzet"
      nr={nr}
      tytul={naOsobe !== null
        ? `Budżet ${budzet.rok}: ${zlote(naOsobe)} dochodów na mieszkańca`
        : `Budżet ${budzet.rok}: ${zlote(budzet.dochody)} dochodów`}
      metoda={
        /*
          ZGLOSZENIE PAWLA 24.09.2026: „mam 14,0 tys. zl dochodu na mieszkanca,
          ale nie wiem, co wchodzi w ten dochod". Liczba bez definicji nie jest
          informacja — definicja stoi w „Jak to liczymy" tego dzialu.
        */
        <>
          <ul>
            <li>
              <b>Dochody</b> to wszystko, co w roku wpłynęło do budżetu: dochody własne (podatek od
              nieruchomości, rolny, leśny i od środków transportowych, opłaty lokalne, dochody
              z majątku, udział w PIT i CIT mieszkańców i firm), subwencja ogólna z budżetu państwa
              (jej największa część idzie na oświatę) i dotacje celowe. Kredyty i obligacje nie są
              dochodem.
            </li>
            <li>
              <b>Wydatki majątkowe</b> obejmują też dotacje inwestycyjne (np. dla spółki miejskiej),
              dlatego są szersze niż same inwestycje — podajemy obie kwoty, gdy się różnią.
            </li>
            <li><b>Mediana w województwie</b> — połowa gmin ma więcej, połowa mniej. Punkt odniesienia, nie ocena.</li>
            <li>Kwoty w cenach bieżących, bez korekty o inflację — złotówka sprzed kilku lat była warta więcej niż dzisiejsza.</li>
            <li>„Pozostałe działy” w wydatkach to różnica wobec wydatków ogółem, a nie brak danych.</li>
          </ul>
          <p className="flex flex-wrap gap-x-4">
            <Podstawa adres={ZRODLO_GUS_BUDZET} nazwa="Bank Danych Lokalnych, budżety gmin" />
            <Podstawa adres={ZRODLO_GUS_INFLACJA} nazwa="inflacja według GUS" />
          </p>
        </>
      }
    >
      {dzielnica ? <p className="wstep">Dzielnice nie mają osobnych budżetów — pokazujemy budżet całej Warszawy.</p> : null}
      <Wiersze>
        <Wiersz
          co="Dochody ogółem"
          ile={zlote(budzet.dochody)}
          zCzego={udzialWlasnych === null
            ? `wydatki ogółem: ${zlote(budzet.wydatki)}`
            /* Nie „samodzielnosc" ani „uzaleznienie" — to ocena, a my podajemy udzial. */
            : `w tym dochody własne ${Math.round(udzialWlasnych)}% (${zlote(budzet.dochody_wlasne)})${mediana ? ` · mediana w województwie: ${Math.round(mediana.udzialWlasnych)}%` : ''}`}
          podstawa={podstawaGus}
        />
        <Wiersz
          co="Wydatki majątkowe na mieszkańca"
          ile={zlote(majatkoweNaOsobe)}
          zCzego={`${zlote(budzet.wydatki_majatkowe)}${rozniSie(budzet.wydatki_majatkowe, budzet.wydatki_inwestycyjne) ? `, z tego na inwestycje ${zlote(budzet.wydatki_inwestycyjne)}` : ''}${udzialMajatkowych === null ? '' : ` · ${Math.round(udzialMajatkowych)}% wydatków`}${mediana ? ` · mediana w województwie: ${zlote(mediana.majatkoweNaOsobe)}` : ''}`}
          porownanie={zdaniePorownania(majatkoweNaOsobe, mediana?.majatkoweNaOsobe ?? null, 'mediana w województwie')}
          podstawa={podstawaGus}
        />
      </Wiersze>

      {budzet.subwencja !== null || budzet.dotacje !== null ? <SkladDochodow budzet={budzet} czyje={czyje} /> : null}

      {oswiata && dzialy ? (
        <Zgadnij
          id="zgadnij-oswiata"
          pytanie={`Jak myślisz: jaka część wydatków ${czyje} idzie na oświatę?`}
          prawda={Math.round(1000 * oswiata.udzial) / 10}
          odpowiedz={
            <>
              <p>
                <b>{`${(100 * oswiata.udzial).toFixed(1).replace('.', ',')}%`}</b>
                {` — ${zlote(oswiata.kwota)} z ${zlote(dzialy.ogolem)} wydatków w ${dzialy.rok} r.${ludnosc ? `, czyli ${zlote(Math.round(oswiata.kwota / ludnosc))} na mieszkańca` : ''}.`}
              </p>
              <p><Podstawa adres={ZRODLO_GUS_BUDZET} nazwa="GUS BDL, wydatki według działów" data={String(dzialy.rok)} /></p>
            </>
          }
        />
      ) : null}

      {dzialy ? <NaCoWydaje dzialy={dzialy} ludnosc={ludnosc} /> : null}

      {historia.length >= 2 ? (
        <>
          <h3 className="tytul-wykresu">
            {`Dochody: ${zlote(historia[0]!.dochody)} w ${historia[0]!.rok} r. i ${zlote(historia[historia.length - 1]!.dochody)} w ${historia[historia.length - 1]!.rok} r.`}
          </h3>
          {/*
            Dwa osobne wykresy, nie jedna os: dochody sa kilka razy wieksze niz
            wydatki majatkowe i na wspolnej skali inwestycje wygladalyby na zero.
          */}
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SlupkiLat tytul="Dochody" wiersze={historia.map((h) => ({ rok: h.rok, wartosc: h.dochody }))} />
            <SlupkiLat tytul="Wydatki majątkowe" wiersze={historia.map((h) => ({ rok: h.rok, wartosc: h.wydatki_majatkowe }))} />
          </div>
          <p className="podpis-wykresu">Kwoty w cenach bieżących, bez korekty o inflację.</p>
        </>
      ) : null}
    </Dzial>
  );
}

/**
 * Na co gmina wydaje — dzialy klasyfikacji budzetowej.
 *
 * Pasek jest proporcja, nie ocena: nie ma "za duzo na administracje".
 * Suma ma sie zgadzac do stu, dlatego ostatnia pozycja to zawsze
 * "pozostale dzialy" policzone jako roznica wobec wydatkow ogolem.
 */
function NaCoWydaje({ dzialy, ludnosc }: { dzialy: WydatkiDzialami; ludnosc: number | null }) {
  const naOsobe = (kwota: number) => (ludnosc ? ` · ${zlote(Math.round(kwota / ludnosc))} na mieszk.` : '');
  const wiersze = [
    ...dzialy.pozycje,
    ...(dzialy.pozostale > 0
      ? [{ dzial: 'pozostale', nazwa: 'Pozostałe działy', kwota: dzialy.pozostale, udzial: dzialy.pozostale / dzialy.ogolem }]
      : []),
  ];
  const pierwszy = dzialy.pozycje[0];
  const pozycje = wiersze.map((w) => ({
    klucz: w.dzial,
    nazwa: w.nazwa,
    opis: `${(100 * w.udzial).toFixed(1).replace('.', ',')}% · ${zlote(w.kwota)}${naOsobe(w.kwota)}`,
    udzial: w.udzial,
    blady: w.dzial === 'pozostale',
  }));
  const podpis = `Działy klasyfikacji budżetowej — tej samej, którą gmina ma w uchwale budżetowej. Wydatki ogółem: ${zlote(dzialy.ogolem)}.`;
  return (
    <>
      <ListaPaskow
        tytul={pierwszy
          ? `Najwięcej, ${(100 * pierwszy.udzial).toFixed(1).replace('.', ',')}% wydatków ${dzialy.rok} r., idzie na: ${pierwszy.nazwa.toLowerCase()}`
          : `Na co gmina wydaje — ${dzialy.rok}`}
        pozycje={pozycje.slice(0, NA_WIERZCHU)}
        podpis={pozycje.length > NA_WIERZCHU ? undefined : podpis}
      />
      {pozycje.length > NA_WIERZCHU ? (
        <Wiecej napis={`Pokaż wszystkie ${zOdmiana(pozycje.length, 'dział', 'działy', 'działów')} wydatków`}>
          <ListaPaskow pozycje={pozycje.slice(NA_WIERZCHU)} podpis={podpis} />
        </Wiecej>
      ) : null}
    </>
  );
}

function KartaOkresu({ f, lata, ludnosc, wojewodztwo, tylkoPowiat }: {
  f: FunduszeWOkresie;
  lata: FunduszeWRoku[];
  ludnosc: number | null;
  wojewodztwo: string;
  tylkoPowiat: boolean;
}) {
  const naOsobe = naMieszkanca(f.tylko_tu_ue, ludnosc);
  const mediana = ludnosc ? medianaUeNaMieszkanca(wojewodztwo, f.okres) : null;
  return (
    <div className="border-t-2 border-atrament pt-4">
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
          {/*
            Os lat (03.10.2026). Tylko gdy lat jest co najmniej dwa — jeden
            slupek niczego nie porownuje. ROK ROZPOCZECIA, nie rok wydatku:
            rejestr podaje jedna kwote na caly projekt, wiec rozlozenie jej
            na lata trwania byloby naszym wymyslem — i podpis to mowi.
          */}
          {lata.length >= 2 ? (
            <div className="mt-5 border-t border-kreska pt-4">
              <SlupkiLat
                tytul="Dofinansowanie według roku rozpoczęcia projektu"
                wiersze={lata.map((l) => ({ rok: l.rok, wartosc: l.tylko_tu_ue }))}
              />
              <p className="mt-2 text-xs leading-relaxed text-atrament-3">
                {`Rok, w którym projekt ruszył, a nie rok wydatku: rejestr podaje jedną kwotę na cały projekt. Te same ${zOdmiana(f.tylko_tu, 'projekt', 'projekty', 'projektów')} co wyżej, bez wspólnych z innymi gminami.`}
              </p>
            </div>
          ) : null}
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
  // `typRegon` NIE jest opcjonalny: bez niego ta strona odpowiadala inaczej
  // niz `/firma/[nip]` na pytanie o te sama firme (48 nazw pokazywanych tu
  // mimo ze tam chowane, 350 odwrotnie — zmierzone 01.10.2026).
  const widoczna = (nazwa: string, maxEur: number | null, typRegon: string | null) =>
    !nazwaDoPokazania(nazwa, { pomocEur: maxEur, progAktywny, typRegon }).pominieta;
  const jawni = pomoc.beneficjenci.filter((b) => widoczna(b.nazwa, b.max_eur, b.typ_regon));
  // Liczymy po WSZYSTKICH beneficjentach, nie po pokazanej czolowce — inaczej
  // spolki spoza czolowki trafialy do "niewymienionych z nazwy".
  const ukrytych = pomoc.nazwyBeneficjentow.filter((n) => !widoczna(n.nazwa, n.max_eur, n.typ_regon)).length;
  return (
    <>
      {/*
        Dane z trybu przyrostowego to kilka dni dla calego kraju, a nie cala
        historia gminy. Suma bez tego zdania czytalaby sie jak "tyle pomocy
        dostaly firmy z tej gminy" — czyli falszywie.
      */}
      {z.rodzaj === 'dni' ? (
        <p className="uwaga text-atrament-2">
          <span className="font-medium text-atrament">To nie jest cała historia tej gminy.</span>
          {` Pełnych danych jeszcze nie pobraliśmy — poniżej jest wyłącznie pomoc udzielona ${z.dni === 1 ? 'w jednym dniu, który pobraliśmy' : `w ${liczba(z.dni)} dniach, które pobraliśmy`} dla całego kraju (${dataSlownie(z.od)}${z.od === z.do ? '' : ` – ${dataSlownie(z.do)}`}).`}
        </p>
      ) : (
        /*
          Ostrzezenie ODWROTNE, dopisane po przegladzie 24.09.2026. Gminy
          pokazowe maja pelne dziesiec lat, reszta kraju kilkanascie dni —
          bez tego zdania Belchatow (13,2 mld zl) wygladal na tysiac razy
          hojniej obdarowany niz Gdansk (9 mln zl), a roznica jest w tym,
          ile zdazylismy pobrac, nie w pieniadzach.
        */
        <p className="uwaga text-atrament-2">
          <span className="font-medium text-atrament">Ta gmina ma pełne dziesięć lat danych.</span>
          {' Jest jedną z kilku, dla których pobraliśmy całą historię z rejestru — w pozostałych'}
          {' gminach mamy na razie tylko dni pobrane dla całego kraju, więc '}
          <span className="font-medium text-atrament">tych kwot nie da się porównywać między gminami</span>
          {'. Co już pobraliśmy, widać na stronie '}
          <Link href="/stan" className="text-akcent underline underline-offset-4 hover:no-underline">stanu danych</Link>.
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="border-t-2 border-atrament pt-4">
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
            <summary className="min-h-11 cursor-pointer py-2 font-medium text-atrament">Co znaczy „wartość brutto”</summary>
            <p className="mt-2">
              To ekwiwalent dotacji brutto, czyli tyle, ile pomoc jest warta dla firmy. Przy dotacji
              to cała kwota, ale przy pożyczce czy gwarancji tylko korzyść z lepszych warunków —
              nie cała pożyczona suma. Dlatego sumujemy wartość brutto, a nie nominalną.
            </p>
          </details>
        </div>

        <div className="border-t-2 border-atrament pt-4">
          <SlupkiLat tytul="Według roku udzielenia" wiersze={pomoc.lata.map((l) => ({ rok: l.rok, wartosc: l.brutto }))} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Zestawienie tytul="Na co" wiersze={pomoc.przeznaczenia} />
        {/* Udzielajacym bywa firma szkoleniowa osoby fizycznej (pomoc de minimis
            przy szkoleniach z funduszy UE) — ta sama regula co dla beneficjentow. */}
        <Zestawienie tytul="Kto udzielił" wiersze={pomoc.udzielajacy} ukrywajOsoby />
      </div>

      {/*
        KONCENTRACJA. Uwaga z przegladu 24.09.2026: „13,2 mld zl" w Belchatowie
        to w 97% jedna elektrownia, a czytelnik dowiadywal sie tego dopiero
        cztery listy nizej. Jedna liczba potrafi opisywac jedna firme, a czyta
        sie jak opis calej gminy.
      */}
      {r.brutto && jawni[0]?.brutto && jawni[0].brutto / r.brutto >= 0.25 ? (
        <p className="uwaga text-atrament-2">
          {`Z tej kwoty ${Math.round((100 * jawni[0].brutto) / r.brutto)}% (${zlote(jawni[0].brutto)}) trafiło do jednego podmiotu: `}
          <span className="font-medium text-atrament">{skroc(jawni[0].nazwa, 70)}</span>
          {'. Reszta rozkłada się na pozostałych.'}
        </p>
      ) : null}

      <div className="mt-6 border-t-2 border-atrament pt-4">
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
        {/* Zdanie o regule tylko wtedy, gdy regula kogos ukryla — w trybie
            lokalnym bez filtra "0 beneficjentow nie wymieniamy" byloby szumem. */}
        {ukrytych ? (
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            {`Pokazujemy podmioty, po których nazwie widać, że nie są osobą fizyczną (spółki, instytucje, organizacje)${progAktywny ? `, oraz te, których pojedyncza pomoc przekroczyła ${liczba(PROG_JAWNOSCI_EUR)} euro — te same dane publikuje UOKiK w rejestrze SUDOP` : ''}. ${zOdmiana(ukrytych, 'beneficjenta', 'beneficjentów', 'beneficjentów')} z ${liczba(r.beneficjentow)} nie wymieniamy z nazwy, bo może to być osoba prowadząca działalność na własne nazwisko.`}
          </p>
        ) : null}
        {progAktywny ? (
          <p className="mt-2 text-xs leading-relaxed text-atrament-3">
            {'Jeśli jesteś osobą, której nazwisko tu widać, i nie chcesz tego — '}
            <Link href="/prywatnosc#kontakt" className="text-akcent underline underline-offset-4">napisz do nas</Link>
            {'. Usuniemy je bez pytania o powód.'}
          </p>
        ) : null}
      </div>

      <WarunkiSudop pobrano={pobrano} />
    </>
  );
}


/**
 * Kto podjal decyzje o pomocy dla firm z tej gminy.
 *
 * TRZY RZECZY, ktorych ten blok CELOWO nie robi:
 *
 *  1. **Nie sumuje kategorii w jedna liczbe.** Dotacja jest wydatkiem budzetu,
 *     zwolnienie — dochodem, ktorego nie pobrano, a rata — tylko korzyscia
 *     z odsetek (ok. 2 tys. zl na sprawe). Jedna suma „pomoc organu" bylaby
 *     bledem rzedu wielkosci, nie uproszczeniem.
 *  2. **Nie mowi „gmina wydala".** Mowi „organ podjal decyzje" — i to jest
 *     rozroznienie konieczne: prezydent miasta na prawach powiatu jest TAKZE
 *     starosta, wiec pod jego nazwa leza refundacje z Funduszu Pracy, czyli
 *     pieniadze panstwa. Rejestr tego nie rozdziela, wiec my tez nie udajemy,
 *     ze wiemy, czyja to kasa. Mowimy o decyzji, bo decyzja jest faktem.
 *  3. **Nie ocenia i nie szereguje organow miedzy gminami.** Kolejnosc jest
 *     tylko w obrebie tej gminy i tylko po liczbie decyzji (zasada 6).
 */
function OrganyDecyzji({ organy }: { organy: ReturnType<typeof organyPomocy> }) {
  return (
    <>
      <ListaOrganow organy={organy.organy.slice(0, NA_WIERZCHU)} />
      {organy.organy.length > NA_WIERZCHU ? (
        <Wiecej napis={`Pokaż wszystkie ${zOdmiana(organy.organy.length, 'organ', 'organy', 'organów')}`}>
          <ListaOrganow organy={organy.organy.slice(NA_WIERZCHU)} />
        </Wiecej>
      ) : null}
      {organy.bezNazwy ? (
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-atrament-2">
          {`Do tego ${zOdmiana(organy.bezNazwy, 'organ', 'organy', 'organów')}, których nazw nie pokazujemy, bo rejestr wskazuje osoby fizyczne — razem ${zOdmiana(organy.przypadkowBezNazwy, 'decyzja', 'decyzje', 'decyzji')}. Liczby zostają, nazwiska nie.`}
        </p>
      ) : null}
    </>
  );
}

function ListaOrganow({ organy }: { organy: ReturnType<typeof organyPomocy>['organy'] }) {
  return (
    <>
      <ul className="mt-4">
        {organy.map((o) => (
          <li
            key={o.nip}
            className={`py-4 ${o.wlasny ? 'border-t-4 border-akcent' : 'border-t border-kreska'}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {/* Nazwa byla do 02.10.2026 zwyklym tekstem, czyli slepa uliczka:
                  „a co ten organ robi w innych gminach" to pierwsze pytanie,
                  jakie sie ciśnie. Teraz prowadzi na strone organu. */}
              <Link
                href={`/organ/${o.nip}`}
                /* py-1 daje cel 30 px zamiast 22. Link jest dzieckiem
                   kontenera flex, wiec jest blokowany i padding POWIEKSZA
                   wiersz — zmierzony koszt to 8 px na organ, czyli ok. 600 px
                   na najwyzszej stronie serwisu (Zakopane, 44 164 px).
                   Tyle wolno: cel ponizej 24 px jest dla czesci czytelnikow
                   nietrafialny, a dodatkowy ekran przewijania to niewygoda. */
                className="py-1 leading-snug font-medium text-akcent underline underline-offset-4 hover:no-underline"
              >
                {o.nazwa}
              </Link>
              {o.wlasny ? (
                <p className="shrink-0 text-xs font-medium text-akcent">organ tej gminy</p>
              ) : null}
            </div>
            <p className="liczby mt-1 text-sm text-atrament-2">
              {zOdmiana(o.przypadkow, 'decyzja', 'decyzje', 'decyzji')}
            </p>
            <ul className="mt-3 space-y-2 border-t border-kreska pt-3">
              {o.kategorie.map((k) => (
                <li key={k.kategoria}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-sm font-medium">{OPIS_KATEGORII[k.kategoria].etykieta}</p>
                    <p className="liczby text-sm">
                      {`${zOdmiana(k.przypadkow, 'decyzja', 'decyzje', 'decyzji')} · ${
                        k.brutto === null ? 'bez kwoty w rejestrze' : zlote(k.brutto)
                      }`}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-atrament-3">
                    {OPIS_KATEGORII[k.kategoria].wyjasnienie}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}

function BrakPomocy() {
  return (
    <div className="uwaga text-atrament-2">
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

/**
 * Zamowienia publiczne udzielone przez podmioty z tej gminy.
 *
 * Inaczej niz na stronie firmy, TU kwota jest jednoznaczna: ogloszenie ma
 * jednego zamawiajacego, wiec cala jego wartosc to wydatek tego podmiotu.
 * Ale zamawiajacym bywa szpital, spolka komunalna albo uczelnia — a nie
 * urzad gminy, i strona musi to powiedziec, zeby nikt nie odczytal tego
 * jako „tyle wydala gmina".
 */
function ZamowieniaWGminie({ nr, z, dzielnica, pobrano, pobranoRegon }: {
  nr: number;
  z: ZamowieniaGminy;
  dzielnica: boolean;
  pobrano: string | null;
  /** Data pobrania REGON-u — GUS potwierdzil (30.09.2026), ze oznaczenie
      zrodla ma ja zawierac. To inny dzien niz pobranie ogloszen z TED. */
  pobranoRegon: string | null;
}) {
  return (
    <Dzial
      id="zamowienia"
      nr={nr}
      tytul={z.suma === null
        ? `Zamówienia publiczne: ${zOdmiana(z.ogloszen, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} od listopada 2023`
        : `Zamówienia publiczne: ${zlote(z.suma)} w ${zOdmiana(z.wSumie, 'ogłoszeniu', 'ogłoszeniach', 'ogłoszeniach')} od listopada 2023`}
      obok={<Podstawa adres="https://ted.europa.eu" nazwa="TED" data={pobrano ? dataKrotko(pobrano) : null} />}
      metoda={
        <p>
          {`Ogłoszenia o udzieleniu zamówienia od 13 listopada 2023 (początek kadencji)${pobrano ? `, dane pobrane ${dataSlownie(pobrano)}` : ''}. `}
          {'Siedzibę zamawiającego ustalamy po NIP-ie w rejestrze REGON '
            + `(Główny Urząd Statystyczny, licencja CC BY 4.0${pobranoRegon ? `, pobrany ${dataSlownie(pobranoRegon)}` : ''}). `}
          Kwota dotyczy całego ogłoszenia, ze wszystkimi częściami i wykonawcami. Do TED trafiają
          tylko zamówienia powyżej progów unijnych.
        </p>
      }
    >
      {/*
        Uwaga z przegladu 24.09.2026: „8,43 mld zl" przy rocznym budzecie
        Gdanska 6,05 mld zl czyta sie jak absurd. Nie jest — to sa wartosci
        CALYCH umow, czesto kilkuletnich. Zdanie stoi przy liczbie.
      */}
      <p className="wstep">
        Zamówienia instytucji z siedzibą w tej gminie — urzędu, ale też szpitala czy spółki
        komunalnej. <b className="text-atrament">To wartości całych umów, często wieloletnich, nie wydatek jednego roku.</b>
        {dzielnica ? ' Dzielnice nie mają osobnych zamawiających — pokazujemy całą Warszawę.' : ''}
      </p>
      <Wiersze>
        <Wiersz
          co="Wartość ogłoszeń w złotych"
          ile={z.suma === null ? null : zlote(z.suma)}
          zCzego={`z ${zOdmiana(z.wSumie, 'ogłoszenia', 'ogłoszeń', 'ogłoszeń')} z kwotą w złotych (z ${liczba(z.ogloszen)} razem${z.bezKwoty ? `; ${liczba(z.bezKwoty)} bez kwoty w złotych — poza sumą` : ''})`}
          podstawa={<Podstawa adres="https://ted.europa.eu" nazwa="TED" data={pobrano ? dataKrotko(pobrano) : null} />}
        />
      </Wiersze>

      {z.suma && z.najwieksze[0]?.wartosc && z.najwieksze[0].wartosc / z.suma >= 0.25 ? (
        <Uwaga naglowek={`${Math.round((100 * z.najwieksze[0].wartosc) / z.suma)}% sumy to jedno ogłoszenie.`}>
          {`${zlote(z.najwieksze[0].wartosc)}: „${skroc(z.najwieksze[0].tytul ?? '', 70)}”. Wartość obejmuje całą umowę, często wieloletnią.`}
        </Uwaga>
      ) : null}

      <ListaZamowien ogloszenia={z.najwieksze.slice(0, 3)} />
      {z.najwieksze.length > 3 ? (
        <Wiecej napis={`Pokaż ${zOdmiana(z.najwieksze.length, 'największe zamówienie', 'największe zamówienia', 'największych zamówień')}`}>
          <ListaZamowien ogloszenia={z.najwieksze.slice(3)} />
        </Wiecej>
      ) : null}

      {/*
        Bledne kwoty w rejestrze pokazujemy, zamiast je po cichu wyrzucac
        albo po cichu wliczac. Jedno takie ogloszenie (257 bln zl za utrzymanie
        torow) zamienialo sume Warszawy w bezsens.
      */}
      {z.podejrzane.length ? (
        <div className="uwaga">
          <b>{`Poza sumą: ${zOdmiana(z.podejrzane.length, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} z kwotą powyżej ${zlote(PROG_PODEJRZANEJ_KWOTY)}.`}</b>
          {' W rejestrze zdarzają się pomyłki o trzy rzędy wielkości. Nie poprawiamy ich i nie ukrywamy — nie wliczamy ich tylko do sumy. Próg jest nasz, nie rejestru.'}
          <ul className="mt-2 space-y-1">
            {z.podejrzane.map((o) => (
              <li key={o.numer} className="flex flex-wrap items-baseline gap-x-3">
                <a className="znak text-akcent underline underline-offset-4" href={`https://ted.europa.eu/pl/notice/${o.numer}/pdf`} target="_blank" rel="noreferrer">
                  {o.numer}
                </a>
                <span className="liczby text-sm text-atrament-2">{zlote(o.wartosc)}</span>
                {/* Na telefonie wlasny wiersz: `flex-1` w kontenerze flex-wrap
                    dawal tytulowi 120 px z potrzebnych 409 (zmierzone na 390 px). */}
                <span className="min-w-0 basis-full text-sm text-atrament-2 sm:basis-0 sm:flex-1">{skroc(o.tytul ?? '', 70)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Dzial>
  );
}

function ListaZamowien({ ogloszenia }: { ogloszenia: ZamowieniaGminy['najwieksze'] }) {
  return (
        <ul className="pozycje">
          {ogloszenia.map((o) => (
            <li key={o.numer}>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{skroc(o.tytul ?? 'bez tytułu w rejestrze', 120)}</p>
                <p className="meta">
                  {`${skroc(o.nabywca ?? '—', 80)} · ${dataKrotko(o.data)} · ogłoszenie `}
                  <span className="znak">{o.numer}</span>
                  {` · ${zOdmiana(o.wykonawcow, 'wykonawca', 'wykonawców', 'wykonawców')}`}
                </p>
              </div>
              <p className="kwota">
                {o.wartosc === null ? '—' : zlote(o.wartosc)}
                <small><a href={`https://ted.europa.eu/pl/notice/${o.numer}/pdf`} target="_blank" rel="noreferrer" className="text-akcent">ogłoszenie (PDF)</a></small>
              </p>
            </li>
          ))}
        </ul>
  );
}

function ListaProjektow({ projekty }: { projekty: ReturnType<typeof najwiekszeProjektyGminy> }) {
  return (
    <ul className="pozycje">
      {projekty.map((p) => {
        const b = nazwaDoPokazania(p.beneficjent);
        return (
          <li key={p.id}>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{skroc(p.tytul, 160)}</p>
              <p className={`meta ${b.pominieta ? 'italic' : ''}`}>
                {`${b.tekst} · ${p.okres}${p.program ? ` · ${skroc(p.program, 70)}` : ''}${p.poczatek ? ` · ${dataKrotko(p.poczatek)}–${dataKrotko(p.koniec)}` : ''}`}
              </p>
            </div>
            <p className="kwota">
              {zlote(p.dofinansowanie_ue)}
              <small>{`z UE, wartość ${zlote(p.wartosc)}`}</small>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Z czego SKLADAJA sie dochody gminy.
 *
 * ZGLOSZENIE PAWLA 24.09.2026: „nie wiem, skad sie wziela ta cyfra dochod na
 * mieszkanca". Liczba bez skladnikow jest nie do sprawdzenia. GUS publikuje
 * te skladniki osobno (BDL: dochody wlasne, subwencja ogolna, dotacje), wiec
 * pokazujemy je zamiast opowiadac o nich slowami.
 *
 * Udzialy w PIT i CIT oraz podatek od nieruchomosci sa CZESCIA dochodow
 * wlasnych, a nie osobnym skladnikiem obok nich — dlatego stoja wciete.
 * „Pozostale" to roznica do dochodow ogolem: GUS liczy je z innego
 * sprawozdania niz skladniki i suma nie zawsze schodzi sie co do zlotowki.
 */
function SkladDochodow({ budzet, czyje }: { budzet: BudzetGminy; czyje: string }) {
  const razem = budzet.dochody ?? 0;
  if (razem <= 0) return null;
  const glowne = [
    { nazwa: 'Dochody własne', kwota: budzet.dochody_wlasne },
    { nazwa: 'Subwencja ogólna z budżetu państwa', kwota: budzet.subwencja },
    { nazwa: 'Dotacje', kwota: budzet.dotacje },
  ].filter((p) => p.kwota !== null) as { nazwa: string; kwota: number }[];
  const suma = glowne.reduce((a, p) => a + p.kwota, 0);
  const reszta = razem - suma;
  const wSrodku = [
    { nazwa: 'w tym udział w podatku PIT', kwota: budzet.udzial_pit },
    { nazwa: 'w tym udział w podatku CIT', kwota: budzet.udzial_cit },
    { nazwa: 'w tym podatek od nieruchomości', kwota: budzet.podatek_nieruchomosc },
  ].filter((p) => p.kwota !== null) as { nazwa: string; kwota: number }[];
  const udzial = (k: number) => k / razem;
  const opis = (k: number) => `${((100 * k) / razem).toFixed(1).replace('.', ',')}% · ${zlote(k)}`;
  const wlasne = budzet.dochody_wlasne;
  const pozycje = glowne.flatMap((p) => [
    { klucz: p.nazwa, nazwa: p.nazwa, opis: opis(p.kwota), udzial: udzial(p.kwota) },
    ...(p.nazwa === 'Dochody własne'
      ? wSrodku.map((w) => ({ klucz: w.nazwa, nazwa: w.nazwa, opis: opis(w.kwota), udzial: udzial(w.kwota), wciete: true }))
      : []),
  ]);
  if (Math.abs(reszta) > razem * 0.005) {
    pozycje.push({ klucz: 'pozostale', nazwa: 'Pozostałe', opis: opis(Math.max(0, reszta)), udzial: udzial(Math.max(0, reszta)) });
  }
  return (
    <ListaPaskow
      tytul={wlasne !== null
        ? `${((100 * wlasne) / razem).toFixed(1).replace('.', ',')}% dochodów ${budzet.rok} r. to dochody własne ${czyje}`
        : `Z czego składają się dochody — ${budzet.rok}`}
      pozycje={pozycje}
      podpis="Pozycje wcięte są częścią dochodów własnych. Kredyty i obligacje nie są dochodem i nie ma ich w tej kwocie."
    />
  );
}
