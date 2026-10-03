import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, listaKomisji, zrodloImportu } from '@/lib/dane';
import { naglowekTypu } from '@/lib/komisje';
import { dataSlownie, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';

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
    <div className="obszar max-w-4xl py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Komisje sejmowe</h1>
        <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/committees" etykieta="rejestr komisji" />
      </div>
      <p className="mt-3 max-w-3xl text-atrament-2">
        Komisje przygotowują projekty ustaw, zanim trafią na salę. Opis zakresu każdej
        komisji pochodzi z rejestru Sejmu; skład jest bieżący
        {imp?.kiedy ? ` (stan z ${dataSlownie(imp.kiedy.slice(0, 10))})` : ''}.
      </p>

      {!lista.length ? (
        <p className="mt-8 text-atrament-2">Komisji jeszcze nie pobraliśmy z rejestru.</p>
      ) : null}

      {typy.map((typ) => (
        <section key={typ} className="mt-10">
          <h2 className="szryft text-2xl font-semibold">{naglowekTypu(typ)}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {lista.filter((k) => k.typ === typ).map((k) => (
              <li key={k.kod}>
                <Link
                  href={`/komisja/${k.kod}`}
                  className="flex h-full flex-col gap-1 rounded-2xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta"
                >
                  <span className="leading-snug font-medium">{k.nazwa}</span>
                  <span className="text-xs text-atrament-3">
                    {`${k.kod} · ${zOdmiana(k.czlonkow, 'członek', 'członków', 'członków')}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
