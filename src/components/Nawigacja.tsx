'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Wyglad } from '@/components/Wyglad';

type Pozycja = { adres: string; etykieta: string; opis: string; skrot?: string };
type Grupa = { etykieta: string; pozycje: Pozycja[] };

/**
 * Naglowek serwisu: nazwa, szukanie, menu i przelacznik „Wyglad”.
 *
 * Na komputerze jeden pasek: „Sejm”, „Pieniadze publiczne” (rozwijane po
 * najechaniu, fokusie albo dotknieciu), „Mapa”, „O danych”. To wybor z audytu
 * z 05.11.2026 i ODWROTNOSC F12 (docs/przebudowa/runda-2.md): badania NN/g
 * mowia o ponad 20% gorszym znajdowaniu i 39% wolniej przy schowanym menu na
 * komputerze — ten koszt jest swiadomy, patrz docs/przebudowa/audyt-2026-11.md.
 *
 * Na telefonie zostaje F12: szukanie i skroty obu grup na wierzchu, a pelna
 * lista z opisami pod „Menu”. Panele to `<details>` — dzialaja bez JavaScriptu;
 * skrypt doklada tylko zamykanie (Escape, klikniecie obok, zmiana strony).
 *
 * Na stronie glownej pole w naglowku i skroty znikaja: jest tam glowna
 * wyszukiwarka z filtrami i trzy karty, ktore prowadza do tych samych miejsc.
 */
export const MENU: Grupa[] = [
  {
    etykieta: 'Sejm',
    pozycje: [
      { adres: '/poslowie', etykieta: 'Posłowie', opis: 'kto jak głosuje i czy zgodnie z klubem' },
      { adres: '/glosowania', etykieta: 'Głosowania', opis: 'każdy głos imienny, z rejestru Sejmu' },
      { adres: '/ustawy', etykieta: 'Ustawy', opis: 'co się stało z projektem, etap po etapie' },
      { adres: '/komisje', etykieta: 'Komisje', opis: 'czym się zajmują i kto w nich zasiada' },
      { adres: '/okregi', etykieta: 'Okręgi', opis: 'gminy okręgu i posłowie z niego' },
      { adres: '/sala', etykieta: 'Sala', opis: 'kto gdzie siedzi, z planu Kancelarii' },
    ],
  },
  {
    etykieta: 'Pieniądze publiczne',
    pozycje: [
      { adres: '/gminy', etykieta: 'Gminy', opis: 'budżet, fundusze UE, pomoc dla firm' },
      { adres: '/pomoc-publiczna', etykieta: 'Pomoc publiczna', skrot: 'Pomoc', opis: 'dotacje i ulgi dla firm (UOKiK)' },
      { adres: '/firmy', etykieta: 'Firmy', opis: 'czy firma dostała pomoc — szukaj po nazwie albo NIP' },
      { adres: '/wynagrodzenia-zarzadow', etykieta: 'Zarządy spółek', opis: 'imiennie: ile zarabiają zarządy spółek Skarbu Państwa' },
      { adres: '/mapa', etykieta: 'Mapa', opis: 'cała Polska, zawsze na mieszkańca' },
    ],
  },
];

/** Skroty na telefonie: najczestsze wejscia obu grup, reszta pod „Menu”. */
export const SKROTY_SEJM = ['/poslowie', '/glosowania', '/ustawy'];
export const SKROTY_PIENIADZE = ['/gminy', '/pomoc-publiczna', '/firmy'];

/** Grupy rozwijane na komputerze; Mapa stoi w pasku osobno, wiec jej tu nie ma. */
export const ROZWIJANE: Grupa[] = MENU.map((g) => ({ ...g, pozycje: g.pozycje.filter((p) => p.adres !== '/mapa') }));
export const LINKI_PASKA: Pozycja[] = [
  { adres: '/mapa', etykieta: 'Mapa', opis: 'cała Polska, zawsze na mieszkańca' },
  { adres: '/o-serwisie', etykieta: 'O danych', opis: 'skąd pochodzą liczby' },
];

