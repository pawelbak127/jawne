/**
 * Upraszczanie konturow — Douglas-Peucker.
 *
 * Granice gmin z PRG maja razem kilkanascie milionow punktow; na mapie
 * calej Polski jedna gmina zajmuje kilkanascie pikseli, wiec 99% tych
 * punktow to bajty wyslane czytelnikowi na darmo. Upraszczamy ZANIM
 * cokolwiek trafi do repozytorium, a nie w przegladarce.
 *
 * Douglas-Peucker, a nie "co n-ty punkt": ten drugi sposob scina rogi
 * i sasiednie gminy przestaja do siebie pasowac — miedzy nimi robia sie
 * biale szpary. DP zachowuje punkty, ktore najbardziej odstaja od cieciwy,
 * wiec wspolna granica dwoch gmin upraszcza sie tak samo z obu stron.
 */
export type Punkt = readonly [number, number];

/** Kwadrat odleglosci punktu od odcinka (bez pierwiastka — porownujemy). */
function odlegloscDoOdcinka(p: Punkt, a: Punkt, b: Punkt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const u = Math.max(0, Math.min(1, t));
  return (p[0] - (a[0] + u * dx)) ** 2 + (p[1] - (a[1] + u * dy)) ** 2;
}

/**
 * Upraszcza linie lamana. `tolerancja` w tych samych jednostkach co punkty
 * (u nas stopnie geograficzne). Zwraca zawsze co najmniej pierwszy
 * i ostatni punkt.
 */
export function uprosc(punkty: readonly Punkt[], tolerancja: number): Punkt[] {
  if (punkty.length <= 2) return [...punkty];
  const prog = tolerancja * tolerancja;
  const zostaje = new Uint8Array(punkty.length);
  zostaje[0] = 1;
  zostaje[punkty.length - 1] = 1;

  // Bez rekurencji: kontur gminy potrafi miec dziesiatki tysiecy punktow,
  // a rekurencja na takiej dlugosci przepelnia stos.
  const stos: [number, number][] = [[0, punkty.length - 1]];
  while (stos.length) {
    const [od, doIdx] = stos.pop()!;
    let najdalszy = -1;
    let najwieksza = prog;
    for (let i = od + 1; i < doIdx; i++) {
      const d = odlegloscDoOdcinka(punkty[i]!, punkty[od]!, punkty[doIdx]!);
      if (d > najwieksza) {
        najwieksza = d;
        najdalszy = i;
      }
    }
    if (najdalszy > 0) {
      zostaje[najdalszy] = 1;
      stos.push([od, najdalszy], [najdalszy, doIdx]);
    }
  }
  return punkty.filter((_, i) => zostaje[i] === 1);
}

/**
 * Pierscien zamkniety: pierwszy punkt musi byc rowny ostatniemu, inaczej
 * przegladarka domknie go sama, ale plik bedzie niejednoznaczny.
 */
export function domknij(pierscien: readonly Punkt[]): Punkt[] {
  const p = [...pierscien];
  const a = p[0];
  const b = p[p.length - 1];
  if (a && b && (a[0] !== b[0] || a[1] !== b[1])) p.push(a);
  return p;
}

/** Pole pierscienia ze wzoru Gaussa — do odsiewania drobnych wysp. */
export function pole(pierscien: readonly Punkt[]): number {
  let s = 0;
  for (let i = 0, j = pierscien.length - 1; i < pierscien.length; j = i++) {
    s += (pierscien[j]![0] + pierscien[i]![0]) * (pierscien[j]![1] - pierscien[i]![1]);
  }
  return Math.abs(s / 2);
}
