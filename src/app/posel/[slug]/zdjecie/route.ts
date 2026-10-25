import { bazaDostepna, posel, zdjeciePosla } from '@/lib/dane';
import { inicjalyJakoSvg, PAMIEC_PORTRETU } from '@/lib/inicjaly-svg';

/**
 * Zdjecie posla serwowane z naszej bazy.
 *
 * Strona moglaby wskazywac wprost na api.sejm.gov.pl, ale wtedy kazde wejscie
 * na liste 499 poslow wysyla 499 zadan do rejestru — i jest to ruch, ktory my
 * generujemy u kogos innego. Skoro i tak mamy te pliki lokalnie, serwujemy
 * je sami. Przy okazji strona dziala, gdy rejestr ma awarie.
 *
 * Gdy zdjecia nie ma, trasa NIE zwraca 404, tylko rysuje inicjaly
 * (src/lib/inicjaly-svg.ts). Male portrety biora /posel/[slug]/miniatura.
 */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return new Response('Nie ma takiego posła', { status: 404 });

  const z = zdjeciePosla(p.id);

  if (!z) {
    return new Response(inicjalyJakoSvg(p.imie_nazwisko), {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': PAMIEC_PORTRETU },
    });
  }

  return new Response(new Uint8Array(z.bajty), {
    headers: { 'content-type': z.typ, 'cache-control': PAMIEC_PORTRETU },
  });
}
