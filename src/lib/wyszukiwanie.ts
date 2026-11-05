import { zOdmiana } from './format';

/**
 * Ksztalt odpowiedzi wyszukiwarki, wspolny dla trasy API i komponentu.
 * Osobny plik bez 'server-only', bo typy importuje tez przegladarka.
 */
export type PodpowiedzPosla = {
  slug: string;
  nazwa: string;
  klub: string | null;
  okreg: string | null;
  aktywny: boolean;
};

export type PodpowiedzGminy = {
  teryt: string;
  nazwa: string;
  rodzaj: string;
  powiat: string;
  wojewodztwo: string;
  okreg: number;
  okregNazwa: string | null;
};

export type PodpowiedzGlosowania = {
  id: string;
  data: string;
  tytul: string;
};

/** Firma w podpowiedziach. `nazwa` jest JUZ przepuszczona przez regule
 *  prywatnosci po stronie serwera — do przegladarki nie jedzie nazwa,
 *  ktorej nie wolno pokazac. */
export type PodpowiedzFirmy = {
  nip: string;
  nazwa: string;
  opis: string;
};

export type PodpowiedzUstawy = {
  numer: string;
  tytul: string;
  stan: string;
};

/**
 * Zakres wyszukiwania: filtry pod polem na stronie głównej i na /szukaj.
 * W adresie (`?zakres=gminy`), więc działa bez JavaScriptu i można go wysłać.
 * Głosowania nie mają własnego filtra — szuka ich tylko „Wszystko”.
 */
export const ZAKRESY = ['wszystko', 'gminy', 'poslowie', 'firmy', 'ustawy'] as const;
export type Zakres = (typeof ZAKRESY)[number];

export const OPIS_ZAKRESU: Record<Zakres, { etykieta: string; podpowiedz: string; wsrod: string | null }> = {
  wszystko: { etykieta: 'Wszystko', podpowiedz: 'Gmina, poseł, firma, NIP albo temat ustawy', wsrod: null },
  gminy: { etykieta: 'Gminy', podpowiedz: 'Nazwa gminy albo miasta', wsrod: 'wśród gmin' },
  poslowie: { etykieta: 'Posłowie', podpowiedz: 'Imię lub nazwisko posła', wsrod: 'wśród posłów' },
  firmy: { etykieta: 'Firmy / NIP', podpowiedz: 'Nazwa firmy albo NIP', wsrod: 'wśród firm' },
  ustawy: { etykieta: 'Ustawy', podpowiedz: 'Temat ustawy albo numer druku', wsrod: 'wśród ustaw' },
};

/** Nieznana wartość z adresu to „wszystko”, nie błąd: adres mógł być przepisany z ręki. */
export function zakresZParametru(wartosc: unknown): Zakres {
  return ZAKRESY.includes(wartosc as Zakres) ? (wartosc as Zakres) : 'wszystko';
}

export type OdpowiedzWyszukiwania = {
  fraza: string;
  zakres: Zakres;
  gminy: PodpowiedzGminy[];
  poslowie: PodpowiedzPosla[];
  glosowania: PodpowiedzGlosowania[];
  glosowanWszystkich: number;
  firmy: PodpowiedzFirmy[];
  ustawy: PodpowiedzUstawy[];
  ustawWszystkich: number;
};

/** Jedna linia pod nazwa firmy: gdzie ma siedzibe i ile razy dostala pomoc. */
export function opisFirmy(f: { gmina?: string | null; przypadkow: number }): string {
  // zOdmiana, nie „< 5”: ta regula dawala „22 przypadków” i „12 przypadki”.
  const ile = zOdmiana(f.przypadkow, 'przypadek pomocy', 'przypadki pomocy', 'przypadków pomocy');
  return f.gmina ? `${f.gmina} · ${ile}` : ile;
}

/**
 * Opis gminy do listy wynikow. Nazwy gmin sie powtarzaja (228 nazw wiecej
 * niz raz), wiec sama nazwa nie wystarcza — zawsze idzie z powiatem
 * i wojewodztwem.
 */
export function opisGminy(g: Pick<PodpowiedzGminy, 'rodzaj' | 'powiat' | 'wojewodztwo'>): string {
  if (g.rodzaj === 'dzielnica Warszawy') return 'dzielnica Warszawy';
  if (g.rodzaj === 'miasto na prawach powiatu') return `miasto na prawach powiatu, woj. ${g.wojewodztwo}`;
  const rodzaj = g.rodzaj === 'miasto' ? 'miasto' : 'gmina';
  return `${rodzaj}, pow. ${g.powiat}, woj. ${g.wojewodztwo}`;
}
