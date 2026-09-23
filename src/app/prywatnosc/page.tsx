import type { Metadata } from 'next';
import Link from 'next/link';
import { KONTAKT } from '@/lib/adres';
import { PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { liczba } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Polityka prywatności',
  description: 'Jakie dane osobowe pokazujemy, skąd je bierzemy, na jakiej podstawie i jak zgłosić sprzeciw.',
};

/** Data ostatniej zmiany treści — widoczna, bo polityka bez daty nic nie mówi. */
const AKTUALIZACJA = '23 września 2026';

/**
 * Polityka prywatnosci.
 *
 * Pisana pod to, co serwis NAPRAWDE robi, a nie pod szablon: nie mamy
 * ciasteczek analitycznych, nie prowadzimy dziennika wejsc i nie mamy kont
 * uzytkownikow. Kazde zdanie o naszych danych da sie sprawdzic w kodzie
 * albo w konfiguracji serwera (`deploy/Caddyfile`).
 *
 * MIEJSCA DO UZUPELNIENIA przed premiera sa oznaczone <Uzupelnij>: nazwa
 * i adres administratora oraz adres kontaktowy (JAWNE_KONTAKT). Bez adresu
 * kontaktowego prog jawnosci nazwisk i tak nie dziala — patrz prywatnosc.ts.
 */
