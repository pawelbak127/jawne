import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, glosyOkregu, gminyOkregu, kluby, okreg, podsumowaniaPorownan, poslowieOkregu, zrodloImportu,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, procent, skroc, wojewodztwoWMiejscowniku, zOdmiana } from '@/lib/format';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { stylGlosu } from '@/lib/barwy-glosu';
import { opisGminy } from '@/lib/wyszukiwanie';
import { opisGlosowania, opisJednaLinia } from '@/lib/opis-glosowania';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Podstawa, Uwaga, Wiersz, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';

const ZRODLO_PKW = 'https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach';
const REJESTR_POSLOW = 'https://api.sejm.gov.pl/sejm/term10/MP';

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
  const porownania = podsumowaniaPorownan(aktywni.map((p) => p.id));
  const gminy = gminyOkregu(o.nr);
  const twojaGmina = terytGminy ? gminy.find((g) => g.teryt === terytGminy) : undefined;
  const listaKlubow = kluby();
  const barwaKlubu = (id: string | null) => listaKlubow.find((k) => k.id === id);
  const { glosowania, glosy } = glosyOkregu(o.nr, 10);
  const glosPosla = new Map(glosy.map((g) => [`${g.posel_id}:${g.posiedzenie}-${g.numer}`, g.glos]));
  const klubowOkregu = new Set(aktywni.map((p) => p.klub_id ?? 'bez klubu')).size;
  const importPoslow = zrodloImportu('poslowie');
  const nazwa = `Okręg nr ${o.nr}${o.nazwa ? ` ${o.nazwa}` : ''}`;

  const powiaty = new Map<string, typeof gminy>();
  for (const g of gminy) {
    const lista = powiaty.get(g.powiat) ?? [];
    lista.push(g);
    powiaty.set(g.powiat, lista);
  }

  const dzialy = [
    { id: 'poslowie-okregu', nazwa: 'Posłowie' },
    ...(glosowania.length && aktywni.length ? [{ id: 'ostatnie-okregu', nazwa: 'Ostatnie głosowania' }] : []),
    { id: 'gminy-okregu', nazwa: 'Gminy' },
  ];
  const nrDzialu = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { adres: '/okregi', nazwa: 'Okręgi wyborcze' }, { nazwa }]} />
        <Wypis tytul={nazwa} podtytul={`Okręg wyborczy do Sejmu w województwie ${wojewodztwoWMiejscowniku(o.wojewodztwo)}.`} />

        {twojaGmina ? (
          <Uwaga naglowek={`${twojaGmina.nazwa} należy do tego okręgu.`}>
            {`${opisGminy(twojaGmina)} — poniżej posłowie, którzy ją reprezentują. `}
            <Link href={`/gmina/${twojaGmina.teryt}`}>Wróć do strony gminy</Link>
          </Uwaga>
        ) : null}

        <WLiczbach tytul="Okręg w liczbach">
          <Wiersz
            duzy
            co="Posłowie sprawujący mandat"
            ile={liczba(aktywni.length)}
            zCzego={
              <>
                {`z ${zOdmiana(klubowOkregu, 'klubu', 'klubów', 'klubów')}`}
                {byli.length ? ` · mandat wygasł w trakcie kadencji: ${liczba(byli.length)}` : ''}
                {' '}
                <a href="#poslowie-okregu">posłowie z okręgu ↓</a>
              </>
            }
            podstawa={<Podstawa adres={REJESTR_POSLOW} nazwa="rejestr posłów" data={importPoslow ? dataKrotko(importPoslow.kiedy) : null} />}
          />
          <Wiersz
            co="Gminy w okręgu"
            ile={liczba(gminy.length)}
            zCzego={<>{`w ${zOdmiana(powiaty.size, 'powiecie', 'powiatach', 'powiatach')}, według PKW z 2023 r. `}<a href="#gminy-okregu">gminy ↓</a></>}
            podstawa={<Podstawa adres={ZRODLO_PKW} nazwa="PKW, wybory 2023" />}
          />
          {o.uprawnionych_kraj ? (
            <Wiersz
              co="Uprawnieni do głosowania w 2023 r."
              ile={liczba(o.uprawnionych_kraj)}
              zCzego={o.uprawnionych_zagr
                ? `do tego ${liczba(o.uprawnionych_zagr)} za granicą i na statkach — PKW dolicza ich głosy do tego okręgu`
                : 'wybory do Sejmu 15 października 2023'}
              podstawa={<Podstawa adres={ZRODLO_PKW} nazwa="PKW, wybory 2023" />}
            />
          ) : null}
        </WLiczbach>

        <p className="stan-danych">
          <span>{`stan danych: posłowie ${importPoslow ? dataKrotko(importPoslow.kiedy) : '—'} · okręgi i gminy: PKW 2023`}</span>
        </p>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nrDzialu(d.id) }))} />
        <div className="dzialy">
          <Dzial
            id="poslowie-okregu"
            nr={nrDzialu('poslowie-okregu')}
            tytul={`Posłowie z okręgu: ${liczba(aktywni.length)} z ${zOdmiana(klubowOkregu, 'klubu', 'klubów', 'klubów')}`}
            obok={<Podstawa adres={REJESTR_POSLOW} nazwa="rejestr posłów" />}
          >
            <table className="tabela">
              <thead>
                <tr><th>Poseł</th><th>Klub</th><th className="l">Inaczej niż reszta klubu</th><th className="l">%</th></tr>
              </thead>
              <tbody>
                {aktywni.map((p) => {
                  const k = barwaKlubu(p.klub_id);
                  const por = porownania.get(p.id);
                  return (
                    <tr key={p.slug}>
                      <td><Link href={`/posel/${p.slug}`} className="font-semibold text-atrament underline decoration-kreska-2 underline-offset-4 hover:text-akcent">{p.imie_nazwisko}</Link></td>
                      <td>
                        {k ? <span className="miejsce-probka kropka" style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties} /> : null}
                        {p.klub_id ?? 'bez klubu'}
                      </td>
                      {/* Mianownik przy kazdym procencie (zasada 3); polpauza, gdy nie ma z czym porownac. */}
                      <td className="l" data-etykieta="inaczej niż klub">{por && por.porownywalnych > 0 ? `${liczba(por.odmiennych)} z ${liczba(por.porownywalnych)}` : '—'}</td>
                      <td className="l">{por && por.porownywalnych > 0 ? procent((por.odmiennych / por.porownywalnych) * 100) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
              Kolejność alfabetyczna, nie według liczby — to nie jest ranking (zasada „nie oceniamy”).
            </p>
            {byli.length ? (
              <p className="mt-3" style={{ fontSize: 'var(--sredni)' }}>
                <b>Mandat wygasł w trakcie kadencji: </b>
                {byli.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 ? ', ' : ''}
                    <Link href={`/posel/${p.slug}`}>{p.imie_nazwisko}</Link>
                  </span>
                ))}
              </p>
            ) : null}
          </Dzial>

          {glosowania.length && aktywni.length ? (
            <Dzial
              id="ostatnie-okregu"
              nr={nrDzialu('ostatnie-okregu')}
              tytul={`Ostatnie głosowania nad całością: ${zOdmiana(glosowania.length, 'najnowsze', 'najnowsze', 'najnowszych')}`}
            >
              {/*
                Ostatnie glosowania, bez wybierania "waznych" — kazdy taki wybor
                bylby nasza ocena tego, co wazne. Czytelnik widzi to, co bylo ostatnio.
              */}
              <p className="wstep">
                {`${zOdmiana(glosowania.length, 'ostatnie głosowanie', 'ostatnie głosowania', 'ostatnich głosowań')} nad całością projektów ustaw i uchwał — tak nazywa je rejestr. Nie wybieramy ich sami. Numer kolumny odpowiada liście pod tabelą.`}
              </p>
              {/* Na telefonie tabela przewija sie w bok WEWNATRZ ramki, nie cala strona. */}
              <div className="mt-4 overflow-x-auto">
                <table className="liczby w-full min-w-[34rem]" style={{ fontSize: 'var(--sredni)' }}>
                  <thead>
                    <tr className="border-b-2 border-atrament text-atrament-2">
                      <th className="pb-2 text-left font-semibold">Poseł</th>
                      {glosowania.map((g, i) => (
                        <th key={`${g.posiedzenie}-${g.numer}`} className="w-9 pb-2 text-center font-semibold">
                          {/* inline-block z paddingiem: gola cyfra dawala cel 8x15 px. */}
                          <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} title={opisJednaLinia(g)} className="inline-block px-2 py-2 text-akcent underline underline-offset-4">
                            {i + 1}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aktywni.map((p) => (
                      <tr key={p.slug} className="border-b border-kreska">
                        <td className="sticky left-0 bg-papier py-2 pr-3">
                          <Link href={`/posel/${p.slug}`} className="inline-block py-1.5 text-atrament underline decoration-kreska-2 underline-offset-4 hover:text-akcent">{p.imie_nazwisko}</Link>
                        </td>
                        {glosowania.map((g) => {
                          const glos = glosPosla.get(`${p.id}:${g.posiedzenie}-${g.numer}`);
                          const opis = glos ? etykietaGlosu(glos).krotka : 'brak w rejestrze';
                          return (
                            <td key={`${g.posiedzenie}-${g.numer}`} className="py-2 text-center">
                              {glos ? (
                                <span className="miejsce-probka inline-block h-3.5 w-3.5 rounded-full" style={stylGlosu(glos)} title={`${p.imie_nazwisko}: ${opis}`} aria-label={opis} />
                              ) : (
                                <span className="text-atrament-2" title={opis} aria-label={opis}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-atrament-2" style={{ fontSize: 'var(--sredni)' }}>
                {['YES', 'NO', 'ABSTAIN', 'ABSENT'].map((kod) => (
                  <span key={kod}>
                    <span className="miejsce-probka kropka" style={stylGlosu(kod)} />
                    {etykietaGlosu(kod).krotka}
                  </span>
                ))}
              </p>
              <ol className="pozycje">
                {glosowania.map((g, i) => (
                  <li key={`${g.posiedzenie}-${g.numer}`}>
                    <div className="min-w-0">
                      <p className="meta">{`${i + 1}. · ${dataSlownie(g.data)}`}</p>
                      <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="tytul-poz">{skroc(opisGlosowania(g).sprawa, 150)}</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </Dzial>
          ) : null}

          <Dzial
            id="gminy-okregu"
            nr={nrDzialu('gminy-okregu')}
            tytul={`Gminy w okręgu: ${liczba(gminy.length)}`}
            obok={<Podstawa adres={ZRODLO_PKW} nazwa="PKW — wybory 2023" />}
          >
            <p className="wstep">Każda z odnośnikiem do budżetu, funduszy UE i pomocy publicznej.</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...powiaty.entries()].map(([powiat, lista]) => (
                <div key={powiat}>
                  <h3 className="mt-0 border-b-2 border-atrament pb-1 font-semibold">
                    {lista[0]!.rodzaj === 'miasto na prawach powiatu' || lista[0]!.rodzaj === 'dzielnica Warszawy'
                      ? powiat
                      : `powiat ${powiat}`}
                  </h3>
                  <ul>
                    {lista.map((g) => (
                      <li key={g.teryt} className="border-b border-kreska">
                        <Link
                          href={`/gmina/${g.teryt}`}
                          className={`flex min-h-11 items-center underline underline-offset-4 ${g.teryt === twojaGmina?.teryt ? 'font-semibold text-akcent' : 'text-akcent decoration-kreska-2'}`}
                        >
                          {g.rodzaj === 'miasto' ? `${g.nazwa} (miasto)` : g.nazwa}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Dzial>
        </div>
      </div>
    </>
  );
}
