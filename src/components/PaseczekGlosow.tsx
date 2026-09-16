import { liczba } from '@/lib/format';

/**
 * Pasek rozkladu glosow w jednym glosowaniu.
 *
 * NIEOBECNI SA CZESCIA PASKA, a nie pominieci. Pasek liczony wylacznie
 * z oddanych glosow pokazuje 100% poparcia przy glosowaniu, w ktorym
 * uczestniczylo 40 poslow — i to jest wykres, ktory klamie skala.
 */
export function PaseczekGlosow({
  za,
  przeciw,
  wstrzymalo,
  nieobecnych,
  className = '',
  zOpisem = false,
}: {
  za: number;
  przeciw: number;
  wstrzymalo: number;
  nieobecnych: number;
  className?: string;
  zOpisem?: boolean;
}) {
  const czesci = [
    { etykieta: 'za', ile: za, klasa: 'bg-[#1b9e63] dark:bg-[#34b87c]' },
    { etykieta: 'przeciw', ile: przeciw, klasa: 'bg-[#d2453f] dark:bg-[#e2635d]' },
    { etykieta: 'wstrzymało się', ile: wstrzymalo, klasa: 'bg-[#e0a021] dark:bg-[#d9a52e]' },
    { etykieta: 'nie głosowało', ile: nieobecnych, klasa: 'bg-kreska-2' },
  ].filter((c) => c.ile > 0);

  const suma = czesci.reduce((a, c) => a + c.ile, 0) || 1;

  return (
    <div className={className}>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-papier-3"
        role="img"
        aria-label={czesci.map((c) => `${c.etykieta}: ${c.ile}`).join(', ')}
      >
        {czesci.map((c) => (
          <span key={c.etykieta} className={c.klasa} style={{ width: `${(c.ile / suma) * 100}%` }} />
        ))}
      </div>
      <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 ${zOpisem ? 'text-sm' : 'text-xs'} text-atrament-2`}>
        {czesci.map((c) => (
          <span key={c.etykieta} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${c.klasa}`} aria-hidden />
            <span className="liczby font-medium text-atrament">{liczba(c.ile)}</span>
            {c.etykieta}
          </span>
        ))}
      </div>
    </div>
  );
}
