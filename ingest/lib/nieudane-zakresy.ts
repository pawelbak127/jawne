import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Pamiec o zakresach, ktorych kolejka UOKiK nie oddala — TRWALA, na dysku.
 *
 * ZGLOSZENIE PAWLA 02.10.2026: `sudo jawne stan` pokazal w dzienniku
 * **dziesiec razy ten sam wiersz** „przerwane: 2024-12-17..2024-12-19".
 *
 * Mechanizm, i jest to luka w moim wlasnym projekcie z 27.09: `sudop.ts`
 * trzyma zbior `zBledem` i pomija po bledzie zakres, ktory wlasnie padl —
 * ale **ten zbior zyje tylko w pamieci procesu**. Timer historii odpala sie
 * CO GODZINE, a `planHistorii` stawia kazdy przerwany zakres na pierwszym
 * miejscu, bo jego strony leza na dysku i wznowienie jest najtansze. Wiec
 * kazdy przebieg startowal z czysta karta, brał ten sam zakres, czekal na
 * kolejke i konczyl niczym. Zabezpieczenie dzialalo w obrebie jednej nocy,
 * a timer sprawil, ze „noc" trwa godzine.
 *
 * Trap 26 opisuje zakres, ktory nie wrocil **ani razu w czterech probach po
 * 57 minut**. Taki zakres przy godzinnym timerze zjadalby dobe za doba.
 *
 * Dlatego przerwa rosnie wykladniczo: po pierwszej porazce godzina, potem
 * dwie, cztery… do dwudziestu czterech. **Nigdy nie porzucamy zakresu na
 * zawsze** — po przerwie wraca, bo urzad bywa chwilowo przeciazony (tempo
 * odpowiedzi zmienilo sie u niego dwukrotnie w ciagu dwoch dni).
 *
 * Ta zmiana ZMNIEJSZA liczbe zapytan do urzedu, nie zwieksza — tempo
 * zatwierdzone przez Pawla zostaje nietkniete.
 */
export type Porazka = { prob: number; ostatnia: string };
export type Nieudane = Record<string, Porazka>;

const PLIK = '.nieudane.json';

/** Przerwa po n-tej porazce: 1 h, 2 h, 4 h … najwyzej 24 h. */
export function przerwaGodzin(prob: number): number {
  if (prob <= 0) return 0;
  return Math.min(24, 2 ** (prob - 1));
}

export function wczytajNieudane(katalog: string): Nieudane {
  const p = join(katalog, PLIK);
  if (!existsSync(p)) return {};
  try {
    const j = JSON.parse(readFileSync(p, 'utf8')) as unknown;
    return j && typeof j === 'object' ? (j as Nieudane) : {};
  } catch {
    // Uszkodzony plik nie moze zablokowac pobierania — zaczynamy od nowa.
    return {};
  }
}

export function zapiszNieudane(katalog: string, n: Nieudane): void {
  writeFileSync(join(katalog, PLIK), `${JSON.stringify(n, null, 1)}\n`, 'utf8');
}

/** Odnotowuje porazke zakresu; zwraca nowy stan. */
export function dopiszPorazke(n: Nieudane, zakres: string, teraz: Date): Nieudane {
  const b = n[zakres];
  return { ...n, [zakres]: { prob: (b?.prob ?? 0) + 1, ostatnia: teraz.toISOString() } };
}

/** Zakres udal sie — zapominamy o nim. */
export function zapomnij(n: Nieudane, zakres: string): Nieudane {
  if (!(zakres in n)) return n;
  const k = { ...n };
  delete k[zakres];
  return k;
}

/**
 * Zakresy, ktorych TERAZ nie probujemy, bo ich przerwa jeszcze nie minela.
 * Zwracamy zbior, bo tego oczekuje `planHistorii`.
 */
export function doPominiecia(n: Nieudane, teraz: Date): Set<string> {
  const pomin = new Set<string>();
  for (const [zakres, p] of Object.entries(n)) {
    const minelo = (teraz.getTime() - new Date(p.ostatnia).getTime()) / 3_600_000;
    if (minelo < przerwaGodzin(p.prob)) pomin.add(zakres);
  }
  return pomin;
}

/** Do dziennika: co odkladamy i na jak dlugo. */
export function opisPominietych(n: Nieudane, teraz: Date): string[] {
  const opisy: string[] = [];
  for (const [zakres, p] of Object.entries(n)) {
    const minelo = (teraz.getTime() - new Date(p.ostatnia).getTime()) / 3_600_000;
    const przerwa = przerwaGodzin(p.prob);
    if (minelo < przerwa) {
      opisy.push(`${zakres}: ${p.prob} porazek, wraca za ${Math.ceil(przerwa - minelo)} h`);
    }
  }
  return opisy;
}
