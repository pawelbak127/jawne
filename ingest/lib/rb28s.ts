/**
 * Sprawozdania Rb-28S (wydatki JST) z dane.gov.pl — zbior 872 Ministerstwa
 * Finansow. Plik za IV kwartal to wykonanie calego roku: wiersz na kazdy
 * paragraf klasyfikacji budzetowej kazdej jednostki, ok. 1,4 mln wierszy
 * i 190 MB. Dlatego czytamy go STRUMIENIEM, linia po linii (pulapki 57, 61).
 *
 * ZMIERZONE 30.10 i 02.11.2026 na plikach za lata 2021–2025: naglowek ten sam
 * (2021 bez WERSJA, 2022 bez NAZWAJST — tych kolumn nie uzywamy), UTF-8,
 * srednik, przecinek dziesietny. Rok 2021 to ZIP z jednym plikiem Rb28S.csv,
 * lata 2022–2025 to goly CSV — format zalezy od tego, kto i kiedy wrzucal,
 * nie od roku (II kw. 2026 znow jest ZIP-em).
 */

/** Kolumny, bez ktorych nie liczymy — brak ktorejkolwiek to inny plik. */
export const KOLUMNY_RB28S = ['WK', 'PK', 'GK', 'GT', 'PT', 'ROK', 'KWARTAL', 'DZIAL', 'ROZDZIAL', 'PAR', 'PAR4', 'R4'] as const;

/**
 * TERYT gminy (6 cyfr) z kodow jednostki albo null dla powiatu, wojewodztwa
 * i zwiazku.
 *
 * GT 1–3 to gmina miejska, wiejska i miejsko-wiejska. Miasto na prawach
 * powiatu sklada JEDNO sprawozdanie jako powiat (GK = 00, PT = 2), a jego
 * gmina ma w TERYT kod 01 — Warszawa wychodzi jako 146501, jak w BDL.
 * Kontrola z 30.10.2026: suma R4 tak zlozonych gmin rowna sie wydatkom
 * z GUS BDL w 2 477 z 2 477 gmin co do zlotowki.
 */
export function terytGminy(wk: string, pk: string, gk: string, gt: string, pt: string): string | null {
  if ((gt === '1' || gt === '2' || gt === '3') && gk !== '00') return wk + pk + gk;
  if (gk === '00' && pt === '2') return `${wk}${pk}01`;
  return null;
}

/**
 * Zwrot akcyzy za paliwo rolnicze: dzial 010 (Rolnictwo i lowiectwo),
 * rozdzial 01095 (Pozostala dzialalnosc), paragraf 4430 (Rozne oplaty
 * i skladki) — tak gminy ksieguja wyplate zwrotu producentom rolnym.
 * Kontrola druga droga (02.11.2026): suma krajowa 2024 r. to 1 897,8 mln zl
 * wobec 1 942 mln zl zlozonych wnioskow wedlug ministerstwa (98%), 2025 r. —
 * 1 852,3 mln zl wobec ok. 1,97 mld zl planu. Koszty obslugi (wynagrodzenia,
 * materialy) ida osobnymi paragrafami i tu ich nie ma.
 */
export function czyZwrotAkcyzy(dzial: string, rozdzial: string, par: string, par4: string): boolean {
  return dzial === '010' && rozdzial === '01095' && par === '443' && par4 === '0';
}

export type ZwrotyAkcyzy = {
  wierszy: number;
  /** pary „ROK/KWARTAL” spotkane w pliku — kontrola, ze to wlasciwy plik */
  okresy: string[];
  brakKolumn: string[];
  /** TERYT gminy -> zlote (wydatki wykonane, R4) */
  gminy: Map<string, number>;
};

const liczba = (s: string | undefined): number => Number((s ?? '').replace(',', '.')) || 0;

/** Zwroty akcyzy po gminach z linii pliku Rb-28S (pierwsza linia to naglowek). */
export async function zwrotyAkcyzy(linie: AsyncIterable<string>): Promise<ZwrotyAkcyzy> {
  let kol: Record<string, number> | null = null;
  const wynik: ZwrotyAkcyzy = { wierszy: 0, okresy: [], brakKolumn: [], gminy: new Map() };
  const okresy = new Set<string>();
  for await (const linia of linie) {
    if (!kol) {
      const naglowek = linia.replace(/^﻿/, '').trim().split(';');
      kol = Object.fromEntries(naglowek.map((k, i) => [k, i]));
      wynik.brakKolumn = KOLUMNY_RB28S.filter((k) => !(k in kol!));
      if (wynik.brakKolumn.length) return wynik;
      continue;
    }
    if (!linia) continue;
    const w = linia.split(';');
    wynik.wierszy++;
    okresy.add(`${w[kol.ROK!]}/${w[kol.KWARTAL!]}`);
    if (!czyZwrotAkcyzy(w[kol.DZIAL!]!, w[kol.ROZDZIAL!]!, w[kol.PAR!]!, w[kol.PAR4!]!)) continue;
    const teryt = terytGminy(w[kol.WK!]!, w[kol.PK!]!, w[kol.GK!]!, w[kol.GT!]!, w[kol.PT!]!);
    if (!teryt) continue;
    wynik.gminy.set(teryt, (wynik.gminy.get(teryt) ?? 0) + liczba(w[kol.R4!]));
  }
  wynik.okresy = [...okresy].sort();
  return wynik;
}

export type ZasobDaneGov = {
  id: string;
  attributes: {
    title?: string;
    modified?: string;
    data_date?: string;
    link?: string;
    format?: string;
    files?: { download_url?: string; format?: string | null }[];
  };
};

export type PlikRoczny = { rok: number; zasob: string; adres: string; zmieniono: string; tytul: string };

/**
 * Pliki „za IV kwartal” Rb-28S, po jednym na rok (przy dwoch — nowszy).
 * Tytuly nie sa jednolite: „po IV kwartalach 2019”, „za IV kwartal 2024 r.”,
 * „za IV kwartaly 2025 r.”, z ukosnikami albo nawiasami wokol „Rb28s”.
 */
export function plikiRoczne(zasoby: readonly ZasobDaneGov[]): Map<number, PlikRoczny> {
  const wynik = new Map<number, PlikRoczny>();
  for (const z of zasoby) {
    const tytul = z.attributes.title ?? '';
    if (!/rb\s*-?\s*28\s*s/i.test(tytul) || !/\bIV\s+kwarta/i.test(tytul)) continue;
    const rok = Number([...tytul.matchAll(/\b(20\d\d)\b/g)].pop()?.[1]);
    const adres = z.attributes.files?.[0]?.download_url || z.attributes.link;
    if (!rok || !adres) continue;
    const p: PlikRoczny = { rok, zasob: z.id, adres, zmieniono: z.attributes.modified ?? '', tytul };
    const byl = wynik.get(rok);
    if (!byl || p.zmieniono > byl.zmieniono) wynik.set(rok, p);
  }
  return wynik;
}
