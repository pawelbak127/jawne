import Link from 'next/link';
import {
  bazaDostepna, kluby, liczbaProcesow, ostatnioUchwaloneZWynikiem, przegladPomocy,
  wojewodztwaGmin, zrodloImportu, type Glosowanie,
} from '@/lib/dane';
import { dataKrotko, liczba, okresDni, skroc, zlote, zOdmiana } from '@/lib/format';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { tytulUstawy } from '@/lib/tytul-ustawy';
import { BARWY_GLOSU } from '@/lib/barwy-glosu';
import { BrakDanych } from '@/components/BrakDanych';
import { MiniMapa, MiniPolkole, type BlokMiniatury } from '@/components/Miniatury';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { Dzial, Podstawa, Wiersz, Wiersze } from '@/components/Szablon';

/*
 * STRONA GLOWNA PO PRZEGLADZIE TRESCI (24–25.10.2026, docs/przebudowa/
 * przeglad-tresci-2026-10-24.md, uklad zaakceptowany przez Pawla).
 * Dawniej: hasło z paska powtorzone jako H1, „nie oceniamy” cztery razy,
 * zadnej liczby ani obrazu na pierwszym ekranie i odeslanie „do pola u gory”.
 * Teraz: obietnica w slowach czytelnika i duze pole wyszukiwania, trzy karty
 * z obrazem, ostatnie ustawy z opisem z rejestru i wynikiem, pieniadze
 * w gminach jedna liczba z zakresem dat. „Co mamy” i „Uklad izby” wypadly —
 * dublowaly reszte strony; zasady sa w stopce i na /o-serwisie.
 *
 * Przyklady: dwie miejscowosci i dwa tematy. Celowo bez nazwisk —
 * nazwisko wybrane przez nas na stronie glownej czyta sie jak wyroznienie.
 */
const PRZYKLADY = ['Kraków', 'Zakopane', 'podatek', 'sygnaliści'];

/** Szesc odcieni z /mapa (MapaGmin) — kubelki po kwantylach, nie ciagly gradient. */
const BARWY_MAPY = ['#dbeee9', '#b3ddd3', '#84c7b6', '#55ac97', '#2f8a76', '#1b6152'];

/** Bloki polkola wedlug GLOSU (nie posla) — za, przeciw, wstrzymali sie, obecni bez glosu, nieobecni. */
function blokiGlosowania(g: Glosowanie): BlokMiniatury[] {
  const bezGlosu = Math.max(0, g.glosowalo - g.za - g.przeciw - g.wstrzymalo);
  return [
    { id: 'za', ile: g.za, barwa: BARWY_GLOSU.za.jasny, barwaCiemna: BARWY_GLOSU.za.ciemny },
    { id: 'przeciw', ile: g.przeciw, barwa: BARWY_GLOSU.przeciw.jasny, barwaCiemna: BARWY_GLOSU.przeciw.ciemny },
    { id: 'wstrzymal', ile: g.wstrzymalo, barwa: BARWY_GLOSU.wstrzymal.jasny, barwaCiemna: BARWY_GLOSU.wstrzymal.ciemny },
    { id: 'obecny', ile: bezGlosu, barwa: BARWY_GLOSU.inne.jasny, barwaCiemna: BARWY_GLOSU.inne.ciemny },
    { id: 'brak', ile: g.nieobecnych, barwa: BARWY_GLOSU.brak.jasny, barwaCiemna: BARWY_GLOSU.brak.ciemny },
  ].filter((b) => b.ile > 0);
}

