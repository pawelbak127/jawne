import type { MetadataRoute } from 'next';
import { ADRES_SERWISU } from '@/lib/adres';
import {
  bazaDostepna, firmyDoMapy, glosowaniaDoMapy, kodyKomisji, okregi, organyDoMapy, procesyDoMapy,
  slugiPoslow, terytyGmin, wojewodztwaGmin,
} from '@/lib/dane';
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
  const stale = ['/', '/gminy', '/mapa', '/okregi', '/sala', '/ustawy', '/komisje', '/poslowie', '/glosowania', '/pomoc-publiczna', '/o-serwisie', '/stan'].map((s) => ({ url: adres(s) }));
  if (!bazaDostepna()) return stale;
  const wszystko = [
    ...stale,
    ...slugiPoslow().map((s) => ({ url: adres(`/posel/${s}`) })),
    ...okregi().map((o) => ({ url: adres(`/okreg/${o.nr}`) })),
    ...kodyKomisji().map((kod) => ({ url: adres(`/komisja/${kod}`) })),
    ...wojewodztwaGmin().map((w) => ({ url: adres(`/gminy/${adresWojewodztwa(w.wojewodztwo)}`) })),
    ...terytyGmin().map((t) => ({ url: adres(`/gmina/${t}`) })),
    // Druki z nazwiskiem osoby prywatnej w tytule maja noindex — jak glosowania.
    ...procesyDoMapy().filter((p) => !pominietoNazwiska(p.tytul)).map((p) => ({ url: adres(`/ustawa/${p.numer}`) })),
    ...glosowaniaDoMapy()
      .filter((g) => !pominietoNazwiska(g.tytul) && !pominietoNazwiska(g.temat) && !pominietoNazwiska(g.opis))
      .map((g) => ({ url: adres(`/glosowanie/${g.posiedzenie}-${g.numer}`), lastModified: g.data })),
  ];
  /*
   * FIRMY NA KOŃCU, i tylko tyle, ile zostanie miejsca.
   *
   * ZMIERZONE NA SERWERZE 01.10.2026: lista firm ma dokładnie 50 000 pozycji
   * (tyle wynosi jej własny limit), a całość była docinana TYM SAMYM limitem.
   * Firmy stały przed głosowaniami, więc zjadały cały przydział: w mapie było
   * 45 247 stron firm i **ani jednej z 4 641 stron głosowań** — czyli rdzeń
   * serwisu był dla wyszukiwarek niewidzialny. Błąd powstał 28.09.2026 przy
   * naprawie innej cichej straty: ten sam `MAKS_ADRESOW_MAPY` nałożono dwa
   * razy, raz na listę firm i raz na sumę.
   *
   * Kolejność nie jest tu kosmetyką, tylko decyzją o tym, co serwis uważa
   * za swoją treść. Strony gmin, posłów, ustaw i głosowań wchodzą ZAWSZE;
   * firmy dostają resztę miejsca, bo typowa strona firmy to kilka wierszy
   * pomocy de minimis.
   */
  /*
   * Organy wchodza do TRZONU, nie do resztki: jest ich 910, a kazda taka
   * strona odpowiada na pytanie, ktorego nie zadaje zaden inny polski serwis
   * („co ten organ przyznal w calym kraju"). Lista jest juz po regule
   * jawnosci — organem bywa osoba fizyczna (pulapka 34).
   */
  const organy = organyDoMapy().map((nip) => ({ url: adres(`/organ/${nip}`) }));
  const trzon = [...wszystko, ...organy];
  const miejsca = Math.max(0, MAKS_ADRESOW_MAPY - trzon.length);
  // Tylko osoby prawne: strona osoby fizycznej ma noindex, wiec w mapie
  // bylaby sprzecznoscia. Regule sprawdza IMPORT — patrz `firmyDoMapy`.
  const firmy = firmyDoMapy().slice(0, miejsca).map((nip) => ({ url: adres(`/firma/${nip}`) }));
  return [...trzon, ...firmy];
}
