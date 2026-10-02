/**
 * Gdzie postawic chmurke z podpowiedzia, zeby nie wyszla za krawedz.
 *
 * HISTORIA TEGO BLEDU jest tu po to, zeby nie wrocil po raz trzeci:
 *
 *  1. 30.09.2026 Pawel zglosil, ze chmurka na planie sali jest obcieta.
 *     Stala tam **jedna twarda liczba** (`Math.min(x + 14, 620)`), ktora przy
 *     szerszym ekranie nie robila nic, a przy wezszym i tak nie pomagala.
 *     Powstalo `chmurkaStyl()` w `PlanSali.tsx` — i dziala.
 *  2. Tego samego dnia naprawilem w `Polkole` **przyklejanie sie** chmurki
 *     (brakujacy `onMouseLeave`), ale pozycjonowania tam nie ruszylem.
 *     Zostala twarda liczba 420 przy chmurce szerokiej 288 px.
 *  3. 01.10.2026 przeglad telefonowy zmierzyl skutek: pudelko polkola ma na
 *     390 px **294-308 px**, wiec prog 420 NIGDY sie nie uruchamia. Chmurka
 *     wychodzila na 432 px, czyli **42-46 px za krawedz dokumentu** — i to na
 *     stronie glosowania, czyli najczesciej linkowanej tresci serwisu.
 *
 * Wniosek ogolniejszy niz chmurka: **prog podany w pikselach ekranu jest
 * zalozeniem o rozmiarze pudelka.** Jesli pudelko moze byc mniejsze od progu,
 * prog jest martwym kodem. Dlatego liczymy z rzeczywistych wymiarow pudelka,
 * a funkcja jest JEDNA dla obu wykresow.
 */
export type Podglad = {
  /** Pozycja kursora wzgledem pudelka. */
  x: number;
  y: number;
  /** Rzeczywiste wymiary pudelka — nie zalozone. */
  w: number;
  h: number;
};

export type RozmiarChmurki = { szer: number; wys: number };

/** Odstep chmurki od kursora, zeby nie zaslaniala tego, co sie wskazuje. */
export const ODSTEP_CHMURKI = 14;

/**
 * Chmurka idzie w prawo i w dol, a gdy by sie tam nie zmiescila — w lewo
 * albo do gory. `Math.max(4, …)` pilnuje lewej i gornej krawedzi, bo przy
 * bardzo waskim pudelku odbicie moze wyjsc na wartosc ujemna.
 */
export function chmurkaPozycja(
  pod: Podglad,
  chmurka: RozmiarChmurki,
  odstep: number = ODSTEP_CHMURKI,
): { left: number; top: number } {
  const wLewo = pod.x + odstep + chmurka.szer > pod.w;
  const doGory = pod.y + odstep + chmurka.wys > pod.h;
  return {
    left: Math.max(4, wLewo ? pod.x - odstep - chmurka.szer : pod.x + odstep),
    top: Math.max(4, doGory ? pod.y - odstep - chmurka.wys : pod.y + odstep),
  };
}
