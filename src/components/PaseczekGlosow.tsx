import { BARWY_GLOSU } from '@/lib/barwy-glosu';
import { liczba } from '@/lib/format';

export type LiczbyGlosowania = {
  za: number;
  przeciw: number;
  wstrzymalo: number;
  nieobecnych: number;
  glosowalo: number;
  rodzaj: string | null;
};

/**
 * Pasek rozkladu glosow w jednym glosowaniu.
 *
 * NIEOBECNI SA CZESCIA PASKA, a nie pominieci. Pasek liczony wylacznie
 * z oddanych glosow pokazuje 100% poparcia przy glosowaniu, w ktorym
 * uczestniczylo 40 poslow — i to jest wykres, ktory klamie skala.
 *
 * OBECNI BEZ GLOSU ZA/PRZECIW TEZ. Zmierzone: w glosowaniu kworum rejestr
 * podaje 0 za, 0 przeciw, 58 nieobecnych i 402 glosujacych (PRESENT).
 * Pasek bez tego odcinka byl w calosci szary i podpisany "58 nie glosowalo",
 * czyli sugerowal, ze nikt nie przyszedl. Takich glosowan jest 59.
 */
export function PaseczekGlosow({
  g,
  className = '',
  zOpisem = false,
}: {
  g: LiczbyGlosowania;
  className?: string;
  zOpisem?: boolean;
}) {
  const bezGlosu = Math.max(0, g.glosowalo - g.za - g.przeciw - g.wstrzymalo);
  const czesci = [
    { etykieta: 'za', ile: g.za, b: BARWY_GLOSU.za },
    { etykieta: 'przeciw', ile: g.przeciw, b: BARWY_GLOSU.przeciw },
    { etykieta: 'wstrzymało się', ile: g.wstrzymalo, b: BARWY_GLOSU.wstrzymal },
    {
      // Wybory na liscie (np. Marszalka) daja "glos wazny" bez za/przeciw,
      // a glosowanie kworum — sama obecnosc. Nazwa zalezy od rodzaju.
      etykieta: g.rodzaj === 'ON_LIST' ? 'głosowało na liście' : 'obecnych bez głosu za/przeciw',
      ile: bezGlosu,
      b: BARWY_GLOSU.inne,
    },
    { etykieta: 'nie głosowało', ile: g.nieobecnych, b: BARWY_GLOSU.brak },
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
          <span
            key={c.etykieta}
            className="miejsce-probka"
            style={{ width: `${(c.ile / suma) * 100}%`, '--b': c.b.jasny, '--bc': c.b.ciemny } as React.CSSProperties}
          />
        ))}
      </div>
      <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 ${zOpisem ? 'text-sm' : 'text-xs'} text-atrament-2`}>
        {czesci.map((c) => (
          <span key={c.etykieta} className="inline-flex items-center gap-1.5">
            <span
              className="miejsce-probka h-2 w-2 rounded-full"
              style={{ '--b': c.b.jasny, '--bc': c.b.ciemny } as React.CSSProperties}
              aria-hidden
            />
            <span className="liczby font-medium text-atrament">{liczba(c.ile)}</span>
            {c.etykieta}
          </span>
        ))}
      </div>
    </div>
  );
}
