import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, etapyProcesu, glosowanie, proces, streszczenieUstawy, zrodloImportu,
  type EtapProcesu, type ProcesSkrot,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, skroc, zOdmiana } from '@/lib/format';
import { bezNazwiskOsobPrywatnych, pominietoNazwiska } from '@/lib/prywatnosc';
import { opisGlosowania } from '@/lib/opis-glosowania';
import { wynikGlosowania } from '@/lib/wynik-glosowania';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Podstawa, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ numer: string }[]> {
  return [];
}

const REJESTR = (numer: string) => `https://www.sejm.gov.pl/sejm10.nsf/PrzebiegProc.xsp?nr=${numer}`;

/**
 * Stan procesu SLOWAMI REJESTRU, nie naszymi.
 *
 * Rejestr ma na to wlasny, krotki slownik etapow koncowych: "Uchwalono",
 * "Odrzucono", "Wycofano", "nie uchwalona ponownie po wecie Prezydenta"
 * (zmierzone 23.09.2026 na 1692 procesach). Gdy etapu koncowego nie ma,
 * proces trwa — i wtedy mowimy tylko, na czym stanal.
 */
function stan(p: ProcesSkrot): string {
  return p.koniec ?? 'W toku';
}

export async function generateMetadata({ params }: { params: Promise<{ numer: string }> }): Promise<Metadata> {
  const { numer } = await params;
  const p = bazaDostepna() ? proces(numer) : null;
  if (!p) return { title: 'Nie ma takiego druku' };
  const tytul = bezNazwiskOsobPrywatnych(p.tytul);
  return {
    title: `${skroc(tytul, 70)} — druk ${p.numer}`,
    description: `${stan(p)}. ${skroc(tytul, 150)}`,
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
  const streszczenie = streszczenieUstawy(numer);
  const tytul = bezNazwiskOsobPrywatnych(p.tytul);
  const importProcesow = zrodloImportu('procesy');
  const ostatni = [...etapy].reverse().find((e) => e.data) ?? null;

  // Glosowania wskazane przez rejestr przy etapach — z wynikiem wobec
  // wymaganej wiekszosci (src/lib/wynik-glosowania.ts). Kilka odczytow po
  // kluczu glownym, nie przebieg po tabeli.
  const glosowaniaEtapow = etapy
    .filter((e) => e.glos_posiedzenie !== null && e.glos_numer !== null)
    .map((e) => ({ e, g: e.glosowanie_mamy > 0 ? glosowanie(e.glos_posiedzenie!, e.glos_numer!) : null }));

  const dzialy = [
    ...(p.opis ? [{ id: 'opis', nazwa: 'Opis z rejestru' }] : []),
    { id: 'droga', nazwa: 'Droga przez Sejm' },
    { id: 'glosowania', nazwa: 'Głosowania' },
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Sejm' }, { adres: '/ustawy', nazwa: 'Ustawy' }, { nazwa: `druk nr ${p.numer}` }]} />
        <Wypis
          tytul={tytul}
          podtytul={
            <>
              <b className="text-atrament">{stan(p)}</b>
              {p.rodzaj ? ` · ${p.rodzaj}` : ''}
              {!p.koniec && ostatni ? ` · ostatni etap: ${bezNazwiskOsobPrywatnych(ostatni.nazwa)} (${dataKrotko(ostatni.data)})` : ''}
            </>
          }
        />

        {/*
          PO LUDZKU (04.10.2026) — prosba Pawla: „dla zwyklego zjadacza chleba".
          Napisane przez model jezykowy WYLACZNIE z opisu rejestru, ktory stoi
          w dziale nizej — zrodlo jest o rzut oka, a nie zamiast. Kazda liczba
          przeszla bezpiecznik (musi wystepowac w opisie rejestru), a gdy rejestr
          zmieni opis, streszczenie znika samo (skrot zrodla). Podpis mowi wprost,
          kto to napisal i ze rozstrzyga tekst rejestru.
        */}
        {streszczenie ? (
          <section className="w-liczbach po-ludzku" aria-labelledby="po-ludzku-t" data-odpowiedz="">
            <h2 id="po-ludzku-t">Po ludzku</h2>
            <p className="py-2 leading-relaxed">{streszczenie.tekst}</p>
            <p className="pb-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
              {`Napisał automatycznie model językowy (${streszczenie.model}) wyłącznie na podstawie `}
              <a href="#opis">opisu z rejestru Sejmu</a>
              {'. Może zawierać błędy — rozstrzyga tekst rejestru. Każda liczba w streszczeniu została sprawdzona: musi występować w opisie rejestru.'}
            </p>
          </section>
        ) : null}

        {p.adres_publikacji ? (
          <p className="mt-4" style={{ fontSize: 'var(--sredni)' }}>
            <b>{`Opublikowano: ${p.adres_publikacji}`}</b>
            {p.eli ? (
              <>
                {' · '}
                <a className="text-akcent underline underline-offset-4 hover:no-underline" href={`https://eli.gov.pl/eli/${p.eli}`} target="_blank" rel="noreferrer">
                  tekst aktu w Dzienniku Ustaw
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <p className="stan-danych">
          <span>{`druk nr ${p.numer}`}</span>
          {p.data_wplyniecia ? <span>{`wpłynął ${dataKrotko(p.data_wplyniecia)}`}</span> : null}
          {importProcesow ? <span>{`stan danych: rejestr procesów ${dataKrotko(importProcesow.kiedy)}`}</span> : null}
          <span><Podstawa adres={REJESTR(p.numer)} nazwa="przebieg procesu w Sejmie" /></span>
        </p>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          {/*
            CZEGO DOTYCZY — cytat z rejestru, nie nasze streszczenie.
            Naglowek musi mowic, KTO to napisal. „Streszczenie" bez autora kazaloby
            czytelnikowi przypisac tekst nam, a przy pierwszym nieprecyzyjnym opisie
            zaplacilaby za to nasza wiarygodnosc. Dlatego odnosnik stoi TUTAJ, przy
            tekscie (zasada 1: ma wygladac jak element interfejsu, nie jak przypis).
            Ta sama regula prywatnosci co przy tytule (zasada 7).
          */}
          {p.opis ? (
            <Dzial id="opis" nr={nr('opis')} tytul="Opis z rejestru Sejmu" obok={<Podstawa adres={REJESTR(p.numer)} nazwa="opis z rejestru Sejmu" />}>
              <p className="wstep text-atrament" style={{ color: 'var(--atrament)' }}>{bezNazwiskOsobPrywatnych(p.opis)}</p>
            </Dzial>
          ) : null}

          <Dzial
            id="droga"
            nr={nr('droga')}
            tytul={etapy.length
              ? `Droga przez Sejm: ${zOdmiana(etapy.length, 'etap', 'etapy', 'etapów')}${ostatni ? `, ostatni ${dataKrotko(ostatni.data)}` : ''}`
              : 'Droga przez Sejm'}
            obok={<Podstawa adres={REJESTR(p.numer)} nazwa="przebieg procesu w Sejmie" />}
          >
            {etapy.length === 0 ? (
              <p className="wstep">Rejestr nie podaje etapów tego procesu.</p>
            ) : (
              <ol className="droga">
                {etapy.map((e, i) => <Etap key={e.kolejnosc} e={e} ostatni={i === etapy.length - 1} />)}
              </ol>
            )}
            {/*
              ZGLOSZENIE PAWLA 24.09.2026: „druk 3101 — nie mozna otworzyc pliku".
              Zmierzone tego samego dnia: ten sam adres oddal 404, a zaraz potem
              piec razy 200. To pulapka 1 (API Sejmu za F5 oddaje 404 na poprawna
              sciezke). Link jest dobry — zawodzi usluga, i tak to mowimy.
            */}
            <p className="mt-3 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
              Nazwy etapów pochodzą z rejestru Sejmu; nie dopisujemy do nich własnych wyjaśnień.
              Druki otwierają się prosto z API Sejmu — jeśli plik się nie otworzy, spróbuj za
              chwilę: serwer Sejmu zdarza się oddać błąd na poprawny adres. Nie kopiujemy druków
              do siebie, to dokumenty Kancelarii Sejmu.
            </p>
          </Dzial>

          <Dzial
            id="glosowania"
            nr={nr('glosowania')}
            tytul={glosowaniaEtapow.length
              ? `Głosowania: ${zOdmiana(glosowaniaEtapow.length, 'głosowanie', 'głosowania', 'głosowań')} nad tym projektem`
              : 'Głosowania: jeszcze żadnego nad tym projektem'}
          >
            {glosowaniaEtapow.length === 0 ? (
              <p className="wstep">Rejestr nie wskazuje przy etapach tego procesu żadnego głosowania.</p>
            ) : (
              <ul className="pozycje">
                {glosowaniaEtapow.map(({ e, g }) => <GlosowanieEtapu key={e.kolejnosc} e={e} g={g} />)}
              </ul>
            )}
          </Dzial>
        </div>
      </div>
    </>
  );
}

/** Jeden etap. Podetapy (skierowania, sprawozdania komisji) sa wciete — w rejestrze sa dziecmi czytania. */
function Etap({ e, ostatni }: { e: EtapProcesu; ostatni: boolean }) {
  const doGlosowania = e.glos_posiedzenie !== null && e.glos_numer !== null && e.glosowanie_mamy > 0;
  return (
    <li className={ostatni ? 'ostatni' : undefined} style={e.poziom > 0 ? { marginLeft: '1.25rem' } : undefined}>
      <p className="kiedy">
        {[
          e.data ? dataKrotko(e.data) : null,
          e.posiedzenie ? `posiedzenie ${e.posiedzenie}` : null,
          // Kod "Sejm" nie jest komisja — rejestr uzywa go dla skierowania
          // na posiedzenie izby. "komisja Sejm" byloby nieprawda.
          e.komisja && e.komisja !== 'Sejm' ? `komisja ${e.komisja}` : null,
        ].filter(Boolean).join(' · ') || '—'}
      </p>
      <p>
        {e.poziom > 0 ? bezNazwiskOsobPrywatnych(e.nazwa) : <b>{bezNazwiskOsobPrywatnych(e.nazwa)}</b>}
        {e.decyzja || e.komentarz ? <span className="text-atrament-2">{` · ${[e.decyzja, e.komentarz].filter(Boolean).join(' · ')}`}</span> : null}
      </p>
      {e.druk || e.glos_posiedzenie !== null ? (
        <p className="flex flex-wrap gap-x-4" style={{ fontSize: 'var(--sredni)' }}>
          {e.druk ? (
            <a href={`https://api.sejm.gov.pl/sejm/term10/prints/${e.druk}/${e.druk}.pdf`} target="_blank" rel="noreferrer" className="text-akcent underline underline-offset-4 hover:no-underline">
              {`druk nr ${e.druk} (PDF)`}
            </a>
          ) : null}
          {doGlosowania ? (
            <Link href={`/glosowanie/${e.glos_posiedzenie}-${e.glos_numer}`} className="text-akcent underline underline-offset-4 hover:no-underline">
              kto jak głosował
            </Link>
          ) : e.glos_posiedzenie !== null ? (
            // Rejestr wskazuje glosowanie, ktorego jeszcze nie pobralismy.
            // Mowimy to wprost, zamiast dawac odnosnik prowadzacy donikad.
            <span className="text-atrament-2">{`głosowanie ${e.glos_posiedzenie}-${e.glos_numer} — nie mamy go jeszcze w bazie`}</span>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

/** „Głosowanie — głosowanie nad całością” mowi to samo dwa razy: przy samym „Głosowanie” zostaje przedmiot. */
function tytulGlosowania(nazwa: string, przedmiot: string | null): string {
  const n = bezNazwiskOsobPrywatnych(nazwa);
  if (!przedmiot) return n;
  if (/^głosowanie$/i.test(n.trim())) return przedmiot.charAt(0).toLocaleUpperCase('pl-PL') + przedmiot.slice(1);
  return `${n} — ${przedmiot}`;
}

function GlosowanieEtapu({ e, g }: { e: EtapProcesu; g: ReturnType<typeof glosowanie> }) {
  if (!g) {
    return (
      <li>
        <div className="min-w-0">
          <p className="meta">{e.data ? dataKrotko(e.data) : '—'}</p>
          <p className="font-semibold">{bezNazwiskOsobPrywatnych(e.nazwa)}</p>
          <p className="meta">{`głosowanie ${e.glos_posiedzenie}-${e.glos_numer} — nie mamy go jeszcze w bazie`}</p>
        </div>
      </li>
    );
  }
  const o = opisGlosowania(g);
  const w = wynikGlosowania(g);
  return (
    <li>
      <div className="min-w-0">
        <p className="meta">{`${dataSlownie(g.data)} · posiedzenie ${g.posiedzenie}`}</p>
        <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="tytul-poz">
          {skroc(tytulGlosowania(e.nazwa, o.przedmiot), 150)}
        </Link>
        <p className="meta">
          {`za ${liczba(g.za)}, przeciw ${liczba(g.przeciw)}, wstrzymało się ${liczba(g.wstrzymalo)}`}
          {w ? ` · ${w.nazwa}: wymagane ${liczba(w.wymagane)} „za”` : ''}
        </p>
        {w ? <p className="meta"><b className="text-atrament">{w.osiagnieta ? 'Wymagana większość osiągnięta.' : 'Wymagana większość nieosiągnięta.'}</b></p> : null}
      </div>
    </li>
  );
}
