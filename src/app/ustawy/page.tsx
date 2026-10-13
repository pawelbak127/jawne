import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, liczbaProcesow, stronaProcesow, zrodloImportu, type ProcesSkrot } from '@/lib/dane';
import { dataKrotko, liczba, zOdmiana } from '@/lib/format';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Okruszek, Podstawa, Stronicowanie, Wypis, Zakladki } from '@/components/Szablon';

export const metadata: Metadata = {
  title: 'Ustawy',
  description: 'Co się stało z projektem ustawy: droga przez Sejm, etap po etapie, z odnośnikiem do imiennego głosowania.',
};

const NA_STRONIE = 40;
const REJESTR = 'https://www.sejm.gov.pl/sejm10.nsf/proces.xsp';

const STANY: { klucz: string; etykieta: string }[] = [
  { klucz: '', etykieta: 'wszystkie' },
  { klucz: 'uchwalone', etykieta: 'uchwalone' },
  { klucz: 'w-toku', etykieta: 'w toku' },
  { klucz: 'zakonczone-inaczej', etykieta: 'odrzucone i wycofane' },
];

/** Stan słowami rejestru — ta sama reguła co na stronie druku. */
function stan(p: ProcesSkrot): string {
  return p.koniec ?? (p.ostatni_etap ? `W toku · ${p.ostatni_etap}` : 'W toku');
}

export default async function StronaUstaw({
  searchParams,
}: {
  searchParams: Promise<{ strona?: string; stan?: string }>;
}) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { strona, stan: wybranyStan = '' } = await searchParams;
  const filtr = STANY.some((s) => s.klucz === wybranyStan) ? wybranyStan : '';

  const wszystkich = liczbaProcesow('projekt ustawy', filtr);
  const stron = Math.max(1, Math.ceil(wszystkich / NA_STRONIE));
  const biezaca = Math.min(Math.max(1, Number.parseInt(strona ?? '1', 10) || 1), stron);
  const lista = stronaProcesow((biezaca - 1) * NA_STRONIE, NA_STRONIE, 'projekt ustawy', filtr);
  const importProcesow = zrodloImportu('procesy');

  // Filtr zwyklymi odnosnikami — adres z filtrem da sie komus wyslac.
  const adres = (nr: number, s = filtr) => {
    const q = new URLSearchParams({ ...(s ? { stan: s } : {}), ...(nr > 1 ? { strona: String(nr) } : {}) }).toString();
    return q ? `/ustawy?${q}` : '/ustawy';
  };

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { nazwa: 'Ustawy' }]} />
      <Wypis
        tytul="Ustawy"
        podtytul="Co się stało z projektem: od wpłynięcia do Sejmu, przez czytania i komisje, po głosowanie i podpis Prezydenta. Etapy nazywamy tak, jak nazywa je rejestr."
      />
      <Zakladki
        etykieta="Stan procesu"
        pozycje={STANY.map((s) => ({
          adres: adres(1, s.klucz),
          nazwa: s.etykieta,
          ile: liczbaProcesow('projekt ustawy', s.klucz),
          biezaca: s.klucz === filtr,
        }))}
      />
      <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--sredni)' }}>
        {`${zOdmiana(wszystkich, 'projekt ustawy', 'projekty ustaw', 'projektów ustaw')}${filtr ? ' w wybranym stanie' : ' w tej kadencji'}. Pokazujemy ${liczba(lista.length)}, od najnowszego.`}
      </p>

      <ul className="pozycje">
        {lista.map((p) => (
          <li key={p.numer}>
            <div className="min-w-0">
              <p className="meta">
                <span className="znak">{`druk ${p.numer}`}</span>
                {' · '}
                <b className={p.koniec === 'Uchwalono' ? 'text-atrament' : undefined}>{stan(p)}</b>
                {p.ostatnia_data ? ` · ${dataKrotko(p.ostatnia_data)}` : ''}
                {p.adres_publikacji ? ` · ${p.adres_publikacji}` : ''}
              </p>
              <Link href={`/ustawa/${p.numer}`} className="tytul-poz">{bezNazwiskOsobPrywatnych(p.tytul)}</Link>
              {/*
                Pierwsze zdanie opisu Z REJESTRU. Tytul druku ma srednio 118
                znakow prawniczej polszczyzny, po ktorym nie wiadomo, o co chodzi;
                opis zaczyna sie od „projekt dotyczy" i mowi to wprost.
                `line-clamp-2`, a nie ciecie w kodzie: wielokropek przegladarki
                mowi, ze jest dalsza czesc.
              */}
              {p.opis ? (
                <p className="meta mt-1 line-clamp-2">{bezNazwiskOsobPrywatnych(p.opis)}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Stronicowanie biezaca={biezaca} stron={stron} adres={(nr) => adres(nr)} nowsze="← nowsze" starsze="starsze →" />
      <p className="stan-danych">
        <span>{importProcesow ? `stan danych: rejestr procesów ${dataKrotko(importProcesow.kiedy)}` : 'stan danych: —'}</span>
        <span><Podstawa adres={REJESTR} nazwa="rejestr procesów legislacyjnych" /></span>
      </p>
    </div>
  );
}
