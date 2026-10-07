import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, organ, zrodloImportu } from '@/lib/dane';
import { OPIS_KATEGORII } from '@/lib/formy-pomocy';
import { liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ nip: string }[]> {
  return [];
}

/**
 * Strona organu, ktory przyznaje pomoc publiczna.
 *
 * DOKONCZENIE sekcji „Kto to postanowil" z 01.10.2026: tam nazwa organu byla
 * zwyklym tekstem, wiec czytelnik widzial „Prezes Zarzadu PFRON, 1 005
 * decyzji" i nie mial gdzie klikna. Pytanie „a co ten organ robi w innych
 * gminach" jest naturalne i nikt w Polsce na nie nie odpowiada, bo nikt nie
 * ma SUDOP.
 *
 * ZASADA 6 (nie oceniamy) obowiazuje tu dwa razy mocniej, bo za organem stoi
 * konkretny czlowiek: **nie szeregujemy organow miedzy soba** i nie ma tu
 * zadnej miary „skutecznosci". Lista gmin to rozklad jednej decyzji po kraju,
 * z kwota przy kazdej pozycji — a nie ranking gmin.
 *
 * ZASADA 7: strona powstaje tylko dla organow, ktorych nazwe wolno pokazac.
 * Udzielajacym bywa osoba fizyczna (pulapka 34; zmierzone: 13 z 1 148 ma
 * w REGON typ F) — dla nich `organ()` oddaje `null`, a to znaczy 404.
 */
export const revalidate = 3600;

function widok(nip: string) {
  if (!bazaDostepna()) return null;
  const o = organ(nip);
  return o ? { o } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ nip: string }> }): Promise<Metadata> {
  const { nip } = await params;
  const w = widok(nip);
  if (!w) return { title: 'Nie znaleziono organu', robots: { index: false, follow: false } };
  return {
    title: `${skroc(w.o.nazwa, 70)} — pomoc publiczna, którą przyznał`,
    description: `${skroc(w.o.nazwa, 60)}: ${zOdmiana(w.o.przypadkow, 'decyzja', 'decyzje', 'decyzji')}`
      + ` o pomocy publicznej w ${zOdmiana(w.o.gmin, 'gminie', 'gminach', 'gminach')},`
      + ' według rejestru SUDOP prowadzonego przez UOKiK.',
  };
}

export default async function Strona({ params }: { params: Promise<{ nip: string }> }) {
  const { nip } = await params;
  if (!bazaDostepna()) return <BrakDanych />;
  const w = widok(nip);
  if (!w) notFound();
  const { o } = w;
  const imp = zrodloImportu('sudop-przyrost');

  return (
    <div className="obszar max-w-4xl py-10">
      <p className="text-sm text-atrament-2">Organ przyznający pomoc publiczną</p>
      <header className="mt-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">{o.nazwa}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-atrament-2">
          <span className="liczby">{`NIP ${o.nip}`}</span>
          {o.siedziba ? (
            <span>
              {'siedziba: '}
              <Link href={`/gmina/${o.siedziba.teryt}`} className="text-akcent underline underline-offset-4 hover:no-underline">
                {o.siedziba.nazwa}
              </Link>
              {` (pow. ${o.siedziba.powiat})`}
            </span>
          ) : null}
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{liczba(o.przypadkow)}</p>
          <p className="mt-1 text-sm font-medium">
            {o.przypadkow === 1 ? 'decyzja o pomocy' : 'decyzji o pomocy'}
          </p>
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{liczba(o.gmin)}</p>
          <p className="mt-1 text-sm font-medium">
            {o.gmin === 1 ? 'gmina, w której firmy je dostały' : 'gmin, w których firmy je dostały'}
          </p>
          <p className="mt-0.5 text-xs text-atrament-2">liczone po siedzibie firmy, nie po miejscu inwestycji</p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-10">
        <h2 className="szryft text-2xl font-semibold">Rodzaje pomocy</h2>
        <p className="mt-2 max-w-3xl text-atrament-2">
          Kwot z różnych rodzajów nie sumujemy w jedną liczbę: dotacja jest wydatkiem budżetu,
          zwolnienie dochodem, którego nie pobrano, a rata tylko korzyścią z odsetek.
        </p>
        <ul className="mt-4 space-y-2">
          {o.kategorie.map((k) => (
            <li key={k.kategoria} className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium">{OPIS_KATEGORII[k.kategoria].etykieta}</p>
                <p className="liczby text-sm">
                  {`${zOdmiana(k.przypadkow, 'decyzja', 'decyzje', 'decyzji')} · ${
                    k.brutto === null ? 'bez kwoty w rejestrze' : zlote(k.brutto)
                  }`}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-atrament-3">
                {OPIS_KATEGORII[k.kategoria].wyjasnienie}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {o.gminy.length ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="szryft text-2xl font-semibold">Gdzie trafiła ta pomoc</h2>
            <Zrodlo adres={`${ZRODLO_SUDOP}/search/aidGrantor`} etykieta="sprawdź w SUDOP" />
          </div>
          <p className="mt-2 max-w-3xl text-atrament-2">
            {`Gminy z największymi kwotami — ${zOdmiana(o.gminy.length, 'pozycja', 'pozycje', 'pozycji')} z ${liczba(o.gmin)}. `}
            To rozkład decyzji tego organu po kraju, nie ocena gmin.
          </p>
          <ul className="mt-4 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
            {o.gminy.map((g) => (
              <li key={g.teryt} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
                <Link href={`/gmina/${g.teryt}`} className="font-medium text-akcent underline underline-offset-4 hover:no-underline">
                  {g.nazwa}
                </Link>
                <span className="text-xs text-atrament-3">{`pow. ${g.powiat}`}</span>
                <span className="liczby basis-full text-sm sm:basis-auto">
                  {`${zOdmiana(g.przypadkow, 'decyzja', 'decyzje', 'decyzji')} · ${
                    g.brutto === null ? 'bez kwoty' : zlote(g.brutto)
                  }`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <WarunkiSudop pobrano={imp?.kiedy ?? null} />
    </div>
  );
}
