import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  bazaDostepna, kluby, ostatnieGlosyPosla, posel, slugiPoslow, statystykiPosla,
} from '@/lib/dane';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { dataSlownie, liczba, procent, skroc, zOdmiana } from '@/lib/format';
import { BrakDanych } from '@/components/BrakDanych';
import { Portret } from '@/components/Portret';
import { Zrodlo } from '@/components/Zrodlo';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';

export function generateStaticParams() {
  if (!bazaDostepna()) return [];
  return slugiPoslow().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = bazaDostepna() ? posel(slug) : null;
  if (!p) return { title: 'Nie ma takiego posła' };
  return {
    title: p.imie_nazwisko,
    description: `${p.imie_nazwisko} — ${p.klub_id ?? 'bez klubu'}, okręg ${p.okreg_nazwa ?? '—'}. Jak głosował(a) w Sejmie X kadencji.`,
  };
}

const TONY: Record<string, string> = {
  za: 'bg-[#1b9e63] dark:bg-[#34b87c]',
  przeciw: 'bg-[#d2453f] dark:bg-[#e2635d]',
  wstrzymal: 'bg-[#e0a021] dark:bg-[#d9a52e]',
  brak: 'bg-kreska-2',
  inne: 'bg-atrament-3',
};

export default async function StronaPosla({ params }: { params: Promise<{ slug: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { slug } = await params;
  const p = posel(slug);
  if (!p) notFound();

  const staty = statystykiPosla(p.id);
  const ostatnie = ostatnieGlosyPosla(p.id, 10);
  const k = kluby().find((x) => x.id === p.klub_id);
  const adresRejestru = `https://www.sejm.gov.pl/sejm10.nsf/posel.xsp?id=${String(p.id).padStart(3, '0')}`;

  const nieobecnosci = staty.rozklad.find((r) => r.glos === 'ABSENT')?.ile ?? 0;
  const udzial = staty.mianownik > 0 ? ((staty.mianownik - nieobecnosci) / staty.mianownik) * 100 : null;

  return (
    <div className="obszar py-10">
      <Link href="/poslowie" className="text-sm text-atrament-2 hover:text-akcent">
        ← wszyscy posłowie
      </Link>

      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <Portret slug={p.slug} imieNazwisko={p.imie_nazwisko} maZdjecie={p.ma_zdjecie} rozmiar="duzy" />
        <div className="min-w-0 flex-1">
          <h1 className="szryft text-3xl leading-tight font-semibold sm:text-5xl">{p.imie_nazwisko}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {p.klub_id ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="miejsce-probka h-2.5 w-2.5 rounded-full"
                  style={{ '--b': k?.barwa ?? '#9a958c', '--bc': k?.barwaCiemna ?? '#8e8a95' } as React.CSSProperties}
                />
                {/* Kod rejestrowy jest krotki i rozpoznawalny; pelna nazwa
                    klubu miewa sto znakow, wiec idzie w podpowiedz i nizej. */}
                <span className="font-medium" title={k?.nazwa ?? undefined}>{p.klub_id}</span>
              </span>
            ) : (
              <span className="text-atrament-2">bez klubu</span>
            )}
            {p.okreg_nazwa ? (
              <span className="text-atrament-2">
                okręg {p.okreg_nr} · {p.okreg_nazwa}
              </span>
            ) : null}
            {p.aktywny === 0 ? (
              <span className="rounded-md bg-papier-3 px-2 py-0.5 text-xs text-atrament-2">mandat wygasł</span>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {p.glosow_w_wyborach ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Głosów w wyborach:</dt>
                <dd className="liczby font-medium">{liczba(p.glosow_w_wyborach)}</dd>
              </div>
            ) : null}
            {p.zawod ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Zawód:</dt>
                <dd className="font-medium">{p.zawod}</dd>
              </div>
            ) : null}
            {p.wyksztalcenie ? (
              <div className="flex gap-2">
                <dt className="text-atrament-2">Wykształcenie:</dt>
                <dd className="font-medium">{p.wyksztalcenie}</dd>
              </div>
            ) : null}
            {p.email ? (
              <div className="flex min-w-0 gap-2">
                <dt className="text-atrament-2">E-mail:</dt>
                <dd className="truncate font-medium">
                  <a href={`mailto:${p.email}`} className="hover:text-akcent hover:underline">{p.email}</a>
                </dd>
              </div>
            ) : null}
          </dl>

          {k?.nazwa ? (
            <p className="mt-2 text-sm text-atrament-3">{k.nazwa}</p>
          ) : null}

          <Zrodlo adres={adresRejestru} etykieta="strona posła w Sejmie" className="mt-4" />
        </div>
      </header>

      {/* Mandat wygasl — pokazujemy SUROWY powod z rejestru, bez interpretacji. */}
      {p.aktywny === 0 && p.przyczyna_wygasniecia ? (
        <p className="mt-6 rounded-xl border border-kreska bg-papier-3 px-4 py-3 text-sm text-atrament-2">
          Rejestr podaje przyczynę wygaśnięcia mandatu:{' '}
          <span className="font-medium text-atrament">{p.przyczyna_wygasniecia}</span>
          {p.data_wygasniecia ? ` (${dataSlownie(p.data_wygasniecia)})` : ''}.
        </p>
      ) : null}

      {staty.mianownik === 0 ? (
        <p className="mt-10 rounded-2xl border border-kreska bg-papier-2 p-6 text-atrament-2">
          Nie mamy jeszcze zaimportowanych głosów imiennych dla tego posła.
        </p>
      ) : (
        <>
          <section className="mt-12">
            <h2 className="szryft text-2xl font-semibold">Jak głosował(a)</h2>
            <p className="mt-1 text-sm text-atrament-2">
              Na podstawie {zOdmiana(staty.mianownik, 'głosowania', 'głosowań', 'głosowań')},
              w których rejestr odnotował tego posła.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta sm:col-span-2">
                <ul className="space-y-3">
                  {staty.rozklad.map((r) => {
                    const e = etykietaGlosu(r.glos);
                    const udzialProc = (r.ile / staty.mianownik) * 100;
                    return (
                      <li key={r.glos}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-medium">{e.krotka}</span>
                          <span className="liczby text-atrament-2">
                            <span className="font-medium text-atrament">{liczba(r.ile)}</span>{' '}
                            · {procent(udzialProc)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-papier-3">
                          <div
                            className={`h-full rounded-full ${TONY[e.ton] ?? TONY.inne}`}
                            style={{ width: `${udzialProc}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
                <p className="liczby szryft text-4xl font-semibold leading-none">{procent(udzial)}</p>
                <p className="mt-2 text-sm font-medium">udział w głosowaniach</p>
                <p className="mt-1 text-xs text-atrament-2">
                  {liczba(staty.mianownik - nieobecnosci)} z {liczba(staty.mianownik)}
                </p>
                {/*
                  Zasada redakcyjna: NIE ZGADUJEMY POWODOW. Sprawowanie urzedu,
                  choroba i zwykla nieobecnosc wygladaja w rejestrze identycznie,
                  wiec nie wolno nam ich rozroznic ani zasugerowac roznicy.
                */}
                <p className="mt-4 border-t border-kreska pt-3 text-xs leading-relaxed text-atrament-3">
                  Rejestr nie podaje, dlaczego posła nie było. Wyjazd służbowy,
                  choroba i nieobecność bez powodu wyglądają w danych tak samo —
                  więc nie rozstrzygamy tego za rejestr.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="szryft text-2xl font-semibold">Ostatnie głosowania</h2>
            </div>
            <ul className="mt-5 space-y-2">
              {ostatnie.map((g) => {
                const e = etykietaGlosu(g.glos);
                return (
                  <li key={`${g.posiedzenie}-${g.numer}`}>
                    <Link
                      href={`/glosowanie/${g.posiedzenie}-${g.numer}`}
                      className="group flex flex-col gap-3 rounded-2xl border border-kreska bg-papier-2 p-4 transition-all hover:border-kreska-2 hover:shadow-karta sm:flex-row sm:items-center"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-atrament-3">
                          {dataSlownie(g.data)} · posiedzenie {g.posiedzenie}
                        </span>
                        <span className="mt-1 block leading-snug font-medium group-hover:text-akcent">
                          {skroc(g.temat ?? g.tytul, 120)}
                        </span>
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium text-papier sm:self-center ${TONY[e.ton] ?? TONY.inne}`}
                      >
                        {e.krotka}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {ostatnie.length > 0 ? (
        <section className="mt-12">
          <h2 className="szryft text-2xl font-semibold">Najświeższe głosowanie w izbie</h2>
          <div className="mt-4 rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
            <p className="font-medium">{skroc(ostatnie[0]!.temat ?? ostatnie[0]!.tytul, 160)}</p>
            <PaseczekGlosow
              za={ostatnie[0]!.za}
              przeciw={ostatnie[0]!.przeciw}
              wstrzymalo={ostatnie[0]!.wstrzymalo}
              nieobecnych={ostatnie[0]!.nieobecnych}
              className="mt-4"
              zOpisem
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
