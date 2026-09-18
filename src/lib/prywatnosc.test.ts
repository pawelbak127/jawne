import { describe, expect, it } from 'vitest';
import {
  bezNazwiskOsobPrywatnych as bez, nazwaDoPokazania, nazwaPodmiotuJawna, pominietoNazwiska,
  PROG_JAWNOSCI_EUR, zawieraImie,
} from './prywatnosc';

/*
 * NAZWISKA W TYCH TESTACH SA ZMYSLONE. Budowa zdan jest przepisana z tytulow
 * w rejestrze, ale prawdziwych nazwisk osob prywatnych nie wkladamy do
 * publicznego repozytorium — to bylaby dokladnie ta roznica, ktorej ten
 * modul ma zapobiec. Sprawdzenie na pelnych danych robi sie zapytaniem.
 */
describe('bezNazwiskOsobPrywatnych', () => {
  it('usuwa oskarzyciela i adwokata, zostawia posla', () => {
    expect(bez(
      'Sprawozdanie Komisji w sprawie wniosku oskarżyciela prywatnego Jana Kowalskiego, reprezentowanego przez adwokata Adama Nowaka, z dnia 10 września 2025 r. o wyrażenie zgody przez Sejm na pociągnięcie do odpowiedzialności karnej posła Piotra Posłowskiego (druk nr 1)',
    )).toBe(
      'Sprawozdanie Komisji w sprawie wniosku oskarżyciela prywatnego, reprezentowanego przez adwokata, z dnia 10 września 2025 r. o wyrażenie zgody przez Sejm na pociągnięcie do odpowiedzialności karnej posła Piotra Posłowskiego (druk nr 1)',
    );
  });

  it('bez przecinkow po nazwisku', () => {
    expect(bez('wniosku oskarżyciela prywatnego Jana Kowalskiego reprezentowanego przez adwokata Adama Nowaka z dnia 6 maja 2024 r.'))
      .toBe('wniosku oskarżyciela prywatnego reprezentowanego przez adwokata z dnia 6 maja 2024 r.');
  });

  it('radca prawny z inicjalem', () => {
    expect(bez('reprezentowanego przez radcę prawnego Jana B. Kowalskiego z dnia'))
      .toBe('reprezentowanego przez radcę prawnego z dnia');
  });

  it('kilku pelnomocnikow polaczonych "oraz" i "i"', () => {
    expect(bez('reprezentowanego przez adwokatów Jana Nowaka oraz Adama Kowala z dnia'))
      .toBe('reprezentowanego przez adwokatów z dnia');
    expect(bez('reprezentowanej przez adwokatów Jana Nowaka i Annę Kowal, z dnia'))
      .toBe('reprezentowanej przez adwokatów, z dnia');
  });

  it('oskarzycielka i adwokatka w formie zenskiej', () => {
    expect(bez('wniosku oskarżycielki prywatnej Anny Nowak, reprezentowanej przez adwokat Ewę Kowal, z dnia'))
      .toBe('wniosku oskarżycielki prywatnej, reprezentowanej przez adwokat, z dnia');
  });

  it('nazwisko dwuczlonowe i dwa imiona', () => {
    expect(bez('oskarżyciela prywatnego Jana Adama Nowaka-Kowalskiego z dnia'))
      .toBe('oskarżyciela prywatnego z dnia');
  });

  it('"przedlozonego przez adwokata" tez traci nazwisko', () => {
    expect(bez('z dnia 17 lutego 2021 r. przedłożonego przez adwokata Jana Nowaka, uzupełnionego'))
      .toBe('z dnia 17 lutego 2021 r. przedłożonego przez adwokata, uzupełnionego');
  });

  it('wniosek bez nazwiska zostaje bez zmian', () => {
    const t = 'wniosku oskarżyciela prywatnego z dnia 22 kwietnia 2024 r.';
    expect(bez(t)).toBe(t);
    expect(pominietoNazwiska(t)).toBe(false);
  });

  // Posel wybrany na oskarzyciela przed Trybunalem Stanu dziala publicznie.
  it('oskarzyciel publiczny nie jest ruszany', () => {
    const t = 'wybór posła Jana Nowaka jako oskarżyciela w postępowaniu przed Trybunałem Stanu';
    expect(bez(t)).toBe(t);
  });

  it('zglasza, ze cos pominieto', () => {
    expect(pominietoNazwiska('oskarżyciela prywatnego Jana Nowaka')).toBe(true);
    expect(pominietoNazwiska(null)).toBe(false);
  });
});

