/** Typy sa ZMIERZONE na zywym API, nie przepisane z OpenAPI — schemat deklaruje wiecej pol, niz serwis zwraca. */
import { pobierzJson } from './http.js';

export const TERM = Number(process.env.JAWNE_KADENCJA ?? 10);
export const BAZA = `https://api.sejm.gov.pl/sejm/term${TERM}`;

export type ApiPosel = {
  id: number; firstName: string; lastName: string; secondName?: string;
  firstLastName: string; lastFirstName: string; club: string;
  districtNum: number; districtName: string; voivodeship: string;
  profession?: string; educationLevel: string; birthDate: string;
  birthLocation: string; numberOfVotes: number; email: string; active: boolean;
  inactiveCause?: string; mandateExpiryDate?: string; waiverDesc?: string;
};

export type ApiKlub = {
  id: string; name?: string; membersCount?: number;
  email?: string; phone?: string; fax?: string;
};

export type ApiPosiedzenie = { number: number; title: string; dates: string[]; current: boolean };

export type ApiGlos = {
  MP: number; firstName: string; lastName: string; club: string;
  /** Dziedzine tego pola kontroluje rejestr, nie my — patrz GLOSY_ZNANE. */
  vote: string;
};

export type ApiGlosowanie = {
  term: number; sitting: number; sittingDay: number; votingNumber: number;
  date: string; title: string; topic?: string; description?: string;
  kind: string; majorityType?: string; majorityVotes?: number;
  yes: number; no: number; abstain: number; notParticipating: number; totalVoted: number;
  links?: { rel: string; href: string }[];
  votes?: ApiGlos[];
};

export const poslowie = () => pobierzJson<ApiPosel[]>(`${BAZA}/MP`);
export const kluby = () => pobierzJson<ApiKlub[]>(`${BAZA}/clubs`);

/** Numer 0 to posiedzenie zapowiedziane, bez glosowan — odrzucamy u zrodla. */
export async function posiedzenia(): Promise<ApiPosiedzenie[]> {
  const d = await pobierzJson<ApiPosiedzenie[]>(`${BAZA}/proceedings`);
  return d.filter((p) => Number.isFinite(p.number) && p.number > 0).sort((a, b) => a.number - b.number);
}

export const glosowaniaPosiedzenia = (posiedzenie: number) =>
  pobierzJson<ApiGlosowanie[]>(`${BAZA}/votings/${posiedzenie}`);

export const glosowanie = (posiedzenie: number, numer: number) =>
  pobierzJson<ApiGlosowanie>(`${BAZA}/votings/${posiedzenie}/${numer}`);

export const adresZdjecia = (id: number) => `${BAZA}/MP/${id}/photo`;

/**
 * Dzien obrad w statystyce jednego posla.
 *
 * ZMIERZONE 24.09.2026: `/MP/{id}/votings/stats` oddaje po jednym wierszu
 * na DZIEN obrad, a nie na glosowanie. Pole `absenceExcuse` to jedyne miejsce
 * w calym API, gdzie rejestr mowi, czy nieobecnosc byla usprawiedliwiona —
 * i dotyczy calego dnia, nie pojedynczego glosowania. Tego nie wolno przy
 * pokazywaniu pominac (regula 3: liczba zawsze z mianownikiem).
 */
export type ApiObecnosc = {
  sitting: number;
  date: string;
  numVotings: number;
  numVoted: number;
  numMissed: number;
  absenceExcuse: boolean;
};

export const obecnoscPosla = (id: number) =>
  pobierzJson<ApiObecnosc[]>(`${BAZA}/MP/${id}/votings/stats`);

export function adresPdf(g: ApiGlosowanie): string {
  return g.links?.find((l) => l.rel === 'pdf')?.href
    ?? `${BAZA}/votings/${g.sitting}/${g.votingNumber}/pdf`;
}

/** Jeden etap procesu legislacyjnego; rejestr zagniezdza je przez `children`. */
export type ApiEtap = {
  stageName: string;
  /** Rejestr podaje go NIE ZAWSZE — zmierzone 23.09.2026 (patrz baza.ts). */
  stageType?: string;
  date?: string;
  printNumber?: string;
  committeeCode?: string;
  decision?: string;
  comment?: string;
  sittingNum?: number;
  voting?: { sitting?: number; votingNumber?: number };
  children?: ApiEtap[];
};

export type ApiProces = {
  number: string;
  title: string;
  documentType?: string;
  documentTypeEnum?: string;
  passed?: boolean;
  processStartDate?: string;
  closureDate?: string;
  ELI?: string;
  displayAddress?: string;
  urgencyStatus?: string;
  shortenProcedure?: boolean;
  UE?: string;
  description?: string;
  changeDate?: string;
  stages?: ApiEtap[];
};

