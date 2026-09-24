import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, etapyProcesu, proces, type EtapProcesu, type ProcesSkrot } from '@/lib/dane';
import { dataSlownie, skroc } from '@/lib/format';
import { bezNazwiskOsobPrywatnych, pominietoNazwiska } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';

const REJESTR = (numer: string) => `https://www.sejm.gov.pl/sejm10.nsf/PrzebiegProc.xsp?nr=${numer}`;

/**
 * Stan procesu SLOWAMI REJESTRU, nie naszymi.
 *
 * Rejestr ma na to wlasny, krotki slownik etapow koncowych: "Uchwalono",
 * "Odrzucono", "Wycofano", "nie uchwalona ponownie po wecie Prezydenta"
 * (zmierzone 23.09.2026 na 1692 procesach). Gdy etapu koncowego nie ma,
 * proces trwa — i wtedy mowimy tylko, na czym stanal.
 */
function stan(p: ProcesSkrot): { etykieta: string; ton: 'zamkniety' | 'uchwalony' | 'wtoku' } {
  if (p.koniec === 'Uchwalono') return { etykieta: 'Uchwalono', ton: 'uchwalony' };
  if (p.koniec) return { etykieta: p.koniec, ton: 'zamkniety' };
  return { etykieta: 'W toku', ton: 'wtoku' };
}

export async function generateMetadata({ params }: { params: Promise<{ numer: string }> }): Promise<Metadata> {
  const { numer } = await params;
  const p = bazaDostepna() ? proces(numer) : null;
  if (!p) return { title: 'Nie ma takiego druku' };
  const tytul = bezNazwiskOsobPrywatnych(p.tytul);
  return {
    title: `${skroc(tytul, 70)} — druk ${p.numer}`,
    description: `${stan(p).etykieta}. ${skroc(tytul, 150)}`,
    // Ta sama regula co przy glosowaniach: tytul z nazwiskiem osoby prywatnej
    // nie trafia do wyszukiwarek.
    ...(pominietoNazwiska(p.tytul) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function StronaUstawy({ params }: { params: Promise<{ numer: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { numer } = await params;
  const p = proces(numer);
  if (!p) notFound();
  const etapy = etapyProcesu(numer);
  const s = stan(p);
  const tytul = bezNazwiskOsobPrywatnych(p.tytul);

  return (
    <div className="obszar max-w-3xl py-10">
      <p className="text-sm text-atrament-2">
        <Link href="/ustawy" className="hover:text-akcent">Ustawy</Link>
        {` · druk nr ${p.numer}`}
      </p>

      <header className="mt-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">{tytul}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              s.ton === 'uchwalony' ? 'bg-akcent-slaby text-akcent'
                : s.ton === 'zamkniety' ? 'bg-papier-3 text-atrament-2' : 'border border-kreska-2 text-atrament-2'
            }`}
          >
            {s.etykieta}
          </span>
          {p.rodzaj ? <span className="text-atrament-2">{p.rodzaj}</span> : null}
          {p.data_wplyniecia ? (
            <span className="text-atrament-3">{`wpłynął ${dataSlownie(p.data_wplyniecia)}`}</span>
          ) : null}
        </div>
      </header>

      {p.adres_publikacji ? (
        <p className="mt-5 rounded-2xl border border-kreska bg-papier-2 p-5 text-sm shadow-karta">
          <span className="font-medium">{`Opublikowano: ${p.adres_publikacji}`}</span>
          {p.eli ? (
            <a
              className="mt-1 block text-akcent underline underline-offset-4 hover:no-underline"
              href={`https://eli.gov.pl/eli/${p.eli}`}
              target="_blank"
              rel="noreferrer"
            >
              Tekst aktu w Dzienniku Ustaw →
            </a>
          ) : null}
        </p>
      ) : null}

      <h2 className="szryft mt-10 text-2xl font-semibold">Droga przez Sejm</h2>
      <p className="mt-1 text-sm text-atrament-2">
        Nazwy etapów pochodzą z rejestru Sejmu. Nie dopisujemy do nich własnych wyjaśnień.
      </p>

      {etapy.length === 0 ? (
        <p className="mt-4 text-atrament-2">Rejestr nie podaje etapów tego procesu.</p>
      ) : (
        <ol className="mt-5 space-y-0">
          {etapy.map((e) => <Etap key={e.kolejnosc} e={e} />)}
        </ol>
      )}

      {/*
        ZGLOSZENIE PAWLA 24.09.2026: „druk 3101 — nie mozna otworzyc pliku".
        Zmierzone tego samego dnia: ten sam adres oddal 404, a zaraz potem
        piec razy 200. To pulapka 1 (API Sejmu za F5 oddaje 404 na poprawna
        sciezke). Link jest dobry — zawodzi usluga, i tak to mowimy.
      */}
      <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-atrament-3">
        <span>{`Źródło: rejestr procesów legislacyjnych Kancelarii Sejmu, druk nr ${p.numer}`}</span>
        <Zrodlo adres={REJESTR(p.numer)} etykieta="przebieg procesu w Sejmie" />
      </p>
      <p className="mt-2 text-xs leading-relaxed text-atrament-3">
        Druki otwierają się prosto z API Sejmu. Zdarza mu się oddać błąd na poprawny
        adres — jeśli plik się nie otworzy, spróbuj ponownie za chwilę. Nie kopiujemy
        druków do siebie: to dokumenty Kancelarii Sejmu i mają pochodzić od niej.
      </p>
    </div>
  );
}

