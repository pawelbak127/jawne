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

// Spolka cywilna: NIGDY jawna z samej nazwy — to umowa osob fizycznych,
// a jej nazwa to zwykle nazwiska wspolnikow. Powyzej progu kwotowego
// pokazuje sie jednak tak samo jak osoba fizyczna (decyzja Pawla z 18.09.2026,
// potwierdzona 03.10.2026 — patrz docs/nazwiska.md).
// ZMIERZONE 24.09.2026: w bazie jest tez zapis BEZ KROPEK — "DOMOSFERA SC RIL
// KOZLOWSCY" — a REGON nadaje takiej spolce typ „P". Samodzielne "sc" w
// polskiej nazwie to praktycznie zawsze spolka cywilna, a koszt pomylki jest
// po bezpiecznej stronie: chowamy nazwe, ktora mozna bylo pokazac.
//
// ROZJAZD NAPRAWIONY 03.10.2026: do tego dnia spolka cywilna i wspolnota
// siedzialy razem w jednej liscie `NIGDY`, ktora blokowala takze prog —
// wbrew decyzji z 18.09 zapisanej w CLAUDE.md i docs/nazwiska.md. Kod
// i dokumentacja mowily dwie rozne rzeczy przez dwa tygodnie.
const SPOLKA_CYWILNA = /(?<![\p{L}\p{N}])s\.?\s?c\.?(?![\p{L}\p{N}])|spółka\s+cywilna/iu;
// Wspolnota mieszkaniowa: JAWNA. Ma zdolnosc prawna i wlasny NIP, a jej
// nazwa to adres budynku, nie nazwisko — wiec imie w nazwie ulicy
// („ul. Jana Pawla II") nie moze jej ukrywac.
const WSPOLNOTA = /wspólnot\p{L}*\s+mieszkaniow/iu;
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

/**
 * Rodzaj podmiotu wprost z rejestru REGON (pole `Typ` w usludze BIR):
 * `P` osoba prawna, `F` osoba fizyczna prowadzaca dzialalnosc,
 * `LP` i `LF` — jednostki lokalne jednej i drugiej.
 *
 * DECYZJA PAWLA z 24.09.2026: „przyjmujemy zmiane z REGON, pokazujemy tak
 * duzo, jak tylko mozemy, nie lamiac prawa". Rejestr mowi wprost to, co
 * dotad zgadywalismy z nazwy — a zgadywanie mylilo sie w obie strony:
 * chowalo spolki o nazwisku w firmie i przepuszczalo „Zaklad Fryzjerski
 * Anna …". Nazwa osoby PRAWNEJ nie jest dana osobowa, wiec pokazujemy ja
 * zawsze. Nazwa osoby FIZYCZNEJ podlega tej samej regule co dotad.
 */
export function osobaFizycznaWRegon(typ: string | null | undefined): boolean | null {
  // Obrona przed `lista.filter(nazwaPodmiotuJawna)`: filter podaje indeks
  // jako drugi argument, wiec tutaj potrafi wylądowac liczba.
  if (!typ || typeof typ !== 'string') return null;
  const t = typ.trim().toUpperCase();
  if (t === 'F' || t === 'LF') return true;
  if (t === 'P' || t === 'LP') return false;
  return null;   // nieznana wartosc slownikowa — wracamy do zgadywania z nazwy
}

