import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, DNI_DO_USTALENIA, przegladPomocy, zrodloImportu } from '@/lib/dane';
import { KONTAKT } from '@/lib/adres';
import { dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { nazwaDoPokazania } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { SlupkiLat } from '@/components/SlupkiLat';
import { Zestawienie } from '@/components/Zestawienie';
import { WarunkiSudop } from '@/components/WarunkiSudop';

export const metadata: Metadata = {
  title: 'Pomoc publiczna w Polsce — kto rozdaje publiczne pieniądze',
  description: 'Pomoc publiczna i de minimis dla firm w całej Polsce: kto jej udziela, na co, jakim firmom i w których województwach — według rejestru SUDOP prowadzonego przez UOKiK.',
};

// Kategorie wielkosci ze zrodla. "3" to w oryginale "przedsiebiorstwo
// nienalezace do kategorii okreslonych kodem od 0 do 2" — czyli duze.
const WIELKOSC: Record<string, string> = {
  '0': 'mikroprzedsiębiorstwa',
  '1': 'małe',
  '2': 'średnie',
  '3': 'duże',
};

export default function StronaPomocy() {
  if (!bazaDostepna()) return <BrakDanych />;
  const p = przegladPomocy();
  const imp = zrodloImportu('sudop-przyrost');

  if (!p) {
    return (
      <div className="obszar max-w-3xl py-10">
        <h1 className="szryft text-3xl font-semibold">Pomoc publiczna w Polsce</h1>
        <p className="mt-4 text-atrament-2">Nie pobraliśmy jeszcze żadnego dnia dla całego kraju.</p>
      </div>
    );
  }

  const progAktywny = Boolean(KONTAKT);
  const wszystkichWielkosc = p.wielkosc.reduce((a, w) => a + (w.brutto ?? 0), 0);
  const woj = [...p.wojewodztwa]
    .map((w) => ({ ...w, naOsobe: w.brutto !== null && w.osob ? w.brutto / w.osob : null }))
    .sort((a, b) => (b.naOsobe ?? 0) - (a.naOsobe ?? 0));

  return (
    <div className="obszar py-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-akcent">Pomoc publiczna</p>
      <h1 className="szryft mt-3 max-w-3xl text-4xl font-semibold text-balance sm:text-5xl">
        Kto rozdaje publiczne pieniądze firmom
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-atrament-2">
        Dotacje, ulgi, preferencyjne pożyczki i pomoc de minimis udzielone przedsiębiorcom w całej
        Polsce — według rejestru, który prowadzi UOKiK.
      </p>

      {/*
        Zakres jest waski i to musi byc widac od razu: pobieramy rejestr dzien
        po dniu, wiec suma dotyczy tylko tych dni, a nie roku.
      */}
      <p className="mt-6 max-w-3xl rounded-2xl border border-kreska bg-papier-3 p-4 text-sm leading-relaxed text-atrament-2">
        <span className="font-medium text-atrament">{`Dane z ${zOdmiana(p.dni, 'dnia', 'dni', 'dni')}: od ${dataSlownie(p.od)} do ${dataSlownie(p.do)}.`}</span>
        {' '}Rejestr obejmuje dziesięć lat, a my pobieramy go stopniowo — wszystkie liczby poniżej dotyczą
        wyłącznie tych dni, nie całego roku.
        {p.swiezych ? (
          <>
            {' '}
            {`Pomijamy ${zOdmiana(p.swiezych, 'świeży dzień', 'świeże dni', 'świeżych dni')}: urzędy mają 7 dni na zgłoszenie pomocy, więc dzień wliczamy dopiero ${DNI_DO_USTALENIA} dni po jego dacie.`}
          </>
        ) : null}
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kafel wartosc={zlote(p.brutto)} etykieta="wartość pomocy brutto" />
        <Kafel wartosc={liczba(p.przypadkow)} etykieta="przypadków pomocy" />
        <Kafel wartosc={liczba(p.beneficjentow)} etykieta="beneficjentów" />
        <Kafel wartosc={liczba(p.gmin)} etykieta="gmin, w których mają siedzibę" />
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Zestawienie tytul="Kto udzielił najwięcej" wiersze={p.udzielajacy} ukrywajOsoby />
        <Zestawienie tytul="Na co" wiersze={p.przeznaczenia} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
          <SlupkiLat
            tytul={`Na mieszkańca w tych ${liczba(p.dni)} dniach, według województwa siedziby firmy`}
            szerokaEtykieta
            wiersze={woj.map((w) => ({ rok: w.wojewodztwo, wartosc: w.naOsobe }))}
          />
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            Liczy się siedziba beneficjenta, nie miejsce inwestycji. Duża firma z siedzibą
            w Warszawie podnosi wynik województwa mazowieckiego, nawet gdy zakład ma gdzie indziej.
          </p>
        </div>
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
            <p className="text-sm font-medium">Jakie firmy dostają pomoc</p>
            {/*
              ZMIERZONE 22.09.2026 na telefonie: trzy kolumny o stałej szerokości
              (96 + 48 px plus odstępy) nie mieszczą się w karcie na 390 px —
              nazwa wielkości dostawała kilkanaście pikseli i łamała się po jednej
              literze, czyli wyglądała jak pionowy napis. Na wąskim ekranie nazwa
              bierze całą linię, a liczby schodzą do drugiej.
            */}
            <ul className="mt-3 divide-y divide-kreska">
              {p.wielkosc.filter((w) => w.kod && WIELKOSC[w.kod]).map((w) => (
                <li key={w.kod} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="min-w-0 basis-full sm:flex-1 sm:basis-auto">{WIELKOSC[w.kod!]}</span>
                  <span className="liczby shrink-0 text-xs text-atrament-3">{`${zOdmiana(w.przypadkow, 'przypadek', 'przypadki', 'przypadków')}`}</span>
                  <span className="liczby ml-auto shrink-0 text-right font-medium sm:ml-0 sm:w-24">{zlote(w.brutto)}</span>
                  <span className="liczby w-12 shrink-0 text-right text-xs text-atrament-2">
                    {wszystkichWielkosc ? `${Math.round((100 * (w.brutto ?? 0)) / wszystkichWielkosc)}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Zestawienie tytul="W jakiej formie" wiersze={p.formy} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="szryft text-2xl font-semibold">Największe pojedyncze przypadki</h2>
        <ul className="mt-4 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
          {p.najwieksze.map((n, i) => {
            const nazwa = nazwaDoPokazania(n.nazwa, { pomocEur: n.max_eur, progAktywny });
            return (
              <li key={`${n.nip}-${n.dzien}-${i}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className={`leading-snug font-medium ${nazwa.pominieta ? 'text-atrament-3 italic' : ''}`}>
                    {!nazwa.pominieta && n.nip ? (
                      <Link href={`/firma/${n.nip}`} className="hover:text-akcent hover:underline">{nazwa.tekst}</Link>
                    ) : nazwa.tekst}
                  </p>
                  <p className="mt-1 text-sm text-atrament-2">{skroc(n.przeznaczenie ?? '—', 110)}</p>
                  <p className="mt-1 text-xs text-atrament-3">
                    {`${dataSlownie(n.dzien)} · ${skroc(n.udzielajacy ?? '—', 60)}`}
                    {n.gmina ? (
                      <>
                        {' · '}
                        <Link href={`/gmina/${n.teryt}`} className="hover:text-akcent">{n.gmina}</Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="liczby shrink-0 font-semibold sm:text-right">{zlote(n.brutto)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <WarunkiSudop pobrano={imp?.kiedy ?? null} />
    </div>
  );
}

function Kafel({ wartosc, etykieta }: { wartosc: string; etykieta: string }) {
  return (
    <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
      <p className="liczby szryft text-3xl font-semibold">{wartosc}</p>
      <p className="mt-1 text-sm font-medium">{etykieta}</p>
    </div>
  );
}
