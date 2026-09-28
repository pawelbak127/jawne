import type { MetadataRoute } from 'next';
import { ADRES_SERWISU } from '@/lib/adres';
import { bazaDostepna, firmyDoMapy, glosowaniaDoMapy, okregi, procesyDoMapy, slugiPoslow, terytyGmin, wojewodztwaGmin } from '@/lib/dane';
import { pominietoNazwiska } from '@/lib/prywatnosc';
import { MAKS_ADRESOW_MAPY } from '@/lib/przeglad';
import { adresWojewodztwa } from '@/lib/tekst';

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
  const stale = ['/', '/gminy', '/mapa', '/okregi', '/sala', '/ustawy', '/poslowie', '/glosowania', '/pomoc-publiczna', '/o-serwisie', '/stan'].map((s) => ({ url: adres(s) }));
  if (!bazaDostepna()) return stale;
  const wszystko = [
    ...stale,
    ...slugiPoslow().map((s) => ({ url: adres(`/posel/${s}`) })),
    ...okregi().map((o) => ({ url: adres(`/okreg/${o.nr}`) })),
    ...wojewodztwaGmin().map((w) => ({ url: adres(`/gminy/${adresWojewodztwa(w.wojewodztwo)}`) })),
    ...terytyGmin().map((t) => ({ url: adres(`/gmina/${t}`) })),
    // Druki z nazwiskiem osoby prywatnej w tytule maja noindex — jak glosowania.
    ...procesyDoMapy().filter((p) => !pominietoNazwiska(p.tytul)).map((p) => ({ url: adres(`/ustawa/${p.numer}`) })),
    // Tylko osoby prawne: strona osoby fizycznej ma noindex, wiec w mapie
    // bylaby sprzecznoscia. Regule sprawdza IMPORT — patrz `firmyDoMapy`.
    ...firmyDoMapy().map((nip) => ({ url: adres(`/firma/${nip}`) })),
    ...glosowaniaDoMapy()
      .filter((g) => !pominietoNazwiska(g.tytul) && !pominietoNazwiska(g.temat) && !pominietoNazwiska(g.opis))
      .map((g) => ({ url: adres(`/glosowanie/${g.posiedzenie}-${g.numer}`), lastModified: g.data })),
  ];
  // Limit protokolu jest twardy: plik z 240 tysiacami adresow jest nie tylko
  // niezgodny, ale i tak nie zostanie w calosci wczytany. Docinamy na koncu,
  // zeby zadna nowa sekcja nie przekroczyla go po cichu.
  return wszystko.slice(0, MAKS_ADRESOW_MAPY);
}
