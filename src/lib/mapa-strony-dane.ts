import { ADRES_SERWISU } from '@/lib/adres';
import {
  bazaDostepna, firmyDoMapy, glosowaniaDoMapy, kodyKomisji, okregi, organyDoMapy, procesyDoMapy,
  slugiPoslow, terytyGmin, wojewodztwaGmin,
} from '@/lib/dane';
import type { WpisMapy } from '@/lib/mapa-strony';
import { pominietoNazwiska } from '@/lib/prywatnosc';
import { MAKS_ADRESOW_MAPY } from '@/lib/przeglad';
import { adresWojewodztwa } from '@/lib/tekst';

const adres = (sciezka: string) => new URL(sciezka, ADRES_SERWISU).toString();

/**
 * Plik pierwszy: wszystko poza stronami firm.
 *
 * Glosowania i druki z pominietymi nazwiskami osob prywatnych nie trafiaja do
 * mapy — te same, ktore ich strony oznaczaja `noindex` na stale.
 */
export function adresyStron(): WpisMapy[] {
  const stale = ['/', '/gminy', '/mapa', '/okregi', '/sala', '/ustawy', '/komisje', '/poslowie', '/glosowania', '/pomoc-publiczna', '/o-serwisie', '/stan'].map((s) => ({ url: adres(s) }));
  if (!bazaDostepna()) return stale;
  return [
    ...stale,
    ...slugiPoslow().map((s) => ({ url: adres(`/posel/${s}`) })),
    ...okregi().map((o) => ({ url: adres(`/okreg/${o.nr}`) })),
    ...kodyKomisji().map((kod) => ({ url: adres(`/komisja/${kod}`) })),
    ...wojewodztwaGmin().map((w) => ({ url: adres(`/gminy/${adresWojewodztwa(w.wojewodztwo)}`) })),
    ...wojewodztwaGmin().map((w) => ({ url: adres(`/gminy/${adresWojewodztwa(w.wojewodztwo)}/porownanie`) })),
    ...terytyGmin().map((t) => ({ url: adres(`/gmina/${t}`) })),
    // Druki z nazwiskiem osoby prywatnej w tytule maja noindex — jak glosowania.
    ...procesyDoMapy().filter((p) => !pominietoNazwiska(p.tytul)).map((p) => ({ url: adres(`/ustawa/${p.numer}`) })),
    ...glosowaniaDoMapy()
      .filter((g) => !pominietoNazwiska(g.tytul) && !pominietoNazwiska(g.temat) && !pominietoNazwiska(g.opis))
      // Sama data: rejestr podaje czas BEZ strefy („2023-11-13T15:17:22”), a format
      // map stron (W3C Datetime) wymaga strefy przy godzinie. ZMIERZONE 14.10.2026:
      // Google Search Console zglosil 4 916 bledow — dokladnie tyle, ile glosowan.
      .map((g) => ({ url: adres(`/glosowanie/${g.posiedzenie}-${g.numer}`), lastModified: g.data.slice(0, 10) })),
    /*
     * Organy wchodza do TRZONU, nie do resztki: jest ich 910, a kazda taka
     * strona odpowiada na pytanie, ktorego nie zadaje zaden inny polski serwis
     * („co ten organ przyznal w calym kraju"). Lista jest juz po regule
     * jawnosci — organem bywa osoba fizyczna (pulapka 34).
     */
    ...organyDoMapy().map((nip) => ({ url: adres(`/organ/${nip}`) })),
  ];
}

/**
 * Plik drugi: strony firm — TYLE SAMO, ile przed podzialem.
 *
 * ZMIERZONE NA SERWERZE 01.10.2026: lista firm ma dokladnie 50 000 pozycji
 * (tyle wynosi jej wlasny limit), a gdy stala w jednym pliku przed
 * glosowaniami, zjadala caly przydzial: w mapie bylo 45 247 stron firm
 * i **ani jednej z 4 641 stron glosowan**. Od tamtej pory firmy dostaja
 * reszte miejsca do 50 tys. adresow lacznie.
 *
 * Osobny plik moglby juz miec pelne 50 tys. firm, ale celowo ich nie
 * dokladamy: podzial (27.10.2026) ma zmienic to, co widac w Search Console,
 * a nie to, co polecamy wyszukiwarkom — inaczej pomiar mierzylby dwie zmiany
 * naraz. Ile firm polecac, to osobna decyzja Pawla, po pomiarze.
 *
 * Tylko osoby prawne: strona osoby fizycznej ma noindex, wiec w mapie
 * bylaby sprzecznoscia. Regule sprawdza IMPORT — patrz `firmyDoMapy`.
 */
export function adresyFirm(stronWPierwszymPliku: number): WpisMapy[] {
  if (!bazaDostepna()) return [];
  const miejsca = Math.max(0, MAKS_ADRESOW_MAPY - stronWPierwszymPliku);
  return firmyDoMapy().slice(0, miejsca).map((nip) => ({ url: adres(`/firma/${nip}`) }));
}
