import { zlote } from '@/lib/format';

/**
 * Kwota rok po roku jako poziome slupki — jedna seria, wiec bez legendy:
 * nazwe daje tytul. Dwie miary o roznej skali (dochody i inwestycje) to dwa
 * osobne wykresy, nigdy jedna os — inaczej mniejsza seria wyglada na zero.
 *
 * `null` to brak danych, nie zero: slupek zostaje pusty, a zamiast kwoty
 * stoi polpauza.
 */
export function SlupkiLat({ tytul, wiersze, szerokaEtykieta = false }: {
  tytul: string;
  wiersze: { rok: number | string; wartosc: number | null }[];
  /** dla nazw (np. wojewodztw) zamiast lat */
  szerokaEtykieta?: boolean;
}) {
  const max = Math.max(1, ...wiersze.map((w) => w.wartosc ?? 0));
  return (
    <div>
      <p className="text-sm font-medium">{tytul}</p>
      <ul className="mt-3 space-y-1.5">
        {wiersze.map((w) => (
          <li
            key={w.rok}
            title={`${w.rok}: ${zlote(w.wartosc)}`}
            // minmax(0, …) zamiast golej szerokosci: bez tego dluga nazwa (np.
            // "zachodniopomorskie") rozpycha siatke i cala strona daje sie
            // przesunac w bok na telefonie (ZMIERZONE 22.09.2026: 479 px z 390).
            className={`grid ${szerokaEtykieta ? 'grid-cols-[minmax(0,10.5rem)_1fr_minmax(0,4rem)]' : 'grid-cols-[minmax(0,3rem)_1fr_minmax(0,6rem)]'} items-center gap-3 text-sm`}
          >
            <span className="liczby min-w-0 truncate text-atrament-2">{w.rok}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-papier-3">
              <span className="block h-full rounded-full bg-akcent" style={{ width: `${((w.wartosc ?? 0) / max) * 100}%` }} />
            </span>
            <span className="liczby min-w-0 text-right text-xs">{zlote(w.wartosc)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
