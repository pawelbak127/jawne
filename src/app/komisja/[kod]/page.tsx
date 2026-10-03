import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, kodyKomisji, komisja, zrodloImportu, type CzlonekKomisji } from '@/lib/dane';
import { adresKomisjiWRejestrze, etykietaTypu, rodzajFunkcji } from '@/lib/komisje';
import { dataSlownie, liczba, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';

/**
 * Komisja sejmowa: zakres dzialania i sklad.
 *
 * Zakres to CYTAT z rejestru — urzad sam opisal, czym komisja sie zajmuje,
 * i podpis mowi, kto to napisal. Sklad to stan biezacy (pulapka 3),
 * kolejnosc jak w rejestrze: przewodniczacy, zastepcy, czlonkowie
 * alfabetycznie. Nie liczymy tu niczego „o poslach" — ani obecnosci na
 * posiedzeniach komisji, ani aktywnosci (zasada 6), bo rejestr tego nie
 * podaje, a zgadywanie bylo by nasze (zasada 2).
 *
 * Statyczna: 40 stron, budowane raz i odswiezane co godzine. Raport UI
 * z 03.10.2026 pokazal, ze trasy dynamiczne placa pelnym renderem przy
 * kazdym czytelniku, a tu nie ma po co.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return bazaDostepna() ? kodyKomisji().map((kod) => ({ kod })) : [];
}

export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  const k = bazaDostepna() ? komisja(kod) : null;
  if (!k) return { title: 'Nie ma takiej komisji', robots: { index: false, follow: false } };
  return {
    title: `${k.nazwa} — skład i zakres`,
    description: `${k.nazwa}: ${zOdmiana(k.czlonkow, 'członek', 'członków', 'członków')} według rejestru Sejmu`
      + (k.zakres ? `. ${k.zakres.slice(0, 120)}` : '.'),
  };
}

export default async function StronaKomisji({ params }: { params: Promise<{ kod: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { kod } = await params;
  const k = komisja(kod);
  if (!k) notFound();
  const imp = zrodloImportu('komisje');
  const prezydium = k.sklad.filter((c) => rodzajFunkcji(c.funkcja) !== 'czlonek');
  const czlonkowie = k.sklad.filter((c) => rodzajFunkcji(c.funkcja) === 'czlonek');

  return (
    <div className="obszar max-w-4xl py-10">
      <p className="text-sm text-atrament-2">
        <Link href="/komisje" className="inline-flex min-h-11 items-center hover:text-akcent">Komisje</Link>
        {` · ${k.kod}`}
      </p>
      <header className="mt-1">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">{k.nazwa}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-atrament-2">
          <span>{etykietaTypu(k.typ)}</span>
          {k.powolana ? <span>{`powołana ${dataSlownie(k.powolana)}`}</span> : null}
          <Zrodlo adres={adresKomisjiWRejestrze(k.kod)} etykieta="ta komisja w rejestrze" />
        </p>
      </header>

      {k.zakres ? (
        <section className="mt-6 rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <h2 className="szryft text-lg font-semibold">Czym się zajmuje</h2>
          <p className="mt-2 leading-relaxed text-atrament-2">{k.zakres}</p>
          <p className="mt-2 text-xs text-atrament-3">Zakres działania słowami rejestru Sejmu.</p>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="szryft text-2xl font-semibold">Skład</h2>
        <p className="mt-2 text-sm text-atrament-2">
          {`${zOdmiana(k.sklad.length, 'poseł', 'posłów', 'posłów')} według rejestru`}
          {imp?.kiedy ? ` z ${dataSlownie(imp.kiedy.slice(0, 10))}` : ''}
          {'. Rejestr podaje skład bieżący — kto odszedł z komisji, nie ma go na liście.'}
        </p>

        {prezydium.length ? (
          <>
            <h3 className="mt-6 text-sm font-medium tracking-wider text-atrament-3 uppercase">Prezydium</h3>
            <ListaCzlonkow lista={prezydium} />
          </>
        ) : null}
        {czlonkowie.length ? (
          <>
            <h3 className="mt-6 text-sm font-medium tracking-wider text-atrament-3 uppercase">
              {`Członkowie (${liczba(czlonkowie.length)})`}
            </h3>
            <ListaCzlonkow lista={czlonkowie} />
          </>
        ) : null}
      </section>
    </div>
  );
}

function ListaCzlonkow({ lista }: { lista: CzlonekKomisji[] }) {
  return (
    <ul className="mt-2 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
      {lista.map((c) => (
        <li key={c.posel_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
          <span className="flex flex-wrap items-baseline gap-x-3">
            <Link href={`/posel/${c.slug}`} className="inline-block py-1.5 font-medium hover:text-akcent">
              {c.imie_nazwisko}
            </Link>
            {c.klub ? <span className="text-xs text-atrament-3">{c.klub}</span> : null}
          </span>
          <span className="text-sm text-atrament-2">
            {c.funkcja ? <span className="font-medium text-atrament">{c.funkcja}</span> : null}
            {c.funkcja && c.od ? ' · ' : ''}
            {c.od ? `od ${dataSlownie(c.od)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
