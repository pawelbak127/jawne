/**
 * Statystyki odwiedzin z dziennika wejsc Caddy (deploy/Caddyfile).
 *
 * Czemu nie narzedzie zewnetrzne (Google Analytics, Plausible itp.):
 * kazde z nich to skrypt w przegladarce czytelnika i trzecia strona, ktora
 * widzi ruch — a polityka prywatnosci obiecuje, ze takiej nie ma. Dziennik
 * serwera i tak powstaje przy kazdym wejsciu, wiec liczymy z niego, bez
 * ciasteczek i bez zgody, ktorej nie trzeba zbierac.
 *
 * CO TU ZNACZY „OSOBA": rozna para (adres IP skrocony do /24, przegladarka)
 * w ciagu jednej doby. To SZACUNEK Z DOLU — dwie osoby z tej samej sieci
 * domowej i z ta sama przegladarka licza sie jako jedna — i raport mowi to
 * wprost, tak jak strona przy kazdej liczbie podaje mianownik (zasada 3).
 *
 * DOBA jest polska, nie UTC (pulapka 42): wejscie o 00:30 w Warszawie to
 * 22:30 UTC dnia poprzedniego i bez przeliczenia trafialoby do zlej doby.
 */

export type WpisDziennika = {
  ts: number;
  status: number;
  request: {
    remote_ip?: string;
    client_ip?: string;
    method?: string;
    host?: string;
    uri?: string;
    headers?: Record<string, string[] | undefined>;
  };
  resp_headers?: Record<string, string[] | undefined>;
};

export type Podsumowanie = {
  od: string | null;
  do: string | null;
  dni: { dzien: string; osoby: number; odslony: number }[];
  osobWOkresie: number;
  odslon: number;
  strony: { sciezka: string; odslony: number; osoby: number }[];
  rodzaje: { rodzaj: string; odslony: number }[];
  zrodla: { host: string; wejsc: number }[];
  robotow: number;
  pominietych: number;
};

/*
 * Roboty rozpoznajemy po przegladarce. Lista celowo szeroka: zawyzone
 * odwiedziny sa gorsze niz zanizone, bo z zawyzonych ktos wyciagnie
 * wniosek, ze serwis jest czytany. Brak przegladarki to tez robot.
 */
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|scrap|curl|wget|python|httpx|go-http|java\/|okhttp|axios|node-fetch|undici|headless|lighthouse|pagespeed|monitor|uptime|pingdom|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claude|perplexity|ccbot|dataforseo|censys|zgrab|masscan|nmap/i;

/** Pliki, ktore nie sa „strona" — nawet jesli przegladarka je pobrala. */
const NIE_STRONA = /^\/(api|_next)\/|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\/opengraph-image|\/zdjecie$|\.(png|jpe?g|svg|webp|ico|json|txt|xml|css|js|map|woff2?)$/i;

const dobaPolska = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function dzienPolski(ts: number): string {
  return dobaPolska.format(new Date(ts * 1000));
}

const naglowek = (h: Record<string, string[] | undefined> | undefined, nazwa: string): string => {
  if (!h) return '';
  const klucz = Object.keys(h).find((k) => k.toLowerCase() === nazwa.toLowerCase());
  return (klucz && h[klucz]?.[0]) || '';
};

/** Sciezka bez parametrow — /ustawa/123?_rsc=x i /ustawa/123 to ta sama strona. */
function sciezka(uri: string): string {
  const s = uri.split('?')[0] || '/';
  return s.length > 1 && s.endsWith('/') ? s.slice(0, -1) : s;
}

/** Rodzaj strony: pierwszy segment adresu. „/" to strona glowna. */
export function rodzajStrony(s: string): string {
  if (s === '/') return 'strona główna';
  return s.split('/')[1] || s;
}

