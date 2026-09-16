/**
 * Slownik wartosci glosu.
 *
 * ZASADA: nieznana wartosc jest RAPORTOWANA, a nie przerywa importu.
 * Ten slownik zostal wyprowadzony z pelnego importu kadencji, a nie z probki —
 * `PRESENT` pojawilo sie dopiero na 63. posiedzeniu i probka go nie zawierala.
 * Import, ktory wywraca sie na nowej wartosci, traci caly przebieg; import,
 * ktory ja zapisuje i zglasza, traci tylko etykiete w interfejsie.
 */
export const GLOSY_ZNANE = new Set([
  'YES', 'NO', 'ABSTAIN', 'ABSENT', 'PRESENT', 'VOTE_VALID', 'VOTE_INVALID',
]);

export type Etykieta = { krotka: string; pelna: string; ton: 'za' | 'przeciw' | 'wstrzymal' | 'brak' | 'inne' };

export const ETYKIETY: Record<string, Etykieta> = {
  YES:          { krotka: 'za',            pelna: 'głosował(a) za',            ton: 'za' },
  NO:           { krotka: 'przeciw',       pelna: 'głosował(a) przeciw',        ton: 'przeciw' },
  ABSTAIN:      { krotka: 'wstrzymał się', pelna: 'wstrzymał(a) się od głosu',  ton: 'wstrzymal' },
  ABSENT:       { krotka: 'nieobecny',     pelna: 'nie wziął(ęła) udziału',     ton: 'brak' },
  PRESENT:      { krotka: 'obecny',        pelna: 'obecny(a), bez oddania głosu', ton: 'inne' },
  VOTE_VALID:   { krotka: 'głos ważny',    pelna: 'oddał(a) głos ważny',        ton: 'inne' },
  VOTE_INVALID: { krotka: 'głos nieważny', pelna: 'oddał(a) głos nieważny',     ton: 'inne' },
};

/** Dla wartosci spoza slownika pokazujemy surowy kod — nie zgadujemy znaczenia. */
export function etykieta(glos: string): Etykieta {
  return ETYKIETY[glos] ?? { krotka: glos, pelna: `rejestr podaje: ${glos}`, ton: 'inne' };
}
