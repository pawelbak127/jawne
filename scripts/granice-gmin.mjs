/**
 * Granice gmin z PRG (GUGiK) -> jeden plik dla mapy.
 *
 *   node scripts/granice-gmin.mjs [--tolerancja=0.004]
 *
 * Wejscie: dane/zrodla/prg/jednostki.zip (164 MB, nie idzie do repozytorium).
 * Pobranie:
 *   curl -L -o dane/zrodla/prg/jednostki.zip \
 *     https://opendata.geoportal.gov.pl/prg/granice/00_jednostki_administracyjne.zip
 *
 * Wyjscie: public/mapa/gminy.json — kontury uproszczone algorytmem
 * Douglas-Peuckera (src/lib/geometria.ts) i zapisane jako liczby calkowite
 * w setnych tysiecznych stopnia, z kodowaniem roznicowym. Plik JEST
 * w repozytorium, zeby budowanie serwisu nie wymagalo 164 MB zrodla.
 *
 * ZMIERZONE 23.09.2026:
 * - warstwa gmin to A03_Granice_gmin.shp (83 MB), uklad ETRS89 (stopnie),
 * - kod TERYT jest w polu JPT_KOD_JE,
 * - Warszawa wystepuje jako jedna jednostka 146501, a nasza tabela gmin
 *   ma 18 dzielnic — na mapie zostaje jedna Warszawa.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { open as otworzShp } from 'shapefile';
import yauzl from 'yauzl';
import { DatabaseSync } from 'node:sqlite';

const ZRODLO = join(process.cwd(), 'dane', 'zrodla', 'prg', 'jednostki.zip');
const WYJSCIE = join(process.cwd(), 'public', 'mapa', 'gminy.json');
const TOLERANCJA = Number(process.argv.find((a) => a.startsWith('--tolerancja='))?.split('=')[1] ?? 0.004);
const SKALA = 100_000; // stopnie -> liczby calkowite (0,00001 stopnia ~ 1 m)

const log = (s) => process.stdout.write(`${s}\n`);

/** Rozpakowuje shp i dbf warstwy gmin do katalogu tymczasowego. */
function rozpakuj(zip, nazwy) {
  return new Promise((ok, blad) => {
    const katalog = join(tmpdir(), `prg-${process.pid}`);
    mkdirSync(katalog, { recursive: true });
    const czekam = new Set(nazwy);
    yauzl.open(zip, { lazyEntries: true }, (e, plik) => {
      if (e) return blad(e);
      plik.readEntry();
      plik.on('entry', (wpis) => {
        if (!czekam.has(wpis.fileName)) return plik.readEntry();
        plik.openReadStream(wpis, (e2, strumien) => {
          if (e2) return blad(e2);
          const cel = createWriteStream(join(katalog, wpis.fileName));
          strumien.pipe(cel);
          cel.on('close', () => {
            czekam.delete(wpis.fileName);
            if (czekam.size === 0) ok(katalog);
            else plik.readEntry();
          });
        });
      });
      plik.on('end', () => (czekam.size ? blad(new Error(`brak w archiwum: ${[...czekam]}`)) : null));
    });
  });
}

