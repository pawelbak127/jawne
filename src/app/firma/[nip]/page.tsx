import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, firma, organyZeStrona, przypadkiFirmy, TERYT_WARSZAWY, zamowieniaFirmy, zrodloImportu, type Firma, type PrzypadekFirmy, type ZamowieniaFirmy } from '@/lib/dane';
import { KONTAKT } from '@/lib/adres';
import { dataKrotko, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { nazwaDoPokazania, nazwaPodmiotuJawna, PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Dzial, Okruszek, Podstawa, Wiecej, Wiersz, Wiersze, WLiczbach, Wypis } from '@/components/Szablon';
import { SpisDzialow } from '@/components/SpisDzialow';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { adresSprawyKE, numerSprawyKE } from '@/lib/sprawy-ke';

/*
 * Pusta lista = strona generuje sie przy pierwszym wejsciu i zostaje w pamieci
 * podrecznej na godzine (`revalidate` w layout.tsx). Bez tego Next renderowal
 * ja przy KAZDYM zadaniu, a `node:sqlite` blokuje caly proces na ten czas:
 * strona Warszawy to 1,5–2,4 s przy kazdym wejsciu (zmierzone 07.10.2026).
 */
export async function generateStaticParams(): Promise<{ nip: string }[]> {
  return [];
}

/**
 * Strona beneficjenta pomocy publicznej.
 *
 * ZASADA: strona powstaje TYLKO dla podmiotow, ktorych nazwe wolno pokazac
 * (osoba prawna albo pomoc powyzej progu z `prywatnosc.ts`). Dla pozostalych
 * jest 404 — profil jednoosobowej dzialalnosci pod adresem z NIP-em to
 * dokladnie to profilowanie, przed ktorym chroni nasza regula o nazwiskach,
 * nawet gdyby nazwa byla na nim ukryta.
 */

/*
 * Co NAPRAWDE obejmuja liczby na tej stronie.
 *
 * B6 z przegladu 01.10.2026: stalo tu „rejestr obejmuje ostatnie dziesiec
 * lat". To prawda o REJESTRZE, nie o naszych danych — pelne dziesiec lat
 * pobralismy dla trzech gmin pokazowych, a dla reszty kraju mamy kilkanascie
 * pojedynczych dni. Strona gminy mowila o tym wprost dwoma zdaniami, strona
 * firmy nie mowila nic i jeszcze zapewniala o dziesieciu latach.
 *
 * Trzy liczby z `firma()` sa rozlaczne i sumuja sie do `przypadkow`, wiec
 * zdanie ponizej zawsze ma mianownik (regula 3). Dni nieustalone wymieniamy
 * osobno, bo sa NIEPELNE: urzedy maja 7 dni na zgloszenie pomocy.
 */
function zakresDanych(f: Firma): string {
  const zDni = f.z_dni_ustalonych + f.z_dni_swiezych;
  const okres = f.dni_od && f.dni_do ? ` (${dataKrotko(f.dni_od)} – ${dataKrotko(f.dni_do)})` : '';
  const dni = `${zOdmiana(f.dni_kraju, 'dnia', 'dni', 'dni')} pobranych dla całego kraju${okres}`;
  const swieze = f.z_dni_swiezych
    ? ` W tym ${liczba(f.z_dni_swiezych)} z dni, dla których nie minął jeszcze termin zgłoszenia pomocy — te są niepełne.`
    : '';

  if (f.z_historii_gminy && !zDni) return `Pełna historia gminy z rejestru: wszystkie przypadki, jakie podał SUDOP.`;
  if (f.z_historii_gminy) {
    return `${liczba(f.z_historii_gminy)} z pełnej historii gminy i ${liczba(zDni)} z ${dni}.${swieze}`;
  }
  return `Tylko z ${dni} — nie z pełnych dziesięciu lat rejestru.${swieze}`;
}

function widok(nip: string) {
  if (!/^\d{10}$/.test(nip) || !bazaDostepna()) return null;
  const f = firma(nip);
  if (!f) return null;
  const nazwa = nazwaDoPokazania(f.nazwa, { pomocEur: f.max_eur, progAktywny: Boolean(KONTAKT), typRegon: f.typ_regon });
  if (nazwa.pominieta) return null;
  // Osoba fizyczna odslonieta progiem nie trafia do wyszukiwarek — nazwa jest
  // na stronie, ale nie w tytule ani w indeksie.
  return { f, nazwa: nazwa.tekst, osobaPrawna: nazwaPodmiotuJawna(f.nazwa, f.typ_regon) };
}

export async function generateMetadata({ params }: { params: Promise<{ nip: string }> }): Promise<Metadata> {
  const { nip } = await params;
  const w = widok(nip);
  if (!w) return { title: 'Nie ma takiego beneficjenta' };
  if (!w.osobaPrawna) {
    return {
      title: 'Beneficjent pomocy publicznej',
      description: 'Pomoc publiczna i de minimis udzielona temu beneficjentowi według systemu SUDOP.',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${skroc(w.nazwa, 70)} — pomoc publiczna`,
    description: `${skroc(w.nazwa, 60)}: ${zOdmiana(w.f.przypadkow, 'przypadek pomocy publicznej', 'przypadki pomocy publicznej', 'przypadków pomocy publicznej')} o wartości ${zlote(w.f.brutto)}, według rejestru SUDOP prowadzonego przez UOKiK.`,
  };
}

export default async function StronaFirmy({ params }: { params: Promise<{ nip: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { nip } = await params;
  const w = widok(nip);
  if (!w) notFound();
  const { f } = w;
  const przypadki = przypadkiFirmy(nip, 50);
  const zeStrona = organyZeStrona(przypadki.map((p) => p.nip_udzielajacego ?? ''));
  const zamowienia = zamowieniaFirmy(nip);
  const imp = zrodloImportu('sudop');
  const impTed = zrodloImportu('zamowienia');
  const grupy = pogrupuj(przypadki);
  const maStrone = (p: PrzypadekFirmy) => Boolean(p.nip_udzielajacego && zeStrona.has(p.nip_udzielajacego));
  const roznaNominalna = przypadki.some((p) => p.nominalna !== null && p.brutto !== null && Math.abs(p.nominalna - p.brutto) > 1);
  const podstawy = [...new Set(przypadki.map((p) => p.podstawa).filter((x): x is string => Boolean(x)))];
  const gmina = f.teryt && f.gmina
    ? <Link href={`/gmina/${f.teryt}`}>{`${f.gmina_rodzaj === 'gmina' ? `gmina ${f.gmina}` : f.gmina} — publiczne pieniądze w gminie`}</Link>
    // Warszawa jest w SUDOP jednym miastem (146501), a w danych PKW —
    // osiemnastoma dzielnicami, więc nie ma dla niej naszej strony gminy.
    // Nazwę znamy i ją podajemy; odnośnika nie zmyślamy.
    : f.teryt === TERYT_WARSZAWY ? 'Warszawa' : null;

  const dzialy = [
    { id: 'przypadki', nazwa: 'Przypadki pomocy' },
    ...(zamowienia.ogloszen > 0 ? [{ id: 'zamowienia', nazwa: 'Zamówienia' }] : []),
  ];
  const nr = (id: string) => dzialy.findIndex((d) => d.id === id) + 2;

  return (
    <>
      <div className="obszar">
        <Okruszek ogniwa={[{ nazwa: 'Pieniądze publiczne' }, { adres: '/pomoc-publiczna', nazwa: 'Pomoc publiczna' }, { nazwa: w.nazwa }]} />
        <Wypis
          tytul={w.nazwa}
          podtytul={
            <>
              {f.pkd_nazwa ? skroc(f.pkd_nazwa, 80) : 'beneficjent pomocy publicznej'}
              {/*
                ZMIERZONE 22.09.2026: sam `f.teryt` nie wystarczy. Firmy z Warszawy
                mają teryt 146501, którego NIE MA w naszej tabeli gmin (PKW dzieli
                Warszawę na 18 dzielnic) — wychodziło z tego „w gminie null” i odnośnik
                do nieistniejącej strony. Dotyczy 5 484 przypadków pomocy.
              */}
              {gmina ? <>{' · siedziba: '}{gmina}</> : null}
            </>
          }
        />

        <WLiczbach tytul="W liczbach" stopka={<WarunkiSudop pobrano={imp?.kiedy ?? null} />}>
          <Wiersz
            duzy
            co="Pomoc publiczna brutto"
            ile={zlote(f.brutto)}
            zCzego={
              <>
                {`${zOdmiana(f.przypadkow, 'przypadek', 'przypadki', 'przypadków')}, ${dataKrotko(f.pierwszy)}–${dataKrotko(f.ostatni)} · ${zakresDanych(f)} `}
                <a href="#przypadki">przypadki pomocy ↓</a>
              </>
            }
            porownanie={f.przypadkow > 1 && f.brutto !== null ? `Średnio ${zlote(f.brutto / f.przypadkow)} na jeden przypadek pomocy.` : null}
            podstawa={<Podstawa adres={`${ZRODLO_SUDOP}/search/aidBeneficiary`} nazwa="SUDOP, UOKiK" data={imp ? dataKrotko(imp.kiedy) : null} />}
          />
          {zamowienia.ogloszen > 0 ? (
            <Wiersz
              duzy
              co="Zamówienia publiczne, w których była jedynym wykonawcą"
              ile={zamowienia.sumaSama === null ? null : zlote(zamowienia.sumaSama)}
              zCzego={
                <>
                  {`z ${zOdmiana(zamowienia.ogloszenWSumie, 'ogłoszenia', 'ogłoszeń', 'ogłoszeń')} · ogłoszeń z kilkoma wykonawcami: ${liczba(zamowienia.ogloszenZInnymi)} (bez sumy) `}
                  <a href="#zamowienia">zamówienia ↓</a>
                </>
              }
              podstawa={<Podstawa adres="https://ted.europa.eu" nazwa="TED" data={impTed ? dataKrotko(impTed.kiedy) : null} />}
            />
          ) : null}
        </WLiczbach>

        <p className="stan-danych">
          <span>{`NIP ${f.nip}`}</span>
          {/*
            Zrodlo opisuje kategorie 3 jako "przedsiebiorstwo nienalezace do
            kategorii okreslonych kodem od 0 do 2" — czyli po ludzku: duze.
          */}
          {f.wielkosc ? <span>{f.wielkosc_kod === '3' ? 'duży przedsiębiorca' : f.wielkosc}</span> : null}
          {f.pkd ? <span>{`PKD ${f.pkd}`}</span> : null}
          <span>
            {'stan danych: '}
            {[imp ? `SUDOP ${dataKrotko(imp.kiedy)}` : null, zamowienia.ogloszen > 0 && impTed ? `TED ${dataKrotko(impTed.kiedy)}` : null].filter(Boolean).join(' · ')}
          </span>
        </p>
      </div>

      <div className="obszar z-spisem">
        <SpisDzialow dzialy={dzialy.map((d) => ({ ...d, nr: nr(d.id) }))} />
        <div className="dzialy">
          <Dzial
            id="przypadki"
            nr={nr('przypadki')}
            tytul={przypadki.length < f.przypadkow
              ? `Przypadki pomocy: ${liczba(przypadki.length)} najnowszych z ${liczba(f.przypadkow)}`
              : `Przypadki pomocy: ${liczba(f.przypadkow)}`}
            obok={<Podstawa adres={`${ZRODLO_SUDOP}/search/aidBeneficiary`} nazwa="sprawdź w SUDOP" />}
            metoda={
              <ul>
                {/*
                  Podstawa prawna i sprawa w Komisji Europejskiej (04.10.2026) —
                  prosba Pawla „czy da sie wejsc glebiej w te pomoc". Oba pola sa
                  w SUDOP; dokumentow (decyzji, umow) rejestr nie udostepnia.
                  Przy kazdym przypadku osobno — w liscie „osobno” nizej.
                */}
                {podstawy.slice(0, 6).map((x) => <li key={x}>{`Podstawa prawna: ${x}`}</li>)}
                <li>
                  Wartość brutto to ekwiwalent dotacji brutto, czyli tyle, ile pomoc jest warta dla firmy.
                  Przy dotacji to cała kwota, ale przy pożyczce, gwarancji czy płatnościach rozłożonych
                  w czasie bywa niższa niż kwota nominalna. Rejestr podaje obie; sumujemy brutto.
                </li>
                {f.przypadkow > 1 && f.brutto !== null ? <li>{`Średnia na przypadek to ${zlote(f.brutto)} ÷ ${zOdmiana(f.przypadkow, 'przypadek', 'przypadki', 'przypadków')}.`}</li> : null}
              </ul>
            }
          >
            {grupy.length < przypadki.length ? (
              <p className="wstep">Zgrupowane, gdy data, podmiot udzielający i przeznaczenie pomocy są te same.</p>
            ) : null}
            <table className="tabela">
              <thead>
                <tr><th>Data</th><th>Na co · kto przyznał</th><th className="l">Przypadki</th><th className="l">Brutto</th></tr>
              </thead>
              <tbody>
                {grupy.map((g) => (
                  <tr key={g.klucz}>
                    <td className="znak whitespace-nowrap">{dataKrotko(g.p.dzien)}</td>
                    <td>
                      {skroc(g.p.przeznaczenie ?? 'przeznaczenie nieokreślone', 130)}
                      <Udzielajacy p={g.p} maStrone={maStrone(g.p)} />
                    </td>
                    <td className="l" data-etykieta="przypadki">{liczba(g.ile)}</td>
                    <td className="l">{g.ile === 1 || g.min === g.max ? zlote(g.max) : `od ${zlote(g.min)} do ${zlote(g.max)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {grupy.length < przypadki.length || roznaNominalna || podstawy.length ? (
              <Wiecej napis={`Pokaż ${zOdmiana(przypadki.length, 'przypadek', 'przypadki', 'przypadków')} osobno, z podstawą prawną`}>
                <ul className="pozycje">
                  {przypadki.map((p, i) => <PrzypadekOsobno key={`${p.dzien}-${i}`} p={p} maStrone={maStrone(p)} />)}
                </ul>
              </Wiecej>
            ) : null}

            {!w.osobaPrawna && KONTAKT ? (
              <p className="mt-4 text-atrament-2" style={{ fontSize: 'var(--drobny)' }}>
                {`Nazwę pokazujemy, bo pojedyncza pomoc przekroczyła ${liczba(PROG_JAWNOSCI_EUR)} euro — te same dane publikuje UOKiK w rejestrze SUDOP. Strony nie zgłaszamy wyszukiwarkom. Jeśli jesteś tą osobą i nie chcesz tego — `}
                <Link href="/prywatnosc#kontakt">napisz do nas</Link>
                {'. Usuniemy bez pytania o powód.'}
              </p>
            ) : null}
          </Dzial>

          {zamowienia.ogloszen > 0 ? <Zamowienia nr={nr('zamowienia')} z={zamowienia} /> : null}
        </div>
      </div>
    </>
  );
}

/**
 * Przypadki z ta sama data, podmiotem udzielajacym, przeznaczeniem i forma
 * w jednym wierszu. ZMIERZONE 08.10.2026: PGE GiEK ma w 50 najnowszych
 * po 15–16 transz rynku mocy z jednego dnia od jednego podmiotu — lista
 * pozycja po pozycji to 50 prawie identycznych wierszy. Kazdy przypadek
 * z osobna (z podstawa prawna i sprawa KE) zostaje w liscie „osobno”.
 */
function pogrupuj(przypadki: PrzypadekFirmy[]) {
  const grupy = new Map<string, { klucz: string; p: PrzypadekFirmy; ile: number; min: number | null; max: number | null }>();
  for (const p of przypadki) {
    const klucz = [p.dzien, p.nip_udzielajacego ?? p.udzielajacy, p.przeznaczenie, p.forma].join('|');
    const g = grupy.get(klucz);
    if (!g) {
      grupy.set(klucz, { klucz, p, ile: 1, min: p.brutto, max: p.brutto });
      continue;
    }
    g.ile++;
    // null to brak kwoty, nie zero (zasada 4) — nie wchodzi do „od … do …”.
    if (p.brutto !== null) {
      g.min = g.min === null ? p.brutto : Math.min(g.min, p.brutto);
      g.max = g.max === null ? p.brutto : Math.max(g.max, p.brutto);
    }
  }
  return [...grupy.values()];
}

function PrzypadekOsobno({ p, maStrone }: { p: PrzypadekFirmy; maStrone: boolean }) {
  const sprawa = numerSprawyKE(p.srodek_numer);
  return (
    <li>
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{skroc(p.przeznaczenie ?? 'przeznaczenie nieokreślone', 130)}</p>
        <Udzielajacy p={p} maStrone={maStrone} />
        <p className="meta">
          {`${dataKrotko(p.dzien)}${p.forma ? ` · ${skroc(p.forma, 60)}` : ''}${p.srodek ? ` · ${skroc(p.srodek, 60)}` : ''}`}
        </p>
        {p.podstawa ? <p className="meta">{`Podstawa prawna: ${p.podstawa}`}</p> : null}
        {/* Odnosnik do Komisji tylko przy numerze „SA.…" — patrz sprawy-ke.ts. */}
        {sprawa ? (
          <a href={adresSprawyKE(sprawa)} target="_blank" rel="noreferrer" className="meta text-akcent underline underline-offset-4 hover:no-underline">
            {`decyzja Komisji Europejskiej w sprawie ${sprawa}`}
          </a>
        ) : null}
      </div>
      <p className="kwota">
        {zlote(p.brutto)}
        {/*
          Nominalna bywa inna niz brutto (pozyczka, gwarancja) — pokazujemy
          ja tylko wtedy, bo powtorzona ta sama liczba tylko myli.
        */}
        {p.nominalna !== null && p.brutto !== null && Math.abs(p.nominalna - p.brutto) > 1 ? (
          <small>{`nominalnie ${zlote(p.nominalna)}`}</small>
        ) : null}
      </p>
    </li>
  );
}

/**
 * Zamowienia publiczne z TED.
 *
 * KWOTA Z TED DOTYCZY CALEGO OGLOSZENIA — wszystkich czesci i wszystkich
 * wykonawcow. Dlatego sumujemy wylacznie ogloszenia z jednym wykonawca,
 * a przy pozostalych piszemy, ilu ich bylo, i kwoty nie przypisujemy.
 * Zmierzone: 90 na 250 polskich ogloszen ma wiecej niz jednego wykonawce.
 */
function Zamowienia({ nr, z }: { nr: number; z: ZamowieniaFirmy }) {
  return (
    <Dzial
      id="zamowienia"
      nr={nr}
      tytul={`Zamówienia publiczne: ${zOdmiana(z.ogloszen, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')}${z.sumaSama !== null ? `, ${zlote(z.sumaSama)} jako jedyny wykonawca` : ''}`}
      obok={<Podstawa adres="https://ted.europa.eu" nazwa="TED — dziennik zamówień UE" />}
      metoda={
        <p>
          Źródłem jest TED, unijny dziennik zamówień publicznych — trafiają tam zamówienia
          powyżej progów unijnych, a nie wszystkie. Kwota dotyczy całego ogłoszenia, ze
          wszystkimi częściami i wykonawcami; przy ogłoszeniach z kilkoma wykonawcami nie
          da się z niej wyczytać, ile przypadło tej firmie.
        </p>
      }
    >
      <p className="wstep">
        {`${zOdmiana(z.ogloszen, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} o udzieleniu zamówienia, w których ta firma jest wskazana jako wykonawca.`}
      </p>
      <Wiersze>
        <Wiersz
          co="Jako jedyny wykonawca"
          ile={z.sumaSama === null ? null : zlote(z.sumaSama)}
          zCzego={`z ${zOdmiana(z.ogloszenWSumie, 'ogłoszenia', 'ogłoszeń', 'ogłoszeń')} · ${z.ogloszenSama > z.ogloszenWSumie
            ? `${zOdmiana(z.ogloszenSama - z.ogloszenWSumie, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} z jednym wykonawcą zostało poza sumą: bez kwoty w złotych albo z kwotą odrzuconą jako błędna`
            : 'tylko kwoty w złotych'}`}
        />
        <Wiersz
          co="Ogłoszeń z kilkoma wykonawcami"
          ile={liczba(z.ogloszenZInnymi)}
          zCzego="kwoty nie sumujemy — dotyczy całego ogłoszenia, nie tej firmy"
        />
      </Wiersze>
      <ul className="pozycje">
        {z.lista.map((o) => (
          <li key={o.numer}>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{skroc(o.tytul ?? 'bez tytułu w rejestrze', 130)}</p>
              <p className="meta">
                {`${skroc(o.nabywca ?? '—', 80)} · ${dataKrotko(o.data)} · ogłoszenie `}
                <span className="znak">{o.numer}</span>
                {o.wykonawcow > 1 ? ` · ${zOdmiana(o.wykonawcow, 'wykonawca', 'wykonawców', 'wykonawców')}` : ''}
              </p>
            </div>
            <p className="kwota">
              {o.wartosc === null ? '—' : o.waluta === 'PLN' ? zlote(o.wartosc) : `${liczba(Math.round(o.wartosc))} ${o.waluta ?? ''}`}
              <small>
                {o.wykonawcow > 1 ? 'całe ogłoszenie · ' : ''}
                <a href={`https://ted.europa.eu/pl/notice/${o.numer}/pdf`} target="_blank" rel="noreferrer" className="text-akcent underline underline-offset-4 hover:no-underline">
                  ogłoszenie (PDF)
                </a>
              </small>
            </p>
          </li>
        ))}
      </ul>
    </Dzial>
  );
}

/**
 * Kto udzielil pomocy — przez TEN SAM filtr nazw co beneficjent.
 *
 * Do 04.10.2026 nazwa szla tu wprost z rejestru, a pulapka 34 mowi, ze
 * udzielajacym bywa osoba fizyczna (firmy szkoleniowe przy projektach UE).
 * Gdy nazwe wolno pokazac jako osobe prawna lub instytucje, prowadzi do
 * strony organu (`/organ/[nip]` istnieje dokladnie dla takich).
 */
function Udzielajacy({ p, maStrone }: { p: PrzypadekFirmy; maStrone: boolean }) {
  if (!p.udzielajacy?.trim()) return <p className="meta">—</p>;
  const jawny = nazwaPodmiotuJawna(p.udzielajacy, p.typ_udzielajacego);
  const nazwa = nazwaDoPokazania(p.udzielajacy, { typRegon: p.typ_udzielajacego });
  return (
    <p className={`meta ${nazwa.pominieta ? 'italic' : ''}`}>
      {'przyznał: '}
      {jawny && maStrone ? (
        <Link href={`/organ/${p.nip_udzielajacego}`} className="text-akcent underline underline-offset-4 hover:no-underline">
          {skroc(nazwa.tekst, 80)}
        </Link>
      ) : (
        skroc(nazwa.tekst, 80)
      )}
    </p>
  );
}
