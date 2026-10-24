import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { bazaDostepna, porownanieZKlubem, posel, zrodloImportu } from '@/lib/dane';
import { dataKrotko, liczba, procent, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { ListaOdstepstw, MetodaPorownania } from '@/components/PorownanieZKlubem';
import { Dzial, Okruszek, Podstawa, Stronicowanie, Wypis } from '@/components/Szablon';

const NA_STRONE = 50;
/** Raz na renderowanie — potrzebuja go i metadane (adres kanoniczny), i strona. */
const porownanie = cache(porownanieZKlubem);
const REJESTR_GLOSOWAN = 'https://api.sejm.gov.pl/sejm/term10/votings';

/** Numer strony z adresu: śmieci i liczby spoza zakresu sprowadzamy do najbliższej. */
const numerStrony = (strona: string | undefined, stron: number) =>
  Math.min(Math.max(1, Number.parseInt(strona ?? '1', 10) || 1), Math.max(1, stron));

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ strona?: string }>;
}): Promise<Metadata> {
  const [{ slug }, { strona }] = await Promise.all([params, searchParams]);
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return { title: 'Nie ma takiego posła' };
  const nr = numerStrony(strona, Math.ceil((porownanie(p.id)?.odstepstwa.length ?? 0) / NA_STRONE));
  return {
    title: `${p.imie_nazwisko} — głosowania inaczej niż klub`,
    description: `Wszystkie głosowania Sejmu X kadencji, w których ${p.imie_nazwisko} zagłosował(a) inaczej niż reszta swojego klubu — z odnośnikiem do każdego głosowania.`,
    // Lista dzielona na strony: każda strona wskazuje samą siebie (jak /glosowania).
    alternates: { canonical: nr > 1 ? `/posel/${slug}/inaczej?strona=${nr}` : `/posel/${slug}/inaczej` },
  };
}

/**
 * Pełna lista głosowań inaczej niż klub. Prośba Pawła z 24.10.2026: strona posła
 * pokazywała 8 najnowszych i pisała „8 z N”, a reszty nie dało się zobaczyć
 * nigdzie. Liczone tą samą funkcją co na stronie posła (`porownanieZKlubem`),
 * więc liczby obu stron są identyczne. Stronicowanie jawne (wzorzec 4).
 */
export default async function GlosowaniaInaczej({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ strona?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const [{ slug }, { strona }] = await Promise.all([params, searchParams]);
  const p = posel(slug);
  if (!p) notFound();
  const wynik = porownanie(p.id);
  const glosyZ = zrodloImportu('glosy');
  const odstepstwa = wynik?.odstepstwa ?? [];
  const stron = Math.ceil(odstepstwa.length / NA_STRONE);
  const biezaca = numerStrony(strona, stron);
  const naStronie = odstepstwa.slice((biezaca - 1) * NA_STRONE, biezaca * NA_STRONE);
  const adres = (nr: number) => (nr > 1 ? `/posel/${slug}/inaczej?strona=${nr}` : `/posel/${slug}/inaczej`);

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { adres: '/poslowie', nazwa: 'Posłowie' }, { adres: `/posel/${slug}`, nazwa: p.imie_nazwisko }, { nazwa: 'Inaczej niż klub' }]} />
      <Wypis
        tytul={`${p.imie_nazwisko}: głosowania inaczej niż klub`}
        podtytul={wynik && wynik.porownywalnych > 0
          ? `${liczba(wynik.odmiennych)} z ${zOdmiana(wynik.porownywalnych, 'porównywalnego głosowania', 'porównywalnych głosowań', 'porównywalnych głosowań')} (${procent((wynik.odmiennych / wynik.porownywalnych) * 100)}) w Sejmie X kadencji, od najnowszego.`
          : 'Nie ma głosowań, w których dałoby się porównać głos tego posła z klubem.'}
      />
      <Dzial
        id="inaczej"
        nr={1}
        tytul={stron > 1
          ? `Głosowania ${liczba((biezaca - 1) * NA_STRONE + 1)}–${liczba((biezaca - 1) * NA_STRONE + naStronie.length)} z ${liczba(odstepstwa.length)}`
          : zOdmiana(odstepstwa.length, 'głosowanie', 'głosowania', 'głosowań')}
        obok={<Podstawa adres={REJESTR_GLOSOWAN} nazwa="rejestr głosowań" data={glosyZ ? dataKrotko(glosyZ.kiedy) : null} />}
        metoda={<MetodaPorownania />}
      >
        {wynik && wynik.kluby.length > 1 ? (
          <p className="wstep">
            {`W tym czasie należał(a) do klubów: ${wynik.kluby.join(', ')}. Każdy głos porównujemy z klubem z dnia głosowania.`}
          </p>
        ) : null}
        {naStronie.length ? (
          <ListaOdstepstw odstepstwa={naStronie} klub={p.klub_id} />
        ) : (
          <p className="wstep">W żadnym z porównywalnych głosowań nie zagłosował(a) inaczej niż reszta klubu.</p>
        )}
        <Stronicowanie biezaca={biezaca} stron={stron} adres={adres} nowsze="← nowsze" starsze="starsze →" />
        <p className="mt-6">
          <Link href={`/posel/${slug}`} className="text-akcent underline underline-offset-4 hover:no-underline">{`← Wróć do strony: ${p.imie_nazwisko}`}</Link>
        </p>
      </Dzial>
    </div>
  );
}
