import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, kodyKomisji, komisja, zrodloImportu, type CzlonekKomisji } from '@/lib/dane';
import { adresKomisjiWRejestrze, etykietaTypu, rodzajFunkcji } from '@/lib/komisje';
import { dataSlownie, liczba, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Podstawa, Wypis } from '@/components/Szablon';

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
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { adres: '/komisje', nazwa: 'Komisje' }, { nazwa: k.nazwa }]} />
      <Wypis
        tytul={k.nazwa}
        podtytul={`${etykietaTypu(k.typ)}${k.powolana ? ` · powołana ${dataSlownie(k.powolana)}` : ''} · ${zOdmiana(k.sklad.length, 'poseł', 'posłów', 'posłów')} w składzie`}
      />

      {k.zakres ? (
        <section className="w-liczbach po-ludzku" aria-labelledby="zakres-t">
          <h2 id="zakres-t">Czym się zajmuje</h2>
          <p className="py-2 leading-relaxed">{k.zakres}</p>
          <p className="pb-3"><Podstawa adres={adresKomisjiWRejestrze(k.kod)} nazwa="zakres słowami rejestru Sejmu" /></p>
        </section>
      ) : null}

      <p className="stan-danych">
        <span className="znak">{k.kod}</span>
        <span>{imp?.kiedy ? `stan danych: skład ${dataSlownie(imp.kiedy.slice(0, 10))}` : 'stan danych: —'}</span>
        <span><Podstawa adres={adresKomisjiWRejestrze(k.kod)} nazwa="ta komisja w rejestrze" /></span>
      </p>

      <Dzial id="sklad" nr={2} tytul={`Skład: ${zOdmiana(k.sklad.length, 'poseł', 'posłów', 'posłów')}`}>
        <p className="wstep">Rejestr podaje skład bieżący — kto odszedł z komisji, nie ma go na liście.</p>
        {prezydium.length ? (
          <>
            <h3>Prezydium</h3>
            <ListaCzlonkow lista={prezydium} />
          </>
        ) : null}
        {czlonkowie.length ? (
          <>
            <h3>{`Członkowie (${liczba(czlonkowie.length)})`}</h3>
            <ListaCzlonkow lista={czlonkowie} />
          </>
        ) : null}
      </Dzial>
    </div>
  );
}

function ListaCzlonkow({ lista }: { lista: CzlonekKomisji[] }) {
  return (
    <ul className="pozycje">
      {lista.map((c) => (
        <li key={c.posel_id}>
          <div className="min-w-0">
            <Link href={`/posel/${c.slug}`} className="tytul-poz">{c.imie_nazwisko}</Link>
            <p className="meta">
              {c.klub ?? 'bez klubu'}
              {c.funkcja ? <>{' · '}<b className="text-atrament">{c.funkcja}</b></> : null}
              {c.od ? ` · od ${dataSlownie(c.od)}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
