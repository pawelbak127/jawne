/**
 * Czy glosowanie osiagnelo wymagana wiekszosc — z dwoch liczb rejestru.
 *
 * Rejestr NIE podaje pola „przyjeto/odrzucono”. Podaje `majorityType` (typ
 * wiekszosci) i `majorityVotes` („number of votes that constitute
 * a majority”, specyfikacja OpenAPI). Wynik to wiec rachunek `za >= wymagane`
 * na liczbach rejestru — i obie pokazujemy obok, zeby kazdy mogl go
 * powtorzyc. Nie piszemy, co to znaczy dla projektu: przyjeta poprawka
 * i przyjety wniosek o odrzucenie projektu to rozne skutki, a rozstrzyga je
 * tresc glosowania, nie my (zasada 2).
 *
 * ZMIERZONE 09.10.2026 na 4 941 glosowaniach X kadencji — `majorityVotes`
 * zgadza sie z regula kazdego typu:
 *   zwykla           przeciw + 1                              3 994 z 4 047*
 *   bezwzgledna      polowa oddanych glosow (bez nieobecnych) + 1   742 z 742
 *   3/5              3/5 oddanych glosow, w gore                23 z 23
 *   ustawowa i bezwzgledna ustawowej liczby posłow: 231        120 z 120
 * * pozostale 53 to glosowania bez ani jednego glosu „za/przeciw/wstrzymal”
 *   (kworum) — tam wyniku nie ma i go nie pokazujemy.
 * W 12 glosowaniach bylo wiecej „za” niz „przeciw”, a wymaganej wiekszosci
 * nie bylo (11 z 23 glosowan 3/5) — bez tej informacji strona sugerowala
 * odwrotny wynik.
 *
 * Glosowania na liscie kandydatow (`ON_LIST`) maja wynik osobno dla kazdego
 * kandydata — tu go nie liczymy.
 */

export type WynikGlosowania = {
  /** Ile glosow „za” przesadza o wiekszosci — wprost z rejestru. */
  wymagane: number;
  za: number;
  osiagnieta: boolean;
  /** „większość zwykła” itd. — nazwa typu po polsku. */
  nazwa: string;
  /** Jedno zdanie: na czym polega ta wiekszosc. */
  regula: string;
};

const TYPY: Record<string, { nazwa: string; regula: string }> = {
  SIMPLE_MAJORITY: { nazwa: 'większość zwykła', regula: 'więcej głosów „za” niż „przeciw”' },
  ABSOLUTE_MAJORITY: {
    nazwa: 'większość bezwzględna',
    regula: 'więcej głosów „za” niż „przeciw” i „wstrzymał się” razem',
  },
  MAJORITY_THREE_FIFTHS: { nazwa: 'większość 3/5', regula: 'co najmniej 3/5 oddanych głosów „za”' },
  ABSOLUTE_STATUTORY_MAJORITY: {
    nazwa: 'bezwzględna większość ustawowej liczby posłów',
    regula: 'co najmniej 231 głosów „za”, niezależnie od liczby obecnych',
  },
  STATUTORY_MAJORITY: {
    nazwa: 'większość ustawowej liczby posłów',
    regula: 'co najmniej 231 głosów „za”, niezależnie od liczby obecnych',
  },
};

export function wynikGlosowania(g: {
  rodzaj: string | null;
  typ_wiekszosci: string | null;
  wiekszosc_glosow: number | null;
  za: number;
  przeciw: number;
  wstrzymalo: number;
}): WynikGlosowania | null {
  if (g.rodzaj === 'ON_LIST') return null;
  if (g.wiekszosc_glosow === null || g.wiekszosc_glosow <= 0) return null;
  if (g.za + g.przeciw + g.wstrzymalo === 0) return null;
  const typ = (g.typ_wiekszosci && TYPY[g.typ_wiekszosci])
    || { nazwa: 'wymagana większość', regula: `rejestr podaje typ: ${g.typ_wiekszosci ?? '—'}` };
  return {
    wymagane: g.wiekszosc_glosow,
    za: g.za,
    osiagnieta: g.za >= g.wiekszosc_glosow,
    nazwa: typ.nazwa,
    regula: typ.regula,
  };
}

