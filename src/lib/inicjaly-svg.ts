import { inicjaly } from './format';

/**
 * Inicjaly jako obrazek — dla posla bez zdjecia w rejestrze. Trasa obrazka
 * NIE zwraca wtedy 404: przy `<img>` dawaloby to ikonke zepsutego obrazka,
 * ktora wyglada na awarie serwisu, a to zwykly brak danych w rejestrze.
 * Wspolne dla /posel/[slug]/zdjecie i /posel/[slug]/miniatura.
 */
export function inicjalyJakoSvg(imieNazwisko: string): string {
  const litery = inicjaly(imieNazwisko).replace(/[<>&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" fill="#f1efe9"/>
  <text x="80" y="80" font-family="system-ui, sans-serif" font-size="54" font-weight="600"
        fill="#8b8794" text-anchor="middle" dominant-baseline="central">${litery}</text>
</svg>`;
}

/** Zdjecie posla nie zmienia sie w trakcie kadencji. */
export const PAMIEC_PORTRETU = 'public, max-age=86400, stale-while-revalidate=604800';
