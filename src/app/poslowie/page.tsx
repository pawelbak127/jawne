import type { Metadata } from 'next';
import { bazaDostepna, kluby, listaPoslow, zrodloImportu } from '@/lib/dane';
import { dataKrotko } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { PrzegladPoslow } from '@/components/PrzegladPoslow';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

export const metadata: Metadata = {
  title: 'Posłowie Sejmu X kadencji — kluby, okręgi, głosowania',
  description: 'Wszyscy posłowie Sejmu X kadencji — z klubem, okręgiem i sposobem głosowania.',
};

export default function StronaPoslow() {
  if (!bazaDostepna()) return <BrakDanych />;

  const poslowie = listaPoslow();
  const listaKlubow = kluby();

  const importPoslow = zrodloImportu('poslowie');

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { nazwa: 'Posłowie' }]} />
      <Wypis tytul="Posłowie" podtytul="Cały skład kadencji, razem z tymi, których mandat wygasł — nikogo nie ukrywamy." />
      <div>
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
      <p className="stan-danych">
        <span>{importPoslow ? `stan danych: rejestr posłów ${dataKrotko(importPoslow.kiedy)}` : 'stan danych: —'}</span>
        <span><Podstawa adres="https://api.sejm.gov.pl/sejm/term10/MP" nazwa="rejestr posłów" /></span>
      </p>
    </div>
  );
}
