import Link from 'next/link';
import {
  bazaDostepna, kluby, liczbaGlosowan, liczbaProcesow, ostatnieGlosowania, ostatnioUchwalone,
  podsumowanie, przegladPomocy, streszczenieUstawy, wojewodztwaGmin, zrodloImportu,
} from '@/lib/dane';
import { dataKrotko, dataSlownie, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { opisGlosowania } from '@/lib/opis-glosowania';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { Dzial, Podstawa, Wiersz, Wiersze } from '@/components/Szablon';

/*
 * Przyklady: dwie miejscowosci i dwa tematy. Celowo bez nazwisk —
 * nazwisko wybrane przez nas na stronie glownej czyta sie jak wyroznienie.
 */
const PRZYKLADY = ['Kraków', 'Zakopane', 'podatek', 'sygnaliści'];

export default function StronaGlowna() {
  if (!bazaDostepna()) return <BrakDanych />;

  const stan = podsumowanie();
  const listaKlubow = kluby();
  const glosowania = ostatnieGlosowania(4, { nadCaloscia: true });
  const glosowanNadCaloscia = liczbaGlosowan({ nadCaloscia: true });
  // Ta sama liczba co na /gminy: Warszawa raz, nie 18 dzielnic (pulapka 24).
  const gminLiczba = wojewodztwaGmin().reduce((a, w) => a + w.gmin, 0);
  const ustawUchwalonych = liczbaProcesow('projekt ustawy', 'uchwalone');
  const uchwalone = ostatnioUchwalone(3);
  const pomoc = przegladPomocy();
  const importPomocy = zrodloImportu('sudop-przyrost');

  // Liczba mandatow z REJESTRU KLUBOW. Kluby historyczne (bez mandatow)
  // zostaja w bazie dla starych glosow, ale nie w ukladzie izby.
  const klubyIzby = listaKlubow.filter((k) => (k.mandaty ?? 0) > 0).sort((a, b) => (b.mandaty ?? 0) - (a.mandaty ?? 0));
  const mandatow = klubyIzby.reduce((a, k) => a + (k.mandaty ?? 0), 0);
  const [pierwszy, drugi] = klubyIzby;

  const ludnosc = pomoc && pomoc.wojewodztwa.length >= 16 && pomoc.wojewodztwa.every((w) => w.osob)
    ? pomoc.wojewodztwa.reduce((a, w) => a + (w.osob ?? 0), 0)
    : null;
  const pomocNaOsobe = pomoc?.brutto != null && ludnosc ? pomoc.brutto / ludnosc : null;

  return (
    <div className="obszar">
      <section className="pt-7 pb-1">
        <p className="znak text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
          {`Sejm X kadencji · ${liczba(gminLiczba)} gmin · rejestry publiczne, nie nasze oceny`}
        </p>
        <h1 className="szryft mt-2.5 max-w-[22em] text-[2rem] leading-[1.1] font-semibold lg:text-[2.4rem]">
          Sejm i publiczne pieniądze — z rejestrów, liczba po liczbie.
        </h1>
        <p className="podtytul mt-3 max-w-[34em] text-atrament-2">
          Przy każdej liczbie jest odnośnik do rejestru, z którego pochodzi. Nie oceniamy i nie komentujemy.
        </p>
        <p className="mt-2.5 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
          {'Szukaj w polu u góry strony, np. '}
          {PRZYKLADY.map((p, i) => (
            <span key={p}>
              <Link href={`/szukaj?q=${encodeURIComponent(p)}`} className="text-akcent underline underline-offset-4 hover:no-underline">{p}</Link>
              {i < PRZYKLADY.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
        {/*
          Trzy pytania, z ktorymi ludzie tu przychodza — nazwane ich slowami,
          nie nazwami naszych zakladek (badania-ux.md §2, F2). Reszta serwisu
          jest w menu u gory, ktore jest widoczne zawsze.
        */}
        <nav className="drzwi" aria-label="Najczęstsze pytania">
          <Link href="/gminy">
            <b>Moja gmina →</b>
            <span>{`Budżet, fundusze UE, pomoc dla firm, zamówienia i posłowie z okręgu — ${liczba(gminLiczba)} gmin, zawsze na mieszkańca.`}</span>
          </Link>
          <Link href="/poslowie">
            <b>Mój poseł →</b>
            <span>{`Jak głosuje i czy razem z klubem — ${liczba(stan.poslow)} posłów, w tym ${liczba(stan.poslow - stan.poslowAktywnych)} z wygasłym mandatem.`}</span>
          </Link>
          <Link href="/pomoc-publiczna">
            <b>Firma →</b>
            <span>Czy dostała pomoc publiczną albo zamówienie — po nazwie albo NIP-ie.</span>
          </Link>
        </nav>
      </section>

      {uchwalone.length ? (
        <Dzial
          id="uchwalone"
          nr={1}
          tytul={`Ostatnio uchwalone ustawy${uchwalone[0]?.data_zakonczenia ? `, ostatnia z ${dataSlownie(uchwalone[0].data_zakonczenia)}` : ''}`}
          obok={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/processes" nazwa="rejestr procesów" />}
        >
          <p className="wstep">
            Projekty, których przebieg rejestr zakończył słowem „Uchwalono”. Uchwalenie to jeszcze nie
            wejście w życie — przy ustawie już opublikowanej stoi adres w Dzienniku Ustaw.
          </p>
          <ul className="pozycje">
            {uchwalone.map((p) => {
              const s = streszczenieUstawy(p.numer);
              return (
                <li key={p.numer}>
                  <div className="min-w-0">
                    <p className="meta">{`druk ${p.numer}${p.data_zakonczenia ? ` · ${dataKrotko(p.data_zakonczenia)}` : ''}${p.adres_publikacji ? ` · ${p.adres_publikacji}` : ''}`}</p>
                    <Link href={`/ustawa/${p.numer}`} className="tytul-poz">{skroc(bezNazwiskOsobPrywatnych(p.tytul), 200)}</Link>
                    {s ? <p className="streszczenie">{s.tekst}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {uchwalone.some((p) => streszczenieUstawy(p.numer)) ? (
            <p className="mt-2 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
              Streszczenia napisał model językowy wyłącznie na podstawie opisu z rejestru; rozstrzyga rejestr — opis jest na stronie każdej ustawy.
            </p>
          ) : null}
          <p className="mt-3"><Link href="/ustawy" className="text-akcent underline underline-offset-4 hover:no-underline">{`Wszystkie ${liczba(ustawUchwalonych)} uchwalone w tej kadencji →`}</Link></p>
        </Dzial>
      ) : null}

      {/*
        Ostatnie glosowania w ogole to prawie zawsze kworum, przerwy
        i poprawki. Nie wybieramy "waznych" wedlug siebie — pokazujemy
        ostateczne glosowania nad projektami, rozpoznane po slowach rejestru
        (zasada 8).
      */}
      <Dzial
        id="glosowania"
        nr={2}
        tytul={glosowania[0] ? `Ostatnie głosowania nad całością, od ${dataSlownie(glosowania[glosowania.length - 1].data)}` : 'Ostatnie głosowania nad całością'}
        obok={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/votings" nazwa="rejestr głosowań" />}
      >
        <p className="wstep">
          {`Ostateczne głosowania nad projektami ustaw i uchwał — tak nazywa je rejestr. Wszystkich głosowań, łącznie z poprawkami i sprawami porządkowymi, jest ${liczba(stan.glosowan)}.`}
        </p>
        <ul className="pozycje">
          {glosowania.map((g) => {
            const o = opisGlosowania(g);
            return (
              <li key={`${g.posiedzenie}-${g.numer}`}>
                <div className="min-w-0">
                  <p className="meta">{[dataSlownie(g.data), `posiedzenie ${g.posiedzenie}`, o.punkt ? `pkt ${o.punkt}` : null].filter(Boolean).join(' · ')}</p>
                  <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`} className="tytul-poz">{skroc(o.sprawa, 170)}</Link>
                  <PaseczekGlosow g={g} className="mt-2 max-w-xl" zOpisem />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3"><Link href="/glosowania?rodzaj=calosc" className="text-akcent underline underline-offset-4 hover:no-underline">{`Wszystkie ${liczba(glosowanNadCaloscia)} głosowań nad całością →`}</Link></p>
      </Dzial>

      {pomoc ? (
        <Dzial
          id="pieniadze"
          nr={3}
          tytul={pomocNaOsobe !== null
            ? `Pieniądze publiczne: ${zlote(pomocNaOsobe)} pomocy dla firm na mieszkańca w ${zOdmiana(pomoc.dni, 'pobranym dniu', 'pobranych dniach', 'pobranych dniach')}`
            : 'Pieniądze publiczne'}
        >
          <Wiersze>
            <Wiersz
              duzy
              co={pomocNaOsobe !== null ? 'Pomoc publiczna dla firm w całej Polsce, na mieszkańca' : 'Pomoc publiczna dla firm w całej Polsce'}
              ile={pomocNaOsobe !== null ? zlote(pomocNaOsobe) : zlote(pomoc.brutto)}
              zCzego={
                <>
                  {`${zlote(pomoc.brutto)}${ludnosc ? ` ÷ ${liczba(ludnosc)} mieszkańców (GUS)` : ''} · `}
                  <b>{`w ${zOdmiana(pomoc.dni, 'pobranym dniu', 'pobranych dniach', 'pobranych dniach')}`}</b>
                  {` (${dataKrotko(pomoc.od)}–${dataKrotko(pomoc.do)}), nie w całym roku · ${zOdmiana(pomoc.przypadkow, 'przypadek', 'przypadki', 'przypadków')} `}
                  <Link href="/pomoc-publiczna">pomoc publiczna w Polsce →</Link>
                </>
              }
              podstawa={<Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" data={importPomocy ? dataKrotko(importPomocy.kiedy) : null} />}
            />
          </Wiersze>
          <WarunkiSudop pobrano={importPomocy?.kiedy ?? null} />
          <p className="pliki">
            <Link href="/gminy">Budżet i fundusze UE Twojej gminy →</Link>
            <Link href="/mapa">Mapa: gdzie jest więcej złotych na mieszkańca →</Link>
          </p>
        </Dzial>
      ) : null}

      {/*
        Uklad izby jako JEDEN pasek i legenda, nie plan sali. Plan (kto gdzie
        siedzi) jest na /sala; na stronie glownej wazyl najwiecej i odpowiadal
        na pytanie, ktorego tu nikt nie zadaje. Mandaty z rejestru klubow.
      */}
      <Dzial
        id="izba"
        nr={4}
        tytul={`Układ izby: ${liczba(mandatow)} mandatów`}
        obok={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/clubs" nazwa="rejestr klubów" data={stan.ostatnieGlosowanie ? `stan na ${dataKrotko(stan.ostatnieGlosowanie)}` : null} />}
      >
        {pierwszy && drugi ? (
          <h3 className="tytul-wykresu">{`${pierwszy.id} i ${drugi.id} mają razem ${liczba((pierwszy.mandaty ?? 0) + (drugi.mandaty ?? 0))} z ${liczba(mandatow)} mandatów`}</h3>
        ) : null}
        <div
          className="mt-3.5 flex max-w-[46rem] overflow-hidden"
          style={{ height: 22 }}
          role="img"
          aria-label={klubyIzby.map((k) => `${k.id}: ${k.mandaty}`).join(', ')}
        >
          {klubyIzby.map((k) => (
            <span
              key={k.id}
              className="miejsce-probka block h-full"
              title={`${k.id}: ${k.mandaty}`}
              style={{ width: `${((k.mandaty ?? 0) / mandatow) * 100}%`, '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties}
            />
          ))}
        </div>
        <ul className="legenda">
          {klubyIzby.map((k) => (
            <li key={k.id}>
              <span title={k.nazwa ?? undefined}>
                <span className="miejsce-probka kropka" style={{ '--b': k.barwa, '--bc': k.barwaCiemna } as React.CSSProperties} />
                {k.id}
              </span>
              <span className="liczby">{k.mandaty}</span>
            </li>
          ))}
        </ul>
        {/*
          Ta uwaga nie jest drobnym drukiem. Czytelnik widzacy kolorowy wykres
          sejmowy zaklada, ze to barwy partyjne — i na tym zalozeniu buduje
          wnioski. Musi wiedziec, ze tak nie jest.
        */}
        <p className="mt-2.5 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
          {'Barwy są nasze, dobrane pod rozróżnialność przy daltonizmie — to nie barwy partyjne. Kto na którym miejscu siedzi — na stronie '}
          <Link href="/sala">Sala posiedzeń</Link>.
        </p>
      </Dzial>

      <Dzial id="mamy" nr={5} tytul={`Co mamy: ${liczba(stan.glosow)} głosów imiennych z ${liczba(stan.glosowanZGlosami)} głosowań`}>
        <Wiersze>
          <Wiersz
            co="Głosowania"
            ile={liczba(stan.glosowan)}
            zCzego={stan.pierwszeGlosowanie ? `od ${dataSlownie(stan.pierwszeGlosowanie)}` : undefined}
            podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/votings" nazwa="API Sejmu" />}
          />
          <Wiersz
            co="Głosy imienne"
            ile={liczba(stan.glosow)}
            zCzego={`z ${zOdmiana(stan.glosowanZGlosami, 'głosowania', 'głosowań', 'głosowań')} — każdy głos każdego posła`}
            podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/votings" nazwa="API Sejmu" />}
          />
          <Wiersz
            co="Posłowie w rejestrze"
            ile={liczba(stan.poslow)}
            zCzego={`w tym ${liczba(stan.poslow - stan.poslowAktywnych)} z wygasłym mandatem — zostają w serwisie`}
            podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/MP" nazwa="API Sejmu" />}
          />
          <Wiersz
            co="Ustawy uchwalone w tej kadencji"
            ile={liczba(ustawUchwalonych)}
            zCzego="droga każdego projektu etap po etapie"
            podstawa={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/processes" nazwa="API Sejmu" />}
          />
        </Wiersze>
        <p className="mt-3"><Link href="/stan" className="text-akcent underline underline-offset-4 hover:no-underline">Stan danych: co i kiedy pobraliśmy →</Link></p>
      </Dzial>
    </div>
  );
}
