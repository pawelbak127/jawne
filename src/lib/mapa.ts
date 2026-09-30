/** Jedna jednostka na mapie: ile zlotych na mieszkanca. */
export type WartoscNaMapie = { teryt: string; wartosc: number };

/** Ilu mieszkancow ma gmina — mianownik zwijania do powiatu. */
export type LudnoscGminy = { teryt: string; osob: number };

/**
 * Zwija wartosci gmin do powiatow.
 *
 * NIE usredniamy wartosci gmin. Srednia z „zlotych na mieszkanca" dalaby
 * gminie z tysiacem mieszkancow taka sama wage jak stolicy powiatu ze stu
 * tysiacami — a to inna liczba i nie ta, ktora legenda obiecuje. Skladamy
 * z powrotem licznik i mianownik: suma kwot przez sume mieszkancow
 * (kwota gminy = wartosc na mieszkanca razy jej ludnosc).
 *
 * Gmina bez wartosci nie wchodzi ANI do licznika, ANI do mianownika:
 * inaczej powiat z jedna gmina bez danych wygladalby na ubozszy, niz jest
 * (regula 4 — brak danych to nie zero). Dlatego powiat zlozony w calosci
 * z takich gmin nie pojawia sie w wyniku i zostaje na mapie szary.
 */
export function zwinDoPowiatow(
  wartosci: WartoscNaMapie[],
  ludnosc: LudnoscGminy[],
): WartoscNaMapie[] {
  const osobGminy = new Map(ludnosc.map((l) => [l.teryt, l.osob]));
  const sumy = new Map<string, { kwota: number; osob: number }>();
  for (const w of wartosci) {
    const osob = osobGminy.get(w.teryt);
    if (!osob) continue;
    const kod = w.teryt.slice(0, 4);
    const s = sumy.get(kod);
    if (s) {
      s.kwota += w.wartosc * osob;
      s.osob += osob;
    } else {
      sumy.set(kod, { kwota: w.wartosc * osob, osob });
    }
  }
  return [...sumy.entries()].map(([teryt, s]) => ({ teryt, wartosc: s.kwota / s.osob }));
}

/**
 * Nazwa powiatu do wyswietlenia z pisowni PKW.
 *
 * Powiat ziemski ma nazwe przymiotnikowa i piszemy ja z rzeczownikiem:
 * „bolesławiecki" -> „powiat bolesławiecki". Miasto na prawach powiatu ma
 * nazwe wlasna i „powiat Wrocław" byloby bledem — zostaje „Wrocław".
 * Rozroznia je wielka litera, bo w rejestrze PKW tylko nazwy wlasne ja maja.
 */
export function nazwaPowiatu(zRejestru: string): string {
  const pierwsza = zRejestru.slice(0, 1);
  return pierwsza === pierwsza.toLocaleUpperCase('pl') ? zRejestru : `powiat ${zRejestru}`;
}
