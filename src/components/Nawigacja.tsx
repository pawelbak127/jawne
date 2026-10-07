'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Wyglad } from '@/components/Wyglad';

type Pozycja = { adres: string; etykieta: string; opis: string; skrot?: string };
type Grupa = { etykieta: string; pozycje: Pozycja[] };

/**
 * Naglowek serwisu: nazwa, szukanie, menu i przelacznik „Wyglad”.
 *
 * Menu WIDOCZNE, nie rozwijane (F12, docs/przebudowa/runda-2.md; badania-ux.md
 * §6: schowana nawigacja to o ponad 20% gorsze znajdowanie i o 39% wolniej
 * na komputerze). Do 07.10.2026 obie grupy byly listami rozwijanymi „Sejm”
 * i „Pieniadze”, czyli w praktyce menu schowanym.
 *
 * Na telefonie szukanie i skroty obu grup sa na wierzchu, a pelna lista
 * z opisami pod „Menu”. Panele to `<details>` — dzialaja bez JavaScriptu;
 * skrypt doklada tylko zamykanie (Escape, klikniecie obok, zmiana strony).
 */
const MENU: Grupa[] = [
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
      { adres: '/szukaj', etykieta: 'Firmy', opis: 'czy firma dostała pomoc — szukaj po nazwie albo NIP' },
      { adres: '/mapa', etykieta: 'Mapa', opis: 'cała Polska, zawsze na mieszkańca' },
    ],
  },
];

/** Skroty na telefonie: najczestsze wejscia obu grup, reszta pod „Menu”. */
const SKROTY_SEJM = ['/poslowie', '/glosowania', '/ustawy'];
const SKROTY_PIENIADZE = ['/gminy', '/pomoc-publiczna', '/szukaj'];

const NA_DOLE_PANELU: Pozycja[] = [
  { adres: '/stan', etykieta: 'Stan danych', opis: 'co i kiedy pobraliśmy' },
  { adres: '/o-serwisie', etykieta: 'O serwisie', opis: 'skąd pochodzą liczby' },
];

function biezaca(sciezka: string, adres: string): boolean {
  return sciezka === adres || sciezka.startsWith(`${adres}/`);
}

export function Nawigacja() {
  const korzen = useRef<HTMLElement>(null);
  const sciezka = usePathname() ?? '/';

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
      <div className="obszar gora relative">
        <Link href="/" className="marka">
          <b>zrejestru</b>
          <span>Sejm i pieniądze publiczne — z rejestrów, liczba po liczbie</span>
        </Link>

        <form action="/szukaj" method="get" role="search" className="szukaj-naglowek">
          <label htmlFor="szukaj-naglowek" className="sr-only">Szukaj w serwisie</label>
          <input id="szukaj-naglowek" name="q" type="search" className="pole" placeholder="Szukaj: gmina, poseł, firma, NIP, nr druku" />
        </form>

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

      {/* Komputer: wszystkie dzialy w dwoch podpisanych grupach, bez rozwijania. */}
      <nav aria-label="Działy serwisu" className="menu-grupy">
        <div className="obszar rzad">
          {MENU.map((g) => (
            <div key={g.etykieta} className="grupa">
              <span className="podpis">{g.etykieta}</span>
              {g.pozycje.map((p) => (
                <Link key={p.adres} href={p.adres} aria-current={biezaca(sciezka, p.adres) ? 'page' : undefined}>
                  {p.etykieta}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Telefon: szukanie i skroty na wierzchu (F12). */}
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
    </header>
  );
}
