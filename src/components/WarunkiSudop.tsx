import { dataSlownie } from '@/lib/format';

export const ZRODLO_SUDOP = 'https://sudop.uokik.gov.pl';

/**
 * Warunki ponownego wykorzystania danych SUDOP — z instrukcji UOKiK
 * (dane.gov.pl, zbior 6068). Urzad wymaga, zeby staly BEZPOSREDNIO przy
 * danych, wiec ten blok idzie pod kazde miejsce, gdzie te dane pokazujemy.
 */
export function WarunkiSudop({ pobrano }: { pobrano?: string | null }) {
  return (
    <div className="mt-4 rounded-xl border border-kreska bg-papier-3 px-4 py-3 text-xs leading-relaxed text-atrament-2">
      <p>
        <span className="font-medium text-atrament">Źródło:</span>{' '}
        <a href={ZRODLO_SUDOP} className="underline underline-offset-2 hover:text-akcent" target="_blank" rel="noreferrer">
          System Udostępniania Danych o Pomocy Publicznej (UOKiK)
        </a>
        {`${pobrano ? `, dane pobrane ${dataSlownie(pobrano)}` : ''}. Dane mogą ulec zmianie. Za ich kompletność, prawidłowość i aktualność odpowiadają wyłącznie podmioty udzielające pomocy. Dane mają charakter pomocniczy i są drugorzędne wobec zaświadczeń oraz oświadczeń beneficjenta. Baza zawiera dane osobowe przetwarzane zgodnie z RODO.`}
      </p>
    </div>
  );
}
