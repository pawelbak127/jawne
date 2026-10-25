import { nipZTekstu } from '../../src/lib/nip.js';
import { wierszeCsvPoKolei } from './csv.js';

/**
 * CORDIS — projekty programow badawczych UE (Horyzont Europa 2021–2027
 * i Horyzont 2020) z polskimi uczestnikami. Opis zrodla: docs/zrodla.md.
 *
 * Komisja Europejska placi te pieniadze bezposrednio uczestnikom, wiec nie ma
 * ich na listach projektow MFiPR. Kwoty sa w EUR i sa PRZYZNANE w umowie
 * o dofinansowanie, nie wyplacone.
 *
 * KTORA KWOTA (zmierzone na slowniku pol CORDIS, DET_fields_description.pdf,
 * 25.10.2026): `ecContribution` to wklad UE dla uczestnika, a suma po
 * uczestnikach projektu rowna sie kwocie grantu. `netEcContribution` to
 * kwota, ktora uczestnik faktycznie dostaje — pomniejszona o czesc
 * przekazana podmiotom powiazanym („thirdParty”), ktore maja WLASNE wiersze.
 * Sumujemy wiec `netEcContribution`: suma `ecContribution` po wszystkich
 * wierszach liczylaby pieniadze podmiotow powiazanych dwa razy. Partnerzy
 * stowarzyszeni i partnerzy MSCA nie dostaja pieniedzy z UE.
 */

export type Program = 'HORIZON' | 'H2020';

export type UczestnikCordis = {
  program: Program;
  projektId: string;
  kolejnosc: number;
  organizacjaId: string;
  nip: string | null;
  nazwa: string;
  typ: string | null;          // HES, REC, PRC, PUB, OTH
  rola: string;                // coordinator, participant, thirdParty, associatedPartner, partner
  msp: number | null;
  kodPocztowy: string | null;
  miasto: string | null;
  nuts3: string | null;
  szerokosc: number | null;
  dlugosc: number | null;
  wkladNetto: number | null;   // EUR, netEcContribution
  wklad: number | null;        // EUR, ecContribution — tylko do kontroli
  koszt: number | null;        // EUR, totalCost uczestnika
  zakonczony: number | null;   // endOfParticipation
};

export type ProjektCordis = {
  program: Program;
  id: string;
  akronim: string | null;
  tytul: string;
  start: string | null;
  koniec: string | null;
  status: string | null;
  schemat: string | null;
  wkladMax: number | null;
};

/**
 * Liczba z pola CORDIS. W jednym wierszu stoja obok siebie „350267.5”
 * (ecContribution) i „350267,5” (totalCost) — przecinek i kropka jako znak
 * dziesietny w tym samym pliku. Separatorow tysiecy w tych polach nie ma.
 */
