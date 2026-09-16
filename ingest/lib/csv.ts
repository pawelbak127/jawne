/**
 * Parser CSV bez zaleznosci. Obsluguje to, co rejestry publiczne faktycznie
 * wysylaja: BOM na poczatku, CRLF, pola w cudzyslowach obok pol bez nich,
 * podwojony cudzyslow wewnatrz pola i separator inny niz przecinek.
 *
 * Zwraca wylacznie teksty. Zamiana na liczby nalezy do wywolujacego, bo to on
 * wie, ze "20101" to kod TERYT z obcietym zerem, a nie liczba.
 */
export function parsujCsv(tekst: string, separator = ';'): string[][] {
  const zrodlo = tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst;
  const wiersze: string[][] = [];
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
      wiersze.push(wiersz);
      wiersz = [];
      pole = '';
    } else {
      pole += z;
    }
  }
  // Ostatni wiersz bez konca linii — inaczej zginalby po cichu.
  if (pole !== '' || wiersz.length > 0) {
    wiersz.push(pole);
    wiersze.push(wiersz);
  }
  return wiersze;
}
