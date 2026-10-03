import type { MetadataRoute } from 'next';
import { ADRES_SERWISU } from '@/lib/adres';
import { INDEKSOWANIE_WLACZONE } from '@/lib/premiera';

// Bez tego pliku /robots.txt oddawal strone 404 (zmierzone 03.10.2026 na
// zrejestru.pl). Nie dziedziczy ustawienia z layoutu — to osobna trasa.
export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  if (!INDEKSOWANIE_WLACZONE) {
    // Przed premiera: jedna, jednoznaczna odpowiedz. Mapy strony tu NIE
    // podajemy — wskazywanie 50 tys. adresow i jednoczesne zabranianie
    // ich odwiedzania to sprzeczny komunikat.
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', ADRES_SERWISU).toString(),
  };
}
