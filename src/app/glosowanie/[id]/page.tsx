import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, glosowanie, glosyWGlosowaniu, kluby, procesGlosowania, wynikiKlubow, zrodloImportu } from '@/lib/dane';
import { BARWY_GLOSU, stylGlosu } from '@/lib/barwy-glosu';
import { opisGlosowania, opisJednaLinia } from '@/lib/opis-glosowania';
import { bezNazwiskOsobPrywatnych, pominietoNazwiska } from '@/lib/prywatnosc';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { wynikGlosowania } from '@/lib/wynik-glosowania';
import { NIE_KLUBY } from '@/lib/niezaleznosc';
import { dataKrotko, dataSlownie, liczba, procent, skroc, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Polkole, type Blok } from '@/components/Polkole';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { TabelaGlosow } from '@/components/TabelaGlosow';
import { Dzial, Okruszek, Podstawa, Uwaga, Wiecej, Wiersz, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import { Zgadnij } from '@/components/Zgadnij';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

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
  // Strony z pominietymi nazwiskami osob prywatnych nie ida do wyszukiwarek
  // takze po premierze. Klucz `robots` dodajemy TYLKO wtedy — obecny
  // z wartoscia undefined skasowalby ustawienie odziedziczone z layoutu.
  const bezIndeksu = pominietoNazwiska(g.tytul) || pominietoNazwiska(g.temat) || pominietoNazwiska(g.opis);
  return {
    ...(bezIndeksu ? { robots: { index: false, follow: false } } : {}),
    title: skroc(opisJednaLinia(g), 90),
    description: `Głosowanie z ${dataSlownie(g.data)}: za ${g.za}, przeciw ${g.przeciw}, wstrzymało się ${g.wstrzymalo}.`,
  };
}

