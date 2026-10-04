/**
 * Plan sali posiedzen Sejmu -> `src/lib/plan-sali.ts`.
 *
 *   node scripts/plan-sali.mjs [--pdf=ingest/zrodla/sejm-sala/plan-sali.pdf]
 *
 * API Sejmu NIE PODAJE, kto gdzie siedzi. Jedynym zrodlem jest rysunek sali
 * wydawany przez Kancelarie Sejmu w PDF (`ingest/zrodla/sejm-sala/ZRODLO.md`).
 * Rysunek jest wektorowy: kazde nazwisko i kazdy numer miejsca to prawdziwy
 * tekst z wlasnymi wspolrzednymi, wiec nie zgadujemy nic z obrazka.
 *
 * ZMIERZONE 24.09.2026 na plikach „stan na 21.09.2026 r.":
 * - jedna strona, 7 fontow, zero obrazow, 5512 pokazan glifu,
 * - nazwiska ida GLIF PO GLIFIE i przeskakuja miedzy dwoma fontami w srodku
 *   wyrazu („Hołownia" to <B.> + (H) + <oło> + (wnia)); sklejanie po samym
 *   sasiedztwie w strumieniu, ale z warunkiem na font, rozbija 94 nazwiska,
 * - po pokazaniu kilku glifow naraz kolejny `Td` nadrabia ich szerokosci,
 *   wiec dopuszczalny odstep musi rosnac z liczba glifow od ostatniego `Td`
 *   (bez tego „Wawer" rozpada sie na „Waw" i „er"),
 * - numer miejsca lezy POD nazwiskiem, wysrodkowany wzgledem niego;
 *   nazwiska w jednym rzedzie sa poprzesuwane w pionie, zeby dluzsze sie
 *   nie nachodzily — dlatego parujemy po srodku w poziomie, nie po odleglosci,
 * - numeracja miejsc siega 529, bo obejmuje takze lawy rzadowe i loze.
 *
 * Wynik zapisujemy jako gotowy modul TypeScript: strona nie czyta PDF-u,
 * a zmiana planu jest widoczna w diffie.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const argument = (nazwa, domyslnie) =>
  process.argv.find((a) => a.startsWith(`--${nazwa}=`))?.split('=').slice(1).join('=') ?? domyslnie;

const PDF = join(process.cwd(), argument('pdf', 'ingest/zrodla/sejm-sala/plan-sali.pdf'));
const BAZA = join(process.cwd(), 'dane', 'sejm.db');
const WYJSCIE = join(process.cwd(), 'src', 'lib', 'plan-sali.ts');

/** Suma z ZRODLO.md. Inna suma = inny plan; skrypt ma o tym powiedziec. */
const SHA_ZRODLA = '23698d7cfd4ca0b7f5ce4a771e52d7af1b9fcfa38cbdc220b26fe6b0e82371b1';
const ADRES_ZRODLA =
  'https://orka.sejm.gov.pl/posiedzenie.nsf/0/3C58F455D89FBD9BC1258E7900293A25/$file/stan_21.09.26.pdf';

const log = (s) => process.stdout.write(`${s}\n`);

/* ------------------------------------------------------------------ PDF */

/** Rozpakowuje strumienie PDF: zwraca strumien tresci i mape ToUnicode. */
function otworzPdf(plik) {
  const bajty = readFileSync(plik);
  const cmap = new Map();
  let tresc = null;
  let i = 0;
  while (true) {
    const k = bajty.indexOf('stream', i);
    if (k < 0) break;
    let p = k + 6;
    if (bajty[p] === 13) p++;
    if (bajty[p] === 10) p++;
    const e = bajty.indexOf('endstream', p);
    if (e < 0) break;
    try {
      const rozpakowany = inflateSync(bajty.subarray(p, e));
      const tekst = rozpakowany.toString('latin1');
      if (tekst.includes('beginbfchar') || tekst.includes('beginbfrange')) {
        for (const m of tekst.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
          const kod = parseInt(m[1], 16);
          if (!cmap.has(kod)) cmap.set(kod, String.fromCharCode(parseInt(m[2].slice(0, 4), 16)));
        }
      }
      if (rozpakowany.length > 100_000 && tekst.includes(' Tm')) tresc = tekst;
    } catch {
      /* strumienie fontow nie sa spakowane algorytmem Flate — pomijamy */
    }
    i = e + 9;
  }
  if (!tresc) throw new Error('nie znaleziono strumienia tresci strony');
  return { tresc, cmap, sha: createHash('sha256').update(bajty).digest('hex') };
}