async function main() {
  if (!existsSync(ZRODLO)) {
    log(`Brak ${ZRODLO}. Pobierz (164 MB):`);
    log('  curl -L -o dane/zrodla/prg/jednostki.zip https://opendata.geoportal.gov.pl/prg/granice/00_jednostki_administracyjne.zip');
    process.exit(2);
  }
  const suma = createHash('sha256').update(readFileSync(ZRODLO)).digest('hex');
  log(`-> zrodlo PRG, SHA-256 ${suma.slice(0, 16)}…`);

  const katalog = await rozpakuj(ZRODLO, ['A03_Granice_gmin.shp', 'A03_Granice_gmin.dbf']);
  const zrodlo = await otworzShp(
    createReadStream(join(katalog, 'A03_Granice_gmin.shp')),
    createReadStream(join(katalog, 'A03_Granice_gmin.dbf')),
    { encoding: 'utf-8' },
  );

  const { uprosc, domknij, pole } = await import('../src/lib/geometria.ts');
  const gminy = [];
  let punktowPrzed = 0;
  let punktowPo = 0;
  for (let w = await zrodlo.read(); !w.done; w = await zrodlo.read()) {
    const teryt = String(w.value.properties.JPT_KOD_JE ?? '').slice(0, 6);
    if (!/^\d{6}$/.test(teryt)) continue;
    const g = w.value.geometry;
    const wielokaty = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
    const pierscienie = [];
    for (const wielokat of wielokaty) {
      // Tylko obrys zewnetrzny: dziury w gminie (enklawy) to na mapie
      // Polski ulamek piksela, a podwajaja rozmiar pliku.
      const zewn = wielokat[0];
      if (!zewn) continue;
      punktowPrzed += zewn.length;
      const u = domknij(uprosc(zewn.map((p) => [p[0], p[1]]), TOLERANCJA));
      // Wysepki mniejsze niz ~1 km2 po uproszczeniu znikaja i tak.
      if (u.length >= 4 && pole(u) > 0.0001) {
        pierscienie.push(u);
        punktowPo += u.length;
      }
    }
    if (pierscienie.length) gminy.push({ teryt, pierscienie });
  }
  log(`   ${gminy.length} gmin, punktow ${punktowPrzed} -> ${punktowPo}`);

  // Kontrola dziedziny: czy kody z PRG zgadzaja sie z naszymi gminami.
  const baza = join(process.cwd(), 'dane', 'sejm.db');
  if (existsSync(baza)) {
    const db = new DatabaseSync(baza, { readOnly: true });
    const nasze = new Set(db.prepare("select teryt from gminy where rodzaj <> 'dzielnica Warszawy'").all().map((r) => r.teryt));
    nasze.add('146501');
    const zPrg = new Set(gminy.map((g) => g.teryt));
    const brakujace = [...nasze].filter((t) => !zPrg.has(t));
    const nadmiarowe = [...zPrg].filter((t) => !nasze.has(t));
    log(`   nasze gminy bez konturu: ${brakujace.length}${brakujace.length ? ` (${brakujace.slice(0, 5)})` : ''}`);
    log(`   kontury bez naszej gminy: ${nadmiarowe.length}${nadmiarowe.length ? ` (${nadmiarowe.slice(0, 5)})` : ''}`);
  }

  // Zapis: liczby calkowite, kodowanie roznicowe wzgledem poprzedniego punktu.
  const zakres = { xmin: 999, ymin: 999, xmax: -999, ymax: -999 };
  for (const g of gminy) {
    for (const p of g.pierscienie) {
      for (const [x, y] of p) {
        if (x < zakres.xmin) zakres.xmin = x;
        if (x > zakres.xmax) zakres.xmax = x;
        if (y < zakres.ymin) zakres.ymin = y;
        if (y > zakres.ymax) zakres.ymax = y;
      }
    }
  }
  const kod = (pierscien) => {
    let px = 0;
    let py = 0;
    const czesci = [];
    for (const [x, y] of pierscien) {
      const cx = Math.round(x * SKALA);
      const cy = Math.round(y * SKALA);
      czesci.push(`${cx - px},${cy - py}`);
      px = cx;
      py = cy;
    }
    return czesci.join(' ');
  };
  const wynik = {
    zrodlo: 'PRG (GUGiK), warstwa A03_Granice_gmin',
    sha256: suma,
    skala: SKALA,
    tolerancja: TOLERANCJA,
    zakres,
    gminy: Object.fromEntries(gminy.map((g) => [g.teryt, g.pierscienie.map(kod)])),
  };
  mkdirSync(join(process.cwd(), 'public', 'mapa'), { recursive: true });
  writeFileSync(WYJSCIE, JSON.stringify(wynik), 'utf8');
  const kb = Math.round(readFileSync(WYJSCIE).length / 1024);
  log(`   zapisane: public/mapa/gminy.json (${kb} kB)`);
}

await main();
