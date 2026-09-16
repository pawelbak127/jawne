/**
 * Geometria polkola izby. Czysta funkcja — zadnego DOM-u, zeby dalo sie
 * sprawdzic testem, ze miejsc jest DOKLADNIE tyle, ile mandatow.
 *
 * Wykres izby, na ktorym brakuje trzech kropek, jest bledem merytorycznym,
 * a nie kosmetycznym: czytelnik liczy z niego wiekszosc.
 */

export type Miejsce = {
  x: number;
  y: number;
  /** Promien kropki — mniejszy w rzedach wewnetrznych, zeby sie nie zlewaly. */
  r: number;
  /** Kat w radianach, od lewej (PI) do prawej (0). Po nim sortujemy bloki. */
  kat: number;
  rzad: number;
};

export type UkladPolkola = {
  miejsca: Miejsce[];
  szerokosc: number;
  wysokosc: number;
};

/**
 * Liczba rzedow. Zbyt malo rzedow daje kropki rozciagniete w cienka wstege,
 * zbyt duzo — plame. Pierwiastek z liczby miejsc podzielony przez ~2,2 daje
 * dla 460 mandatow 9 rzedow, co jest ukladem zblizonym do planu sali.
 */
function liczbaRzedow(n: number): number {
  return Math.max(3, Math.round(Math.sqrt(n) / 2.2));
}

/**
 * Rozmieszcza `n` miejsc w polkolu.
 *
 * Miejsca w rzedzie sa proporcjonalne do dlugosci luku (czyli do promienia),
 * bo inaczej rzad zewnetrzny robi sie rzadki, a wewnetrzny zbity. Reszta
 * z zaokraglenia doklada sie do rzedow zewnetrznych — tam jest najwiecej
 * miejsca.
 */
export function ulozPolkole(n: number, opcje: { promienWew?: number; promienZew?: number } = {}): UkladPolkola {
  const promienZew = opcje.promienZew ?? 100;
  const promienWew = opcje.promienWew ?? promienZew * 0.42;
  const rzedy = liczbaRzedow(n);

  const promienie = Array.from({ length: rzedy }, (_, i) =>
    rzedy === 1 ? promienZew : promienWew + ((promienZew - promienWew) * i) / (rzedy - 1),
  );
  const sumaPromieni = promienie.reduce((a, r) => a + r, 0);

  // Podzial proporcjonalny + rozdanie reszty od rzedu najbardziej zewnetrznego.
  const wRzedzie = promienie.map((r) => Math.floor((n * r) / sumaPromieni));
  let brakuje = n - wRzedzie.reduce((a, v) => a + v, 0);
  for (let i = rzedy - 1; brakuje > 0; i = (i - 1 + rzedy) % rzedy) {
    wRzedzie[i] = (wRzedzie[i] ?? 0) + 1;
    brakuje--;
  }

  const odstep = (promienZew - promienWew) / Math.max(1, rzedy - 1);
  const miejsca: Miejsce[] = [];

  for (let i = 0; i < rzedy; i++) {
    const ile = wRzedzie[i] ?? 0;
    const promien = promienie[i]!;
    if (ile === 0) continue;
    // Kropka nie moze dotykac sasiada ani w luku, ani miedzy rzedami.
    const rozmiar = Math.min(odstep * 0.36, ((Math.PI * promien) / Math.max(ile, 1)) * 0.38);
    for (let j = 0; j < ile; j++) {
      // Margines PI*0.02 z obu stron, zeby skrajne kropki nie siadaly na osi.
      const t = ile === 1 ? 0.5 : j / (ile - 1);
      const kat = Math.PI * (1 - 0.02) - t * Math.PI * (1 - 0.04);
      miejsca.push({
        x: Math.cos(kat) * promien,
        y: -Math.sin(kat) * promien,
        r: rozmiar,
        kat,
        rzad: i,
      });
    }
  }

  // Bloki klubowe maja byc CIAGLYMI wycinkami, wiec kolejnosc przydzialu idzie
  // po kacie (od lewej), a przy rownym kacie — od rzedu wewnetrznego.
  miejsca.sort((a, b) => b.kat - a.kat || a.rzad - b.rzad);

  const margines = promienZew * 0.06;
  return {
    miejsca,
    szerokosc: (promienZew + margines) * 2,
    wysokosc: promienZew + margines * 2,
  };
}

/**
 * Przydziela miejsca kolejnym blokom. Zwraca indeks bloku dla kazdego miejsca.
 * Suma `rozmiary` musi rowna sie liczbie miejsc — inaczej rzuca, zamiast
 * po cichu zostawic nieprzypisane kropki.
 */
export function przydzielBloki(ileMiejsc: number, rozmiary: readonly number[]): number[] {
  const suma = rozmiary.reduce((a, v) => a + v, 0);
  if (suma !== ileMiejsc) {
    throw new Error(`Bloki sumuja sie do ${suma}, a miejsc jest ${ileMiejsc}`);
  }
  const przydzial: number[] = [];
  rozmiary.forEach((ile, blok) => {
    for (let i = 0; i < ile; i++) przydzial.push(blok);
  });
  return przydzial;
}
