import { ImageResponse } from 'next/og';
import { bazaDostepna, kluby, posel, statystykiPosla } from '@/lib/dane';
import { inicjaly, liczba, procent } from '@/lib/format';
import { fontDoOg, OG, ROZMIAR_OG, TYP_OG } from '@/lib/og';

/**
 * Zdjecie pobieramy SAMI i wkladamy jako data URI, zamiast dawac Satori adres
 * do rejestru.
 *
 * Powod jest zmierzony: przy adresie zdalnym generowanie obrazka wisi tak
 * dlugo, jak dlugo milczy API Sejmu — a ono milczy. Podglad linku padalby
 * dokladnie w chwili, w ktorej rejestr ma awarie. Przy wlasnym pobieraniu
 * mamy limit czasu i sensowny zapas: inicjaly.
 */
async function zdjecieJakoDataUri(id: number): Promise<string | null> {
  try {
    const odp = await fetch(`https://api.sejm.gov.pl/sejm/term10/MP/${id}/photo`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!odp.ok) return null;
    const bajty = Buffer.from(await odp.arrayBuffer());
    // Typ czytamy z SYGNATURY BAJTOW, nie z naglowka — przy zasobach graficznych
    // rejestru `content-type` potrafi podawac co innego niz zawartosc.
    const jpeg = bajty[0] === 0xff && bajty[1] === 0xd8;
    const png = bajty.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    if (!jpeg && !png) return null;
    return `data:image/${jpeg ? 'jpeg' : 'png'};base64,${bajty.toString('base64')}`;
  } catch {
    return null;
  }
}

export const size = ROZMIAR_OG;
export const contentType = TYP_OG;
export const alt = 'Poseł Sejmu RP';

/**
 * Obrazek do podglądu linku. To on decyduje, czy ktos w ogole kliknie —
 * wiec niesie jedna konkretna liczbe, a nie sam naglowek serwisu.
 */
export default async function Obrazek({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;

  if (!p) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: OG.tlo, alignItems: 'center', justifyContent: 'center', fontSize: 64, color: OG.atrament }}>
          jawne
        </div>
      ),
      { ...size, fonts: [{ name: 'Inter', data: await fontDoOg(), weight: 600, style: 'normal' }] },
    );
  }

  const staty = statystykiPosla(p.id);
  const k = kluby().find((x) => x.id === p.klub_id);
  const zdjecie = p.ma_zdjecie === 0 ? null : await zdjecieJakoDataUri(p.id);
  const nieobecnosci = staty.rozklad.find((r) => r.glos === 'ABSENT')?.ile ?? 0;
  const udzial = staty.mianownik > 0 ? ((staty.mianownik - nieobecnosci) / staty.mianownik) * 100 : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
          background: OG.tlo, color: OG.atrament, padding: 64, justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, color: OG.akcent, letterSpacing: 4 }}>
          JAWNE · SEJM X KADENCJI
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          {zdjecie ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={zdjecie}
              width={200}
              height={250}
              alt=""
              style={{ borderRadius: 20, objectFit: 'cover', border: `1px solid ${OG.kreska}` }}
            />
          ) : (
            <div
              style={{
                display: 'flex', width: 200, height: 250, borderRadius: 20,
                border: `1px solid ${OG.kreska}`, background: '#f1efe9',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 72, color: OG.atrament3,
              }}
            >
              {inicjaly(p.imie_nazwisko)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 800 }}>
            <div style={{ fontSize: p.imie_nazwisko.length > 22 ? 62 : 76, lineHeight: 1.05 }}>
              {p.imie_nazwisko}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, fontSize: 30, color: OG.atrament2 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: k?.barwa ?? OG.atrament3, display: 'flex' }} />
              {`${p.klub_id ?? 'bez klubu'}${p.okreg_nazwa ? ` · ${p.okreg_nazwa}` : ''}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: `1px solid ${OG.kreska}`, paddingTop: 28 }}>
          {staty.mianownik > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 56, color: OG.akcent }}>{procent(udzial)}</div>
              {/* Mianownik jedzie razem z liczba takze tutaj — procent bez niego
                  jest w podgladzie linku jeszcze latwiejszy do przekrecenia.
                  Tekst JEDNYM literalem: Satori wymaga jawnego `display` przy
                  kazdym elemencie z wiecej niz jednym dzieckiem, a "a {x} b"
                  to w JSX trojka dzieci, nie jeden napis. */}
              <div style={{ fontSize: 26, color: OG.atrament2, marginTop: 6 }}>
                {`udział w ${liczba(staty.mianownik)} głosowaniach`}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 26, color: OG.atrament2, display: 'flex' }}>dane z rejestru Sejmu RP</div>
          )}
          <div style={{ fontSize: 24, color: OG.atrament3, display: 'flex' }}>api.sejm.gov.pl</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Inter', data: await fontDoOg(), weight: 600, style: 'normal' }] },
  );
}