/**
 * Skutek glosowania nad poprawka Senatu — inny niz „wymagana wiekszosc osiagnieta”.
 *
 * Sejm glosuje WNIOSEK O ODRZUCENIE poprawki Senatu, a poprawke uwaza sie za
 * przyjeta, jesli Sejm jej nie odrzuci bezwzgledna wiekszoscia (art. 121 ust. 3
 * Konstytucji). Rejestr podaje tylko „poprawka 10” i typ wiekszosci, wiec
 * „wiekszosc nieosiagnieta” czytelnik bral za „poprawka upadla” — a znaczy
 * odwrotnie (przeglad tresci 24.10.2026). Zmierzone 24.10.2026: przy
 * „poprawkach nr 2-3” do ustawy o VAT 0 „za” i 431 „przeciw” — taki wynik
 * ma sens tylko wtedy, gdy „za” to „za odrzuceniem”; w 90 glosowaniach
 * „poprawka 1” razem 6 677 „za” wobec 28 246 „przeciw”.
 * Tylko poprawki (temat „poprawk…”) przy wiekszosci bezwzglednej — inne
 * glosowania nad uchwalami Senatu zostawiamy bez dopowiedzenia.
 */
export function skutekPoprawkiSenatu(
  g: { tytul: string | null; temat: string | null; typ_wiekszosci: string | null },
  w: WynikGlosowania | null,
): string | null {
  if (!w || g.typ_wiekszosci !== 'ABSOLUTE_MAJORITY') return null;
  if (!/uchwa\p{L}*\s+senatu/iu.test(g.tytul ?? '') || !/poprawk/iu.test(g.temat ?? '')) return null;
  const mnoga = /poprawki/iu.test(g.temat ?? '');
  if (w.osiagnieta) return mnoga ? 'Poprawki Senatu odrzucone' : 'Poprawka Senatu odrzucona';
  return mnoga ? 'Poprawki Senatu przyjęte — Sejm ich nie odrzucił' : 'Poprawka Senatu przyjęta — Sejm jej nie odrzucił';
}

/** Zdanie objasniajace przy skutku — zeby „za” nie czytac jako „za poprawka”. */
export const OBJASNIENIE_POPRAWKI_SENATU = 'Głosuje się wniosek o odrzucenie poprawki Senatu: „za” znaczy za odrzuceniem. Poprawkę uważa się za przyjętą, jeśli Sejm nie odrzuci jej bezwzględną większością (art. 121 ust. 3 Konstytucji).';

/**
 * Krotki tytul glosowania nad poprawka Senatu: „Poprawka Senatu nr 1 do ustawy
 * o zmianie ustawy o podatku od towarow i uslug” zamiast „Sprawozdanie Komisji
 * o uchwale Senatu w sprawie ustawy o … (druki nr 3132 i 3167)” z „poprawka 1”
 * gdzies w podtytule (przeglad tresci 24.10.2026: dziesiec glosowan jednego
 * punktu mialo ten sam H1). Slowa z rejestru — tylko przestawione; pelny tytul
 * zostaje w podtytule. `null`, gdy ksztalt jest inny — wtedy H1 bez zmian.
 */
export function tytulPoprawkiSenatu(sprawa: string, przedmiot: string | null): string | null {
  if (!przedmiot || !/^poprawk/iu.test(przedmiot.trim())) return null;
  const ustawa = sprawa.match(/uchwa\p{L}*\s+senatu\s+w\s+sprawie\s+(ustawy\b.*?)(?:\s*\(druki?\b[^)]*\))?\s*$/iu)?.[1];
  if (!ustawa) return null;
  const poprawka = przedmiot.trim().replace(/^poprawk(a|i)\s+(?:nr\s+)?/iu, (_, k: string) => `Poprawk${k.toLowerCase()} Senatu nr `);
  return `${poprawka} do ${ustawa}`;
}
