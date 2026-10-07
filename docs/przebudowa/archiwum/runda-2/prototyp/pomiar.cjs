// Pomiar fundamentu F1–F14 (docs/przebudowa/runda-2.md) na każdej stronie prototypu,
// w każdym motywie, na 390 i 1280 px. Wynik: pomiar.json (surowe) i tabela na stdout.
//
//   node pomiar.cjs                 wszystko (ok. 10 min)
//   node pomiar.cjs gmina,posel a,j tylko wybrane strony i motywy
//
// Wymaga Playwrighta z Chromium. Mierzy stronę BEZ elementów, których na prawdziwej
// stronie nie będzie: paska „Motyw”, ramki „Prototyp” i notek projektowych.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const DIR = __dirname;
const WSZYSTKIE = ['glowna', 'gmina', 'posel', 'firma', 'ustawa', 'glosowanie', 'okreg', 'pomoc-publiczna',
  'ustawy', 'glosowania', 'poslowie', 'firmy', 'szukaj'];
const SZCZEGOL = new Set(['gmina', 'posel', 'firma', 'ustawa', 'glosowanie', 'okreg']);
const strony = (process.argv[2] || WSZYSTKIE.join(',')).split(',');
const motywy = (process.argv[3] || 'a,b,c,d,e,f,g,h,i,j').split(',');

