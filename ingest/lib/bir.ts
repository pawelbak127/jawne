/**
 * REGON przez usluge BIR 1.1 (GUS).
 *
 * ZMIERZONE 24.09.2026 na produkcji: `Zaloguj` 0,4 s, `DaneSzukajPodmioty`
 * z trzema NIP-ami 0,1 s. Odpowiedz ma pola: Regon, Nip, Nazwa, Wojewodztwo,
 * Powiat, Gmina, Miejscowosc, KodPocztowy, Ulica, NrNieruchomosci, **Typ**
 * (F albo P), SilosID, MiejscowoscPoczty.
 *
 * **Parametr `Nipy` bierze NAJWYZEJ 20 numerow naraz.** Dokumentacja mowi
 * o stu rekordach w odpowiedzi, ale to co innego: przy 21 numerach
 * w zapytaniu usluga oddaje PUSTA odpowiedz — HTTP 200, bez bledu i bez
 * ostrzezenia. ZMIERZONE: 20 -> 20 rekordow, 21 -> 0, 50 -> 0, 100 -> 0.
 * Pierwsza wersja importu wysylala po 100 i „znalazla" 3 podmioty z 28 603.
 *
 * Licencja zbioru na dane.gov.pl (544): CC BY 4.0 — wolno przechowywac
 * i pokazywac z podaniem zrodla (patrz docs/zrodla.md).
 *
 * To SOAP 1.2 z WS-Addressing, ale bez biblioteki: dwie koperty i jedno
 * rozkodowanie XML-a w XML-u. Dodawanie klienta SOAP dla dwoch wywolan
 * byloby drozsze niz te trzydziesci linii.
 */
import { pobierz } from './http.js';

const USLUGA = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const AKCJA = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl';

export const kluczBir = (): string | null => process.env.GUS_BIR_KLUCZ?.trim() || null;

export type PodmiotRegon = {
  nip: string;
  regon: string | null;
  nazwa: string | null;
  typ: string | null;
  silos: string | null;
  wojewodztwo: string | null;
  powiat: string | null;
  gmina: string | null;
  miejscowosc: string | null;
  kodPocztowy: string | null;
};

async function soap(operacja: string, cialo: string, sid?: string): Promise<string> {
  const koperta = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://CIS/BIR/PUBL/2014/07"
               xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract"
               xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soap:Header><wsa:To>${USLUGA}</wsa:To><wsa:Action>${AKCJA}/${operacja}</wsa:Action></soap:Header>
  <soap:Body>${cialo}</soap:Body>
</soap:Envelope>`;
  const odp = await pobierz(USLUGA, {
    json: false,
    metoda: 'POST',
    cialo: koperta,
    typTresci: 'application/soap+xml;charset=UTF-8',
    // ZMIERZONE 24.09.2026: bez tego naglowka usluga odpowiada MTOM/XOP
    // (wieloczesciowa koperta `--uuid:…`), w ktorej nie ma czego parsowac
    // zwyklym wyrazeniem. Sonda dzialala, bo `fetch` nie wysylal Accept.
    naglowki: { Accept: 'application/soap+xml', ...(sid ? { sid } : {}) },
  });
  const tekst = await odp.text();
  // Gdyby mimo to przyszla koperta wieloczesciowa — bierzemy z niej XML.
  const poczatek = tekst.indexOf('<s:Envelope');
  return poczatek > 0 ? tekst.slice(poczatek) : tekst;
}

// String.raw, bo w zwyklym szablonie `\s` to po prostu litera "s" — i regula
// "<Tag>(cokolwiek)</Tag>" cicho zamienia sie w "<Tag>(same s i S)</Tag>".
const miedzy = (tekst: string, znacznik: string): string | null =>
  new RegExp(String.raw`<${znacznik}[^>]*>([\s\S]*?)</${znacznik}>`).exec(tekst)?.[1] ?? null;

const rozkoduj = (t: string): string =>
  t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

export async function zaloguj(): Promise<string> {
  const k = kluczBir();
  if (!k) throw new Error('Brak GUS_BIR_KLUCZ (.env.local albo /etc/jawne/jawne.env)');
  const odp = await soap('Zaloguj', `<ns:Zaloguj><ns:pKluczUzytkownika>${k}</ns:pKluczUzytkownika></ns:Zaloguj>`);
  const sid = miedzy(odp, 'ZalogujResult');
  if (!sid) throw new Error(`BIR: logowanie nie oddalo sesji — ${odp.slice(0, 200)}`);
  return sid;
}

export const wyloguj = (sid: string) =>
  soap('Wyloguj', `<ns:Wyloguj><ns:pIdentyfikatorSesji>${sid}</ns:pIdentyfikatorSesji></ns:Wyloguj>`, sid);

/** NAJWYZEJ 20 NIP-ow na wywolanie — powyzej usluga milczy (patrz wyzej). */
export const NIPOW_NA_RAZ = 20;

export async function szukajPoNipach(sid: string, nipy: readonly string[]): Promise<PodmiotRegon[]> {
  const odp = await soap(
    'DaneSzukajPodmioty',
    `<ns:DaneSzukajPodmioty><ns:pParametryWyszukiwania><dat:Nipy>${nipy.join(',')}</dat:Nipy>`
    + '</ns:pParametryWyszukiwania></ns:DaneSzukajPodmioty>',
    sid,
  );
  const wynik = rozkoduj(miedzy(odp, 'DaneSzukajPodmiotyResult') ?? '');
  const pole = (blok: string, nazwa: string) =>
    new RegExp(String.raw`<${nazwa}>([\s\S]*?)</${nazwa}>`).exec(blok)?.[1]?.trim() || null;
  return [...wynik.matchAll(/<dane>([\s\S]*?)<\/dane>/g)].map((m) => {
    const b = m[1]!;
    return {
      nip: pole(b, 'Nip') ?? '',
      regon: pole(b, 'Regon'),
      nazwa: pole(b, 'Nazwa'),
      typ: pole(b, 'Typ'),
      silos: pole(b, 'SilosID'),
      wojewodztwo: pole(b, 'Wojewodztwo'),
      powiat: pole(b, 'Powiat'),
      gmina: pole(b, 'Gmina'),
      miejscowosc: pole(b, 'Miejscowosc'),
      kodPocztowy: pole(b, 'KodPocztowy'),
    };
  }).filter((p) => p.nip);
}
