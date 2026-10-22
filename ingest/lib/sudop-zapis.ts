/**
 * Zapis przypadkow SUDOP do bazy — wspolny dla importu (jobs/sudop.ts)
 * i uzupelnienia przypadkow bez gminy (lib/bez-gminy.ts), zeby klucze
 * jednoznaczne liczyly sie w obu miejscach DOKLADNIE tak samo (pulapka 32).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { DatabaseSync } from 'node:sqlite';
import { wTransakcji } from './baza.js';
import { dniDoZachowania, dodajDni, dzienWarszawa, type DzienPobrany } from './harmonogram.js';
import {
  kluczePorcji, kwota, sprawdzPorcjePrzyrostu, terytGminyZKodu, wojewodztwoZKodu,
  type OdpowiedzSudop, type PrzypadekPomocy,
} from './sudop.js';

/** Zapisana wczesniej odpowiedz, zwykla albo spakowana (.gz). */
export function zapisanaOdpowiedz(plik: string): OdpowiedzSudop | null {
  if (existsSync(plik)) return JSON.parse(readFileSync(plik, 'utf8')) as OdpowiedzSudop;
  if (existsSync(`${plik}.gz`)) return JSON.parse(gunzipSync(readFileSync(`${plik}.gz`)).toString('utf8')) as OdpowiedzSudop;
  return null;
}

/**
 * Wstawia porcje. Klucz z numerem powtorzenia — zrodlo ma prawdziwe wiersze
 * identyczne na wszystkich polach (osobne transze tej samej pomocy).
 */
