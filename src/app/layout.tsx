import type { Metadata } from 'next';
import { Brygada_1918, IBM_Plex_Mono, IBM_Plex_Sans, Public_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Nawigacja } from '@/components/Nawigacja';
import { ADRES_SERWISU } from '@/lib/adres';
import { INDEKSOWANIE_WLACZONE } from '@/lib/premiera';
import { trybBezFiltra } from '@/lib/prywatnosc';

// latin-ext jest OBOWIAZKOWE: przy samym "latin" litery „ą", „ę", „ł", „ń",
// „ś", „ź", „ż" leca na font zastepczy i naglowek rozjezdza sie w polowie
// wyrazu (pulapka 6).
//
// Kroje dwoch wersji wygladu (docs/przebudowa/kierunek.md). Wstepnie ladowany
// TYLKO Public Sans — pierwszy ekran Standardowego. Reszta ma `preload: false`:
// przegladarka pobiera krój dopiero, gdy cos jest nim napisane, wiec czytelnik
// Standardowego na telefonie nie sciaga Wypisu ani pisma maszynowego.
const publicSans = Public_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--font-public',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--font-plex',
  display: 'swap',
  preload: false,
});

const brygada = Brygada_1918({
  subsets: ['latin', 'latin-ext'],
  weight: ['600'],
  variable: '--font-brygada',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: ADRES_SERWISU,
  title: {
    // Nazwa w naglowku i tytule: „zrejestru” (decyzja Pawla, 04.10.2026,
    // docs/przebudowa/decyzje.md). „jawne” zostaje w kodzie i repozytorium.
    default: 'zrejestru — Sejm i pieniądze publiczne z rejestrów',
    template: '%s · zrejestru',
  },
  // Opis obiecuje dokladnie to, co serwis ma. Do 23.09.2026 mowil
  // o „co sie stalo z ustawa", czego wtedy nie bylo, i milczal o pieniadzach
  // w gminach, ktore byly polowa serwisu.
  description:
    'Kto jak głosował, co się stało z ustawą i ile publicznych pieniędzy trafiło do Twojej gminy. Każda liczba z odnośnikiem do rejestru, z którego pochodzi.',
  // Serwis przed premiera. Rozstrzyga JEDNA zmienna, wspolna z /robots.txt —
  // patrz src/lib/premiera.ts. Dwa osobne miejsca moglyby sie rozjechac.
  ...(INDEKSOWANIE_WLACZONE ? {} : { robots: { index: false, follow: false } as const }),
};

// Strony bez parametrow (/, /poslowie, /stan, 499 stron poslow) Next renderuje
// RAZ, przy `next build`. ZMIERZONE 19.09.2026 w prerender-manifest.json:
// initialRevalidateSeconds: false — na serwerze nocny import zmienialby baze,
// a strona pokazywalaby stan z dnia budowania. Godzina wystarcza: dane
// zmieniaja sie raz na dobe, a strona wciaz nie pyta bazy przy kazdym wejsciu.
export const revalidate = 3600;

const ZRODLA_STOPKI: [string, string][] = [
  ['https://api.sejm.gov.pl/sejm/openapi/', 'API Sejmu RP'],
  ['https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach', 'PKW — wybory 2023'],
  ['https://bdl.stat.gov.pl', 'GUS — Bank Danych Lokalnych'],
  ['https://dane.gov.pl/pl/dataset/13939', 'Listy projektów Funduszy Europejskich'],
  ['https://sudop.uokik.gov.pl', 'SUDOP — pomoc publiczna (UOKiK)'],
  ['https://ted.europa.eu', 'TED — zamówienia publiczne UE'],
  ['https://api.stat.gov.pl/Home/RegonApi', 'REGON — rejestr podmiotów (GUS)'],
  ['https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/', 'PRG — granice gmin (GUGiK)'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pl"
      className={`${publicSans.variable} ${plexMono.variable} ${plexSans.variable} ${brygada.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Styl i jasnosc ustawiamy PRZED pierwszym malowaniem — inaczej strona
          mignie na bialo albo w drugim stylu u kogos, kto wybral inaczej.
          Z localStorage, nie z ciasteczka: odczyt ciasteczka w layoucie
          zrobilby z kazdej strony trase dynamiczna (pulapki 39 i 52).
          `data-js` odslania przelacznik „Wyglad”, ktory bez skryptu nie dziala.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;d.dataset.js='';try{var m=localStorage.getItem('motyw');if(m==='jasny'||m==='ciemny')d.dataset.motyw=m;if(localStorage.getItem('styl')==='a')d.dataset.styl='a'}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#tresc"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-akcent focus:px-4 focus:py-2 focus:text-papier"
        >
          Przejdź do treści
        </a>

        {/*
          Tryb lokalny bez filtra nazw jest widoczny na kazdej stronie — zrzut
          ekranu z niego nie moze uchodzic za wersje publiczna.
        */}
        {trybBezFiltra() ? (
          <div className="bg-akcent px-4 py-1.5 text-center text-sm font-medium text-papier">
            Tryb lokalny: nazwy beneficjentów nie są filtrowane. W buildzie produkcyjnym filtr wraca sam.
          </div>
        ) : null}

        <Nawigacja />

        <main id="tresc" className="flex-1">
          {children}
        </main>

        <footer className="stopka">
          <div className="obszar">
            <div className="kolumny">
              <div>
                <b>zrejestru.pl</b>
                <p>
                  Niezależny serwis obywatelski. Dane z oficjalnych rejestrów, przy każdej
                  liczbie jej źródło. Nie oceniamy posłów i nie przypisujemy im motywów.
                </p>
              </div>
              <div>
                <b>Skąd są dane</b>
                <ul>
                  {ZRODLA_STOPKI.map(([adres, nazwa]) => (
                    <li key={adres}>
                      <a href={adres} target="_blank" rel="noreferrer">{nazwa}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <b>Serwis</b>
                <ul>
                  <li><Link href="/o-serwisie">O serwisie i metodzie</Link></li>
                  <li><Link href="/stan">Stan danych</Link></li>
                  <li><Link href="/prywatnosc">Polityka prywatności</Link></li>
                  {/*
                    Kontakt prowadzi do strony, a nie do `mailto:` (07.10.2026):
                    skrzynka nie odbiera poczty, a odnosnik z kazdej strony do
                    adresu, ktory nie dziala, obiecuje kanal, ktorego nie ma.
                    Sekcja polityki mowi, jak sie z nami skontaktowac i czy adres
                    do sprzeciwu dziala (zasada 7).
                  */}
                  <li><Link href="/prywatnosc#kontakt">Kontakt i sprzeciw</Link></li>
                </ul>
              </div>
            </div>
            <p className="uwaga-koncowa">
              Dane pochodzą z rejestrów publicznych. Serwis nie jest powiązany z Kancelarią
              Sejmu, z urzędami, których dane pokazuje, ani z żadnym klubem poselskim.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
