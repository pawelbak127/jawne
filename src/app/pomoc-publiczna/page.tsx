import type { Metadata } from 'next';
import Link from 'next/link';
import { bazaDostepna, DNI_DO_USTALENIA, przegladPomocy, zrodloImportu } from '@/lib/dane';
import { KONTAKT } from '@/lib/adres';
import { dataKrotko, dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { nazwaDoPokazania } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { Dzial, ListaPaskow, Okruszek, Podstawa, Wiecej, Wiersz, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import type { PrzegladPomocy } from '@/lib/przeglad';

export const metadata: Metadata = {
  title: 'Pomoc publiczna w Polsce — kto rozdaje publiczne pieniądze',
  description: 'Pomoc publiczna i de minimis dla firm w całej Polsce: kto jej udziela, na co, jakim firmom i w których województwach — według rejestru SUDOP prowadzonego przez UOKiK.',
};

// Kategorie wielkosci ze zrodla. "3" to w oryginale "przedsiebiorstwo
// nienalezace do kategorii okreslonych kodem od 0 do 2" — czyli duze.
const WIELKOSC: Record<string, string> = {
  '0': 'mikroprzedsiębiorstwa',
  '1': 'małe',
  '2': 'średnie',
  '3': 'duże',
};

const NA_WIERZCHU = 5;
const proc = (x: number) => `${Math.round(100 * x)}%`;
/** Udzial z jednym miejscem po przecinku, gdy jest maly — „0%” przy 1 314 przypadkach kłamie. */
const procDokladny = (x: number) => (x < 0.1 ? `${(100 * x).toFixed(1).replace('.', ',')}%` : proc(x));

export default function StronaPomocy() {
  if (!bazaDostepna()) return <BrakDanych />;
  const p = przegladPomocy();
  const imp = zrodloImportu('sudop-przyrost');

  if (!p) {
    return (
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Pomoc publiczna' }]} />
        <Wypis tytul="Pomoc publiczna dla firm" podtytul="Nie pobraliśmy jeszcze żadnego dnia dla całego kraju." />
      </div>
    );
  }

  const progAktywny = Boolean(KONTAKT);
  const pobrano = imp?.kiedy ?? null;
  const podstawa = <Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" data={pobrano ? dataKrotko(pobrano) : null} />;

  // Ludnosc kraju = suma 16 wojewodztw z GUS. Gdy ktoregos brakuje,
  // kwoty na mieszkanca nie liczymy — mianownik bylby za maly (zasada 3).
  const ludnosc = p.wojewodztwa.length >= 16 && p.wojewodztwa.every((w) => w.osob)
    ? p.wojewodztwa.reduce((a, w) => a + (w.osob ?? 0), 0)
    : null;
  const naOsobe = p.brutto !== null && ludnosc ? p.brutto / ludnosc : null;

  const sumaWielkosc = p.wielkosc.reduce((a, w) => a + (w.brutto ?? 0), 0);
  const przypadkowWielkosc = p.wielkosc.reduce((a, w) => a + w.przypadkow, 0);
  const duze = p.wielkosc.find((w) => w.kod === '3');
  const zdanieDuzych = duze && sumaWielkosc > 0 && przypadkowWielkosc > 0
    ? `${proc((duze.brutto ?? 0) / sumaWielkosc)} tej kwoty trafiło do dużych firm, które mają ${procDokladny(duze.przypadkow / przypadkowWielkosc)} przypadków.`
    : null;

  const woj = [...p.wojewodztwa]
    .map((w) => ({ ...w, naOsobe: w.brutto !== null && w.osob ? w.brutto / w.osob : null }))
    .sort((a, b) => (b.naOsobe ?? -1) - (a.naOsobe ?? -1));
  const wojZWartoscia = woj.filter((w) => w.naOsobe !== null);
  const pierwszyWoj = wojZWartoscia[0];
  const ostatniWoj = wojZWartoscia[wojZWartoscia.length - 1];

  const okres = `w ${zOdmiana(p.dni, 'dniu', 'dniach', 'dniach')} od ${dataKrotko(p.od)} do ${dataKrotko(p.do)}`;

  const dzialy = [
    { id: 'kto', nazwa: 'Kto udzielił' },
    { id: 'na-co', nazwa: 'Na co' },
    { id: 'jakie', nazwa: 'Jakie firmy' },
    { id: 'woj', nazwa: 'Województwa' },
    { id: 'formy', nazwa: 'Formy pomocy' },
    { id: 'najwieksze', nazwa: 'Największe przypadki' },
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Pomoc publiczna' }]} />
        <Wypis
          tytul="Pomoc publiczna dla firm"
          podtytul="Dotacje, ulgi, preferencyjne pożyczki i pomoc de minimis udzielone przedsiębiorcom w całej Polsce — według rejestru, który prowadzi UOKiK."
        />

        {/*
          Zakres jest waski i to musi byc widac od razu: pobieramy rejestr dzien
          po dniu, wiec suma dotyczy tylko tych dni, a nie roku. Dlatego okres
          stoi w naglowku bloku i przy kazdej liczbie, a nie w przypisie.
        */}
        <WLiczbach tytul={`W ${zOdmiana(p.dni, 'pobranym dniu', 'pobranych dniach', 'pobranych dniach')}`} stopka={<WarunkiSudop pobrano={pobrano} />}>
          <Wiersz
            duzy
            co={naOsobe !== null ? 'Wartość pomocy brutto na mieszkańca' : 'Wartość pomocy brutto'}
            ile={naOsobe !== null ? zlote(naOsobe) : zlote(p.brutto)}
            zCzego={<b>{`${zlote(p.brutto)}${ludnosc ? ` ÷ ${liczba(ludnosc)} mieszkańców (GUS)` : ''} · ${okres} — nie w całym roku`}</b>}
            porownanie={zdanieDuzych}
            podstawa={podstawa}
          />
          <Wiersz
            co="Przypadki pomocy"
            ile={liczba(p.przypadkow)}
            zCzego={`w tych samych dniach${p.brutto !== null && p.przypadkow ? ` · średnio ${zlote(p.brutto / p.przypadkow)} na przypadek` : ''}`}
            podstawa={podstawa}
          />
          <Wiersz
            co="Beneficjenci"
            ile={liczba(p.beneficjentow)}
            zCzego={`z siedzibą w ${zOdmiana(p.gmin, 'gminie', 'gminach', 'gminach')}`}
            podstawa={podstawa}
          />
        </WLiczbach>

        {/*
          Liczby na tej stronie sa policzone RAZ, przy imporcie — osiem
          przebiegow po calej tabeli nie zmiescilo by sie w czasie budowy
          (src/lib/przeglad.ts). Skoro pokazujemy wynik sprzed chwili, a nie
          z tej sekundy, to trzeba napisac, z ktorej chwili.
        */}
        <p className="stan-danych">
          <span>{`stan danych: ${zOdmiana(p.dni, 'dzień', 'dni', 'dni')} (${dataKrotko(p.od)}–${dataKrotko(p.do)}) z 10 lat rejestru`}</span>
          {p.policzono ? <span>{`zestawienie z ${dataKrotko(p.policzono)}${p.nieaktualny ? ' — od tego czasu doszły nowe dni, wejdą po najbliższym imporcie' : ''}`}</span> : null}
          {p.swiezych ? <span>{`pominięto ${zOdmiana(p.swiezych, 'świeży dzień', 'świeże dni', 'świeżych dni')} (dzień wliczamy ${DNI_DO_USTALENIA} dni po dacie)`}</span> : null}
        </p>

        <form role="search" action="/szukaj" className="mt-6 max-w-xl">
          <label htmlFor="szukaj-firmy" className="mb-1.5 block font-semibold">Sprawdź firmę</label>
          <input className="pole w-full" id="szukaj-firmy" name="q" type="search" placeholder="Nazwa firmy albo NIP" />
        </form>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          <ZestawienieDzialu
            id="kto"
            nr={nr('kto')}
            naglowek="Kto udzielił"
            wiersze={p.udzielajacy}
            suma={p.brutto}
            // Udzielajacym bywa osoba fizyczna (pulapka 34) — ten sam filtr nazw.
            ukrywajOsoby
            napisWiecej="organów"
          />
          <ZestawienieDzialu id="na-co" nr={nr('na-co')} naglowek="Na co" wiersze={p.przeznaczenia} suma={p.brutto} napisWiecej="przeznaczeń" />

          <Dzial
            id="jakie"
            nr={nr('jakie')}
            tytul={duze && sumaWielkosc > 0 && przypadkowWielkosc > 0
              ? `Jakie firmy: ${proc((duze.brutto ?? 0) / sumaWielkosc)} pomocy dla dużych, które mają ${procDokladny(duze.przypadkow / przypadkowWielkosc)} przypadków`
              : 'Jakie firmy dostają pomoc'}
          >
            {/*
              ZMIERZONE 22.09.2026 na telefonie: trzy kolumny o stalej szerokosci
              nie miescily sie na 390 px. Tabela szablonu na waskim ekranie zamienia
              wiersz w blok: nazwa na cala linie, liczby nizej.
            */}
            <table className="tabela liczby">
              <thead>
                <tr><th>Wielkość</th><th className="l">Przypadki</th><th className="l">Brutto</th><th className="l">Udział</th></tr>
              </thead>
              <tbody>
                {p.wielkosc.filter((w) => w.kod && WIELKOSC[w.kod]).map((w) => (
                  <tr key={w.kod}>
                    <td>{WIELKOSC[w.kod!]}</td>
                    <td className="l" data-etykieta="przypadki">{liczba(w.przypadkow)}</td>
                    <td className="l" data-etykieta="brutto">{zlote(w.brutto)}</td>
                    <td className="l">{sumaWielkosc ? proc((w.brutto ?? 0) / sumaWielkosc) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Dzial>

          <Dzial
            id="woj"
            nr={nr('woj')}
            tytul={pierwszyWoj && ostatniWoj
              ? `Na mieszkańca: od ${zlote(ostatniWoj.naOsobe)} w ${wMiejscowniku(ostatniWoj.wojewodztwo)} do ${zlote(pierwszyWoj.naOsobe)} w ${wMiejscowniku(pierwszyWoj.wojewodztwo)}`
              : 'Na mieszkańca, według województwa'}
            metoda={
              <p>
                Liczy się siedziba beneficjenta, nie miejsce inwestycji: duża firma z siedzibą
                w Warszawie podnosi wynik mazowieckiego, nawet gdy zakład ma gdzie indziej.
                Na mieszkańca to suma pomocy w tych dniach ÷ ludność województwa według GUS.
                <b> Wartość brutto</b> to ekwiwalent dotacji: przy dotacji cała kwota, przy pożyczce
                lub gwarancji tylko korzyść z lepszych warunków.
              </p>
            }
          >
            <ListaPaskow
              tytul={pierwszyWoj ? `Najwięcej na mieszkańca w ${wMiejscowniku(pierwszyWoj.wojewodztwo)}: ${zlote(pierwszyWoj.naOsobe)} — liczy się siedziba firmy` : undefined}
              pozycje={pozycjeWoj(woj.slice(0, NA_WIERZCHU), pierwszyWoj?.naOsobe ?? null)}
            />
            {woj.length > NA_WIERZCHU ? (
              <Wiecej napis={`Pokaż wszystkie ${zOdmiana(woj.length, 'województwo', 'województwa', 'województw')}`}>
                <ListaPaskow pozycje={pozycjeWoj(woj.slice(NA_WIERZCHU), pierwszyWoj?.naOsobe ?? null)} />
              </Wiecej>
            ) : null}
          </Dzial>

          <ZestawienieDzialu id="formy" nr={nr('formy')} naglowek="W jakiej formie" wiersze={p.formy} suma={p.brutto} napisWiecej="form" />

          <Dzial id="najwieksze" nr={nr('najwieksze')} tytul={`Największe pojedyncze przypadki ${okres}`}>
            <ListaNajwiekszych przypadki={p.najwieksze.slice(0, NA_WIERZCHU)} progAktywny={progAktywny} />
            {p.najwieksze.length > NA_WIERZCHU ? (
              <Wiecej napis={`Pokaż ${p.najwieksze.length} największych`}>
                <ListaNajwiekszych przypadki={p.najwieksze.slice(NA_WIERZCHU)} progAktywny={progAktywny} />
              </Wiecej>
            ) : null}
          </Dzial>
        </div>
      </div>
    </>
  );
}

/** „mazowieckie” → „mazowieckim” (w mazowieckim). Wszystkie 16 nazw konczy sie na „-ie”. */
function wMiejscowniku(woj: string): string {
  return woj.replace(/ie$/, 'im');
}

function pozycjeWoj(woj: { wojewodztwo: string; naOsobe: number | null; brutto: number | null }[], max: number | null) {
  return woj.map((w) => ({
    klucz: w.wojewodztwo,
    nazwa: w.wojewodztwo,
    opis: w.naOsobe === null ? '—' : `${zlote(w.naOsobe)} · razem ${zlote(w.brutto)}`,
    udzial: w.naOsobe !== null && max ? w.naOsobe / max : 0,
  }));
}

/**
 * „Nazwa → kwota” jako paski z tytulem-wnioskiem (F11). Dlugosc paska wzgledem
 * najwiekszej pozycji, udzial w calej kwocie obok liczby.
 */
function ZestawienieDzialu({ id, nr, naglowek, wiersze, suma, ukrywajOsoby = false, napisWiecej }: {
  id: string;
  nr: number;
  naglowek: string;
  wiersze: PrzegladPomocy['udzielajacy'];
  suma: number | null;
  ukrywajOsoby?: boolean;
  napisWiecej: string;
}) {
  const nazwa = (n: string) => (ukrywajOsoby ? nazwaDoPokazania(n) : { tekst: n, pominieta: false });
  const max = wiersze[0]?.brutto ?? null;
  const pozycje = wiersze.map((w) => {
    const n = nazwa(w.nazwa);
    return {
      klucz: w.nazwa,
      nazwa: <span className={n.pominieta ? 'italic' : undefined}>{skroc(n.tekst, 110)}</span>,
      opis: `${zlote(w.brutto)}${suma && w.brutto !== null ? ` · ${proc(w.brutto / suma)}` : ''}`,
      udzial: max && w.brutto !== null ? w.brutto / max : 0,
    };
  });
  const pierwszy = wiersze[0];
  const pierwszaNazwa = pierwszy ? nazwa(pierwszy.nazwa) : null;
  return (
    <Dzial
      id={id}
      nr={nr}
      tytul={pierwszy && pierwszaNazwa
        ? `${naglowek}: najwięcej ${pierwszaNazwa.pominieta ? 'podmiot bez nazwy' : skroc(pierwszaNazwa.tekst, 60)} — ${zlote(pierwszy.brutto)}`
        : naglowek}
    >
      <ListaPaskow
        tytul={pierwszy && suma && pierwszy.brutto !== null ? `Pierwsza pozycja to ${proc(pierwszy.brutto / suma)} całej kwoty` : undefined}
        pozycje={pozycje.slice(0, NA_WIERZCHU)}
      />
      {pozycje.length > NA_WIERZCHU ? (
        <Wiecej napis={`Pokaż ${pozycje.length} największych ${napisWiecej}`}>
          <ListaPaskow pozycje={pozycje.slice(NA_WIERZCHU)} />
        </Wiecej>
      ) : null}
    </Dzial>
  );
}

function ListaNajwiekszych({ przypadki, progAktywny }: { przypadki: PrzegladPomocy['najwieksze']; progAktywny: boolean }) {
  return (
    <ul className="pozycje">
      {przypadki.map((n, i) => {
        // Rejestr, nie heurystyka — ta sama regula, co na stronie firmy.
        const nazwa = nazwaDoPokazania(n.nazwa, { pomocEur: n.max_eur, progAktywny, typRegon: n.typ_regon });
        return (
          <li key={`${n.nip}-${n.dzien}-${i}`}>
            <div className="min-w-0">
              {/*
                Link WIDOCZNY, nie tylko po najechaniu. ZGLOSZENIE PAWLA
                04.10.2026: „nie mozna tego dalej rozwinac" — a link byl,
                tylko wygladal jak zwykly tekst.
              */}
              {!nazwa.pominieta && n.nip ? (
                <Link href={`/firma/${n.nip}`} className="tytul-poz">{nazwa.tekst}</Link>
              ) : (
                <p className={`font-semibold ${nazwa.pominieta ? 'italic text-atrament-2' : ''}`}>{nazwa.tekst}</p>
              )}
              <p className="meta">{skroc(n.przeznaczenie ?? '—', 110)}</p>
              <p className="meta">
                {/* Udzielajacy przez ten sam filtr nazw co beneficjent (pulapka 34). */}
                {`${dataSlownie(n.dzien)} · ${skroc(nazwaDoPokazania(n.udzielajacy).tekst, 60)}`}
                {n.gmina ? (
                  <>
                    {' · '}
                    <Link href={`/gmina/${n.teryt}`} className="text-akcent underline underline-offset-4 hover:no-underline">{n.gmina}</Link>
                  </>
                ) : null}
              </p>
            </div>
            <p className="kwota">{zlote(n.brutto)}</p>
          </li>
        );
      })}
    </ul>
  );
}
