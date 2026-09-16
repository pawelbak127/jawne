import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, glosyOkregu, gminyOkregu, kluby, okreg, porownanieZKlubem, poslowieOkregu,
} from '@/lib/dane';
import { dataSlownie, liczba, procent, skroc, zOdmiana } from '@/lib/format';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { stylGlosu } from '@/lib/barwy-glosu';
import { opisGminy } from '@/lib/wyszukiwanie';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';

const ZRODLO_PKW = 'https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach';

function numerOkregu(nr: string): number | null {
  return /^\d{1,2}$/.test(nr) ? Number(nr) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ nr: string }> }): Promise<Metadata> {
  const { nr } = await params;
  const n = numerOkregu(nr);
  const o = n !== null && bazaDostepna() ? okreg(n) : null;
  if (!o) return { title: 'Nie ma takiego okręgu' };
  return {
    title: `Okręg nr ${o.nr}${o.nazwa ? ` — ${o.nazwa}` : ''}`,
    description: `Posłowie z okręgu wyborczego nr ${o.nr} (${o.wojewodztwo}) i to, jak głosowali w Sejmie.`,
  };
}

export default async function StronaOkregu({
  params,
  searchParams,
}: {
  params: Promise<{ nr: string }>;
  searchParams: Promise<{ gmina?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const [{ nr }, { gmina: terytGminy }] = await Promise.all([params, searchParams]);
  const n = numerOkregu(nr);
  const o = n !== null ? okreg(n) : null;
  if (!o) notFound();

  const poslowie = poslowieOkregu(o.nr);
  const aktywni = poslowie.filter((p) => p.aktywny === 1);
  const byli = poslowie.filter((p) => p.aktywny === 0);
  const gminy = gminyOkregu(o.nr);
  const twojaGmina = terytGminy ? gminy.find((g) => g.teryt === terytGminy) : undefined;
  const listaKlubow = kluby();
  const barwaKlubu = (id: string | null) => listaKlubow.find((k) => k.id === id);
  const { glosowania, glosy } = glosyOkregu(o.nr, 10);
  const glosPosla = new Map(glosy.map((g) => [`${g.posel_id}:${g.posiedzenie}-${g.numer}`, g.glos]));

  const powiaty = new Map<string, typeof gminy>();
  for (const g of gminy) {
    const lista = powiaty.get(g.powiat) ?? [];
    lista.push(g);
    powiaty.set(g.powiat, lista);
  }

  return (
    <div className="obszar py-10">
      <Link href="/okregi" className="text-sm text-atrament-2 hover:text-akcent">
        ← wszystkie okręgi
      </Link>

      {twojaGmina ? (
        <p className="mt-5 rounded-xl border border-akcent/30 bg-akcent-slaby px-4 py-3 text-sm">
          <span className="font-medium">{twojaGmina.nazwa}</span>
          {` (${opisGminy(twojaGmina)}) należy do okręgu wyborczego nr ${o.nr}. Poniżej posłowie, którzy go reprezentują.`}
        </p>
      ) : null}

      <header className="mt-6">
        <p className="text-[11px] font-medium tracking-[0.2em] text-akcent uppercase">
          {`Okręg wyborczy do Sejmu nr ${o.nr}`}
        </p>
        <h1 className="szryft mt-2 text-4xl font-semibold sm:text-5xl">{o.nazwa ?? `Okręg nr ${o.nr}`}</h1>
        <p className="mt-3 text-atrament-2">
          {`województwo ${o.wojewodztwo} · ${zOdmiana(o.poslow, 'poseł sprawujący', 'posłów sprawujących', 'posłów sprawujących')} mandat · ${zOdmiana(o.gmin, 'gmina', 'gminy', 'gmin')}`}
        </p>
        {o.uprawnionych_kraj ? (
          <p className="mt-1 text-sm text-atrament-3">
            {`W wyborach w 2023 r. uprawnionych do głosowania było tu ${liczba(o.uprawnionych_kraj)} osób${
              o.uprawnionych_zagr
                ? `, a do tego ${liczba(o.uprawnionych_zagr)} za granicą i na statkach — PKW dolicza ich głosy do tego okręgu`
                : ''
            }.`}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-4">
          <Zrodlo adres={ZRODLO_PKW} etykieta="PKW — wybory 2023" />
          <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/MP" etykieta="rejestr posłów" />
        </div>
      </header>

      <section className="mt-10">
        <h2 className="szryft text-2xl font-semibold">Posłowie z tego okręgu</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aktywni.map((p) => {
            const k = barwaKlubu(p.klub_id);
            const por = porownanieZKlubem(p.id);
            return (
              <li key={p.slug}>
                <Link
                  href={`/posel/${p.slug}`}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="zwykly" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium group-hover:text-akcent">{p.imie_nazwisko}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm text-atrament-2">
                      {k ? (
                        <span
                          className="miejsce-probka h-2 w-2 shrink-0 rounded-full"
                          style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties}
                        />
                      ) : null}
                      {p.klub_id ?? 'bez klubu'}
                    </span>
                    {por && por.porownywalnych > 0 ? (
                      <span className="mt-2 block text-xs leading-snug text-atrament-3">
                        {`inaczej niż reszta klubu: ${liczba(por.odmiennych)} z ${liczba(por.porownywalnych)} głosowań (${procent((por.odmiennych / por.porownywalnych) * 100)})`}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {byli.length ? (
          <div className="mt-5 text-sm text-atrament-2">
            <span className="font-medium text-atrament">Mandat wygasł w trakcie kadencji: </span>
            {byli.map((p, i) => (
              <span key={p.slug}>
                {i > 0 ? ', ' : ''}
                <Link href={`/posel/${p.slug}`} className="underline underline-offset-2 hover:text-akcent">
                  {p.imie_nazwisko}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {glosowania.length && aktywni.length ? (
        <section className="mt-12">
          <h2 className="szryft text-2xl font-semibold">Jak głosowali w ostatnich głosowaniach</h2>
          {/*
            Ostatnie glosowania, bez wybierania "waznych" — kazdy taki wybor
            bylby nasza ocena tego, co wazne. Czytelnik widzi to, co bylo ostatnio.
          */}
          <p className="mt-1 max-w-2xl text-sm text-atrament-2">
            {`${zOdmiana(glosowania.length, 'ostatnie głosowanie', 'ostatnie głosowania', 'ostatnich głosowań')} w Sejmie, bez wybierania — w kolejności od najnowszego. Numer kolumny odpowiada liście pod tabelą.`}
          </p>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-kreska bg-papier-2 p-4 shadow-karta">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-xs text-atrament-3">
                  <th className="pb-2 text-left font-medium">Poseł</th>
                  {glosowania.map((g, i) => (
                    <th key={`${g.posiedzenie}-${g.numer}`} className="liczby w-8 pb-2 text-center font-medium">
                      <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} title={g.temat ?? g.tytul} className="hover:text-akcent">
                        {i + 1}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktywni.map((p) => (
                  <tr key={p.slug} className="border-t border-kreska">
                    <td className="py-2 pr-3">
                      <Link href={`/posel/${p.slug}`} className="hover:text-akcent">{p.imie_nazwisko}</Link>
                    </td>
                    {glosowania.map((g) => {
                      const glos = glosPosla.get(`${p.id}:${g.posiedzenie}-${g.numer}`);
                      const opis = glos ? etykietaGlosu(glos).krotka : 'brak w rejestrze';
                      return (
                        <td key={`${g.posiedzenie}-${g.numer}`} className="py-2 text-center">
                          {glos ? (
                            <span
                              className="miejsce-probka inline-block h-3.5 w-3.5 rounded-full"
                              style={stylGlosu(glos)}
                              title={`${p.imie_nazwisko}: ${opis}`}
                              aria-label={opis}
                            />
                          ) : (
                            <span className="text-atrament-3" title={opis} aria-label={opis}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-kreska pt-3 text-xs text-atrament-2">
              {['YES', 'NO', 'ABSTAIN', 'ABSENT'].map((kod) => (
                <span key={kod} className="inline-flex items-center gap-1.5">
                  <span className="miejsce-probka h-2.5 w-2.5 rounded-full" style={stylGlosu(kod)} />
                  {etykietaGlosu(kod).krotka}
                </span>
              ))}
            </div>
          </div>

          <ol className="mt-4 space-y-1.5 text-sm">
            {glosowania.map((g, i) => (
              <li key={`${g.posiedzenie}-${g.numer}`} className="flex gap-3">
                <span className="liczby w-5 shrink-0 text-right text-atrament-3">{i + 1}.</span>
                <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="hover:text-akcent">
                  <span className="text-atrament-3">{`${dataSlownie(g.data)} · `}</span>
                  {skroc(g.temat ?? g.tytul, 130)}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-12">
        <details className="rounded-2xl border border-kreska bg-papier-2 p-5" open={Boolean(twojaGmina)}>
          <summary className="cursor-pointer">
            <span className="szryft text-xl font-semibold">{`Gminy w okręgu (${gminy.length})`}</span>
            <span className="ml-2 text-sm text-atrament-3">{`${zOdmiana(powiaty.size, 'powiat', 'powiaty', 'powiatów')}`}</span>
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...powiaty.entries()].map(([powiat, lista]) => (
              <div key={powiat}>
                <p className="text-xs font-medium tracking-wider text-atrament-3 uppercase">
                  {lista[0]!.rodzaj === 'miasto na prawach powiatu' || lista[0]!.rodzaj === 'dzielnica Warszawy'
                    ? powiat
                    : `powiat ${powiat}`}
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm">
                  {lista.map((g) => (
                    <li
                      key={g.teryt}
                      className={g.teryt === twojaGmina?.teryt ? 'font-semibold text-akcent' : 'text-atrament-2'}
                    >
                      {g.rodzaj === 'miasto' ? `${g.nazwa} (miasto)` : g.nazwa}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
