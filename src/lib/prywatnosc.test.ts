import { describe, expect, it } from 'vitest';
import {
  bezNazwiskOsobPrywatnych as bez, nazwaDoPokazania, nazwaPodmiotuJawna, pominietoNazwiska,
  PROG_JAWNOSCI_EUR, trybBezFiltra, zawieraImie,
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
    // wspolnota mieszkaniowa — nazwa to adres budynku (decyzja z 18.09.2026)
    'Wspólnota Mieszkaniowa przy ul. Przykładowej 1',
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

  /*
   * Decyzja Pawla z 18.09.2026, potwierdzona 03.10.2026: spolka cywilna
   * podlega progowi TAK SAMO jak osoba fizyczna. Do 03.10 kod chowal ja
   * zawsze, a ten test pilnowal rozjazdu z dokumentacja zamiast decyzji.
   */
  it('spolka cywilna: ukryta ponizej progu, widoczna powyzej — jak osoba fizyczna', () => {
    const sc = 'PIZZERIA PRZYKŁAD S.C. ANNA I ADAM PRZYKŁADOWI';
    expect(nazwaDoPokazania(sc, { pomocEur: PROG_JAWNOSCI_EUR - 1, progAktywny: true }).pominieta).toBe(true);
    expect(nazwaDoPokazania(sc, { pomocEur: PROG_JAWNOSCI_EUR, progAktywny: true }).pominieta).toBe(false);
    // REGON nadaje s.c. typ P — to nie omija progu w dol ani w gore
    expect(nazwaDoPokazania(sc, { pomocEur: PROG_JAWNOSCI_EUR - 1, progAktywny: true, typRegon: 'P' }).pominieta).toBe(true);
    // bez drogi sprzeciwu prog nie dziala w ogole
    expect(nazwaDoPokazania(sc, { pomocEur: 9_000_000, progAktywny: false }).pominieta).toBe(true);
  });

  it('wspolnota mieszkaniowa jest jawna zawsze — jej nazwa to adres budynku', () => {
    expect(nazwaDoPokazania('Wspólnota Mieszkaniowa przy ul. Przykładowej 1', {}).pominieta).toBe(false);
    // imie w nazwie ULICY nie jest nazwiskiem czlonka wspolnoty
    expect(nazwaPodmiotuJawna('Wspólnota Mieszkaniowa ul. Jana Pawła II 5')).toBe(true);
    expect(nazwaPodmiotuJawna('WSPÓLNOTA MIESZKANIOWA NIERUCHOMOŚCI PRZY UL. GEN. WŁ. ANDERSA 37')).toBe(true);
  });

  it('spolka jest jawna takze bez progu i bez kwoty', () => {
    expect(nazwaDoPokazania('Przykład Sp. z o.o.').pominieta).toBe(false);
  });
});

describe('trybBezFiltra', () => {
  // Lokalnie Pawel widzi wszystkie nazwy; w buildzie produkcyjnym filtr
  // wraca sam, niezaleznie od zmiennej.
  it('dziala tylko ze zmienna i poza produkcja', () => {
    expect(trybBezFiltra({ JAWNE_BEZ_FILTRA_NAZW: '1', NODE_ENV: 'development' })).toBe(true);
    expect(trybBezFiltra({ JAWNE_BEZ_FILTRA_NAZW: '1', NODE_ENV: 'production' })).toBe(false);
    expect(trybBezFiltra({ NODE_ENV: 'development' })).toBe(false);
  });

  it('w trybie lokalnym pokazuje nazwe osoby, poza nim ja ukrywa', () => {
    const przed = { ...process.env };
    try {
      process.env.JAWNE_BEZ_FILTRA_NAZW = '1';
      expect(nazwaDoPokazania('Zakład Fryzjerski Anna Przykładowa').pominieta).toBe(false);
      delete process.env.JAWNE_BEZ_FILTRA_NAZW;
      expect(nazwaDoPokazania('Zakład Fryzjerski Anna Przykładowa').pominieta).toBe(true);
    } finally {
      process.env = przed;
    }
  });
});