const KOLEJNOSC_GLOSOW = ['YES', 'NO', 'ABSTAIN', 'VOTE_VALID', 'PRESENT', 'ABSENT'];
const OPCJE = [
  { klucz: 'za', etykieta: 'za' },
  { klucz: 'przeciw', etykieta: 'przeciw' },
  { klucz: 'wstrzymalo', etykieta: 'wstrzymał się' },
] as const;

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
  const wynik = wynikGlosowania(g);
  const importGlosowan = zrodloImportu('glosowania');
  const adresRejestru = `https://api.sejm.gov.pl/sejm/term10/votings/${g.posiedzenie}/${g.numer}`;
  const bezNazwisk = pominietoNazwiska(g.tytul) || pominietoNazwiska(g.temat) || pominietoNazwiska(g.opis);

  /*
    Miejsca ustawiamy wedlug KLUBU (czyli tak, jak posel siedzi na sali),
    a kolorujemy wedlug GLOSU. Dzieki temu z jednego obrazka widac to, czego
    nie widac z zadnej tabeli: czy klub glosowal jednolicie, czy sie rozsypal.
  */
  const droga = procesGlosowania(g.posiedzenie, g.numer);

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
              adres: `/posel/${glos.slug}`,
            };
          }),
      };
    });

  const oddanych = g.za + g.przeciw + g.wstrzymalo;
  const poparcie = oddanych > 0 ? (g.za / oddanych) * 100 : null;

  /*
   * Najczestszy glos kazdego klubu — do tytulu-wniosku nad tabela (F7)
   * i do pytania „jak myslisz”. Remis to remis: klub z rowna liczba „za”
   * i „przeciw” nie trafia do zadnej grupy, ale zostaje w mianowniku.
   */
  const najczestszy = (w: (typeof wynikiWgKlubow)[number]) => {
    const [a, b] = OPCJE.map((x) => ({ ...x, ile: w[x.klucz] })).sort((x, y) => y.ile - x.ile);
    return a.ile > 0 && a.ile > b.ile ? a.etykieta : null;
  };
  // Niezrzeszeni nie tworza klubu (NIE_KLUBY) — ich wiersz jest w tabeli,
  // ale nie w zdaniu „w N z M klubow” ani w pytaniu.
  const prawdziweKluby = wynikiWgKlubow.filter((w) => !NIE_KLUBY.has(w.klub_id));
  const grupy = new Map<string, string[]>();
  for (const w of prawdziweKluby) {
    const n = najczestszy(w);
    if (n) grupy.set(n, [...(grupy.get(n) ?? []), w.klub_id]);
  }
  const grupyMalejaco = [...grupy.entries()].sort((a, b) => b[1].length - a[1].length);
  const klubow = prawdziweKluby.length;
  const tytulKlubow = grupyMalejaco.length
    ? `Kluby: ${grupyMalejaco.slice(0, 2).map(([glos, kl], i) => `${i === 0 ? `w ${kl.length} z ${klubow}` : `w ${kl.length}`} najczęściej „${glos}”`).join(', ')}`
    : 'Jak głosowały kluby';
  const [pytanyGlos, pytaneKluby] = grupyMalejaco[0] ?? [null, []];

  const dzialy = glosy.length
    ? [
        ...(wynikiWgKlubow.length ? [{ id: 'kluby', nazwa: 'Kluby' }] : []),
        { id: 'sala', nazwa: 'Na sali' },
        { id: 'wszyscy', nazwa: 'Głosy imienne' },
      ]
    : [];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek
          ogniwa={[
            { nazwa: 'Sejm' },
            { adres: '/glosowania', nazwa: 'Głosowania' },
            { nazwa: `posiedzenie ${g.posiedzenie}, głosowanie ${g.numer}` },
          ]}
        />
        <Wypis
          tytul={o.sprawa}
          podtytul={
            <>
              {dataSlownie(g.data)}
              {o.przedmiot ? <>{' · '}<b className="text-atrament">{o.przedmiot}</b></> : null}
              {o.nadCaloscia ? <>{' · '}<b className="text-atrament">głosowanie nad całością projektu</b></> : null}
              {o.porzadkowe ? ' · sprawa porządkowa' : ''}
            </>
          }
        >
          {g.opis ? <p className="podtytul">{bezNazwiskOsobPrywatnych(g.opis)}</p> : null}
        </Wypis>

        {bezNazwisk ? (
          <Uwaga naglowek="Bez nazwisk osób prywatnych.">
            W sprawach z oskarżenia prywatnego nie powtarzamy nazwisk oskarżycieli ani ich
            pełnomocników — to osoby prywatne. Nazwisko posła zostaje. Pełny tytuł jest
            w rejestrze Sejmu pod odnośnikiem „dane głosowania”.
          </Uwaga>
        ) : null}

        <WLiczbach
          tytul={oddanych > 0
            ? `Wynik: za ${liczba(g.za)}, przeciw ${liczba(g.przeciw)}, wstrzymało się ${liczba(g.wstrzymalo)}`
            : 'Wynik'}
        >
          <div className="py-3">
            <PaseczekGlosow g={g} zOpisem />
          </div>
          {/*
            Wymagana wiekszosc PRZED procentem „za”: przy wecie (3/5) i przy
            wiekszosci bezwzglednej wiecej „za” niz „przeciw” nie wystarcza.
            ZMIERZONE 09.10.2026: 12 takich glosowan w kadencji, 11 z 23
            glosowan 3/5 — patrz `src/lib/wynik-glosowania.ts`.
          */}
          {wynik ? (
            <Wiersz
              duzy
              co={`Wymagana ${wynik.nazwa}`}
              ile={wynik.osiagnieta ? 'osiągnięta' : 'nieosiągnięta'}
              zCzego={`${wynik.regula.charAt(0).toLocaleUpperCase('pl-PL')}${wynik.regula.slice(1)}. W tym głosowaniu wymagane: ${zOdmiana(wynik.wymagane, 'głos', 'głosy', 'głosów')} „za”, oddano ${liczba(wynik.za)}.`}
              porownanie={!wynik.osiagnieta && g.za > g.przeciw
                ? 'Głosów „za” było więcej niż „przeciw”, a mimo to wymaganej większości nie było.'
                : null}
              podstawa={<Podstawa adres={adresRejestru} nazwa="dane głosowania" data={importGlosowan ? dataKrotko(importGlosowan.kiedy) : null} />}
            />
          ) : null}
          {oddanych > 0 ? (
            <Wiersz
              duzy={!wynik}
              co="Głosy „za” wśród oddanych"
              ile={procent(poparcie)}
              zCzego={
                <>
                  {/* Mianownik nie jest ozdoba: 60% z 90 glosow to co innego niz 60% z 460. */}
                  {`${liczba(g.za)} z ${zOdmiana(oddanych, 'oddanego głosu', 'oddanych głosów', 'oddanych głosów')}${g.nieobecnych > 0 ? ` · nie głosowało ${liczba(g.nieobecnych)}` : ''} `}
                  {wynikiWgKlubow.length ? <a href="#kluby">jak głosowały kluby ↓</a> : null}
                </>
              }
              podstawa={wynik ? null : <Podstawa adres={adresRejestru} nazwa="dane głosowania" data={importGlosowan ? dataKrotko(importGlosowan.kiedy) : null} />}
            />
          ) : (
            // Kworum i wybory na liscie nie maja glosow za/przeciw. Procent
            // "za" bylby tu polpauza bez wyjasnienia — mowimy wiec wprost.
            <Wiersz
              duzy
              co={g.rodzaj === 'ON_LIST' ? 'Głosowanie na liście kandydatów' : 'Głosów „za” i „przeciw”'}
              ile={g.rodzaj === 'ON_LIST' ? liczba(g.glosowalo) : '0'}
              zCzego={g.rodzaj === 'ON_LIST'
                ? `Rejestr nie podaje głosów „za” i „przeciw”, tylko to, że ${zOdmiana(g.glosowalo, 'poseł oddał', 'posłów oddało', 'posłów oddało')} głos.`
                : `W tym głosowaniu nikt nie głosował „za” ani „przeciw”. Rejestr odnotował ${zOdmiana(g.glosowalo, 'obecnego posła', 'obecnych posłów', 'obecnych posłów')}.`}
              podstawa={<Podstawa adres={adresRejestru} nazwa="dane głosowania" data={importGlosowan ? dataKrotko(importGlosowan.kiedy) : null} />}
            />
          )}
        </WLiczbach>

        <p className="stan-danych">
          <span>{`posiedzenie ${g.posiedzenie}${o.punkt ? `, pkt ${o.punkt}` : ''}, głosowanie nr ${g.numer}`}</span>
          {importGlosowan ? <span>{`stan danych: rejestr głosowań ${dataKrotko(importGlosowan.kiedy)}`}</span> : null}
          {g.pdf ? <span><Podstawa adres={g.pdf} nazwa="protokół PDF" /></span> : null}
        </p>

        {/*
          Odnosnik do calej drogi projektu. To jest odpowiedz na pytanie,
          ktore samo glosowanie zostawia otwarte: "i co z tego wyszlo?".
        */}
        {droga ? (
          <p className="mt-4" style={{ fontSize: 'var(--sredni)' }}>
            <Link href={`/ustawa/${droga.numer}`} className="font-semibold text-akcent underline underline-offset-4 hover:no-underline">
              {`Co się stało z tym projektem (druk nr ${droga.numer}) →`}
            </Link>
            <span className="block text-atrament-2">
              {droga.koniec
                ? `Stan według rejestru: ${droga.koniec}${droga.adres_publikacji ? ` · ${droga.adres_publikacji}` : ''}`
                : 'Proces trwa'}
            </span>
          </p>
        ) : null}

        {glosy.length === 0 ? (
          <Uwaga naglowek="Bez głosów imiennych.">
            Głosy imienne tego głosowania nie zostały jeszcze zaimportowane.
            Liczby zbiorcze powyżej pochodzą z nagłówka rejestru i są kompletne.
          </Uwaga>
        ) : null}
      </div>

      {glosy.length ? (
        <div className="obszar z-spisem">
          <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
          <div className="dzialy">
            {wynikiWgKlubow.length ? (
              <Dzial
                id="kluby"
                nr={nr('kluby')}
                tytul={tytulKlubow}
                obok={<Podstawa adres={adresRejestru} nazwa="rejestr głosowań" />}
              >
                <p className="wstep">Kluby z dnia głosowania — także te, których dziś już nie ma. Posłowie niezrzeszeni nie tworzą klubu, więc ich wiersz nie wchodzi do liczby klubów.</p>
                {pytanyGlos && klubow >= 4 ? (
                  <Zgadnij
                    id="zg-kluby"
                    pytanie={`Jak myślisz: w ilu z ${klubow} klubów najczęstszym głosem było „${pytanyGlos}”?`}
                    prawda={pytaneKluby.length}
                    min={0}
                    max={klubow}
                    jednostka=""
                    odpowiedz={
                      <p>
                        <b>{liczba(pytaneKluby.length)}</b>
                        {` — ${pytaneKluby.join(', ')}`.replace(/\.?$/, '.')}
                      </p>
                    }
                  />
                ) : null}
                <table className="tabela liczby">
                  <thead>
                    <tr>
                      <th>Klub</th>
                      <th className="l">za</th>
                      <th className="l">przeciw</th>
                      <th className="l">wstrz.</th>
                      <th className="l">nie głos.</th>
                      <th>rozkład</th>
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
                        <tr key={w.klub_id}>
                          <td>
                            <span title={k?.nazwa ?? undefined}>
                              <span
                                className="miejsce-probka kropka"
                                style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                              />
                              <b>{w.klub_id}</b>
                            </span>
                          </td>
                          <td className="l" data-etykieta="za">{w.za}</td>
                          <td className="l" data-etykieta="przeciw">{w.przeciw}</td>
                          <td className="l" data-etykieta="wstrz.">{w.wstrzymalo}</td>
                          <td className="l text-atrament-2" data-etykieta="nie głos.">{w.nieobecnych}</td>
                          <td style={{ minWidth: '8rem' }}>
                            <div
                              className="mt-2 flex h-2 overflow-hidden bg-papier-3"
                              role="img"
                              aria-label={`za ${w.za}, przeciw ${w.przeciw}, wstrzymało się ${w.wstrzymalo}, nie głosowało ${w.nieobecnych}`}
                            >
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
              </Dzial>
            ) : null}

            <Dzial id="sala" nr={nr('sala')} tytul={`Na sali: ${zOdmiana(glosy.length, 'poseł', 'posłów', 'posłów')}, kolor to oddany głos`}>
              <p className="wstep">
                Miejsca ułożone klubami. Jednolity blok znaczy, że klub głosował razem.
                Najedź na kropkę, żeby zobaczyć, kto to i jak zagłosował — kliknięcie
                prowadzi na stronę posła. Najechanie na nazwę klubu wyróżnia cały klub.
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-atrament-2" style={{ fontSize: 'var(--sredni)' }}>
                {[...new Set(glosy.map((s) => s.glos))]
                  .sort((a, b) => KOLEJNOSC_GLOSOW.indexOf(a) - KOLEJNOSC_GLOSOW.indexOf(b))
                  .map((kod) => (
                    <span key={kod}>
                      <span className="miejsce-probka kropka" style={stylGlosu(kod)} />
                      {etykietaGlosu(kod).krotka}
                    </span>
                  ))}
              </p>
              <div className="mx-auto mt-6 max-w-2xl">
                <Polkole bloki={bloki} podpis={`Głosy imienne: ${glosy.length} posłów`} probkiBlokow={false} />
              </div>
            </Dzial>

            <Dzial id="wszyscy" nr={nr('wszyscy')} tytul={`Głosy imienne: ${zOdmiana(glosy.length, 'poseł', 'posłów', 'posłów')}`}>
              <p className="wstep">
                {[...new Set(glosy.map((s) => s.glos))]
                  .sort((a, b) => KOLEJNOSC_GLOSOW.indexOf(a) - KOLEJNOSC_GLOSOW.indexOf(b))
                  .map((kod) => `${etykietaGlosu(kod).krotka} ${glosy.filter((s) => s.glos === kod).length}`)
                  .join(' · ')}
              </p>
              {/* Lista jest w HTML-u, ale zwinieta: 460 wierszy to na telefonie 36 tys. px (zmierzone 09.10.2026). */}
              <Wiecej napis={`Pokaż listę ${zOdmiana(glosy.length, 'posła', 'posłów', 'posłów')} z wyszukiwaniem`}>
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
              </Wiecej>
            </Dzial>
          </div>
        </div>
      ) : null}
    </>
  );
}