// Nazwy zmyslone, zbudowane jak w prawdziwych listach beneficjentow.
describe('nazwaPodmiotuJawna', () => {
  const jawne = [
    'Przykładowa Sp. z o.o.', 'PRZYKŁAD SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', 'Przykład S.A.', 'Fundusz Przykładowy SA',
    'Gmina Przykładowo', 'Powiat przykładowski', 'Uniwersytet Przykładowy', 'Fundacja Przykładu',
    'Stowarzyszenie Przyjaciół Przykładu', 'Szpital Wojewódzki w Przykładowie', 'Lokalna Grupa Działania Przykład',
    'Przykład spółka komandytowa', 'Przykład Sp.k.', 'Generalna Dyrekcja Dróg Krajowych i Autostrad',
    'Szef Urzędu do Spraw Przykładów', 'Przedsiębiorstwo Wodociągów i Kanalizacji w Przykładowie',
    // forma prawna zapisana skrotem i z literowka — obie sa w listach UE
    'PRZYKŁAD SPÓŁKA Z O.O.', 'Przykład Spólka z ograniczoną odpowiedzialnością',
    // patron w dopelniaczu nie jest osoba, choc "Jana" i "Stanisława" to tez imiona zenskie
    'Szkoła Podstawowa nr 3 im. Jana Pawła II w Przykładowie', 'TEATR IM. STANISŁAWA PRZYKŁADOWEGO W PRZYKŁADOWIE',
    'Parafia pw. św. Józefa w Przykładowie',
    // jednostka samorzadu z imieniem w nazwie miejscowosci
    'Gmina Kazimierz Dolny',
    'Zakład Gospodarki Komunalnej w Przykładowie', 'Instytut Przykładów PAN', 'Akademia Sztuk Pięknych w Przykładowie',
    // organy udzielajace pomocy
    'BURMISTRZ PRZYKŁADOWA', 'Starosta Przykładowski', 'Prezydent Miasta Przykładowa', 'Bankowy Fundusz Przykładowy',
    'Polski Instytut Przykładów',
    // zwiazek metropolitalny udziela pomocy jak kazdy organ
    'Przewodniczący Zarządu Przykładowej Metropolii',
    'STAROSTA POWIATU JAROSŁAW', 'Przykład Anna Przykładna Jan Przykładny sp. jawna',
  ];
  for (const n of jawne) it(`pokazuje: ${n}`, () => expect(nazwaPodmiotuJawna(n)).toBe(true));

  const ukryte = [
    'Jan Kowalski', 'ANNA NOWAK', 'SMART BUSINESS Jan Kowalski', 'Biuro Projektowe PRZYKŁAD Anna Nowak',
    'Kowalski i Nowak s.c.', 'PRZYKŁAD SPÓŁKA CYWILNA Jan Kowalski', '', null,
    // slowo "zakład", "agencja", "centrum" nie wyklucza jednoosobowej firmy
    'Zakład Fryzjerski Anna Przykładowa', 'Agencja Reklamowa Piotr Przykładny', 'Centrum Urody PRZYKŁAD',
    // ulica Kosciuszki nie jest kosciolem; adres z kodem pocztowym to znak firmy osoby
    'F.H. „PRZYKŁAD” Jan Przykładowski 00-000 Przykładowo ul. Kościuszki 1', 'Firma Handlowa PRZYKŁAD 00-001 Przykładowo',
    // imie wlasciciela za patronem nadal zatrzymuje
    'Niepubliczne Przedszkole im. Kubusia Puchatka Anna Przykładowa',
    'Wspólnota Mieszkaniowa przy ul. Przykładowej 1',
    // udzielajacym bywa jednoosobowa firma szkoleniowa
    'Centrum Doradztwa Przykładowego Urszula Przykładna',
  ];
  for (const n of ukryte) it(`ukrywa: ${String(n)}`, () => expect(nazwaPodmiotuJawna(n)).toBe(false));

  it('nie myli "sa" w srodku slowa z forma prawna', () => {
    expect(nazwaPodmiotuJawna('Jan Sadowski')).toBe(false);
  });
});

describe('zawieraImie', () => {
  it('rozpoznaje imie w mianowniku, takze wielkimi literami', () => {
    expect(zawieraImie('Usługi Transportowe KAROL PRZYKŁADNY')).toBe(true);
    expect(zawieraImie('Józefa Przykładowa')).toBe(true);
  });
  it('pomija dopelniacz meskiego imienia po patronie', () => {
    expect(zawieraImie('Szpital im. Józefa Przykładnego')).toBe(false);
    expect(zawieraImie('Liceum im. Aleksandra Przykładowego')).toBe(false);
  });
  it('nie myli nazwy miejscowosci z imieniem', () => {
    expect(zawieraImie('Gmina Stanisławów')).toBe(false);
  });
});

describe('nazwaDoPokazania', () => {
  it('zawsze daje tekst, nigdy pusty napis', () => {
    expect(nazwaDoPokazania('Jan Kowalski')).toEqual({ tekst: 'nazwa pominięta — może to być osoba fizyczna', pominieta: true });
    expect(nazwaDoPokazania(' Gmina Przykładowo ')).toEqual({ tekst: 'Gmina Przykładowo', pominieta: false });
  });
});

describe('prog jawnosci osoby fizycznej', () => {
  const osoba = 'Zakład Stolarski Jan Przykładowski';

  it('bez progu nazwisko zostaje ukryte niezaleznie od kwoty', () => {
    expect(nazwaDoPokazania(osoba, { pomocEur: 5_000_000 }).pominieta).toBe(true);
  });

  it('z progiem duza pomoc odslania nazwe', () => {
    expect(nazwaDoPokazania(osoba, { pomocEur: PROG_JAWNOSCI_EUR, progAktywny: true })).toEqual({ tekst: osoba, pominieta: false });
  });

  it('pomoc ponizej progu nadal jest anonimowa', () => {
    expect(nazwaDoPokazania(osoba, { pomocEur: PROG_JAWNOSCI_EUR - 1, progAktywny: true }).pominieta).toBe(true);
    expect(nazwaDoPokazania(osoba, { pomocEur: null, progAktywny: true }).pominieta).toBe(true);
  });

  // Spolka cywilna i wspolnota mieszkaniowa sa ukryte ZAWSZE — prog ich nie znosi.
  it('prog nie omija listy "nigdy"', () => {
    expect(nazwaDoPokazania('"U&B" s.c.', { pomocEur: 9_000_000, progAktywny: true }).pominieta).toBe(true);
    expect(nazwaDoPokazania('Wspólnota Mieszkaniowa przy ul. Przykładowej 1', { pomocEur: 9_000_000, progAktywny: true }).pominieta).toBe(true);
  });

  it('spolka jest jawna takze bez progu i bez kwoty', () => {
    expect(nazwaDoPokazania('Przykład Sp. z o.o.').pominieta).toBe(false);
  });
});
