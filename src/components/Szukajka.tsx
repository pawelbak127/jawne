'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { dataKrotko, skroc } from '@/lib/format';
import { opisGminy, type OdpowiedzWyszukiwania } from '@/lib/wyszukiwanie';

/**
 * Jedno pole: miasto, nazwisko posla albo temat glosowania.
 *
 * To jest ZWYKLY FORMULARZ GET na /szukaj — dziala bez JavaScriptu i daje
 * adres, ktory mozna komus wyslac. JavaScript dokłada tylko podpowiedzi
 * w trakcie pisania.
 *
 * Gminy ida na gore listy celowo: wiekszosc ludzi nie zna nazwiska swojego
 * posla, ale zna swoja miejscowosc.
 */
export function Szukajka({
  poczatkowa = '',
  etykieta = 'Twoja miejscowość, nazwisko posła albo temat głosowania',
  autofocus = false,
}: {
  poczatkowa?: string;
  etykieta?: string;
  autofocus?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [fraza, ustawFraze] = useState(poczatkowa);
  const [wyniki, ustawWyniki] = useState<OdpowiedzWyszukiwania | null>(null);
  const [otwarte, ustawOtwarte] = useState(false);
  const [aktywny, ustawAktywny] = useState(-1);

  const q = fraza.trim();

  useEffect(() => {
    if (q.length < 2) return;
    const przerwij = new AbortController();
    const zegar = setTimeout(async () => {
      try {
        const odp = await fetch(`/api/szukaj?q=${encodeURIComponent(q)}`, { signal: przerwij.signal });
        if (odp.ok) ustawWyniki((await odp.json()) as OdpowiedzWyszukiwania);
      } catch {
        // Przerwane albo brak sieci. Pole dalej dziala jako zwykly formularz.
      }
    }, 160);
    return () => {
      clearTimeout(zegar);
      przerwij.abort();
    };
  }, [q]);

  // Wyniki pokazujemy tylko dla BIEZACEJ frazy — inaczej przy szybkim pisaniu
  // pod "Gdańsk" przez chwile wisza wyniki dla "Gd".
  const widoczne = q.length >= 2 && wyniki?.fraza === q ? wyniki : null;

  const pozycje = useMemo(() => {
    if (!widoczne) return [];
    return [
      ...widoczne.gminy.map((g) => ({ klucz: `g${g.teryt}`, adres: `/gmina/${g.teryt}` })),
      ...widoczne.poslowie.map((p) => ({ klucz: `p${p.slug}`, adres: `/posel/${p.slug}` })),
      ...widoczne.firmy.map((f) => ({ klucz: `f${f.nip}`, adres: `/firma/${f.nip}` })),
      ...widoczne.glosowania.map((g) => ({ klucz: `v${g.id}`, adres: `/glosowanie/${g.id}` })),
      { klucz: 'wszystko', adres: `/szukaj?q=${encodeURIComponent(q)}` },
    ];
  }, [widoczne, q]);

  const indeks = (klucz: string) => pozycje.findIndex((p) => p.klucz === klucz);
  const klasaPozycji = (klucz: string) =>
    `flex items-baseline gap-3 px-4 py-2.5 transition-colors ${indeks(klucz) === aktywny ? 'bg-akcent-slaby' : ''}`;

  function klawisz(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      ustawOtwarte(false);
      return;
    }
    if (!pozycje.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      ustawOtwarte(true);
      ustawAktywny((a) => (a + 1) % pozycje.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ustawAktywny((a) => (a <= 0 ? pozycje.length - 1 : a - 1));
    }
  }

  const pusto = widoczne && !widoczne.gminy.length && !widoczne.poslowie.length
    && !widoczne.glosowania.length && !widoczne.firmy.length;

  return (
    <div className="relative w-full">
      <form
        action="/szukaj"
        method="get"
        role="search"
        onSubmit={(e) => {
          const wybrana = pozycje[aktywny];
          if (otwarte && wybrana) {
            e.preventDefault();
            router.push(wybrana.adres);
          }
        }}
        className="flex items-center gap-2 rounded-2xl border border-kreska-2 bg-papier-2 py-1.5 pr-1.5 pl-4 shadow-karta focus-within:border-akcent"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-atrament-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          name="q"
          value={fraza}
          onChange={(e) => {
            ustawFraze(e.target.value);
            ustawOtwarte(true);
            ustawAktywny(-1);
          }}
          onFocus={() => ustawOtwarte(true)}
          onBlur={() => ustawOtwarte(false)}
          onKeyDown={klawisz}
          type="search"
          autoComplete="off"
          autoFocus={autofocus}
          aria-label={etykieta}
          placeholder={etykieta}
          role="combobox"
          aria-expanded={otwarte && Boolean(widoczne)}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-atrament-3"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-atrament px-4 text-sm font-medium text-papier transition-opacity hover:opacity-90"
        >
          Szukaj
        </button>
      </form>

      {otwarte && widoczne ? (
        <div
          id={`${id}-lista`}
          role="listbox"
          // mousedown zamiast click: inaczej blur pola zamyka liste, zanim klik dojdzie.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-30 mt-2 max-h-[70vh] w-full overflow-y-auto rounded-2xl border border-kreska bg-papier-2 py-2 text-left shadow-karta-2"
        >
          {pusto ? (
            <p className="px-4 py-3 text-sm text-atrament-2">
              Nic nie znaleźliśmy. Szukamy w nazwach gmin, nazwiskach posłów, tytułach głosowań
              i wśród firm — po nazwie albo po numerze NIP.
            </p>
          ) : null}

          {widoczne.gminy.length ? (
            <Grupa tytul="Gminy — posłowie i publiczne pieniądze">
              {widoczne.gminy.map((g) => (
                <Link key={g.teryt} href={`/gmina/${g.teryt}`} role="option" aria-selected={indeks(`g${g.teryt}`) === aktywny} className={klasaPozycji(`g${g.teryt}`)}>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{g.nazwa}</span>
                    <span className="block truncate text-xs text-atrament-3">{opisGminy(g)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-akcent">
                    {`okręg ${g.okreg}${g.okregNazwa ? ` · ${g.okregNazwa}` : ''} →`}
                  </span>
                </Link>
              ))}
            </Grupa>
          ) : null}

          {widoczne.poslowie.length ? (
            <Grupa tytul="Posłowie">
              {widoczne.poslowie.map((p) => (
                <Link key={p.slug} href={`/posel/${p.slug}`} role="option" aria-selected={indeks(`p${p.slug}`) === aktywny} className={klasaPozycji(`p${p.slug}`)}>
                  <span className="font-medium">{p.nazwa}</span>
                  <span className="text-sm text-atrament-2">{p.klub ?? 'bez klubu'}</span>
                  <span className="ml-auto truncate text-xs text-atrament-3">
                    {p.aktywny ? (p.okreg ?? '') : 'mandat wygasł'}
                  </span>
                </Link>
              ))}
            </Grupa>
          ) : null}

          {widoczne.firmy.length ? (
            <Grupa tytul="Firmy — pomoc publiczna">
              {widoczne.firmy.map((f) => (
                <Link key={f.nip} href={`/firma/${f.nip}`} role="option" aria-selected={indeks(`f${f.nip}`) === aktywny} className={klasaPozycji(`f${f.nip}`)}>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{f.nazwa}</span>
                    <span className="block truncate text-xs text-atrament-3">{f.opis}</span>
                  </span>
                  <span className="liczby shrink-0 text-xs text-atrament-3">{f.nip}</span>
                </Link>
              ))}
            </Grupa>
          ) : null}

          {widoczne.glosowania.length ? (
            <Grupa tytul={`Głosowania (${widoczne.glosowanWszystkich})`}>
              {widoczne.glosowania.map((g) => (
                <Link key={g.id} href={`/glosowanie/${g.id}`} role="option" aria-selected={indeks(`v${g.id}`) === aktywny} className={klasaPozycji(`v${g.id}`)}>
                  <span className="liczby shrink-0 text-xs text-atrament-3">{dataKrotko(g.data)}</span>
                  <span className="text-sm leading-snug">{skroc(g.tytul, 110)}</span>
                </Link>
              ))}
            </Grupa>
          ) : null}

          {!pusto ? (
            <Link
              href={`/szukaj?q=${encodeURIComponent(q)}`}
              role="option"
              aria-selected={indeks('wszystko') === aktywny}
              className={`mt-1 block border-t border-kreska px-4 pt-3 pb-1.5 text-sm text-akcent ${indeks('wszystko') === aktywny ? 'underline' : ''}`}
            >
              {`Wszystkie wyniki dla „${q}” →`}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Grupa({ tytul, children }: { tytul: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-1 pb-1 text-[11px] font-medium tracking-wider text-atrament-3 uppercase">{tytul}</p>
      {children}
    </div>
  );
}
