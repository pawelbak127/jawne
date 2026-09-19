import type { MetadataRoute } from 'next';
import { ADRES_SERWISU } from '@/lib/adres';
import { bazaDostepna, beneficjenciDoMapy, glosowaniaDoMapy, okregi, slugiPoslow, terytyGmin } from '@/lib/dane';
import { nazwaPodmiotuJawna, pominietoNazwiska } from '@/lib/prywatnosc';

/**
 * Mapa strony — ponizej limitu 50 tys. adresow w jednym pliku.
 * Dopoki layout ma `noindex` (serwis przed premiera), mapa niczego nie
 * wystawia; jest gotowa na dzien, w ktorym Pawel zdejmie blokade.
 *
 * Glosowania z pominietymi nazwiskami osob prywatnych nie trafiaja do mapy —
 * te same, ktore strona glosowania oznacza `noindex` na stale.
 */
// Mapa nie dziedziczy ustawienia z layoutu — bez tego zostaje z dnia budowania.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const adres = (sciezka: string) => new URL(sciezka, ADRES_SERWISU).toString();
  const stale = ['/', '/okregi', '/poslowie', '/glosowania', '/pomoc-publiczna', '/o-serwisie', '/stan'].map((s) => ({ url: adres(s) }));
  if (!bazaDostepna()) return stale;
  return [
    ...stale,
    ...slugiPoslow().map((s) => ({ url: adres(`/posel/${s}`) })),
    ...okregi().map((o) => ({ url: adres(`/okreg/${o.nr}`) })),
    ...terytyGmin().map((t) => ({ url: adres(`/gmina/${t}`) })),
    // Tylko osoby prawne: strona osoby fizycznej ma noindex, wiec w mapie
    // bylaby sprzecznoscia.
    ...beneficjenciDoMapy().filter((b) => nazwaPodmiotuJawna(b.nazwa)).map((b) => ({ url: adres(`/firma/${b.nip}`) })),
    ...glosowaniaDoMapy()
      .filter((g) => !pominietoNazwiska(g.tytul) && !pominietoNazwiska(g.temat) && !pominietoNazwiska(g.opis))
      .map((g) => ({ url: adres(`/glosowanie/${g.posiedzenie}-${g.numer}`), lastModified: g.data })),
  ];
}
