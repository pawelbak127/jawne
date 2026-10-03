import { describe, expect, it } from 'vitest';
import { czyOdslona, czyRobot, dzienPolski, podsumuj, rodzajStrony, type WpisDziennika } from './statystyki';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1';

// 03.10.2026 12:00 czasu warszawskiego = 10:00 UTC
const POLUDNIE = Date.UTC(2026, 9, 3, 10, 0, 0) / 1000;

const wpis = (o: {
  ts?: number; ip?: string; ua?: string; uri?: string; status?: number;
  typ?: string; ref?: string; metoda?: string; rsc?: boolean;
}): WpisDziennika => ({
  ts: o.ts ?? POLUDNIE,
  status: o.status ?? 200,
  request: {
    remote_ip: o.ip ?? '83.10.20.0',
    method: o.metoda ?? 'GET',
    host: 'zrejestru.pl',
    uri: o.uri ?? '/',
    headers: {
      'User-Agent': o.ua === '' ? undefined : [o.ua ?? CHROME],
      ...(o.ref ? { Referer: [o.ref] } : {}),
      ...(o.rsc ? { RSC: ['1'] } : {}),
    },
  },
  resp_headers: { 'Content-Type': [o.typ ?? 'text/html; charset=utf-8'] },
});

const OPCJE = { dni: 30, teraz: POLUDNIE, naszHost: 'zrejestru.pl' };

describe('doba polska, nie UTC (pułapka 42)', () => {
  it('00:30 w Warszawie należy do TEGO dnia, choć w UTC to wciąż poprzedni', () => {
    const ts = Date.UTC(2026, 9, 2, 22, 30, 0) / 1000;   // 03.10 00:30 CEST
    expect(dzienPolski(ts)).toBe('2026-10-03');
  });
  it('zmiana czasu w październiku: 25.10 o 23:30 UTC to już 26.10 w Warszawie', () => {
    expect(dzienPolski(Date.UTC(2026, 9, 25, 23, 30) / 1000)).toBe('2026-10-26');
  });
});

describe('co jest odsłoną', () => {
  it('dokument HTML i nawigacja w przeglądarce (RSC) — tak', () => {
    expect(czyOdslona(wpis({ uri: '/gmina/121701' }))).toBe(true);
    expect(czyOdslona(wpis({ uri: '/ustawa/3126?_rsc=ab12', typ: 'text/x-component', rsc: true }))).toBe(true);
  });
  it('API, pliki Next, mapa strony, obrazki podglądu i zdjęcia posłów — nie', () => {
    for (const uri of ['/api/szukaj', '/_next/static/x.js', '/sitemap.xml', '/robots.txt',
      '/gmina/121701/opengraph-image', '/posel/jan-kowalski/zdjecie', '/mapa/gminy.json']) {
      expect(czyOdslona(wpis({ uri })), uri).toBe(false);
    }
  });
  it('błąd, przekierowanie i POST — nie', () => {
    expect(czyOdslona(wpis({ status: 404 }))).toBe(false);
    expect(czyOdslona(wpis({ status: 308 }))).toBe(false);
    expect(czyOdslona(wpis({ metoda: 'POST' }))).toBe(false);
  });
  it('304 (strona z pamięci przeglądarki) — tak, bo człowiek ją otworzył', () => {
    expect(czyOdslona(wpis({ status: 304 }))).toBe(true);
  });
});

describe('roboty', () => {
  it.each(['Googlebot/2.1', 'Mozilla/5.0 (compatible; bingbot/2.0)', 'curl/8.5', 'python-requests/2.31',
    'facebookexternalhit/1.1', 'GPTBot/1.0', 'Mozilla/5.0 HeadlessChrome/140', 'ClaudeBot/1.0'])('%s', (ua) => {
    expect(czyRobot(wpis({ ua }))).toBe(true);
  });
  it('brak przeglądarki to też robot', () => {
    expect(czyRobot(wpis({ ua: '' }))).toBe(true);
  });
  it('zwykłe przeglądarki — nie', () => {
    expect(czyRobot(wpis({ ua: CHROME }))).toBe(false);
    expect(czyRobot(wpis({ ua: SAFARI }))).toBe(false);
  });
});

