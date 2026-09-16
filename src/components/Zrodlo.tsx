/**
 * Odnosnik do rejestru, z ktorego pochodzi stojaca obok liczba.
 *
 * To jest jedyna rzecz, ktorej nie ma konkurencja, i jedyny powod, dla ktorego
 * ktos ma uwierzyc serwisowi prowadzonemu przez jedna osobe. Dlatego jest
 * wszedzie — ale ma wygladac jak element interfejsu, a nie jak przypis
 * w pracy naukowej: szary, maly, wyrazny dopiero przy najechaniu.
 */
export function Zrodlo({
  adres,
  etykieta = 'rejestr',
  className = '',
}: {
  adres: string;
  etykieta?: string;
  className?: string;
}) {
  return (
    <a
      href={adres}
      target="_blank"
      rel="noreferrer"
      title={`Źródło: ${adres}`}
      className={`inline-flex items-center gap-1 text-[11px] text-atrament-3 transition-colors hover:text-akcent ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M10 14 21 3M21 3h-6M21 3v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" strokeLinecap="round" />
      </svg>
      {etykieta}
    </a>
  );
}

/**
 * Kafel z liczba.
 *
 * `mianownik` nie jest ozdoba: 60% ze stu glosowan to nie to samo, co 60%
 * z czterech tysiecy, a czytelnik nie ma skad wziac tej roznicy, jesli jej
 * nie napiszemy.
 */
export function Kafel({
  wartosc,
  etykieta,
  mianownik,
  zrodlo,
}: {
  wartosc: string;
  etykieta: string;
  mianownik?: string;
  zrodlo?: string;
}) {
  return (
    <div className="rounded-xl border border-kreska bg-papier-2 p-5 shadow-karta">
      <p className="liczby szryft text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
        {wartosc}
      </p>
      <p className="mt-2 text-sm font-medium">{etykieta}</p>
      {mianownik ? <p className="mt-0.5 text-xs text-atrament-2">{mianownik}</p> : null}
      {zrodlo ? <Zrodlo adres={zrodlo} className="mt-3" /> : null}
    </div>
  );
}
