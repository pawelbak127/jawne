import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, SUFIT_KANDYDATOW_FIRM, wyszukajFirmy, zrodloImportu } from '@/lib/dane';
import { dataKrotko, liczba, zlote } from '@/lib/format';
import { opisFirmy } from '@/lib/wyszukiwanie';
import { BrakDanych } from '@/components/BrakDanych';
import { Okruszek, Podstawa, Uwaga, Wypis } from '@/components/Szablon';
import { ZRODLO_SUDOP } from '@/components/WarunkiSudop';

/*
 * Strona wynikow nie ma wlasnej tresci — tak jak /szukaj nie idzie do
 * wyszukiwarek nigdy, takze po premierze (sama fraza w adresie to nie tresc).
 */
export const metadata: Metadata = {
  title: 'Firmy — pomoc publiczna i zamówienia',
  description: 'Czy firma dostała pomoc publiczną — szukaj po nazwie albo numerze NIP. Na stronie firmy także wygrane zamówienia publiczne.',
  robots: { index: false, follow: true },
};

const WYNIKOW = 50;

/**
 * Wyszukiwarka firm — osobna trasa z prototypu (decyzja Pawla z 07.10.2026).
 * Do tej pory pozycja „Firmy” w menu prowadzila do ogolnego /szukaj, gdzie
 * firmy byly czwarta grupa po gminach, poslach i ustawach.
 *
 * Ta sama regula jawnosci co na stronie firmy (`szukajFirm` w dane.ts):
 * wynik nie moze mowic wiecej niz strona, do ktorej prowadzi — takze przy
 * szukaniu po dokladnym NIP-ie (zasada 7).
 */
export default async function StronaFirm({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { q = '' } = await searchParams;
  const fraza = q.slice(0, 120).trim();
  const { firmy: wyniki, zbytOgolna } = fraza.length >= 3 ? wyszukajFirmy(fraza, WYNIKOW) : { firmy: [], zbytOgolna: false };
  const imp = zrodloImportu('sudop-przyrost');

  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Firmy' }]} />
      <Wypis
        tytul="Firmy"
        // Wyszukiwarka zna firmy z rejestru pomocy publicznej (indeks firm) — sam
        // wykonawca zamowienia bez pomocy sie tu nie znajdzie, wiec podtytul tego
        // nie obiecuje (przeglad tresci 24.10.2026). Zamowienia sa na stronie firmy.
        podtytul="Czy firma dostała pomoc publiczną. Szukaj po nazwie albo numerze NIP — na stronie firmy są też wygrane przez nią zamówienia publiczne."
      />

      {/* Zwykly formularz GET: dziala bez JavaScriptu, a adres z fraza da sie wyslac. */}
      <form role="search" action="/firmy" className="mt-5 max-w-xl">
        <label htmlFor="szukaj-firm" className="mb-1.5 block font-semibold">Nazwa firmy albo NIP</label>
        <div className="flex gap-2">
          <input className="pole min-w-0 flex-1" id="szukaj-firm" name="q" type="search" defaultValue={fraza} placeholder="np. Orlen albo 7740001454" />
          <button type="submit" className="min-h-11 shrink-0 bg-atrament px-4 font-semibold text-papier">Szukaj</button>
        </div>
      </form>

      {fraza.length > 0 && fraza.length < 3 ? (
        <p className="mt-4 text-atrament-2">Wpisz co najmniej trzy znaki nazwy albo cały NIP.</p>
      ) : null}

      {fraza.length >= 3 ? (
        <>
          <p className="mt-4 text-atrament-2" style={{ fontSize: 'var(--sredni)' }}>
            {zbytOgolna
              ? `Fraza „${fraza}” pasuje do ponad ${liczba(SUFIT_KANDYDATOW_FIRM)} firm — doprecyzuj nazwę albo wpisz NIP.`
              : wyniki.length
              ? `Wyniki dla „${fraza}”: ${wyniki.length >= WYNIKOW ? `${liczba(WYNIKOW)} z największą pomocą — doprecyzuj nazwę, żeby zawęzić` : liczba(wyniki.length)}. Beneficjenci pomocy publicznej z rejestru SUDOP, których nazwę wolno pokazać.`
              : `Nic nie znaleźliśmy dla „${fraza}”.`}
          </p>
          {wyniki.length ? (
            <ul className="pozycje">
              {wyniki.map((f) => (
                <li key={f.nip}>
                  <div className="min-w-0">
                    <Link href={`/firma/${f.nip}`} className="tytul-poz">{f.nazwa}</Link>
                    <p className="meta">{`NIP ${f.nip} · ${opisFirmy(f)}`}</p>
                  </div>
                  {/* Brak kwoty to nie zero: zrodlo czasem nie podaje wartosci brutto (zasada 4). */}
                  <p className="kwota">{f.brutto === null ? '—' : zlote(f.brutto)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-5 text-atrament-2" style={{ fontSize: 'var(--sredni)' }}>
          {'Największe pojedyncze przypadki pomocy w całym kraju są w '}
          <Link href="/pomoc-publiczna#najwieksze">przeglądzie pomocy publicznej</Link>.
        </p>
      )}

      <Uwaga naglowek="Nie ma firmy, której szukasz?">
        Nie pokazujemy podmiotów, których nazwa może być imieniem i nazwiskiem osoby — także przy
        szukaniu po NIP-ie. Ich pomoc jest wliczona w sumy gmin.{' '}
        <Link href="/prywatnosc">Zasady pokazywania nazw</Link>
      </Uwaga>

      <p className="stan-danych">
        <span>{imp ? `stan danych: SUDOP ${dataKrotko(imp.kiedy)}` : 'stan danych: —'}</span>
        <span><Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" /></span>
      </p>
    </div>
  );
}
