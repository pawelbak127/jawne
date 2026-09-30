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
const WYJSCIE_POWIATY = join(process.cwd(), 'public', 'mapa', 'powiaty.json');
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

  const katalog = await rozpakuj(ZRODLO, [
    'A03_Granice_gmin.shp', 'A03_Granice_gmin.dbf',
    // Granice wojewodztw bierzemy z WLASNEJ warstwy PRG, a nie sklejamy
    // z gmin. ZMIERZONE 29.09.2026: po uproszczeniu kazdej gminy osobno
    // wspolne krawedzie sasiadow NIE sa identyczne (46 327 krawedzi wystepuje
    // raz, tylko 22 326 dwa razy), wiec scalanie po krawedziach daloby
    // poszarpany obrys. Wizualnie granice pasuja, punktowo nie.
    'A01_Granice_wojewodztw.shp', 'A01_Granice_wojewodztw.dbf',
    // Powiaty: warstwa przegladowa mapy. Ta sama tolerancja co gminy, zeby
    // po przelaczeniu poziomu granica zewnetrzna kraju nie „drgala".
    'A02_Granice_powiatow.shp', 'A02_Granice_powiatow.dbf',
  ]);
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

  // Warstwy zbiorcze (wojewodztwa, powiaty): ta sama tolerancja co gminy,
  // zeby obrysy lezaly na granicach gmin.
  const warstwaZbiorcza = async (plik, cyfr) => {
    const zr = await otworzShp(
      createReadStream(join(katalog, `${plik}.shp`)),
      createReadStream(join(katalog, `${plik}.dbf`)),
      { encoding: 'utf-8' },
    );
    const jednostki = [];
    for (let w = await zr.read(); !w.done; w = await zr.read()) {
      const kodJ = String(w.value.properties.JPT_KOD_JE ?? '').slice(0, cyfr);
      const nazwa = String(w.value.properties.JPT_NAZWA_ ?? '').trim();
      // `String.raw`, bo w zwyklym szablonie `\d` to litera „d” (pulapka 48).
      if (!new RegExp(String.raw`^\d{${cyfr}}$`).test(kodJ)) continue;
      const g = w.value.geometry;
      const wielokaty = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
      const pierscienie = [];
      for (const wielokat of wielokaty) {
        const zewn = wielokat[0];
        if (!zewn) continue;
        const u = domknij(uprosc(zewn.map((p) => [p[0], p[1]]), TOLERANCJA));
        if (u.length >= 4 && pole(u) > 0.0001) pierscienie.push(u);
      }
      if (pierscienie.length) jednostki.push({ kod: kodJ, nazwa, pierscienie });
    }
    const punktow = jednostki.reduce((a, j) => a + j.pierscienie.reduce((b, p) => b + p.length, 0), 0);
    log(`   ${jednostki.length} z ${plik}, punktow ${punktow}`);
    return jednostki;
  };

  // Nazwa wojewodztwa mala litera: tak sie ja pisze i tak wyglada w liscie.
  const wojewodztwa = (await warstwaZbiorcza('A01_Granice_wojewodztw', 2))
    .map((w) => ({ ...w, nazwa: w.nazwa.toLowerCase() }));
  // Powiat zostaje z pisownia rejestru: „bolesławiecki", ale „Wrocław".
  const powiaty = await warstwaZbiorcza('A02_Granice_powiatow', 4);

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

    /*
     * Powiaty: nazwy bierze strona z naszej tabeli `gminy` (pisownia PKW),
     * w pliku byloby drugie zrodlo prawdy. Sprawdzamy tylko, czy obie listy
     * maja te same kody — rozjazd znaczylby, ze ktorys powiat wypadnie
     * z mapy po cichu.
     */
    const naszePow = new Set(
      db.prepare("select distinct substr(teryt, 1, 4) as kod from gminy where rodzaj <> 'dzielnica Warszawy'")
        .all().map((r) => r.kod),
    );
    naszePow.add('1465');
    const prgPow = new Set(powiaty.map((p) => p.kod));
    const bezKonturu = [...naszePow].filter((k) => !prgPow.has(k));
    const bezPowiatu = [...prgPow].filter((k) => !naszePow.has(k));
    log(`   powiaty: ${naszePow.size} naszych, ${prgPow.size} w PRG; bez konturu ${bezKonturu.length}${bezKonturu.length ? ` (${bezKonturu.slice(0, 5)})` : ''}, bez naszego ${bezPowiatu.length}${bezPowiatu.length ? ` (${bezPowiatu.slice(0, 5)})` : ''}`);
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
  const obrysyWojewodztw = wojewodztwa.map((w) => ({ kod: w.kod, nazwa: w.nazwa, ksztalt: w.pierscienie.map(kod) }));
  const wynik = {
    zrodlo: 'PRG (GUGiK), warstwy A03_Granice_gmin i A01_Granice_wojewodztw',
    sha256: suma,
    skala: SKALA,
    tolerancja: TOLERANCJA,
    zakres,
    gminy: Object.fromEntries(gminy.map((g) => [g.teryt, g.pierscienie.map(kod)])),
    wojewodztwa: obrysyWojewodztw,
  };
  mkdirSync(join(process.cwd(), 'public', 'mapa'), { recursive: true });
  writeFileSync(WYJSCIE, JSON.stringify(wynik), 'utf8');
  const kb = Math.round(readFileSync(WYJSCIE).length / 1024);
  log(`   zapisane: public/mapa/gminy.json (${kb} kB)`);

  /*
   * Powiaty w OSOBNYM pliku, nie obok gmin.
   * ZMIERZONE: dolozenie 380 powiatow (37 826 punktow) do gminy.json podnosi
   * go z 943 kB do 1 401 kB — i placiliby za to takze ci, ktorzy zostaja
   * na widoku gmin. Kazdy poziom mapy pobiera dokladnie jeden plik, wiec
   * obrysy wojewodztw sa w obu (7 875 punktow, ok. 60 kB) zamiast trzeciego
   * zadania sieciowego.
   */
  const wynikP = {
    zrodlo: 'PRG (GUGiK), warstwy A02_Granice_powiatow i A01_Granice_wojewodztw',
    sha256: suma,
    skala: SKALA,
    tolerancja: TOLERANCJA,
    // Ten sam zakres co gminy: oba poziomy musza sie rzutowac tak samo,
    // inaczej po przelaczeniu mapa skacze.
    zakres,
    powiaty: Object.fromEntries(powiaty.map((p) => [p.kod, p.pierscienie.map(kod)])),
    wojewodztwa: obrysyWojewodztw,
  };
  writeFileSync(WYJSCIE_POWIATY, JSON.stringify(wynikP), 'utf8');
  log(`   zapisane: public/mapa/powiaty.json (${Math.round(readFileSync(WYJSCIE_POWIATY).length / 1024)} kB)`);
}

await main();
