/**
 * Krótki tytuł projektu ustawy do list i strony głównej.
 *
 * Przegląd treści 24.10.2026: tytuły z rejestru zaczynają się od pustych
 * słów — „Rządowy projekt ustawy o zmianie ustawy o …” — i po dwóch
 * pierwszych wyrazach czytelnik nie wie nic. Przedrostek nie znika (idzie
 * do metryczki: „projekt rządowy”), a reszta tytułu zostaje słowo w słowo
 * z rejestru; nie skracamy treści ani jej nie streszczamy.
 * Zmierzone na 956 projektach: „Rządowy projekt ustawy o zmianie” 401,
 * „Poselski …” 285, „… o ratyfikacji” 32, „Komisyjny” 26, „Przedstawiony
 * przez Prezydenta Rzeczypospolitej Polskiej projekt ustawy” 22, „Senacki” 18,
 * „Obywatelski” 11, „… ustawy zmieniającej ustawę” 8.
 */
export type TytulUstawy = {
  /** „Zmiana ustawy o podatku dochodowym …”, „Ustawa o ochronie ludności”, „Ustawa budżetowa na rok 2024”. */
  krotki: string;
  /** „rządowy”, „poselski”, „prezydencki”… — `null`, gdy tytuł nie ma znanego przedrostka. */
  autor: string | null;
};

const AUTOR: [RegExp, string][] = [
  [/^rządowy\s+projekt\s+/i, 'rządowy'],
  [/^poselski\s+projekt\s+/i, 'poselski'],
  [/^senacki\s+projekt\s+/i, 'senacki'],
  [/^komisyjny\s+projekt\s+/i, 'komisyjny'],
  [/^obywatelski\s+projekt\s+/i, 'obywatelski'],
  [/^przedstawiony\s+przez\s+prezydenta\s+rzeczypospolitej\s+polskiej\s+projekt\s+/i, 'prezydencki'],
];

const wielka = (s: string) => s.charAt(0).toLocaleUpperCase('pl-PL') + s.slice(1);

export function tytulUstawy(tytul: string): TytulUstawy {
  let reszta = tytul.trim();
  let autor: string | null = null;
  for (const [wzor, kto] of AUTOR) {
    if (wzor.test(reszta)) {
      reszta = reszta.replace(wzor, '');
      autor = kto;
      break;
    }
  }
  if (!autor) return { krotki: tytul.trim(), autor: null };
  // Zostało „ustawy o …” / „ustawy budżetowej …” / „ustawy zmieniającej ustawę …”.
  if (/^ustawy\s+o\s+zmianie\s+/i.test(reszta)) {
    return { krotki: wielka(reszta.replace(/^ustawy\s+o\s+zmianie\s+/i, 'zmiana ')), autor };
  }
  if (/^ustawy\s+zmieniającej\s+/i.test(reszta)) {
    return { krotki: wielka(reszta.replace(/^ustawy\s+zmieniającej\s+ustawę\s+/i, 'zmiana ustawy ').replace(/^ustawy\s+zmieniającej\s+/i, 'zmiana ')), autor };
  }
  if (/^ustawy\s+budżetowej\s+/i.test(reszta)) {
    return { krotki: wielka(reszta.replace(/^ustawy\s+budżetowej\s+/i, 'ustawa budżetowa ')), autor };
  }
  if (/^ustawy\s+o\s+/i.test(reszta)) {
    return { krotki: wielka(reszta.replace(/^ustawy\s+/i, 'ustawa ')), autor };
  }
  return { krotki: tytul.trim(), autor: null };
}
