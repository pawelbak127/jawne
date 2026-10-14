import type { CSSProperties } from 'react';
import type { WynikKlubu } from '@/lib/dane';
import { BARWY_GLOSU } from '@/lib/barwy-glosu';

type Klub = { id: string; nazwa: string | null; barwa: string; barwaCiemna: string };

/**
 * Jak glosowaly kluby w jednym glosowaniu: liczby z tabeli `glosy_klubow`
 * (kluby z DNIA GLOSOWANIA — pulapka 3) i pasek z odcinkiem nieobecnych,
 * bo bez niego pasek klamie (pulapka 13). Wspolna dla strony glosowania
 * i strony ustawy.
 */
export function TabelaKlubow({ wyniki, kluby }: { wyniki: WynikKlubu[]; kluby: Klub[] }) {
  return (
    <table className="tabela liczby">
      <thead>
        <tr>
          <th>Klub</th>
          <th className="l">za</th>
          <th className="l">przeciw</th>
          <th className="l">wstrz.</th>
          <th className="l">nie głos.</th>
          <th>rozkład</th>
        </tr>
      </thead>
      <tbody>
        {wyniki.map((w) => {
          const k = kluby.find((x) => x.id === w.klub_id);
          const wszyscy = w.za + w.przeciw + w.wstrzymalo + w.nieobecnych + w.innych;
          const czesci = [
            { ile: w.za, b: BARWY_GLOSU.za },
            { ile: w.przeciw, b: BARWY_GLOSU.przeciw },
            { ile: w.wstrzymalo, b: BARWY_GLOSU.wstrzymal },
            { ile: w.nieobecnych, b: BARWY_GLOSU.brak },
            { ile: w.innych, b: BARWY_GLOSU.inne },
          ];
          return (
            <tr key={w.klub_id}>
              <td>
                <span title={k?.nazwa ?? undefined}>
                  <span
                    className="miejsce-probka kropka"
                    style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as CSSProperties}
                  />
                  <b>{w.klub_id}</b>
                </span>
              </td>
              <td className="l" data-etykieta="za">{w.za}</td>
              <td className="l" data-etykieta="przeciw">{w.przeciw}</td>
              <td className="l" data-etykieta="wstrz.">{w.wstrzymalo}</td>
              <td className="l text-atrament-2" data-etykieta="nie głos.">{w.nieobecnych}</td>
              <td style={{ minWidth: '8rem' }}>
                <div
                  className="mt-2 flex h-2 overflow-hidden bg-papier-3"
                  role="img"
                  aria-label={`za ${w.za}, przeciw ${w.przeciw}, wstrzymało się ${w.wstrzymalo}, nie głosowało ${w.nieobecnych}`}
                >
                  {czesci.filter((c) => c.ile > 0).map((c, i) => (
                    <span
                      key={i}
                      className="miejsce-probka"
                      style={{ width: `${wszyscy ? (c.ile / wszyscy) * 100 : 0}%`, '--b': c.b.jasny, '--bc': c.b.ciemny } as CSSProperties}
                    />
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
