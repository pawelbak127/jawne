import type { NextConfig } from 'next';

// Build produkcyjny bez publicznego adresu daje podglady linkow wskazujace
// na localhost. Next ostrzega o tym znakiem ⚠ gdzies w srodku logu — latwo
// przeoczyc (przeoczylismy), wiec mowimy to sami, na poczatku i po polsku.
if (
  process.env.NODE_ENV === 'production'
  && !process.env.JAWNE_ADRES_SERWISU
  && !process.env.VERCEL_URL
  && !process.env.VERCEL_PROJECT_PRODUCTION_URL
) {
  console.warn(
    '\n[jawne] UWAGA: brak JAWNE_ADRES_SERWISU. Obrazki podgladu linkow beda wskazywac na http://localhost:3000.\n'
    + '        Przed wdrozeniem ustaw np. JAWNE_ADRES_SERWISU=https://twoja-domena.pl\n',
  );
}

const nextConfig: NextConfig = {};

export default nextConfig;
