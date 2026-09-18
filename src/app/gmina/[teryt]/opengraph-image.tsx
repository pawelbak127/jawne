import { ImageResponse } from 'next/og';
import { bazaDostepna, budzetGminy, funduszeGminy, gminaPelna, ludnoscWarszawy, TERYT_WARSZAWY } from '@/lib/dane';
import { zlote } from '@/lib/format';
import { fontDoOg, OG, ROZMIAR_OG, TYP_OG } from '@/lib/og';

export const size = ROZMIAR_OG;
export const contentType = TYP_OG;
export const alt = 'Gmina — posłowie i publiczne pieniądze';

/**
 * Podglad linku do strony gminy. Strona gminy jest najczesciej wysylana
 * dalej ("zobacz, ile dostala nasza gmina"), wiec obrazek niesie dwie
 * konkretne liczby — kazda z mianownikiem, bo bez niego w podgladzie linku
 * najlatwiej ja przekrecic.
 */
export default async function Obrazek({ params }: { params: Promise<{ teryt: string }> }) {
  const { teryt } = await params;
  const g = /^\d{6}$/.test(teryt) && bazaDostepna() ? gminaPelna(teryt) : null;
  const czcionka = { name: 'Inter', data: await fontDoOg(), weight: 600 as const, style: 'normal' as const };

  if (!g) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: OG.tlo, alignItems: 'center', justifyContent: 'center', fontSize: 64, color: OG.atrament }}>
          jawne
        </div>
      ),
      { ...size, fonts: [czcionka] },
    );
  }

  const dzielnica = g.rodzaj === 'dzielnica Warszawy';
  const zrodlo = dzielnica ? TERYT_WARSZAWY : teryt;
  const ludnosc = dzielnica ? ludnoscWarszawy() : g.ludnosc;
  const budzet = budzetGminy(zrodlo);
  const ue = funduszeGminy(zrodlo).find((f) => f.okres === '2021-2027');
  const dochodyNaOsobe = budzet?.dochody && ludnosc ? budzet.dochody / ludnosc : null;
  const ueNaOsobe = ue?.tylko_tu_ue && ludnosc ? ue.tylko_tu_ue / ludnosc : null;
  const nazwa = dzielnica ? `Warszawa, dzielnica ${g.nazwa}` : g.rodzaj === 'gmina' ? `Gmina ${g.nazwa}` : g.nazwa;
  const miejsce = dzielnica ? 'woj. mazowieckie' : `pow. ${g.powiat}, woj. ${g.wojewodztwo}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
          background: OG.tlo, color: OG.atrament, padding: 64, justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', fontSize: 24, color: OG.akcent, letterSpacing: 4 }}>
          JAWNE · PUBLICZNE PIENIĄDZE W GMINIE
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: nazwa.length > 26 ? 64 : 84, lineHeight: 1.05 }}>{nazwa}</div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: OG.atrament2 }}>{miejsce}</div>
        </div>

        <div style={{ display: 'flex', gap: 64, borderTop: `1px solid ${OG.kreska}`, paddingTop: 28 }}>
          {/* Tekst JEDNYM literalem — Satori wymaga jawnego display przy
              kazdym elemencie z wiecej niz jednym dzieckiem. */}
          {dochodyNaOsobe !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 56, color: OG.akcent }}>{zlote(dochodyNaOsobe)}</div>
              <div style={{ display: 'flex', fontSize: 24, color: OG.atrament2, marginTop: 6 }}>
                {`dochodów gminy na mieszkańca w ${budzet!.rok} r.`}
              </div>
            </div>
          ) : null}
          {ueNaOsobe !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 56, color: OG.akcent }}>{zlote(ueNaOsobe)}</div>
              <div style={{ display: 'flex', fontSize: 24, color: OG.atrament2, marginTop: 6 }}>
                z UE na mieszkańca, projekty tylko w tej gminie
              </div>
            </div>
          ) : null}
          {dochodyNaOsobe === null && ueNaOsobe === null ? (
            <div style={{ display: 'flex', fontSize: 26, color: OG.atrament2 }}>dane z rejestrów publicznych</div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: [czcionka] },
  );
}
