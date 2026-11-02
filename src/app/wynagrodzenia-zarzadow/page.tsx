import type { Metadata } from 'next';
import { Dzial, Okruszek, Podstawa, Uwaga, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import { zlote, zOdmiana } from '@/lib/format';
import {
  BRAKUJACE_2025, RAPORTY_2025, pensjaRoczna, wynagrodzenie,
  type CzlonekZarzadu, type RaportWynagrodzen,
} from '@/lib/wynagrodzenia-zarzadow';

export const metadata: Metadata = {
  title: 'Wynagrodzenia zarządów spółek Skarbu Państwa w 2025 r.',
  description: 'Imiennie: ile zarobili w 2025 r. członkowie zarządów giełdowych spółek z udziałem Skarbu Państwa — Orlen, PKO BP, PZU, KGHM, Tauron, Enea, JSW, GPW. Z raportów spółek, z odnośnikiem do każdego.',
};

// Dz.U. 2005 nr 184 poz. 1539 — adres sprawdzony w API ELI Sejmu (WDU20051841539).
const ZRODLO_USTAWY = 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20051841539';

/** Przecietna pensja: z groszami, gdy raport je podaje (Enea, JSW, GPW). */
const pensjaZRaportu = (v: number): string =>
  `${v.toLocaleString('pl-PL', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })} zł`;

/** Kwota tak dokladna, jak w raporcie: PKO BP i PZU podaja tysiace zlotych. */
function kwota(r: RaportWynagrodzen, v: number): string {
  if (r.dokladnosc >= 10) {
    const miejsc = r.dokladnosc >= 1000 ? 0 : 2;
    return `${(v / 1000).toLocaleString('pl-PL', { minimumFractionDigits: miejsc, maximumFractionDigits: miejsc })} tys. zł`;
  }
  return `${Math.round(v).toLocaleString('pl-PL')} zł`;
}

const kotwica = (r: RaportWynagrodzen) => r.skrot.toLowerCase().replace(/[^a-z]+/g, '-');

// Alfabetycznie: kolejnosc spolek nie jest oceną ani rankingiem (zasada 6).
const RAPORTY = [...RAPORTY_2025].sort((a, b) => a.skrot.localeCompare(b.skrot, 'pl'));

export default function StronaWynagrodzenZarzadow() {
  const dzialy = [
    ...RAPORTY.map((r) => ({ id: kotwica(r), nazwa: r.skrot })),
    { id: 'jak', nazwa: 'Skąd te liczby' },
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 1;
  const osob = RAPORTY.reduce((a, r) => a + r.osoby.filter((o) => !o.byly).length, 0);
  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { nazwa: 'Wynagrodzenia zarządów' }]} />
        <Wypis
          tytul="Wynagrodzenia zarządów spółek Skarbu Państwa"
          podtytul={`2025 r., imiennie: ${zOdmiana(osob, 'osoba', 'osoby', 'osób')} w zarządach ${RAPORTY.length} z ${RAPORTY.length + BRAKUJACE_2025.length} giełdowych spółek, w których Skarb Państwa ma akcje bezpośrednio.`}
        >
          <p className="mt-2 max-w-(--miara)">
            Spółka giełdowa musi co roku opublikować imienny raport o wynagrodzeniach zarządu
            i rady nadzorczej — tak każe art. 90g ustawy o ofercie publicznej. Przepisaliśmy z tych
            raportów tabele zarządów. Przy każdej spółce jest odnośnik do raportu i numer tabeli,
            z której pochodzą liczby.
          </p>
          <p className="mt-1"><Podstawa adres={ZRODLO_USTAWY} nazwa="ustawa o ofercie publicznej, art. 90g" /></p>
        </Wypis>
        {BRAKUJACE_2025.length ? (
          <Uwaga naglowek={`Jeszcze ${zOdmiana(BRAKUJACE_2025.length, 'spółka', 'spółki', 'spółek')}.`}>
            {/* Ten sam powod dla kilku spolek piszemy raz. */}
            {[...Map.groupBy(BRAKUJACE_2025, (b) => b.powod)]
              .map(([powod, spolki]) => `${spolki.map((s) => s.spolka).join(' i ')}: ${powod}.`).join(' ')}
          </Uwaga>
        ) : null}
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          {RAPORTY.map((r) => <Spolka key={r.skrot} r={r} nr={nr(kotwica(r))} />)}

          <Dzial id="jak" nr={nr('jak')} tytul="Skąd te liczby i co znaczą">
            <ul className="mt-4 max-w-(--miara) list-disc space-y-2 pl-5">
              <li>
                <b>Wynagrodzenie</b> to wynagrodzenie stałe i premie wypłacone w 2025 r. — zwykle za cele
                z 2024 r. Tak liczą raporty wszystkich spółek oprócz JSW, która podaje szacunek premii za
                2025 r.; przy JSW bierzemy premie wypłacone w 2025 r., wymienione w tym samym raporcie.
              </li>
              <li>
                <b>Inne</b> to świadczenia (opieka medyczna, mieszkanie, samochód, plany emerytalne,
                szkolenia), odprawy i odszkodowania za zakaz konkurencji. Spółki liczą je różnie, dlatego
                stoją osobno i nie wchodzą do kolumny „wynagrodzenie”.
              </li>
              <li>
                Przy każdej spółce podajemy <b>przeciętne wynagrodzenie jej pracowników</b> (bez zarządu
                i rady) — z tego samego raportu, bo ustawa każe spółce to porównanie pokazać.
              </li>
              <li>
                Bierzemy spółki, w których Skarb Państwa ma akcje <b>bezpośrednio</b>. Spółek, które
                kontroluje przez inne spółki (np. Pekao, Alior, Energa), tu nie ma. Nie przepisujemy też
                wynagrodzeń rad nadzorczych — są w tych samych raportach.
              </li>
              <li>
                Liczby przepisaliśmy ręcznie i sprawdziliśmy dwa razy: każdy wiersz i każda kolumna muszą
                dać sumę, którą podaje raport, a każdą liczbę odszukaliśmy w tekście raportu — w skanach
                (Enea, Tauron) w odczycie maszynowym. Plik, z którego przepisywaliśmy, opisuje suma
                kontrolna SHA-256 przy każdej spółce: adres może się zmienić, plik nie.
              </li>
            </ul>
          </Dzial>
        </div>
      </div>
    </>
  );
}

