import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, glosowanie, glosyWGlosowaniu, kluby, wynikiKlubow } from '@/lib/dane';
import { BARWY_GLOSU, stylGlosu } from '@/lib/barwy-glosu';
import { opisGlosowania, opisJednaLinia } from '@/lib/opis-glosowania';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { dataSlownie, liczba, procent, skroc, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Polkole, type Blok } from '@/components/Polkole';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { Zrodlo } from '@/components/Zrodlo';
import { TabelaGlosow } from '@/components/TabelaGlosow';

/**
 * Adres glosowania: `{posiedzenie}-{numer}`. Oba sa liczbami, wiec rozbicie
 * po ostatnim myslniku jest jednoznaczne i nie wymaga zadnych sztuczek.
 */
function rozbijAdres(id: string): { posiedzenie: number; numer: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { posiedzenie: Number(m[1]), numer: Number(m[2]) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = rozbijAdres(id);
  const g = a && bazaDostepna() ? glosowanie(a.posiedzenie, a.numer) : null;
  if (!g) return { title: 'Nie ma takiego głosowania' };
  return {
    title: skroc(opisJednaLinia(g), 90),
    description: `Głosowanie z ${dataSlownie(g.data)}: za ${g.za}, przeciw ${g.przeciw}, wstrzymało się ${g.wstrzymalo}.`,
  };
}

const KOLEJNOSC_GLOSOW = ['YES', 'NO', 'ABSTAIN', 'VOTE_VALID', 'PRESENT', 'ABSENT'];

export default async function StronaGlosowania({ params }: { params: Promise<{ id: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { id } = await params;
  const adres = rozbijAdres(id);
  if (!adres) notFound();

  const g = glosowanie(adres.posiedzenie, adres.numer);
  if (!g) notFound();

  const glosy = glosyWGlosowaniu(adres.posiedzenie, adres.numer);
  const listaKlubow = kluby();
  const kolejnoscKlubow = new Map(listaKlubow.map((k, i) => [k.id, i]));
  const wynikiWgKlubow = wynikiKlubow(adres.posiedzenie, adres.numer)
    .sort((a, b) => (kolejnoscKlubow.get(a.klub_id) ?? 999) - (kolejnoscKlubow.get(b.klub_id) ?? 999));
  const o = opisGlosowania(g);

  /*
    Miejsca ustawiamy wedlug KLUBU (czyli tak, jak posel siedzi na sali),
    a kolorujemy wedlug GLOSU. Dzieki temu z jednego obrazka widac to, czego
    nie widac z zadnej tabeli: czy klub glosowal jednolicie, czy sie rozsypal.
  */
  const wgKlubow = new Map<string, typeof glosy>();
  for (const glos of glosy) {
    const klucz = glos.klub_id ?? 'bez klubu';
    const lista = wgKlubow.get(klucz) ?? [];
    lista.push(glos);
    wgKlubow.set(klucz, lista);
  }

  const bloki: Blok[] = [...wgKlubow.entries()]
    .sort((a, b) => (kolejnoscKlubow.get(a[0]) ?? 999) - (kolejnoscKlubow.get(b[0]) ?? 999))
    .map(([klubId, lista]) => {
      const klub = listaKlubow.find((k) => k.id === klubId);
      return {
        id: klubId,
        etykieta: klubId,
        pelnaNazwa: klub?.nazwa,
        miejsca: [...lista]
          // Wewnatrz klubu grupujemy po sposobie glosowania, zeby rozlam byl
          // widoczny jako zwarty wycinek, a nie jako rozsypane kropki.
          .sort((x, y) => x.glos.localeCompare(y.glos) || x.nazwisko.localeCompare(y.nazwisko, 'pl'))
          .map((glos) => {
            const e = etykietaGlosu(glos.glos);
            const b = BARWY_GLOSU[e.ton];
            return {
              barwa: b.jasny,
              barwaCiemna: b.ciemny,
              opis: `${glos.imie_nazwisko} (${klubId}) — ${e.krotka}`,
            };
          }),
      };
    });

  const oddanych = g.za + g.przeciw + g.wstrzymalo;
  const poparcie = oddanych > 0 ? (g.za / oddanych) * 100 : null;

  return (
    <div className="obszar py-10">
      <Link href="/glosowania" className="text-sm text-atrament-2 hover:text-akcent">
        ← wszystkie głosowania
      </Link>

      <header className="mt-5 max-w-3xl">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-atrament-3">
          <span>
            {`${dataSlownie(g.data)} · posiedzenie ${g.posiedzenie}${o.punkt ? `, pkt ${o.punkt}` : ''} · głosowanie nr ${g.numer}`}
          </span>
          {o.nadCaloscia ? (
            <span className="rounded-md bg-akcent-slaby px-1.5 py-0.5 font-medium text-akcent">nad całością projektu</span>
          ) : null}
          {o.porzadkowe ? <span className="rounded-md bg-papier-3 px-1.5 py-0.5">sprawa porządkowa</span> : null}
        </p>
        <h1 className="szryft mt-2 text-2xl leading-tight font-semibold sm:text-4xl">{o.sprawa}</h1>
        {o.przedmiot ? (
          <p className="mt-3 text-lg text-atrament-2">
            {o.przedmiot.charAt(0).toLocaleUpperCase('pl-PL') + o.przedmiot.slice(1)}
          </p>
        ) : null}
        {g.opis ? <p className="mt-2 text-sm text-atrament-2">{g.opis}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Zrodlo
            adres={`https://api.sejm.gov.pl/sejm/term10/votings/${g.posiedzenie}/${g.numer}`}
            etykieta="dane głosowania"
          />
          {g.pdf ? <Zrodlo adres={g.pdf} etykieta="protokół PDF" /> : null}
        </div>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <PaseczekGlosow g={g} zOpisem />
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          {oddanych > 0 ? (
            <>
              <p className="liczby szryft text-4xl font-semibold leading-none">{procent(poparcie)}</p>
              <p className="mt-2 text-sm font-medium">głosów „za” wśród oddanych</p>
              {/* Mianownik nie jest ozdoba: 60% z 90 glosow to co innego niz 60% z 460. */}
              <p className="mt-1 text-xs text-atrament-2">
                {`${liczba(g.za)} z ${zOdmiana(oddanych, 'oddanego głosu', 'oddanych głosów', 'oddanych głosów')}${g.nieobecnych > 0 ? `; ${liczba(g.nieobecnych)} posłów nie głosowało` : ''}`}
              </p>
            </>
          ) : (
            // Kworum i wybory na liscie nie maja glosow za/przeciw. Procent
            // "za" bylby tu polpauza bez wyjasnienia — mowimy wiec wprost.
            <p className="text-sm leading-relaxed text-atrament-2">
              {g.rodzaj === 'ON_LIST'
                ? `Głosowanie na liście kandydatów — rejestr nie podaje głosów „za” i „przeciw”, tylko to, że ${zOdmiana(g.glosowalo, 'poseł oddał', 'posłów oddało', 'posłów oddało')} głos.`
                : `W tym głosowaniu nikt nie głosował „za” ani „przeciw”. Rejestr odnotował ${zOdmiana(g.glosowalo, 'obecnego posła', 'obecnych posłów', 'obecnych posłów')}.`}
            </p>
          )}
        </div>
      </section>

      {glosy.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-kreska bg-papier-2 p-6 text-atrament-2">
          Głosy imienne tego głosowania nie zostały jeszcze zaimportowane.
          Liczby zbiorcze powyżej pochodzą z nagłówka rejestru i są kompletne.
        </p>
      ) : (
        <>
          <section className="mt-12 rounded-3xl border border-kreska bg-papier-2 p-6 shadow-karta sm:p-10">
            <h2 className="szryft text-2xl font-semibold">Kto jak zagłosował</h2>
            <p className="mt-1 max-w-xl text-sm text-atrament-2">
              Miejsca ułożone klubami, kolor pokazuje oddany głos. Jednolity blok
              znaczy, że klub głosował razem. Najedź na nazwę klubu, żeby go wyróżnić.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-atrament-2">
              {[...new Set(glosy.map((s) => s.glos))]
                .sort((a, b) => KOLEJNOSC_GLOSOW.indexOf(a) - KOLEJNOSC_GLOSOW.indexOf(b))
                .map((kod) => (
                  <span key={kod} className="inline-flex items-center gap-1.5">
                    <span className="miejsce-probka h-2.5 w-2.5 rounded-full" style={stylGlosu(kod)} />
                    {etykietaGlosu(kod).krotka}
                  </span>
                ))}
            </div>
            <div className="mx-auto mt-6 max-w-2xl">
              <Polkole bloki={bloki} podpis={`Głosy imienne: ${glosy.length} posłów`} probkiBlokow={false} />
            </div>
          </section>

          {wynikiWgKlubow.length ? (
            <section className="mt-12">
              <h2 className="szryft text-2xl font-semibold">Jak głosowały kluby</h2>
              <p className="mt-1 text-sm text-atrament-2">
                Kluby z dnia głosowania — także te, których dziś już nie ma.
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-kreska bg-papier-2 shadow-karta">
                <table className="liczby w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-kreska text-xs text-atrament-3">
                      <th className="px-4 py-2.5 text-left font-medium">Klub</th>
                      <th className="px-2 py-2.5 text-right font-medium">za</th>
                      <th className="px-2 py-2.5 text-right font-medium">przeciw</th>
                      <th className="px-2 py-2.5 text-right font-medium">wstrz.</th>
                      <th className="px-2 py-2.5 text-right font-medium">nie głos.</th>
                      <th className="px-4 py-2.5 text-left font-medium">rozkład</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wynikiWgKlubow.map((w) => {
                      const k = listaKlubow.find((x) => x.id === w.klub_id);
                      const wszyscy = w.za + w.przeciw + w.wstrzymalo + w.nieobecnych + w.innych;
                      const czesci = [
                        { ile: w.za, b: BARWY_GLOSU.za },
                        { ile: w.przeciw, b: BARWY_GLOSU.przeciw },
                        { ile: w.wstrzymalo, b: BARWY_GLOSU.wstrzymal },
                        { ile: w.nieobecnych, b: BARWY_GLOSU.brak },
                        { ile: w.innych, b: BARWY_GLOSU.inne },
                      ];
                      return (
                        <tr key={w.klub_id} className="border-b border-kreska last:border-0">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2" title={k?.nazwa ?? undefined}>
                              <span
                                className="miejsce-probka h-2.5 w-2.5 rounded-full"
                                style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                              />
                              <span className="font-medium">{w.klub_id}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right">{w.za}</td>
                          <td className="px-2 py-2.5 text-right">{w.przeciw}</td>
                          <td className="px-2 py-2.5 text-right">{w.wstrzymalo}</td>
                          <td className="px-2 py-2.5 text-right text-atrament-2">{w.nieobecnych}</td>
                          <td className="w-40 px-4 py-2.5">
                            <div className="flex h-2 overflow-hidden rounded-full bg-papier-3">
                              {czesci.filter((c) => c.ile > 0).map((c, i) => (
                                <span
                                  key={i}
                                  className="miejsce-probka"
                                  style={{ width: `${(c.ile / wszyscy) * 100}%`, '--b': c.b.jasny, '--bc': c.b.ciemny } as React.CSSProperties}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="szryft text-2xl font-semibold">Wszystkie głosy</h2>
            <TabelaGlosow
              glosy={glosy.map((s) => {
                const e = etykietaGlosu(s.glos);
                return {
                  slug: s.slug,
                  nazwa: s.imie_nazwisko,
                  klub: s.klub_id,
                  glos: e.krotka,
                  ton: e.ton,
                };
              })}
            />
          </section>
        </>
      )}
    </div>
  );
}