export function czyOdslona(w: WpisDziennika): boolean {
  if ((w.request.method ?? 'GET') !== 'GET') return false;
  if (w.status !== 200 && w.status !== 304) return false;
  const s = sciezka(w.request.uri ?? '/');
  if (NIE_STRONA.test(s)) return false;
  // Odslona to dokument HTML albo nawigacja w przegladarce (RSC). Zadania
  // wyprzedzajace (prefetch) odcina juz Caddy — patrz log_skip w Caddyfile.
  const typ = naglowek(w.resp_headers, 'Content-Type');
  const rsc = naglowek(w.request.headers, 'RSC') === '1' || (w.request.uri ?? '').includes('_rsc=');
  return rsc || typ === '' || typ.startsWith('text/html') || typ.startsWith('text/x-component');
}

export function czyRobot(w: WpisDziennika): boolean {
  const ua = naglowek(w.request.headers, 'User-Agent');
  return ua === '' || ROBOT.test(ua);
}

export function podsumuj(
  wpisy: Iterable<WpisDziennika>,
  opcje: { dni: number; teraz: number; naszHost: string; ileStron?: number },
): Podsumowanie {
  const prog = dzienPolski(opcje.teraz - opcje.dni * 86_400);
  const naDzien = new Map<string, { osoby: Set<string>; odslony: number }>();
  const wszystkieOsoby = new Set<string>();
  const strony = new Map<string, { odslony: number; osoby: Set<string> }>();
  const rodzaje = new Map<string, number>();
  const zrodla = new Map<string, number>();
  let robotow = 0;
  let pominietych = 0;
  let od: string | null = null;
  let doDnia: string | null = null;

  for (const w of wpisy) {
    const dzien = dzienPolski(w.ts);
    if (dzien <= prog) continue;
    if (czyRobot(w)) { robotow++; continue; }
    if (!czyOdslona(w)) { pominietych++; continue; }

    if (!od || dzien < od) od = dzien;
    if (!doDnia || dzien > doDnia) doDnia = dzien;
    const ua = naglowek(w.request.headers, 'User-Agent');
    const ip = w.request.client_ip || w.request.remote_ip || '?';
    const osoba = `${dzien}|${ip}|${ua}`;
    const osobaWOkresie = `${ip}|${ua}`;

    const d = naDzien.get(dzien) ?? { osoby: new Set(), odslony: 0 };
    d.osoby.add(osoba); d.odslony++;
    naDzien.set(dzien, d);
    wszystkieOsoby.add(osobaWOkresie);

    const s = sciezka(w.request.uri ?? '/');
    const st = strony.get(s) ?? { odslony: 0, osoby: new Set() };
    st.odslony++; st.osoby.add(osobaWOkresie);
    strony.set(s, st);
    rodzaje.set(rodzajStrony(s), (rodzaje.get(rodzajStrony(s)) ?? 0) + 1);

    // Zrodlo liczymy tylko dla wejsc z ZEWNATRZ — przejscia miedzy naszymi
    // stronami maja odsylacz z naszym adresem i nic o zrodle nie mowia.
    const ref = naglowek(w.request.headers, 'Referer');
    if (ref) {
      try {
        const h = new URL(ref).hostname.replace(/^www\./, '');
        if (h && h !== opcje.naszHost && h !== `www.${opcje.naszHost}`) zrodla.set(h, (zrodla.get(h) ?? 0) + 1);
      } catch { /* odsylacz, ktory nie jest adresem — pomijamy */ }
    }
  }

  const odslon = [...naDzien.values()].reduce((a, d) => a + d.odslony, 0);
  return {
    od,
    do: doDnia,
    dni: [...naDzien.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([dzien, d]) => ({ dzien, osoby: d.osoby.size, odslony: d.odslony })),
    osobWOkresie: wszystkieOsoby.size,
    odslon,
    strony: [...strony.entries()].map(([s, v]) => ({ sciezka: s, odslony: v.odslony, osoby: v.osoby.size }))
      .sort((a, b) => b.odslony - a.odslony || a.sciezka.localeCompare(b.sciezka))
      .slice(0, opcje.ileStron ?? 15),
    rodzaje: [...rodzaje.entries()].map(([rodzaj, n]) => ({ rodzaj, odslony: n }))
      .sort((a, b) => b.odslony - a.odslony),
    zrodla: [...zrodla.entries()].map(([host, n]) => ({ host, wejsc: n }))
      .sort((a, b) => b.wejsc - a.wejsc).slice(0, 10),
    robotow,
    pominietych,
  };
}
