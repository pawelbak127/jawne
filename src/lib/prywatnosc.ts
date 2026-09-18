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
 * DECYZJA (17.09.2026, do potwierdzenia przez Pawla): pokazujemy nazwe tylko
 * wtedy, gdy WIDAC, ze to nie jest czlowiek. Instrukcja UOKiK do SUDOP mowi
 * wprost, ze baza "zawiera dane osobowe", a na listach UE sa gole imiona
 * i nazwiska oraz jednoosobowe firmy z nazwiskiem w nazwie.
 *
 * Kolejnosc sprawdzen (pierwsze trafienie rozstrzyga):
 *   1. forma prawna osoby prawnej albo jednostka samorzadu  -> pokazujemy,
 *   2. imie w mianowniku (rejestr PESEL) albo kod pocztowy   -> ukrywamy,
 *   3. instytucja lub organizacja                            -> pokazujemy,
 *   4. cokolwiek innego                                      -> ukrywamy.
 *
 * Krok 2 stoi PRZED krokiem 3, bo slowo w rodzaju "zakład", "centrum" czy
 * "agencja" niczego nie dowodzi: "Zakład Fryzjerski Anna Nowak" to
 * jednoosobowa dzialalnosc. Pierwsza wersja (tylko kroki 1, 3, 4) pokazala
 * na stronie Zakopanego firme z imieniem, nazwiskiem i adresem wlasciciela,
 * bo znacznik "kości" (od "kościół") trafil w ulice Kosciuszki.
 *
 * Spolki jawne i komandytowe pokazujemy mimo nazwisk wspolnikow w firmie —
 * sa w jawnym KRS. Spolka cywilna (s.c.) NIE jest jawna: to umowa osob
 * fizycznych, a nazwa zwykle je wymienia.
 *
 * Zmierzone 17.09.2026 na 67 219 nazwach z list UE i 22 071 z SUDOP: pierwsza
 * wersja pokazywala 2 955 i 488 nazw, ktore ta ukrywa — w probkach prawie
 * wylacznie jednoosobowe firmy z imieniem i nazwiskiem.
 *
 * Blad jest celowo w jedna strone: czesc organizacji zostanie ukryta.
 * Pokazanie nazwiska rolnika albo samozatrudnionej osoby na stronie
 * zoptymalizowanej pod wyszukiwarki byloby bledem gorszym.
 */
import { IMIONA_MESKIE, IMIONA_PESEL } from './imiona-pesel';

// Wzorce jako LITERALY wyrazen regularnych, nie napisy: w napisie '\b' to
// znak backspace, nie granica slowa. Granice slow sa jawne (\p{L}), bo \b
// w JS zna tylko litery ASCII.
const OSOBA_PRAWNA: readonly RegExp[] = [
  /sp\.?\s*z\s*o\.?\s*o/iu,
  // "SPÓŁKA Z O.O." i literowka "SPÓLKA" — obie sa w listach UE.
  /spó[łl]k[aiąe]\s+(akcyjn|z\s+ograniczon|z\s*o\.?\s*o|komandytow|jawn|partnersk)/iu,
  /(?<![\p{L}\p{N}])s\.?\s?a\.?(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])sp\.\s?([kjp]\.?|jawna|komandytowa|partnerska)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])p\.?\s?s\.?\s?a\.?(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}])(fundacj|stowarzysz|spółdziel)/iu,
  // Jednostka samorzadu albo organ tylko NA POCZATKU nazwy: "Gmina Kazimierz
  // Dolny" i "Starosta Powiatu Jarosław" zawieraja imie, a "Sklep Miasto Anna
  // Nowak" nie jest miastem.
  /^\s*(gmina|miasto|powiat|województwo|skarb\s+państwa|starosta|burmistrz|prezydent|wójt|marszałek|wojewoda|minister)(?![\p{L}])/iu,
];

