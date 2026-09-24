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

export type OdpowiedzWyszukiwania = {
  fraza: string;
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
  const ile = `${f.przypadkow} ${f.przypadkow === 1 ? 'przypadek pomocy' : f.przypadkow < 5 ? 'przypadki pomocy' : 'przypadków pomocy'}`;
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
