import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, szukaj } from '@/lib/dane';
import { liczba, zlote, zOdmiana } from '@/lib/format';
import { opisFirmy, opisGminy } from '@/lib/wyszukiwanie';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { PozycjaGlosowania } from '@/components/PozycjaGlosowania';
import { Szukajka } from '@/components/Szukajka';
import { Okruszek, Wypis } from '@/components/Szablon';

// Strony wynikow nie maja wlasnej tresci — nie indeksujemy ich nigdy,
// takze po premierze. Wartosc jest jawna, a nie `undefined`.
export const metadata: Metadata = {
  title: 'Szukaj',
  robots: { index: false, follow: true },
};

const GLOSOWAN_NA_STRONIE = 50;

export default async function StronaSzukaj({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { q = '' } = await searchParams;
  const fraza = q.slice(0, 120);
  const w = szukaj(fraza, GLOSOWAN_NA_STRONIE);
  const grupy = [
    { id: 'gminy-w', nazwa: 'gminy', ile: w.gminy.length },
    { id: 'poslowie-w', nazwa: 'posłowie', ile: w.poslowie.length },
    { id: 'ustawy-w', nazwa: 'ustawy', ile: w.ustawWszystkich },
    { id: 'firmy-w', nazwa: 'firmy', ile: w.firmy.length },
    { id: 'glosowania-w', nazwa: 'głosowania', ile: w.glosowanWszystkich },
  ].filter((g) => g.ile > 0);
  const razem = w.gminy.length + w.poslowie.length + w.ustawWszystkich + w.firmy.length + w.glosowanWszystkich;
  const krotka = fraza.trim().length < 2;

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Szukaj' }]} />
      <Wypis
        tytul={krotka ? 'Szukaj' : `Wyniki dla „${fraza.trim()}”: ${liczba(razem)}`}
        podtytul="Gminy, posłowie, ustawy, firmy i głosowania — każda grupa prowadzi do pełnej strony."
      />
      <div className="mt-5 max-w-xl">
        <Szukajka poczatkowa={fraza} />
      </div>

      {krotka ? (
        <p className="mt-6 text-atrament-2">
          Wpisz co najmniej dwa znaki — nazwę swojej gminy, nazwisko posła, słowo z tytułu
          głosowania lub ustawy, numer druku albo nazwę bądź NIP firmy.
        </p>
      ) : razem === 0 ? (
        <p className="mt-6 text-atrament-2">{`Nic nie znaleźliśmy dla „${fraza}”.`}</p>
      ) : (
        <nav className="zakladki" aria-label="Grupy wyników">
          {grupy.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              {g.nazwa}
              <span className="znak">{liczba(g.ile)}</span>
            </a>
          ))}
        </nav>
      )}

      {w.gminy.length ? (
        <Grupa id="gminy-w" tytul={`Gminy: ${liczba(w.gminy.length)}`}>
          <p className="wstep">Kliknij swoją gminę: zobaczysz jej budżet, fundusze unijne, pomoc publiczną dla firm i posłów z okręgu.</p>
          <ul className="pozycje">
            {w.gminy.map((g) => (
              <li key={g.teryt}>
                <div className="min-w-0">
                  <Link href={`/gmina/${g.teryt}`} className="tytul-poz">{g.nazwa}</Link>
                  <p className="meta">{`${opisGminy(g)} · okręg nr ${g.okreg_nr}${g.okreg_nazwa ? ` ${g.okreg_nazwa}` : ''}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </Grupa>
      ) : null}

      {w.poslowie.length ? (
        <Grupa id="poslowie-w" tytul={`Posłowie: ${liczba(w.poslowie.length)}`}>
          <ul className="pozycje">
            {w.poslowie.map((p) => (
              <li key={p.slug}>
                <div className="min-w-0">
                  <Link href={`/posel/${p.slug}`} className="tytul-poz">{p.imie_nazwisko}</Link>
                  <p className="meta">{`${p.klub_id ?? 'bez klubu'} · ${p.aktywny ? p.okreg_nazwa ?? '—' : 'mandat wygasł'}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </Grupa>
      ) : null}

      {w.ustawy.length ? (
        <Grupa id="ustawy-w" tytul={`Ustawy: ${liczba(w.ustawWszystkich)}`}>
          {w.ustawWszystkich > w.ustawy.length ? (
            <p className="wstep">{`Najnowsze ${liczba(w.ustawy.length)} z ${zOdmiana(w.ustawWszystkich, 'znalezionego projektu', 'znalezionych projektów', 'znalezionych projektów')}.`}</p>
          ) : null}
          <ul className="pozycje">
            {w.ustawy.map((u) => (
              <li key={u.numer}>
                <div className="min-w-0">
                  <p className="meta"><span className="znak">{`druk ${u.numer}`}</span></p>
                  <Link href={`/ustawa/${u.numer}`} className="tytul-poz">{bezNazwiskOsobPrywatnych(u.tytul)}</Link>
                  <p className="meta">{u.koniec ?? (u.ostatni_etap ? `W toku · ${u.ostatni_etap}` : 'W toku')}</p>
                </div>
              </li>
            ))}
          </ul>
        </Grupa>
      ) : null}

      {w.firmy.length ? (
        <Grupa id="firmy-w" tytul={`Firmy: ${liczba(w.firmy.length)}`}>
          <p className="wstep">Beneficjenci pomocy publicznej z rejestru SUDOP. Szukamy po nazwie i po numerze NIP.</p>
          <ul className="pozycje">
            {w.firmy.map((f) => (
              <li key={f.nip}>
                <div className="min-w-0">
                  <Link href={`/firma/${f.nip}`} className="tytul-poz">{f.nazwa}</Link>
                  <p className="meta">{opisFirmy(f)}</p>
                </div>
                {/* Brak kwoty to nie zero: zrodlo czasem nie podaje wartosci brutto. */}
                <p className="kwota">{f.brutto === null ? '—' : zlote(f.brutto)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3"><Link href={`/firmy?q=${encodeURIComponent(fraza.trim())}`}>więcej w wyszukiwarce firm →</Link></p>
        </Grupa>
      ) : null}

      {w.glosowania.length ? (
        <Grupa id="glosowania-w" tytul={`Głosowania: ${liczba(w.glosowanWszystkich)}`}>
          {/* Mianownik: czytelnik musi wiedziec, ze lista jest ucieta. */}
          {w.glosowanWszystkich > w.glosowania.length ? (
            <p className="wstep">{`Najnowsze ${liczba(w.glosowania.length)} z ${zOdmiana(w.glosowanWszystkich, 'znalezionego', 'znalezionych', 'znalezionych')}. Doprecyzuj frazę, żeby zawęzić wynik.`}</p>
          ) : null}
          <ul className="pozycje">
            {w.glosowania.map((g) => <PozycjaGlosowania key={`${g.posiedzenie}-${g.numer}`} g={g} />)}
          </ul>
        </Grupa>
      ) : null}

      {/*
        Ograniczenia wyszukiwania mowimy wprost. Czytelnik, ktory nie znalazl
        ustawy, ma wiedziec, ze to moze byc wina odmiany, a nie brak glosowania.
      */}
      <details className="metoda mt-10">
        <summary>Jak działa to wyszukiwanie</summary>
        <div className="tresc">
          <p>
            Szukamy w nazwach gmin (według danych PKW z wyborów w 2023 r.), w nazwiskach
            posłów, w tytułach głosowań i ustaw (także po numerze druku) oraz wśród firm
            z rejestru pomocy publicznej. Ogonki można pomijać: „lodz” znajdzie „Łódź”.
          </p>
          <p>
            Nie mamy słownika polskiej odmiany. Ucinamy końcówki słów, więc „podatek”
            znajdzie „podatku”, ale słowa, które zmieniają się w środku („matka” → „matek”),
            mogą umknąć. Jeśli nic nie ma, spróbuj krótszej formy.
          </p>
          <p>
            Firmy znajdziemy po nazwie albo po numerze NIP (dziesięć cyfr, ze spacjami
            lub bez). Gdy beneficjentem może być osoba fizyczna, nie pokazujemy ani jej
            nazwy, ani strony — także wtedy, gdy ktoś wpisze dokładny NIP. Pieniądze
            zostają w sumach: pomoc takich podmiotów jest wliczona w zestawienia gminy
            i w liczbę beneficjentów, pomijamy nazwę, nie kwotę.
          </p>
          <p>
            Wieś nie jest gminą. Jeśli Twojej miejscowości nie ma na liście, wpisz nazwę
            gminy, do której należy.
          </p>
        </div>
      </details>
    </div>
  );
}

/** Grupa wynikow — dzial bez numeru: tu kolejnosc grup nic nie znaczy. */
function Grupa({ id, tytul, children }: { id: string; tytul: string; children: React.ReactNode }) {
  return (
    <section className="dzial" id={id} aria-labelledby={`${id}-t`}>
      {/* Pusta kolumna numeru: w stylu „Wypis” dzial ma od 900 px dwie kolumny. */}
      <div className="nr" aria-hidden="true" />
      <div className="min-w-0">
        <div className="tytul"><h2 id={`${id}-t`}>{tytul}</h2></div>
        {children}
      </div>
    </section>
  );
}
