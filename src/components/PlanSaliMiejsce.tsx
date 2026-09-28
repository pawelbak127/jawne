import type { MiejsceNaSali } from '@/lib/plan-sali';

/**
 * Miejsce JEDNEGO posla na tle sali — ilustracja, nie narzedzie.
 *
 * To jest osobny komponent, a nie `PlanSali` z wyroznieniem, i powod jest
 * zmierzony. Strona posla z pelnym, interaktywnym planem wazyla **258 kB**
 * zamiast 88 kB: kazda z 499 stron niosla nazwisko, slug, klub i okreg
 * wszystkich 460 poslow, raz w HTML-u i drugi raz w danych Reacta.
 * Na serwerze z 2 GB pamieci build wpadl po ~400 stronach w swap i pieciu
 * ostatnim stronom zabraklo 300 sekund NA STRONE.
 *
 * Tutaj tlo to same kropki — bez nazwisk, bez odnosnikow, bez JavaScriptu.
 * Kto siedzi obok, pokazuje `/sala`, gdzie jest na to miejsce.
 */
export function PlanSaliMiejsce({
  plan,
  wyroznionyId,
  barwa,
  barwaCiemna,
  szerokosc,
  wysokosc,
  opis,
}: {
  plan: readonly MiejsceNaSali[];
  wyroznionyId: number;
  barwa: string;
  barwaCiemna: string;
  szerokosc: number;
  wysokosc: number;
  opis: string;
}) {
  const moje = plan.find((m) => m[0] === wyroznionyId);
  if (!moje) return null;

  return (
    <svg
      viewBox={`0 0 ${szerokosc} ${wysokosc}`}
      className="block h-auto w-full rounded-2xl border border-kreska bg-papier-2"
      role="img"
      aria-label={opis}
    >
      {/*
        Tlo to JEDEN element, nie 459 kropek. Odcinek zerowej dlugosci
        z zaokraglonym zakonczeniem rysuje sie jako kropka, wiec cala sala
        miesci sie w jednym atrybucie `d`. Roznica jest mierzalna: strona
        posla schudla z 258 kB (pelny plan) przez 144 kB (459 elementow
        <circle>) do niecalych 100 kB — a kazdy element to tez osobny wpis
        w danych Reacta, ktore ida do przegladarki drugi raz.
      */}
      <path
        d={plan.filter((m) => m[0] !== wyroznionyId).map(([, , x, y]) => `M${x} ${y}h.01`).join('')}
        className="stroke-kreska"
        strokeWidth={8.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
      <circle
        cx={moje[2]}
        cy={moje[3]}
        r={7.5}
        className="miejsce"
        style={{ '--b': barwa, '--bc': barwaCiemna, stroke: 'var(--atrament)', strokeWidth: 1.8 } as React.CSSProperties}
      />
    </svg>
  );
}
