import { ImageResponse } from 'next/og';
import { bazaDostepna, glosowanie } from '@/lib/dane';
import { dataSlownie, liczba, skroc } from '@/lib/format';
import { fontDoOg, OG, ROZMIAR_OG, TYP_OG } from '@/lib/og';
import { opisJednaLinia } from '@/lib/opis-glosowania';

export const size = ROZMIAR_OG;
export const contentType = TYP_OG;
export const alt = 'Głosowanie w Sejmie RP';

export default async function Obrazek({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = /^(\d+)-(\d+)$/.exec(id);
  const g = m && bazaDostepna() ? glosowanie(Number(m[1]), Number(m[2])) : null;
  const font = await fontDoOg();
  const fonts = [{ name: 'Inter' as const, data: font, weight: 600 as const, style: 'normal' as const }];

  if (!g) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: OG.tlo, alignItems: 'center', justifyContent: 'center', fontSize: 64, color: OG.atrament }}>
          jawne
        </div>
      ),
      { ...size, fonts },
    );
  }

  const bezGlosu = Math.max(0, g.glosowalo - g.za - g.przeciw - g.wstrzymalo);
  const czesci = [
    { ile: g.za, barwa: OG.za, opis: 'za' },
    { ile: g.przeciw, barwa: OG.przeciw, opis: 'przeciw' },
    { ile: g.wstrzymalo, barwa: OG.wstrzymal, opis: 'wstrzymało się' },
    // Kworum i wybory na liscie — patrz komentarz w PaseczekGlosow.
    { ile: bezGlosu, barwa: OG.atrament3, opis: g.rodzaj === 'ON_LIST' ? 'na liście' : 'obecnych bez głosu' },
    { ile: g.nieobecnych, barwa: OG.brak, opis: 'nie głosowało' },
  ].filter((c) => c.ile > 0);
  // Nieobecni sa CZESCIA paska takze tutaj — inaczej podglad linku pokazalby
  // jednolity slupek przy glosowaniu, w ktorym uczestniczylo czterdziestu poslow.
  const suma = czesci.reduce((a, c) => a + c.ile, 0) || 1;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
          background: OG.tlo, color: OG.atrament, padding: 64, justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 24, color: OG.akcent, letterSpacing: 4 }}>
            JAWNE · GŁOSOWANIE
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: OG.atrament3, marginTop: 18 }}>
            {dataSlownie(g.data)} · posiedzenie {g.posiedzenie}, nr {g.numer}
          </div>
          <div style={{ display: 'flex', fontSize: 48, lineHeight: 1.18, marginTop: 14, maxWidth: 1040 }}>
            {skroc(opisJednaLinia(g), 150)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', width: '100%', height: 28, borderRadius: 14, overflow: 'hidden' }}>
            {czesci.map((c) => (
              <div key={c.opis} style={{ display: 'flex', width: `${(c.ile / suma) * 100}%`, background: c.barwa }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 24, fontSize: 30, color: OG.atrament2 }}>
            {czesci.map((c) => (
              <div key={c.opis} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: c.barwa, display: 'flex' }} />
                <span style={{ color: OG.atrament }}>{liczba(c.ile)}</span>
                {c.opis}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
