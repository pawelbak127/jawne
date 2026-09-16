/**
 * Dystans barw w CIE76 (Lab). Sluzy wylacznie kontroli: czy sasiadujace
 * bloki izby daja sie od siebie odroznic. Wartosc ~10 to prog, przy ktorym
 * roznica jest widoczna na malym elemencie takim jak kropka posla.
 */
export function hexDoLab(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Nie jest to kolor #rrggbb: ${hex}`);
  const n = parseInt(m[1]!, 16);
  const kanaly = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const [r, g, b] = kanaly;
  // sRGB -> XYZ (D65), potem XYZ -> Lab
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function dystansBarw(a: string, b: string): number {
  const [l1, a1, b1] = hexDoLab(a);
  const [l2, a2, b2] = hexDoLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
