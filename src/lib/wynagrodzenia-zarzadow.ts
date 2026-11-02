/**
 * Wynagrodzenia zarzadow spolek gieldowych z bezposrednim udzialem Skarbu
 * Panstwa — przepisane RECZNIE z rocznych sprawozdan o wynagrodzeniach
 * (art. 90g ustawy o ofercie publicznej). Spolka musi je opublikowac
 * imiennie i trzymac na stronie przez 10 lat.
 *
 * Dlaczego recznie, a nie importem (zmierzone 02.11.2026 na 8 raportach):
 * kazda spolka ma inny uklad tabeli, `pdftotext` miesza kolumny, PZU i PKO BP
 * podaja kwoty w tys. zl, a Enea i Tauron opublikowaly skany bez warstwy
 * tekstowej. Kontrola: test sprawdza kazdy wiersz (stale + zmienne + inne =
 * razem) i sume osob wobec wiersza „Razem” raportu. Druga droga przy
 * przepisywaniu (02.11.2026): liczby z raportow tekstowych odszukane w ich
 * tekscie, ze skanow — w odczycie OCR (docs/zrodla.md).
 *
 * Definicje, takie same dla wszystkich spolek:
 *  - `stale` — wynagrodzenie stale wyplacone w roku,
 *  - `zmienne` — premie WYPLACONE w roku (zwykle za rok poprzedni), nie
 *    szacunek za rok biezacy — JSW podaje w tabeli szacunek, wiec u niej
 *    bierzemy kwoty wyplacone, ktore ten sam raport podaje w tekscie,
 *  - `inne` — swiadczenia (opieka medyczna, mieszkanie, samochod, PPK/PPE,
 *    szkolenia), odprawy i odszkodowania za zakaz konkurencji; spolki licza
 *    je roznie, dlatego na stronie stoja osobno,
 *  - `razem` = stale + zmienne + inne.
 * Kwoty w zlotych. `dokladnosc` mowi, z jaka dokladnoscia podal je raport.
 * Strony w `gdzie` licza sie wedlug pliku PDF, nie numeru na stronie.
 */

export type CzlonekZarzadu = {
  osoba: string;
  funkcja: string;
  okres: string;
  stale: number;
  zmienne: number;
  inne: number;
  razem: number;
  /** nie pelnil funkcji w roku sprawozdania — wyplaty za wczesniejsze lata albo po odejsciu */
  byly?: true;
  uwaga?: string;
};

export type RaportWynagrodzen = {
  spolka: string;
  /** krotka nazwa do naglowkow i kotwic */
  skrot: string;
  rok: number;
  raport: string;
  /** SHA-256 pliku, z ktorego przepisalismy — adres moze sie zmienic, plik nie */
  sha256: string;
  /** gdzie w raporcie jest tabela zarzadu */
  gdzie: string;
  /** dokladnosc kwot w raporcie, w zlotych (1 = do zlotowki, 1000 = tys. zl) */
  dokladnosc: number;
  osoby: CzlonekZarzadu[];
  /** wiersz „Razem” z raportu — tylko pola, ktore znacza to samo co u nas */
  razemWRaporcie?: Partial<Record<'stale' | 'zmienne' | 'inne' | 'razem', number>>;
  /** przecietne wynagrodzenie pracownika spolki (bez zarzadu i rady), z tego samego raportu */
  pracownik: { kwota: number; okres: 'miesiac' | 'rok'; gdzie: string; uwaga?: string };
  uwagi: string[];
};

const tys = (n: number): number => Math.round(n * 1000);