export default function StronaPrywatnosci() {
  return (
    <div className="obszar max-w-2xl py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">Polityka prywatności</h1>
      <p className="mt-2 text-sm text-atrament-3">{`Ostatnia zmiana: ${AKTUALIZACJA}.`}</p>

      <div className="mt-6 space-y-5 leading-relaxed text-atrament-2">
        <p>
          Ten serwis pokazuje dane z rejestrów publicznych. Część z nich to dane
          osobowe — nazwiska posłów, a w rejestrach o pieniądzach także nazwy firm,
          które bywają imieniem i nazwiskiem przedsiębiorcy. Poniżej jest napisane,
          co z nimi robimy, czego nie robimy i jak zgłosić sprzeciw.
        </p>
        <p>
          O odwiedzających nie zbieramy niczego: nie ma kont, nie ma formularzy,
          nie ma ciasteczek śledzących, nie ma narzędzi analitycznych i nie
          prowadzimy dziennika wejść na serwerze.
        </p>
      </div>

      <Sekcja tytul="Kto jest administratorem">
        <p>
          <Uzupelnij>imię i nazwisko albo nazwa podmiotu prowadzącego serwis</Uzupelnij>,{' '}
          <Uzupelnij>adres korespondencyjny</Uzupelnij>.
        </p>
        <p>
          Serwis prowadzi jedna osoba prywatnie. Nie jesteśmy powiązani z żadną
          instytucją publiczną, urzędem, którego dane pokazujemy, ani z klubem poselskim.
        </p>
        <p id="kontakt">
          Kontakt we wszystkich sprawach dotyczących danych osobowych:{' '}
          {KONTAKT ? (
            <a className="text-akcent underline underline-offset-4 hover:no-underline" href={`mailto:${KONTAKT}`}>{KONTAKT}</a>
          ) : (
            <Uzupelnij>adres e-mail (zmienna JAWNE_KONTAKT)</Uzupelnij>
          )}.
        </p>
      </Sekcja>

      <Sekcja tytul="Jakie dane pokazujemy i skąd je mamy">
        <p>
          Wszystkie dane pochodzą z publicznie dostępnych rejestrów. Nie zbieramy ich
          od osób, których dotyczą, i nie kupujemy ich od nikogo. To znaczy, że mamy
          wobec tych osób obowiązek informacyjny z art. 14 RODO — i ta strona go wypełnia.
        </p>
        <ul className="ml-5 list-disc space-y-3">
          <li>
            <span className="font-medium text-atrament">Posłowie i ich głosowania</span> —
            imię, nazwisko, klub, okręg, zawód, wykształcenie, rok urodzenia, wyniki
            głosowań imiennych, zdjęcie. Źródło:{' '}
            <Zewnetrzny adres="https://api.sejm.gov.pl/sejm/openapi/">API Kancelarii Sejmu</Zewnetrzny>.
            To dane osób pełniących funkcje publiczne, publikowane przez Sejm.
          </li>
          <li>
            <span className="font-medium text-atrament">Beneficjenci pomocy publicznej</span> —
            nazwa (bywa nią imię i nazwisko), NIP, gmina siedziby, kwoty i podstawy
            udzielonej pomocy, a także nazwy podmiotów, które pomocy udzieliły. Źródło:{' '}
            <Zewnetrzny adres="https://sudop.uokik.gov.pl">SUDOP, prowadzony przez UOKiK</Zewnetrzny>.
          </li>
          <li>
            <span className="font-medium text-atrament">Beneficjenci Funduszy Europejskich</span> —
            nazwa, tytuł i wartość projektu, miejsce realizacji. Źródło:{' '}
            <Zewnetrzny adres="https://dane.gov.pl/pl/dataset/13939">
              listy projektów Ministerstwa Funduszy i Polityki Regionalnej
            </Zewnetrzny>.
          </li>
          <li>
            <span className="font-medium text-atrament">Dane o gminach</span> (ludność,
            budżety, wskaźniki) z{' '}
            <Zewnetrzny adres="https://bdl.stat.gov.pl">GUS</Zewnetrzny> i przypisanie gmin
            do okręgów z{' '}
            <Zewnetrzny adres="https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/pl/dane_w_arkuszach">PKW</Zewnetrzny>{' '}
            — to nie są dane osobowe.
          </li>
        </ul>
      </Sekcja>

      <Sekcja tytul="Po co i na jakiej podstawie">
        <p>
          Celem jest jawność wydatków publicznych i działania Sejmu: żeby każdy mógł
          sprawdzić, jak głosuje jego poseł i jakie publiczne pieniądze trafiły do jego
          gminy — z odnośnikiem do rejestru przy każdej liczbie.
        </p>
        <p>
          Podstawą prawną jest <span className="font-medium text-atrament">prawnie
          uzasadniony interes</span> (art. 6 ust. 1 lit. f RODO): informowanie o sprawach
          publicznych i kontrola społeczna wydatkowania środków publicznych. Interes ten
          zważyliśmy z prawami osób, których dane pokazujemy —{' '}
          <Zewnetrzny adres="https://github.com/">test równowagi</Zewnetrzny> jest spisany
          i udostępniamy go na żądanie pod adresem kontaktowym.
        </p>
        <p>
          Nie prosimy o zgodę, bo nie na zgodzie opieramy przetwarzanie; nie realizujemy
          też żadnego zadania publicznego — nie jesteśmy urzędem.
        </p>
      </Sekcja>

      <Sekcja tytul="Czego NIE robimy z tymi danymi">
        <ul className="ml-5 list-disc space-y-2">
          <li>Nie budujemy ocen, rankingów ani punktacji osób.</li>
          <li>Nie profilujemy i nie podejmujemy żadnych decyzji automatycznych wobec kogokolwiek.</li>
          <li>Nie łączymy tych danych z danymi z innych źródeł w celu opisania osoby.</li>
          <li>Nie sprzedajemy ich, nie udostępniamy nikomu i nie prowadzimy reklamy.</li>
          <li>Nie zgadujemy powodów: rejestr nie podaje, dlaczego posła nie było, więc my też nie.</li>
        </ul>
      </Sekcja>

      <Sekcja tytul="Nazwiska osób prywatnych — co ukrywamy z własnej woli">
        <p>
          Rejestry publikują więcej, niż my pokazujemy. Stosujemy własne ograniczenia,
          których prawo nie wymaga:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            W sprawach z oskarżenia prywatnego nazwiska oskarżycieli i ich pełnomocników
            znikają z tytułów, z podglądów linku i z naszej wyszukiwarki. Nazwisko posła,
            którego sprawa dotyczy, zostaje. Taka strona ma <code>noindex</code> i mówi
            o tym wprost.
          </li>
          <li>
            Nazwę beneficjenta pomocy publicznej pokazujemy, gdy widać w niej formę prawną
            albo instytucję. Jeśli nazwa może być imieniem i nazwiskiem osoby fizycznej,
            nie pokazujemy jej ani na stronie, ani w wyszukiwarce — podajemy natomiast,
            ilu takich podmiotów dotyczy zestawienie, a ich kwoty wliczamy do sum.
          </li>
          <li>
            Wyjątkiem jest pomoc przekraczająca{' '}
            <span className="font-medium text-atrament">{`${liczba(PROG_JAWNOSCI_EUR)} EUR`}</span> —
            próg, od którego same przepisy unijne o pomocy publicznej nakazują publikację
            danych beneficjenta. Powyżej niego pokazujemy nazwę także wtedy, gdy jest
            nazwiskiem, ale tylko pod warunkiem, że działa adres do zgłoszenia sprzeciwu.
            {KONTAKT ? '' : ' Dziś ten adres nie jest ustawiony, więc próg nie działa i żadne takie nazwisko nie jest pokazywane.'}
          </li>
        </ul>
      </Sekcja>

      <Sekcja tytul="Twoje prawa">
        <p>
          Masz prawo do dostępu do swoich danych, ich sprostowania, usunięcia,
          ograniczenia przetwarzania oraz — co tu najważniejsze —{' '}
          <span className="font-medium text-atrament">sprzeciwu wobec przetwarzania
          (art. 21 RODO)</span>.
        </p>
        <p>
          Sprzeciw rozpatrujemy indywidualnie i bez zbędnej zwłoki, najpóźniej w ciągu
          miesiąca. Jeśli chodzi o nazwę, która może być nazwiskiem osoby fizycznej,
          usuwamy ją z serwisu, a kwotę zostawiamy w zestawieniach zbiorczych — tak,
          żeby sumy dalej się zgadzały, a osoby nie dało się z nich rozpoznać.
        </p>
        <p>
          <span className="font-medium text-atrament">Czego nie możemy zrobić:</span> nie
          usuniemy Twoich danych z rejestru źródłowego, bo go nie prowadzimy. Sprostowanie
          błędu w rejestrze trzeba zgłosić do jego administratora (UOKiK, Kancelaria Sejmu,
          ministerstwo) — my pokazujemy to, co w nim jest, i przy każdej liczbie zostawiamy
          odnośnik, żeby dało się to sprawdzić.
        </p>
        <p>
          Masz też prawo wnieść skargę do{' '}
          <Zewnetrzny adres="https://uodo.gov.pl">Prezesa Urzędu Ochrony Danych Osobowych</Zewnetrzny>.
        </p>
      </Sekcja>

      <Sekcja tytul="Jak długo trzymamy dane">
        <p>
          Tak długo, jak są w rejestrze źródłowym i jak długo istnieje serwis. Dane
          o pomocy publicznej odświeżamy codziennie; gdy urząd usunie wpis, zniknie on
          także u nas przy kolejnym pobraniu. Surowe odpowiedzi z rejestrów trzymamy,
          żeby dało się odtworzyć każdą liczbę i pokazać, skąd się wzięła.
        </p>
      </Sekcja>

      <Sekcja tytul="Kto jeszcze ma dostęp">
        <p>
          Serwis działa na wynajętym serwerze we{' '}
          <span className="font-medium text-atrament">Frankfurcie nad Menem (Niemcy)</span>;
          dostawca infrastruktury jest podmiotem przetwarzającym. Dane nie są przekazywane
          poza Europejski Obszar Gospodarczy. Nie korzystamy z zewnętrznych narzędzi
          analitycznych, reklamowych ani z sieci dostarczania treści, które widziałyby
          ruch odwiedzających.
        </p>
      </Sekcja>

      <Sekcja tytul="Ciasteczka i pamięć przeglądarki">
        <p>
          Nie używamy ciasteczek. Jedyne, co zapisujemy w Twojej przeglądarce, to wybór
          motywu (jasny/ciemny) w pamięci lokalnej urządzenia. Ta informacja nigdy nie
          trafia na nasz serwer i możesz ją usunąć, czyszcząc dane witryny.
        </p>
      </Sekcja>

      <Sekcja tytul="Zmiany">
        <p>
          Zmiany tej polityki opisujemy z datą, a historia zmian jest publiczna razem
          z kodem serwisu. Nie zmieniamy jej wstecz.
        </p>
      </Sekcja>

      <p className="mt-10 text-sm text-atrament-2">
        <Link href="/o-serwisie" className="text-akcent underline underline-offset-4 hover:no-underline">
          Zobacz też: o serwisie, czego tu nie ma i jak nas sprawdzić →
        </Link>
      </p>
    </div>
  );
}

function Sekcja({ tytul, children }: { tytul: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="szryft text-2xl font-semibold">{tytul}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-atrament-2">{children}</div>
    </section>
  );
}

/** Miejsce do uzupelnienia przed premiera — ma rzucac sie w oczy, nie chowac. */
function Uzupelnij({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-akcent-slaby px-1.5 py-0.5 text-sm font-medium text-akcent">
      {`[do uzupełnienia: ${children}]`}
    </span>
  );
}

function Zewnetrzny({ adres, children }: { adres: string; children: React.ReactNode }) {
  return (
    <a className="text-akcent underline underline-offset-4 hover:no-underline" href={adres} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
