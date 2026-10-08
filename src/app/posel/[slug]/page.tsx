import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, kluby, komisjePosla, obecnoscPosla, ostatnieGlosyPosla, porownanieZKlubem,
  posel, pytaniaPosla, slugiPoslow, statystykiPosla, wystapieniaPosla, zrodloImportu,
  type InterpelacjePosla, type RodzajPytan,
} from '@/lib/dane';
import { adresWystapienia, minutyWystapienia, opisCzasu } from '@/lib/stenogramy';
import { etykietaTypu } from '@/lib/komisje';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { MIN_RESZTY } from '@/lib/niezaleznosc';
import { stylGlosu } from '@/lib/barwy-glosu';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { dataKrotko, dataSlownie, liczba, procent, skroc, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Dzial, ListaPaskow, Okruszek, Podstawa, Uwaga, Wiecej, Wiersz, Wiersze, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import { opisGlosowania, opisJednaLinia } from '@/lib/opis-glosowania';
import { MIEJSCA } from '@/lib/plan-sali';
import { miejscePosla } from '@/lib/sala';

const REJESTR_GLOSOWAN = 'https://api.sejm.gov.pl/sejm/term10/votings';

export function generateStaticParams() {
  if (!bazaDostepna()) return [];
  return slugiPoslow().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return { title: 'Nie ma takiego posła' };
  return {
    title: p.imie_nazwisko,
    description: `${p.imie_nazwisko} — ${p.klub_id ?? 'bez klubu'}, okręg ${p.okreg_nazwa ?? '—'}. Jak głosował(a) w Sejmie X kadencji.`,
  };
}

/** Ile pozycji listy widac od razu; reszta pod „Pokaż …” (jak na stronie gminy). */
const NA_WIERZCHU = 3;

export default async function StronaPosla({ params }: { params: Promise<{ slug: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { slug } = await params;
  const p = posel(slug);
  if (!p) notFound();

  const staty = statystykiPosla(p.id);
  const ostatnie = ostatnieGlosyPosla(p.id, 10);
  const k = kluby().find((x) => x.id === p.klub_id);
  const adresRejestru = `https://www.sejm.gov.pl/sejm10.nsf/posel.xsp?id=${String(p.id).padStart(3, '0')}`;

  const porownanie = porownanieZKlubem(p.id);
  // Plan sali jest starszy niz sklad izby, wiec posel moze go nie miec.
  const miejsce = miejscePosla(MIEJSCA, p.id);
  const nieobecnosci = staty.rozklad.find((r) => r.glos === 'ABSENT')?.ile ?? 0;
  const obecnosc = obecnoscPosla(p.id);
  const interpelacje = pytaniaPosla('interpelacje', p.id, 5);
  const zapytania = pytaniaPosla('zapytania', p.id, 5);
  const wystapienia = wystapieniaPosla(p.id, 8);
  const komisje = komisjePosla(p.id);
  const komisjeZ = zrodloImportu('komisje');
  const glosyZ = zrodloImportu('glosy');
  const obecnoscZ = zrodloImportu('obecnosc');
  const udzial = staty.mianownik > 0 ? ((staty.mianownik - nieobecnosci) / staty.mianownik) * 100 : null;
  const jestPorownanie = Boolean(porownanie && porownanie.porownywalnych > 0);
  const jestPytan = interpelacje.wKadencji > 0 || zapytania.wKadencji > 0;
  const glosujacy = staty.mianownik > 0;

  const dzialy: { id: string; nazwa: string }[] = [
    ...(glosujacy && jestPorownanie ? [{ id: 'inaczej', nazwa: 'Inaczej niż klub' }] : []),
    ...(glosujacy ? [{ id: 'ostatnie', nazwa: 'Ostatnie głosowania' }, { id: 'rozklad', nazwa: 'Rozkład głosów' }] : []),
    ...(wystapienia ? [{ id: 'wystapienia', nazwa: 'Wystąpienia' }] : []),
    ...(komisje !== null ? [{ id: 'komisje', nazwa: 'Komisje' }] : []),
    ...(jestPytan ? [{ id: 'pytania', nazwa: 'Interpelacje i zapytania' }] : []),
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  const metryczka = ([
    ['Głosów w wyborach', p.glosow_w_wyborach ? liczba(p.glosow_w_wyborach) : null],
    ['Zawód', p.zawod],
    ['Wykształcenie', p.wyksztalcenie],
    /*
      MIEJSCE NA SALI jako jedna pozycja (04.10.2026, prosba Pawla:
      „duzo miejsca zajmuje, moze po prostu gdzie siedzi"). Do tego dnia
      strona posla rysowala cala sale — teraz cala sala jest na /sala,
      z tym poslem zaznaczonym.
    */
    ['Miejsce na sali', miejsce ? (
      <>
        {miejsce[1] === null ? 'numer nieodczytany' : `nr ${miejsce[1]}`}
        {' · '}
        <Link href={`/sala?posel=${p.id}`} className="text-akcent underline underline-offset-4 hover:no-underline">pokaż na planie sali</Link>
      </>
    ) : null],
    ['E-mail', p.email ? <a href={`mailto:${p.email}`} className="text-akcent underline underline-offset-4 hover:no-underline">{p.email}</a> : null],
  ] as const).filter(([, v]) => v);

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { adres: '/poslowie', nazwa: 'Posłowie' }, { nazwa: p.imie_nazwisko }]} />
        <Wypis
          tytul={p.imie_nazwisko}
          obraz={<Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="duzy" />}
          podtytul={
            <>
              {p.klub_id ? (
                <>
                  <span
                    className="miejsce-probka kropka"
                    style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                  />
                  {/* Kod rejestrowy jest krotki i rozpoznawalny; pelna nazwa
                      klubu miewa sto znakow, wiec idzie w podpowiedz i nizej. */}
                  <b className="text-atrament" title={k?.nazwa ?? undefined}>{p.klub_id}</b>
                </>
              ) : 'bez klubu'}
              {' · poseł X kadencji'}
              {p.okreg_nr ? (
                <>
                  {' z '}
                  <Link href={`/okreg/${p.okreg_nr}`}>{`okręgu nr ${p.okreg_nr}${p.okreg_nazwa ? ` ${p.okreg_nazwa}` : ''}`}</Link>
                </>
              ) : null}
              {p.aktywny === 0 ? ' · mandat wygasł' : ''}
            </>
          }
        />

        {/* Mandat wygasl — pokazujemy SUROWY powod z rejestru, bez interpretacji. */}
        {p.aktywny === 0 && p.przyczyna_wygasniecia ? (
          <Uwaga naglowek="Mandat wygasł.">
            {'Rejestr podaje przyczynę: '}
            <b>{p.przyczyna_wygasniecia}</b>
            {p.data_wygasniecia ? ` (${dataSlownie(p.data_wygasniecia)})` : ''}.
          </Uwaga>
        ) : null}

        {glosujacy ? (
          <WLiczbach tytul={`${p.imie_nazwisko} w liczbach`}>
            {porownanie && jestPorownanie ? (
              <Wiersz
                duzy
                co="Głosowania inaczej niż reszta klubu"
                ile={procent((porownanie.odmiennych / porownanie.porownywalnych) * 100)}
                zCzego={
                  <>
                    {/* Mianownik stoi obok procentu, nie w przypisie. */}
                    {`${liczba(porownanie.odmiennych)} z ${zOdmiana(porownanie.porownywalnych, 'porównywalnego głosowania', 'porównywalnych głosowań', 'porównywalnych głosowań')} (za, przeciw, wstrzymał się — nieobecność się nie liczy) `}
                    <a href="#inaczej">te głosowania ↓</a>
                  </>
                }
                podstawa={<Podstawa adres={REJESTR_GLOSOWAN} nazwa="rejestr głosowań" data={glosyZ ? dataKrotko(glosyZ.kiedy) : null} />}
              />
            ) : null}
            <Wiersz
              duzy
              co="Udział w głosowaniach"
              ile={procent(udzial)}
              zCzego={
                <>
                  {`${liczba(staty.mianownik - nieobecnosci)} z ${zOdmiana(staty.mianownik, 'głosowania', 'głosowań', 'głosowań')}, w których rejestr odnotował tego posła `}
                  <a href="#rozklad">rozkład głosów ↓</a>
                </>
              }
              podstawa={<Podstawa adres={REJESTR_GLOSOWAN} nazwa="rejestr głosowań" data={glosyZ ? dataKrotko(glosyZ.kiedy) : null} />}
            />
            {/*
              Rejestr MOWI, czy nieobecnosc byla usprawiedliwiona — i to
              jedyne miejsce w calym API, gdzie to podaje. Powodu nie podaje
              nigdy, wiec nadal go nie zgadujemy (regula 2).
              Liczymy DNI, nie glosowania: znacznik dotyczy calego dnia
              obrad, a przeliczanie go na pojedyncze glosowania byloby
              naszym wymyslem. Do tego dwa konce tego samego rejestru
              licza glosowania inaczej (patrz `obecnoscPosla` w dane.ts).
            */}
            {obecnosc && obecnosc.dniZNieobecnoscia > 0 ? (
              <Wiersz
                duzy
                co="Dni z nieobecnością uznane za usprawiedliwione"
                ile={`${liczba(obecnosc.dniUsprawiedliwione)} z ${liczba(obecnosc.dniZNieobecnoscia)}`}
                zCzego={
                  <>
                    {'Mianownik: dni obrad, w których posła zabrakło przy głosowaniu. Usprawiedliwienie dotyczy całego dnia, nie pojedynczego głosowania — dlatego liczymy dni. '}
                    <b>Rejestr nie podaje, dlaczego posła nie było</b>
                    {' — i my tego nie rozstrzygamy.'}
                  </>
                }
                podstawa={<Podstawa adres={`https://api.sejm.gov.pl/sejm/term10/MP/${p.id}/votings/stats`} nazwa="statystyka posła" data={obecnoscZ ? dataKrotko(obecnoscZ.kiedy) : null} />}
              />
            ) : null}
          </WLiczbach>
        ) : (
          <Uwaga naglowek="Brak głosów.">Nie mamy jeszcze zaimportowanych głosów imiennych dla tego posła.</Uwaga>
        )}

        {/* Stan danych i sygnatura — zaraz pod odpowiedzia (F13). */}
        <p className="stan-danych">
          {k?.nazwa ? <span>{k.nazwa}</span> : null}
          <span>
            {'stan danych: '}
            {[
              glosyZ ? `głosowania ${dataKrotko(glosyZ.kiedy)}` : null,
              obecnoscZ ? `obecność ${dataKrotko(obecnoscZ.kiedy)}` : null,
              komisjeZ ? `komisje ${dataKrotko(komisjeZ.kiedy)}` : null,
            ].filter(Boolean).join(' · ')}
          </span>
          <span><Podstawa adres={adresRejestru} nazwa="strona posła w Sejmie" /></span>
        </p>

        {metryczka.length ? (
          <details className="metoda">
            <summary>Metryczka posła</summary>
            <div className="tresc">
              <dl className="metryczka">
                {metryczka.map(([co, wartosc]) => (
                  <div key={co} className="contents">
                    <dt>{co}</dt>
                    <dd>{wartosc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        ) : null}
      </div>

      {dzialy.length ? (
        <div className="obszar z-spisem">
          <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
          <div className="dzialy">
            {glosujacy && porownanie && jestPorownanie ? (
              <Dzial
                id="inaczej"
                nr={nr('inaczej')}
                tytul={`Inaczej niż klub: ${liczba(porownanie.odmiennych)} z ${zOdmiana(porownanie.porownywalnych, 'głosowania', 'głosowań', 'głosowań')}`}
                metoda={
                  <ul>
                    <li>Porównujemy tylko głosy „za”, „przeciw” i „wstrzymał się”. Nieobecność nie jest stanowiskiem.</li>
                    <li>Punktem odniesienia jest najczęstszy głos pozostałych członków klubu — bez samego posła.</li>
                    <li>{`Głosowanie liczymy, gdy reszta klubu oddała co najmniej ${MIN_RESZTY} głosy i miała jeden wyraźnie najczęstszy głos. Przy remisie nie ma z czym porównać.`}</li>
                    <li>Posłowie niezrzeszeni nie tworzą klubu, więc ich głosów nie porównujemy.</li>
                    <li>Każdy głos porównujemy z klubem z dnia głosowania.</li>
                    <li>
                      Głos inny niż klub może wynikać z przekonań, z umowy w klubie albo z pomyłki
                      przy przycisku. Rejestr tego nie podaje — i my też tego nie rozstrzygamy.
                    </li>
                  </ul>
                }
              >
                {porownanie.kluby.length > 1 ? (
                  <p className="wstep">
                    {`W tym czasie należał(a) do klubów: ${porownanie.kluby.join(', ')}. Każdy głos porównujemy z klubem z dnia głosowania.`}
                  </p>
                ) : null}
                {porownanie.odstepstwa.length === 0 ? (
                  <p className="wstep">W żadnym z porównywalnych głosowań nie zagłosował(a) inaczej niż reszta klubu.</p>
                ) : (
                  <>
                    <ListaOdstepstw odstepstwa={porownanie.odstepstwa.slice(0, NA_WIERZCHU)} klub={p.klub_id} />
                    {porownanie.odstepstwa.length > NA_WIERZCHU ? (
                      <Wiecej napis={porownanie.odstepstwa.length > 8 ? 'Pokaż 8 najnowszych' : `Pokaż wszystkie ${porownanie.odstepstwa.length}`}>
                        <ListaOdstepstw odstepstwa={porownanie.odstepstwa.slice(NA_WIERZCHU, 8)} klub={p.klub_id} />
                      </Wiecej>
                    ) : null}
                    {porownanie.odstepstwa.length > 8 ? (
                      <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
                        {`Na stronie 8 najnowszych z ${liczba(porownanie.odstepstwa.length)}.`}
                      </p>
                    ) : null}
                  </>
                )}
              </Dzial>
            ) : null}

            {glosujacy ? (
              <Dzial
                id="ostatnie"
                nr={nr('ostatnie')}
                tytul={ostatnie.length ? `Ostatnie głosowania, od ${dataSlownie(ostatnie[ostatnie.length - 1].data)}` : 'Ostatnie głosowania'}
              >
                <p className="wstep">Wszystkie, także porządkowe — rodzaj głosowania przy każdym.</p>
                <ListaGlosow glosy={ostatnie.slice(0, NA_WIERZCHU)} />
                {ostatnie.length > NA_WIERZCHU ? (
                  <Wiecej napis={`Pokaż ${ostatnie.length} ostatnich`}>
                    <ListaGlosow glosy={ostatnie.slice(NA_WIERZCHU)} />
                  </Wiecej>
                ) : null}
              </Dzial>
            ) : null}

            {glosujacy ? (
              <Dzial
                id="rozklad"
                nr={nr('rozklad')}
                tytul={`Rozkład głosów w ${zOdmiana(staty.mianownik, 'głosowaniu', 'głosowaniach', 'głosowaniach')}`}
                obok={<Podstawa adres={REJESTR_GLOSOWAN} nazwa="rejestr głosowań" />}
                metoda={
                  <p>
                    Rejestr nie podaje, <i>dlaczego</i> posła nie było.
                    Wyjazd służbowy, choroba i nieobecność bez powodu wyglądają w danych
                    tak samo — więc nie rozstrzygamy tego za rejestr.
                  </p>
                }
              >
                <ListaPaskow
                  tytul={tytulRozkladu(staty.rozklad, staty.mianownik)}
                  pozycje={staty.rozklad.map((r) => ({
                    klucz: r.glos,
                    nazwa: <><span className="miejsce-probka kropka" style={stylGlosu(r.glos)} />{etykietaGlosu(r.glos).krotka}</>,
                    opis: `${liczba(r.ile)} · ${procent((r.ile / staty.mianownik) * 100)}`,
                    udzial: r.ile / staty.mianownik,
                    barwa: stylGlosu(r.glos),
                  }))}
                  podpis={`Na podstawie ${zOdmiana(staty.mianownik, 'głosowania', 'głosowań', 'głosowań')}, w których rejestr odnotował tego posła.`}
                />
              </Dzial>
            ) : null}

            {/*
              WYSTAPIENIA NA SALI (03.10.2026), ze stenogramow Sejmu.
              Mianownik to dni obrad w czasie mandatu, liczone z tego samego
              zrodla co licznik (patrz `wystapieniaPosla`). Zadnego rankingu
              i zadnego „lacznego czasu" (zasada 6) — lista z odnosnikiem do tresci.
              Tematu rejestr przy wystapieniu nie podaje, wiec go nie dopisujemy.
              Funkcja przy pozycji jest wazna: minister bedacy poslem ma ten sam
              identyfikator, wiec jego wystapienia ministerialne trafiaja tutaj.
            */}
            {wystapienia ? (
              <Dzial
                id="wystapienia"
                nr={nr('wystapienia')}
                tytul={`Wystąpienia: głos na sali w ${liczba(wystapienia.dniZGlosem)} z ${zOdmiana(wystapienia.dniObrad, 'dnia obrad', 'dni obrad', 'dni obrad')}`}
                metoda={
                  <p>
                    Rejestr nie podaje tematu wystąpienia — jest w treści pod odnośnikiem.
                    Wystąpienia złożone na piśmie dochodzą do stenogramu po dniu obrad,
                    więc dla ostatnich dni liczba może jeszcze urosnąć.
                  </p>
                }
              >
                <Wiersze>
                  <Wiersz
                    co="Dni obrad z głosem na sali"
                    ile={`${liczba(wystapienia.dniZGlosem)} z ${liczba(wystapienia.dniObrad)}`}
                    zCzego={
                      'dni obrad w czasie mandatu · '
                      + (wystapienia.ile === 0
                        ? 'rejestr nie odnotowuje w stenogramach żadnego wystąpienia'
                        : zOdmiana(wystapienia.ile, 'wystąpienie', 'wystąpienia', 'wystąpień')
                          + (wystapienia.naPismie ? `, w tym ${liczba(wystapienia.naPismie)} złożonych tylko na piśmie` : '')
                          + (wystapienia.jakoSekretarz ? `, ${liczba(wystapienia.jakoSekretarz)} jako sekretarz posiedzenia` : ''))
                    }
                    podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/proceedings" nazwa="stenogramy w rejestrze" />}
                  />
                </Wiersze>
                {wystapienia.ostatnie.length ? (
                  <>
                    <ListaWystapien wystapienia={wystapienia.ostatnie.slice(0, NA_WIERZCHU)} />
                    {wystapienia.ostatnie.length > NA_WIERZCHU ? (
                      <Wiecej napis={`Pokaż ${wystapienia.ostatnie.length} ostatnich`}>
                        <ListaWystapien wystapienia={wystapienia.ostatnie.slice(NA_WIERZCHU)} />
                      </Wiecej>
                    ) : null}
                  </>
                ) : null}
              </Dzial>
            ) : null}

            {/*
              KOMISJE (03.10.2026). Odpowiedz rejestru na „na czym komu zalezy"
              bez naszej klasyfikacji: posel sam wybral komisje, a jej zakres
              opisal urzad (to zdanie pod nazwa jest cytatem z rejestru).
              Tylko JEGO komisje — pelny sklad jest na /komisja/[kod] (pulapka 54).

              Trzy stany i kazdy mowi co innego (zasada 4):
               - tabeli nie ma            -> dzialu nie ma (brak danych to stan),
               - mandat wygasl            -> „nie mamy danych", NIE zero: rejestr
                                             podaje tylko BIEZACY sklad komisji,
               - mandat trwa, komisji 0   -> zmierzone zero, zdanie bez oceny
                                             i bez zgadywania powodu (zasady 2, 6).
            */}
            {komisje !== null ? (
              <Dzial
                id="komisje"
                nr={nr('komisje')}
                tytul={p.aktywny === 0 ? 'Komisje' : komisje.length === 0 ? 'Komisje: żadna' : `Komisje: ${liczba(komisje.length)}`}
                obok={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/committees" nazwa="skład komisji w rejestrze" />}
              >
                {p.aktywny === 0 ? (
                  <p className="wstep">
                    Rejestr podaje tylko bieżący skład komisji, więc dla posła z wygasłym
                    mandatem nie wiemy, w których zasiadał — to brak danych, a nie zero.
                  </p>
                ) : komisje.length === 0 ? (
                  <p className="wstep">Według rejestru Sejmu nie zasiada obecnie w żadnej komisji.</p>
                ) : (
                  <ul className="pozycje">
                    {komisje.map((c) => (
                      <li key={c.kod}>
                        <div className="min-w-0">
                          <Link href={`/komisja/${c.kod}`} className="tytul-poz">{c.nazwa}</Link>
                          <p className="meta">
                            <span className={c.funkcja ? 'font-semibold text-atrament' : undefined}>{c.funkcja ?? 'członek'}</span>
                            {c.od ? ` · od ${dataSlownie(c.od)}` : ''}
                          </p>
                          {c.zakres ? <p className="meta mt-1">{c.zakres}</p> : null}
                        </div>
                        <p className="meta">{etykietaTypu(c.typ)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
                  {`Skład według rejestru${komisjeZ?.kiedy ? ` z ${dataSlownie(komisjeZ.kiedy.slice(0, 10))}` : ''}. `}
                  Rejestr nie przechowuje historii: kto odszedł z komisji, znika z listy.
                </p>
              </Dzial>
            ) : null}

            {/*
              Interpelacje i zapytania poselskie — jeden dzial, dwa wiersze.
              Wiersz jest takze przy zerze: 58 poslow nie podpisalo zadnej
              interpelacji i ukrycie tego pokazywaloby niepelny obraz (regula 4 —
              zero jest zmierzone, regula 5 — nikogo nie chowamy). Powodu rejestr
              nie podaje, wiec go nie dopisujemy (regula 2).
              ALE gdy `wKadencji` to zero, znaczy to, ze etapu importu jeszcze
              nie bylo — i wtedy wiersza NIE MA. „Rejestr nie odnotowuje zadnej"
              przy pustej tabeli byloby zdaniem o danych, ktorych nie mamy;
              brak danych to stan, nie zmierzone zero (wzorzec 6).
            */}
            {jestPytan ? (
              <Dzial
                id="pytania"
                nr={nr('pytania')}
                tytul={tytulPytan(interpelacje, zapytania)}
              >
                <Wiersze>
                  <WierszPytan dane={interpelacje} rodzaj="interpelacje" />
                  <WierszPytan dane={zapytania} rodzaj="zapytania" />
                </Wiersze>
                <ListaPytan dane={interpelacje} rodzaj="interpelacje" />
                <ListaPytan dane={zapytania} rodzaj="zapytania" />
                {interpelacje.ile + zapytania.ile > 0 ? (
                  <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
                    {/* Cale zdanie w jednym napisie: zlamanie wiersza miedzy {…} a tekstem
                        JSX wycina razem ze spacja — tak powstalo „jestw rejestrze”. */}
                    {'Pokazujemy metryczkę, nie treść: pełny tekst i odpowiedź są w rejestrze Sejmu, pod odnośnikiem przy każdej pozycji.'}
                  </p>
                ) : null}
              </Dzial>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Tytul-wniosek nad paskami (F11): dwa najczestsze glosy z udzialem. */
function tytulRozkladu(rozklad: { glos: string; ile: number }[], mianownik: number): string {
  const [a, b] = rozklad;
  if (!a) return 'Rozkład głosów';
  const proc = (x: number) => procent((x / mianownik) * 100);
  const pierwszy = `Najczęściej „${etykietaGlosu(a.glos).krotka}”: ${proc(a.ile)} głosów`;
  return b ? `${pierwszy}, dalej „${etykietaGlosu(b.glos).krotka}” — ${proc(b.ile)}` : pierwszy;
}

function ListaOdstepstw({ odstepstwa, klub }: {
  odstepstwa: NonNullable<ReturnType<typeof porownanieZKlubem>>['odstepstwa'];
  klub: string | null;
}) {
  return (
    <ul className="pozycje">
      {odstepstwa.map((o) => (
        <li key={`${o.posiedzenie}-${o.numer}`}>
          <div className="min-w-0">
            <p className="meta">{`${dataSlownie(o.data)}${o.klub_id !== klub ? ` · wtedy w klubie ${o.klub_id}` : ''}`}</p>
            <Link href={`/glosowanie/${o.posiedzenie}-${o.numer}`} className="tytul-poz">{skroc(opisJednaLinia(o), 140)}</Link>
            <p className="meta mt-1 flex flex-wrap gap-x-4">
              <span><span className="miejsce-probka kropka" style={stylGlosu(o.glos)} />{`poseł: ${etykietaGlosu(o.glos).krotka}`}</span>
              <span><span className="miejsce-probka kropka" style={stylGlosu(o.wiekszosc)} />{`reszta klubu: ${etykietaGlosu(o.wiekszosc).krotka}`}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListaGlosow({ glosy }: { glosy: ReturnType<typeof ostatnieGlosyPosla> }) {
  return (
    <ul className="pozycje">
      {glosy.map((g) => {
        const o = opisGlosowania(g);
        return (
          <li key={`${g.posiedzenie}-${g.numer}`}>
            <div className="min-w-0">
              <p className="meta">{[dataSlownie(g.data), `posiedzenie ${g.posiedzenie}`, o.punkt ? `pkt ${o.punkt}` : null].filter(Boolean).join(' · ')}</p>
              <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="tytul-poz">{skroc(o.sprawa, 170)}</Link>
              <p className="meta">
                {o.nadCaloscia ? 'głosowanie nad całością projektu' : o.porzadkowe ? 'sprawa porządkowa' : o.przedmiot ? skroc(o.przedmiot, 110) : null}
              </p>
            </div>
            <p className="glos"><span className="miejsce-probka kropka" style={stylGlosu(g.glos)} />{etykietaGlosu(g.glos).krotka}</p>
          </li>
        );
      })}
    </ul>
  );
}

function ListaWystapien({ wystapienia }: { wystapienia: NonNullable<ReturnType<typeof wystapieniaPosla>>['ostatnie'] }) {
  return (
    <ul className="pozycje">
      {wystapienia.map((w) => {
        const czas = opisCzasu(minutyWystapienia(w.poczatek, w.koniec));
        return (
          <li key={`${w.posiedzenie}-${w.dzien}-${w.numer}`}>
            <p className="min-w-0">
              {dataSlownie(w.dzien)}
              <span className="text-atrament-2">
                {` · posiedzenie ${w.posiedzenie}`}
                {w.funkcja ? ` · ${w.funkcja}` : ''}
                {czas ? ` · ${czas}` : ''}
                {w.na_pismie ? ' · złożone na piśmie' : ''}
                {w.sprawozdawca ? ' · sprawozdawca' : ''}
                {w.sekretarz ? ' · sekretarz posiedzenia' : ''}
              </span>
            </p>
            <a
              href={adresWystapienia(w.posiedzenie, w.dzien, w.numer)}
              target="_blank"
              rel="noreferrer"
              className="text-akcent underline underline-offset-4 hover:no-underline"
            >
              treść wystąpienia
            </a>
          </li>
        );
      })}
    </ul>
  );
}

const NAPISY_PYTAN: Record<RodzajPytan, {
  co: string; rejestr: string; lista: string; zadnej: string;
}> = {
  interpelacje: {
    co: 'Interpelacje podpisane', rejestr: 'rejestr interpelacji', lista: 'Ostatnie interpelacje',
    zadnej: 'rejestr nie odnotowuje żadnej',
  },
  zapytania: {
    co: 'Zapytania poselskie podpisane', rejestr: 'rejestr zapytań', lista: 'Ostatnie zapytania',
    zadnej: 'rejestr nie odnotowuje żadnego',
  },
};

function tytulPytan(i: InterpelacjePosla, z: InterpelacjePosla): string {
  const czesci = [
    i.wKadencji > 0 ? zOdmiana(i.ile, 'interpelacja', 'interpelacje', 'interpelacji') : null,
    z.wKadencji > 0 ? zOdmiana(z.ile, 'zapytanie', 'zapytania', 'zapytań') : null,
  ].filter(Boolean);
  return `Interpelacje i zapytania: ${czesci.join(', ')}`;
}

/**
 * Interpelacje albo zapytania poselskie — ten sam wiersz, inne slowa.
 * Bez form osobowych: „podpisal/podpisala" wymagaloby rodzaju,
 * ktorego nie zapisujemy, a rejestr go nie podaje.
 */
function WierszPytan({ dane, rodzaj }: { dane: InterpelacjePosla; rodzaj: RodzajPytan }) {
  const t = NAPISY_PYTAN[rodzaj];
  if (dane.wKadencji === 0) return null;
  return (
    <Wiersz
      co={t.co}
      ile={`${liczba(dane.ile)} z ${liczba(dane.wKadencji)}`}
      zCzego={
        (dane.wezszeNizKadencja && dane.od
          ? `złożonych od ${dataSlownie(dane.od)}${dane.do ? ` do ${dataSlownie(dane.do)}` : ''}, w czasie trwania tego mandatu`
          : 'złożonych w tej kadencji')
        + ' · '
        + (dane.ile === 0
          ? t.zadnej
          : dane.bezOdpowiedzi > 0
            ? `bez odpowiedzi w rejestrze: ${liczba(dane.bezOdpowiedzi)} — to informacja o adresacie, nie o pośle`
            : 'wszystkie mają w rejestrze odpowiedź')
      }
      podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/openapi/" nazwa={t.rejestr} />}
    />
  );
}

function ListaPytan({ dane, rodzaj }: { dane: InterpelacjePosla; rodzaj: RodzajPytan }) {
  if (dane.wKadencji === 0 || dane.ostatnie.length === 0) return null;
  const pozycje = (lista: InterpelacjePosla['ostatnie']) => (
    <ul className="pozycje">
      {lista.map((i) => (
        <li key={i.numer}>
          <div className="min-w-0">
            {/*
              Tytul przechodzi przez te sama regule, co tytul
              glosowania — jedna regula dla wszystkich (regula 7).
              ZMIERZONE 30.09.2026 na 20 145 tytulach: dzis nie zmienia
              ani jednego, bo tytuly interpelacji sa tematami polityki,
              nie sprawami jednostkowymi. Sprawdzone tez osobno:
              „Pan/Pani + nazwisko" 0 trafien, inicjaly 2 (oba falszywe:
              patron szpitala, numer uchwaly), jedyne nazwisko w tytule
              nalezy do WICEMINISTER w jej roli publicznej. Zostawiamy
              filtr, bo tytuly pisza poslowie i jutro moze byc inaczej.
            */}
            {i.adres ? (
              <a href={i.adres} target="_blank" rel="noreferrer" className="tytul-poz">
                {skroc(bezNazwiskOsobPrywatnych(i.tytul), 180)}
              </a>
            ) : (
              <p className="font-semibold">{skroc(bezNazwiskOsobPrywatnych(i.tytul), 180)}</p>
            )}
            <p className="meta">
              <span className="znak">{`nr ${i.numer}`}</span>
              {` · ${dataSlownie(i.data_wplywu)}`}
              {i.autorow > 1 ? ` · ${zOdmiana(i.autorow, 'autor', 'autorów', 'autorów')}` : ''}
              {i.odpowiedzi === 0 ? ' · bez odpowiedzi' : ''}
            </p>
            {i.adresaci ? <p className="meta">{`do: ${i.adresaci}`}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
  const t = NAPISY_PYTAN[rodzaj];
  return (
    <>
      <h3>{t.lista}</h3>
      {pozycje(dane.ostatnie.slice(0, 2))}
      {dane.ostatnie.length > 2 ? (
        <Wiecej napis={`Pokaż ${dane.ostatnie.length} ostatnich`}>{pozycje(dane.ostatnie.slice(2))}</Wiecej>
      ) : null}
    </>
  );
}
