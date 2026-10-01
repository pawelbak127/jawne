/**
 * Formy pomocy publicznej z SUDOP — pogrupowane po tym, CO ZNACZA DLA BUDZETU.
 *
 * To nie jest kosmetyka, tylko warunek, zeby wolno bylo cokolwiek o tych
 * kwotach napisac. ZMIERZONE 01.10.2026 na 168 456 wierszach: w rejestrze jest
 * **40 roznych kodow form**, a roznica miedzy nimi jest zasadnicza.
 *
 *  - `dotacja` (A1.1, 13,8 mld zl) to pieniadz, ktory WYSZEDL z kasy i jest
 *    w wydatkach budzetu;
 *  - `zwolnienie z oplaty` (A2.5, 73 739 przypadkow) to dochod, ktorego nie
 *    pobrano — **nie ma go w wydatkach i nie bedzie**, wiec zdanie „gmina
 *    wydala" byloby o nim nieprawda;
 *  - `rozlozenie na raty` (C2.3.1, 4 257 przypadkow, 8 mln zl) to **korzysc
 *    z odsetek**, ok. 2 tys. zl na sprawe — a NIE odroczona kwota podatku.
 *    Czytanie tego jako „gmina odpuscila 8 mln" byloby bledem rzedu wielkosci;
 *  - `gwarancja` (D1.2) i `pozyczka preferencyjna` (C1.1) to zobowiazania
 *    zwrotne albo warunkowe — kwota nie jest ani wydatkiem, ani ubytkiem.
 *
 * Dlatego kazda kategoria ma wlasne zdanie wyjasniajace i NIE sumujemy ich
 * razem w jedna liczbe „pomoc gminy”.
 */
export type KategoriaPomocy = 'wyplacone' | 'niepobrane' | 'zwrotne' | 'terminy' | 'inne';

export const KATEGORIE: KategoriaPomocy[] = ['wyplacone', 'niepobrane', 'zwrotne', 'terminy', 'inne'];

type Opis = { etykieta: string; wyjasnienie: string };

export const OPIS_KATEGORII: Record<KategoriaPomocy, Opis> = {
  wyplacone: {
    etykieta: 'wypłacone z budżetu',
    wyjasnienie: 'Dotacje, refundacje i dopłaty — pieniądze, które wyszły z kasy i są w wydatkach budżetu.',
  },
  niepobrane: {
    etykieta: 'niepobrane albo odstąpione',
    wyjasnienie: 'Zwolnienia, umorzenia i obniżki — dochód, którego nie pobrano. '
      + 'Tej kwoty nie ma w wydatkach budżetu i nie będzie.',
  },
  zwrotne: {
    etykieta: 'zwrotne i warunkowe',
    wyjasnienie: 'Pożyczki, kredyty preferencyjne, gwarancje i poręczenia. '
      + 'Korzyścią jest preferencja albo zabezpieczenie, nie cała kwota.',
  },
  terminy: {
    etykieta: 'ulgi w terminie płatności',
    wyjasnienie: 'Odroczenia i raty. Rejestr podaje tu korzyść z odsetek, '
      + 'a nie odroczoną kwotę podatku — średnio około dwóch tysięcy złotych na sprawę.',
  },
  inne: {
    etykieta: 'pozostałe',
    wyjasnienie: 'Formy, których rejestr nie przypisuje do żadnej z powyższych grup.',
  },
};

/**
 * Kod formy na kategorie. Rozstrzyga PRZEDROSTEK, bo rejestr rozbudowuje kody
 * w glab (A2.8 i A2.8.1, C2.1 i C2.1.2), a nie wszerz.
 *
 * Kod nieznany dostaje `inne` i NIE przerywa importu (wzorzec 2) — ale import
 * go zglasza, bo nowa grupa form to zmiana w rejestrze, nie w naszym kodzie.
 */
export function kategoriaFormy(kod: string | null): KategoriaPomocy {
  if (!kod) return 'inne';
  const k = kod.trim().toUpperCase();
  if (k.startsWith('A1') || k.startsWith('B1')) return 'wyplacone';
  if (k.startsWith('A2')) return 'niepobrane';
  if (k.startsWith('C1') || k.startsWith('D1')) return 'zwrotne';
  if (k.startsWith('C2')) return 'terminy';
  return 'inne';
}

/** Czy przedrostek kodu jest nam znany — do raportowania nowosci w rejestrze. */
export function formaZnana(kod: string | null): boolean {
  if (!kod) return false;
  return /^(A1|A2|B1|C1|C2|D1)/i.test(kod.trim());
}
