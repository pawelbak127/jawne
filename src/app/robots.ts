import type { MetadataRoute } from 'next';
import { ADRES_SERWISU } from '@/lib/adres';
import { INDEKSOWANIE_WLACZONE } from '@/lib/premiera';

// Bez tego pliku /robots.txt oddawal strone 404 (zmierzone 03.10.2026 na
// zrejestru.pl). Nie dziedziczy ustawienia z layoutu — to osobna trasa.
export const revalidate = 3600;

/*
 * Po premierze wpuszczamy wszystkich (decyzja Pawla z 14.10.2026) — oprocz
 * adresow, ktore robotowi nic nie daja, a serwerowi kosztuja:
 *  - CSV gmin: plik pomocy publicznej duzego miasta to strumien po calej jego
 *    historii (pulapka 69); robot, ktory idzie za kazdym linkiem, pobralby
 *    2 479 x 3 pliki, a w wyszukiwarce i tak ich nie pokaze,
 *  - wyszukiwarka i /firmy z zapytaniem: nieskonczenie wiele adresow
 *    (kazda fraza to nowy URL), a Google sam odradza indeksowanie
 *    wewnetrznych wynikow wyszukiwania,
 *  - API: odpowiedzi JSON dla pola wyszukiwania.
 * Tresc kazdej z tych stron jest dostepna pod zwyklymi adresami z mapy strony.
 * Robot Mety (`meta-externalagent`) i tak dostaje 403 w Caddy — ignoruje
 * robots.txt (pulapka 73).
 */
export const ZAKAZANE_PO_PREMIERZE = ['/api/', '/szukaj', '/firmy?', '/gmina/*/csv/'];

export default function robots(): MetadataRoute.Robots {
  if (!INDEKSOWANIE_WLACZONE) {
    // Przed premiera: jedna, jednoznaczna odpowiedz. Mapy strony tu NIE
    // podajemy — wskazywanie 50 tys. adresow i jednoczesne zabranianie
    // ich odwiedzania to sprzeczny komunikat.
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ZAKAZANE_PO_PREMIERZE }],
    sitemap: new URL('/sitemap.xml', ADRES_SERWISU).toString(),
  };
}
