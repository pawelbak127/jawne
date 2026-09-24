/**
 * Sonda REGON (BIR 1.1) — SPRAWDZA, a nie importuje.
 *
 *   node scripts/sondy/bir-sonda.mjs 7171830083 5262895199
 *
 * Wykonuje DWA zapytania do urzędu: `Zaloguj` i jedno `DaneSzukajPodmioty`
 * (parametr `Nipy` przyjmuje do stu numerów naraz). Wypisuje, co naprawdę
 * przyszło — zwłaszcza pole `Typ` (F = osoba fizyczna, P = prawna) i gminę
 * siedziby, bo o to nam chodzi.
 *
 * Klucz: GUS_BIR_KLUCZ w .env.local. Bez niego skrypt nic nie wysyła.
 */
import { readFileSync } from 'node:fs';

const USLUGA = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const AKCJA = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl';

function klucz() {
  const zEnv = process.env.GUS_BIR_KLUCZ?.trim();
  if (zEnv) return zEnv;
  try {
    const plik = readFileSync('.env.local', 'utf8');
    return /^GUS_BIR_KLUCZ\s*=\s*(.+)$/m.exec(plik)?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Jedno wywolanie SOAP 1.2 z adresowaniem WS-Addressing, jak chce BIR. */
async function soap(operacja, cialoXml, sid) {
  const koperta = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://CIS/BIR/PUBL/2014/07"
               xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract"
               xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soap:Header>
    <wsa:To>${USLUGA}</wsa:To>
    <wsa:Action>${AKCJA}/${operacja}</wsa:Action>
  </soap:Header>
  <soap:Body>${cialoXml}</soap:Body>
</soap:Envelope>`;
  const start = Date.now();
  const odp = await fetch(USLUGA, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml;charset=UTF-8',
      ...(sid ? { sid } : {}),
    },
    body: koperta,
  });
  const tekst = await odp.text();
  return { status: odp.status, tekst, sekund: ((Date.now() - start) / 1000).toFixed(1) };
}

const miedzy = (tekst, znacznik) =>
  new RegExp(`<${znacznik}[^>]*>([\\s\\S]*?)</${znacznik}>`).exec(tekst)?.[1] ?? null;

const rozkoduj = (t) =>
  t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

async function main() {
  const k = klucz();
  if (!k) {
    console.log('Brak GUS_BIR_KLUCZ (.env.local albo zmienna srodowiskowa) — nic nie wysylam.');
    process.exit(2);
  }
  const nipy = process.argv.slice(2).filter((a) => /^\d{9,10}$/.test(a));
  if (!nipy.length) {
    console.log('Podaj przynajmniej jeden NIP: node scripts/sondy/bir-sonda.mjs 7171830083');
    process.exit(2);
  }

  const logowanie = await soap('Zaloguj', `<ns:Zaloguj><ns:pKluczUzytkownika>${k}</ns:pKluczUzytkownika></ns:Zaloguj>`);
  const sid = miedzy(logowanie.tekst, 'ZalogujResult');
  console.log(`Zaloguj: HTTP ${logowanie.status}, ${logowanie.sekund} s, sesja ${sid ? 'jest' : 'BRAK'}`);
  if (!sid) {
    console.log(logowanie.tekst.slice(0, 600));
    process.exit(1);
  }

  const szukanie = await soap(
    'DaneSzukajPodmioty',
    `<ns:DaneSzukajPodmioty><ns:pParametryWyszukiwania><dat:Nipy>${nipy.join(',')}</dat:Nipy></ns:pParametryWyszukiwania></ns:DaneSzukajPodmioty>`,
    sid,
  );
  console.log(`DaneSzukajPodmioty (${nipy.length} NIP-ow): HTTP ${szukanie.status}, ${szukanie.sekund} s`);
  const wynik = rozkoduj(miedzy(szukanie.tekst, 'DaneSzukajPodmiotyResult') ?? '');
  if (!wynik.trim()) {
    console.log('PUSTA ODPOWIEDZ. Surowo:', szukanie.tekst.slice(0, 700));
    process.exit(1);
  }

  const pola = (blok, nazwa) => new RegExp(`<${nazwa}>([\\s\\S]*?)</${nazwa}>`).exec(blok)?.[1] ?? '';
  const bloki = [...wynik.matchAll(/<dane>([\s\S]*?)<\/dane>/g)].map((m) => m[1]);
  console.log(`   podmiotow w odpowiedzi: ${bloki.length}`);
  for (const b of bloki) {
    console.log([
      `   NIP ${pola(b, 'Nip') || '—'}`,
      `Typ=${pola(b, 'Typ')}`,
      `SilosID=${pola(b, 'SilosID')}`,
      pola(b, 'Nazwa').slice(0, 45),
      `${pola(b, 'Gmina')} / pow. ${pola(b, 'Powiat')} / woj. ${pola(b, 'Wojewodztwo')}`,
      `REGON ${pola(b, 'Regon')}`,
    ].join(' | '));
  }
  console.log('   pola w pierwszym bloku:', [...(bloki[0] ?? '').matchAll(/<(\w+)>/g)].map((m) => m[1]).join(', '));
  await soap('Wyloguj', `<ns:Wyloguj><ns:pIdentyfikatorSesji>${sid}</ns:pIdentyfikatorSesji></ns:Wyloguj>`, sid);
}

await main();
