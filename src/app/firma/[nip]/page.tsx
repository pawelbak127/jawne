import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bazaDostepna, firma, organyZeStrona, przypadkiFirmy, TERYT_WARSZAWY, zamowieniaFirmy, zrodloImportu, type Firma, type PrzypadekFirmy, type ZamowieniaFirmy } from '@/lib/dane';
import { KONTAKT } from '@/lib/adres';
import { dataKrotko, liczba, skroc, zlote, zOdmiana } from '@/lib/format';
import { nazwaDoPokazania, nazwaPodmiotuJawna, PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { BrakDanych } from '@/components/BrakDanych';
import { Zrodlo } from '@/components/Zrodlo';
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

  return (
    <div className="obszar max-w-4xl py-10">
      <p className="text-sm text-atrament-2">
        {f.teryt && f.gmina ? (
          <Link href={`/gmina/${f.teryt}`} className="hover:text-akcent">
            {f.gmina_rodzaj === 'gmina' ? `gmina ${f.gmina}` : f.gmina}
          </Link>
        ) : f.teryt === TERYT_WARSZAWY ? (
          // Warszawa jest w SUDOP jednym miastem (146501), a w danych PKW —
          // osiemnastoma dzielnicami, więc nie ma dla niej naszej strony gminy.
          // Nazwę znamy i ją podajemy; odnośnika nie zmyślamy.
          'Warszawa'
        ) : (
          'beneficjent pomocy publicznej'
        )}
      </p>

      <header className="mt-3">
        <h1 className="szryft text-3xl font-semibold sm:text-4xl">{w.nazwa}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-atrament-2">
          <span className="liczby">{`NIP ${f.nip}`}</span>
          {/*
            Zrodlo opisuje kategorie 3 jako "przedsiebiorstwo nienalezace do
            kategorii okreslonych kodem od 0 do 2" — czyli po ludzku: duze.
          */}
          {f.wielkosc ? <span>{f.wielkosc_kod === '3' ? 'duży przedsiębiorca' : f.wielkosc}</span> : null}
          {f.pkd ? <span>{`PKD ${f.pkd}${f.pkd_nazwa ? ` — ${skroc(f.pkd_nazwa, 60)}` : ''}`}</span> : null}
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{zlote(f.brutto)}</p>
          <p className="mt-1 text-sm font-medium">wartość pomocy brutto</p>
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{liczba(f.przypadkow)}</p>
          <p className="mt-1 text-sm font-medium">
            {f.przypadkow === 1 ? 'przypadek pomocy' : 'przypadków pomocy'}
          </p>
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="szryft text-xl font-semibold">{`${dataKrotko(f.pierwszy)} – ${dataKrotko(f.ostatni)}`}</p>
          <p className="mt-1 text-sm font-medium">zakres dat w naszych danych</p>
          <p className="mt-0.5 text-xs text-atrament-2">{zakresDanych(f)}</p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="szryft text-2xl font-semibold">Przypadki pomocy</h2>
          <Zrodlo adres={`${ZRODLO_SUDOP}/search/aidBeneficiary`} etykieta="sprawdź w SUDOP" />
        </div>
        {przypadki.length < f.przypadkow ? (
          <p className="mt-1 text-sm text-atrament-2">
            {`Pokazujemy ${liczba(przypadki.length)} najnowszych z ${liczba(f.przypadkow)}.`}
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
          {przypadki.map((p, i) => (
            <li key={`${p.dzien}-${i}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="leading-snug font-medium">{skroc(p.przeznaczenie ?? 'przeznaczenie nieokreślone', 130)}</p>
                <Udzielajacy p={p} maStrone={Boolean(p.nip_udzielajacego && zeStrona.has(p.nip_udzielajacego))} />
                <p className="mt-1 text-xs text-atrament-3">
                  {`${dataKrotko(p.dzien)}${p.forma ? ` · ${skroc(p.forma, 60)}` : ''}${p.srodek ? ` · ${skroc(p.srodek, 60)}` : ''}`}
                </p>
                {/*
                  Podstawa prawna i sprawa w Komisji Europejskiej (04.10.2026) —
                  prosba Pawla „czy da sie wejsc glebiej w te pomoc". Oba pola sa
                  w SUDOP; dokumentow (decyzji, umow) rejestr nie udostepnia.
                  Odnosnik do Komisji tylko przy numerze „SA.…" — patrz sprawy-ke.ts.
                */}
                {p.podstawa ? (
                  <p className="mt-1 text-xs leading-relaxed text-atrament-3">{`Podstawa prawna: ${p.podstawa}`}</p>
                ) : null}
                {numerSprawyKE(p.srodek_numer) ? (
                  <a
                    href={adresSprawyKE(numerSprawyKE(p.srodek_numer)!)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex min-h-6 items-center text-xs text-akcent underline underline-offset-4 hover:no-underline"
                  >
                    {`decyzja Komisji Europejskiej w sprawie ${numerSprawyKE(p.srodek_numer)}`}
                  </a>
                ) : null}
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="liczby font-semibold">{zlote(p.brutto)}</p>
                {/*
                  Nominalna bywa inna niz brutto (pozyczka, gwarancja) — pokazujemy
                  ja tylko wtedy, bo powtorzona ta sama liczba tylko myli.
                */}
                {p.nominalna !== null && p.brutto !== null && Math.abs(p.nominalna - p.brutto) > 1 ? (
                  <p className="liczby text-xs text-atrament-2">{`nominalnie ${zlote(p.nominalna)}`}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {przypadki.some((p) => p.nominalna !== null && p.brutto !== null && Math.abs(p.nominalna - p.brutto) > 1) ? (
          <p className="mt-2 text-xs leading-relaxed text-atrament-3">
            Wartość brutto to ekwiwalent dotacji brutto, czyli tyle, ile pomoc jest warta dla firmy.
            Przy dotacji to cała kwota, ale przy pożyczce, gwarancji czy płatnościach rozłożonych
            w czasie bywa niższa niż kwota nominalna. Rejestr podaje obie; sumujemy brutto.
          </p>
        ) : null}

        <WarunkiSudop pobrano={imp?.kiedy ?? null} />

        {!w.osobaPrawna && KONTAKT ? (
          <p className="mt-3 text-xs leading-relaxed text-atrament-3">
            {`Nazwę pokazujemy, bo pojedyncza pomoc przekroczyła ${liczba(PROG_JAWNOSCI_EUR)} euro — te same dane publikuje UOKiK w rejestrze SUDOP. Strony nie zgłaszamy wyszukiwarkom. Jeśli jesteś tą osobą i nie chcesz tego — napisz na ${KONTAKT}. Usuniemy bez pytania o powód.`}
          </p>
        ) : null}
      </section>

      {zamowienia.ogloszen > 0 ? <Zamowienia z={zamowienia} /> : null}

      <p className="mt-10 text-sm text-atrament-2">
        {/*
          ZMIERZONE 22.09.2026: sam `f.teryt` nie wystarczy. Firmy z Warszawy
          mają teryt 146501, którego NIE MA w naszej tabeli gmin (PKW dzieli
          Warszawę na 18 dzielnic) — wychodziło z tego „w gminie null” i odnośnik
          do nieistniejącej strony. Dotyczy 5 484 przypadków pomocy.
        */}
        {f.teryt && f.gmina ? (
          <Link href={`/gmina/${f.teryt}`} className="text-akcent underline underline-offset-4 hover:no-underline">
            {`Zobacz wszystkie publiczne pieniądze w gminie ${f.gmina} →`}
          </Link>
        ) : null}
      </p>
    </div>
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
function Zamowienia({ z }: { z: ZamowieniaFirmy }) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="szryft text-2xl font-semibold">Zamówienia publiczne</h2>
        <Zrodlo adres="https://ted.europa.eu" etykieta="TED — dziennik zamówień UE" />
      </div>
      <p className="mt-1 text-sm text-atrament-2">
        {`${zOdmiana(z.ogloszen, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} o udzieleniu zamówienia, w których ta firma jest wskazana jako wykonawca.`}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{z.sumaSama === null ? '—' : zlote(z.sumaSama)}</p>
          <p className="mt-1 text-sm font-medium">
            {`z ${zOdmiana(z.ogloszenWSumie, 'ogłoszenia', 'ogłoszeń', 'ogłoszeń')} z jednym wykonawcą`}
          </p>
          <p className="mt-0.5 text-xs text-atrament-2">
            {z.ogloszenSama > z.ogloszenWSumie
              ? `${zOdmiana(z.ogloszenSama - z.ogloszenWSumie, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} z jednym wykonawcą zostało poza sumą: bez kwoty w złotych albo z kwotą odrzuconą jako błędna`
              : 'tylko kwoty w złotych'}
          </p>
        </div>
        <div className="rounded-2xl border border-kreska bg-papier-2 p-5 shadow-karta">
          <p className="liczby szryft text-3xl font-semibold">{liczba(z.ogloszenZInnymi)}</p>
          <p className="mt-1 text-sm font-medium">ogłoszeń z kilkoma wykonawcami</p>
          <p className="mt-0.5 text-xs text-atrament-2">
            kwoty nie sumujemy — dotyczy całego ogłoszenia, nie tej firmy
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-kreska rounded-2xl border border-kreska bg-papier-2">
        {z.lista.map((o) => (
          <li key={o.numer} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-medium">{skroc(o.tytul ?? 'bez tytułu w rejestrze', 130)}</p>
              <p className="mt-1 text-sm text-atrament-2">{skroc(o.nabywca ?? '—', 80)}</p>
              <p className="mt-1 text-xs text-atrament-3">
                {`${dataKrotko(o.data)} · ogłoszenie ${o.numer}`}
                {o.wykonawcow > 1 ? ` · ${zOdmiana(o.wykonawcow, 'wykonawca', 'wykonawców', 'wykonawców')}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="liczby font-semibold">
                {o.wartosc === null ? '—' : o.waluta === 'PLN' ? zlote(o.wartosc) : `${liczba(Math.round(o.wartosc))} ${o.waluta ?? ''}`}
              </p>
              <p className="text-xs text-atrament-3">{o.wykonawcow > 1 ? 'całe ogłoszenie' : ''}</p>
              <a
                className="text-xs text-akcent underline underline-offset-4 hover:no-underline"
                href={`https://ted.europa.eu/pl/notice/${o.numer}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                ogłoszenie (PDF)
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-atrament-3">
        Źródłem jest TED, unijny dziennik zamówień publicznych — trafiają tam zamówienia
        powyżej progów unijnych, a nie wszystkie. Kwota dotyczy całego ogłoszenia, ze
        wszystkimi częściami i wykonawcami; przy ogłoszeniach z kilkoma wykonawcami nie
        da się z niej wyczytać, ile przypadło tej firmie.
      </p>
    </section>
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
  if (!p.udzielajacy?.trim()) return <p className="mt-1 text-sm text-atrament-2">—</p>;
  const jawny = nazwaPodmiotuJawna(p.udzielajacy, p.typ_udzielajacego);
  const nazwa = nazwaDoPokazania(p.udzielajacy, { typRegon: p.typ_udzielajacego });
  return (
    <p className={`mt-1 text-sm ${nazwa.pominieta ? 'text-atrament-3 italic' : 'text-atrament-2'}`}>
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