// Wszystko, co liczymy w przeglądarce. Jedna funkcja, żeby ten sam kod mierzył każdy przypadek.
function zmierz({ szer, wys, szczegol }) {
  for (const s of ['.kierunki-pasek', '.prototyp', '.notka-proj']) document.querySelectorAll(s).forEach(e => e.remove());
  const widoczny = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && e.checkVisibility?.({ checkOpacity: true }) !== false; };
  const y = e => e.getBoundingClientRect().top + scrollY;
  const dol = e => e.getBoundingClientRect().bottom + scrollY;
  const wynik = {};

  // F1 — pierwszy ekran = odpowiedź
  const h1 = document.querySelector('main h1');
  const skad = document.querySelector('.skad');
  const odp = [...document.querySelectorAll('[data-odpowiedz]')].filter(widoczny);
  wynik.f1 = {
    h1: h1 ? Math.round(dol(h1)) : null,
    skad: skad ? Math.round(dol(skad)) : null,
    pierwsza: odp.length ? Math.round(dol(odp[0])) : null,
    ostatnia: odp.length ? Math.round(Math.max(...odp.map(dol))) : null,
    ile: odp.length,
  };

  // F2 — układ typowy: nazwa z lewej u góry, szukanie i menu u góry
  const marka = document.querySelector('.marka');
  const pola = [...document.querySelectorAll('input[type=search]')].filter(widoczny);
  const menu = [...document.querySelectorAll('header nav a')].filter(widoczny);
  const gora = document.querySelector('.naglowek .gora') || document.querySelector('header');
  const kolumna = gora.getBoundingClientRect().left + parseFloat(getComputedStyle(gora).paddingLeft || 0);
  wynik.f2 = {
    // nazwa serwisu: lewy brzeg kolumny treści (± 8 px) i lewa ćwiartka okna; [odstęp od kolumny, wysokość]
    marka: marka ? [Math.round(Math.abs(marka.getBoundingClientRect().left - kolumna)) + (marka.getBoundingClientRect().left > szer / 4 ? 999 : 0), Math.round(y(marka))] : null,
    szukanie: pola.length ? Math.round(Math.min(...pola.map(y))) : null,
    menu: menu.length ? Math.round(Math.min(...menu.map(y))) : null,
  };

  // F3 — tło strony (jasność 0–1); dla F3 liczy się przebieg bez ustawienia systemu
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const jasnosc = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  wynik.f3 = +jasnosc(rgb(getComputedStyle(document.body).backgroundColor)).toFixed(3);

  // F4 — kolory: barwne (nasycone) tła i teksty poza znakami danych
  const ZNAKI = '.kropka, .glosy, .glosy *, .pasek, .pasek *, .slupki, .slupki *, .legenda .kropka, [data-znaczenie], [data-znaczenie] *';
  const hsl = ([r, g, b, a = 1]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return { h, s, l, a }; };
  const barwny = c => { const [r, g, b, a = 1] = rgb(c); return a > 0.05 && (Math.max(r, g, b) - Math.min(r, g, b)) / 255 > 0.12; };
  const tla = new Set(), teksty = new Set(), barwy = new Set();
  for (const e of document.querySelectorAll('header *, main *, footer *')) {
    if (!widoczny(e) || e.matches(ZNAKI)) continue;
    const st = getComputedStyle(e);
    if (rgb(st.backgroundColor).length && (rgb(st.backgroundColor)[3] ?? 1) > 0.05) { tla.add(st.backgroundColor); if (barwny(st.backgroundColor)) barwy.add('tło ' + st.backgroundColor); }
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) { teksty.add(st.color); if (barwny(st.color)) barwy.add('tekst ' + st.color); }
  }
  const odcienie = new Set([...barwy].map(b => Math.round(hsl(rgb(b.split(' ').slice(1).join(' '))).h / 30) % 12));
  wynik.f4 = { tla: tla.size, teksty: teksty.size, barwne: [...barwy], odcienie: odcienie.size,
    barwneTla: [...barwy].filter(b => b.startsWith('tło')).length };

  // F5 — pismo: nic poniżej 15 px; tekst ciągły ≥ 18/20 px, interlinia ≥ 1,5, wiersz 55–75 znaków
  const male = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    const p = n.parentElement; if (!n.textContent.trim() || !p || p.closest('.sr, script, style, noscript')) continue;
    if (!widoczny(p)) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 15) male.push(`${fs}px „${n.textContent.trim().slice(0, 30)}”`);
  }
  for (const e of document.querySelectorAll('input[type=search], input[type=text], select')) if (widoczny(e) && parseFloat(getComputedStyle(e).fontSize) < 15) male.push(`${getComputedStyle(e).fontSize} pole`);
  const ciagle = [...document.querySelectorAll('main p, main li')].filter(e => widoczny(e) && e.textContent.trim().length >= 80
    && !e.closest('.wiersz, table, .okruszek, .meta, nav, .drobny, .podpis-wykresu, .warunki, .skad, .stan-danych, .lista-paskow') && !e.querySelector('p, li, select, input'));
  // znaki w wierszu: liczone znak po znaku w każdym PEŁNYM wierszu (ostatni, niepełny, pominięty)
  const znakowWWierszu = e => { const linie = new Map(); const r = document.createRange(); const t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n; (n = t.nextNode());) for (let i = 0; i < n.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getClientRects()[0]; if (!b) continue;
      const k = Math.round(b.top / 4); linie.set(k, (linie.get(k) || 0) + 1); }
    const v = [...linie.entries()].sort((a, b) => a[0] - b[0]).map(x => x[1]); if (v.length < 3) return null; v.pop(); return v.reduce((a, b) => a + b, 0) / v.length; };
  const wiersze = ciagle.map(e => { const st = getComputedStyle(e); const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2;
    return { fs: parseFloat(st.fontSize), lh: lh / parseFloat(st.fontSize), znaki: szer >= 1024 ? znakowWWierszu(e) : null }; });
  const zn = wiersze.map(w => w.znaki).filter(Boolean).sort((a, b) => a - b);
  wynik.f5 = { ponizej15: male.length, przyklady: male.slice(0, 4),
    ciagly: wiersze.length ? Math.min(...wiersze.map(w => w.fs)) : null,
    interlinia: wiersze.length ? +Math.min(...wiersze.map(w => w.lh)).toFixed(2) : null,
    znakow: zn.length ? Math.round(zn[Math.floor(zn.length / 2)]) : null,
    znakowZakres: zn.length ? [Math.round(zn[0]), Math.round(zn[zn.length - 1])] : null };

  // F6 — najwyżej jeden obramowany blok na ekran (ramka z ≥ 3 stron albo cień), tylko w treści
  const bloki = [...document.querySelectorAll('main *')].filter(e => {
    if (!widoczny(e) || e.matches('input, select, textarea, button, summary, ' + ZNAKI)) return false;
    if (getComputedStyle(e).display.startsWith('inline')) return false;   // odnośnik w wierszu tekstu to nie blok
    const r = e.getBoundingClientRect(); if (r.width < 200 || r.height < 40) return false;
    const st = getComputedStyle(e);
    if (st.boxShadow && st.boxShadow !== 'none') return true;
    const boki = ['Top', 'Right', 'Bottom', 'Left'].filter(b => parseFloat(st['border' + b + 'Width']) >= 1 && st['border' + b + 'Style'] !== 'none' && (rgb(st['border' + b + 'Color'])[3] ?? 1) > 0.05);
    return boki.length >= 3;
  });
  const ekrany = Math.ceil(document.documentElement.scrollHeight / wys);
  let naEkran = 0;
  for (let k = 0; k < ekrany; k++) {
    const a = k * wys, b = a + wys;
    const ile = bloki.filter(e => Math.min(dol(e), b) - Math.max(y(e), a) >= 40).length;
    naEkran = Math.max(naEkran, ile);
  }
  wynik.f6 = { naEkran, bloki: bloki.length, jakie: [...new Set(bloki.map(e => e.className || e.tagName))].slice(0, 5) };

  // F7 — nagłówki działów zaczynają się od odpowiedzi (liczba w nagłówku); „Jak to liczymy” na końcu działu
  const h2 = [...document.querySelectorAll('main .dzial h2')].filter(widoczny);
  const metody = [...document.querySelectorAll('main .dzial details.metoda')];
  const naKoncu = metody.filter(d => { let s = d.nextElementSibling; while (s && s.matches('.warunki')) s = s.nextElementSibling; return !s; });
  const bezNumeru = e => { const k = e.cloneNode(true); k.querySelectorAll('.nr-tel').forEach(x => x.remove()); return k.textContent; };
  wynik.f7 = { naglowki: h2.length, zLiczba: h2.filter(e => /\d/.test(bezNumeru(e))).length, metody: metody.length, metodyNaKoncu: naKoncu.length };

  // F8 — kwoty gminy: najpierw na mieszkańca
  const kwoty = [...document.querySelectorAll('.w-liczbach .wiersz')].filter(w => /zł/.test(w.querySelector('.ile')?.textContent || ''));
  wynik.f8 = { kwoty: kwoty.length, naMieszkanca: kwoty.filter(w => /na mieszkańca/.test(w.querySelector('.co')?.textContent || '')).length };

  // F9 — zdania porównawcze (liczone z naszych danych)
  wynik.f9 = document.querySelectorAll('.porownanie').length;

  // F10 — „Jak myślisz, ile…?”
  const z = document.querySelector('.zgadnij');
  wynik.f10 = z ? { jest: 1, pomin: !!z.querySelector('[data-pomin]') } : { jest: 0 };

  // F11 — wykresy: tytuł u góry, jako zdanie z liczbą
  const wykresy = [...document.querySelectorAll('[data-wykres]')].filter(widoczny);
  const dobre = wykresy.filter(w => { const t = document.getElementById(w.dataset.wykres); return t && dol(t) <= y(w) + 2 && /\d/.test(t.textContent); });
  wynik.f11 = { wykresy: wykresy.length, tytulUGory: dobre.length };

  // F12 — menu widoczne; odnośniki mówią, dokąd prowadzą
  const OGOLNE = /^(więcej|tutaj|zobacz|kliknij|szczegóły|link|treść|czytaj dalej|wszystkie|pokaż)$/i;
  const linki = [...document.querySelectorAll('a')].filter(widoczny);
  const ogolne = linki.filter(a => OGOLNE.test(a.textContent.replace(/[→↓↗›…\s]+/g, ' ').trim()));
  const wMenu = [...document.querySelectorAll('header nav a')].filter(a => widoczny(a) && a.getBoundingClientRect().right <= szer + 1 && y(a) < 400);
  const grupy = { sejm: ['Posłowie', 'Głosowania', 'Ustawy', 'Komisje', 'Okręgi', 'Sala'], pieniadze: ['Gminy', 'Pomoc publiczna', 'Firmy', 'Mapa'] };
  const tekst = new Set(wMenu.map(a => a.textContent.trim()));
  wynik.f12 = { wMenu: tekst.size, sejm: grupy.sejm.filter(t => tekst.has(t)).length, pieniadze: grupy.pieniadze.filter(t => tekst.has(t)).length,
    ogolne: ogolne.map(a => a.textContent.trim()), schowane: [...document.querySelectorAll('header details:not([open])')].filter(widoczny).length };

  // F13 — strona wejścia: okruszek, zdanie o serwisie, data stanu danych; stopka: kto i kontakt
  wynik.f13 = { okruszek: !!document.querySelector('.okruszek'), skad: !!skad && widoczny(skad), stan: !!document.querySelector('[data-stan]'),
    kto: !!document.querySelector('footer [data-kto]'), kontakt: !!document.querySelector('footer [data-kontakt]'), szczegol };

  // F14 — obrazy ozdobne w treści (fonty liczy Node z listy zasobów)
  const ozdoby = [...document.querySelectorAll('main *')].filter(e => widoczny(e) && !e.matches(ZNAKI + ', input, select, [data-wykres] *, [data-wykres]')
    && (e.tagName === 'IMG' || getComputedStyle(e).backgroundImage !== 'none'));
  // fonty: załadowane kroje; pliki dopasowuje Node (z file:// przeglądarka nie daje czytać reguł CSS)
  const kroje = [...document.fonts].filter(f => f.status === 'loaded').map(f => [f.family.replace(/["']/g, ''), String(f.weight), f.style, f.unicodeRange]);
  wynik.f14 = { ozdoby: ozdoby.length, kroje, arkusze: [...document.styleSheets].map(a => a.href).filter(Boolean) };
  wynik.wysokosc = document.documentElement.scrollHeight;
  return wynik;
}

(async () => {
  const b = await chromium.launch();
  const wyniki = [];
  for (const m of motywy) for (const s of strony) for (const [szer, wys] of [[390, 844], [1280, 900]]) {
    const ctx = await b.newContext({ viewport: { width: szer, height: wys }, colorScheme: 'light' });
    const p = await ctx.newPage(); const bledy = [];
    p.on('pageerror', e => bledy.push(String(e)));
    await p.goto(`file://${DIR}/${s}.html?k=${m}`); await p.evaluate(() => document.fonts.ready);
    const w = await p.evaluate(zmierz, { szer, wys, szczegol: SZCZEGOL.has(s) });
    w.f14.fonty = plikiFontow(w.f14.kroje, w.f14.arkusze); delete w.f14.kroje; delete w.f14.arkusze;
    w.f14.kb = Math.round(w.f14.fonty.reduce((a, f) => a + fs.statSync(path.join(DIR, f)).size, 0) / 1000);
    wyniki.push({ motyw: m, strona: s, szer, bledy, ...w });
    await ctx.close();
  }
  // F3 bez ustawienia systemu; F4 w ciemnym; F10 bez JavaScriptu
  for (const m of motywy) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'no-preference' });
    const p = await ctx.newPage(); await p.goto(`file://${DIR}/gmina.html?k=${m}`);
    const jasnosc = await p.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); });
    wyniki.push({ motyw: m, strona: 'gmina', szer: 390, tryb: 'bez-ustawienia', f3: +jasnosc.toFixed(3) });
    await ctx.close();
    for (const s of strony.filter(x => ['gmina', 'posel', 'glowna'].includes(x))) {
      const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p2 = await c2.newPage();
      await p2.goto(`file://${DIR}/${s}.html?k=${m}`); await p2.evaluate(() => document.fonts.ready);
      const w = await p2.evaluate(zmierz, { szer: 390, wys: 844, szczegol: SZCZEGOL.has(s) });
      wyniki.push({ motyw: m, strona: s, szer: 390, tryb: 'ciemny', f4: w.f4 }); await c2.close();
    }
    for (const s of strony.filter(x => ['gmina', 'glosowanie'].includes(x))) {
      const c3 = await b.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p3 = await c3.newPage();
      await p3.goto(`file://${DIR}/${s}.html`);
      const bezJs = await p3.evaluate(() => { const z = document.querySelector('.zgadnij'); if (!z) return null; const o = z.querySelector('[data-prawda]'); return !!o && o.getBoundingClientRect().height > 0; });
      wyniki.push({ motyw: m, strona: s, szer: 390, tryb: 'bez-js', f10bezJs: bezJs }); await c3.close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(DIR, 'pomiar.json'), JSON.stringify(wyniki, null, 1));
  console.log(podsumuj(wyniki));
})();

