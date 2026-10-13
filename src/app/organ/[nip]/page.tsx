import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, organ, zrodloImportu } from '@/lib/dane';
import { OPIS_KATEGORII } from '@/lib/formy-pomocy';
import { dataKrotko, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Podstawa, Wiersz, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
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
  const podstawa = <Podstawa adres={`${ZRODLO_SUDOP}/search/aidGrantor`} nazwa="SUDOP, UOKiK" data={imp ? dataKrotko(imp.kiedy) : null} />;

  const dzialy = [
    { id: 'rodzaje', nazwa: 'Rodzaje pomocy' },
    ...(o.gminy.length ? [{ id: 'gdzie', nazwa: 'Gdzie trafiła' }] : []),
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { adres: '/pomoc-publiczna', nazwa: 'Pomoc publiczna' }, { nazwa: o.nazwa }]} />
        <Wypis
          tytul={o.nazwa}
          podtytul={
            <>
              {'Organ przyznający pomoc publiczną'}
              {o.siedziba ? (
                <>
                  {' · siedziba: '}
                  <Link href={`/gmina/${o.siedziba.teryt}`}>{o.siedziba.nazwa}</Link>
                  {` (pow. ${o.siedziba.powiat})`}
                </>
              ) : null}
            </>
          }
        />

        <WLiczbach tytul="W liczbach" stopka={<WarunkiSudop pobrano={imp?.kiedy ?? null} />}>
          <Wiersz
            duzy
            co="Decyzje o pomocy"
            ile={liczba(o.przypadkow)}
            zCzego={<>{`w ${zOdmiana(o.kategorie.length, 'rodzaju', 'rodzajach', 'rodzajach')} pomocy — kwot z różnych rodzajów nie sumujemy `}<a href="#rodzaje">rodzaje pomocy ↓</a></>}
            podstawa={podstawa}
          />
          <Wiersz
            co="Gminy, w których firmy je dostały"
            ile={liczba(o.gmin)}
            zCzego={<>{'liczone po siedzibie firmy, nie po miejscu inwestycji '}{o.gminy.length ? <a href="#gdzie">gdzie trafiła ↓</a> : null}</>}
            podstawa={podstawa}
          />
        </WLiczbach>

        <p className="stan-danych">
          <span>{`NIP ${o.nip}`}</span>
          <span>{`stan danych: SUDOP ${imp ? dataKrotko(imp.kiedy) : '—'}`}</span>
        </p>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          <Dzial
            id="rodzaje"
            nr={nr('rodzaje')}
            tytul={`Rodzaje pomocy: ${liczba(o.kategorie.length)}`}
          >
            <p className="wstep">
              Kwot z różnych rodzajów nie sumujemy w jedną liczbę: dotacja jest wydatkiem budżetu,
              zwolnienie dochodem, którego nie pobrano, a rata tylko korzyścią z odsetek.
            </p>
            <ul className="pozycje">
              {o.kategorie.map((k) => (
                <li key={k.kategoria}>
                  <div className="min-w-0">
                    <p className="font-semibold">{OPIS_KATEGORII[k.kategoria].etykieta}</p>
                    <p className="meta">{zOdmiana(k.przypadkow, 'decyzja', 'decyzje', 'decyzji')}</p>
                    <p className="meta mt-1">{OPIS_KATEGORII[k.kategoria].wyjasnienie}</p>
                  </div>
                  {/* Brak kwoty to brak w rejestrze, nie zero (zasada 4). */}
                  <p className="kwota">{k.brutto === null ? '—' : zlote(k.brutto)}{k.brutto === null ? <small>bez kwoty w rejestrze</small> : null}</p>
                </li>
              ))}
            </ul>
          </Dzial>

          {o.gminy.length ? (
            <Dzial
              id="gdzie"
              nr={nr('gdzie')}
              tytul={`Gdzie trafiła ta pomoc: ${zOdmiana(o.gminy.length, 'gmina', 'gminy', 'gmin')} z największymi kwotami`}
              obok={<Podstawa adres={`${ZRODLO_SUDOP}/search/aidGrantor`} nazwa="sprawdź w SUDOP" />}
            >
              <p className="wstep">
                {`${zOdmiana(o.gminy.length, 'pozycja', 'pozycje', 'pozycji')} z ${liczba(o.gmin)} gmin. `}
                To rozkład decyzji tego organu po kraju, nie ocena gmin.
              </p>
              <ul className="pozycje">
                {o.gminy.map((g) => (
                  <li key={g.teryt}>
                    <div className="min-w-0">
                      <Link href={`/gmina/${g.teryt}`} className="tytul-poz">{g.nazwa}</Link>
                      <p className="meta">{`pow. ${g.powiat} · ${zOdmiana(g.przypadkow, 'decyzja', 'decyzje', 'decyzji')}`}</p>
                    </div>
                    <p className="kwota">{g.brutto === null ? '—' : zlote(g.brutto)}</p>
                  </li>
                ))}
              </ul>
            </Dzial>
          ) : null}
        </div>
      </div>
    </>
  );
}
