/**
 * Numer sprawy pomocy panstwa w Komisji Europejskiej — z pola SUDOP
 * `srodek_numer` (numer programu pomocowego).
 *
 * ZMIERZONE 04.10.2026 na serwerze (probka co 50. wiersza, 140 945 wierszy):
 * numer zaczyna sie od „SA." w 30 831 przypadkach (ok. 22%), np.
 * „SA.56922(2020/N)" — srodki antykryzysowe COVID-19. Pod takim numerem
 * Komisja publikuje swoja decyzje; sprawdzone w przegladarce: strona
 * competition-cases.ec.europa.eu/cases/SA.56922 pokazuje wlasnie te sprawe
 * („Polish anti-crisis measures - COVID-19 …", decyzja 23.04.2020).
 *
 * Dopisek w nawiasie („(2020/N)") to rok i rodzaj zgloszenia — adres strony
 * Komisji uzywa samego numeru, wiec go odcinamy. Kazdy inny zapis numeru
 * (krajowe numery programow, puste pole) daje `null`: lepiej nie dac
 * odnosnika niz dac odnosnik, ktory prowadzi do cudzej sprawy.
 */
const NUMER_SA = /^SA\.(\d{4,6})(?![\d])/;

export function numerSprawyKE(srodekNumer: string | null | undefined): string | null {
  const m = NUMER_SA.exec((srodekNumer ?? '').trim());
  return m ? `SA.${m[1]}` : null;
}

export const adresSprawyKE = (numer: string) =>
  `https://competition-cases.ec.europa.eu/cases/${encodeURIComponent(numer)}`;
