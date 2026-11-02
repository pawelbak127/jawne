import type { Readable } from 'node:stream';
import yauzl from 'yauzl';

/**
 * Strumien jedynego pliku o danym rozszerzeniu z archiwum NA DYSKU — dla
 * archiwow, ktorych zawartosc nie miesci sie rozsadnie w pamieci (CSV
 * sprawozdan MF ma po rozpakowaniu 150–190 MB). Zero albo kilka pasujacych
 * plikow to BLAD: nie zgadujemy, ktory jest wlasciwy.
 */
export function strumienJedynegoPliku(sciezka: string, rozszerzenie: string): Promise<Readable> {
  return new Promise((ok, blad) => {
    yauzl.open(sciezka, { lazyEntries: true, autoClose: false }, (e, archiwum) => {
      if (e || !archiwum) return blad(e ?? new Error(`nie da sie otworzyc ${sciezka}`));
      const pasujace: yauzl.Entry[] = [];
      archiwum.on('entry', (wpis: yauzl.Entry) => {
        if (wpis.fileName.toLowerCase().endsWith(rozszerzenie)) pasujace.push(wpis);
        archiwum.readEntry();
      });
      archiwum.on('end', () => {
        if (pasujace.length !== 1) {
          archiwum.close();
          return blad(new Error(`${sciezka}: ${pasujace.length} plikow ${rozszerzenie} w archiwum, oczekiwany jeden`));
        }
        archiwum.openReadStream(pasujace[0]!, (e2, strumien) => {
          if (e2 || !strumien) return blad(e2 ?? new Error(`nie da sie czytac ${pasujace[0]!.fileName}`));
          strumien.on('close', () => archiwum.close());
          ok(strumien);
        });
      });
      archiwum.on('error', blad);
      archiwum.readEntry();
    });
  });
}

/**
 * Wybrane pliki z archiwum ZIP trzymanego w pamieci — bez rozpakowywania na
 * dysk. Plik, ktorego nie ma w archiwum, jest BLEDEM: zrodlo zmienilo uklad,
 * a import po cichu bez niego bylby pusty (pulapka 59: brak wiersza i brak
 * zmiennej wygladaja z zewnatrz identycznie).
 */
export function plikiZZip(zip: Buffer, nazwy: readonly string[]): Promise<Record<string, Buffer>> {
  return new Promise((ok, blad) => {
    const czekam = new Set(nazwy);
    const wynik: Record<string, Buffer> = {};
    yauzl.fromBuffer(zip, { lazyEntries: true }, (e, archiwum) => {
      if (e || !archiwum) return blad(e ?? new Error('nie da sie otworzyc ZIP'));
      archiwum.on('entry', (wpis: yauzl.Entry) => {
        if (!czekam.has(wpis.fileName)) return archiwum.readEntry();
        archiwum.openReadStream(wpis, (e2, strumien) => {
          if (e2 || !strumien) return blad(e2 ?? new Error(`nie da sie czytac ${wpis.fileName}`));
          const kawalki: Buffer[] = [];
          strumien.on('data', (k: Buffer) => kawalki.push(k));
          strumien.on('error', blad);
          strumien.on('end', () => {
            wynik[wpis.fileName] = Buffer.concat(kawalki);
            czekam.delete(wpis.fileName);
            archiwum.readEntry();
          });
        });
      });
      archiwum.on('end', () => (czekam.size
        ? blad(new Error(`brak w archiwum: ${[...czekam].join(', ')}`))
        : ok(wynik)));
      archiwum.on('error', blad);
      archiwum.readEntry();
    });
  });
}
