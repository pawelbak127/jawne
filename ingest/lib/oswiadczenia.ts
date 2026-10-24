/**
 * Wykaz oswiadczen majatkowych poslow z Kancelarii Sejmu
 * (ingest/zrodla/sejm-oswiadczenia, odpowiedz z 24.10.2026).
 *
 * Tylko metryczka i odnosnik do skanu — skanow nie pobieramy (Kancelaria nie
 * robi wyjatkow od ochrony przed ruchem automatycznym) i nie odczytujemy z nich
 * kwot (reczne pismo na skanie).
 */

export type Oswiadczenie = { poselId: number; rodzaj: string; data: string; plik: string; adres: string };

/** Rodzaje z wykazu z 24.10.2026. Nowy rodzaj jest RAPORTOWANY, nie przerywa importu (wzorzec 2). */
export const RODZAJE_OSWIADCZEN = ['Początek kadencji', 'I rok kadencji', 'II rok kadencji', 'III rok kadencji'];

/** Wiersze CSV z cudzyslowami i BOM-em; przecinek w cudzyslowie nie dzieli pola. */
export function wierszeCsv(tekst: string): string[][] {
  const wynik: string[][] = [];
  for (const linia of tekst.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!linia.trim()) continue;
    const pola: string[] = [];
    let pole = '';
    let wCudzyslowie = false;
    for (let i = 0; i < linia.length; i++) {
      const z = linia[i]!;
      if (z === '"') {
        if (wCudzyslowie && linia[i + 1] === '"') { pole += '"'; i++; } else wCudzyslowie = !wCudzyslowie;
      } else if (z === ',' && !wCudzyslowie) {
        pola.push(pole);
        pole = '';
      } else pole += z;
    }
    pola.push(pole);
    wynik.push(pola);
  }
  return wynik;
}

export type WynikWykazu = { oswiadczenia: Oswiadczenie[]; problemy: string[]; nieznaneRodzaje: string[] };

/**
 * Kontrola dziedziny przed zapisem (wzorzec 1): numer posla w bazie, nazwisko
 * i PIERWSZE imie zgodne z rejestrem (wykaz podaje tez drugie imie, rejestr nie),
 * data RRRR-MM-DD, adres na orka.sejm.gov.pl konczacy sie nazwa pliku.
 * Wiersz z problemem odpada i jest zgloszony — nie wchodzi „na pol”.
 */
export function wykazOswiadczen(tekst: string, poslowie: ReadonlyMap<number, string>): WynikWykazu {
  const [naglowek, ...wiersze] = wierszeCsv(tekst);
  const problemy: string[] = [];
  if (!naglowek || naglowek[0] !== 'Nr leg.' || naglowek[1] !== 'Nazwisko i imię') {
    return { oswiadczenia: [], problemy: [`nieznany naglowek: ${JSON.stringify(naglowek)}`], nieznaneRodzaje: [] };
  }
  const oswiadczenia: Oswiadczenie[] = [];
  const nieznane = new Set<string>();
  wiersze.forEach((w, i) => {
    const nr = `wiersz ${i + 2}`;
    if (w.length < 6) { problemy.push(`${nr}: ${w.length} pol zamiast 6`); return; }
    const [leg, nazwiskoImie, rodzaj, data, plik, adres] = w as [string, string, string, string, string, string];
    const poselId = Number(leg);
    const wRejestrze = Number.isInteger(poselId) ? poslowie.get(poselId) : undefined;
    if (!wRejestrze) { problemy.push(`${nr}: posla ${leg} nie ma w bazie`); return; }
    const [nazwisko, imie] = nazwiskoImie.trim().split(/\s+/);
    const slowa = wRejestrze.split(/\s+/);
    if (!nazwisko || !imie || !slowa.includes(imie) || !wRejestrze.includes(nazwisko)) {
      problemy.push(`${nr}: „${nazwiskoImie}” nie pasuje do posla ${leg} (${wRejestrze})`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { problemy.push(`${nr}: data „${data}”`); return; }
    let url: URL;
    try { url = new URL(adres); } catch { problemy.push(`${nr}: adres „${adres}”`); return; }
    if (url.protocol !== 'https:' || url.host !== 'orka.sejm.gov.pl' || !url.pathname.endsWith(`/${plik}`)) {
      problemy.push(`${nr}: adres poza orka.sejm.gov.pl albo bez pliku ${plik}`);
      return;
    }
    if (!RODZAJE_OSWIADCZEN.includes(rodzaj)) nieznane.add(rodzaj);
    oswiadczenia.push({ poselId, rodzaj, data, plik, adres });
  });
  return { oswiadczenia, problemy, nieznaneRodzaje: [...nieznane] };
}