export function liczbaCordis(tekst: string | undefined): number | null {
  const t = (tekst ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function prawdaFalsz(tekst: string | undefined): number | null {
  const t = (tekst ?? '').trim().toLowerCase();
  return t === 'true' ? 1 : t === 'false' ? 0 : null;
}

function wspolrzedne(tekst: string | undefined): { szerokosc: number; dlugosc: number } | null {
  const m = (tekst ?? '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const szerokosc = Number(m[1]);
  const dlugosc = Number(m[2]);
  // Kontrola dziedziny: punkt musi lezec w prostokacie Polski — inaczej
  // to blad zrodla (zamienione wspolrzedne, zero), a nie adres.
  if (szerokosc < 49 || szerokosc > 55 || dlugosc < 14 || dlugosc > 24.2) return null;
  return { szerokosc, dlugosc };
}

const pusteDoNull = (t: string | undefined) => (t ?? '').trim() || null;

/** Wiersze CSV jako obiekty po naglowku, jeden naraz. */
function* rekordy(tekst: string): Generator<Record<string, string>> {
  let naglowek: string[] | null = null;
  for (const w of wierszeCsvPoKolei(tekst, ';')) {
    if (!naglowek) { naglowek = w; continue; }
    if (w.length === 1 && w[0] === '') continue;
    const r: Record<string, string> = {};
    naglowek.forEach((k, i) => { r[k] = w[i] ?? ''; });
    yield r;
  }
}

export const KOLUMNY_UCZESTNIKOW = ['projectID', 'organisationID', 'vatNumber', 'name', 'activityType', 'postCode',
  'city', 'country', 'nutsCode', 'geolocation', 'order', 'role', 'ecContribution', 'netEcContribution', 'totalCost',
  'endOfParticipation', 'SME'] as const;

/**
 * Polscy uczestnicy z `organization.csv`. Kontrola dziedziny przed zapisem
 * (wzorzec 1): wiersz bez numeru projektu albo nazwy odpada ze zgloszeniem;
 * brak wspolrzednych czy NIP-u to stan, nie blad (wzorzec 2).
 */
export function uczestnicyPolscy(tekst: string, program: Program): {
  wiersze: UczestnikCordis[];
  problemy: string[];
  wszystkich: number;
  brakKolumn: string[];
} {
  const wiersze: UczestnikCordis[] = [];
  const problemy: string[] = [];
  let wszystkich = 0;
  let brakKolumn: string[] = [];
  for (const r of rekordy(tekst)) {
    if (wszystkich === 0) brakKolumn = KOLUMNY_UCZESTNIKOW.filter((k) => !(k in r));
    wszystkich++;
    if (r.country !== 'PL') continue;
    const projektId = (r.projectID ?? '').trim();
    const nazwa = (r.name ?? '').trim();
    const kolejnosc = Number(r.order);
    if (!projektId || !nazwa || !Number.isInteger(kolejnosc) || !(r.organisationID ?? '').trim() || !(r.role ?? '').trim()) {
      problemy.push(`projekt ${projektId || '?'}: ${nazwa || 'bez nazwy'} (kolejnosc ${r.order || '?'})`);
      continue;
    }
    const gdzie = wspolrzedne(r.geolocation);
    wiersze.push({
      program,
      projektId,
      kolejnosc,
      organizacjaId: r.organisationID!.trim(),
      nip: nipZTekstu(r.vatNumber),
      nazwa,
      typ: pusteDoNull(r.activityType),
      rola: r.role!.trim(),
      msp: prawdaFalsz(r.SME),
      kodPocztowy: pusteDoNull(r.postCode),
      miasto: pusteDoNull(r.city),
      nuts3: pusteDoNull(r.nutsCode),
      szerokosc: gdzie?.szerokosc ?? null,
      dlugosc: gdzie?.dlugosc ?? null,
      wkladNetto: liczbaCordis(r.netEcContribution),
      wklad: liczbaCordis(r.ecContribution),
      koszt: liczbaCordis(r.totalCost),
      zakonczony: prawdaFalsz(r.endOfParticipation),
    });
  }
  return { wiersze, problemy, wszystkich, brakKolumn };
}

/** Projekty z `project.csv` — tylko te, w ktorych jest polski uczestnik. */
export function projektyCordis(tekst: string, program: Program, potrzebne: Set<string>): ProjektCordis[] {
  const wynik: ProjektCordis[] = [];
  for (const r of rekordy(tekst)) {
    const id = (r.id ?? '').trim();
    if (!potrzebne.has(id)) continue;
    wynik.push({
      program,
      id,
      akronim: pusteDoNull(r.acronym),
      tytul: (r.title ?? '').trim() || (r.acronym ?? '').trim() || id,
      start: pusteDoNull(r.startDate),
      koniec: pusteDoNull(r.endDate),
      status: pusteDoNull(r.status),
      schemat: pusteDoNull(r.fundingScheme),
      wkladMax: liczbaCordis(r.ecMaxContribution),
    });
  }
  return wynik;
}

/** Adres strony projektu w CORDIS — podstawa przy kazdej kwocie (zasada 1). */
export function adresProjektuCordis(id: string): string {
  return `https://cordis.europa.eu/project/id/${encodeURIComponent(id)}`;
}
