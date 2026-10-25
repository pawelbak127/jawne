import { bazaDostepna, miniaturaPosla, posel } from '@/lib/dane';
import { inicjalyJakoSvg, PAMIEC_PORTRETU } from '@/lib/inicjaly-svg';

/**
 * Maly portret posla: ta sama fotografia co /posel/[slug]/zdjecie, skompresowana
 * od nowa (ok. 3 kB zamiast 14 kB, ingest/lib/miniatury.ts). Gdy miniatury
 * jeszcze nie ma — oryginal; gdy nie ma zdjecia — inicjaly, jak w trasie zdjecia.
 */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return new Response('Nie ma takiego posła', { status: 404 });

  const z = miniaturaPosla(p.id);
  if (!z) {
    return new Response(inicjalyJakoSvg(p.imie_nazwisko), {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': PAMIEC_PORTRETU },
    });
  }
  return new Response(new Uint8Array(z.bajty), {
    headers: { 'content-type': z.typ, 'cache-control': PAMIEC_PORTRETU },
  });
}