describe('podsumowanie', () => {
  it('osoba = para (IP /24, przeglądarka) w ciągu doby', () => {
    const p = podsumuj([
      wpis({ uri: '/' }),
      wpis({ uri: '/gmina/121701' }),                  // ta sama osoba, druga odsłona
      wpis({ uri: '/gmina/121701', ua: SAFARI }),       // ta sama sieć, inny telefon
      wpis({ uri: '/posel/x', ip: '91.1.2.0' }),        // inna sieć
      wpis({ uri: '/', ts: POLUDNIE - 86_400 }),        // ta sama osoba DZIEŃ wcześniej
    ], OPCJE);
    expect(p.dni).toEqual([
      { dzien: '2026-10-02', osoby: 1, odslony: 1 },
      { dzien: '2026-10-03', osoby: 3, odslony: 4 },
    ]);
    // W całym okresie ta sama para liczy się raz — suma dni ≠ osoby w okresie.
    expect(p.osobWOkresie).toBe(3);
    expect(p.odslon).toBe(5);
  });

  it('roboty i nie-odsłony są policzone osobno, nie znikają po cichu', () => {
    const p = podsumuj([
      wpis({ ua: 'Googlebot/2.1' }),
      wpis({ ua: 'Googlebot/2.1', uri: '/gmina/1' }),
      wpis({ uri: '/api/szukaj' }),
      wpis({}),
    ], OPCJE);
    expect(p.robotow).toBe(2);
    expect(p.pominietych).toBe(1);
    expect(p.odslon).toBe(1);
  });

  it('źródła: tylko zewnętrzne odsyłacze, po domenie, bez www', () => {
    const p = podsumuj([
      wpis({ ref: 'https://www.google.com/' }),
      wpis({ ref: 'https://google.com/', ip: '1.1.1.0' }),
      wpis({ ref: 'https://zrejestru.pl/' }),           // przejście wewnętrzne
      wpis({ ref: 'https://www.zrejestru.pl/gminy' }),  // też wewnętrzne
      wpis({ ref: 'android-app://com.slack' }),         // nie adres http — ale host jest
      wpis({ ref: 'nie-adres' }),
    ], OPCJE);
    expect(p.zrodla.find((z) => z.host === 'google.com')?.wejsc).toBe(2);
    expect(p.zrodla.some((z) => z.host.includes('zrejestru'))).toBe(false);
  });

  it('strona z parametrem nawigacji to ta sama strona', () => {
    const p = podsumuj([
      wpis({ uri: '/ustawa/3126' }),
      wpis({ uri: '/ustawa/3126?_rsc=x1', rsc: true, typ: 'text/x-component' }),
      wpis({ uri: '/ustawa/3126/' }),
    ], OPCJE);
    expect(p.strony).toEqual([{ sciezka: '/ustawa/3126', odslony: 3, osoby: 1 }]);
  });

  it('wpisy starsze niż okno nie wchodzą', () => {
    const p = podsumuj([wpis({ ts: POLUDNIE - 40 * 86_400 }), wpis({})], OPCJE);
    expect(p.odslon).toBe(1);
    expect(p.od).toBe('2026-10-03');
  });

  it('pusty dziennik to stan, nie awaria', () => {
    const p = podsumuj([], OPCJE);
    expect(p).toMatchObject({ od: null, do: null, dni: [], odslon: 0, osobWOkresie: 0 });
  });
});

describe('rodzaj strony', () => {
  it.each([['/', 'strona główna'], ['/gmina/121701', 'gmina'], ['/posel/a-b', 'posel'], ['/szukaj', 'szukaj']])(
    '%s -> %s', (s, r) => expect(rodzajStrony(s)).toBe(r),
  );
});
