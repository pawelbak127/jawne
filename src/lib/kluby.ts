/**
 * Rejestr klubow i kol poselskich kadencji X.
 *
 * Liczby mandatow sa ZMIERZONE na /sejm/term10/clubs i sumuja sie do 460
 * (pelna izba) — pilnuje tego test. Pelnych nazw klubow TU NIE MA celowo:
 * pole `name` przychodzi z rejestru przy imporcie i nie wolno go zgadywac.
 * Do czasu importu interfejs pokazuje kod rejestrowy.
 *
 * BARWY NIE SA BARWAMI PARTYJNYMI i interfejs mowi o tym wprost.
 * Pomiar dominujacego koloru logo dal piec czerwieni, trzy granaty i jeden
 * klub bez barwnych pikseli. Z takiego zestawu nie da sie zbudowac polkola,
 * na ktorym widac dwanascie blokow — i nie naprawi tego zewnetrzny rejestr,
 * bo on te barwy wiernie odtwarza. Zestaw ponizej pochodzi z palety
 * zwalidowanej pod trzy typy daltonizmu.
 *
 * KOLEJNOSC jest nasza, nie zmierzona. To uklad od lewej do prawej wedlug
 * przyjetej konwencji sceny politycznej, dobrany tak, zeby SASIADUJACE bloki
 * mialy rozne odcienie — dystans CIE76 kazdej pary sasiadow sprawdza test.
 * Rejestr Sejmu nie publikuje planu sali, wiec nie udajemy, ze go mamy.
 */

export type Klub = {
  /** Identyfikator z rejestru Sejmu — takze czesc adresu strony. */
  id: string;
  /** Pelna nazwa z rejestru. `null`, dopoki import jej nie przyniesie. */
  nazwa: string | null;
  /** Mandaty. `null` znaczy „rejestr nie podaje", a NIE „zero". */
  mandaty: number | null;
  barwa: string;
  barwaCiemna: string;
};

export const KLUBY: readonly Klub[] = [
  { id: 'Razem',           nazwa: null, mandaty: 4,    barwa: '#b0407a', barwaCiemna: '#d55181' },
  { id: 'Lewica',          nazwa: null, mandaty: 21,   barwa: '#e34948', barwaCiemna: '#e66767' },
  { id: 'KO',              nazwa: null, mandaty: 156,  barwa: '#2a78d6', barwaCiemna: '#3987e5' },
  { id: 'Polska2050',      nazwa: null, mandaty: 15,   barwa: '#e87ba4', barwaCiemna: '#e896b6' },
  { id: 'PSL-TD',          nazwa: null, mandaty: 32,   barwa: '#008300', barwaCiemna: '#2ba52b' },
  { id: 'Demokracja',      nazwa: null, mandaty: 4,    barwa: '#5b4636', barwaCiemna: '#9c7f66' },
  { id: 'Centrum',         nazwa: null, mandaty: 15,   barwa: '#1baf7a', barwaCiemna: '#3ec79a' },
  { id: 'RozwojPlus',      nazwa: null, mandaty: 41,   barwa: '#eb6834', barwaCiemna: '#f0855a' },
  { id: 'PiS',             nazwa: null, mandaty: 146,  barwa: '#4a3aa7', barwaCiemna: '#9085e9' },
  { id: 'Konfederacja',    nazwa: null, mandaty: 16,   barwa: '#eda100', barwaCiemna: '#d9a52e' },
  { id: 'Konfederacja_KP', nazwa: null, mandaty: 3,    barwa: '#8a6a4f', barwaCiemna: '#c0a184' },
  { id: 'niez.',           nazwa: null, mandaty: 7,    barwa: '#9a958c', barwaCiemna: '#8e8a95' },
  /* Kolo istnieje w rejestrze BEZ liczebnosci — rejestr przestal ja prowadzic.
     Zostaje w spisie, bo nikogo nie ukrywamy, ale nie zajmuje miejsc w izbie. */
  { id: 'Polska2050-TD',   nazwa: null, mandaty: null, barwa: '#c9a227', barwaCiemna: '#e0be4a' },
];

/** Pelna izba. Wartosc kontrolna — patrz test. */
export const MANDATOW_W_IZBIE = 460;

export function klub(id: string): Klub | undefined {
  return KLUBY.find((k) => k.id === id);
}

/** Etykieta do interfejsu: pelna nazwa, gdy import ja przyniosl, inaczej kod. */
export function etykietaKlubu(k: Klub): string {
  return k.nazwa ?? k.id;
}

/** Kluby, ktore faktycznie zajmuja miejsca — w kolejnosci zasiadania. */
export function klubyZMandatami(): { klub: Klub; mandaty: number }[] {
  return KLUBY.flatMap((k) => (k.mandaty === null ? [] : [{ klub: k, mandaty: k.mandaty }]));
}
