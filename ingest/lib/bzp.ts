/**
 * BZP — Biuletyn Zamowien Publicznych (API e-Zamowien, publiczne, bez klucza).
 *
 * Pobieramy tylko OGLOSZENIA O WYNIKU (`TenderResultNotice`): kto, komu,
 * za ile. Przepis i pulapki od agenta portalu przetargowego `asc`
 * (C:\Projects\komunikacja\STAN-asc.md, pomiar 15.10.2026 na 77 757 wynikach
 * czesci): wyniki leza w TRESCI HTML (pola 6.x, 7.3.1, 8.2), nie w JSON-ie;
 * tysiace oddziela twarda spacja; kwote bierzemy tylko z tej samej linii;
 * cena wybrana spoza [min, max] to blad zamawiajacego (8,99 mld zl przy
 * ofertach 32–40 tys.). Decyzja Pawla z 15.10.2026: `jawne` pobiera BZP
 * samo, bez wspolnej bazy z `asc`.
 *
 * Nasze ustalenie (16.10.2026, 250 ogloszen z 14.10): lista `contractors`
 * idzie POZYCJA W POZYCJE z czesciami — puste wpisy stoja dokladnie tam, gdzie
 * `procedureResult` mowi „uniewaznienie”. Wykonawce przypisujemy wiec po
 * pozycji, a nazwa z tresci (7.3.1) jest kontrola; gdy liczby sie nie
 * zgadzaja, wracamy do dopasowania po nazwie, jak `asc`.
 */
import { nipZTekstu } from '../../src/lib/nip.js';
import { uprosc } from '../../src/lib/tekst.js';

export const ADRES_BZP = 'https://ezamowienia.gov.pl/mo-board/api/v1/notice';
export const PDF_BZP = (id: string) => `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticePdfById?noticeId=${id}`;
export const NA_STRONE_BZP = 250;

export type WykonawcaBzp = {
  contractorName: string | null; contractorNationalId: string | null;
  contractorCity: string | null; contractorProvince: string | null;
};

export type OgloszenieBzp = {
  objectId: string;
  bzpNumber: string | null;
  publicationDate: string;
  orderObject: string | null;
  orderType: string | null;
  tenderType: string | null;
  isTenderAmountBelowEU: boolean | null;
  cpvCode: string | null;
  procedureResult: string | null;
  organizationName: string | null;
  organizationNationalId: string | null;
  organizationCity: string | null;
  organizationProvince: string | null;
  htmlBody: string | null;
  contractors: WykonawcaBzp[] | null;
};

export type WynikCzesci = {
  czesc: number;
  uniewaznione: boolean;
  ofert: number | null;
  cenaMin: number | null;
  cenaMax: number | null;
  cenaWybrana: number | null;
  wartoscUmowy: number | null;
  wykonawca: string | null;
  wykonawcaNip: string | null;
};

const ENCJE: Record<string, string> = { '&nbsp;': '\u00a0', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

/** HTML ogloszenia → tekst z podzialem na linie (jak `html_text` w asc). */
export function tekstZHtml(html: string | null | undefined): string {
  if (!html) return '';
  const h = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/h\d>|<\/div>|<\/li>|<\/tr>/gi, '\n');
  const t = h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (e) => ENCJE[e] ?? e)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
  // Twarda spacja zostaje w liniach — oddziela tysiace (pulapka od asc).
  return t.split('\n').map((l) => l.split(/[ \t]+/).join(' ').trim()).filter(Boolean).join('\n');
}