// Krój z przeglądarki → plik woff2 z reguły @font-face (rodzina, grubość, styl, początek zakresu znaków).
function plikiFontow(kroje, arkusze) {
  const poczatek = z => parseInt((z.match(/U\+([0-9A-F]+)/i) || [, '0'])[1], 16);
  const reguly = [];
  for (const a of arkusze) {
    const css = fs.readFileSync(decodeURIComponent(new URL(a).pathname), 'utf8');
    for (const b of css.match(/@font-face\s*{[^}]*}/g) || []) {
      const p = k => (b.match(new RegExp(k + '\\s*:\\s*([^;}]+)')) || [, ''])[1].trim();
      reguly.push({ rodzina: p('font-family').replace(/["']/g, ''), waga: p('font-weight') || '400', styl: p('font-style') || 'normal',
        start: poczatek(p('unicode-range')), plik: (p('src').match(/url\(([^)]+)\)/) || [, ''])[1].replace(/["']/g, '') });
    }
  }
  const pliki = new Set();
  for (const [rodzina, waga, styl, zakres] of kroje) {
    const r = reguly.find(x => x.rodzina === rodzina && x.waga === waga && x.styl === styl && x.start === poczatek(zakres));
    if (r) pliki.add(r.plik);
  }
  return [...pliki];
}

// Tabela: motyw × F1–F14, najgorszy wynik ze wszystkich stron.
function podsumuj(w) {
  const naj = (xs, f, kier = Math.max) => { const v = xs.map(f).filter(x => x !== null && x !== undefined); return v.length ? kier(...v) : null; };
  const wiersze = [];
  for (const m of [...new Set(w.map(x => x.motyw))]) {
    const g = w.filter(x => x.motyw === m && !x.tryb), tel = g.filter(x => x.szer === 390), kom = g.filter(x => x.szer === 1280);
    const szcz = tel.filter(x => SZCZEGOL.has(x.strona));
    // F1 na każdej stronie poza główną (tam nie ma jednej „pierwszej odpowiedzi”)
    const f1 = `${naj(tel.filter(x => x.strona !== 'glowna'), x => x.f1.pierwsza)} / ${naj(tel, x => x.f1.ostatnia)}`;
    const f2 = g.every(x => x.f2.marka && x.f2.marka[0] <= 8 && x.f2.marka[1] <= 120 && x.f2.szukanie !== null && x.f2.szukanie <= 400 && x.f2.menu !== null && x.f2.menu <= 400) ? 'tak' : 'nie';
    const f3 = w.find(x => x.motyw === m && x.tryb === 'bez-ustawienia')?.f3;
    const ciem = w.filter(x => x.motyw === m && x.tryb === 'ciemny');
    const f4 = `${naj(g, x => x.f4.odcienie)} odc., ${naj(g.concat(ciem), x => x.f4.barwneTla)} tła`;
    const f5 = `${g.reduce((a, x) => a + x.f5.ponizej15, 0)} < 15 px; ${naj(tel, x => x.f5.ciagly, Math.min)}/${naj(kom, x => x.f5.ciagly, Math.min)} px; ${naj(g, x => x.f5.interlinia, Math.min)}; ${naj(kom, x => x.f5.znakow, Math.min)}–${naj(kom, x => x.f5.znakow)} zn.`;
    const f6 = naj(g, x => x.f6.naEkran);
    const f7 = `${g.filter(x => x.szer === 390).reduce((a, x) => a + x.f7.zLiczba, 0)}/${g.filter(x => x.szer === 390).reduce((a, x) => a + x.f7.naglowki, 0)}; metoda na końcu ${tel.reduce((a, x) => a + x.f7.metodyNaKoncu, 0)}/${tel.reduce((a, x) => a + x.f7.metody, 0)}`;
    const gm = tel.find(x => x.strona === 'gmina');
    const f8 = gm ? `${gm.f8.naMieszkanca}/${gm.f8.kwoty}` : '—';
    const f9 = ['gmina', 'firma', 'pomoc-publiczna'].map(s => tel.find(x => x.strona === s)?.f9 ?? '—').join('/');
    const nj = w.filter(x => x.motyw === m && x.tryb === 'bez-js');
    const f10 = ['gmina', 'glosowanie'].map(s => { const t = tel.find(x => x.strona === s); const n = nj.find(x => x.strona === s); return t ? `${t.f10.jest ? (t.f10.pomin ? 'jest' : 'bez pomiń') : 'brak'}${n && n.f10bezJs === false ? ', bez JS ukryte' : ''}` : '—'; }).join(' / ');
    const f11 = `${g.reduce((a, x) => a + x.f11.tytulUGory, 0)}/${g.reduce((a, x) => a + x.f11.wykresy, 0)}`;
    const f12 = `${naj(kom, x => x.f12.wMenu, Math.min)} na 1280; tel. ${naj(tel, x => x.f12.sejm, Math.min) > 0 && naj(tel, x => x.f12.pieniadze, Math.min) > 0 ? 'Sejm+Pieniądze' : 'brak grupy'}; ogólne ${new Set(g.flatMap(x => x.f12.ogolne)).size}`;
    const f13 = szcz.every(x => x.f13.okruszek && x.f13.skad && x.f13.stan) && g.every(x => x.f13.kto && x.f13.kontakt) ? 'tak' : `nie (${szcz.filter(x => !(x.f13.okruszek && x.f13.skad && x.f13.stan)).map(x => x.strona).join(', ') || 'stopka'})`;
    const f14 = `${naj(g, x => x.f14.kb)} kB, ozdoby ${naj(g, x => x.f14.ozdoby)}`;
    const bledy = g.reduce((a, x) => a + x.bledy.length, 0);
    wiersze.push(`| ${m.toUpperCase()} | ${f1} | ${f2} | ${f3} | ${f4} | ${f5} | ${f6} | ${f7} | ${f8} | ${f9} | ${f10} | ${f11} | ${f12} | ${f13} | ${f14} |${bledy ? ' błędy: ' + bledy : ''}`);
  }
  return ['| motyw | F1 pierwsza / ostatnia odp. (px, tel.) | F2 | F3 jasność tła | F4 | F5 | F6 bloki/ekran | F7 | F8 | F9 g/f/pp | F10 g / gł | F11 | F12 | F13 | F14 |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|', ...wiersze].join('\n');
}
