import { inicjaly } from '@/lib/format';

/**
 * Portret posla.
 *
 * ZWYKLY <img>, nie next/image — swiadomie. Optymalizator liczy kazdy obraz
 * jako transformacje, a 499 portretow zjadaloby darmowy limit w kilka dni.
 * Pliki sa male (~50 kB) i lezą u nas w bazie, wiec nie ma czego optymalizowac.
 *
 * `ma_zdjecie === 0` znaczy "sprawdzilismy i rejestr go nie ma" — wtedy od razu
 * inicjaly, zamiast polamanej ikonki. `null` znaczy "jeszcze nie sprawdzalismy",
 * wiec probujemy pobrac; to sa dwa rozne stany i nie wolno ich zlepic.
 */
export function Portret({
  slug,
  imieNazwisko,
  maZdjecie,
  rozmiar = 'zwykly',
}: {
  slug: string;
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
        title={`Rejestr nie ma zdjęcia: ${imieNazwisko}`}
      >
        {inicjaly(imieNazwisko)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/posel/${slug}/zdjecie`}
      alt={`Portret: ${imieNazwisko}`}
      loading="lazy"
      decoding="async"
      className={wspolne}
    />
  );
}