export function nazwaPodmiotuJawna(nazwa: string | null | undefined, typRegon?: string | null): boolean {
  if (!nazwa || !nazwa.trim()) return false;
  // NIGDY jest PONAD rejestrem. ZMIERZONE 24.09.2026 na 93 287 nazwach:
  // REGON nadaje spolkom cywilnym typ „P", a ich nazwy to wprost nazwiska
  // wspolnikow („GP TRUCK TRADING S.C. GRZEGORZ K… AGNIESZKA K…"). Spolka
  // cywilna nie jest osoba prawna — to umowa osob fizycznych — wiec tutaj
  // rejestr myli sie w druga strone niz nasza heurystyka i jego odpowiedzi
  // nie wolno brac za dobra monete. Spolke sprawdzamy PRZED wspolnota:
  // gdyby nazwa miala oba znaczniki, bezpieczniej ja schowac.
  if (SPOLKA_CYWILNA.test(nazwa)) return false;
  if (WSPOLNOTA.test(nazwa)) return true;
  const zRejestru = osobaFizycznaWRegon(typRegon);
  // Poza tym rejestr ma pierwszenstwo przed nasza heurystyka — w obie strony.
  if (zRejestru === false) return true;
  if (zRejestru === true) return false;
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
 * Spolka cywilna podlega progowi tak samo jak osoba fizyczna (do 03.10.2026
 * kod chowal ja niezaleznie od kwoty — wbrew decyzji z 18.09).
 *
 * ZMIANA (03.10.2026, Pawel): 100 000 -> 10 000 EUR. Uzasadnienie Pawla:
 * UOKiK i tak publikuje te przypadki w SUDOP, bez zadnego progu.
 * 10 tys. EUR, a nie „jeszcze mniej", bo to TEZ prog z art. 9 GBER — ten,
 * od ktorego prawo kaze publikowac pomoc w rolnictwie i rybolowstwie —
 * wiec dalej nie jest liczba wymyslona przez nas, a o roznicowaniu
 * progiem jako warunku proporcjonalnosci mowi Schecke (wyzej).
 * Dwie rzeczy, ktore sie NIE zmieniaja i to one niosa ochrone:
 *  - strona osoby fizycznej ma `noindex` i nie trafia do mapy strony
 *    niezaleznie od progu: pokazujemy, ale nie wzmacniamy w wyszukiwarkach,
 *  - prog dziala tylko przy dzialajacej drodze sprzeciwu (JAWNE_KONTAKT).
 * Pomiar przed i po zmianie: docs/nazwiska.md.
 */
/*
 * SPRAWDZONE 30.09.2026 — kwota sie zgadza. EUR-Lex nadal oddaje pusta
 * odpowiedz (HTTP 202, zero bajtow), ale tekst nowelizacji GBER lezy takze
 * na stronie Komisji: C(2023) 1712 final, przyjete jako rozporzadzenie
 * 2023/1315, obowiazuje od 1.07.2023. Nowe brzmienie art. 9 ust. 1 lit. c):
 *
 *   „the information referred to in Annex III on each individual aid award
 *    exceeding EUR 100 000, or for aid involved in financial products
 *    supported by the InvestEU fund under Section 16 on each individual aid
 *    award exceeding EUR 500 000, or for beneficiaries active in primary
 *    agricultural production or in the fishery and aquaculture sector (…)
 *    on each individual aid award exceeding EUR 10 000."
 *
 *   https://competition-policy.ec.europa.eu/system/files/2023-03/
 *   GBER_amendment_2023_EC_communication_annex_0.pdf
 *
 * Przed ta nowelizacja prog ogolny wynosil 500 tys. EUR — stad rozbieznosc
 * w starszych opracowaniach. Dwa przypisy do naszego progu:
 *  - w rolnictwie pierwotnym i w rybolowstwie prawo kaze publikowac juz
 *    od 10 tys. EUR, wiec tam jestesmy OSTROZNIEJSI, niz trzeba,
 *  - dla produktow finansowych z InvestEU (sekcja 16) prog wynosi 500 tys.
 *    EUR — to jedyne pasmo, w ktorym jestesmy mniej ostrozni niz GBER.
 *    SUDOP nie oznacza tych przypadkow osobno, wiec ich nie wydzielamy;
 *    decyzja o zwezeniu progu nalezy do Pawla.
 * Liczymy POJEDYNCZA pomoc, nie sume dla podmiotu — to takze strona
 * ostrozniejsza: trzy razy po 50 tys. EUR progu nie przekracza.
 */
export const PROG_JAWNOSCI_EUR = 10_000;

export type OpcjeNazwy = {
  /** Najwieksza POJEDYNCZA pomoc dla tego podmiotu, w euro. */
  pomocEur?: number | null;
  /** Rodzaj podmiotu z REGON, gdy go znamy: 'P', 'F', 'LP', 'LF'. */
  typRegon?: string | null;
  /**
   * Czy prog kwotowy dziala. Warunkiem jest podany adres kontaktowy — bez
   * drogi zlozenia sprzeciwu (art. 21 RODO) nie pokazujemy nazwisk w ogole.
   */
  progAktywny?: boolean;
};

/**
 * Tryb lokalny bez filtra nazw — decyzja Pawla z 19.09.2026: serwis dziala
 * tylko na jego komputerze, wiec lokalnie chce widziec wszystkie nazwy.
 *
 * Wlacza go JAWNE_BEZ_FILTRA_NAZW=1 w .env.local, ale TYLKO poza buildem
 * produkcyjnym: `next build` / `next start` ustawiaja NODE_ENV=production
 * i wtedy filtr wraca sam. Gdybysmy kiedys wyslali serwis na serwer,
 * ochrona nazwisk nie zalezy od tego, czy ktos pamietal o zmiennej.
 * Funkcja, nie stala — zeby test mogl sprawdzic oba stany.
 */
export function trybBezFiltra(env: Record<string, string | undefined> = process.env): boolean {
  return env.JAWNE_BEZ_FILTRA_NAZW === '1' && env.NODE_ENV !== 'production';
}

/** Nazwa do wyswietlenia albo opis zastepczy — nigdy pusty napis. */
export function nazwaDoPokazania(nazwa: string | null | undefined, opcje: OpcjeNazwy = {}): { tekst: string; pominieta: boolean } {
  if (trybBezFiltra() && nazwa?.trim()) return { tekst: nazwa.trim(), pominieta: false };
  if (nazwaPodmiotuJawna(nazwa, opcje.typRegon)) return { tekst: nazwa!.trim(), pominieta: false };
  const nadProgiem = opcje.progAktywny === true
    && (opcje.pomocEur ?? 0) >= PROG_JAWNOSCI_EUR
    && Boolean(nazwa?.trim());
  if (nadProgiem) return { tekst: nazwa!.trim(), pominieta: false };
  return { tekst: 'nazwa pominięta — może to być osoba fizyczna', pominieta: true };
}
