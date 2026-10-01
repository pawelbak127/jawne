import { uprosc } from './tekst';

/**
 * Czy organ, ktory podjal decyzje, jest organem WYKONAWCZYM TEJ gminy.
 *
 * NIE WYSTARCZY porownac TERYT-u siedziby, i to byl moj blad w pierwszej
 * wersji: ZMIERZONE 01.10.2026 — na stronie Warszawy jako „organ tej gminy"
 * wyszly **Zaklad Ubezpieczen Spolecznych, PFRON i Bank Gospodarstwa
 * Krajowego**, bo wszystkie maja siedzibe w Warszawie, wiec ich `regon.teryt`
 * rowna sie 146501. „ZUS to organ tej gminy" jest nieprawda.
 *
 * Rozstrzyga TYTUL z pola `udzielajacy` w SUDOP, bo rejestr zapisuje tam nie
 * nazwe osoby prawnej, a organ, ktory wydal decyzje: „Burmistrz Miasta
 * Zakopane" (904 przypadki), „Prezydent Miasta Belchatow" (353), „Prezydent
 * Wroclawia" (80). Organami wykonawczymi gminy sa w polskim prawie wojt,
 * burmistrz i prezydent miasta — i tylko one.
 *
 * ZMIERZONE, ile organow ma ktory tytul: wojt 81, burmistrz 132, prezydent
 * 68 — ale takze **starosta 282** i marszalek 16. Starosta jest organem
 * POWIATU, nie gminy, wiec musi wypasc; w miescie na prawach powiatu zadania
 * starosty wykonuje prezydent i tam tytul brzmi „prezydent".
 *
 * Oba warunki musza zachodzic razem: tytul mowi, ze to organ gminy, a TERYT
 * siedziby — ze to TA gmina. Burmistrz sasiedniej gminy nie jest nasz.
 */
const TYTUL_GMINY = /^(wojt|burmistrz|prezydent)\b/;

export function organWykonawczyGminy(
  nazwa: string | null,
  terytOrganu: string | null,
  terytGminy: string,
): boolean {
  if (!nazwa || terytOrganu !== terytGminy) return false;
  return TYTUL_GMINY.test(uprosc(nazwa));
}

/**
 * Nazwa organu do pokazania. Pierwszenstwo ma zapis z SUDOP, bo to on mowi,
 * KTO wydal decyzje („Burmistrz Miasta Zakopane"), a REGON podaje nazwe osoby
 * prawnej („GMINA ZAKOPANE”) — prawdziwa, ale nie o tym.
 */
export function nazwaOrganu(zSudop: string | null, zRegon: string | null): string {
  return (zSudop?.trim() || zRegon?.trim() || '').trim();
}