export function wstawWiersze(
  db: DatabaseSync,
  wyniki: readonly PrzypadekPomocy[],
  terytZWiersza: (w: PrzypadekPomocy) => string | null,
  // Wspolny dla CALEJ porcji, nawet gdy idzie stronami — patrz `kluczePorcji`.
  licznik: Map<string, number> = new Map(),
  // Przypadki bez gminy ida do osobnej tabeli, z kodem wojewodztwa zamiast TERYT-u.
  cel: 'pomoc_publiczna' | 'pomoc_bez_gminy' = 'pomoc_publiczna',
): void {
  const pierwsza = cel === 'pomoc_publiczna' ? 'teryt' : 'wojewodztwo';
  const wstaw = db.prepare(
    `insert into ${cel}(${pierwsza}, kod_gminy_sudop, dzien, nip_beneficjenta, nazwa_beneficjenta,
       wielkosc_kod, wielkosc, pkd, pkd_nazwa, nip_udzielajacego, udzielajacy, srodek_numer,
       srodek_nazwa, podstawa, przeznaczenie_kod, przeznaczenie, forma_kod, forma,
       wartosc_nominalna, wartosc_brutto, wartosc_brutto_eur, klucz)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const klucze = kluczePorcji(wyniki, licznik);
  wyniki.forEach((w, i) => {
    const podstawa = [w['podstawa-prawna-2a-nazwa'], w['podstawa-prawna-2b'], w['podstawa-prawna-2c']]
      .filter((x) => x && x.trim()).join(' — ') || null;
    wstaw.run(
      terytZWiersza(w), w['gmina-siedziby-kod'], w['dzien-udzielenia-pomocy']!, w['nip-beneficjenta'],
      w['nazwa-beneficjenta'], w['wielkosc-beneficjenta-kod'], w['wielkosc-beneficjenta-nazwa'],
      w['sektor-dzialalnosci-kod'], w['sektor-dzialalnosci-nazwa'], w['nip-udzielajacego-pomocy'],
      w['nazwa-udzielajacego-pomocy'], w['srodek-pomocowy-numer'], w['srodek-pomocowy-nazwa'],
      podstawa, w['przeznaczenie-pomocy-kod'], w['przeznaczenie-pomocy-nazwa'],
      w['forma-pomocy-kod'], w['forma-pomocy-nazwa'], kwota(w['wartosc-nominalna-pln']),
      kwota(w['wartosc-brutto-pln']), kwota(w['wartosc-brutto-eur']), klucze[i]!,
    );
  });
}

/**
 * Zapis porcji krajowej — STRONA PO STRONIE z dysku, nie z jednej tablicy.
 *
 * ZGLOSZENIE PAWLA 02.10.2026, z dziennika serwera: zakres
 * 2024-12-17..2024-12-19 ma **853 247 wynikow**. Wszystkie 86 stron lezalo
 * juz na dysku („strona N: z pliku"), a wznowienie wczytywalo je do jednej
 * tablicy — przy ~1,4 kB na przypadek to ok. 1,2 GB obiektow JS przy stercie
 * 920 MB. Proces padal na stronie 66 z „Reached heap limit", **co godzine**,
 * bo timer historii tyka co godzine. Nie zawiodla kolejka urzedu: przewracalismy
 * sie na wlasnych, juz pobranych danych.
 *
 * To ta sama lekcja co pulapka 57 (`.all()` wobec `.iterate()`), tylko po
 * stronie pobierania: **jesli liczba wierszy rosnie z zakresem, nie wolno
 * trzymac ich wszystkich naraz** — ani w SQL, ani w JSON-ie.
 *
 * Co zostaje nienaruszone:
 *  - **calosc albo nic**: wszystko idzie w JEDNEJ transakcji, wiec blad
 *    kontroli na stronie 60 wycofuje tez strony 1-59 (pulapka 56);
 *  - **kontrola dziedziny przed zapisem** (wzorzec 1) — dla kazdej strony;
 *  - **licznik powtorzen wspolny dla calej porcji** (pulapka 32): grupa
 *    identycznych wierszy potrafi lezec na granicy stron, a osobny licznik
 *    na strone nadalby obu numer #0 i jeden przepadlby na kluczu.
 */
export function zapiszPrzyrost(
  db: DatabaseSync, katalog: string, od: string, doDnia: string, stron: number, znane: ReadonlySet<string>, pobrano: string | null,
  odswiez = false,
): { zapisanych: number; obce: number; gmin: number; zachowanych: number } {
  const naDzien = new Map<string, number>();
  const bezGminyNaDzien = new Map<string, { ile: number; brutto: number }>();
  const gminy = new Set<string>();
  const licznik = new Map<string, number>();
  let zapisanych = 0;
  let obce = 0;

  /*
   * Dni JUZ USTALONE zostaja nietkniete (15.10.2026). ZMIERZONE na serwerze:
   * zakres 13–19.06.2020 dobiegl konca godzine po krotszym 18–19.06 i przepisal
   * te dwa dni z nowa data pobrania. Dla sum przyrostowych to „policzony dzien
   * pobrano od nowa”, wiec stan liczyl sie od zera — 7 647 s ciezkiej pracy
   * dysku przy tych samych danych. Dzien ustalony sie nie zmienia (pulapka 37),
   * wiec nakladajacy sie zakres nie ma czego w nim poprawic. Jawne --odswiez
   * dalej przepisuje wszystko.
   */
  const zachowane = dniDoZachowania(db.prepare(
    'select dzien, coalesce(pobrano_dzien, substr(pobrano, 1, 10)) as pobrano from pomoc_publiczna_dni where dzien between ? and ?',
  ).all(od, doDnia) as unknown as DzienPobrany[], odswiez);

  wTransakcji(db, () => {
    if (zachowane.size) {
      const usun = db.prepare('delete from pomoc_publiczna where dzien = ?');
      const usunBez = db.prepare('delete from pomoc_bez_gminy where dzien = ?');
      for (let d = od; d <= doDnia; d = dodajDni(d, 1)) {
        if (!zachowane.has(d)) {
          usun.run(d);
          usunBez.run(d);
        }
      }
    } else {
      db.prepare('delete from pomoc_publiczna where dzien between ? and ?').run(od, doDnia);
      db.prepare('delete from pomoc_bez_gminy where dzien between ? and ?').run(od, doDnia);
    }
    for (let strona = 1; strona <= stron; strona++) {
      const odp = zapisanaOdpowiedz(join(katalog, `przyrost-${od}-${doDnia}-s${strona}.json`));
      if (!odp) throw new Error(`${od}..${doDnia}: brak strony ${strona} na dysku przy zapisie`);
      const wyniki = odp.wyniki ?? [];
      const problemy = sprawdzPorcjePrzyrostu(wyniki, od, doDnia);
      if (problemy.length) {
        throw new Error(`Porcja ${od}..${doDnia} strona ${strona} nie przeszla kontroli: ${problemy.slice(0, 10).join('; ')}`);
      }
      // Bez gminy z naszej listy (kod samego wojewodztwa „NZ”, „BRAK DANYCH”
      // albo jednostka spoza PKW) — do osobnej tabeli, nie w niebyt (U6).
      const wGmine = (w: PrzypadekPomocy) => {
        const t = terytGminyZKodu(w['gmina-siedziby-kod']);
        return t !== null && znane.has(t);
      };
      const doZapisu = zachowane.size ? wyniki.filter((w) => !zachowane.has(w['dzien-udzielenia-pomocy']!)) : wyniki;
      const nasze = doZapisu.filter(wGmine);
      const bezGminy = doZapisu.filter((w) => !wGmine(w));
      obce += wyniki.filter((w) => !wGmine(w)).length;
      zapisanych += nasze.length;
      for (const w of nasze) {
        const d = w['dzien-udzielenia-pomocy']!;
        naDzien.set(d, (naDzien.get(d) ?? 0) + 1);
        gminy.add(terytGminyZKodu(w['gmina-siedziby-kod'])!);
      }
      for (const w of bezGminy) {
        const d = w['dzien-udzielenia-pomocy']!;
        const s = bezGminyNaDzien.get(d) ?? { ile: 0, brutto: 0 };
        s.ile++;
        s.brutto += kwota(w['wartosc-brutto-pln']) ?? 0;
        bezGminyNaDzien.set(d, s);
      }
      wstawWiersze(db, nasze, (w) => terytGminyZKodu(w['gmina-siedziby-kod'])!, licznik);
      wstawWiersze(db, bezGminy, (w) => wojewodztwoZKodu(w['gmina-siedziby-kod']), licznik, 'pomoc_bez_gminy');
    }
    const wstawDzien = db.prepare(
      `insert into pomoc_publiczna_dni(dzien, pobrano, pobrano_dzien, wierszy, bez_gminy, bez_gminy_brutto) values (?,?,?,?,?,?)
       on conflict(dzien) do update set pobrano=excluded.pobrano, pobrano_dzien=excluded.pobrano_dzien,
         wierszy=excluded.wierszy, bez_gminy=excluded.bez_gminy, bez_gminy_brutto=excluded.bez_gminy_brutto`,
    );
    // Dni bez ani jednego przypadku tez odnotowujemy — inaczej nie odroznimy
    // "nie pytalismy" od "pytalismy i nic nie bylo".
    for (let d = new Date(`${od}T00:00:00Z`); d <= new Date(`${doDnia}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const dzien = d.toISOString().slice(0, 10);
      if (zachowane.has(dzien)) continue;
      // Stary plik bez naszej metryczki: zostawiamy date pobrania, ktora juz
      // jest w bazie — "teraz" oznaczyloby swiezy dzien jako ustalony.
      const istniejaca = pobrano ? null
        : (db.prepare('select pobrano from pomoc_publiczna_dni where dzien = ?').get(dzien) as { pobrano: string } | undefined)?.pobrano;
      const kiedy = pobrano ?? istniejaca ?? new Date().toISOString();
      // Polska data tej samej chwili. Liczymy ja RAZ, przy zapisie: nocne
      // zadanie o 01:17 ma w UTC jeszcze poprzedni dzien, a regula 14 dni
      // jest kalendarzowa (ZMIERZONE 22.09.2026 — patrz ingest/lib/baza.ts).
      const bez = bezGminyNaDzien.get(dzien);
      wstawDzien.run(dzien, kiedy, dzienWarszawa(new Date(kiedy)), naDzien.get(dzien) ?? 0, bez?.ile ?? 0, bez?.brutto ?? 0);
    }
  });
  return { zapisanych, obce, gmin: gminy.size, zachowanych: zachowane.size };
}
