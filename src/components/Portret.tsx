import { inicjaly } from '@/lib/format';

/**
 * Portret posla.
 *
 * ZWYKLY <img>, nie next/image — swiadomie. Optymalizator liczy kazdy obraz
 * jako transformacje, a 499 portretow zjadaloby darmowy limit w kilka dni.
 * Zdjecia sa i tak male (~50 kB) i serwuje je Sejm, wiec nie placimy za nie
 * ani transferem, ani miejscem.
 *
 * `ma_zdjecie` rozstrzygamy przy imporcie zapytaniem HEAD, zeby nie pokazywac
 * polamanej ikonki tam, gdzie rejestr zdjecia nie ma.
 */
export function Portret({
  id,
  imieNazwisko,
  maZdjecie,
  rozmiar = 'zwykly',
}: {
  id: number;
  imieNazwisko: string;
  maZdjecie: number | null;
  rozmiar?: 'maly' | 'zwykly' | 'duzy';
}) {
  const klasy = {
    maly: 'h-11 w-11 text-xs',
    zwykly: 'h-16 w-16 text-sm',
    duzy: 'h-28 w-28 text-xl sm:h-36 sm:w-36 sm:text-2xl',
  }[rozmiar];

  const wspolne = `${klasy} shrink-0 overflow-hidden rounded-xl border border-kreska bg-papier-3 object-cover`;

  if (maZdjecie === 0) {
    return (
      <span
        className={`${wspolne} grid place-items-center font-semibold text-atrament-3`}
        aria-hidden
        title={`Rejestr nie ma zdjęcia: ${imieNazwisko}`}
      >
        {inicjaly(imieNazwisko)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://api.sejm.gov.pl/sejm/term10/MP/${id}/photo`}
      alt={`Portret: ${imieNazwisko}`}
      loading="lazy"
      decoding="async"
      className={wspolne}
    />
  );
}
