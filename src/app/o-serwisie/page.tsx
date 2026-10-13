import type { Metadata } from 'next';
import Link from 'next/link';
import { KONTAKT } from '@/lib/adres';
import { liczba } from '@/lib/format';
import { PROG_JAWNOSCI_EUR } from '@/lib/prywatnosc';
import { Dzial, Okruszek, Wypis } from '@/components/Szablon';

export const metadata: Metadata = {
  title: 'O serwisie',
  description: 'Co robimy, czego nie robimy i jak nas sprawdzić.',
};

/*
 * Cel odnosnika „Jak to dziala” ze zdania o serwisie na KAZDEJ stronie
 * szczegolowej (Szablon.tsx, Wypis). Kto tu trafia, przyszedl z wyszukiwarki
 * albo z mediow spolecznosciowych i chce wiedziec, czy moze nam ufac.
 * Do 13.10.2026 ta strona mowila „jawne” (stara nazwa), „historie dociagamy
 * nocami” (od 25.09 praca ciagla) i opisywala regule nazw sprzed REGON-u.
 */
export default function StronaOSerwisie() {
  return (
    <div className="obszar">
      <Okruszek ogniwa={[{ nazwa: 'O serwisie' }]} />
      <Wypis
        tytul="O serwisie"
        podtytul="Co robimy, czego nie robimy i jak nas sprawdzić."
      />

      <Dzial id="co" nr={1} tytul="Co tu jest">
        <div className="mt-3 max-w-[40em] space-y-4 leading-relaxed">
          <p>
            <b>zrejestru.pl</b> pokazuje dane publiczne o Sejmie: kto jak głosował, kto zasiada
            w izbie, co dzieje się z ustawami. Wszystko pochodzi z oficjalnych rejestrów
            Kancelarii Sejmu i przy każdej liczbie jest odnośnik do źródła.
          </p>
          <p>
            Na stronie każdej gminy łączymy to z publicznymi pieniędzmi: budżetem gminy
            i tym, na co go wydaje (GUS), projektami z Funduszy Europejskich (listy
            Ministerstwa Funduszy i Polityki Regionalnej), pomocą publiczną dla firm z bazy
            SUDOP prowadzonej przez UOKiK — pobieraną dzień po dniu dla całego kraju,
            a historię dociągamy stopniowo — oraz zamówieniami publicznymi z unijnego
            dziennika TED. Te same liczby można obejrzeć na <Link href="/mapa">mapie wszystkich gmin</Link>.
            Kwoty przeliczamy na mieszkańca według GUS, a przypisanie gminy do okręgu
            wyborczego bierzemy z wyników PKW z 2023 roku.
          </p>
          <p>
            Serwis prowadzi jedna osoba prywatnie. Nie jesteśmy powiązani z żadną instytucją
            publiczną, z urzędami, których dane pokazujemy, ani z żadnym klubem poselskim.
          </p>
        </div>
      </Dzial>

      <Dzial id="czego-nie" nr={2} tytul="Czego tu nie ma">
        <ul className="pozycje">
          <li>
            <div className="min-w-0">
              <p className="font-semibold">Ocen i rankingów „dobrych” posłów.</p>
              <p className="meta mt-1">
                Nie przyznajemy odznak ani punktów. Z tych samych danych da się ułożyć ranking
                pokazujący dokładnie przeciwne rzeczy, w zależności od tego, co się policzy —
                więc liczenie zostawiamy czytelnikowi.
              </p>
            </div>
          </li>
          <li>
            <div className="min-w-0">
              <p className="font-semibold">Powodów nieobecności.</p>
              <p className="meta mt-1">
                Rejestr ich nie podaje. Wyjazd służbowy, choroba i zwykła nieobecność wyglądają
                w danych identycznie, więc nie dopisujemy posłowi motywu, którego nie znamy.
                Podajemy tylko to, co rejestr mówi sam: czy dzień nieobecności uznano za usprawiedliwiony.
              </p>
            </div>
          </li>
          <li>
            <div className="min-w-0">
              <p className="font-semibold">Nazwisk osób prywatnych.</p>
              <p className="meta mt-1">
                We wnioskach o uchylenie immunitetu z oskarżenia prywatnego nie powtarzamy nazwisk
                oskarżycieli ani ich pełnomocników. Rejestr Sejmu je podaje, ale to my sprawiamy,
                że da się je łatwo wyszukać. Nazwisko posła zostaje, a pełny tytuł jest pod
                odnośnikiem do rejestru.
              </p>
            </div>
          </li>
          <li>
            <div className="min-w-0">
              <p className="font-semibold">Nazw beneficjentów, które mogą być osobą.</p>
              <p className="meta mt-1">
                Pomoc publiczną dostają też rolnicy i jednoosobowe firmy, których nazwą jest imię
                i nazwisko. Nazwę pokazujemy, gdy według rejestru REGON podmiot jest osobą prawną,
                a gdy REGON go nie zna — gdy w nazwie widać formę prawną albo instytucję i nie ma
                w niej imienia z rejestru PESEL.
                {KONTAKT
                  ? ` Nazwę osoby fizycznej pokazujemy tylko wtedy, gdy pojedyncza pomoc przekroczyła ${liczba(PROG_JAWNOSCI_EUR)} euro — to próg z unijnych przepisów o publikacji pomocy — i można nam zgłosić sprzeciw.`
                  : ''}
                {' '}Pozostałych nie wymieniamy, ale zawsze podajemy, ilu ich jest, i wliczamy ich
                kwoty do sum. <Link href="/prywatnosc">Szczegóły w polityce prywatności</Link>.
              </p>
            </div>
          </li>
          <li>
            <div className="min-w-0">
              <p className="font-semibold">Barw partyjnych.</p>
              <p className="meta mt-1">
                Kolory na wykresach są nasze i służą wyłącznie rozróżnieniu bloków. Loga klubów
                dają pięć podobnych czerwieni i trzy granaty — na ich podstawie nie da się
                narysować czytelnego wykresu izby.
              </p>
            </div>
          </li>
        </ul>
      </Dzial>

      <Dzial id="sprawdz" nr={3} tytul="Jak nas sprawdzić">
        <div className="mt-3 max-w-[40em] space-y-4 leading-relaxed">
          <p>
            Każda liczba ma obok odnośnik prowadzący wprost do rejestru, z którego pochodzi.
            Jeśli coś się nie zgadza, źródło rozstrzyga — nie my.
          </p>
          <p>
            Na stronie <Link href="/stan">stanu danych</Link> piszemy, co i kiedy pobraliśmy
            i czego jeszcze nie mamy.
          </p>
        </div>
      </Dzial>
    </div>
  );
}
