import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Szablon stron szczegolowych — wspolny dla gminy, posla, firmy i reszty.
 *
 * Wzor: docs/przebudowa/prototyp/ (dwie wersje wygladu, decyzja Pawla
 * z 07.10.2026), fundament F1–F14 w docs/przebudowa/runda-2.md. Klasy
 * i reguly obu wersji sa w globals.css („Szablon stron szczegolowych”);
 * tu jest tylko struktura, wiec ta sama strona dziala w obu stylach.
 *
 * Komponenty serwerowe, bez JavaScriptu w przegladarce (pulapka 54: ten sam
 * komponent na tysiacach stron).
 */

export type Ogniwo = { adres?: string; nazwa: string; srodek?: boolean };

/** Okruszek: na telefonie srodkowe ogniwa zwijaja sie w „…” (F13). */
export function Okruszek({ ogniwa }: { ogniwa: Ogniwo[] }) {
  const ostatnie = ogniwa.length - 1;
  return (
    <nav className="okruszek" aria-label="Jesteś tutaj">
      {ogniwa.map((o, i) => {
        if (i === ostatnie) return <span key={i} aria-current="page">{o.nazwa}</span>;
        const pierwszySrodkowy = o.srodek && !ogniwa[i - 1]?.srodek;
        return (
          <span key={i} className="contents">
            {pierwszySrodkowy ? <span className="wielokropek" aria-hidden="true">…<i>›</i></span> : null}
            <span className={o.srodek ? 'srodek' : undefined}>
              {o.adres ? <Link href={o.adres}>{o.nazwa}</Link> : o.nazwa}
              <i aria-hidden="true">›</i>
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Poczatek strony: nazwa, jedno zdanie opisu i jedno zdanie o serwisie.
 * To ostatnie jest na KAZDEJ stronie szczegolowej, bo ludzie trafiaja na nie
 * z wyszukiwarki i z mediow spolecznosciowych, z pominieciem strony glownej
 * (badania-ux.md §8, mySociety 2023).
 */
export function Wypis({ tytul, podtytul, children }: { tytul: string; podtytul?: ReactNode; children?: ReactNode }) {
  return (
    <header className="wypis">
      <h1>{tytul}</h1>
      {podtytul ? <p className="podtytul">{podtytul}</p> : null}
      {children}
      <p className="skad">
        <b>zrejestru.pl</b>
        {' — niezależny serwis obywatelski: dane z oficjalnych rejestrów, przy każdej liczbie jej źródło, bez ocen. '}
        <Link href="/o-serwisie">Jak to działa</Link>
      </p>
    </header>
  );
}

/** Odnosnik do rejestru: nazwa i data pobrania (zasada 1 — element interfejsu, nie przypis). */
export function Podstawa({ adres, nazwa, data }: { adres: string; nazwa: string; data?: string | null }) {
  const zewnetrzny = /^https?:/.test(adres);
  return (
    <a className="zrodlo" href={adres} {...(zewnetrzny ? { target: '_blank', rel: 'noreferrer' } : {})}>
      <span className="nazwa">{nazwa}</span>
      {data ? <span className="data">{data}</span> : null}
    </a>
  );
}

export function WLiczbach({ tytul, children, stopka }: { tytul: string; children: ReactNode; stopka?: ReactNode }) {
  return (
    <section className="w-liczbach" aria-labelledby="w-liczbach-t">
      <h2 id="w-liczbach-t">{tytul}</h2>
      <div className="wiersze">{children}</div>
      {stopka}
    </section>
  );
}

/**
 * Wiersz rejestru: etykieta · liczba · z czego (mianownik, zasada 3) ·
 * porownanie (F9) · zrodlo. `ile` = null pokazuje polpauze — brak wartosci,
 * nie zero (zasada 4).
 */
export function Wiersz({ co, ile, zCzego, porownanie, podstawa, duzy }: {
  co: ReactNode;
  ile: ReactNode | null;
  zCzego?: ReactNode;
  porownanie?: ReactNode;
  podstawa?: ReactNode;
  duzy?: boolean;
}) {
  return (
    <div className={duzy ? 'wiersz duzy' : 'wiersz'} data-odpowiedz="">
      <p className="co">{co}</p>
      <p className="ile">{ile ?? '—'}</p>
      {zCzego ? <p className="z-czego">{zCzego}</p> : null}
      {porownanie ? <p className="porownanie">{porownanie}</p> : null}
      {podstawa ? <p className="podstawa">{podstawa}</p> : null}
    </div>
  );
}

export function Wiersze({ children }: { children: ReactNode }) {
  return <div className="wiersze">{children}</div>;
}

/** Dzial strony: numer, naglowek od tresci (F7), na koncu zwiniete „Jak to liczymy”. */
export function Dzial({ id, nr, tytul, obok, metoda, children }: {
  id: string;
  nr: number;
  tytul: ReactNode;
  obok?: ReactNode;
  metoda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dzial" id={id} aria-labelledby={`${id}-t`}>
      <div className="nr" aria-hidden="true">{nr}</div>
      <div className="min-w-0">
        <div className="tytul">
          <h2 id={`${id}-t`}><span className="nr-tel">{`${nr}. `}</span>{tytul}</h2>
          {obok}
        </div>
        {children}
        {metoda ? (
          <details className="metoda">
            <summary>Jak to liczymy</summary>
            <div className="tresc">{metoda}</div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

export function Uwaga({ naglowek, children }: { naglowek: string; children: ReactNode }) {
  return (
    <p className="uwaga">
      <b>{naglowek}</b>
      {' '}
      {children}
    </p>
  );
}

/** Wykres paskowy: dlugosc na wspolnej osi i tytul-wniosek u gory (F11, Borkin 2016). */
export function ListaPaskow({ tytul, pozycje, podpis }: {
  tytul?: string;
  pozycje: { klucz: string; nazwa: ReactNode; opis: ReactNode; udzial: number; wciete?: boolean; blady?: boolean }[];
  podpis?: ReactNode;
}) {
  return (
    <>
      {tytul ? <h3 className="tytul-wykresu">{tytul}</h3> : null}
      <ul className="lista-paskow">
        {pozycje.map((p) => (
          <li key={p.klucz} style={p.wciete ? { paddingLeft: 18 } : undefined}>
            <div className="opis">
              <span className={p.wciete || p.blady ? 'text-atrament-2' : undefined}>{p.nazwa}</span>
              <span>{p.opis}</span>
            </div>
            <div className="pasek">
              <i style={{ width: `${Math.max(0.4, Math.min(100, 100 * p.udzial)).toFixed(2)}%`, opacity: p.wciete || p.blady ? 0.45 : undefined }} />
            </div>
          </li>
        ))}
      </ul>
      {podpis ? <p className="podpis-wykresu">{podpis}</p> : null}
    </>
  );
}

/**
 * „Pokaż wszystkie N ↓”: reszta listy zwinieta. Tresc jest w HTML-u (dziala
 * bez JavaScriptu i trafia do wyszukiwarki), a strona na telefonie nie ma
 * 50 tys. px. Ile pokazac od razu, decyduje strona — tu tylko zwijanie.
 */
export function Wiecej({ napis, children }: { napis: string; children: ReactNode }) {
  return (
    <details className="wiecej">
      <summary>{`${napis} ↓`}</summary>
      {children}
    </details>
  );
}
