import { createHash } from 'node:crypto';

/**
 * Skrot opisu rejestru — po nim poznajemy, ze streszczenie z pliku
 * ingest/zrodla/streszczenia/ustawy.json dotyczy TEGO SAMEGO tekstu,
 * ktory jest dzis w rejestrze. Gdy Sejm zmieni opis, skrot sie rozjedzie,
 * a stare streszczenie przestanie sie pokazywac samo.
 */
export function skrotOpisu(opis: string): string {
  return createHash('sha256').update(opis.trim(), 'utf8').digest('hex').slice(0, 16);
}

export type WpisStreszczenia = {
  tekst: string;
  zrodlo_skrot: string;
  model: string;
  przygotowano: string;
};
