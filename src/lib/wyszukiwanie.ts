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

export type OdpowiedzWyszukiwania = {
  fraza: string;
  gminy: PodpowiedzGminy[];
  poslowie: PodpowiedzPosla[];
  glosowania: PodpowiedzGlosowania[];
  glosowanWszystkich: number;
};

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
