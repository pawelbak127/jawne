import { dataSlownie, odmien, zlote, zOdmiana } from './format';
import { zdaniePorownania } from './porownanie';

/**
 * AKAPIT DO CYTOWANIA (14.10.2026) — z listy pomyslow: „najtansza droga do
 * tego, zeby ktos w ogole te dane zobaczyl”. Dziennikarz lokalnej gazety ma
 * dostac gotowy tekst z liczbami, ktory moze wkleic bez przepisywania, a my
 * — pewnosc, ze po wklejeniu kazda liczba ma mianownik, okres i zrodlo.
 *
 * Te same liczby, co „W liczbach” na gorze strony, tylko zdaniami. Zasady,
 * ktore musza tu przetrwac, bo tekst wyjdzie poza nasz interfejs:
 *  - brak wartosci to brak zdania, nigdy „0 zl” (zasada 4),
 *  - kwota na mieszkanca razem z suma i liczba mieszkancow (zasada 3),
 *  - porownanie bez slow oceniajacych — „wiecej”, „mniej” (zasada 6),
 *  - pomoc publiczna z okresem i zastrzezeniem UOKiK w tym samym zdaniu
 *    (zasada 10): po wklejeniu nie bedzie obok niej naszej stopki.
 */

export type DaneAkapitu = {
  /** „gminy Piątek”, „miasta Kraków” — dopelniacz rodzaju i nazwa. */
  czyja: string;
  /** „w województwie łódzkim”. */
  wWojewodztwie: string;
  /** „w tej gminie” albo „w tym mieście”. */
  tutaj: string;
  ludnosc: number | null;
  dochody: { rok: number; razem: number; naOsobe: number | null; mediana: number | null; gminWMedianie: number | null } | null;
  ue: {
    razem: number; projektow: number; naOsobe: number | null;
    mediana: number | null; opisMediany: string | null;
  } | null;
  pomoc: {
    pelna: boolean; od: string; do: string | null; dni: number | null;
    /** `null`, gdy rejestr nie podal kwoty przy zadnym przypadku (zasada 4). */
    razem: number | null; przypadkow: number; naOsobe: number | null; mediana: number | null;
    /** Udzial najwiekszego beneficjenta, 0..1. */
    udzialNajwiekszego: number;
  } | null;
  adres: string;
  /** Data stanu, RRRR-MM-DD w polskim kalendarzu. */
  stan: string;
};

const malaLitera = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** „To 1,2 raza więcej niż …” albo pusto, gdy porownania nie da sie uczciwie podac. */
function porownanie(wartosc: number | null, mediana: number | null, czego: string): string {
  const z = zdaniePorownania(wartosc, mediana, `${czego}: ${zlote(mediana)}`);
  return z ? ` To ${malaLitera(z)}` : '';
}

export function akapitGminy(d: DaneAkapitu): { tekst: string; zrodla: string } | null {
  const zdania: string[] = [];
  const zrodla: string[] = [];
  const mieszk = d.ludnosc ? ` przy ${zOdmiana(d.ludnosc, 'mieszkańcu', 'mieszkańcach', 'mieszkańcach')}` : '';

  if (d.dochody) {
    const { rok, razem, naOsobe, mediana, gminWMedianie } = d.dochody;
    const zIlu = gminWMedianie ? ` z ${zOdmiana(gminWMedianie, 'gminy', 'gmin', 'gmin')}` : '';
    zdania.push(naOsobe !== null
      ? `Dochody ${d.czyja} w ${rok} r. wyniosły ${zlote(naOsobe)} na mieszkańca (${zlote(razem)}${mieszk}).`
        + porownanie(naOsobe, mediana, `mediana${zIlu} ${d.wWojewodztwie}`)
      : `Dochody ${d.czyja} w ${rok} r. wyniosły ${zlote(razem)}.`);
    zrodla.push('GUS, Bank Danych Lokalnych');
  }

  if (d.ue) {
    const { razem, projektow, naOsobe, mediana, opisMediany } = d.ue;
    if (projektow === 0) {
      zdania.push(`W wykazie projektów Funduszy Europejskich 2021–2027 nie ma żadnego projektu realizowanego tylko ${d.tutaj}.`);
    } else {
      const sa = odmien(projektow, 'realizowany jest', 'realizowane są', 'realizowanych jest');
      zdania.push(`Wyłącznie ${d.tutaj} ${sa} ${zOdmiana(projektow, 'projekt', 'projekty', 'projektów')} z Funduszy Europejskich 2021–2027`
        + ` z dofinansowaniem z UE ${zlote(razem)}${naOsobe !== null ? `, czyli ${zlote(naOsobe)} na mieszkańca` : ''}.`
        + (opisMediany ? porownanie(naOsobe, mediana, opisMediany) : ''));
    }
    zrodla.push('wykaz projektów Funduszy Europejskich (dane.gov.pl)');
  }

  if (d.pomoc) {
    const p = d.pomoc;
    const okres = p.pelna
      ? `od ${dataSlownie(p.od)} (pełna historia w rejestrze)`
      : `w ${zOdmiana(p.dni ?? 0, 'dniu', 'dniach', 'dniach')} z okresu od ${dataSlownie(p.od)} do ${dataSlownie(p.do)}`;
    zdania.push(`Według systemu SUDOP prowadzonego przez UOKiK firmy z siedzibą ${d.tutaj} ${okres} otrzymały `
      + `${zOdmiana(p.przypadkow, 'przypadek', 'przypadki', 'przypadków')} pomocy publicznej`
      + (p.razem === null ? ' (rejestr nie podaje ich wartości)'
        : ` o wartości ${zlote(p.razem)} brutto${p.naOsobe !== null ? ` (${zlote(p.naOsobe)} na mieszkańca)` : ''}`)
      + '; dane w rejestrze mogą ulec zmianie.'
      + porownanie(p.naOsobe, p.mediana, `mediana gmin ${d.wWojewodztwie} w tych samych dniach`)
      + (p.udzialNajwiekszego >= 0.25 ? ` ${Math.round(100 * p.udzialNajwiekszego)}% tej kwoty trafiło do jednego podmiotu.` : ''));
    zrodla.push('UOKiK, system SUDOP');
  }

  if (!zdania.length) return null;
  return {
    tekst: zdania.join(' '),
    zrodla: `Źródło: ${d.adres}, na podstawie danych: ${zrodla.join('; ')}. Stan na ${dataSlownie(d.stan)} r.`,
  };
}
