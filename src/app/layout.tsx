import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { PrzelacznikMotywu } from '@/components/PrzelacznikMotywu';
import { ADRES_SERWISU } from '@/lib/adres';
import { trybBezFiltra } from '@/lib/prywatnosc';

// latin-ext jest OBOWIAZKOWE: szablon create-next-app ma tu samo "latin",
// przy ktorym "ą", "ę", "ł", "ń", "ś", "ź", "ż" lecą na font zastepczy
// i naglowek rozjezdza sie w polowie wyrazu.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  metadataBase: ADRES_SERWISU,
  title: {
    default: 'jawne — Sejm bez komentarza',
    template: '%s · jawne',
  },
  description:
    'Kto jak głosował, co się stało z ustawą i skąd to wiadomo. Każda liczba z odnośnikiem do oficjalnego rejestru Sejmu.',
  // Serwis przed premiera. Zdjac dopiero na wyrazne polecenie.
  robots: { index: false, follow: false },
};

// Strony bez parametrow (/, /poslowie, /stan, 499 stron poslow) Next renderuje
// RAZ, przy `next build`. ZMIERZONE 19.09.2026 w prerender-manifest.json:
// initialRevalidateSeconds: false — na serwerze nocny import zmienialby baze,
// a strona pokazywalaby stan z dnia budowania. Godzina wystarcza: dane
// zmieniaja sie raz na dobe, a strona wciaz nie pyta bazy przy kazdym wejsciu.
export const revalidate = 3600;

const NAWIGACJA: { adres: string; etykieta: string; krotka?: string }[] = [
  // „Gminy”, nie „Okręgi”: po to tu ludzie przychodzą. Spis gmin ma własną
  // trasę — lista okręgów wyborczych to zupełnie co innego i została pod
  // /okregi, z odnośnikiem ze spisu.
  { adres: '/gminy', etykieta: 'Gminy' },
  { adres: '/poslowie', etykieta: 'Posłowie' },
  { adres: '/glosowania', etykieta: 'Głosowania' },
  // Na telefonie "Pomoc" — pelna nazwa nie miesci sie obok trzech pozostalych.
  { adres: '/pomoc-publiczna', etykieta: 'Pomoc publiczna', krotka: 'Pomoc' },
];

const ZRODLA_STOPKI: [string, string][] = [
  ['https://api.sejm.gov.pl/sejm/openapi/', 'API Sejmu RP'],
  ['https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach', 'PKW — wybory 2023'],
  ['https://bdl.stat.gov.pl', 'GUS — Bank Danych Lokalnych'],
  ['https://dane.gov.pl/pl/dataset/13939', 'Listy projektów Funduszy Europejskich'],
  ['https://sudop.uokik.gov.pl', 'SUDOP — pomoc publiczna (UOKiK)'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Motyw ustawiamy PRZED pierwszym malowaniem. Inaczej strona mignie
          na bialo u kogos, kto wybral ciemny — to widac golym okiem.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('motyw');if(m)document.documentElement.dataset.motyw=m}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#tresc"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-akcent focus:px-4 focus:py-2 focus:text-papier"
        >
          Przejdź do treści
        </a>

        {/*
          Tryb lokalny bez filtra nazw jest widoczny na kazdej stronie — zrzut
          ekranu z niego nie moze uchodzic za wersje publiczna.
        */}
        {trybBezFiltra() ? (
          <div className="bg-akcent px-4 py-1.5 text-center text-xs font-medium text-papier">
            Tryb lokalny: nazwy beneficjentów nie są filtrowane. W buildzie produkcyjnym filtr wraca sam.
          </div>
        ) : null}

        <header className="sticky top-0 z-40 border-b border-kreska bg-papier/85 backdrop-blur-md">
          <div className="obszar flex h-16 items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-baseline gap-2 shrink-0">
              <span className="szryft text-2xl font-semibold tracking-tight">jawne</span>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-atrament-3 sm:inline">
                Sejm X kadencji
              </span>
            </Link>

            {/* Na 390 px cztery pozycje i przelacznik mieszcza sie tylko z krotkimi
                etykietami i mniejszymi odstepami. */}
            <nav className="ml-auto flex min-w-0 items-center text-[13px] sm:gap-1 sm:text-sm">
              {NAWIGACJA.map((p) => (
                <Link
                  key={p.adres}
                  href={p.adres}
                  className="rounded-lg px-1 py-2 text-atrament-2 transition-colors hover:bg-papier-3 hover:text-atrament sm:px-3"
                >
                  {p.krotka ? (
                    <>
                      <span className="sm:hidden">{p.krotka}</span>
                      <span className="hidden sm:inline">{p.etykieta}</span>
                    </>
                  ) : p.etykieta}
                </Link>
              ))}
              {/*
                Wejście do szukania na KAŻDEJ stronie — połowa serwisu (gminy,
                firmy) jest osiągalna praktycznie tylko wyszukiwarką, a ta żyła
                na trzech stronach z trzynastu. Na telefonie nagłówek jest
                wyregulowany na styk (zmierzone 22.09.2026: 279 z 286 px), więc
                ikona wchodzi dopiero od „sm” — na telefon potrzebne jest menu,
                a to osobna zmiana (U2 w docs/plan.md).
              */}
              <Link
                href="/szukaj"
                aria-label="Szukaj"
                className="ml-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-atrament-2 transition-colors hover:bg-papier-3 hover:text-atrament sm:grid"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </Link>
              <PrzelacznikMotywu />
            </nav>
          </div>
        </header>

        <main id="tresc" className="flex-1">
          {children}
        </main>

        <footer className="mt-24 border-t border-kreska bg-papier-2">
          <div className="obszar grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="szryft text-xl font-semibold">jawne</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-atrament-2">
                Niezależny serwis obywatelski. Agregujemy dane z oficjalnych rejestrów
                i zawsze pokazujemy, skąd pochodzi każda liczba. Nie oceniamy posłów
                i nie przypisujemy im motywów.
              </p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Dane</p>
              <ul className="mt-2 space-y-1.5 text-atrament-2">
                {ZRODLA_STOPKI.map(([adres, nazwa]) => (
                  <li key={adres}>
                    <a className="hover:text-akcent hover:underline" href={adres} target="_blank" rel="noreferrer">
                      {nazwa}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm">
              <p className="font-medium">Serwis</p>
              <ul className="mt-2 space-y-1.5 text-atrament-2">
                <li><Link className="hover:text-akcent hover:underline" href="/o-serwisie">O serwisie</Link></li>
                <li><Link className="hover:text-akcent hover:underline" href="/stan">Stan danych</Link></li>
              </ul>
            </div>
          </div>
          <div className="obszar border-t border-kreska py-5 text-xs text-atrament-3">
            Dane pochodzą z rejestrów publicznych. Serwis nie jest powiązany z Kancelarią
            Sejmu, z urzędami, których dane pokazuje, ani z żadnym klubem poselskim.
          </div>
        </footer>
      </body>
    </html>
  );
}