/** „646 980,00” / „274044,00” / „1.234.567,89” → liczba; inaczej null. */
export function kwotaBzp(v: string | null | undefined): number | null {
  if (!v) return null;
  let s = v.replace(/[^\d,.]/g, '').replace(',', '.');
  if ((s.match(/\./g) ?? []).length > 1) {
    const i = s.lastIndexOf('.');
    s = s.slice(0, i).replace(/\./g, '') + s.slice(i);
  }
  if (!s || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const NAGLOWEK_CZESCI = /SEKCJA V ZAKOŃCZENIE POSTĘPOWANIA \(dla części (\d+)\)/g;

function pole(blok: string, wzor: RegExp): string | null {
  const m = wzor.exec(blok);
  return m ? m[1]!.trim() : null;
}

/** Kwota z TEJ SAMEJ linii — `\s` w klasie zlapalby numer nastepnego pola. */
const kwotaPola = (blok: string, nr: string) =>
  kwotaBzp(pole(blok, new RegExp(String.raw`(?:^|\n)${nr.replace(/\./g, '\\.')}\)[^:\n]*:[ \u00a0]*([\d \u00a0.,]+)`)));

const porownawcza = (n: string | null | undefined) => uprosc(n ?? '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Wyniki czesci z tresci ogloszenia o wyniku. Bez naglowkow czesci = jedna czesc. */
export function wynikiCzesci(tekst: string, wykonawcy: readonly WykonawcaBzp[] | null): WynikCzesci[] {
  const naglowki = [...tekst.matchAll(NAGLOWEK_CZESCI)];
  const bloki: [number, string][] = naglowki.length
    ? naglowki.map((h, i) => [Number(h[1]), tekst.slice(h.index!, naglowki[i + 1]?.index ?? tekst.length)])
    : [[1, tekst.slice(Math.max(0, tekst.indexOf('SEKCJA V')))]];
  const lista = wykonawcy ?? [];
  const poPozycji = lista.length === bloki.length;
  const poNazwie = new Map(lista.filter((w) => w.contractorName).map((w) => [porownawcza(w.contractorName), w]));

  return bloki.map(([czesc, b], i) => {
    const uniewaznione = /zakończyła się unieważnieniem/.test(b);
    const ofertTekst = pole(b, /6\.1\.\)\s*Liczba otrzymanych ofert[^:]*:\s*(\d+)/);
    const cenaMin = kwotaPola(b, '6.2.');
    const cenaMax = kwotaPola(b, '6.3.');
    let cenaWybrana = kwotaPola(b, '6.4.');
    // Blad zamawiajacego (asc: 8 992 402 029 zl przy ofertach 32–40 tys.) — nie zapisujemy jako faktu.
    if (cenaWybrana !== null && cenaMin !== null && cenaMax !== null
      && !(cenaWybrana >= 0.99 * cenaMin && cenaWybrana <= 1.01 * cenaMax)) cenaWybrana = null;
    const nazwa = pole(b, /7\.3\.1\)[^:\n]*:\s*([^\n]+)/);
    let w: WykonawcaBzp | undefined;
    if (nazwa) {
      const naPozycji = poPozycji ? lista[i] : undefined;
      // Pozycja, ale z kontrola nazwy: inna nazwa na tej pozycji = nie ufamy pozycji.
      if (naPozycji?.contractorName && porownawcza(naPozycji.contractorName) === porownawcza(nazwa)) w = naPozycji;
      else w = poNazwie.get(porownawcza(nazwa));
      if (!w && bloki.length === 1 && poNazwie.size === 1) w = [...poNazwie.values()][0];
    }
    return {
      czesc,
      uniewaznione,
      ofert: ofertTekst ? Number(ofertTekst) : null,
      cenaMin,
      cenaMax,
      cenaWybrana: uniewaznione ? null : cenaWybrana,
      wartoscUmowy: uniewaznione ? null : kwotaPola(b, '8.2.'),
      wykonawca: uniewaznione ? null : nazwa,
      wykonawcaNip: uniewaznione ? null : nipZTekstu(w?.contractorNationalId ?? null),
    };
  });
}

/** Data publikacji jako polska data (RRRR-MM-DD) — znacznik jest w UTC (pulapka 42). */
export function dzienPublikacji(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date(iso));
}

/** Adres strony wynikow dla jednego dnia; `poObiekcie` = stronicowanie przez SearchAfter. */
export function adresStronyBzp(dzien: string, poObiekcie: string | null): string {
  const p = new URLSearchParams({
    NoticeType: 'TenderResultNotice', PublicationDateFrom: dzien, PublicationDateTo: dzien, PageSize: String(NA_STRONE_BZP),
  });
  if (poObiekcie) p.set('SearchAfter', poObiekcie);
  return `${ADRES_BZP}?${p.toString()}`;
}
