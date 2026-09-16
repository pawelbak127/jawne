/**
 * Publiczny adres serwisu — potrzebny do bezwzglednych adresow obrazkow
 * podgladu linku (og:image).
 *
 * Bez niego Next wpisuje w og:image "http://localhost:3000/...", a build
 * tylko ostrzega (znakiem ⚠, nie slowem "warning" — wczesniejszy grep po
 * logu go przeoczyl). Na produkcji kazdy wyslany link mialby wtedy
 * zepsuty podglad, czyli dokladnie ta funkcja, dla ktorej robimy obrazki.
 *
 * Domena nie jest jeszcze kupiona, wiec wartosc przychodzi ze zmiennej
 * srodowiskowej. Na Vercelu wystarczy jego wlasna VERCEL_URL.
 */
export const ADRES_SERWISU = new URL(
  process.env.JAWNE_ADRES_SERWISU
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? 'http://localhost:3000',
);

export const ADRES_JEST_LOKALNY = ADRES_SERWISU.hostname === 'localhost';
