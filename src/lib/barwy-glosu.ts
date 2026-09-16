import type { CSSProperties } from 'react';
import { etykieta, type Etykieta } from './glosy';

/**
 * Barwy sposobu glosowania. W odroznieniu od barw klubow te SA semantyczne:
 * zielony "za" i czerwony "przeciw" czyta kazdy bez legendy.
 */
export const BARWY_GLOSU: Record<Etykieta['ton'], { jasny: string; ciemny: string }> = {
  za: { jasny: '#1b9e63', ciemny: '#34b87c' },
  przeciw: { jasny: '#d2453f', ciemny: '#e2635d' },
  wstrzymal: { jasny: '#e0a021', ciemny: '#d9a52e' },
  brak: { jasny: '#cfcbc0', ciemny: '#3a3945' },
  inne: { jasny: '#8b8794', ciemny: '#736f7e' },
};

/** Zmienne CSS dla klasy `miejsce-probka`, ktora sama przelacza motyw. */
export function stylGlosu(glos: string): CSSProperties {
  const b = BARWY_GLOSU[etykieta(glos).ton];
  return { '--b': b.jasny, '--bc': b.ciemny } as CSSProperties;
}
