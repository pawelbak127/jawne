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
