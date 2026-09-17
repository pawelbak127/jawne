/**
 * Nazwiska osob prywatnych w tytulach wnioskow o uchylenie immunitetu.
 *
 * DECYZJA (16.09.2026): w sprawach z oskarzenia prywatnego NIE powtarzamy
 * nazwisk oskarzycieli ani ich pelnomocnikow. Nazwisko posla, ktorego wniosek
 * dotyczy, zostaje — to jest informacja o sprawowaniu mandatu.
 *
 * Dlaczego: rejestr Sejmu jest jawny, ale nie jest zoptymalizowany pod
 * wyszukiwarki. My jestesmy. Powtorzenie nazwiska prywatnej osoby na stronie
 * posla, w podgladzie linku i w naszym wyszukiwaniu to roznica, ktora
 * wprowadzamy MY. Zmierzone: 20 tytulow, w 18 pada nazwisko oskarzyciela,
 * w 18 — adwokata lub radcy prawnego.
 *
 * Regula jest jedna dla wszystkich, takze gdy oskarzycielem jest polityk.
 * Rozstrzyganie sprawa po sprawie, kto jest "dosc publiczny", byloby nasza
 * ocena. Pelny tytul jest zawsze pod odnosnikiem do rejestru.
 */

const WIELKA = 'A-ZĄĆĘŁŃÓŚŹŻ';
// Czlon nazwiska: "Konrada", "Kucharskiej-Dziedzic", inicjal "A."
const CZLON = `[${WIELKA}][\\p{Ll}]*\\.?(?:-[${WIELKA}][\\p{Ll}]+)?`;
const OSOBA = `${CZLON}(?:\\s+${CZLON})*`;
const OSOBY = `${OSOBA}(?:\\s+(?:i|oraz)\\s+${OSOBA})*`;

const ROLE = [
  'oskarżyciel\\p{L}*\\s+prywatn\\p{L}*',
  '(?:reprezentowan|przedłożon)\\p{L}*\\s+przez\\s+(?:adwokat\\p{L}*|radc\\p{L}*\\s+prawn\\p{L}*)',
];

const WZORZEC = new RegExp(`(${ROLE.join('|')})\\s+${OSOBY}`, 'gu');

export function bezNazwiskOsobPrywatnych(tekst: string): string {
  return tekst.replace(WZORZEC, '$1');
}

/** Czy w tekscie cokolwiek pominieto — strona mowi to wtedy wprost. */
export function pominietoNazwiska(tekst: string | null | undefined): boolean {
  return Boolean(tekst) && bezNazwiskOsobPrywatnych(tekst!) !== tekst;
}

/**
 * Czy nazwe beneficjenta (dotacji, pomocy publicznej, zamowienia) wolno
 * pokazac z nazwy.
 *
 * DECYZJA (17.09.2026): pokazujemy nazwe tylko wtedy, gdy WIDAC, ze to nie
 * jest czlowiek — forma prawna spolki, instytucja publiczna, organizacja.
 * Zmierzone na liscie projektow UE 2021-2027: 3 482 z 16 347 beneficjentow
 * nie ma zadnego takiego znacznika, a wsrod nich sa gole imiona i nazwiska
 * ("Jan Kowalski") oraz jednoosobowe firmy z nazwiskiem w nazwie.
 * Instrukcja UOKiK do SUDOP mowi wprost, ze baza "zawiera dane osobowe".
 *
 * Blad jest celowo w jedna strone: czesc organizacji bez znacznika w nazwie
 * zostanie ukryta. Pokazanie nazwiska rolnika albo samozatrudnionej osoby
 * na stronie zoptymalizowanej pod wyszukiwarki byloby bledem gorszym.
 * Spolka cywilna (s.c.) NIE jest jawna — jej wspolnicy to osoby fizyczne,
 * a nazwa zwykle ich wymienia.
 */
// Wzorce jako LITERALY wyrazen regularnych, nie napisy: w napisie '\b' to
// znak backspace, nie granica slowa — pierwsza wersja tego modulu przepuszczala
// przez to "Gmina Przykladowo" jako osobe prywatna. Granice slow sa jawne
// (\p{L}), bo \b w JS zna tylko litery ASCII.
const ZNACZNIKI_PODMIOTU: readonly RegExp[] = [
  // formy prawne
  /sp\.?\s*z\s*o\.?\s*o/iu,
  /spółk[aiąe]\s+(akcyjn|z\s+ograniczon|komandytow|jawn|partnersk)/iu,
  /(?<![\p{L}\p{N}])s\.?\s?a\.?(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])sp\.\s?[kj]\.?(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])p\.?\s?s\.?\s?a\.?(?![\p{L}\p{N}])/iu,
  // organizacje
  /fundacj|stowarzysz|spółdziel|związ[ek]|zrzeszeni|towarzystw|federacj|lokalna\s+grupa|grupa\s+rybacka|caritas|parafi|diecezj|kości/iu,
  /(?<![\p{L}])izb[ay](?![\p{L}])/iu,
  // administracja i instytucje publiczne
  /(?<![\p{L}])gmin[ayę](?![\p{L}])|powiat|województw|(?<![\p{L}])miast[oa](?![\p{L}])|urząd|starostw|marszał|wojewod/iu,
  /ministerstw|(?<![\p{L}])minist(er|ra)(?![\p{L}])|komend|państwow|narodow|krajow|generaln|główn|dyrekcj|skarb\s+państwa/iu,
  /(?<![\p{L}])(szef|prezes|dyrektor|rzecznik)(?![\p{L}])|straż|policj|prokuratur|agencj/iu,
  // oswiata, nauka, zdrowie, kultura
  /uniwersytet|politechnik|akademi|uczelni|szkoł|przedszkol|szpital|instytut|zakład|ośrod|bibliotek|muzeum|teatr|filharmoni|centrum|inkubator|klaster/iu,
  /park\s+(naukowo|technolog|przemysł)|wodociąg|kanalizac|energetyk|przedsiębiorstwo\s+(państwowe|komunalne)/iu,
  /(?<![\p{L}])(bank|banku|kasa)(?![\p{L}])/iu,
];
const SPOLKA_CYWILNA = /(?<![\p{L}\p{N}])s\.\s?c\.?(?![\p{L}\p{N}])|spółka\s+cywilna/iu;

export function nazwaPodmiotuJawna(nazwa: string | null | undefined): boolean {
  if (!nazwa || !nazwa.trim()) return false;
  if (SPOLKA_CYWILNA.test(nazwa)) return false;
  return ZNACZNIKI_PODMIOTU.some((w) => w.test(nazwa));
}

/** Nazwa do wyswietlenia albo opis zastepczy — nigdy pusty napis. */
export function nazwaDoPokazania(nazwa: string | null | undefined): { tekst: string; pominieta: boolean } {
  if (nazwaPodmiotuJawna(nazwa)) return { tekst: nazwa!.trim(), pominieta: false };
  return { tekst: 'nazwa pominięta — może to być osoba fizyczna', pominieta: true };
}
