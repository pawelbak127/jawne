import type { DatabaseSync } from 'node:sqlite';
import { uprosc } from '../../src/lib/tekst.js';
import { wTransakcji } from './baza.js';

/**
 * Indeks wyszukiwania firm (`firmy_szukaj`) — beneficjenci pomocy publicznej.
 *
 * ZMIERZONE 08.10.2026 (pulapka 72): etap trwal na serwerze od 1 h do 2,5 h
 * DZIENNIE i caly ten czas trzymal JEDNA transakcje zapisu. Zadania, ktore
 * w tym czasie chcialy cos zapisac, czekaly 30 minut (`busy_timeout`)
 * i padaly na „database is locked”: 08.10 tak padly `sudop-dzien` i `ted`.
 * Pominiecie etapu przy niezmienionym podpisie (pulapka 64) nic juz nie daje,
 * bo historia SUDOP dopisuje dane co godzine.
 *
 * Dwie przyczyny i dwie zmiany:
 *  1. Plan szedl po indeksie `pomoc_nip` (`nip_beneficjenta>?`), czyli czytal
 *     8,7 mln wierszy w kolejnosci NIP-ow — w losowych miejscach pliku 7 GB.
 *     Na serwerze to 7 MB/s; ten sam plik czytany po kolei daje 149 MB/s
 *     (`dd`, 08.10.2026). Dlatego `NOT INDEXED`: przeglad po kolei
 *     i sortowanie w pliku tymczasowym SQLite.
 *  2. Wszystko liczy sie do tabel TYMCZASOWYCH (schemat `temp` to osobny plik,
 *     zapis do niego nie blokuje bazy), razem z kluczem `uprosc()`. Baza
 *     glowna dostaje gotowa tabele w jednej krotkiej transakcji na koncu.
 *     Strona do tej chwili czyta stary indeks — tryb WAL.
 *
 * Wynik ma byc identyczny jak z dawnego jednego zapytania (test porownuje):
 * nazwa i TERYT z najnowszego przypadku z nazwa, liczba przypadkow, suma
 * brutto (NULL, gdy zadnej kwoty — regula 4) i najwieksza pojedyncza pomoc
 * w euro, ktora decyduje o progu jawnosci.
 */
export function zbudujIndeksFirm(db: DatabaseSync): number {
  db.exec(`
    drop table if exists temp.firmy_nowe;
    create temp table firmy_nowe (
      nip        text primary key,
      nazwa      text not null,
      szukaj     text not null,
      przypadkow integer not null,
      brutto     real,
      max_eur    real,
      teryt      text
    ) without rowid;
    insert into temp.firmy_nowe(nip, nazwa, szukaj, przypadkow, brutto, max_eur, teryt)
    select s.nip, coalesce(n.nazwa, ''), '', s.przypadkow, s.brutto, s.max_eur, n.teryt
      from (select nip_beneficjenta as nip, count(*) as przypadkow,
                   sum(wartosc_brutto) as brutto, max(wartosc_brutto_eur) as max_eur
              from main.pomoc_publiczna not indexed where nip_beneficjenta is not null
             group by nip_beneficjenta) s
      join (select nip, nazwa, teryt from
              (select nip_beneficjenta as nip, nazwa_beneficjenta as nazwa, teryt,
                      row_number() over (partition by nip_beneficjenta
                                         order by (nazwa_beneficjenta is null), dzien desc, id desc) as rn
                 from main.pomoc_publiczna not indexed where nip_beneficjenta is not null)
             where rn = 1) n on n.nip = s.nip;
  `);

  // uprosc() to funkcja TS (SQL-owy lower() nie zdejmuje ogonkow). Partiami
  // po kluczu, bo przy calej historii to ponad dwa miliony firm.
  const partia = db.prepare('select nip, nazwa from temp.firmy_nowe where nip > ? order by nip limit 50000');
  const ustaw = db.prepare('update temp.firmy_nowe set szukaj = ? where nip = ?');
  let firm = 0;
  for (let od = ''; ;) {
    const wiersze = partia.all(od) as unknown as { nip: string; nazwa: string }[];
    if (!wiersze.length) break;
    db.exec('begin');
    try {
      for (const f of wiersze) ustaw.run(uprosc(f.nazwa) || ' ', f.nip);
      db.exec('commit');
    } catch (e) {
      db.exec('rollback');
      throw e;
    }
    firm += wiersze.length;
    od = wiersze[wiersze.length - 1]!.nip;
  }

  // Jedyny zapis do bazy glownej: kopia gotowej tabeli, w kolejnosci klucza.
  wTransakcji(db, () => {
    db.exec(`
      drop table if exists main.firmy_szukaj;
      create table main.firmy_szukaj (
        nip        text primary key,
        nazwa      text not null,       -- z NAJNOWSZEGO przypadku, jak na stronie firmy
        szukaj     text not null,       -- uprosc(nazwa)
        przypadkow integer not null,
        brutto     real,
        max_eur    real,                -- najwieksza POJEDYNCZA pomoc: decyduje o progu jawnosci
        teryt      text
      ) without rowid;
      insert into main.firmy_szukaj select * from temp.firmy_nowe order by nip;
    `);
  });
  db.exec('drop table temp.firmy_nowe');
  return firm;
}
