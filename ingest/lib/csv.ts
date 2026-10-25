/**
 * Parser CSV bez zaleznosci. Obsluguje to, co rejestry publiczne faktycznie
 * wysylaja: BOM na poczatku, CRLF, pola w cudzyslowach obok pol bez nich,
 * podwojony cudzyslow wewnatrz pola i separator inny niz przecinek.
 *
 * Zwraca wylacznie teksty. Zamiana na liczby nalezy do wywolujacego, bo to on
 * wie, ze "20101" to kod TERYT z obcietym zerem, a nie liczba.
 */
export function parsujCsv(tekst: string, separator = ';'): string[][] {
  return [...wierszeCsvPoKolei(tekst, separator)];
}

/**
 * To samo, wiersz po wierszu. Dla duzych plikow, z ktorych bierzemy ulamek:
 * CORDIS ma 179 tys. wierszy uczestnikow, a polskich jest 2 863 — tablica
 * wszystkich wierszy to setki MB obiektow (pulapki 57 i 61), a generator
 * trzyma jeden wiersz naraz.
 */
export function* wierszeCsvPoKolei(tekst: string, separator = ';'): Generator<string[]> {
  const zrodlo = tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst;
  let wiersz: string[] = [];
  let pole = '';
  let wCudzyslowie = false;

  for (let i = 0; i < zrodlo.length; i++) {
    const z = zrodlo[i]!;
    if (wCudzyslowie) {
      if (z === '"') {
        if (zrodlo[i + 1] === '"') {
          pole += '"';
          i++;
        } else {
          wCudzyslowie = false;
        }
      } else {
        pole += z;
      }
      continue;
    }
    if (z === '"') wCudzyslowie = true;
    else if (z === separator) {
      wiersz.push(pole);
      pole = '';
    } else if (z === '\n' || z === '\r') {
      if (z === '\r' && zrodlo[i + 1] === '\n') i++;
      wiersz.push(pole);
      yield wiersz;
      wiersz = [];
      pole = '';
    } else {
      pole += z;
    }
  }
  // Ostatni wiersz bez konca linii — inaczej zginalby po cichu.
  if (pole !== '' || wiersz.length > 0) {
    wiersz.push(pole);
    yield wiersz;
  }
}
