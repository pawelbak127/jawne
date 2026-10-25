import { dataSlownie } from '@/lib/format';

export const ZRODLO_SUDOP = 'https://sudop.uokik.gov.pl';

/**
 * Warunki ponownego wykorzystania danych SUDOP — z instrukcji UOKiK
 * (dane.gov.pl, zbior 6068). Urzad wymaga, zeby staly BEZPOSREDNIO przy
 * danych, wiec ten blok idzie pod kazde miejsce, gdzie te dane pokazujemy.
 *
 * Instrukcja wymaga szesciu ELEMENTOW, nie dosłownego brzmienia (docs/sudop.md):
 * zrodlo z odnosnikiem, data pobrania, „moga ulec zmianie”, odpowiedzialnosc
 * podmiotow udzielajacych, charakter pomocniczy, RODO. Od 25.10.2026 jednym
 * zwartym zdaniem — przeglad tresci: blok warunkow byl wiekszy niz sama liczba.
 * Pelna nazwa systemu zostaje: instrukcja mowi o „dokladnym zrodle”.
 */
export function WarunkiSudop({ pobrano }: { pobrano?: string | null }) {
  return (
    <div className="warunki">
      <p>
        <b className="font-semibold text-atrament">Źródło:</b>{' '}
        <a href={ZRODLO_SUDOP} target="_blank" rel="noreferrer">
          System Udostępniania Danych o Pomocy Publicznej (UOKiK)
        </a>
        {`${pobrano ? `, pobrane ${dataSlownie(pobrano)}` : ''}. Dane mogą ulec zmianie; za ich kompletność, prawidłowość i aktualność odpowiadają wyłącznie podmioty udzielające pomocy; mają charakter pomocniczy wobec zaświadczeń i oświadczeń beneficjenta; zawierają dane osobowe (RODO).`}
      </p>
    </div>
  );
}