const NA_DOLE_PANELU: Pozycja[] = [
  { adres: '/stan', etykieta: 'Stan danych', opis: 'co i kiedy pobraliśmy' },
  { adres: '/o-serwisie', etykieta: 'O serwisie', opis: 'skąd pochodzą liczby' },
];

function biezaca(sciezka: string, adres: string): boolean {
  return sciezka === adres || sciezka.startsWith(`${adres}/`);
}

/**
 * Grupa rozwijana w pasku. Stan trzyma komponent, a CSS z `:root:not([data-js])`
 * otwiera ja po najechaniu i fokusie, gdy skrypt nie dziala. Dlatego Escape
 * zamyka panel takze wtedy, gdy wskaznik wciaz nad nim stoi (WCAG 1.4.13).
 */
function MenuRozwijane({ grupa, sciezka }: { grupa: Grupa; sciezka: string }) {
  const [otwarte, ustawOtwarte] = useState(false);
  const korzen = useRef<HTMLDivElement>(null);
  const przycisk = useRef<HTMLButtonElement>(null);
  const nadMenu = useRef(false);
  const dotyk = useRef(false);
  const pomijFokus = useRef(false);
  const id = useId();

  useEffect(() => {
    if (!otwarte) return;
    const obok = (e: PointerEvent) => {
      if (!korzen.current?.contains(e.target as Node)) ustawOtwarte(false);
    };
    document.addEventListener('pointerdown', obok);
    return () => document.removeEventListener('pointerdown', obok);
  }, [otwarte]);

  return (
    <div
      ref={korzen}
      className="rozwijane"
      data-otwarte={otwarte ? '' : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        nadMenu.current = true;
        ustawOtwarte(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        nadMenu.current = false;
        // Fokus z klawiatury trzyma panel: to on tam teraz pracuje.
        if (!korzen.current?.querySelector(':focus-visible')) ustawOtwarte(false);
      }}
      onFocus={(e) => {
        if (pomijFokus.current) pomijFokus.current = false;
        else if (e.target.matches(':focus-visible')) ustawOtwarte(true);
      }}
      onBlur={(e) => {
        if (!nadMenu.current && !korzen.current?.contains(e.relatedTarget)) ustawOtwarte(false);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !otwarte) return;
        ustawOtwarte(false);
        pomijFokus.current = true;
        przycisk.current?.focus();
      }}
    >
      <button
        ref={przycisk}
        type="button"
        aria-expanded={otwarte}
        aria-controls={id}
        data-biezaca={grupa.pozycje.some((p) => biezaca(sciezka, p.adres)) ? '' : undefined}
        onPointerDown={(e) => { dotyk.current = e.pointerType !== 'mouse'; }}
        onClick={(e) => {
          // Mysz otworzyla panel najechaniem i nie ma go czym zamykac kliknieciem
          // w tym samym miejscu. Dotyk i klawiatura (detail 0) przelaczaja.
          if (e.detail === 0 || dotyk.current) ustawOtwarte((o) => !o);
        }}
      >
        {grupa.etykieta}
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M1 3.5 6 9l5-5.5Z" fill="currentColor" /></svg>
      </button>
      <ul id={id} className="rozwijane-panel" onClick={() => ustawOtwarte(false)}>
        {grupa.pozycje.map((p) => (
          <li key={p.adres}>
            <Link href={p.adres} aria-current={biezaca(sciezka, p.adres) ? 'page' : undefined}>
              {p.etykieta}
              <span>{p.opis}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Nawigacja() {
  const korzen = useRef<HTMLElement>(null);
  const sciezka = usePathname() ?? '/';
  const glowna = sciezka === '/';

  // Zamykanie paneli. Samo `<details>` nie zamyka sie ani po kliknieciu obok,
  // ani po przejsciu na inna strone (nawigacja Next nie przeladowuje dokumentu).
  useEffect(() => {
    const zamknij = (poza?: EventTarget | null) => {
      for (const d of korzen.current?.querySelectorAll('details[open]') ?? []) {
        if (!(poza instanceof Node) || !d.contains(poza)) (d as HTMLDetailsElement).open = false;
      }
    };
    const wskaznik = (e: PointerEvent) => zamknij(e.target);
    const klawisz = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      zamknij();
      // Menu rozwijane samo oddaje fokus swojemu przyciskowi. Tu stopPropagation
      // nie pomoze: Next podpina Reacta pod `document`, czyli pod ten sam wezel.
      if (e.target instanceof Element && e.target.closest('.rozwijane')) return;
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

  const wszystkie = MENU.flatMap((g) => g.pozycje);
  const skrot = (adres: string) => wszystkie.find((p) => p.adres === adres)!;

  return (
    <header ref={korzen} className="naglowek">
      <div className={`obszar gora relative${glowna ? ' bez-szukania' : ''}`}>
        <Link href="/" className="marka">
          <b>zrejestru</b>
        </Link>

        {glowna ? null : (
          <form action="/szukaj" method="get" role="search" className="szukaj-naglowek">
            <label htmlFor="szukaj-naglowek" className="sr-only">Szukaj w serwisie</label>
            <input id="szukaj-naglowek" name="q" type="search" className="pole" placeholder="Szukaj: gmina, poseł, firma, NIP, nr druku" />
          </form>
        )}

        <Wyglad />

        <div className="tylko-tel">
          <details className="panel">
            <summary className="przycisk-naglowka">Menu</summary>
            <nav aria-label="Menu serwisu" className="panel-tresc">
              {MENU.map((g) => (
                <div key={g.etykieta}>
                  <p className="podpis">{g.etykieta}</p>
                  {g.pozycje.map((p) => (
                    <Link key={p.adres} href={p.adres} aria-current={biezaca(sciezka, p.adres) ? 'page' : undefined}>
                      {p.etykieta}
                      <span>{p.opis}</span>
                    </Link>
                  ))}
                </div>
              ))}
              <p className="podpis">Serwis</p>
              {NA_DOLE_PANELU.map((p) => (
                <Link key={p.adres} href={p.adres}>
                  {p.etykieta}
                  <span>{p.opis}</span>
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>

      {/* Komputer: jeden pasek, opisy dzialow w panelach. */}
      <nav aria-label="Działy serwisu" className="menu-grupy">
        <div className="obszar rzad">
          {ROZWIJANE.map((g) => <MenuRozwijane key={g.etykieta} grupa={g} sciezka={sciezka} />)}
          {LINKI_PASKA.map((p) => (
            <Link key={p.adres} href={p.adres} className="link-paska" aria-current={biezaca(sciezka, p.adres) ? 'page' : undefined}>
              {p.etykieta}
            </Link>
          ))}
        </div>
      </nav>

      {/* Telefon: szukanie i skroty na wierzchu (F12), poza strona glowna. */}
      {glowna ? null : (
        <div className="tel">
          <div className="obszar">
            <form action="/szukaj" method="get" role="search">
              <label htmlFor="szukaj-tel" className="sr-only">Szukaj w serwisie</label>
              <input id="szukaj-tel" name="q" type="search" className="pole" placeholder="Szukaj: gmina, poseł, firma, NIP" />
            </form>
            <nav aria-label="Najczęstsze działy" className="skroty">
              {SKROTY_SEJM.map((a) => (
                <Link key={a} href={a} aria-current={biezaca(sciezka, a) ? 'page' : undefined}>{skrot(a).skrot ?? skrot(a).etykieta}</Link>
              ))}
              <span className="kreska" aria-hidden="true" />
              {SKROTY_PIENIADZE.map((a) => (
                <Link key={a} href={a} aria-current={biezaca(sciezka, a) ? 'page' : undefined}>{skrot(a).skrot ?? skrot(a).etykieta}</Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