/**
 * Jeden etap. Podetapy (skierowania, sprawozdania komisji) sa wciete —
 * w rejestrze sa dziecmi czytania i tak tez czyta sie sciezke.
 */
function Etap({ e }: { e: EtapProcesu }) {
  const doGlosowania = e.glos_posiedzenie !== null && e.glos_numer !== null && e.glosowanie_mamy > 0;
  return (
    <li className={`relative border-l border-kreska py-3 pl-5 ${e.poziom > 0 ? 'ml-4' : ''}`}>
      <span
        className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full ${e.poziom > 0 ? 'bg-kreska-2' : 'bg-akcent'}`}
        aria-hidden
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={e.poziom > 0 ? 'text-sm text-atrament-2' : 'font-medium'}>
          {bezNazwiskOsobPrywatnych(e.nazwa)}
        </span>
        {e.data ? <span className="liczby text-xs text-atrament-3">{dataSlownie(e.data)}</span> : null}
        {e.posiedzenie ? <span className="text-xs text-atrament-3">{`posiedzenie ${e.posiedzenie}`}</span> : null}
        {/*
          Kod "Sejm" nie jest komisja — rejestr uzywa go dla skierowania
          na posiedzenie izby. "komisja Sejm" byloby nieprawda.
        */}
        {e.komisja && e.komisja !== 'Sejm'
          ? <span className="text-xs text-atrament-3">{`komisja ${e.komisja}`}</span>
          : null}
      </div>

      {e.decyzja || e.komentarz ? (
        <p className="mt-1 text-sm text-atrament-2">{[e.decyzja, e.komentarz].filter(Boolean).join(' · ')}</p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {e.druk ? (
          <a
            className="text-akcent underline underline-offset-4 hover:no-underline"
            href={`https://api.sejm.gov.pl/sejm/term10/prints/${e.druk}/${e.druk}.pdf`}
            target="_blank"
            rel="noreferrer"
          >
            {`Druk nr ${e.druk} (PDF)`}
          </a>
        ) : null}
        {doGlosowania ? (
          <Link
            className="text-akcent underline underline-offset-4 hover:no-underline"
            href={`/glosowanie/${e.glos_posiedzenie}-${e.glos_numer}`}
          >
            Kto jak głosował →
          </Link>
        ) : e.glos_posiedzenie !== null ? (
          // Rejestr wskazuje glosowanie, ktorego jeszcze nie pobralismy.
          // Mowimy to wprost, zamiast dawac odnosnik prowadzacy donikad.
          <span className="text-xs text-atrament-3">
            {`głosowanie ${e.glos_posiedzenie}-${e.glos_numer} — nie mamy go jeszcze w bazie`}
          </span>
        ) : null}
      </div>
    </li>
  );
}
