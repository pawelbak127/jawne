import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, listaKomisji, zrodloImportu } from '@/lib/dane';
import { naglowekTypu } from '@/lib/komisje';
import { dataSlownie, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

export const metadata: Metadata = {
  title: 'Komisje sejmowe',
  description: 'Komisje Sejmu X kadencji: czym się zajmują i kto w nich zasiada — według rejestru Sejmu.',
};

/**
 * Lista komisji pogrupowana po typie. Bez zadnego porzadku „waznosci" —
 * w grupie alfabetycznie (zasada 8: nie wybieramy waznych wedlug siebie).
 */
export default function StronaKomisji() {
  if (!bazaDostepna()) return <BrakDanych />;
  const lista = listaKomisji();
  const imp = zrodloImportu('komisje');
  const typy = [...new Set(lista.map((k) => k.typ))];

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { nazwa: 'Komisje' }]} />
      <Wypis
        tytul="Komisje sejmowe"
        podtytul={`Komisje przygotowują projekty ustaw, zanim trafią na salę. Opis zakresu każdej komisji pochodzi z rejestru Sejmu; skład jest bieżący${imp?.kiedy ? ` (stan z ${dataSlownie(imp.kiedy.slice(0, 10))})` : ''}.`}
      />

      {!lista.length ? (
        <p className="mt-8 text-atrament-2">Komisji jeszcze nie pobraliśmy z rejestru.</p>
      ) : null}

      {typy.map((typ) => (
        <section key={typ} className="mt-8">
          <h2 className="szryft text-[1.3rem] font-semibold">{naglowekTypu(typ)}</h2>
          <ul className="pozycje sm:grid sm:grid-cols-2 sm:gap-x-8">
            {lista.filter((k) => k.typ === typ).map((k) => (
              <li key={k.kod}>
                <div className="min-w-0">
                  <Link href={`/komisja/${k.kod}`} className="tytul-poz">{k.nazwa}</Link>
                  <p className="meta"><span className="znak">{k.kod}</span>{` · ${zOdmiana(k.czlonkow, 'członek', 'członków', 'członków')}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="stan-danych">
        <span>{imp?.kiedy ? `stan danych: skład komisji ${dataSlownie(imp.kiedy.slice(0, 10))}` : 'stan danych: —'}</span>
        <span><Podstawa adres="https://api.sejm.gov.pl/sejm/term10/committees" nazwa="rejestr komisji" /></span>
      </p>
    </div>
  );
}
