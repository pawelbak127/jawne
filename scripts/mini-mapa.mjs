/**
 * Miniatura mapy Polski — 16 województw — do strony głównej, z tych samych
 * konturów PRG co /mapa (public/mapa/gminy.json, pole `wojewodztwa`).
 *
 * Strona główna nie może wczytywać 1 MB konturów gmin (pułapka 46 i 54),
 * więc obrys liczymy RAZ: ten sam rzut co MapaGmin (równoodległościowy
 * z poprawką cos φ), Douglas–Peucker na współrzędnych SVG i zapis do
 * src/lib/mini-mapa.ts. Wspólne granice województw są w pliku źródłowym
 * już uproszczone identycznie z obu stron, a DP z tą samą tolerancją
 * zachowuje to w przybliżeniu — przy tej skali szczelin nie widać.
 *
 *   node scripts/mini-mapa.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SZER = 300;
const TOLERANCJA = 0.9; // w jednostkach SVG przy szerokości 300

const plik = JSON.parse(readFileSync('public/mapa/gminy.json', 'utf8'));
const { xmin, xmax, ymin, ymax } = plik.zakres;
const s = plik.skala;
const zwezenie = Math.cos(((ymin + ymax) / 2) * (Math.PI / 180));
const szer = (xmax - xmin) * zwezenie;
const wys = ymax - ymin;
const WYS = Math.round((SZER * wys) / szer);
const naX = (x) => ((x / s - xmin) * zwezenie * SZER) / szer;
const naY = (y) => ((ymax - y / s) * SZER * (wys / szer)) / wys;

function odleglosc(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function dp(punkty, tol) {
  if (punkty.length < 3) return punkty;
  let max = 0;
  let idx = 0;
  for (let i = 1; i < punkty.length - 1; i++) {
    const d = odleglosc(punkty[i], punkty[0], punkty[punkty.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [punkty[0], punkty[punkty.length - 1]];
  return [...dp(punkty.slice(0, idx + 1), tol).slice(0, -1), ...dp(punkty.slice(idx), tol)];
}

const wojewodztwa = plik.wojewodztwa.map((w) => {
  const pierscienie = w.ksztalt.map((ciag) => {
    let x = 0;
    let y = 0;
    const pts = [];
    for (const para of ciag.split(' ')) {
      const [a, b] = para.split(',').map(Number);
      x += a;
      y += b;
      pts.push([naX(x), naY(y)]);
    }
    return dp(pts, TOLERANCJA);
  }).filter((p) => p.length >= 4);
  // Pelne jednostki: przy 300 px szerokosci punkt to piksel, a dziesiate czesci
  // dokladaly 6 kB na kazda z dwoch map strony glownej (i drugi raz w danych Reacta).
  const d = pierscienie
    .map((p) => p
      .map(([px, py]) => [Math.round(px), Math.round(py)])
      .filter(([x, y], i, t) => i === 0 || x !== t[i - 1][0] || y !== t[i - 1][1])
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z')
    .join('');
  return { kod: w.kod, nazwa: w.nazwa, d };
});

const tresc = `/**
 * Miniatura mapy Polski (16 województw) — WYGENEROWANE przez scripts/mini-mapa.mjs
 * z public/mapa/gminy.json (PRG, GUGiK). Nie edytuj ręcznie.
 */
export const MINI_MAPA = ${JSON.stringify({ szer: SZER, wys: WYS, wojewodztwa }, null, 0)} as const;
`;
writeFileSync('src/lib/mini-mapa.ts', tresc);
console.log(`src/lib/mini-mapa.ts: ${wojewodztwa.length} województw, ${(tresc.length / 1024).toFixed(1)} kB, ${SZER}×${WYS}`);