// Lista procesow jest STRONICOWANA (domyslnie 50, naglowek X-Total-Count).
// ZMIERZONE 23.09.2026: kadencja 10 ma 1692 procesy, limit=1700 oddaje wszystkie.
export const procesy = () => pobierzJson<ApiProces[]>(`${BAZA}/processes?limit=2000`);
export const proces = (numer: string) => pobierzJson<ApiProces>(`${BAZA}/processes/${numer}`);

/**
 * Interpelacja poselska. Pola ZMIERZONE na zywym API (probka 500 z 20 100):
 * `from` to identyfikatory poslow jako NAPISY, 66 na 500 interpelacji ma
 * wiecej niz jednego autora, a `answerDelayedDays` mowi o opoznieniu
 * ODPOWIEDZI ministra — nie o poslu.
 */
export type ApiInterpelacja = {
  num: number;
  term: number;
  title: string;
  receiptDate: string;
  sentDate?: string;
  lastModified?: string;
  answerDelayedDays?: number;
  from: string[];
  recipientDetails?: { name: string; sent?: string; answerDelayedDays?: number }[];
  replies?: { from?: string; key?: string; receiptDate?: string; lastModified?: string; onlyAttachment?: boolean }[];
  links?: { rel: string; href: string }[];
};

/**
 * Interpelacje sa STRONICOWANE. ZMIERZONE 30.09.2026: `limit=500` dziala,
 * a kadencja 10 ma ok. 20 100 interpelacji — czyli ok. 41 zapytan.
 * Pusta tablica znaczy „koniec", bo API nie podaje liczby wszystkich
 * w tresci odpowiedzi.
 */
export const interpelacje = (offset: number, limit = 500) =>
  pobierzJson<ApiInterpelacja[]>(`${BAZA}/interpellations?limit=${limit}&offset=${offset}`);

/**
 * Zapytania poselskie (pisemne). ZMIERZONE 03.10.2026: ta sama budowa co
 * interpelacje — num, title, from, receiptDate, recipientDetails, replies,
 * answerDelayedDays, links — i to samo stronicowanie.
 */
export const zapytania = (offset: number, limit = 500) =>
  pobierzJson<ApiInterpelacja[]>(`${BAZA}/writtenQuestions?limit=${limit}&offset=${offset}`);

/**
 * Komisja sejmowa ze skladem. ZMIERZONE 03.10.2026 na zywym API: 40 komisji
 * (31 STANDING, 6 EXTRAORDINARY, 3 INVESTIGATIVE), 1 051 czlonkostw,
 * 408 roznych poslow, JEDNO zapytanie na calosc (172 kB).
 *
 * Sklad to STAN BIEZACY — ta sama pulapka co /clubs (pulapka 3): posel,
 * ktory odszedl z komisji, znika z listy bez sladu, a posel z wygaslym
 * mandatem nie ma tu nic. `function` jest nieobecne u zwyklych czlonkow
 * (836 z 1 051), `scope` nieobecne u 9 komisji.
 */
export type ApiKomisja = {
  code: string;
  name: string;
  nameGenitive?: string;
  type: string;
  scope?: string | null;
  phone?: string | null;
  appointmentDate?: string;
  compositionDate?: string;
  members?: { id: number; club?: string; function?: string | null; joinDate?: string | null; lastFirstName?: string }[];
};

export const komisje = () => pobierzJson<ApiKomisja[]>(`${BAZA}/committees`);

/**
 * Wystapienie ze stenogramu dnia obrad. ZMIERZONE 03.10.2026 na 8 dniach:
 * 100-500 wystapien dziennie; `memberID` > 0 maja takze ministrowie bedacy
 * poslami (ich `function` to wtedy np. „Minister Rolnictwa…"); `unspoken`
 * to wystapienie zlozone tylko na pismie — nie ma wtedy `endDateTime`
 * i takich wystapien przybywa PO dniu obrad (ostatni dzien: 150 z 524).
 */
export type ApiWystapienie = {
  num: number;
  name?: string;
  function?: string;
  memberID?: number;
  startDateTime?: string;
  endDateTime?: string;
  rapporteur?: boolean;
  secretary?: boolean;
  unspoken?: boolean;
};

export const stenogram = (posiedzenie: number, dzien: string) =>
  pobierzJson<{ statements?: ApiWystapienie[] }>(`${BAZA}/proceedings/${posiedzenie}/${dzien}/transcripts`);

/** Adres tresci jednego wystapienia (HTML) — odnosnik przy pozycji na stronie. */
export const adresWystapienia = (posiedzenie: number, dzien: string, numer: number) =>
  `${BAZA}/proceedings/${posiedzenie}/${dzien}/transcripts/${numer}`;