export default function StronaGlowna() {
  if (!bazaDostepna()) return <BrakDanych />;

  const listaKlubow = kluby();
  // Ta sama liczba co na /gminy: Warszawa raz, nie 18 dzielnic (pulapka 24).
  const gminLiczba = wojewodztwaGmin().reduce((a, w) => a + w.gmin, 0);
  const ustawUchwalonych = liczbaProcesow('projekt ustawy', 'uchwalone');
  const ustawy = ostatnioUchwaloneZWynikiem(4);
  const pomoc = przegladPomocy();
  const importPomocy = zrodloImportu('sudop-przyrost');

  // Kluby w kolejnosci z kluby.ts (od lewej strony sali), tylko z mandatami.
  const klubyIzby = listaKlubow.filter((k) => (k.mandaty ?? 0) > 0);
  const blokiIzby: BlokMiniatury[] = klubyIzby.map((k) => ({ id: k.id, ile: k.mandaty ?? 0, barwa: k.barwa, barwaCiemna: k.barwaCiemna }));
  const mandatow = blokiIzby.reduce((a, b) => a + b.ile, 0);

  const ludnosc = pomoc && pomoc.wojewodztwa.length >= 16 && pomoc.wojewodztwa.every((w) => w.osob)
    ? pomoc.wojewodztwa.reduce((a, w) => a + (w.osob ?? 0), 0)
    : null;
  const pomocNaOsobe = pomoc?.brutto != null && ludnosc ? pomoc.brutto / ludnosc : null;
  // Wojewodztwa na miniaturze: pomoc na mieszkanca, szesc kubelkow po kolejnosci.
  const naOsobeWoj = (pomoc?.wojewodztwa ?? [])
    .filter((w) => w.brutto !== null && w.osob)
    .map((w) => ({ nazwa: w.wojewodztwo, wartosc: (w.brutto ?? 0) / (w.osob ?? 1) }))
    .sort((a, b) => a.wartosc - b.wartosc);
  const barwaWoj = new Map(naOsobeWoj.map((w, i) => [w.nazwa, BARWY_MAPY[Math.min(BARWY_MAPY.length - 1, Math.floor((i * BARWY_MAPY.length) / naOsobeWoj.length))]!]));
  const [najmniej, najwiecej] = [naOsobeWoj[0], naOsobeWoj[naOsobeWoj.length - 1]];

  return (
    <div className="obszar">
      <section className="bohater">
        <h1 className="szryft">
          Jak głosuje Twój poseł.
          <br />
          Ile publicznych pieniędzy trafia do Twojej gminy.
        </h1>
        <p className="podtytul">Wszystko z rejestrów publicznych — przy każdej liczbie odnośnik do źródła.</p>
        <form action="/szukaj" method="get" role="search" className="bohater-szukaj">
          <label htmlFor="szukaj-glowna" className="sr-only">Szukaj gminy, posła, firmy albo NIP-u</label>
          <input id="szukaj-glowna" name="q" type="search" className="pole" placeholder="Gmina, poseł, firma, NIP" />
          <button type="submit">Szukaj</button>
        </form>
        <p className="bohater-przyklady">
          {'Na przykład: '}
          {PRZYKLADY.map((p, i) => (
            <span key={p}>
              <Link href={`/szukaj?q=${encodeURIComponent(p)}`}>{p}</Link>
              {i < PRZYKLADY.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </section>

      {/*
        Trzy pytania, z ktorymi ludzie tu przychodza — nazwane ich slowami
        (badania-ux.md §2, F2), teraz z obrazem: miniatura mapy i polkole izby.
        Polkole nie wybiera nikogo, wiec nie lamie zasady „bez wyroznien”.
      */}
      <nav className="karty" aria-label="Najczęstsze pytania">
        <Link href="/gminy" className="karta">
          <span className="karta-obraz"><MiniMapa opis="Mapa Polski z podziałem na województwa" /></span>
          <b>Moja gmina →</b>
          <span>{`Budżet, fundusze UE, pomoc dla firm i zamówienia — ${liczba(gminLiczba)} gmin, zawsze na mieszkańca.`}</span>
        </Link>
        <Link href="/poslowie" className="karta">
          <span className="karta-obraz"><MiniPolkole bloki={blokiIzby} opis={`Sejm: ${klubyIzby.map((k) => `${k.id} ${k.mandaty}`).join(', ')}`} /></span>
          <b>Mój poseł →</b>
          <span>{`Jak głosuje i kiedy inaczej niż klub — ${liczba(mandatow)} posłów w ${zOdmiana(klubyIzby.length, 'klubie', 'klubach', 'klubach')}. Barwy klubów są nasze, nie partyjne.`}</span>
        </Link>
        <div className="karta">
          <form action="/firmy" method="get" role="search" className="karta-obraz karta-firma">
            <label htmlFor="szukaj-firmy-glowna" className="sr-only">Nazwa firmy albo NIP</label>
            <input id="szukaj-firmy-glowna" name="q" type="search" className="pole" placeholder="Nazwa firmy albo NIP" />
            <button type="submit">Sprawdź firmę</button>
          </form>
          <b>Firma</b>
          <span>Pomoc publiczna dla firmy, po nazwie albo NIP-ie — a na jej stronie także wygrane zamówienia.</span>
        </div>
      </nav>

      {ustawy.length ? (
        <Dzial
          id="sejm"
          tytul="Ostatnio w Sejmie"
          obok={<Podstawa adres="https://api.sejm.gov.pl/sejm/term10/processes" nazwa="rejestr procesów" />}
        >
          <ul className="pozycje ustawy-glowna">
            {ustawy.map(({ p, glosowanie: g }, i) => {
              const t = tytulUstawy(bezNazwiskOsobPrywatnych(p.tytul));
              return (
                <li key={p.numer} className={i === 0 && g ? 'z-polkolem' : undefined}>
                  <div className="min-w-0">
                    <p className="meta">
                      {[t.autor ? `projekt ${t.autor}` : null, p.data_zakonczenia ? `uchwalona ${dataKrotko(p.data_zakonczenia)}` : 'uchwalona', `druk ${p.numer}`].filter(Boolean).join(' · ')}
                    </p>
                    <Link href={`/ustawa/${p.numer}`} className="tytul-poz">{skroc(t.krotki, 150)}</Link>
                    {p.opis ? (
                      <p className="streszczenie">
                        {skroc(bezNazwiskOsobPrywatnych(p.opis.charAt(0).toLocaleUpperCase('pl-PL') + p.opis.slice(1)), 230)}
                        <span className="etykieta-zrodla"> — opis z rejestru</span>
                      </p>
                    ) : null}
                    {g ? (
                      <>
                        <PaseczekGlosow g={g} className="mt-2 max-w-xl" zOpisem />
                        <p className="meta mt-1">
                          <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`}>{`Głosowanie nad całością, ${dataKrotko(g.data)} →`}</Link>
                        </p>
                      </>
                    ) : null}
                  </div>
                  {i === 0 && g ? (
                    <div className="polkole-ustawy">
                      <MiniPolkole bloki={blokiGlosowania(g)} opis={`Głosowanie nad całością: za ${g.za}, przeciw ${g.przeciw}, wstrzymało się ${g.wstrzymalo}, nieobecnych ${g.nieobecnych}`} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="pliki">
            <Link href="/ustawy?stan=uchwalone">{`Wszystkie ${liczba(ustawUchwalonych)} uchwalone ustawy →`}</Link>
            <Link href="/glosowania?rodzaj=calosc">Głosowania nad całością projektów →</Link>
          </p>
        </Dzial>
      ) : null}

      {pomoc ? (
        <Dzial id="pieniadze" tytul="Pieniądze publiczne w gminach">
          <div className="pieniadze-glowna">
            <div className="mapa-glowna">
              <MiniMapa opis="Pomoc publiczna dla firm na mieszkańca według województw" barwa={(n) => barwaWoj.get(n)} />
              {najmniej && najwiecej ? (
                <p className="meta">{`Pomoc dla firm na mieszkańca w tym samym okresie: od ${zlote(najmniej.wartosc)} (${najmniej.nazwa}) do ${zlote(najwiecej.wartosc)} (${najwiecej.nazwa}). Ciemniej — więcej.`}</p>
              ) : null}
            </div>
            <div className="min-w-0">
              <Wiersze>
                <Wiersz
                  duzy
                  co="Pomoc publiczna dla firm w całej Polsce, na mieszkańca"
                  ile={pomocNaOsobe !== null ? zlote(pomocNaOsobe) : zlote(pomoc.brutto)}
                  zCzego={`${zlote(pomoc.brutto)}${ludnosc ? ` ÷ ${liczba(ludnosc)} mieszkańców (GUS)` : ''} · ${zOdmiana(pomoc.przypadkow, 'przypadek', 'przypadki', 'przypadków')} · ${okresDni(pomoc.dni, pomoc.od, pomoc.do)}`}
                  podstawa={<Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" data={importPomocy ? dataKrotko(importPomocy.kiedy) : null} />}
                />
              </Wiersze>
              <WarunkiSudop pobrano={importPomocy?.kiedy ?? null} />
              <p className="pliki">
                <Link href="/gminy">Twoja gmina: budżet, fundusze UE, pomoc →</Link>
                <Link href="/mapa">Mapa wszystkich gmin →</Link>
                <Link href="/pomoc-publiczna">Pomoc publiczna w Polsce →</Link>
              </p>
            </div>
          </div>
        </Dzial>
      ) : null}

      <p className="stan-danych mt-8">
        <Link href="/stan">Stan danych: co i kiedy pobraliśmy z każdego rejestru →</Link>
      </p>
    </div>
  );
}
