import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Kontrast tekstu wobec tła — liczony z `globals.css`, nie z listy w teście.
 *
 * ZMIERZONE 03.10.2026, w przeglądzie UI: `--atrament-3` miał **3,05–3,51:1**
 * w motywie jasnym i **3,27–3,95:1** w ciemnym, przy wymaganych 4,5:1 (WCAG
 * 2.1 AA, tekst zwykły). Na samej stronie gminy to 251 elementów.
 *
 * Nie jest to usterka kosmetyczna, i dlatego ma test, a nie wpis w planie:
 * tym kolorem napisane są **odnośniki do rejestru** (`Zrodlo`) i akapity
 * wyjaśniające pod liczbami. Zasada 1 mówi, że odnośnik przy liczbie ma
 * wyglądać jak element interfejsu — a element, którego część czytelników
 * nie widzi, nie jest elementem interfejsu. Komentarz przy zmiennej mówił
 * „metki, znaki wodne" i wtedy 3,5:1 byłoby obronne; dziś niesie treść.
 *
 * Test czyta plik, żeby nie dało się zmienić palety bez zmiany tego progu —
 * ta sama zasada co w `kluby.test.ts`, gdzie mierzymy dystans CIE76 barw
 * sąsiadów zamiast ufać, że ktoś pamiętał.
 */
const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/**
 * Palety wyszukiwane po `--papier:`, a NIE po nazwie selektora.
 *
 * Pierwsza wersja tego testu kotwiczyła się na „@media (prefers-color-scheme:
 * dark)" i brała `indexOf` — a ten napis występuje w pliku najpierw
 * w KOMENTARZU nagłówka (wiersz 13, o pułapce 15) i w `@custom-variant`.
 * Test porównywał więc paletę jasną z ciemną i wywalał się na wszystkim.
 * Deklaracja jest jednoznaczna, nazwa selektora nie.
 */
function palety(): Map<string, string>[] {
  const znalezione: Map<string, string>[] = [];
  const re = /--papier:/g;
  for (let m = re.exec(CSS); m; m = re.exec(CSS)) {
    const koniec = CSS.indexOf('}', m.index);
    const blok = CSS.slice(m.index, koniec === -1 ? undefined : koniec);
    const mapa = new Map<string, string>();
    for (const [, nazwa, hex] of blok.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
      mapa.set(nazwa!, hex!.toLowerCase());
    }
    znalezione.push(mapa);
  }
  return znalezione;
}

const PALETY = palety();

function jasnosc(hex: string): number {
  const kanal = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** Iloraz kontrastu WCAG. 4,5:1 to próg AA dla tekstu zwykłej wielkości. */
export function kontrast(a: string, b: string): number {
  const [jasny, ciemny] = [jasnosc(a), jasnosc(b)].sort((x, y) => y - x) as [number, number];
  return (jasny + 0.05) / (ciemny + 0.05);
}

const AA = 4.5;
const TLA = ['papier', 'papier-2', 'papier-3'];
const TEKSTY = ['atrament', 'atrament-2', 'atrament-3'];
const NAZWY = ['jasny', 'ciemny (systemowy)', 'ciemny (przełącznik)'];

describe('paleta w globals.css', () => {
  it('ma dokładnie trzy motywy', () => {
    // Czwarta paleta znaczy, ze ktos dodal motyw, ktorego ten test nie bada.
    expect(PALETY).toHaveLength(3);
  });
});

describe.each(PALETY.map((p, i) => [NAZWY[i] ?? `paleta ${i}`, p] as const))(
  'motyw %s',
  (_nazwa, paleta) => {
    it.each(TEKSTY)('%s przechodzi AA na każdym tle', (tekst) => {
      const t = paleta.get(tekst);
      expect(t, `nie ma --${tekst}`).toBeDefined();
      for (const tlo of TLA) {
        const b = paleta.get(tlo);
        expect(b, `nie ma --${tlo}`).toBeDefined();
        const k = kontrast(t!, b!);
        expect(k, `--${tekst} na --${tlo}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      }
    });

    it('akcent przechodzi AA na papierze i na karcie', () => {
      // Akcentem sa odnosniki — AA obowiazuje tak samo jak przy tekscie.
      const a = paleta.get('akcent')!;
      for (const tlo of ['papier', 'papier-2']) {
        const k = kontrast(a, paleta.get(tlo)!);
        expect(k, `--akcent na --${tlo}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      }
    });
  },
);

describe('oba motywy ciemne są identyczne', () => {
  /*
   * Blok spod @media i blok spod [data-motyw] to dwie KOPIE tej samej palety
   * (Tailwind 4: `dark:` słucha tylko systemu, dopóki nie ma
   * `@custom-variant` — pułapka 15). Rozjazd między nimi znaczyłby, że
   * przełącznik daje inne barwy niż ustawienie systemowe — i nikt by tego
   * nie zauważył, bo każdy ogląda serwis w jednym z tych dwóch trybów.
   */
  it.each([...TEKSTY, ...TLA, 'akcent', 'kreska', 'kreska-2'])('--%s', (n) => {
    expect(PALETY[1]!.get(n)).toBe(PALETY[2]!.get(n));
  });
});