function Spolka({ r, nr }: { r: RaportWynagrodzen; nr: number }) {
  const zarzad = r.osoby.filter((o) => !o.byly);
  const byli = r.osoby.filter((o) => o.byly);
  const suma = zarzad.reduce((a, o) => a + wynagrodzenie(o), 0);
  const pensja = pensjaRoczna(r);
  return (
    <Dzial
      id={kotwica(r)}
      nr={nr}
      tytul={`${r.skrot}: ${zOdmiana(zarzad.length, 'osoba', 'osoby', 'osób')} w zarządzie, ${zlote(suma)} wynagrodzeń w ${r.rok} r.`}
      obok={<Podstawa adres={r.raport} nazwa={`raport ${r.skrot} za ${r.rok} r.`} data={r.gdzie} />}
      metoda={
        <ul>
          {r.uwagi.map((u) => <li key={u}>{u}</li>)}
          <li>{`Plik raportu: SHA-256 ${r.sha256}.`}</li>
        </ul>
      }
    >
      <p className="wstep">
        {`${r.spolka.replace(/\.?$/, '.')} Przeciętny pracownik spółki: ${pensjaZRaportu(r.pracownik.kwota)} ${r.pracownik.okres === 'miesiac' ? `miesięcznie, czyli ${zlote(pensja)} rocznie` : 'rocznie'}`}
        {` (${r.pracownik.gdzie}).`}
        {r.pracownik.uwaga ? ` ${r.pracownik.uwaga}` : ''}
      </p>
      <TabelaZarzadu r={r} osoby={zarzad} />
      {byli.length ? (
        <>
          <h3>{`Byli członkowie zarządu, którym spółka wypłaciła coś w ${r.rok} r.`}</h3>
          <TabelaZarzadu r={r} osoby={byli} />
        </>
      ) : null}
    </Dzial>
  );
}

function TabelaZarzadu({ r, osoby }: { r: RaportWynagrodzen; osoby: CzlonekZarzadu[] }) {
  return (
    <table className="tabela liczby">
      <thead>
        <tr>
          <th>Osoba</th>
          <th className="l">Wynagrodzenie</th>
          <th className="l">w tym premie</th>
          <th className="l">Inne</th>
          <th className="l">Razem</th>
        </tr>
      </thead>
      <tbody>
        {osoby.map((o) => (
          <tr key={o.osoba}>
            <td>
              <b>{o.osoba}</b>
              <span className="block text-sm text-atrament-2">{`${o.funkcja} · ${o.okres}`}</span>
              {o.uwaga ? <span className="block text-sm text-atrament-2">{o.uwaga}</span> : null}
            </td>
            <td className="l" data-etykieta="wynagrodzenie">{kwota(r, wynagrodzenie(o))}</td>
            <td className="l" data-etykieta="w tym premie">{kwota(r, o.zmienne)}</td>
            <td className="l" data-etykieta="inne">{kwota(r, o.inne)}</td>
            <td className="l" data-etykieta="razem">{kwota(r, o.razem)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
