import type { Metadata } from 'next';
import { bazaDostepna, kluby, listaPoslow } from '@/lib/dane';
import { BrakDanych } from '@/components/BrakDanych';
import { PrzegladPoslow } from '@/components/PrzegladPoslow';
import { Zrodlo } from '@/components/Zrodlo';

export const metadata: Metadata = {
  title: 'Posłowie',
  description: 'Wszyscy posłowie Sejmu X kadencji — z klubem, okręgiem i sposobem głosowania.',
};

export default function StronaPoslow() {
  if (!bazaDostepna()) return <BrakDanych />;

  const poslowie = listaPoslow();
  const listaKlubow = kluby();

  return (
    <div className="obszar py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">Posłowie</h1>
        <Zrodlo adres="https://api.sejm.gov.pl/sejm/term10/MP" etykieta="rejestr posłów" />
      </div>
      <p className="mt-2 max-w-2xl text-atrament-2">
        Cały skład kadencji, razem z tymi, których mandat wygasł — nikogo nie ukrywamy.
      </p>

      <div className="mt-6">
        <PrzegladPoslow
          poslowie={poslowie.map((p) => ({
            id: p.id,
            slug: p.slug,
            nazwa: p.imie_nazwisko,
            nazwisko: p.nazwisko,
            klub: p.klub_id,
            okreg: p.okreg_nazwa,
            wojewodztwo: p.wojewodztwo,
            aktywny: p.aktywny === 1,
            maZdjecie: p.ma_zdjecie,
          }))}
          // Filtry pokazuja tylko kluby, w ktorych ktos jest. Tabela klubow
          // zawiera takze kluby HISTORYCZNE, zalozone przy imporcie glosow
          // (Kukiz15, Republikanie i inne) — jako filtr listy poslow daly by
          // cztery guziki, ktore niczego nie znajduja.
          kluby={listaKlubow.filter((k) => k.poslow > 0).map((k) => ({
            id: k.id,
            etykieta: k.id,
            barwa: k.barwa,
            barwaCiemna: k.barwaCiemna,
          }))}
        />
      </div>
    </div>
  );
}
