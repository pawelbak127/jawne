import { bazaDostepna, posel, zdjeciePosla } from '@/lib/dane';
import { inicjaly } from '@/lib/format';

/**
 * Zdjecie posla serwowane z naszej bazy.
 *
 * Strona moglaby wskazywac wprost na api.sejm.gov.pl, ale wtedy kazde wejscie
 * na liste 499 poslow wysyla 499 zadan do rejestru — i jest to ruch, ktory my
 * generujemy u kogos innego. Skoro i tak mamy te pliki lokalnie, serwujemy
 * je sami. Przy okazji strona dziala, gdy rejestr ma awarie.
 *
 * Gdy zdjecia nie ma, trasa NIE zwraca 404, tylko rysuje inicjaly.
 * 404 przy `<img>` daje ikonke zepsutego obrazka, ktora wyglada na awarie
 * serwisu, a to jest zwykly brak danych w rejestrze.
 */
function inicjalyJakoSvg(imieNazwisko: string): string {
  const litery = inicjaly(imieNazwisko).replace(/[<>&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" fill="#f1efe9"/>
  <text x="80" y="80" font-family="system-ui, sans-serif" font-size="54" font-weight="600"
        fill="#8b8794" text-anchor="middle" dominant-baseline="central">${litery}</text>
</svg>`;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return new Response('Nie ma takiego posła', { status: 404 });

  // Zdjecie posla nie zmienia sie w trakcie kadencji.
  const pamiec = 'public, max-age=86400, stale-while-revalidate=604800';
  const z = zdjeciePosla(p.id);

  if (!z) {
    return new Response(inicjalyJakoSvg(p.imie_nazwisko), {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': pamiec },
    });
  }

  return new Response(new Uint8Array(z.bajty), {
    headers: { 'content-type': z.typ, 'cache-control': pamiec },
  });
}