export const RAPORTY_2025: RaportWynagrodzen[] = [
  {
    spolka: 'ORLEN S.A.',
    skrot: 'Orlen',
    rok: 2025,
    raport: 'https://bonnier.pl/static/att/emitent/2026-05/20260512_180209_1246475086_9._Sprawozdanie_RN__Wynagrodzenia_za_2025.pdf',
    sha256: '700597c37ed9c53f68ba848c24698f0fed0cc3fc252ebeec8b426c3e2e7f551a',
    gdzie: 'tabela 5, s. 10 (kopia załącznika do raportu bieżącego 17/2026)',
    dokladnosc: 0.01,
    osoby: [
      { osoba: 'Ireneusz Fąfara', funkcja: 'Prezes Zarządu, Dyrektor Generalny', okres: 'od 11.04.2024', stale: 1473054.00, zmienne: 998137.89, inne: 25337.24, razem: 2496529.13 },
      { osoba: 'Witold Literacki', funkcja: 'Wiceprezes Zarządu ds. Korporacyjnych, Pierwszy Zastępca Prezesa', okres: 'od 06.02.2024', stale: 1473054.00, zmienne: 1253174.40, inne: 8151.00, razem: 2734379.40 },
      { osoba: 'Sławomir Jędrzejczyk', funkcja: 'Wiceprezes Zarządu ds. Finansowych', okres: 'od 24.09.2025', stale: 361480.20, zmienne: 0, inne: 3195.89, razem: 364676.09 },
      {
        osoba: 'Magdalena Bartoś', funkcja: 'Wiceprezes Zarządu ds. Finansowych', okres: '01.05.2024–27.08.2025', stale: 1013038.73, zmienne: 932113.20, inne: 1025862.00, razem: 2971013.93,
        uwaga: 'W innych: odprawa 384 698,25 zł, odszkodowanie za zakaz konkurencji 512 931 zł (4 miesiące 2025 r.) i 128 232,75 zł za pozostawanie w dyspozycji spółki.',
      },
      { osoba: 'Marek Balawejder', funkcja: 'Członek Zarządu ds. Consumers and Products', okres: 'od 01.08.2024', stale: 1473054.00, zmienne: 582570.75, inne: 86100.64, razem: 2141725.39 },
      {
        osoba: 'Artur Osuchowski', funkcja: 'Członek Zarządu ds. Zrównoważonego Rozwoju i Transformacji Energetycznej', okres: '13.06.2024–27.08.2025', stale: 1013038.73, zmienne: 768993.39, inne: 1034165.76, razem: 2816197.88,
        uwaga: 'W innych: odprawa 384 698,25 zł, odszkodowanie za zakaz konkurencji 512 931 zł (4 miesiące 2025 r.) i 128 232,75 zł za pozostawanie w dyspozycji spółki.',
      },
      { osoba: 'Ireneusz Sitarski', funkcja: 'Wiceprezes Zarządu ds. Downstream', okres: 'od 16.05.2024', stale: 1473054.00, zmienne: 877739.93, inne: 9145.12, razem: 2359939.05 },
      { osoba: 'Robert Soszyński', funkcja: 'Wiceprezes Zarządu ds. Operacyjnych', okres: 'od 01.05.2024', stale: 1473054.00, zmienne: 932113.20, inne: 11417.67, razem: 2416584.87 },
      { osoba: 'Sławomir Staszak', funkcja: 'Członek Zarządu ds. Energy', okres: 'od 29.09.2025', stale: 342847.20, zmienne: 0, inne: 25626.73, razem: 368473.93 },
      { osoba: 'Wiesław Prugar', funkcja: 'Członek Zarządu ds. Upstream', okres: 'od 01.05.2024', stale: 1473054.00, zmienne: 932113.20, inne: 13955.64, razem: 2419122.84 },
      { osoba: 'Marcin Wasilewski', funkcja: 'Członek Zarządu ds. Transformacji', okres: 'od 06.11.2024', stale: 1473054.00, zmienne: 213609.28, inne: 13020.74, razem: 1699684.02 },
    ],
    razemWRaporcie: { stale: 13041782.86, zmienne: 7490565.24, inne: 2255978.43, razem: 22788326.53 },
    pracownik: { kwota: 169000, okres: 'rok', gdzie: 'tabela 8, s. 16 („otrzymane przez pracowników”, 0,169 mln zł)' },
    uwagi: ['Zmienne to premia za 2024 r. wypłacona w 2025 r.'],
  },
  {
    spolka: 'PKO Bank Polski S.A.',
    skrot: 'PKO BP',
    rok: 2025,
    raport: 'https://pkobp.pl/api/default/16503b9f-31e9-4d64-9c6e-b6207f448b4b.pdf',
    sha256: 'fda26194818c4173e53744678f33bee498ada2f8c014e7e688f0921d1570ce47',
    gdzie: 'tabela 6, s. 13',
    dokladnosc: 1000,
    osoby: [
      { osoba: 'Szymon Midera', funkcja: 'Prezes Zarządu', okres: 'od 15.02.2024', stale: tys(1527), zmienne: tys(281), inne: tys(71), razem: tys(1879) },
      { osoba: 'Krzysztof Dresler', funkcja: 'Wiceprezes Zarządu (finanse i rachunkowość)', okres: 'od 26.03.2024', stale: tys(1476), zmienne: tys(249), inne: tys(68), razem: tys(1793) },
      { osoba: 'Ludmiła Falak-Cyniak', funkcja: 'Wiceprezes Zarządu (bankowość korporacyjna i inwestycyjna)', okres: 'od 20.05.2024', stale: tys(1476), zmienne: tys(213), inne: tys(67), razem: tys(1756) },
      {
        osoba: 'Piotr Mazur', funkcja: 'Wiceprezes Zarządu (zarządzanie ryzykiem)', okres: 'od 08.01.2013', stale: tys(1476), zmienne: tys(1003), inne: tys(94), razem: tys(2573),
        uwaga: 'Zmienne: 431 tys. zł premii w gotówce i 572 tys. zł w akcjach fantomowych za lata 2020–2024.',
      },
      { osoba: 'Tomasz Pol', funkcja: 'Wiceprezes Zarządu (bankowość detaliczna i firm)', okres: 'od 01.05.2025', stale: tys(992), zmienne: 0, inne: tys(4), razem: tys(996) },
      { osoba: 'Marek Radzikowski', funkcja: 'Wiceprezes Zarządu (operacje i bankowość międzynarodowa)', okres: 'od 14.02.2024', stale: tys(1476), zmienne: tys(277), inne: tys(69), razem: tys(1822) },
      { osoba: 'Michał Sobolewski', funkcja: 'Wiceprezes Zarządu (administracja)', okres: 'od 01.07.2024', stale: tys(1476), zmienne: tys(182), inne: tys(7), razem: tys(1665) },
      { osoba: 'Mariusz Zarzycki', funkcja: 'Wiceprezes Zarządu (technologia)', okres: 'od 22.04.2024', stale: tys(1476), zmienne: tys(231), inne: tys(67), razem: tys(1774) },
      { osoba: 'Rafał Antczak', funkcja: 'były wiceprezes', okres: '02.07.2017–14.10.2021', stale: 0, zmienne: tys(148), inne: tys(5), razem: tys(153), byly: true },
      { osoba: 'Maciej Cieślukowski', funkcja: 'były członek zarządu', okres: '25.03.2024–21.04.2024', stale: 0, zmienne: tys(68), inne: 0, razem: tys(68), byly: true },
      { osoba: 'Zbigniew Jagiełło', funkcja: 'były prezes', okres: '01.10.2009–07.06.2021', stale: 0, zmienne: tys(132), inne: 0, razem: tys(132), byly: true },
      { osoba: 'Andrzej Kopyrski', funkcja: 'były wiceprezes', okres: '01.01.2023–14.02.2024', stale: 0, zmienne: tys(405), inne: tys(14), razem: tys(419), byly: true },
      { osoba: 'Rafał Kozłowski', funkcja: 'były wiceprezes', okres: '01.01.2018–15.06.2021', stale: 0, zmienne: tys(123), inne: tys(4), razem: tys(128), byly: true },
      { osoba: 'Adam Marciniak', funkcja: 'były wiceprezes', okres: '01.10.2017–13.08.2021', stale: 0, zmienne: tys(134), inne: tys(5), razem: tys(138), byly: true },
      { osoba: 'Jakub Papierski', funkcja: 'były wiceprezes', okres: '22.03.2010–14.10.2021', stale: 0, zmienne: tys(142), inne: 0, razem: tys(142), byly: true },
      { osoba: 'Jan Emeryk Rościszewski', funkcja: 'były wiceprezes', okres: '18.07.2016–22.10.2021', stale: 0, zmienne: tys(153), inne: tys(5), razem: tys(158), byly: true },
    ],
    pracownik: { kwota: 174400, okres: 'rok', gdzie: 'tabela 11, s. 21 (174,4 tys. zł)' },
    uwagi: [
      'Kwoty w raporcie w tys. zł; sumy w wierszu mogą się różnić o 1 tys. zł przez zaokrąglenia banku.',
      'Byli członkowie zarządu dostali w 2025 r. odroczone raty premii za lata 2020–2024 — bank wypłaca część premii z opóźnieniem, także w akcjach fantomowych.',
    ],
  },
  {
    spolka: 'Powszechny Zakład Ubezpieczeń S.A.',
    skrot: 'PZU',
    rok: 2025,
    raport: 'https://www.pzu.pl/_fileserver/item/1570806',
    sha256: '37b37fff2b398899e7e8f834b0bb24d780f8f69eb39e76e098ffdb39c3069a90',
    gdzie: 'tabela nr 2.1, s. 17',
    dokladnosc: 10,
    osoby: [
      { osoba: 'Artur Olech', funkcja: 'Prezes Zarządu', okres: '12.04.2024–27.01.2025', stale: tys(101.48), zmienne: tys(603.54), inne: tys(21.52 + 699.08), razem: tys(1425.62), uwaga: 'W innych 699,08 tys. zł świadczeń związanych z pełnioną funkcją (np. odprawa, odszkodowanie za zakaz konkurencji).' },
      {
        osoba: 'Andrzej Klesyk', funkcja: 'Prezes Zarządu', okres: '27.01.2025–07.08.2025', stale: tys(828.89), zmienne: 0, inne: tys(65.24 + 483.98), razem: tys(1378.11),
        uwaga: 'Do 02.03.2025 członek rady nadzorczej delegowany do czasowego wykonywania czynności prezesa, potem prezes. W innych 483,98 tys. zł świadczeń związanych z pełnioną funkcją.',
      },
      { osoba: 'Bogdan Benczak', funkcja: 'Prezes Zarządu', okres: 'od 25.09.2025', stale: tys(410.34), zmienne: 0, inne: tys(10.02 + 28.27), razem: tys(448.63) },
      { osoba: 'Maciej Fedyna', funkcja: 'Członek Zarządu', okres: 'od 16.12.2024', stale: tys(1476.17), zmienne: tys(34.88), inne: tys(10.30 + 144.52), razem: tys(1665.87) },
      { osoba: 'Bartosz Grześkowiak', funkcja: 'Członek Zarządu', okres: 'od 12.04.2024', stale: tys(1476.17), zmienne: tys(583.43), inne: tys(0.48 + 204.83), razem: tys(2264.91) },
      { osoba: 'Elżbieta Häuser-Schöneich', funkcja: 'Członek Zarządu', okres: 'od 12.04.2024', stale: tys(1476.17), zmienne: tys(583.43), inne: tys(169.49 + 204.83), razem: tys(2433.92) },
      { osoba: 'Tomasz Kulik', funkcja: 'Członek Zarządu', okres: 'od 01.08.2017', stale: tys(1476.17), zmienne: tys(803.96), inne: tys(2.02 + 226.88), razem: tys(2509.03) },
      { osoba: 'Tomasz Tarkowski', funkcja: 'Członek Zarządu', okres: 'od 04.11.2024', stale: tys(1476.17), zmienne: tys(128.40), inne: tys(2.02 + 159.32), razem: tys(1765.91), uwaga: 'Od 07.08.2025 do powołania nowego prezesa czasowo wykonywał obowiązki prezesa.' },
      { osoba: 'Jan Zimowicz', funkcja: 'Członek Zarządu', okres: 'od 12.04.2024', stale: tys(1476.17), zmienne: tys(583.43), inne: tys(24.67 + 205.19), razem: tys(2289.46) },
    ],
    pracownik: { kwota: 12900, okres: 'miesiac', gdzie: 'rozdział 6, s. 26 (12,90 tys. zł, w przeliczeniu na pełny etat)' },
    uwagi: ['Kwoty w raporcie w tys. zł z dwoma miejscami po przecinku, czyli z dokładnością do 10 zł.', 'Inne: szkolenia, pozostałe świadczenia (np. najem mieszkania, opieka medyczna) i świadczenia związane z pełnioną funkcją.'],
  },
  {
    spolka: 'KGHM Polska Miedź S.A.',
    skrot: 'KGHM',
    rok: 2025,
    raport: 'https://kghm.com/sites/default/files/2026-05/Sprawozdanie%20o%20wynagrodzeniach%20Zarz%C4%85du%20i%20Rady%20Nadzorczej%20za%202025%20rok.pdf',
    sha256: '6cfde2c4dbfc7109a0af85f61bb0386162427bb794d4521f192b1a6c1fb5fe00',
    gdzie: 'tabela nr 3, s. 10',
    dokladnosc: 1,
    osoby: [
      { osoba: 'Andrzej Szydło', funkcja: 'Prezes Zarządu', okres: '01.01–31.12.2025', stale: 1482367, zmienne: 1149606, inne: 534, razem: 2632507, uwaga: 'Od 09.04 do 02.06.2025 także p.o. wiceprezesa ds. aktywów zagranicznych.' },
      { osoba: 'Zbigniew Bryja', funkcja: 'Wiceprezes Zarządu ds. Rozwoju', okres: '01.01–31.12.2025', stale: 1383543, zmienne: 1163818, inne: 534, razem: 2547895 },
      { osoba: 'Piotr Krzyżewski', funkcja: 'Wiceprezes Zarządu ds. Finansowych', okres: '01.01–31.12.2025', stale: 1432955, zmienne: 1111286, inne: 42947, razem: 2587188 },
      { osoba: 'Mirosław Laskowski', funkcja: 'Wiceprezes Zarządu ds. Produkcji', okres: '01.01–31.12.2025', stale: 1432955, zmienne: 1111286, inne: 58283, razem: 2602524 },
      { osoba: 'Piotr Stryczek', funkcja: 'Wiceprezes Zarządu ds. Korporacyjnych', okres: '01.01–31.12.2025', stale: 1482367, zmienne: 1149606, inne: 60534, razem: 2692507 },
      { osoba: 'Anna Sobieraj-Kozakiewicz', funkcja: 'Wiceprezes Zarządu ds. Aktywów Zagranicznych', okres: '02.06–31.12.2025', stale: 781134, zmienne: 0, inne: 27276, razem: 808410 },
      { osoba: 'Iga Dorota Lis', funkcja: 'Wiceprezes Zarządu ds. Aktywów Zagranicznych', okres: '01.01–09.04.2025', stale: 394957, zmienne: 434986, inne: 359052 + 11081, razem: 1200076, uwaga: 'W innych 359 052 zł odpraw i odszkodowania za zakaz konkurencji.' },
    ],
    razemWRaporcie: { stale: 8390278, zmienne: 6120588, inne: 359052 + 201189, razem: 15071107 },
    pracownik: { kwota: 19119, okres: 'miesiac', gdzie: 'tabela nr 11, s. 24', uwaga: 'Raport nazywa to „średnią płacą” i nie podaje okresu; wartość odpowiada miesiącowi.' },
    uwagi: ['Zmienne to premia za 2024 r. wypłacona w 2025 r.'],
  },
  {
    spolka: 'TAURON Polska Energia S.A.',
    skrot: 'Tauron',
    rok: 2025,
    raport: 'https://www.tauron.pl/-/media/offer-documents/tauron/walne-zgromadzenie/2026/2/sprawozdanieowynagrodzeniachzarzaduiradynazdzorczejtauronza2025r.ashx',
    sha256: '148fa286b2b4b6c5be31a2fe22c0b12c0717fe0318ce9ca1488415b0af5ebadf',
    gdzie: 'tabela 3, s. 9 (skan)',
    dokladnosc: 0.01,
    osoby: [
      { osoba: 'Grzegorz Lot', funkcja: 'Prezes Zarządu', okres: '01.01–31.12.2025', stale: 792680.40, zmienne: 649557.55, inne: 69223.60, razem: 1511461.55 },
      { osoba: 'Michał Orłowski', funkcja: 'Wiceprezes Zarządu', okres: '01.01–31.12.2025', stale: 739835.04, zmienne: 606253.71, inne: 58350.08, razem: 1404438.83 },
      { osoba: 'Krzysztof Surma', funkcja: 'Wiceprezes Zarządu', okres: '01.01–31.12.2025', stale: 739835.04, zmienne: 717639.99 + 741890.13, inne: 119680.07, razem: 2319045.23, uwaga: 'Zmienne: premia za 2023 r. (717 639,99 zł) i za 2024 r. (741 890,13 zł), obie wypłacone w 2025 r.' },
      {
        osoba: 'Piotr Gołębiowski', funkcja: 'Wiceprezes Zarządu', okres: '01.01–17.12.2025', stale: 711991.79, zmienne: 606253.71, inne: 69018.53, razem: 1387264.03,
        uwaga: 'Po odwołaniu wypłacono mu odprawę 184 958,76 zł i ekwiwalent za urlop 22 606,07 zł — spółka nie wliczyła ich do tabeli, więc nie ma ich tu. W 2026 r. dostał 184 958,76 zł odszkodowania za zakaz konkurencji.',
      },
    ],
    razemWRaporcie: { stale: 2984342.27, zmienne: 717639.99 + 2603955.10, inne: 316272.28, razem: 6622209.64 },
    pracownik: { kwota: 18515, okres: 'miesiac', gdzie: 'tabela 10, s. 19' },
    uwagi: ['Raport jest skanem bez warstwy tekstowej — liczby przepisane z obrazu i sprawdzone rachunkiem (wiersze i suma).'],
  },
  {
    spolka: 'ENEA S.A.',
    skrot: 'Enea',
    rok: 2025,
    raport: 'https://i.gremicdn.pl/file/a5575e34df21f1e1c8a824696ec1a0cd/20260430-122630-1075501579-zalacznik-nr-4-sprawozdanie-o-wynagrodzeniach.pdf',
    sha256: '4c1deceb1ebba77ec99c897c9016005164241294fe9a7fb81e543a4a6408b301',
    gdzie: 'tabele nr 3 i 4, s. 7–8 (skan, kopia załącznika do raportu bieżącego 15/2026)',
    dokladnosc: 1,
    osoby: [
      { osoba: 'Grzegorz Kinelski', funkcja: 'Prezes Zarządu', okres: '01.01–31.12.2025', stale: 792000, zmienne: 633600, inne: 4002, razem: 1429602 },
      { osoba: 'Bartosz Krysta', funkcja: 'Członek Zarządu ds. Handlowych', okres: '01.01–31.12.2025', stale: 720000, zmienne: 576000, inne: 71177, razem: 1367177 },
      { osoba: 'Marek Lelątko', funkcja: 'Członek Zarządu ds. Finansowych', okres: '01.01–31.12.2025', stale: 720000, zmienne: 576000, inne: 63619, razem: 1359619 },
      { osoba: 'Dalida Gepfert', funkcja: 'Członek Zarządu ds. Korporacyjnych', okres: '01.01–31.12.2025', stale: 720000, zmienne: 460800, inne: 4500, razem: 1185300 },
    ],
    razemWRaporcie: { stale: 2952000, zmienne: 2246400, inne: 8502 + 134796 },
    pracownik: { kwota: 17939.64, okres: 'miesiac', gdzie: 'tabela nr 9, s. 14' },
    uwagi: [
      'Spółka nie wlicza szkoleń (netto) i zakwaterowania (brutto) z tabeli nr 4 do „wynagrodzenia całkowitego”; my podajemy je w innych.',
      'Raport jest skanem bez warstwy tekstowej — liczby przepisane z obrazu i sprawdzone rachunkiem (wiersze i suma).',
    ],
  },
  {
    spolka: 'Jastrzębska Spółka Węglowa S.A.',
    skrot: 'JSW',
    rok: 2025,
    raport: 'https://www.jsw.pl/fileadmin/user_files_ri/lad-korporacyjny/walne-zgromadzenie/pl/2026-06-08/14_sprawozdanie_o_wynagrodzeniach.pdf',
    sha256: '6b3127bccb23b8577432e562fb20ff8dece25f77198130604be0ee9716712d62',
    gdzie: 'tabela 17 i tekst pod nią, s. 20–21; tabela 19, s. 23',
    dokladnosc: 0.01,
    osoby: [
      { osoba: 'Ryszard Janta', funkcja: 'Prezes Zarządu', okres: '01.01–03.10.2025', stale: 600600.00, zmienne: 130874.11, inne: 264000.00, razem: 995474.11 },
      { osoba: 'Jolanta Gruszka', funkcja: 'Zastępca Prezesa Zarządu ds. Handlu', okres: '01.01–31.12.2025', stale: 633600.00, zmienne: 124683.38, inne: 0, razem: 758283.38 },
      { osoba: 'Jarosław Kluczniok', funkcja: 'Zastępca Prezesa Zarządu ds. Rozwoju', okres: '01.01–07.03.2025', stale: 117920.00, zmienne: 102527.10, inne: 161844.25, razem: 382291.35 },
      { osoba: 'Remigiusz Krzyżanowski', funkcja: 'Zastępca Prezesa Zarządu ds. Ekonomicznych', okres: '01.01–01.09.2025', stale: 424160.00, zmienne: 102527.10, inne: 237600.00, razem: 764287.10 },
      { osoba: 'Adam Rozmus', funkcja: 'Zastępca Prezesa Zarządu ds. Technicznych i Operacyjnych', okres: '01.01–31.12.2025', stale: 633600.00, zmienne: 124683.38, inne: 8725.00, razem: 767008.38 },
      { osoba: 'Artur Wojtków', funkcja: 'Zastępca Prezesa Zarządu ds. Pracy i Polityki Społecznej', okres: '01.01–31.12.2025', stale: 626560.00, zmienne: 385555.33, inne: 0, razem: 1012115.33, uwaga: 'Zmienne to premia za 2023 r. wypłacona 15.01.2025. Premię za 2024 r. (157 173,96 zł) wypłacono 15.01.2026.' },
      {
        osoba: 'Bogusław Oleksy', funkcja: 'Zastępca Prezesa Zarządu ds. Ekonomicznych, od 03.10.2025 pełniący obowiązki prezesa', okres: '01.10–31.12.2025', stale: 197148.39, zmienne: 0, inne: 0, razem: 197148.39,
        uwaga: 'Wcześniej, 01–30.09.2025, członek rady nadzorczej delegowany do czasowego wykonywania czynności prezesa: 52 800 zł (tabela 19), tu niewliczone.',
      },
    ],
    razemWRaporcie: { stale: 3233588.39, inne: 672169.25 },
    pracownik: { kwota: 14593.58, okres: 'miesiac', gdzie: 'tabela 21, s. 31', uwaga: 'Bez nagród zaksięgowanych za 2025 r., ale niewypłaconych; z nimi 16 811,22 zł.' },
    uwagi: [
      'JSW podaje w tabeli szacunek premii za 2025 r., której jeszcze nie wypłaciła. My podajemy premie wypłacone w 2025 r., które ten sam raport wymienia pod tabelą — tak jak u pozostałych spółek. Dlatego nasze sumy różnią się od kolumny „Łączne wynagrodzenie” w raporcie.',
      'Inne: odprawy, odszkodowania za zakaz konkurencji, mieszkanie, studia podyplomowe.',
    ],
  },
  {
    spolka: 'Giełda Papierów Wartościowych w Warszawie S.A.',
    skrot: 'GPW',
    rok: 2025,
    raport: 'https://money2.wpcdn.pl/gielda/gpw/espi/65/7290463343498305_6.pdf',
    sha256: '6208c451e6a3ae93ad1ace8a92b8a084d154cf30db6e88518c62abbc4bf0dc7d',
    gdzie: 'tabela nr 1a, s. 4 (kopia załącznika do raportu bieżącego o zwołaniu walnego zgromadzenia)',
    dokladnosc: 0.1,
    osoby: [
      { osoba: 'Tomasz Bardziłowski', funkcja: 'Prezes Zarządu', okres: 'cały 2025 r.', stale: 784739.15, zmienne: 557196.56, inne: 9654.85 + 94611.37 + 3609.6 + 3868.8 + 995.0, razem: 1454675.33 },
      { osoba: 'Sławomir Panasiuk', funkcja: 'Wiceprezes Zarządu', okres: 'cały 2025 r.', stale: 784687.44, zmienne: 428772.07, inne: 9706.56 + 85621.65 + 3609.6 + 1771.2 + 334.0, razem: 1314502.52 },
      { osoba: 'Michał Kobza', funkcja: 'Członek Zarządu', okres: 'cały 2025 r.', stale: 767758.46, zmienne: 224742.86, inne: 7400.65 + 69993.12 + 3609.6 + 3868.8 + 529.0, razem: 1077902.49 },
      { osoba: 'Marcin Rulnicki', funkcja: 'Członek Zarządu', okres: 'cały 2025 r.', stale: 761628.95, zmienne: 238789.29, inne: 4696.35 + 70358.0 + 308.0 + 549.6, razem: 1076330.19 },
      { osoba: 'Dominika Niewiadomska-Siniecka', funkcja: 'Członek Zarządu', okres: '8 miesięcy 2025 r.', stale: 527002.74, zmienne: 0, inne: 3018.09 + 26434.62 + 2141.6 + 2392.8, razem: 560989.85 },
      { osoba: 'Monika Gorgoń', funkcja: 'Członek Zarządu', okres: 'do 17.04.2025', stale: 234612.32, zmienne: 722387.76, inne: 596282.31 + 1692.15 + 67108.45 + 1174.4 + 1180.8 + 90.0, razem: 1624528.19, uwaga: 'W innych 596 282,31 zł świadczeń po okresie zatrudnienia.' },
      { osoba: 'Izabela Olszewska', funkcja: 'była członkini zarządu', okres: 'przed 2025 r.', stale: 0, zmienne: 481591.84, inne: 180596.94 + 33711.43, razem: 695900.21, byly: true, uwaga: 'Premia za 2024 r. i 180 596,94 zł świadczeń po okresie zatrudnienia.' },
      { osoba: 'Adam Młodkowski', funkcja: 'były członek zarządu', okres: 'przed 2025 r.', stale: 0, zmienne: 0, inne: 120397.96, razem: 120397.96, byly: true, uwaga: 'Świadczenia po okresie zatrudnienia.' },
      { osoba: 'Piotr Borowski', funkcja: 'były członek zarządu', okres: 'przed 2025 r.', stale: 0, zmienne: -41887.67, inne: -2932.14, razem: -44819.81, byly: true, uwaga: 'Kwota ujemna: zwrot premii za 2022 r. i wpłaty PPE.' },
    ],
    razemWRaporcie: { stale: 3860429.06, zmienne: -41887.67 + 2653480.38, inne: 897277.21 + 36168.65 + 444906.5 + 14452.8 + 13632.0 + 1948.0, razem: 7880406.9 },
    pracownik: { kwota: 21795.06, okres: 'miesiac', gdzie: 'tabela nr 6, s. 10' },
    uwagi: ['Inne: samochód służbowy, PPE, opieka medyczna, ubezpieczenie i świadczenia po okresie zatrudnienia.'],
  },
];

