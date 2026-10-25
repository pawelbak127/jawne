import Link from 'next/link';
import type { OrganyPomocy } from '@/lib/dane';
import { KATEGORIE, OPIS_KATEGORII } from '@/lib/formy-pomocy';
import { liczba, zlote, zOdmiana } from '@/lib/format';

/*
 * Organy, ktore przyznaly pomoc firmom z gminy — na stronie gminy (piec
 * pierwszych) i na /gmina/[teryt]/organy (wszystkie).
 *
 * PRZEGLAD TRESCI 24.10.2026: strona Krakowa wazyla 2 MB HTML-u, bo lista
 * „Kto przyznal pomoc” miala 786 organow, a pod kazda kategoria kazdego organu
 * stalo to samo zdanie objasniajace — 1 162 razy. Teraz objasnienie stoi RAZ
 * (legenda nad lista, tylko kategorie, ktore wystepuja), a pelna lista ma
 * wlasna strone zamiast ukrytego w HTML-u „Pokaz wszystkie”.
 */

/** Kategorie, ktore wystepuja na liscie — w stalej kolejnosci z KATEGORIE. */
function kategorieListy(organy: OrganyPomocy['organy']) {
  const sa = new Set(organy.flatMap((o) => [...o.kategorie, ...(o.pozaGmina?.kategorie ?? [])].map((k) => k.kategoria)));
  return KATEGORIE.filter((k) => sa.has(k));
}

export function LegendaKategorii({ organy }: { organy: OrganyPomocy['organy'] }) {
  const kategorie = kategorieListy(organy);
  if (!kategorie.length) return null;
  return (
    <dl className="mt-3 max-w-(--miara) space-y-1.5 text-sm leading-relaxed text-atrament-2">
      {kategorie.map((k) => (
        <div key={k}>
          <dt className="inline font-medium text-atrament">{`${OPIS_KATEGORII[k].etykieta}: `}</dt>
          <dd className="inline">{OPIS_KATEGORII[k].wyjasnienie}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListaOrganow({ organy }: { organy: OrganyPomocy['organy'] }) {
  return (
    <ul className="mt-4">
      {organy.map((o) => (
        <li
          key={o.nip}
          className={`py-4 ${o.wlasny ? 'border-t-4 border-akcent' : 'border-t border-kreska'}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            {/* Nazwa byla do 02.10.2026 zwyklym tekstem, czyli slepa uliczka:
                „a co ten organ robi w innych gminach" to pierwsze pytanie,
                jakie sie ciśnie. Teraz prowadzi na strone organu.
                py-1 daje cel 30 px zamiast 22 (cel ponizej 24 px jest dla
                czesci czytelnikow nietrafialny). */}
            <Link
              href={`/organ/${o.nip}`}
              className="py-1 leading-snug font-medium text-akcent underline underline-offset-4 hover:no-underline"
            >
              {o.nazwa}
            </Link>
            {o.wlasny ? (
              <p className="shrink-0 text-xs font-medium text-akcent">organ tej gminy</p>
            ) : null}
          </div>
          <p className="liczby mt-1 text-sm text-atrament-2">
            {o.przypadkow
              ? zOdmiana(o.przypadkow, 'decyzja', 'decyzje', 'decyzji')
              : 'Żadnej decyzji dla firm z tej gminy w tych dniach.'}
          </p>
          {o.kategorie.length ? (
            <ul className="mt-2 space-y-1">
              {o.kategorie.map((k) => (
                <li key={k.kategoria} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                  <span>{OPIS_KATEGORII[k.kategoria].etykieta}</span>
                  <span className="liczby">
                    {`${zOdmiana(k.przypadkow, 'decyzja', 'decyzje', 'decyzji')} · ${k.brutto === null ? 'bez kwoty w rejestrze' : zlote(k.brutto)}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {/* Firmy SPOZA gminy — sekcja wyzej liczy tylko te z siedziba tutaj,
              a wojt zwalnia z podatku takze firme zarejestrowana obok. */}
          {o.pozaGmina ? (
            <div className="mt-3 border-t border-kreska pt-3">
              <p className="text-sm leading-relaxed text-atrament-2">
                {o.przypadkow ? 'Poza tym ' : 'Za to '}
                {o.pozaGmina.gmin === 1
                  ? `${zOdmiana(o.pozaGmina.przypadkow, 'decyzja', 'decyzje', 'decyzji')} dla ${o.pozaGmina.przypadkow === 1 ? 'firmy' : 'firm'} z siedzibą w innej gminie, w tych samych dniach. `
                  : `${zOdmiana(o.pozaGmina.przypadkow, 'decyzja', 'decyzje', 'decyzji')} dla firm z siedzibą w innych gminach (${liczba(o.pozaGmina.gmin)}), w tych samych dniach. `}
                {o.przypadkow ? 'Tych kwot nie ma w liczbach wyżej. ' : 'Tej kwoty nie ma w liczbach wyżej, bo liczą firmy z siedzibą tutaj. '}
                <Link href={`/organ/${o.nip}`} className="text-akcent underline underline-offset-4 hover:no-underline">{o.pozaGmina.gmin === 1 ? 'w której →' : 'w których →'}</Link>
              </p>
              <ul className="mt-2 space-y-1">
                {o.pozaGmina.kategorie.map((k) => (
                  <li key={k.kategoria} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                    <span>{OPIS_KATEGORII[k.kategoria].etykieta}</span>
                    <span className="liczby">
                      {`${zOdmiana(k.przypadkow, 'decyzja', 'decyzje', 'decyzji')} · ${k.brutto === null ? 'bez kwoty w rejestrze' : zlote(k.brutto)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function OrganyBezNazwy({ organy }: { organy: OrganyPomocy }) {
  if (!organy.bezNazwy) return null;
  return (
    <p className="mt-4 max-w-(--miara) text-sm leading-relaxed text-atrament-2">
      {`Do tego ${zOdmiana(organy.bezNazwy, 'organ', 'organy', 'organów')}, których nazw nie pokazujemy, bo rejestr wskazuje osoby fizyczne — razem ${zOdmiana(organy.przypadkowBezNazwy, 'decyzja', 'decyzje', 'decyzji')}. Liczby zostają, nazwiska nie.`}
    </p>
  );
}

/** Zdanie pod naglowkiem listy — ten sam zbior co liczby dzialu „Pomoc publiczna”. */
export function OpisOrganow({ pelna }: { pelna: boolean }) {
  return (
    <p className="wstep">
      Każda pomoc z rejestru ma organ, który ją przyznał — z liczbą decyzji i kwotą, osobno dla
      każdego rodzaju pomocy.{' '}
      {pelna
        ? 'Liczone z pełnej historii tej gminy w rejestrze — z tego samego zbioru, co pomoc publiczna na stronie gminy.'
        : 'Liczone z tych samych dni, co pomoc publiczna na stronie gminy, czyli z dni już ustalonych.'}
    </p>
  );
}