// Instytucje i organizacje, ktorych nazwy nie nosza jednoosobowe firmy.
const INSTYTUCJA: readonly RegExp[] = [
  /(?<![\p{L}])(gmin[ayę]|miast[oa]|powiat\p{L}*|województw\p{L}*|urz[ąę]d\p{L}*|starostw\p{L}*|marszał\p{L}*|wojewod\p{L}*)(?![\p{L}])/iu,
  /ministerstw|(?<![\p{L}])minist(er|ra)(?![\p{L}])|komend[ay]|policj|prokuratur|skarb\s+państwa|generaln\p{L}*\s+dyrekcj/iu,
  /(?<![\p{L}])(szef|prezes|dyrektor)(?![\p{L}])|straż\p{L}*\s+pożarn|ochotnicz\p{L}*\s+straż/iu,
  // organy udzielajace pomocy: "Burmistrz Zelowa", "Starosta Tatrzański"
  /(?<![\p{L}])(burmistrz\p{L}*|starost\p{L}*|prezydent\p{L}*|wójt\p{L}*|inspektor\p{L}*|komendant\p{L}*|zarząd\p{L}*\s+(województwa|powiatu|gminy|miasta)|fundusz\p{L}*|przewodnicząc\p{L}*\s+zarządu|metropoli\p{L}*)(?![\p{L}])/iu,
  /uniwersytet|politechnik|uczelni|szpital|muzeum|muzeal|teatr|filharmoni|bibliotek|oper[ay](?![\p{L}])/iu,
  /parafi|kości[oó]ł|diecezj|caritas|zakon|zgromadzeni\p{L}*\s+(sióstr|zakonn)/iu,
  /związ[ek]|zrzeszeni|towarzystw|federacj|lokaln\p{L}*\s+grup|grup\p{L}*\s+ryback|(?<![\p{L}])izb[ay](?![\p{L}])/iu,
  // Wspolnota mieszkaniowa ma zdolnosc prawna i wlasny NIP, a jej nazwa to
  // adres budynku, nie nazwisko. Dotacje (np. termomodernizacja) trafiaja
  // do niej, a nie do konkretnej osoby.
  /wspólnot\p{L}*\s+mieszkaniow/iu,
  /akademi\p{L}*\s+(nauk|sztuk|wojenn|medyczn|muzyczn|wychowania|ekonomiczn|górnicz|morsk|rolnicz|techniczn|pedagogiczn|teologi|marynarki|lotnicz|policji|obrony|finansów)|polsk\p{L}*\s+akademi\p{L}*\s+nauk|sieć\s+badawcz|łukasiewicz/iu,
  // "PAN" tylko wielkimi literami (skrot Polskiej Akademii Nauk), "instytut" w dowolnej postaci.
  /[Ii][Nn][Ss][Tt][Yy][Tt][Uu][Tt][\s\S]*(?<![\p{L}])PAN(?![\p{L}])/u,
  // Slowa ogolne ("zakład", "centrum", "szkoła") licza sie tylko z przymiotnikiem,
  // ktorego jednoosobowa firma nie uzyje: "Zakład Gospodarki Komunalnej",
  // "Szkoła Podstawowa", "Krajowy Ośrodek Wsparcia Rolnictwa". Patron ("im.")
  // tez sie liczy — imie wlasciciela i tak zatrzymuje krok 2.
  /(zakład|centrum|ośrod|akademi|agencj|instytut|szkoł|przedszkol|zespół|park|przedsiębiorstw|bank|kas[ay]|dom\p{L}*\s+kultury)[\s\S]*((?<!nie)publiczn|miejsk|gminn|powiatow|wojewódzk|państwow|samorządow|komunaln|narodow|krajow|regionaln|podstawow|ponadpodstawow|społeczn|rozwoju|naukow|badawcz|ubezpiecze|kultury|zdrowia|szkół|wodociąg|kanalizac|energetyk|ciepłown|(?<![\p{L}])im\.|(?<![\p{L}])imienia(?![\p{L}]))/iu,
  /((?<!nie)publiczn|miejsk|gminn|powiatow|wojewódzk|państwow|samorządow|komunaln|narodow|krajow|regionaln|naukow|polsk)\p{L}*\s+(zakład|centrum|ośrod|akademi|agencj|instytut|szkoł|przedszkol|zespół|park|przedsiębiorstw|bank|zasób|fundusz|rad[ay]|inspektorat|służb|biur)/iu,
];

// Nigdy z nazwy: spolka cywilna (umowa osob fizycznych) i wspolnota
// mieszkaniowa (nazwa to adres budynku, w malej wspolnocie — kilku rodzin).
const NIGDY = /(?<![\p{L}\p{N}])s\.\s?c\.?(?![\p{L}\p{N}])|spółka\s+cywilna|wspólnot\p{L}*\s+mieszkaniow/iu;
const KOD_POCZTOWY = /(?<!\d)\d{2}-\d{3}(?!\d)/;

// Po tych slowach stoi patron w dopelniaczu: "im. Jana Pawła II", "pw. św. Józefa".
const PATRON = new Set(['IM', 'IMIENIA', 'ŚW', 'ŚWIĘTEGO', 'ŚWIĘTEJ', 'ŚWIĘTYCH', 'BŁ', 'BŁOGOSŁAWIONEGO', 'BŁOGOSŁAWIONEJ', 'PW', 'WEZWANIEM']);
const OKNO_PATRONA = 4;