describe('REGON ma pierwszenstwo przed zgadywaniem z nazwy', () => {
  it('osoba prawna: nazwe pokazujemy, nawet gdy jest w niej nazwisko', () => {
    // Bez REGON-u nasza heurystyka chowa te nazwe — bo widzi imie.
    expect(nazwaPodmiotuJawna('Zakład Fryzjerski Anna Kowalska')).toBe(false);
    // Rejestr mowi, ze to osoba prawna — wiec nazwa nie jest dana osobowa.
    expect(nazwaPodmiotuJawna('Zakład Fryzjerski Anna Kowalska', 'P')).toBe(true);
    expect(nazwaPodmiotuJawna('Jednostka lokalna czegoś', 'LP')).toBe(true);
  });

  it('osoba fizyczna: chowamy, nawet gdy nazwa wyglada na firme', () => {
    expect(nazwaPodmiotuJawna('CENTRUM USŁUG BUDOWLANYCH', 'F')).toBe(false);
    expect(nazwaPodmiotuJawna('CENTRUM USŁUG BUDOWLANYCH', 'LF')).toBe(false);
  });

  it('nieznana wartosc albo brak typu: wracamy do zgadywania z nazwy', () => {
    expect(nazwaPodmiotuJawna('FIRMA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', 'XYZ')).toBe(true);
    expect(nazwaPodmiotuJawna('Jan Kowalski', null)).toBe(false);
  });

  it('nazwaDoPokazania bierze typ z REGON', () => {
    expect(nazwaDoPokazania('Zakład Fryzjerski Anna Kowalska', { typRegon: 'P' }).pominieta).toBe(false);
    expect(nazwaDoPokazania('CENTRUM USŁUG BUDOWLANYCH', { typRegon: 'F' }).pominieta).toBe(true);
  });
});

describe('spolka cywilna: nasza regula jest ostrzejsza niz REGON', () => {
  it('REGON nadaje s.c. typ P, ale jej nazwa to nazwiska wspolnikow', () => {
    // Zmierzone na zywej bazie: takie nazwy REGON oznacza jako osobe prawna.
    expect(nazwaPodmiotuJawna('GP TRUCK TRADING S.C. GRZEGORZ KĄDZIELA AGNIESZKA KĄDZIELA', 'P')).toBe(false);
    expect(nazwaPodmiotuJawna('DOMOSFERA SC RIL KOZŁOWSCY', 'P')).toBe(false);
  });

  it('wspolnota mieszkaniowa jest jawna niezaleznie od rejestru', () => {
    expect(nazwaPodmiotuJawna('Wspólnota Mieszkaniowa Kwiatowa 5', 'P')).toBe(true);
    expect(nazwaPodmiotuJawna('Wspólnota Mieszkaniowa Kwiatowa 5', null)).toBe(true);
  });

  it('nazwa z oboma znacznikami jest chowana — bezpieczniejsza strona', () => {
    expect(nazwaPodmiotuJawna('Wspólnota Mieszkaniowa Kwiatowa 5 Kowalski i Nowak s.c.')).toBe(false);
  });
});

describe('uwagi agenta asc po pomiarze na 33 813 zwyciezcach BZP (15.10.2026)', () => {
  it('„Urządzeń” to nie urząd — firma z nazwiskiem nie przechodzi jako instytucja', () => {
    expect(nazwaPodmiotuJawna('Serwis Urządzeń Medycznych Kowalski')).toBe(false);
    expect(nazwaPodmiotuJawna('Produkcja Urządzeń Pralniczych Nowak')).toBe(false);
    // Odmiana urzedu dalej dziala.
    expect(nazwaPodmiotuJawna('Urząd Miejski w Bełchatowie')).toBe(true);
    expect(nazwaPodmiotuJawna('Dyrektor Urzędu Morskiego w Gdyni')).toBe(true);
  });

  it('S.K.A. jest w KRS jak sp.k. — jawna mimo nazwiska w firmie', () => {
    expect(nazwaPodmiotuJawna('ELVIT Dariusz Witek S.K.A.')).toBe(true);
  });

  it('forma zagraniczna jawna, ALE nie przebija imienia z PESEL', () => {
    expect(nazwaPodmiotuJawna('Cepheid GmbH')).toBe(true);
    expect(nazwaPodmiotuJawna('Schunk Carbon Technology S.R.O.')).toBe(true);
    expect(nazwaPodmiotuJawna('AstraZeneca Kft.')).toBe(true);
    expect(nazwaPodmiotuJawna('UAB Softra')).toBe(true);
    expect(nazwaPodmiotuJawna('Medical Systems S.R.L.')).toBe(true);
    expect(nazwaPodmiotuJawna('UAB Jonas Petraitis')).toBe(false); // imie z PESEL zatrzymuje
    // Zmierzone: polskie jednoosobowe firmy z ozdobnikiem „LTD” i „B.V”.
    expect(nazwaPodmiotuJawna('MAGA LTD MAREK GRABOWSKI')).toBe(false);
    expect(nazwaPodmiotuJawna('MAŁGORZATA PAŁCZYŃSKA "CONSULTANCY RITA B.V"')).toBe(false);
  });

  it('SP ZOZ ma osobowosc prawna — adres z kodem pocztowym go nie chowa', () => {
    expect(nazwaPodmiotuJawna('Wojskowa Specjalistyczna Przychodnia Lekarska SPZOZ w Rzeszowie')).toBe(true);
    expect(nazwaPodmiotuJawna('Szpital Samodzielnym Publicznym Zakładem Opieki Zdrowotnej, ul. Kościuszki 30, 19-300 Ełk')).toBe(true);
  });
});
