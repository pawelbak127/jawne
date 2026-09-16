import Link from 'next/link';

export default function NieZnaleziono() {
  return (
    <div className="obszar py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="szryft text-6xl font-semibold text-atrament-3">404</p>
        <h1 className="szryft mt-4 text-2xl font-semibold">Nie ma tu takiej strony</h1>
        <p className="mt-3 text-atrament-2">
          Adres mógł się zmienić albo w rejestrze nie ma tego, czego szukasz.
          Adresy posłów nadajemy raz i ich nie zmieniamy, więc stary link
          powinien działać — jeśli nie działa, to jest nasz błąd.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/poslowie" className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament">
            Posłowie
          </Link>
          <Link href="/glosowania" className="rounded-xl border border-kreska-2 px-4 py-2 transition-colors hover:border-atrament">
            Głosowania
          </Link>
          <Link href="/" className="rounded-xl bg-atrament px-4 py-2 text-papier transition-opacity hover:opacity-90">
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}
