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
import { dataSlownie, liczba, odmien, procent, skroc, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';
import { KartaGlosowania } from '@/components/KartaGlosowania';
import { opisJednaLinia } from '@/lib/opis-glosowania';
import { MIEJSCA } from '@/lib/plan-sali';
import { miejscePosla } from '@/lib/sala';

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
  const udzial = staty.mianownik > 0 ? ((staty.mianownik - nieobecnosci) / staty.mianownik) * 100 : null;

  return (
    <div className="obszar py-10">
      <Link href="/poslowie" className="inline-flex min-h-11 items-center text-sm text-atrament-2 hover:text-akcent">
        ← wszyscy posłowie
      </Link>

      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="duzy" />
        <div className="min-w-0 flex-1">
          <h1 className="szryft text-3xl leading-tight font-semibold sm:text-5xl">{p.imie_nazwisko}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {p.klub_id ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="miejsce-probka h-2.5 w-2.5 rounded-full"
                  style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                />
                {/* Kod rejestrowy jest krotki i rozpoznawalny; pelna nazwa
                    klubu miewa sto znakow, wiec idzie w podpowiedz i nizej. */}
                <span className="font-medium" title={k?.nazwa ?? undefined}>{p.klub_id}</span>
              </span>
            ) : (
              <span className="text-atrament-2">bez klubu</span>
            )}
            {p.okreg_nr ? (
              <Link href={`/okreg/${p.okreg_nr}`} className="inline-flex min-h-6 items-center text-atrament-2 underline-offset-4 hover:text-akcent hover:underline">
                {`okręg nr ${p.okreg_nr}${p.okreg_nazwa ? ` · ${p.okreg_nazwa}` : ''}`}
              </Link>
            ) : null}
            {p.aktywny === 0 ? (
              <span className="rounded-md bg-papier-3 px-2 py-0.5 text-xs text-atrament-2">mandat wygasł</span>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {p.glosow_w_wyborach ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Głosów w wyborach:</dt>
                <dd className="liczby font-medium">{liczba(p.glosow_w_wyborach)}</dd>
              </div>
            ) : null}
            {p.zawod ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Zawód:</dt>
                <dd className="font-medium">{p.zawod}</dd>
              </div>
            ) : null}
            {p.wyksztalcenie ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Wykształcenie:</dt>
                <dd className="font-medium">{p.wyksztalcenie}</dd>
              </div>
            ) : null}
            {/*
              MIEJSCE NA SALI jako jedna pozycja (04.10.2026, prosba Pawla:
              „duzo miejsca zajmuje, moze po prostu gdzie siedzi"). Do tego dnia
              strona posla rysowala cala sale — teraz cala sala jest na /sala,
              z tym poslem zaznaczonym.
            */}
            {miejsce ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Miejsce na sali:</dt>
                <dd className="font-medium">
                  {miejsce[1] === null ? 'numer nieodczytany' : `nr ${miejsce[1]}`}
                  {' · '}
                  <Link href={`/sala?posel=${p.id}`} className="font-normal text-akcent underline underline-offset-4 hover:no-underline">
                    pokaż na planie
                  </Link>
                </dd>
              </div>
            ) : null}
            {p.email ? (
              <div className="flex min-w-0 gap-2">
                <dt className="text-atrament-2">E-mail:</dt>
                <dd className="truncate font-medium">
                  <a href={`mailto:${p.email}`} className="hover:text-akcent hover:underline">{p.email}</a>
                </dd>
              </div>
            ) : null}
          </dl>

          {k?.nazwa ? (
            <p className="mt-2 text-sm text-atrament-3">{k.nazwa}</p>
          ) : null}

          <Zrodlo adres={adresRejestru} etykieta="strona posła w Sejmie" className="mt-4" />
        </div>
      </header>

      
      {/* Mandat wygasl — pokazujemy SUROWY powod z rejestru, bez interpretacji. */}
      {p.aktywny === 0 && p.przyczyna_wygasniecia ? (
        <p className="mt-6 rounded-xl border border-kreska bg-papier-3 px-4 py-3 text-sm text-atrament-2">
          Rejestr podaje przyczynę wygaśnięcia mandatu:{' '}
          <span className="font-medium text-atrament">{p.przyczyna_wygasniecia}</span>
          {p.data_wygasniecia ? ` (${dataSlownie(p.data_wygasniecia)})` : ''}.
        </p>
      ) : null}

      {staty.mianownik === 0 ? (
        <p className="mt-10 rounded-2xl border border-kreska bg-papier-2 p-6 text-atrament-2">
          Nie mamy jeszcze zaimportowanych głosów imiennych dla tego posła.
        </p>
      ) : (
        <>
          {porownanie && porownanie.porownywalnych > 0 ? (
            <section className="mt-12">
              <h2 className="szryft text-2xl font-semibold">Czy głosuje tak jak reszta klubu?</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
                <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
                  <p className="liczby szryft text-5xl font-semibold leading-none">
                    {procent((porownanie.odmiennych / porownanie.porownywalnych) * 100)}
                  </p>
                  <p className="mt-3 font-medium">głosowań inaczej niż reszta klubu</p>
                  {/* Mianownik stoi obok procentu, nie w przypisie. */}
                  <p className="mt-1 text-sm text-atrament-2">
                    {`${liczba(porownanie.odmiennych)} z ${zOdmiana(porownanie.porownywalnych, 'porównywalnego głosowania', 'porównywalnych głosowań', 'porównywalnych głosowań')}`}
                  </p>
                  {porownanie.kluby.length > 1 ? (
                    <p className="mt-3 text-xs leading-relaxed text-atrament-3">
                      {`W tym czasie należał(a) do klubów: ${porownanie.kluby.join(', ')}. Każdy głos porównujemy z klubem z dnia głosowania.`}
                    </p>
                  ) : null}
                  <details className="mt-4 border-t border-kreska pt-3 text-xs leading-relaxed text-atrament-2">
                    <summary className="min-h-11 cursor-pointer py-2 font-medium text-atrament">Jak to liczymy</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      <li>Porównujemy tylko głosy „za”, „przeciw” i „wstrzymał się”. Nieobecność nie jest stanowiskiem.</li>
                      <li>Punktem odniesienia jest najczęstszy głos pozostałych członków klubu — bez samego posła.</li>
                      <li>{`Głosowanie liczymy, gdy reszta klubu oddała co najmniej ${MIN_RESZTY} głosy i miała jeden wyraźnie najczęstszy głos. Przy remisie nie ma z czym porównać.`}</li>
                      <li>Posłowie niezrzeszeni nie tworzą klubu, więc ich głosów nie porównujemy.</li>
                      <li>
                        Głos inny niż klub może wynikać z przekonań, z umowy w klubie albo z pomyłki
                        przy przycisku. Rejestr tego nie podaje — i my też tego nie rozstrzygamy.
                      </li>
                    </ul>
                  </details>
                </div>

                <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
                  {porownanie.odstepstwa.length === 0 ? (
                    <p className="text-atrament-2">
                      W żadnym z porównywalnych głosowań nie zagłosował(a) inaczej niż reszta klubu.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {porownanie.odstepstwa.length > 8
                          ? 'Ostatnie 8 głosowań, w których zagłosował(a) inaczej'
                          : 'Głosowania, w których zagłosował(a) inaczej'}
                      </p>
                      <ul className="mt-3 divide-y divide-kreska">
                        {porownanie.odstepstwa.slice(0, 8).map((o) => (
                          <li key={`${o.posiedzenie}-${o.numer}`} className="py-3">
                            <Link href={`/glosowanie/${o.posiedzenie}-${o.numer}`} className="group block">
                              <span className="block text-xs text-atrament-3">
                                {`${dataSlownie(o.data)}${o.klub_id !== p.klub_id ? ` · wtedy w klubie ${o.klub_id}` : ''}`}
                              </span>
                              <span className="mt-0.5 block text-sm leading-snug group-hover:text-akcent">
                                {skroc(opisJednaLinia(o), 140)}
                              </span>
                              <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="miejsce-probka h-2 w-2 rounded-full" style={stylGlosu(o.glos)} />
                                  {`poseł: ${etykietaGlosu(o.glos).krotka}`}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-atrament-2">
                                  <span className="miejsce-probka h-2 w-2 rounded-full" style={stylGlosu(o.wiekszosc)} />
                                  {`reszta klubu: ${etykietaGlosu(o.wiekszosc).krotka}`}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="szryft text-2xl font-semibold">Jak głosował(a)</h2>
            <p className="mt-1 text-sm text-atrament-2">
              Na podstawie {zOdmiana(staty.mianownik, 'głosowania', 'głosowań', 'głosowań')},
              w których rejestr odnotował tego posła.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta sm:col-span-2">
                <ul className="space-y-3">
                  {staty.rozklad.map((r) => {
                    const e = etykietaGlosu(r.glos);
                    const udzialProc = (r.ile / staty.mianownik) * 100;
                    return (
                      <li key={r.glos}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-medium">{e.krotka}</span>
                          <span className="liczby text-atrament-2">
                            <span className="font-medium text-atrament">{liczba(r.ile)}</span>{' '}
                            · {procent(udzialProc)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-papier-3">
                          <div
                            className="miejsce-probka h-full rounded-full"
                            style={{ ...stylGlosu(r.glos), width: `${udzialProc}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
                <p className="liczby szryft text-4xl font-semibold leading-none">{procent(udzial)}</p>
                <p className="mt-2 text-sm font-medium">udział w głosowaniach</p>
                <p className="mt-1 text-xs text-atrament-2">
                  {liczba(staty.mianownik - nieobecnosci)} z {liczba(staty.mianownik)}
                </p>
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
                  <div className="mt-4 border-t border-kreska pt-3">
                    <p className="text-sm leading-relaxed">
                      Rejestr uznał za usprawiedliwione{' '}
                      <span className="liczby font-medium">
                        {liczba(obecnosc.dniUsprawiedliwione)} z {liczba(obecnosc.dniZNieobecnoscia)}
                      </span>{' '}
                      {odmien(obecnosc.dniZNieobecnoscia, 'dnia', 'dni', 'dni')}, w których posła
                      zabrakło przy głosowaniu.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-atrament-3">
                      Usprawiedliwienie dotyczy całego dnia obrad, nie pojedynczego
                      głosowania — dlatego liczymy tu dni, a nie głosowania.
                    </p>
                  </div>
                ) : null}
                <p className="mt-3 border-t border-kreska pt-3 text-xs leading-relaxed text-atrament-3">
                  Rejestr nie podaje, <span className="italic">dlaczego</span> posła nie było.
                  Wyjazd służbowy, choroba i nieobecność bez powodu wyglądają w danych
                  tak samo — więc nie rozstrzygamy tego za rejestr.
                </p>
              </div>
            </div>
          </section>

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
            <section className="mt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="szryft text-2xl font-semibold">Wystąpienia na sali</h2>
                <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/proceedings" etykieta="stenogramy w rejestrze" />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-atrament-2">
                <span className="liczby">
                  {`Głos na sali w ${liczba(wystapienia.dniZGlosem)} z ${liczba(wystapienia.dniObrad)} dni obrad w czasie mandatu. `}
                </span>
                {wystapienia.ile === 0
                  ? 'Rejestr nie odnotowuje w stenogramach żadnego wystąpienia.'
                  : `Wystąpień: ${liczba(wystapienia.ile)}`
                    + (wystapienia.naPismie ? `, w tym ${liczba(wystapienia.naPismie)} złożonych tylko na piśmie` : '')
                    + (wystapienia.jakoSekretarz ? `, ${liczba(wystapienia.jakoSekretarz)} jako sekretarz posiedzenia` : '')
                    + '.'}
              </p>
              {wystapienia.ostatnie.length ? (
                <ul className="mt-5 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
                  {wystapienia.ostatnie.map((w) => {
                    const czas = opisCzasu(minutyWystapienia(w.poczatek, w.koniec));
                    return (
                      <li key={`${w.posiedzenie}-${w.dzien}-${w.numer}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                        <span className="text-sm">
                          <span className="liczby text-atrament-2">{dataSlownie(w.dzien)}</span>
                          <span className="text-atrament-3">{` · posiedzenie ${w.posiedzenie}`}</span>
                          {w.funkcja ? <span className="text-atrament-2">{` · ${w.funkcja}`}</span> : null}
                          {czas ? <span className="text-atrament-3">{` · ${czas}`}</span> : null}
                          {w.na_pismie ? <span className="text-atrament-3">{' · złożone na piśmie'}</span> : null}
                          {w.sprawozdawca ? <span className="text-atrament-3">{' · sprawozdawca'}</span> : null}
                          {w.sekretarz ? <span className="text-atrament-3">{' · sekretarz posiedzenia'}</span> : null}
                        </span>
                        <a
                          href={adresWystapienia(w.posiedzenie, w.dzien, w.numer)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-6 items-center text-sm text-akcent underline underline-offset-4 hover:no-underline"
                        >
                          treść
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <p className="mt-3 text-xs leading-relaxed text-atrament-3">
                Rejestr nie podaje tematu wystąpienia — jest w treści pod odnośnikiem.
                Wystąpienia złożone na piśmie dochodzą do stenogramu po dniu obrad,
                więc dla ostatnich dni liczba może jeszcze urosnąć.
              </p>
            </section>
          ) : null}

          {/*
            KOMISJE (03.10.2026). Odpowiedz rejestru na „na czym komu zalezy"
            bez naszej klasyfikacji: posel sam wybral komisje, a jej zakres
            opisal urzad (to zdanie pod nazwa jest cytatem z rejestru).
            Tylko JEGO komisje — pelny sklad jest na /komisja/[kod] (pulapka 54).

            Trzy stany i kazdy mowi co innego (zasada 4):
             - tabeli nie ma            -> sekcji nie ma (brak danych to stan),
             - mandat wygasl            -> „nie mamy danych", NIE zero: rejestr
                                           podaje tylko BIEZACY sklad komisji,
             - mandat trwa, komisji 0   -> zmierzone zero, zdanie bez oceny
                                           i bez zgadywania powodu (zasady 2, 6).
          */}
          {komisje !== null ? (
            <section className="mt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="szryft text-2xl font-semibold">Komisje</h2>
                <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/committees" etykieta="skład komisji w rejestrze" />
              </div>
              {p.aktywny === 0 ? (
                <p className="mt-2 max-w-2xl text-sm text-atrament-2">
                  Rejestr podaje tylko bieżący skład komisji, więc dla posła z wygasłym
                  mandatem nie wiemy, w których zasiadał — to brak danych, a nie zero.
                </p>
              ) : komisje.length === 0 ? (
                <p className="mt-2 max-w-2xl text-sm text-atrament-2">
                  Według rejestru Sejmu nie zasiada obecnie w żadnej komisji.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {komisje.map((c) => (
                    <li key={c.kod} className="rounded-2xl border border-kreska bg-papier-2 p-4 shadow-karta">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <Link
                          href={`/komisja/${c.kod}`}
                          className="py-1 leading-snug font-medium text-akcent underline underline-offset-4 hover:no-underline"
                        >
                          {c.nazwa}
                        </Link>
                        <span className="text-xs text-atrament-3">{etykietaTypu(c.typ)}</span>
                      </div>
                      <p className="mt-1 text-sm">
                        <span className={c.funkcja ? 'font-medium' : 'text-atrament-2'}>{c.funkcja ?? 'członek'}</span>
                        {c.od ? <span className="text-atrament-2">{` · od ${dataSlownie(c.od)}`}</span> : null}
                      </p>
                      {c.zakres ? (
                        <p className="mt-2 text-xs leading-relaxed text-atrament-3">{c.zakres}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-atrament-3">
                {`Skład według rejestru${komisjeZ?.kiedy ? ` z ${dataSlownie(komisjeZ.kiedy.slice(0, 10))}` : ''}. `}
                Rejestr nie przechowuje historii: kto odszedł z komisji, znika z listy.
              </p>
            </section>
          ) : null}

          {/*
            Sekcja jest takze przy zerze: 58 poslow nie podpisalo zadnej
            interpelacji i ukrycie tego pokazywaloby niepelny obraz (regula 4 —
            zero jest zmierzone, regula 5 — nikogo nie chowamy). Powodu rejestr
            nie podaje, wiec go nie dopisujemy (regula 2).
            ALE gdy `wKadencji` to zero, znaczy to, ze etapu importu jeszcze
            nie bylo — i wtedy sekcji NIE MA. „Rejestr nie odnotowuje zadnej"
            przy pustej tabeli byloby zdaniem o danych, ktorych nie mamy;
            brak danych to stan, nie zmierzone zero (wzorzec 6).
          */}
          <PytaniaPosla dane={interpelacje} rodzaj="interpelacje" />
          {/*
            Zapytania poselskie (03.10.2026): ta sama budowa w rejestrze i te
            same zasady — zero jest zmierzone, brak tabeli to brak sekcji,
            a brak odpowiedzi to fakt o adresacie, nie o posle.
          */}
          <PytaniaPosla dane={zapytania} rodzaj="zapytania" />

          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="szryft text-2xl font-semibold">Ostatnie głosowania</h2>
            </div>
            <ul className="mt-5 space-y-2">
              {ostatnie.map((g) => (
                <li key={`${g.posiedzenie}-${g.numer}`}>
                  <KartaGlosowania
                    g={g}
                    uklad="wiersz"
                    dodatek={
                      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-kreska-2 px-3 py-1 text-xs font-medium sm:self-center">
                        <span className="miejsce-probka h-2.5 w-2.5 rounded-full" style={stylGlosu(g.glos)} />
                        {etykietaGlosu(g.glos).krotka}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

const NAPISY_PYTAN: Record<RodzajPytan, {
  tytul: string; rejestr: string; podpisane: string; zadnej: string; dopelniacz: string;
}> = {
  interpelacje: {
    tytul: 'Interpelacje', rejestr: 'rejestr interpelacji', podpisane: 'Podpisane interpelacje',
    zadnej: 'Rejestr nie odnotowuje żadnej.', dopelniacz: 'interpelacji',
  },
  zapytania: {
    tytul: 'Zapytania poselskie', rejestr: 'rejestr zapytań', podpisane: 'Podpisane zapytania',
    zadnej: 'Rejestr nie odnotowuje żadnego.', dopelniacz: 'zapytania',
  },
};

/**
 * Interpelacje albo zapytania poselskie — ta sama sekcja, inne slowa.
 * Do 03.10.2026 byla to sekcja wpisana w strone tylko dla interpelacji.
 */
function PytaniaPosla({ dane, rodzaj }: { dane: InterpelacjePosla; rodzaj: RodzajPytan }) {
  const t = NAPISY_PYTAN[rodzaj];
  if (dane.wKadencji === 0) return null;
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="szryft text-2xl font-semibold">{t.tytul}</h2>
        <Zrodlo adres="https://api.sejm.gov.pl/sejm/openapi/" etykieta={t.rejestr} />
      </div>
      {/* Bez form osobowych: „podpisał/podpisała" wymagaloby rodzaju,
          ktorego nie zapisujemy, a rejestr go nie podaje. */}
      <p className="mt-2 max-w-2xl text-sm text-atrament-2">
        <span className="liczby">
          {`${t.podpisane}: ${liczba(dane.ile)} z ${liczba(dane.wKadencji)}`}
        </span>
        {dane.wezszeNizKadencja && dane.od
          ? `${' złożonych od '}${dataSlownie(dane.od)}${dane.do ? ` do ${dataSlownie(dane.do)}` : ''}, w czasie trwania tego mandatu. `
          : ' złożonych w tej kadencji. '}
        {dane.ile === 0
          ? t.zadnej
          : dane.bezOdpowiedzi > 0
            ? `Bez odpowiedzi w rejestrze: ${liczba(dane.bezOdpowiedzi)} — to informacja o adresacie, nie o pośle.`
            : 'Wszystkie mają w rejestrze odpowiedź.'}
      </p>
      <ul className="mt-5 space-y-2">
        {dane.ostatnie.map((i) => (
          <li
            key={i.numer}
            className="rounded-2xl border border-kreska bg-papier-2 p-4 transition-colors hover:border-kreska-2"
          >
            <p className="liczby text-xs text-atrament-3">
              {`nr ${i.numer} · ${dataSlownie(i.data_wplywu)}`}
              {i.autorow > 1 ? ` · ${zOdmiana(i.autorow, 'autor', 'autorów', 'autorów')}` : ''}
              {i.odpowiedzi === 0 ? ' · bez odpowiedzi' : ''}
            </p>
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
            <p className="mt-1">
              {i.adres ? (
                <a
                  href={i.adres}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-akcent"
                >
                  {skroc(bezNazwiskOsobPrywatnych(i.tytul), 180)}
                </a>
              ) : (
                skroc(bezNazwiskOsobPrywatnych(i.tytul), 180)
              )}
            </p>
            {i.adresaci ? (
              <p className="mt-1 text-sm text-atrament-2">{`do: ${i.adresaci}`}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {dane.ile > 0 ? (
        <p className="mt-3 text-xs text-atrament-3">
          {`Pokazujemy metryczkę, nie treść: pełny tekst ${t.dopelniacz} i odpowiedzi jest`}
          w rejestrze Sejmu, pod odnośnikiem przy każdej pozycji.
        </p>
      ) : null}
    </section>
  );
}
