import Link from 'next/link';
import type { UstawaZWynikiem } from '@/lib/dane';
import { dataKrotko, skroc } from '@/lib/format';
import { bezNazwiskOsobPrywatnych } from '@/lib/prywatnosc';
import { tytulUstawy } from '@/lib/tytul-ustawy';
import { PaseczekGlosow } from '@/components/PaseczekGlosow';

const DLUGOSC_TYTULU = 150;

/**
 * Karta ustawy na stronie glownej: na wierzchu komisja z rejestru, stan, tytul
 * i wynik glosowania, a metryczka i opis po rozwinieciu.
 *
 * `<details>` nie ma atrybutu `open` nawet w widoku „Wypis z rejestru”: strona
 * jest statyczna, a styl wybiera skrypt w przegladarce. Wypis rozwija karty
 * w CSS (`::details-content`, globals.css), wiec dziala takze po przelaczeniu
 * widoku i po przejsciu na inna strone. Starsza przegladarka pokaze w Wypisie
 * zwykly przycisk rozwijania.
 *
 * Link do glosowania zostaje na wierzchu: to droga do sprawdzenia liczb z paska
 * (zasada 1), a nie szczegol.
 */
export function KartaUstawy({ ustawa }: { ustawa: UstawaZWynikiem }) {
  const { p, glosowanie: g, komisje } = ustawa;
  const tytul = bezNazwiskOsobPrywatnych(p.tytul);
  const t = tytulUstawy(tytul);
  const opis = p.opis ? bezNazwiskOsobPrywatnych(p.opis.charAt(0).toLocaleUpperCase('pl-PL') + p.opis.slice(1)) : null;
  const pierwsza = komisje[0];

  return (
    <li className="karta-ustawy">
      <div className="min-w-0">
        <p className="kicker">
          {pierwsza ? (
            <Link href={`/komisja/${pierwsza.kod}`} prefetch={false} className="znacznik-tematu" title="Pierwsza komisja przypisana do projektu w rejestrze Sejmu">
              {pierwsza.nazwa}
            </Link>
          ) : null}
          <span>{p.data_zakonczenia ? `Uchwalona ${dataKrotko(p.data_zakonczenia)}` : 'Uchwalona'}</span>
        </p>
        <Link href={`/ustawa/${p.numer}`} className="tytul-poz">{skroc(t.krotki, DLUGOSC_TYTULU)}</Link>
        {g ? (
          <>
            <PaseczekGlosow g={g} className="mt-3 max-w-xl" zOpisem />
            <p className="meta mt-1">
              <Link href={`/glosowanie/${g.posiedzenie}-${g.numer}`}>{`Głosowanie nad całością, ${dataKrotko(g.data)} →`}</Link>
            </p>
          </>
        ) : null}
        <details className="szczegoly-ustawy">
          <summary>{opis ? 'Szczegóły i opis z rejestru' : 'Szczegóły z rejestru'}</summary>
          <div className="tresc">
            <p className="meta">{[t.autor ? `projekt ${t.autor}` : null, `druk ${p.numer}`].filter(Boolean).join(' · ')}</p>
            {komisje.length > 1 ? <p className="meta">{`Komisje: ${komisje.map((k) => k.nazwa).join(', ')}`}</p> : null}
            {t.krotki.length > DLUGOSC_TYTULU ? <p className="streszczenie">{tytul}</p> : null}
            {opis ? (
              <p className="streszczenie">
                {opis}
                <span className="etykieta-zrodla"> — opis z rejestru</span>
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </li>
  );
}
