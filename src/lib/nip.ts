/**
 * NIP z pola, ktore rejestr wypelnia recznie.
 *
 * ZMIERZONE 23.09.2026 w TED (`winner-identifier`) na probce 250 polskich
 * ogloszen o udzieleniu zamowienia. W jednym ogloszeniu obok siebie stalo:
 *
 *   "NIP 634-012-54-42" | "7281341936" | "683-20-98-254" | "NIP 527 105 59 84"
 *
 * Bez sprowadzenia do samych cyfr zadne z tych zapisow nie polaczy sie
 * z `nip_beneficjenta` z SUDOP, gdzie NIP to dziesiec cyfr bez niczego.
 *
 * Cyfra kontrolna NIP (suma wazona modulo 11) jest sprawdzana, bo w tym polu
 * bywaja tez numery REGON, KRS i numery zagraniczne — a NIP o zlej sumie
 * kontrolnej polaczylby dwie rozne firmy.
 */
const WAGI = [6, 5, 7, 2, 3, 4, 5, 6, 7];

export function poprawnyNip(cyfry: string): boolean {
  if (!/^\d{10}$/.test(cyfry)) return false;
  // Same zera i inne "wypelniacze" przechodza sume kontrolna, a nie sa NIP-em.
  if (/^(\d)\1{9}$/.test(cyfry)) return false;
  const suma = WAGI.reduce((a, w, i) => a + w * Number(cyfry[i]), 0);
  return suma % 11 === Number(cyfry[9]);
}

/** Dziesiec cyfr NIP-u albo null, gdy w polu jest cos innego. */
export function nipZTekstu(tekst: string | null | undefined): string | null {
  if (!tekst) return null;
  const cyfry = tekst.replace(/\D/g, '');
  // "PL5260152844" i "NIP: 526-015-28-44" daja te same dziesiec cyfr.
  if (cyfry.length === 10) return poprawnyNip(cyfry) ? cyfry : null;
  // Zapis z przedrostkiem kraju albo z numerem sprawy doklejonym z przodu:
  // bierzemy dziesiec ostatnich cyfr tylko wtedy, gdy przechodza kontrole.
  if (cyfry.length > 10) {
    const ogon = cyfry.slice(-10);
    if (poprawnyNip(ogon)) return ogon;
    const glowa = cyfry.slice(0, 10);
    if (poprawnyNip(glowa)) return glowa;
  }
  return null;
}
