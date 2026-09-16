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
  kind: string; majorityType?: string;
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

export function adresPdf(g: ApiGlosowanie): string {
  return g.links?.find((l) => l.rel === 'pdf')?.href
    ?? `${BAZA}/votings/${g.sitting}/${g.votingNumber}/pdf`;
}