const WZORZEC_TEKSTU =
  /\/([A-Za-z0-9_]+)\s+[\d.]+\s+Tf|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(-?[\d.]+)\s+(-?[\d.]+)\s+(?:Td|TD)|\[((?:[^\][]|\[[^\]]*\])*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj|<([0-9a-fA-F\s]+)>\s*Tj/g;

/** Glify strumienia tresci z pozycja w punktach PDF (y rosnie do gory). */
function glify({ tresc, cmap }) {
  const zHex = (hex) =>
    (hex.match(/.{1,4}/g) ?? []).map((h) => cmap.get(parseInt(h, 16)) ?? '�').join('');
  const zNawiasu = (t) =>
    t.replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1');

  const wynik = [];
  let macierz = [1, 0, 0, 1, 0, 0];
  let linia = macierz.slice();
  let odTd = 0;

  for (const m of tresc.matchAll(WZORZEC_TEKSTU)) {
    if (m[1]) continue; // zmiana fontu nie przerywa napisu
    if (m[2] !== undefined) {
      macierz = [+m[2], +m[3], +m[4], +m[5], +m[6], +m[7]];
      linia = macierz.slice();
      odTd = 0;
      continue;
    }
    if (m[8] !== undefined) {
      const [a, b, c, d, e, f] = linia;
      const tx = +m[8];
      const ty = +m[9];
      linia = [a, b, c, d, a * tx + c * ty + e, b * tx + d * ty + f];
      macierz = linia.slice();
      odTd = 0;
      continue;
    }
    let tekst = null;
    if (m[10] !== undefined) {
      tekst = '';
      for (const cz of m[10].matchAll(/<([0-9a-fA-F]+)>|\(((?:[^()\\]|\\.)*)\)/g)) {
        tekst += cz[1] !== undefined ? zHex(cz[1]) : zNawiasu(cz[2]);
      }
    } else if (m[11] !== undefined) tekst = zNawiasu(m[11]);
    else if (m[12] !== undefined) tekst = zHex(m[12].replace(/\s/g, ''));
    if (!tekst) continue;
    wynik.push({
      x: macierz[4],
      y: macierz[5],
      kat: Math.round((Math.atan2(macierz[1], macierz[0]) * 180) / Math.PI),
      skala: Math.hypot(macierz[0], macierz[1]),
      tekst,
      odTd,
    });
    odTd += tekst.length;
  }
  return wynik;
}

/**
 * Skleja glify w napisy. Warunek: ta sama linia bazowa, ten sam rozmiar
 * i przeskok do przodu nie wiekszy niz szerokosc glifow pokazanych
 * od ostatniego jawnego ustawienia pozycji.
 */
function napisy(glifyStrony) {
  const wynik = [];
  let biezacy = null;
  for (const g of glifyStrony) {
    if (biezacy && biezacy.kat === g.kat && Math.abs(biezacy.skala - g.skala) < 0.05) {
      const p = biezacy.ostatni;
      const rad = (p.kat * Math.PI) / 180;
      const dx = g.x - p.x;
      const dy = g.y - p.y;
      const wzdluz = dx * Math.cos(rad) + dy * Math.sin(rad);
      const wpoprzek = -dx * Math.sin(rad) + dy * Math.cos(rad);
      const maks = (0.75 * Math.max(1, p.odTd + p.tekst.length) + 0.45) * g.skala;
      if (Math.abs(wpoprzek) < 0.3 * g.skala && wzdluz >= -0.05 * g.skala && wzdluz < maks) {
        biezacy.tekst += g.tekst;
        biezacy.ostatni = g;
        continue;
      }
    }
    biezacy = { x: g.x, y: g.y, kat: g.kat, skala: g.skala, tekst: g.tekst, ostatni: g };
    wynik.push(biezacy);
  }
  return wynik.map((n) => ({
    x: n.x,
    y: n.y,
    // koniec napisu: pozycja ostatniego glifu plus jego polowa (0.5 rozmiaru).
    koniec: n.ostatni.x + 0.5 * n.skala,
    kat: n.kat,
    skala: n.skala,
    tekst: n.tekst.trim(),
  }));
}

/* -------------------------------------------------------------- dopasowanie */

const uprosc = (s) => s.toLowerCase().replace(/[\s.]/g, '');

const srodek = (e) => (e.x + e.koniec) / 2;

/** Napisy planu, ktore nie sa nazwiskami — nie zglaszamy ich jako nieznane. */
const OPISY_SALI = new Set(['Mównica', 'Podest dla osób niepełnosprawnych', 'dla osób', 'niepełnosprawnych']);

/**
 * Punkty orientacyjne sali: bez nich polkolo kropek nie mowi, gdzie jest
 * przod izby. Bierzemy je z tego samego rysunku co miejsca — sa tam
 * podpisane, wiec nie zgadujemy polozenia.
 */
const ORIENTACJA = [
  { szukaj: /^Mównica$/, etykieta: 'Mównica' },
  { szukaj: /^FOTEL$/, etykieta: 'Fotel Prezydenta' },
  { szukaj: /^STENOGRAFOWIE$/, etykieta: 'Stenografowie' },
];

/**
 * Laczy nazwisko rozbite na dwie etykiety: „Borys-" + „ Szopa". Obie leza
 * w tym samym wierszu, jedna za druga — rysownik rozdzielil je spacja,
 * ktora w strumieniu wypada poza zasieg sklejania glifow.
 */
function zlaczRozbite(etykiety) {
  const wynik = [];
  const zajete = new Set();
  etykiety.forEach((a, i) => {
    if (zajete.has(i) || !a.tekst.endsWith('-')) return;
    let naj = -1;
    let najD = 20;
    etykiety.forEach((b, j) => {
      if (j === i || zajete.has(j) || b.tekst.endsWith('-')) return;
      if (Math.abs(b.y - a.y) > 0.6 || Math.abs(b.skala - a.skala) > 0.05) return;
      // Lacznik jest waski, wiec koniec pierwszej czesci wypada czasem
      // o ulamek znaku ZA poczatkiem drugiej — stad ujemny dolny prog.
      const odstep = b.x - a.koniec;
      if (odstep < -0.8 * a.skala || odstep > najD) return;
      najD = odstep;
      naj = j;
    });
    if (naj < 0) return;
    zajete.add(i);
    zajete.add(naj);
    wynik.push({ ...a, koniec: etykiety[naj].koniec, tekst: a.tekst + etykiety[naj].tekst.trim() });
  });
  etykiety.forEach((e, i) => {
    if (!zajete.has(i)) wynik.push(e);
  });
  return wynik;
}

/**
 * Podpisy na planie sa skrocone: zwykle samo nazwisko, a gdy dwoch poslow
 * nosi to samo — z inicjalami („K. Bosak" to Krzysztof, „K. A. Bosak" to
 * Karina Anna). Dlatego najpierw bierzemy tylko podpisy rozstrzygalne
 * jednoznacznie, a dopiero potem te, ktore rozstrzyga sie przez wykluczenie.
 */
function rozdzielPodpisy(podpisy, wedlugNazwiska) {
  const inicjalyPosla = (p) => [p.imie, p.drugie_imie].filter(Boolean).map((s) => s[0]);

  /** Kandydaci na posla dla podpisu, bez rozstrzygania. */
  const kandydaci = (podpis) => {
    const inicjaly = (podpis.match(/^(?:[A-ZĄĆĘŁŃÓŚŹŻ]\.\s*)+/)?.[0] ?? '')
      .split('.')
      .map((z) => z.trim())
      .filter(Boolean);
    const bezInicjalow = podpis.replace(/^(?:[A-ZĄĆĘŁŃÓŚŹŻ]\.\s*)+/, '').trim();
    const slowa = bezInicjalow.split(/\s+/);

    const nazwiska = [bezInicjalow];
    // „Paweł Kowal" — imie w podpisie, bo dwoch poslow nosi nazwisko Kowal.
    if (slowa.length > 1 && !slowa[slowa.length - 2].endsWith('-')) nazwiska.push(slowa[slowa.length - 1]);

    for (const n of nazwiska) {
      let lista = wedlugNazwiska.get(uprosc(n)) ?? [];
      if (!lista.length) continue;
      if (lista.length > 1 && n !== bezInicjalow) {
        const imie = slowa.slice(0, -1).join(' ');
        const poImieniu = lista.filter((p) => uprosc(p.imie) === uprosc(imie));
        if (poImieniu.length) lista = poImieniu;
      }
      if (lista.length > 1 && inicjaly.length) {
        lista = lista.filter((p) => inicjaly.every((z, nr) => inicjalyPosla(p)[nr] === z));
      }
      if (lista.length) return lista;
    }
    // Rysownik skraca tez nazwiska dwuczlonowe: „Wiśniewska" zamiast
    // „Uznańska-Wiśniewska". Przyjmujemy to tylko wtedy, gdy pasuje
    // dokladnie jeden posel w calej izbie.
    const poKoncowce = [...wedlugNazwiska.entries()]
      .filter(([k]) => k.endsWith('-' + uprosc(bezInicjalow)))
      .flatMap(([, lista]) => lista);
    return poKoncowce;
  };

  const wynik = new Map();
  const odlozone = [];
  podpisy.forEach((podpis, i) => {
    const lista = kandydaci(podpis.tekst);
    if (lista.length === 1) wynik.set(i, lista[0]);
    else odlozone.push({ i, lista });
  });

  // Przez wykluczenie: „Tomaszewski" bez inicjalu, gdy „W. Tomaszewski"
  // ma juz swoje miejsce, moze byc tylko tym drugim.
  let zmiana = true;
  while (zmiana) {
    zmiana = false;
    const wziete = new Set([...wynik.values()].map((p) => p.id));
    for (const o of odlozone) {
      if (wynik.has(o.i)) continue;
      const wolni = o.lista.filter((p) => !wziete.has(p.id));
      if (wolni.length === 1) {
        wynik.set(o.i, wolni[0]);
        zmiana = true;
      }
    }
  }
  return wynik;
}

/**
 * Numer miejsca dla podpisu — i JEGO POZYCJA, bo to ona jest miejscem.
 *
 * ZGLOSZENIE PAWLA 30.09.2026: „kropki sa mocno rozjechane". Mial racje
 * i blad byl moj: bralem pozycje NAZWISKA, a rysownik przesuwa nazwiska
 * w pionie, zeby dluzsze sie nie nachodzily. ZMIERZONE: w rzedach powyzej
 * pieciu miejsc sredni rozrzut w pionie wynosil 13,8 jednostki przy odstepie
 * miedzy sasiadami okolo 19. Numer stoi w rzedzie rowno, wiec bierzemy jego
 * wspolrzedne, a pozycje nazwiska tylko wtedy, gdy numeru nie ma.
 *
 * Etykieta liczbowa lezy POD podpisem, wysrodkowana wzgledem niego. Nazwiska w jednym rzedzie sa poprzesuwane w pionie, a dluzsze
 * wystaja poza swoje miejsce, wiec idziemy od przypadkow oczywistych do coraz
 * luzniejszych — i za kazdym razem numer moze trafic tylko do jednego podpisu.
 * Gdy po trzech turach nic nie pasuje, numer zostaje `null`. Zgadywanie numeru
 * przy czyims nazwisku kosztuje wiecej niz jego brak.
 *
 * ZMIERZONE 30.09.2026: tura 1 dawala 390 z 460 miejsc, tura 2 kolejne 50,
 * tura 3 — 17; bez numeru zostawaly 3 podpisy, a jeden numer trafial do
 * niewlasciwej osoby (patrz kolejnosc tur nizej).
 * Po zmianie kolejnosci 04.10.2026: numer ma wszystkie 460 podpisow, zaden
 * numer sie nie powtarza, a wzgledem poprzedniej wersji zmienily sie dokladnie
 * 4 przypisania (A. Luczak 214 -> 215; Kolodziejczak, Kierzek-Koperska
 * i Mieszkowski dostali 214, 211 i 147).
 */
function przypiszNumery(podpisy, numery) {
  const przypisane = new Map();
  const zajete = new Set();
  const ODSTEP_TYPOWY = 8.3; // mediana odleglosci pionowej podpis -> numer

  const tura = (dxMaks, dyMin, dyMaks) => {
    const pary = [];
    podpisy.forEach((p, i) => {
      if (przypisane.has(i)) return;
      numery.forEach((n, j) => {
        if (zajete.has(j)) return;
        const wPoziomie = Math.abs(srodek(n) - srodek(p));
        const wPionie = p.y - n.y;
        if (wPoziomie > dxMaks || wPionie < dyMin || wPionie > dyMaks) return;
        pary.push({ koszt: wPoziomie + 0.6 * Math.abs(wPionie - ODSTEP_TYPOWY), i, j });
      });
    });
    pary.sort((a, b) => a.koszt - b.koszt);
    for (const { i, j } of pary) {
      if (przypisane.has(i) || zajete.has(j)) continue;
      przypisane.set(i, { numer: Number(numery[j].tekst), x: srodek(numery[j]), y: numery[j].y });
      zajete.add(j);
    }
  };

  /*
   * NAJPIERW TYPOWY PION, potem luzniejsze wszystko. ZGLOSZENIE PAWLA
   * 04.10.2026 (zrzut z dwiema „rozjechanymi" parami kropek) i to byl blad
   * kolejnosci, nie rysunku. Dawniej druga tura dopuszczala pion 3-20 juz
   * przy odstepie w bok 8 — wiec „A. Luczak" zabral numer 214 lezacy 17,1
   * pod nazwiskiem (dwa razy dalej niz zwykle), zanim „M.M. Kolodziejczak"
   * mogla do niego dojsc (8,5 pod nazwiskiem, 9,1 w bok). Ona zostala bez
   * numeru, a jego wlasciwy numer 215 (8,1 pod nazwiskiem) — wolny. Dwa
   * inne podpisy (Kierzek-Koperska, Mieszkowski) mialy wolny numer z typowym
   * pionem, ale 16-23 w bok: dluzsze nazwiska rysownik przesuwa na boki.
   * Typowy pion (4-14, mediana 8,3) jest pewniejszy niz maly odstep w bok,
   * wiec idzie pierwszy przy kazdej szerokosci; luzne tury zostaja na koniec.
   */
  tura(5, 4, 14);
  tura(8, 4, 14);
  tura(16, 4, 14);
  tura(26, 4, 14);
  tura(8, 3, 20);
  tura(14, 0, 26);
  return przypisane;
}

/* ------------------------------------------------------------------ main */

/**
 * Wyrownuje do luku swojego rzedu miejsca, ktorych pozycja pochodzi
 * z NAZWISKA, a nie z numeru.
 *
 * DLACZEGO TO NIE JEST ZGADYWANIE. Rysownik przesuwa nazwiska w pionie, zeby
 * dluzsze sie nie nachodzily (zmierzone: sredni rozrzut 13,8 jednostki przy
 * odstepie sasiadow ok. 19) — dlatego pozycje bierzemy z etykiety numeru.
 * Trzem podpisom numeru nie udalo sie sparowac i one niosa pozycje nazwiska,
 * czyli te przesunieta. ZMIERZONE 01.10.2026: odchylenie od luku swojego
 * rzedu wynosi dla nich 9,9-12,5 jednostki przy **odstepie miedzy rzedami
 * 30,6** — rzad jest wiec jednoznaczny i nie ma czego zgadywac.
 *
 * Zgadnieciem byloby dopisanie komus NUMERU miejsca; tego nie robimy.
 * Poprawienie wspolrzednej w obrebie rzedu, ktory wynika z danych, jest
 * naprawa bledu odczytu — tego samego, ktory 30.09.2026 naprawilismy dla
 * pozostalych 457 miejsc.
 *
 * Srodek lukow dopasowujemy do miejsc Z NUMEREM (one sa pewne): siatka plus
 * doszlifowanie. Zmierzony sredni blad promienia po dopasowaniu: ok. 1
 * jednostka, czyli 3% odstepu miedzy rzedami.
 */
/** Minimalny odstep do sasiada po przesunieciu; mediana w sali to 17,85. */
const PROG_SASIADA = 9;

function wyrownajDoLuku(miejsca, log) {
  const pewne = miejsca.filter((m) => m.numer !== null);
  const doPoprawy = miejsca.filter((m) => m.numer === null);
  if (!doPoprawy.length || pewne.length < 50) return;

  /*
   * Miara dopasowania srodka: sumaryczny ROZRZUT promieni WEWNATRZ rzedow.
   * Dobry srodek sprawia, ze promienie ukladaja sie w wyrazne prazki —
   * wiele promieni blisko siebie, a miedzy prazkami duza przerwa.
   * (Pierwsza wersja nagradzala male odstepy w ogole, co jest maksymalizowane
   * przez srodek robiacy wszystkie promienie podobnymi — czyli bez sensu.
   * Zabezpieczenie „nie rozpoznalem rzedow" to zlapalo i nic nie zepsulo.)
   */
  const pogrupuj = (cx, cy) => {
    const r = pewne.map((m) => Math.hypot(m.x - cx, m.y - cy)).sort((a, b) => a - b);
    const grupy = [];
    let g = [r[0]];
    for (let i = 1; i < r.length; i++) {
      if (r[i] - r[i - 1] > 12) { grupy.push(g); g = []; }
      g.push(r[i]);
    }
    grupy.push(g);
    return grupy;
  };
  const blad = (cx, cy) => {
    const grupy = pogrupuj(cx, cy).filter((g) => g.length >= 8);
    if (grupy.length < 8) return Infinity;
    let suma = 0;
    let ile = 0;
    for (const g of grupy) {
      const sr = g.reduce((a, b) => a + b, 0) / g.length;
      for (const v of g) suma += (v - sr) ** 2;
      ile += g.length;
    }
    return suma / ile;
  };

  const xs0 = pewne.map((m) => m.x);
  const ys0 = pewne.map((m) => m.y);
  const sx = (Math.min(...xs0) + Math.max(...xs0)) / 2;
  let naj = { cx: sx, cy: Math.min(...ys0), w: Infinity };
  // Zgrubnie po szerokim obszarze, potem coraz drobniej wokol najlepszego.
  for (const [zakres, krok] of [[260, 20], [40, 5], [10, 1], [2, 0.25]]) {
    const bx = naj.cx;
    const by = naj.cy;
    for (let dx = -zakres; dx <= zakres; dx += krok) {
      for (let dy = -zakres; dy <= zakres; dy += krok) {
        const cx = bx + dx;
        const cy = by + dy;
        const w = blad(cx, cy);
        if (w < naj.w) naj = { cx, cy, w };
      }
    }
  }
  if (naj.w === Infinity) { log('UWAGA: nie dopasowalem srodka lukow — nie wyrownuje'); return; }
  log(`srednie odchylenie promienia w rzedzie: ${Math.sqrt(naj.w).toFixed(2)}`);

  // Rzedy: skupiska promieni miejsc pewnych.
  const promienie = pewne.map((m) => Math.hypot(m.x - naj.cx, m.y - naj.cy)).sort((a, b) => a - b);
  const rzedy = [];
  let grupa = [promienie[0]];
  for (let i = 1; i < promienie.length; i++) {
    if (promienie[i] - promienie[i - 1] > 12) { rzedy.push(grupa); grupa = []; }
    grupa.push(promienie[i]);
  }
  rzedy.push(grupa);
  const srodkiRzedow = rzedy
    .filter((g) => g.length >= 8)
    .map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  if (srodkiRzedow.length < 5) {
    log(`UWAGA: nie rozpoznalem rzedow (${srodkiRzedow.length}) — nie wyrownuje`);
    return;
  }
  log(`srodek lukow: (${naj.cx.toFixed(2)}, ${naj.cy.toFixed(2)}), rzedow: ${srodkiRzedow.length}`);

  for (const m of doPoprawy) {
    const r0 = Math.hypot(m.x - naj.cx, m.y - naj.cy);
    const r = srodkiRzedow.reduce((a, b) => (Math.abs(b - r0) < Math.abs(a - r0) ? b : a));
    const dx = m.x - naj.cx;
    const pod = r * r - dx * dx;
    if (pod <= 0) { log(`UWAGA: ${m.nazwa} poza lukiem rzedu — zostawiam`); continue; }
    const znak = m.y >= naj.cy ? 1 : -1;
    const y = naj.cy + znak * Math.sqrt(pod);

    /*
     * ZABEZPIECZENIE, bez ktorego ta naprawa SZKODZI — zmierzone 01.10.2026.
     * Te trzy miejsca odpowiadaja za trzymiejscowy niedobor po lewej stronie
     * w rzedach 346,6 i 377,5. Zrzutowanie na luk poprawia promien, ale KAT
     * zostaje — i miejsce lezy wtedy na istniejacym sasiedzie. Pierwsza wersja
     * tej funkcji zbila najmniejszy odstep w calej sali z **12,38 na 1,14**
     * i zrobila 4 miejsca nachodzace, czyli wymienila odchylenie 12 jednostek
     * na dwoch poslow narysowanych jeden na drugim. To gorsze.
     *
     * Dlatego ruszamy miejsce TYLKO wtedy, gdy po przesunieciu nadal ma
     * sasiada nie blizej niz polowa mediany odstepu. Jesli nie — zostawiamy
     * tam, gdzie jest, i mowimy o tym. Lepsze miejsce lekko poza lukiem niz
     * dwa nazwiska w jednym punkcie.
     */
    const dystans = (yy) => Math.min(...miejsca
      .filter((o) => o !== m)
      .map((o) => Math.hypot(o.x - m.x, o.y - yy)));
    const przed = dystans(m.y);
    const po = dystans(y);
    if (po < PROG_SASIADA) {
      log(`NIE wyrownuje: ${m.nazwa} — na luku mialby sasiada w ${po.toFixed(2)} (teraz ${przed.toFixed(2)})`);
      continue;
    }
    log(`wyrownane do luku: ${m.nazwa} — promien ${r0.toFixed(1)} -> ${r.toFixed(1)}, y ${m.y.toFixed(1)} -> ${y.toFixed(1)}, sasiad ${przed.toFixed(1)} -> ${po.toFixed(1)}`);
    m.y = y;
  }
}

function main() {
  const pdf = otworzPdf(PDF);
  log(`plan: ${PDF}`);
  log(`sha256: ${pdf.sha}${pdf.sha === SHA_ZRODLA ? ' (zgodna z ZRODLO.md)' : ' — INNA NIZ W ZRODLO.md'}`);

  const etykiety = napisy(glify(pdf));
  const stan = etykiety.find((e) => /stan na \d{2}\.\d{2}\.\d{4}/.test(e.tekst));
  const [, dzien, miesiac, rok] = stan?.tekst.match(/stan na (\d{2})\.(\d{2})\.(\d{4})/) ?? [];
  if (!dzien) throw new Error('nie znalazlem daty „stan na …" — bez niej nie wiadomo, czego dotyczy plan');
  const dataPlanu = `${rok}-${miesiac}-${dzien}`;

  // Podpisy poslow maja rozmiar 4,57 pkt; dluzsze nazwisko rysownik zmniejsza
  // do 4 pkt, a marszalek w prezydium ma 5 pkt. Numery miejsc sa mniejsze.
  const podpisy = zlaczRozbite(
    etykiety.filter(
      (e) =>
        e.kat === 0 &&
        e.skala > 3.9 &&
        e.skala < 5.1 &&
        /[a-ząćęłńóśźż]/.test(e.tekst) &&
        e.tekst.length > 2 &&
        !/\d/.test(e.tekst) &&
        !OPISY_SALI.has(e.tekst),
    ),
  );
  const numery = etykiety.filter((e) => e.kat === 0 && e.skala > 3.8 && e.skala < 4.6 && /^\d+$/.test(e.tekst));
  log(`podpisow: ${podpisy.length}, etykiet z numerem miejsca: ${numery.length}`);

  const db = new DatabaseSync(BAZA, { readOnly: true });
  const poslowie = db.prepare('select id, slug, imie, drugie_imie, nazwisko, aktywny from poslowie').all();
  const wedlugNazwiska = new Map();
  for (const p of poslowie) {
    const k = uprosc(p.nazwisko);
    if (!wedlugNazwiska.has(k)) wedlugNazwiska.set(k, []);
    wedlugNazwiska.get(k).push(p);
  }

  // Punkty orientacyjne — z tych samych etykiet rysunku.
  const orientacja = [];
  for (const o of ORIENTACJA) {
    const e = etykiety.find((x) => x.kat === 0 && o.szukaj.test(x.tekst));
    if (e) orientacja.push({ etykieta: o.etykieta, x: srodek(e), y: e.y });
    else log(`UWAGA: nie znalazlem w rysunku punktu „${o.etykieta}"`);
  }
  log(`punktow orientacyjnych: ${orientacja.length} z ${ORIENTACJA.length}`);

  const rozpoznani = rozdzielPodpisy(podpisy, wedlugNazwiska);
  const numerMiejsca = przypiszNumery(podpisy, numery);
  const miejsca = [];
  const nierozpoznane = [];
  podpisy.forEach((n, i) => {
    const posel = rozpoznani.get(i);
    if (!posel) {
      nierozpoznane.push(n.tekst);
      return;
    }
    miejsca.push({
      id: posel.id,
      nazwa: `${posel.imie} ${posel.nazwisko}`,
      numer: numerMiejsca.get(i)?.numer ?? null,
      // Numer stoi w rzedzie rowno; nazwisko bywa przesuniete w pionie.
      x: numerMiejsca.get(i)?.x ?? srodek(n),
      y: numerMiejsca.get(i)?.y ?? n.y,
    });
  });

  // Trzy miejsca bez numeru niosa pozycje NAZWISKA, ktora rysownik przesuwa
  // w pionie — wyrownujemy je do luku ich wlasnego rzedu.
  wyrownajDoLuku(miejsca, log);

  const poId = new Map();
  for (const m of miejsca) {
    if (poId.has(m.id)) log(`UWAGA: ${m.nazwa} ma w planie dwa miejsca`);
    poId.set(m.id, m);
  }
  const aktywni = poslowie.filter((p) => p.aktywny);
  const bezMiejsca = aktywni.filter((p) => !poId.has(p.id));
  const nieaktywniZMiejscem = miejsca.filter((m) => !aktywni.some((p) => p.id === m.id));

  log(`rozpoznanych poslow: ${poId.size} z ${aktywni.length} sprawujacych mandat`);
  log(`z numerem miejsca: ${miejsca.filter((m) => m.numer !== null).length}`);
  if (nierozpoznane.length) log(`podpisy bez posla w bazie: ${JSON.stringify(nierozpoznane)}`);
  if (bezMiejsca.length) log(`poslowie bez miejsca: ${bezMiejsca.map((p) => `${p.imie} ${p.nazwisko}`).join(' | ')}`);
  if (nieaktywniZMiejscem.length) log(`miejsce ma ktos bez mandatu: ${nieaktywniZMiejscem.map((m) => m.nazwa).join(' | ')}`);

  // Uklad ekranu: os Y PDF rosnie do gory, SVG w dol. Zaokraglamy do dziesiatych
  // — `Math.cos` w Node i w Chrome rozni sie na ostatniej cyfrze i strona
  // przestaje sie zgadzac przy hydracji.
  const xs = miejsca.map((m) => m.x);
  const ys = miejsca.map((m) => m.y);
  const margines = 12;
  const minX = Math.min(...xs) - margines;
  const minY = Math.min(...ys) - margines;
  const szerokosc = Math.max(...xs) - minX + margines;
  const wysokosc = Math.max(...ys) - minY + margines;
  const punkty = orientacja
    .map((o) => ({
      etykieta: o.etykieta,
      x: +(o.x - minX).toFixed(1),
      y: +(wysokosc - (o.y - minY)).toFixed(1),
    }))
    // Poza obszarem miejsc (np. fotel Prezydenta stoi przed sala) — nie
    // rozciagamy dla nich rysunku, ale mowimy o tym wprost.
    .filter((o) => {
      const w = o.x >= 0 && o.y >= 0 && o.x <= szerokosc && o.y <= wysokosc;
      if (!w) log(`   „${o.etykieta}" lezy poza obszarem miejsc — pomijam na rysunku`);
      return w;
    });

  const wiersze = miejsca
    .map((m) => ({
      id: m.id,
      numer: m.numer,
      x: +(m.x - minX).toFixed(1),
      y: +(wysokosc - (m.y - minY)).toFixed(1),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const plik = `/**
 * Plan sali posiedzen Sejmu: gdzie siedzi kazdy posel.
 *
 * PLIK JEST GENEROWANY — nie poprawiaj go recznie:
 *   node scripts/plan-sali.mjs
 *
 * Zrodlem jest rysunek sali wydany przez Kancelarie Sejmu (PDF), nie API:
 * rejestr nie udostepnia przydzialu miejsc. Szczegoly i suma kontrolna:
 * ingest/zrodla/sejm-sala/ZRODLO.md.
 */

/** Dzien, na ktory Kancelaria Sejmu wydala plan. */
export const STAN_PLANU = '${dataPlanu}';

/** Rysunek, z ktorego pochodzi ten plik. */
export const ZRODLO_PLANU = '${ADRES_ZRODLA}';

/** Uklad wspolrzednych miejsc (os Y jak w SVG: rosnie w dol). */
export const PLAN_SZEROKOSC = ${szerokosc.toFixed(1)};
export const PLAN_WYSOKOSC = ${wysokosc.toFixed(1)};

/** [id posla, numer miejsca albo null, x, y] */
export type MiejsceNaSali = readonly [id: number, numer: number | null, x: number, y: number];

/** Punkt orientacyjny sali — z podpisu na rysunku, nie z naszego domysłu. */
export type PunktSali = { etykieta: string; x: number; y: number };

export const PUNKTY_SALI: readonly PunktSali[] = [
${punkty.map((o) => `  { etykieta: '${o.etykieta}', x: ${o.x}, y: ${o.y} },`).join('\n')}
];

export const MIEJSCA: readonly MiejsceNaSali[] = [
${wiersze.map((w) => `  [${w.id}, ${w.numer ?? 'null'}, ${w.x}, ${w.y}],`).join('\n')}
];
`;
  writeFileSync(WYJSCIE, plik, 'utf8');
  log(`zapisano ${WYJSCIE} (${(plik.length / 1024).toFixed(1)} kB, stan na ${dataPlanu})`);

  if (nierozpoznane.length || bezMiejsca.length) {
    log('PLAN JEST NIEPELNY — powyzsze przypadki trzeba rozstrzygnac przed uzyciem.');
    process.exitCode = 1;
  }
}

main();