/**
 * Dopelniacz imienia meskiego bywa zenskim imieniem w mianowniku:
 * Jana/JANA, Józefa/JÓZEFA, Stanisława/STANISŁAWA, Aleksandra/ALEKSANDRA.
 * Tylko w oknie patrona takie slowo nie swiadczy o osobie.
 */
function dopelniaczMeskiego(slowo: string): boolean {
  if (!slowo.endsWith('A')) return false;
  const rdzen = slowo.slice(0, -1);
  return [rdzen, `${rdzen.slice(0, -1)}ER`, `${rdzen.slice(0, -1)}EK`, `${rdzen.slice(0, -1)}EŁ`]
    .some((k) => k.length > 1 && IMIONA_MESKIE.has(k));
}

/** Czy w nazwie stoi imie w mianowniku — poza patronem instytucji. */
export function zawieraImie(nazwa: string): boolean {
  const slowa = nazwa.toLocaleUpperCase('pl').split(/[^\p{L}]+/u).filter(Boolean);
  let okno = 0;
  for (const s of slowa) {
    if (PATRON.has(s)) {
      okno = OKNO_PATRONA;
      continue;
    }
    const wOknie = okno > 0;
    if (okno > 0) okno--;
    if (s.length < 2 || !IMIONA_PESEL.has(s)) continue;
    if (wOknie && dopelniaczMeskiego(s)) continue;
    return true;
  }
  return false;
}

export function nazwaPodmiotuJawna(nazwa: string | null | undefined): boolean {
  if (!nazwa || !nazwa.trim()) return false;
  if (NIGDY.test(nazwa)) return false;
  if (OSOBA_PRAWNA.some((w) => w.test(nazwa))) return true;
  if (zawieraImie(nazwa) || KOD_POCZTOWY.test(nazwa)) return false;
  return INSTYTUCJA.some((w) => w.test(nazwa));
}

/**
 * Prog, powyzej ktorego pokazujemy z nazwy takze osobe fizyczna.
 *
 * DECYZJA (18.09.2026, Pawel): 100 000 EUR na POJEDYNCZY przypadek pomocy —
 * tyle wynosi unijny prog publikowania pomocy indywidualnej (GBER), wiec nie
 * jest to liczba wymyslona przez nas. Wyrok TSUE w sprawach C-92/09 i C-93/09
 * (Schecke, Eifert) uniewaznil przepisy nakazujace publikowanie danych
 * WSZYSTKICH beneficjentow bez roznicowania m.in. wedlug kwoty — rozniczkowanie
 * progiem jest wiec droga, ktora prawo UE uznalo za proporcjonalna.
 *
 * ZMIERZONE na 84 211 przypadkach: prog odslania 63 z 12 907 ukrytych nazw
 * (0,5 %), lacznie 78,2 mln zl pomocy. Prog 500 tys. EUR odslonilby dwie.
 *
 * Prog NIE znosi listy `NIGDY`: spolka cywilna i wspolnota mieszkaniowa
 * zostaja ukryte niezaleznie od kwoty (w pomiarze wpadla tam "U&B s.c.").
 */
export const PROG_JAWNOSCI_EUR = 100_000;

export type OpcjeNazwy = {
  /** Najwieksza POJEDYNCZA pomoc dla tego podmiotu, w euro. */
  pomocEur?: number | null;
  /**
   * Czy prog kwotowy dziala. Warunkiem jest podany adres kontaktowy — bez
   * drogi zlozenia sprzeciwu (art. 21 RODO) nie pokazujemy nazwisk w ogole.
   */
  progAktywny?: boolean;
};

/** Nazwa do wyswietlenia albo opis zastepczy — nigdy pusty napis. */
export function nazwaDoPokazania(nazwa: string | null | undefined, opcje: OpcjeNazwy = {}): { tekst: string; pominieta: boolean } {
  if (nazwaPodmiotuJawna(nazwa)) return { tekst: nazwa!.trim(), pominieta: false };
  const nadProgiem = opcje.progAktywny === true
    && (opcje.pomocEur ?? 0) >= PROG_JAWNOSCI_EUR
    && Boolean(nazwa?.trim())
    && !NIGDY.test(nazwa!);
  if (nadProgiem) return { tekst: nazwa!.trim(), pominieta: false };
  return { tekst: 'nazwa pominięta — może to być osoba fizyczna', pominieta: true };
}
