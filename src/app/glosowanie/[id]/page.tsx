import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, glosowanie, glosyWGlosowaniu, kluby } from '@/lib/dane';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { dataSlownie, liczba, procent, zOdmiana } from '@/lib/format';
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
    title: (g.temat ?? g.tytul).slice(0, 70),
    description: `Głosowanie z ${dataSlownie(g.data)}: za ${g.za}, przeciw ${g.przeciw}, wstrzymało się ${g.wstrzymalo}.`,
  };
}

/** Barwy sposobu glosowania. Te SA semantyczne — zielony/czerwony czyta kazdy. */
const BARWY_GLOSU: Record<string, { jasny: string; ciemny: string }> = {
  za: { jasny: '#1b9e63', ciemny: '#34b87c' },
  przeciw: { jasny: '#d2453f', ciemny: '#e2635d' },
  wstrzymal: { jasny: '#e0a021', ciemny: '#d9a52e' },
  brak: { jasny: '#cfcbc0', ciemny: '#3a3945' },
  inne: { jasny: '#8b8794', ciemny: '#736f7e' },
};

export default async function StronaGlosowania({ params }: { params: Promise<{ id: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { id } = await params;
  const adres = rozbijAdres(id);
  if (!adres) notFound();

  const g = glosowanie(adres.posiedzenie, adres.numer);
  if (!g) notFound();

  const glosy = glosyWGlosowaniu(adres.posiedzenie, adres.numer);
  const listaKlubow = kluby();

  /*
    Miejsca ustawiamy wedlug KLUBU (czyli tak, jak posel siedzi na sali),
    a kolorujemy wedlug GLOSU. Dzieki temu z jednego obrazka widac to, czego
    nie widac z zadnej tabeli: czy klub glosowal jednolicie, czy sie rozsypal.
  */
  const kolejnoscKlubow = new Map(listaKlubow.map((k, i) => [k.id, i]));
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
            const b = BARWY_GLOSU[e.ton] ?? BARWY_GLOSU.inne!;
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
        <p className="text-xs text-atrament-3">
          {dataSlownie(g.data)} · posiedzenie {g.posiedzenie}, głosowanie nr {g.numer}
        </p>
        <h1 className="szryft mt-2 text-2xl leading-tight font-semibold sm:text-4xl">
          {g.temat ?? g.tytul}
        </h1>
        {g.temat && g.tytul !== g.temat ? (
          <p className="mt-3 text-atrament-2">{g.tytul}</p>
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
          <PaseczekGlosow
            za={g.za}
            przeciw={g.przeciw}
            wstrzymalo={g.wstrzymalo}
            nieobecnych={g.nieobecnych}
            zOpisem
          />
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <p className="liczby szryft text-4xl font-semibold leading-none">{procent(poparcie)}</p>
          <p className="mt-2 text-sm font-medium">głosów „za” wśród oddanych</p>
          {/* Mianownik nie jest ozdoba: 60% z 90 glosow to co innego niz 60% z 460. */}
          <p className="mt-1 text-xs text-atrament-2">
            {liczba(g.za)} z {zOdmiana(oddanych, 'oddanego głosu', 'oddanych głosów', 'oddanych głosów')}
            {g.nieobecnych > 0 ? `; ${liczba(g.nieobecnych)} posłów nie głosowało` : ''}
          </p>
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
              znaczy, że klub głosował razem.
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <Polkole bloki={bloki} podpis={`Głosy imienne: ${glosy.length} posłów`} />
            </div>
          </section>

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
