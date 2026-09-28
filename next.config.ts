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

const nextConfig: NextConfig = {
  /*
   * Katalog wyniku budowy. Domyslnie `.next`, ale wdrozenie buduje do katalogu
   * OBOK i podmienia go dopiero po udanej budowie (`deploy/instaluj.sh`).
   * Powod jest zmierzony dwoma awariami: `next build` pisze po `.next`
   * w miejscu, wiec nieudana budowa psuje katalog DZIALAJACEJ strony —
   * 27 i 28.09.2026 serwis lezal przez to dobe, z bledem
   * `ENOENT .next/prerender-manifest.json` przy kazdej probie startu.
   */
  distDir: process.env.JAWNE_KATALOG_BUDOWY?.trim() || '.next',
  /*
   * ZMIERZONE 27.09.2026 na serwerze: `next build` przewrocil sie na
   * „took more than 60 seconds" dla `/`, `/okregi`, `/pomoc-publiczna`
   * i stron poslow. Powod nie jest w Next, tylko w danych: `/pomoc-publiczna`
   * robi OSIEM osobnych przebiegow po calej tabeli pomocy publicznej
   * (razem, trzy grupowania, wielkosc firm, wojewodztwa, najwieksze).
   * Na 168 tys. wierszy jeden taki przebieg trwa 1,6 s; na serwerze jest ich
   * juz 2,5 mln, czyli okolo 24 s na przebieg i ponad trzy minuty na strone.
   * Do tego maszyna jest mala i budowala strone w trakcie pobierania SUDOP.
   *
   * Podniesienie limitu to LEK NA OBJAW, nie na przyczyne: przy pelnej
   * historii (ok. 30 mln wierszy) ta strona bedzie liczyc sie kwadransami.
   * Prawdziwe rozwiazanie to policzenie przegladu RAZ, przy imporcie,
   * i czytanie gotowych liczb — patrz docs/plan.md, „przejscie na agregaty".
   */
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
