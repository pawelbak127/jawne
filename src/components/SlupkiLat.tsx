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
            className={`grid ${szerokaEtykieta ? 'grid-cols-[10.5rem_1fr_4rem]' : 'grid-cols-[3rem_1fr_6rem]'} items-center gap-3 text-sm`}
          >
            <span className="liczby text-atrament-2">{w.rok}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-papier-3">
              <span className="block h-full rounded-full bg-akcent" style={{ width: `${((w.wartosc ?? 0) / max) * 100}%` }} />
            </span>
            <span className="liczby text-right text-xs">{zlote(w.wartosc)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
