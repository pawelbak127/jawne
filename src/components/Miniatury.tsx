import type { CSSProperties } from 'react';
import { przydzielBloki, ulozPolkole } from '@/lib/polkole';
import { MINI_MAPA } from '@/lib/mini-mapa';

/**
 * Miniatury na strone glowna — komponenty SERWEROWE, bez JavaScriptu
 * i bez nazwisk (pulapka 54: ten sam koszt razy liczba stron; tu jedna strona,
 * ale glowna laduje sie najczesciej).
 */

export type BlokMiniatury = { id: string; ile: number; barwa: string; barwaCiemna: string };

/**
 * Mini-polkole izby: jedna sciezka na blok i rzad (odcinki zerowej dlugosci
 * z zaokraglonym zakonczeniem) zamiast 460 elementow <circle>. Geometria ta
 * sama co w pelnym polkolu (`ulozPolkole`), wiec kropek jest DOKLADNIE tyle,
 * ile mandatow w blokach.
 */
export function MiniPolkole({ bloki, opis }: { bloki: readonly BlokMiniatury[]; opis: string }) {
  const n = bloki.reduce((a, b) => a + b.ile, 0);
  if (!n) return null;
  const uklad = ulozPolkole(n);
  const przydzial = przydzielBloki(n, bloki.map((b) => b.ile));
  const sciezki = new Map<string, { blok: number; r: number; d: string[] }>();
  uklad.miejsca.forEach((m, i) => {
    const klucz = `${przydzial[i]}-${m.rzad}`;
    const s = sciezki.get(klucz) ?? { blok: przydzial[i]!, r: m.r, d: [] };
    // Jedno miejsce po przecinku wystarcza przy tej skali; pelne polkole ma dwa.
    s.d.push(`M${Math.round(m.x * 10) / 10} ${Math.round(m.y * 10) / 10}h0`);
    sciezki.set(klucz, s);
  });
  const pol = uklad.szerokosc / 2;
  return (
    <svg viewBox={`${-pol} ${-(uklad.wysokosc - pol * 0.06)} ${uklad.szerokosc} ${uklad.wysokosc}`} role="img" aria-label={opis} className="block h-auto w-full">
      {[...sciezki.values()].map((s, i) => {
        const b = bloki[s.blok]!;
        return (
          <path
            key={i}
            d={s.d.join('')}
            className="mini-blok"
            strokeWidth={s.r * 2}
            strokeLinecap="round"
            fill="none"
            style={{ '--b': b.barwa, '--bc': b.barwaCiemna } as CSSProperties}
          />
        );
      })}
    </svg>
  );
}

/**
 * Miniatura mapy 16 wojewodztw (src/lib/mini-mapa.ts, z PRG). `barwa` zwraca
 * wypelnienie dla wojewodztwa (po nazwie) albo undefined — wtedy tlo neutralne.
 */
export function MiniMapa({ opis, barwa }: { opis: string; barwa?: (nazwa: string) => string | undefined }) {
  return (
    <svg viewBox={`0 0 ${MINI_MAPA.szer} ${MINI_MAPA.wys}`} role="img" aria-label={opis} className="block h-auto w-full">
      {MINI_MAPA.wojewodztwa.map((w) => {
        const fill = barwa?.(w.nazwa);
        return (
          <path key={w.kod} d={w.d} className={fill ? 'mini-woj' : 'mini-woj pusty'} style={fill ? { fill } : undefined}>
            <title>{w.nazwa}</title>
          </path>
        );
      })}
    </svg>
  );
}
