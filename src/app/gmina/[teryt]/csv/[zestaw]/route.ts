import { KONTAKT } from '@/lib/adres';
import {
  bazaDostepna, budzetDoEksportu, gminaPelna, pomocDoEksportuPorcjami, projektyDoEksportu, TERYT_WARSZAWY,
} from '@/lib/dane';
import { doCsv, naglowekCsv, nazwaPliku, wierszeCsv, type Komorka } from '@/lib/eksport-csv';
import { nazwaDoPokazania } from '@/lib/prywatnosc';

/**
 * Dane gminy do pobrania: /gmina/{teryt}/csv/{budzet|fundusze|pomoc}.
 *
 * Te same zakresy i ta sama regula nazw co na stronie — plik nie moze
 * pokazywac wiecej niz strona. W pomocy publicznej NIP idzie do pliku tylko
 * razem z nazwa: NIP jednoosobowej firmy wskazuje czlowieka rownie dobrze
 * jak nazwisko.
 */
const ZESTAWY = ['budzet', 'fundusze', 'pomoc'] as const;
type Zestaw = (typeof ZESTAWY)[number];

export async function GET(_req: Request, ctx: RouteContext<'/gmina/[teryt]/csv/[zestaw]'>) {
  const { teryt, zestaw } = await ctx.params;
  if (!bazaDostepna() || !/^\d{6}$/.test(teryt) || !ZESTAWY.includes(zestaw as Zestaw)) {
    return new Response('Nie ma takiego zestawu danych.', { status: 404 });
  }
  const g = gminaPelna(teryt);
  if (!g) return new Response('Nie ma takiej gminy.', { status: 404 });

  // Warszawa: fundusze, budzet i pomoc sa dla calego miasta — jak na stronie.
  const zrodlo = g.rodzaj === 'dzielnica Warszawy' ? TERYT_WARSZAWY : teryt;
  const nazwaGminy = g.rodzaj === 'dzielnica Warszawy' ? 'Warszawa' : g.nazwa;
  let csv: string;

  if (zestaw === 'budzet') {
    csv = doCsv(
      ['rok', 'dochody_zl', 'dochody_wlasne_zl', 'wydatki_zl', 'wydatki_majatkowe_zl', 'wydatki_inwestycyjne_zl'],
      budzetDoEksportu(zrodlo).map((b) => [b.rok, b.dochody, b.dochody_wlasne, b.wydatki, b.wydatki_majatkowe, b.wydatki_inwestycyjne]),
    );
  } else if (zestaw === 'fundusze') {
    csv = doCsv(
      ['perspektywa', 'numer_umowy', 'tytul', 'beneficjent', 'program', 'fundusz', 'wartosc', 'dofinansowanie_ue', 'waluta', 'poczatek', 'koniec', 'liczba_miejsc_realizacji'],
      projektyDoEksportu(zrodlo).map((p): Komorka[] => [
        p.okres, p.numer_umowy, p.tytul, nazwaDoPokazania(p.beneficjent).tekst, p.program, p.fundusz,
        p.wartosc, p.dofinansowanie_ue, p.waluta, p.poczatek, p.koniec, p.miejsc,
      ]),
    );
  } else {
    return new Response(strumienPomocy(zrodlo), { headers: naglowki(nazwaGminy, teryt, zestaw) });
  }

  return new Response(csv, { headers: naglowki(nazwaGminy, teryt, zestaw) });
}

function naglowki(nazwaGminy: string, teryt: string, zestaw: string): HeadersInit {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nazwaPliku('jawne', nazwaGminy, teryt, zestaw)}"`,
    // Plik do pobrania, nie strona — nie ma czego szukac w wyszukiwarce.
    'X-Robots-Tag': 'noindex',
  };
}

const NAGLOWKI_POMOCY = [
  'dzien_udzielenia', 'nip_beneficjenta', 'beneficjent', 'wielkosc', 'pkd', 'udzielajacy', 'przeznaczenie', 'forma',
  'wartosc_nominalna_zl', 'wartosc_brutto_zl', 'wartosc_brutto_eur',
];

/**
 * Pomoc publiczna jako STRUMIEN, dzien po dniu.
 *
 * ZMIERZONE 04.10.2026 (pulapka 69): Krakow to 191 910 wierszy rozsianych po
 * pliku bazy, a `node:sqlite` jest synchroniczny — plik skladany naraz
 * zamrazal caly serwis na minuty. Przed KAZDA porcja oddajemy sterowanie
 * (`setImmediate`), wiec zadania innych czytelnikow przechodza miedzy
 * porcjami. Bez tej przerwy strumien nie pomoglby niczym: gdy gniazdo
 * przyjmuje dane szybko, kolejne `pull` ida w tej samej turze petli.
 */
function strumienPomocy(teryt: string): ReadableStream<Uint8Array> {
  const progAktywny = Boolean(KONTAKT);
  const porcje = pomocDoEksportuPorcjami(teryt);
  const kod = new TextEncoder();
  let naglowek = true;
  return new ReadableStream<Uint8Array>({
    async pull(sterownik) {
      if (naglowek) {
        naglowek = false;
        sterownik.enqueue(kod.encode(naglowekCsv(NAGLOWKI_POMOCY)));
        return;
      }
      await new Promise((gotowe) => setImmediate(gotowe));
      const nastepna = porcje.next();
      if (nastepna.done) {
        sterownik.close();
        return;
      }
      sterownik.enqueue(kod.encode(wierszeCsv(nastepna.value.map((w): Komorka[] => {
        // Eksport musi chowac i odslaniac DOKLADNIE to samo, co strona —
        // inaczej plik CSV omija regule, ktorej strona pilnuje.
        const nazwa = nazwaDoPokazania(w.nazwa_beneficjenta, {
          pomocEur: w.max_eur_beneficjenta, progAktywny, typRegon: w.typ_regon,
        });
        const udzielajacy = nazwaDoPokazania(w.udzielajacy);
        return [
          w.dzien, nazwa.pominieta ? null : w.nip_beneficjenta, nazwa.tekst, w.wielkosc, w.pkd,
          udzielajacy.tekst, w.przeznaczenie, w.forma, w.wartosc_nominalna, w.wartosc_brutto, w.wartosc_brutto_eur,
        ];
      }))));
    },
    cancel() {
      // Czytelnik przerwal pobieranie — nie czytamy dalszych dni na prozno.
      porcje.return(undefined);
    },
  });
}
