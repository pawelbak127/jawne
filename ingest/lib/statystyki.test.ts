import { describe, expect, it } from 'vitest';
import { czyOdslona, czyRobot, dzienPolski, licznikOdwiedzin, nazwaRobota, podsumuj, rodzajStrony, type WpisDziennika } from './statystyki';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1';

// 03.10.2026 12:00 czasu warszawskiego = 10:00 UTC
const POLUDNIE = Date.UTC(2026, 9, 3, 10, 0, 0) / 1000;

const wpis = (o: {
  ts?: number; ip?: string; ua?: string; uri?: string; status?: number;
  typ?: string; ref?: string; metoda?: string; rsc?: boolean; jezyk?: string; sfs?: string;
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
      // Kazda prawdziwa przegladarka wysyla Accept-Language; '' = bez naglowka.
      ...(o.jezyk === '' ? {} : { 'Accept-Language': [o.jezyk ?? 'pl-PL,pl;q=0.9,en-US;q=0.8'] }),
      ...(o.ref ? { Referer: [o.ref] } : {}),
      ...(o.rsc ? { RSC: ['1'] } : {}),
      ...(o.sfs ? { 'Sec-Fetch-Site': [o.sfs] } : {}),
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
      '/gmina/121701/opengraph-image', '/posel/jan-kowalski/zdjecie', '/posel/jan-kowalski/miniatura', '/mapa/gminy.json']) {
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
    'facebookexternalhit/1.1', 'GPTBot/1.0', 'Mozilla/5.0 HeadlessChrome/140', 'ClaudeBot/1.0',
    // ZMIERZONE 13.10.2026: 94% ruchu, podpis Chrome z dopiskiem na koncu. Lapal go
    // juz „crawl” z adresu w podpisie; „externalagent” na wypadek, gdyby adres zniknal.
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))',
  ])('%s', (ua) => {
    expect(czyRobot(wpis({ ua }))).toBe(true);
  });
  it('brak przeglądarki to też robot', () => {
    expect(czyRobot(wpis({ ua: '' }))).toBe(true);
  });
  it('zwykłe przeglądarki — nie', () => {
    expect(czyRobot(wpis({ ua: CHROME }))).toBe(false);
    expect(czyRobot(wpis({ ua: SAFARI }))).toBe(false);
  });
  it('podpis Chrome bez Accept-Language — robot (zmierzone 26.10.2026: 23 302 „wejścia z Google”)', () => {
    const udawany = wpis({ ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
      jezyk: '', ref: 'https://www.google.com/', uri: '/firma/5260152844' });
    expect(czyRobot(udawany)).toBe(true);
    const p = podsumuj([udawany, wpis({ uri: '/' })], OPCJE);
    expect([p.odslon, p.robotow, p.zrodla]).toEqual([1, 1, []]);
  });
  it('nasz Referer przy Sec-Fetch-Site: none — robot (zmierzone 28.10.2026: 703 odsłony)', () => {
    const udawany = { jezyk: 'en-US,en;q=0.9', sfs: 'none', uri: '/glosowanie/67-10' };
    expect(czyRobot(wpis({ ...udawany, ref: 'https://zrejestru.pl/posel/piotr-krol' }))).toBe(true);
    expect(czyRobot(wpis({ ...udawany, ref: 'https://www.zrejestru.pl/' }))).toBe(true);
    // Przejście z naszej strony w prawdziwej przeglądarce:
    expect(czyRobot(wpis({ ...udawany, sfs: 'same-origin', ref: 'https://zrejestru.pl/posel/piotr-krol' }))).toBe(false);
    // Adres wpisany ręką albo zakładka — „none” bez Referera:
    expect(czyRobot(wpis({ ...udawany }))).toBe(false);
    // Przeglądarka bez Sec-Fetch-* (starsze Safari) z naszym Refererem:
    expect(czyRobot(wpis({ ref: 'https://zrejestru.pl/' }))).toBe(false);
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

  it('ChatGPT bez Referera, z utm_source=chatgpt.com — to też źródło (zmierzone 02.11.2026)', () => {
    const p = podsumuj([
      wpis({ uri: '/glosowanie/67-93?utm_source=chatgpt.com' }),
      wpis({ uri: '/ustawa/3003?utm_source=chatgpt.com', ip: '1.1.1.0' }),
      // Odsyłacz zewnętrzny ma pierwszeństwo przed parametrem.
      wpis({ uri: '/sala?utm_source=chatgpt.com', ref: 'https://www.google.com/', ip: '2.2.2.0' }),
    ], OPCJE);
    expect(p.zrodla).toEqual([{ host: 'chatgpt.com', wejsc: 2 }, { host: 'google.com', wejsc: 1 }]);
    expect(p.strony.find((s) => s.sciezka === '/glosowanie/67-93')?.odslony).toBe(1);
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

describe('roboty po nazwie (zmierzone 02.11.2026: ok. 50 tys. zapytań na dobę)', () => {
  it('nazwa z podpisu, także gdy w środku podpisu przeglądarki', () => {
    expect(nazwaRobota(wpis({ ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot' }))).toBe('OAI-SearchBot');
    expect(nazwaRobota(wpis({ ua: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)' }))).toBe('AhrefsBot');
    expect(nazwaRobota(wpis({ ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }))).toBe('facebookexternalhit');
    expect(nazwaRobota(wpis({ ua: 'curl/8.5.0' }))).toBe('curl');
    expect(nazwaRobota(wpis({ ua: '' }))).toBe('bez podpisu');
  });
  it('robot z podpisem przeglądarki, złapany na nagłówkach, nie dostaje cudzej nazwy', () => {
    expect(nazwaRobota(wpis({ jezyk: '' }))).toBe('podpis przeglądarki, nagłówki się nie zgadzają');
  });
  it('zestawienie robotów w podsumowaniu, ludzie osobno', () => {
    const ahrefs = 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)';
    const p = podsumuj([wpis({ ua: ahrefs }), wpis({ ua: ahrefs, uri: '/gmina/100101' }), wpis({ ua: 'curl/8' }), wpis({})], OPCJE);
    expect(p.robotow).toBe(3);
    expect(p.roboty).toEqual([{ nazwa: 'AhrefsBot', zapytan: 2 }, { nazwa: 'curl', zapytan: 1 }]);
    expect(p.odslon).toBe(1);
  });
  it('licznik wpis po wpisie daje to samo co podsumowanie tablicy', () => {
    const wpisy = [wpis({}), wpis({ ip: '91.1.2.0', uri: '/posel/x' }), wpis({ ua: 'curl/8' }), wpis({ status: 404 })];
    const l = licznikOdwiedzin(OPCJE);
    for (const w of wpisy) l.dodaj(w);
    expect(l.wynik()).toEqual(podsumuj(wpisy, OPCJE));
  });
});
