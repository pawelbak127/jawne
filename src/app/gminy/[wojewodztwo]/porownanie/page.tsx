import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { bazaDostepna, porownanieGmin, wojewodztwaGmin } from '@/lib/dane';
import { dataKrotko, wszystkieDniRejestru, zOdmiana } from '@/lib/format';
import { adresWojewodztwa } from '@/lib/tekst';
import { mediana } from '@/lib/porownanie-gmin';
import { BrakDanych } from '@/components/BrakDanych';
import { PorownanieGmin, type KolumnaPorownania, type KrotkaPorownania } from '@/components/PorownanieGmin';
import { WarunkiSudop, ZRODLO_SUDOP } from '@/components/WarunkiSudop';
import { Okruszek, Podstawa, Wypis } from '@/components/Szablon';

/*
 * Osobna strona, nie sekcja spisu gmin: tabela z 315 gminami mazowieckimi
 * to ok. 115 kB HTML-a na wojewodztwo (zmierzone na lodzkim, 177 gmin),
 * a spis odwiedza ten, kto szuka swojej gminy (pulapka 54). Przy okazji
 * zestawienie ma wlasny adres, ktory mozna komus wyslac.
 */
export async function generateStaticParams(): Promise<{ wojewodztwo: string }[]> {
  return [];
}

const ZRODLO_GUS_BUDZET = 'https://bdl.stat.gov.pl/bdl/dane/podgrup/temat/G423';
const ZRODLO_FE_2127 = 'https://dane.gov.pl/pl/dataset/13939';

function zAdresu(param: string): string | null {
  return wojewodztwaGmin().find((w) => adresWojewodztwa(w.wojewodztwo) === param.toLowerCase())?.wojewodztwo ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ wojewodztwo: string }> }): Promise<Metadata> {
  const { wojewodztwo } = await params;
  const nazwa = bazaDostepna() ? zAdresu(wojewodztwo) : null;
  if (!nazwa) return { title: 'Nie ma takiego województwa' };
  return {
    title: `Porównanie gmin — woj. ${nazwa}`,
    description: `Dochody, dofinansowanie z UE i pomoc publiczna na mieszkańca we wszystkich gminach województwa ${nazwa}, z medianą.`,
  };
}

export default async function PorownanieGminWojewodztwa({ params }: { params: Promise<{ wojewodztwo: string }> }) {
  if (!bazaDostepna()) return <BrakDanych />;
  const { wojewodztwo } = await params;
  const nazwa = zAdresu(wojewodztwo);
  if (!nazwa) notFound();

  const por = porownanieGmin(nazwa);
  const kolumny: (KolumnaPorownania & { z: number })[] = [];
  const dodaj = (miara: KolumnaPorownania['miara'], naglowek: string, etykieta: string) => {
    const m = mediana(por.wiersze.map((w) => w[miara]));
    if (m) kolumny.push({ miara, naglowek, etykieta, mediana: m.wartosc, z: m.z });
  };
  if (por.rokBudzetu) dodaj('dochody', `Dochody na mieszkańca, ${por.rokBudzetu}`, 'dochody');
  if (por.jestUe) dodaj('ue', 'UE 2021–2027 na mieszkańca', 'UE');
  if (por.dniPomocy) dodaj('pomoc', `Pomoc publiczna na mieszkańca, ${zOdmiana(por.dniPomocy.dni, 'dzień', 'dni', 'dni')}`, 'pomoc');
  const krotki: KrotkaPorownania[] = por.wiersze.map((w) => [w.teryt, w.nazwa, w.rodzaj, w.powiat, w.osob, w.dochody, w.ue, w.pomoc]);

  return (
    <div className="obszar">
      <Okruszek
        ogniwa={[
          { nazwa: 'Pieniądze publiczne' },
          { adres: '/gminy', nazwa: 'Gminy' },
          { adres: `/gminy/${adresWojewodztwa(nazwa)}`, nazwa: `woj. ${nazwa}` },
          { nazwa: 'Porównanie' },
        ]}
      />
      <Wypis
        tytul={`Porównanie gmin — woj. ${nazwa}`}
        podtytul={`${zOdmiana(por.wiersze.length, 'gmina', 'gminy', 'gmin')}, każda liczba na mieszkańca, z medianą województwa.`}
      />
      {/*
        PORÓWNANIE (14.10.2026) — src/lib/porownanie-gmin.ts. Bez miejsc
        i bez ocen: kolejnosc ustawia czytelnik, a mediana stoi na wierzchu
        przy kazdej kolejnosci. Mediany zgodne z tymi na stronach gmin
        (sprawdzone na 16 wojewodztwach x 3 miary, 0 roznic).
      */}
      {kolumny.length ? (
        <section className="mt-6 max-w-5xl">
          <p className="max-w-(--miara) text-sm leading-relaxed text-atrament-2">
            Te same liczby co na stronach gmin, wszystkie na mieszkańca, obok siebie. Kolejność
            wybierasz sam — to nie jest ranking: kwota na mieszkańca nie mówi, czy gmina
            gospodaruje dobrze, a w pomocy publicznej jedna duża firma potrafi dać większość kwoty
            (szczegóły na stronie gminy).
          </p>
          <ul className="mt-3 max-w-(--miara) space-y-1 text-sm leading-relaxed text-atrament-2">
            {kolumny.map((k) => (
              <li key={k.miara}>
                {k.miara === 'dochody' ? `Dochody: budżet gminy za ${por.rokBudzetu} r. ÷ mieszkańcy. ` : null}
                {k.miara === 'ue' ? 'UE 2021–2027: dofinansowanie z UE projektów realizowanych tylko w tej gminie; gmina bez takiego projektu ma zero. ' : null}
                {k.miara === 'pomoc' && por.dniPomocy ? `Pomoc publiczna: wartość brutto dla firm z siedzibą w gminie, z ${zOdmiana(por.dniPomocy.dni, 'dnia', 'dni', 'dni')} już ustalonych (${dataKrotko(por.dniPomocy.od)}–${dataKrotko(por.dniPomocy.do)}); gmina bez przypadku ma zero; dane w rejestrze mogą ulec zmianie.${wszystkieDniRejestru(por.dniPomocy.dni, por.dniPomocy.od, por.dniPomocy.do) ? '' : ' Gminy pobrane w całości mają na swoich stronach pełną historię — tu, jak wszystkie, te same dni.'} ` : null}
                {`Mediana z ${zOdmiana(k.z, 'gminy', 'gmin', 'gmin')}. `}
                {k.miara === 'dochody' ? <Podstawa adres={ZRODLO_GUS_BUDZET} nazwa="GUS BDL" data={String(por.rokBudzetu)} /> : null}
                {k.miara === 'ue' ? <Podstawa adres={ZRODLO_FE_2127} nazwa="lista projektów FE" /> : null}
                {k.miara === 'pomoc' ? <Podstawa adres={ZRODLO_SUDOP} nazwa="SUDOP, UOKiK" /> : null}
              </li>
            ))}
          </ul>
          <PorownanieGmin krotki={krotki} kolumny={kolumny.map(({ miara, naglowek, etykieta, mediana: m }) => ({ miara, naglowek, etykieta, mediana: m }))} />
          {por.dniPomocy ? <div className="mt-4"><WarunkiSudop pobrano={null} /></div> : null}
        </section>
      ) : (
        <p className="mt-6 text-atrament-2">Nie mamy jeszcze żadnej miary dla gmin tego województwa — porównanie pojawi się po imporcie budżetów, list FE albo pomocy publicznej.</p>
      )}
    </div>
  );
}
