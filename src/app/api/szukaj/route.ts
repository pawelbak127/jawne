import { szukaj } from '@/lib/dane';
import type { OdpowiedzWyszukiwania } from '@/lib/wyszukiwanie';

/**
 * Podpowiedzi dla pola wyszukiwania. Te same dane pokazuje strona /szukaj,
 * ktora dziala bez JavaScriptu — ta trasa tylko przyspiesza pisanie.
 */
export async function GET(zadanie: Request) {
  const fraza = (new URL(zadanie.url).searchParams.get('q') ?? '').slice(0, 120);
  const w = szukaj(fraza, 5);

  const odpowiedz: OdpowiedzWyszukiwania = {
    fraza,
    gminy: w.gminy.slice(0, 5).map((g) => ({
      teryt: g.teryt,
      nazwa: g.nazwa,
      rodzaj: g.rodzaj,
      powiat: g.powiat,
      wojewodztwo: g.wojewodztwo,
      okreg: g.okreg_nr,
      okregNazwa: g.okreg_nazwa,
    })),
    poslowie: w.poslowie.slice(0, 5).map((p) => ({
      slug: p.slug,
      nazwa: p.imie_nazwisko,
      klub: p.klub_id,
      okreg: p.okreg_nazwa,
      aktywny: p.aktywny === 1,
    })),
    glosowania: w.glosowania.map((g) => ({
      id: `${g.posiedzenie}-${g.numer}`,
      data: g.data,
      tytul: g.temat ?? g.tytul,
    })),
    glosowanWszystkich: w.glosowanWszystkich,
  };

  return Response.json(odpowiedz, {
    headers: { 'cache-control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
