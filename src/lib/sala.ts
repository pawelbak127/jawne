import { klub } from './kluby';
import type { MiejsceNaSali } from './plan-sali';

/** Jedno miejsce na planie razem z tym, co pokazujemy po najechaniu. */
export type MiejscePosla = {
  id: number;
  numer: number | null;
  x: number;
  y: number;
  nazwa: string;
  slug: string;
  klubId: string | null;
  klubEtykieta: string;
  okreg: string | null;
  barwa: string;
  barwaCiemna: string;
};

/** Posel w zakresie potrzebnym planowi sali — tyle, ile daje `listaPoslow()`. */
export type PoselDoPlanu = {
  id: number;
  slug: string;
  imie_nazwisko: string;
  klub_id: string | null;
  okreg_nazwa: string | null;
  okreg_nr: number | null;
};

/** Barwa dla posla bez klubu — ta sama, ktora ma kolo „niez." w `kluby.ts`. */
const BEZ_KLUBU = { barwa: '#9a958c', barwaCiemna: '#8e8a95' };

/**
 * Laczy plan sali (id posla + wspolrzedne) z danymi poslow.
 *
 * Miejsce, ktorego posla NIE MA w bazie, wypada z wyniku — i to jest celowe:
 * plan jest wydawany raz na jakis czas, a sklad izby zmienia sie w miedzyczasie.
 * Liczbe takich miejsc oddajemy osobno, zeby strona mogla o nich powiedziec,
 * zamiast po cichu pokazac niepelna sale.
 */
export function polaczPlan(
  plan: readonly MiejsceNaSali[],
  poslowie: readonly PoselDoPlanu[],
): { miejsca: MiejscePosla[]; bezPosla: number } {
  const wgId = new Map(poslowie.map((p) => [p.id, p]));
  const miejsca: MiejscePosla[] = [];
  let bezPosla = 0;

  for (const [id, numer, x, y] of plan) {
    const p = wgId.get(id);
    if (!p) {
      bezPosla += 1;
      continue;
    }
    const k = p.klub_id ? klub(p.klub_id) : undefined;
    miejsca.push({
      id,
      numer,
      x,
      y,
      nazwa: p.imie_nazwisko,
      slug: p.slug,
      klubId: p.klub_id,
      klubEtykieta: p.klub_id ?? 'bez klubu',
      okreg: p.okreg_nazwa ? `okręg ${p.okreg_nr} · ${p.okreg_nazwa}` : null,
      barwa: k?.barwa ?? BEZ_KLUBU.barwa,
      barwaCiemna: k?.barwaCiemna ?? BEZ_KLUBU.barwaCiemna,
    });
  }
  return { miejsca, bezPosla };
}

/** Miejsce jednego posla na planie — `null`, gdy plan go nie zna. */
export function miejscePosla(plan: readonly MiejsceNaSali[], id: number): MiejsceNaSali | null {
  return plan.find((m) => m[0] === id) ?? null;
}
