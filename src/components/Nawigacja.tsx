'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { PrzelacznikMotywu } from '@/components/PrzelacznikMotywu';

type Pozycja = { adres: string; etykieta: string; opis: string };
type Grupa = { etykieta: string; adres?: string; opis?: string; pozycje?: Pozycja[] };

/**
 * Menu serwisu.
 *
 * Grupy, nie plaska lista: przy czterech pozycjach dalo sie jeszcze zgadnac,
 * gdzie co jest, ale „Okregi wyborcze” obok „Pomocy publicznej” niczego nie
 * tlumaczy. Sejm to jedno, pieniadze to drugie — i tak samo beda wchodzic
 * nastepne strony (ustawy, zamowienia).
 *
 * Rozwijane przez `<details>`, a nie przez stan Reacta: dziala bez
 * JavaScriptu (w przegladarce z wylaczonym JS menu nadal sie otwiera)
 * i nie ma ryzyka, ze serwer wyrenderuje inny stan niz przegladarka.
 * JavaScript dokłada tylko zamykanie: klikniecie obok, Escape i przejscie
 * na inna strone.
 */
const MENU: Grupa[] = [
  { etykieta: 'Gminy', adres: '/gminy', opis: 'budżet, Unia, pomoc dla firm' },
  {
    etykieta: 'Sejm',
    pozycje: [
      { adres: '/poslowie', etykieta: 'Posłowie', opis: 'kto jak głosuje i czy zgodnie z klubem' },
      { adres: '/glosowania', etykieta: 'Głosowania', opis: 'każdy głos imienny, z rejestru Sejmu' },
      { adres: '/ustawy', etykieta: 'Ustawy', opis: 'co się stało z projektem, etap po etapie' },
      { adres: '/okregi', etykieta: 'Okręgi wyborcze', opis: 'gminy okręgu i posłowie z niego' },
    ],
  },
  {
    etykieta: 'Pieniądze',
    pozycje: [
      { adres: '/pomoc-publiczna', etykieta: 'Pomoc publiczna', opis: 'dotacje i ulgi dla firm (UOKiK)' },
      { adres: '/gminy', etykieta: 'Pieniądze w gminie', opis: 'budżet gminy i projekty unijne' },
      { adres: '/mapa', etykieta: 'Mapa gmin', opis: 'cała Polska, zawsze na mieszkańca' },
    ],
  },
];

const NA_DOLE_PANELU: Pozycja[] = [
  { adres: '/szukaj', etykieta: 'Szukaj', opis: 'gmina, poseł, głosowanie' },
  { adres: '/stan', etykieta: 'Stan danych', opis: 'co i kiedy pobraliśmy' },
  { adres: '/o-serwisie', etykieta: 'O serwisie', opis: 'skąd pochodzą liczby' },
];

const SUMMARY =
  'flex cursor-pointer list-none items-center gap-1 rounded-lg px-1 py-2 text-atrament-2 transition-colors select-none hover:bg-papier-3 hover:text-atrament [&::-webkit-details-marker]:hidden sm:px-3';

export function Nawigacja() {
  const korzen = useRef<HTMLElement>(null);
  const sciezka = usePathname();

  // Zamykanie. Samo `<details>` nie zamyka sie ani po kliknieciu obok, ani po
  // przejsciu na inna strone (nawigacja Next nie przeladowuje dokumentu).
  useEffect(() => {
    const wszystkie = () => korzen.current?.querySelectorAll('details[open]') ?? [];
    const zamknij = (poza?: EventTarget | null) => {
      for (const d of wszystkie()) {
        if (!(poza instanceof Node) || !d.contains(poza)) (d as HTMLDetailsElement).open = false;
      }
    };
    const wskaznik = (e: PointerEvent) => zamknij(e.target);
    const klawisz = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      zamknij();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    document.addEventListener('pointerdown', wskaznik);
    document.addEventListener('keydown', klawisz);
    return () => {
      document.removeEventListener('pointerdown', wskaznik);
      document.removeEventListener('keydown', klawisz);
    };
  }, []);

  useEffect(() => {
    for (const d of korzen.current?.querySelectorAll('details[open]') ?? []) {
      (d as HTMLDetailsElement).open = false;
    }
  }, [sciezka]);

  return (
    <nav ref={korzen} aria-label="Menu serwisu" className="ml-auto flex min-w-0 items-center text-[13px] sm:gap-1 sm:text-sm">
      {/* Na telefonie caly spis siedzi w jednym panelu — cztery pozycje obok
          siebie zajmowaly 279 z 286 px i nie bylo gdzie dolozyc nastepnych. */}
      <div className="hidden items-center sm:flex sm:gap-1">
        {MENU.map((g) =>
          g.pozycje ? (
            <details key={g.etykieta} className="relative">
              <summary className={SUMMARY}>
                {g.etykieta}
                <Strzalka />
              </summary>
              <div className="absolute right-0 z-50 mt-1 w-72 rounded-2xl border border-kreska bg-papier-2 p-2 shadow-karta-2">
                {g.pozycje.map((p) => (
                  <PozycjaPanelu key={`${g.etykieta}${p.adres}`} pozycja={p} />
                ))}
              </div>
            </details>
          ) : (
            <Link
              key={g.etykieta}
              href={g.adres ?? '/'}
              className="rounded-lg px-1 py-2 text-atrament-2 transition-colors hover:bg-papier-3 hover:text-atrament sm:px-3"
            >
              {g.etykieta}
            </Link>
          ),
        )}
      </div>

      <Link
        href="/szukaj"
        aria-label="Szukaj"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-atrament-2 transition-colors hover:bg-papier-3 hover:text-atrament"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </Link>

      <PrzelacznikMotywu />

      <details className="sm:hidden">
        <summary className={`${SUMMARY} h-9 w-9 justify-center`} aria-label="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </summary>
        {/* Panel na calej szerokosci ekranu, nie przy krawedzi przycisku:
            przy 390 px kazde inne ustawienie wychodzi poza ekran. */}
        <div className="absolute inset-x-0 top-full z-50 max-h-[80dvh] overflow-y-auto border-y border-kreska bg-papier-2 p-3 shadow-karta-2">
          {/* Grupa jednoelementowa nie dostaje naglowka: „GMINY / Gminy” to
              ta sama nazwa dwa razy pod rzad. */}
          {MENU.map((g) => (
            <div key={g.etykieta} className="mb-2">
              {g.pozycje ? (
                <>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider text-atrament-3 uppercase">
                    {g.etykieta}
                  </p>
                  {g.pozycje.map((p) => <PozycjaPanelu key={`${g.etykieta}${p.adres}`} pozycja={p} />)}
                </>
              ) : (
                <PozycjaPanelu pozycja={{ adres: g.adres ?? '/', etykieta: g.etykieta, opis: g.opis ?? '' }} />
              )}
            </div>
          ))}
          <div className="mt-1 border-t border-kreska pt-2">
            {NA_DOLE_PANELU.map((p) => (
              <PozycjaPanelu key={p.adres} pozycja={p} />
            ))}
          </div>
        </div>
      </details>
    </nav>
  );
}

function PozycjaPanelu({ pozycja }: { pozycja: Pozycja }) {
  return (
    <Link href={pozycja.adres} className="block rounded-xl px-3 py-2 transition-colors hover:bg-papier-3">
      <span className="block text-sm font-medium">{pozycja.etykieta}</span>
      {pozycja.opis ? <span className="block text-xs text-atrament-3">{pozycja.opis}</span> : null}
    </Link>
  );
}

function Strzalka() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
