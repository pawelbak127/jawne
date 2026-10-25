/**
 * Gmina dla punktu (dlugosc, szerokosc geograficzna) — z konturow PRG, ktore
 * i tak leza w repozytorium (`public/mapa/gminy.json`, scripts/granice-gmin.mjs).
 *
 * Format pliku: `gminy[teryt]` to lista pierscieni; pierscien to napis
 * „x,y dx,dy dx,dy …” — pierwszy punkt bezwzgledny, kolejne jako przyrosty,
 * wszystko w stopniach razy `skala` (100 000).
 *
 * DOKLADNOSC: kontury sa uproszczone Douglasem-Peuckerem z tolerancja 0,004°
 * (ok. 300–450 m). Punkt blizej granicy niz tyle moze trafic do sasiedniej
 * gminy. Dlatego to droga ZAPASOWA — tam, gdzie mamy REGON, rozstrzyga REGON
 * (siedziba z rejestru), a zgodnosc obu drog jest mierzona przy imporcie.
 *
 * Pierscienie jednej gminy liczymy regula parzystosci (dziura w gminie
 * wiejskiej wokol miasta jest wtedy dziura). Gdy punkt wpada do kilku gmin
 * — bo kontur gminy wiejskiej nie ma dziury na miasto — wygrywa ta o mniejszym
 * prostokacie otaczajacym, czyli miasto w srodku.
 */
type Pierscien = { xs: Float64Array; ys: Float64Array };
type Gmina = { teryt: string; pierscienie: Pierscien[]; minX: number; minY: number; maxX: number; maxY: number };

export type PlikKonturow = { skala: number; gminy: Record<string, string[]> };

export class KonturyGmin {
  private readonly gminy: Gmina[];

  constructor(plik: PlikKonturow) {
    this.gminy = Object.entries(plik.gminy).map(([teryt, ciagi]) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const pierscienie = ciagi.map((ciag) => {
        const pary = ciag.split(' ');
        const xs = new Float64Array(pary.length);
        const ys = new Float64Array(pary.length);
        let x = 0;
        let y = 0;
        pary.forEach((para, i) => {
          const [dx, dy] = para.split(',').map(Number);
          x += dx!;
          y += dy!;
          xs[i] = x / plik.skala;
          ys[i] = y / plik.skala;
          if (xs[i]! < minX) minX = xs[i]!;
          if (xs[i]! > maxX) maxX = xs[i]!;
          if (ys[i]! < minY) minY = ys[i]!;
          if (ys[i]! > maxY) maxY = ys[i]!;
        });
        return { xs, ys };
      });
      return { teryt, pierscienie, minX, minY, maxX, maxY };
    });
  }

  /** TERYT gminy albo `null`, gdy punkt lezy poza wszystkimi konturami (np. za granica). */
  gmina(dlugosc: number, szerokosc: number): string | null {
    let najlepsza: Gmina | null = null;
    for (const g of this.gminy) {
      if (dlugosc < g.minX || dlugosc > g.maxX || szerokosc < g.minY || szerokosc > g.maxY) continue;
      let wewnatrz = false;
      for (const p of g.pierscienie) {
        if (wPierscieniu(p, dlugosc, szerokosc)) wewnatrz = !wewnatrz;
      }
      if (!wewnatrz) continue;
      if (!najlepsza || pole(g) < pole(najlepsza)) najlepsza = g;
    }
    return najlepsza?.teryt ?? null;
  }
}

function pole(g: Gmina): number {
  return (g.maxX - g.minX) * (g.maxY - g.minY);
}

/** Promien w prawo od punktu; nieparzysta liczba przeciec = wewnatrz. */
function wPierscieniu(p: Pierscien, x: number, y: number): boolean {
  let wewnatrz = false;
  const n = p.xs.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = p.ys[i]!, yj = p.ys[j]!;
    if ((yi > y) !== (yj > y)) {
      const xPrzeciecia = p.xs[j]! + ((y - yj) * (p.xs[i]! - p.xs[j]!)) / (yi - yj);
      if (x < xPrzeciecia) wewnatrz = !wewnatrz;
    }
  }
  return wewnatrz;
}