/**
 * Spolki z bezposrednim udzialem Skarbu Panstwa, ktorych raportu jeszcze nie
 * przepisalismy — z powodem. Lista na stronie, zeby brak nie wygladal na
 * komplet (wzorzec 4: lista, ktora urywa sie po cichu, wyglada na pelna).
 */
export const BRAKUJACE_2025: { spolka: string; powod: string }[] = [
  { spolka: 'PGE Polska Grupa Energetyczna S.A.', powod: 'ich strony odrzucają zapytania spoza przeglądarki, a kopii raportów w komunikatach giełdowych nie znaleźliśmy — dopiszemy' },
  { spolka: 'Grupa Azoty S.A.', powod: 'ich strony odrzucają zapytania spoza przeglądarki, a kopii raportów w komunikatach giełdowych nie znaleźliśmy — dopiszemy' },
];

/** Wynagrodzenie (stale + zmienne) — liczba porownywalna miedzy spolkami. */
export const wynagrodzenie = (o: CzlonekZarzadu): number => o.stale + o.zmienne;

/** Przecietna pensja pracownika w skali roku. */
export const pensjaRoczna = (r: RaportWynagrodzen): number =>
  r.pracownik.okres === 'rok' ? r.pracownik.kwota : r.pracownik.kwota * 12;
