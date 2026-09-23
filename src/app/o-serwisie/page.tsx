import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'O serwisie',
  description: 'Co robimy, czego nie robimy i jak nas sprawdzić.',
};

export default function StronaOSerwisie() {
  return (
    <div className="obszar max-w-2xl py-10">
      <h1 className="szryft text-3xl font-semibold sm:text-4xl">O serwisie</h1>

      <div className="mt-6 space-y-5 leading-relaxed text-atrament-2">
        <p>
          <span className="font-medium text-atrament">jawne</span> pokazuje dane publiczne
          o Sejmie: kto jak głosował, kto zasiada w izbie i co dzieje się z ustawami.
          Wszystko pochodzi z oficjalnych rejestrów Kancelarii Sejmu i przy każdej
          liczbie znajdziesz odnośnik do źródła.
        </p>
        <p>
          Na stronie każdej gminy łączymy to z publicznymi pieniędzmi: projektami
          z Funduszy Europejskich (listy Ministerstwa Funduszy i Polityki Regionalnej)
          i pomocą publiczną dla firm z bazy SUDOP prowadzonej przez UOKiK —
          dzień po dniu dla całego kraju, bo historię dociągamy nocami. Kwoty przeliczamy na mieszkańca według GUS,
          a przypisanie gminy do okręgu wyborczego bierzemy z wyników PKW z 2023 roku.
        </p>
        <p>
          Serwis prowadzi jedna osoba prywatnie. Nie jesteśmy powiązani z żadną
          instytucją publiczną ani z żadnym klubem poselskim.
        </p>
      </div>

      <h2 className="szryft mt-10 text-2xl font-semibold">Czego tu nie ma</h2>
      <ul className="mt-4 space-y-4 leading-relaxed text-atrament-2">
        <li>
          <span className="font-medium text-atrament">Ocen i rankingów „dobrych” posłów.</span>{' '}
          Nie przyznajemy odznak ani punktów. Z tych samych danych da się ułożyć
          ranking pokazujący dokładnie przeciwne rzeczy, w zależności od tego, co
          się policzy — więc liczenie zostawiamy czytelnikowi.
        </li>
        <li>
          <span className="font-medium text-atrament">Powodów nieobecności.</span>{' '}
          Rejestr ich nie podaje. Wyjazd służbowy, choroba i zwykła nieobecność
          wyglądają w danych identycznie, więc nie dopisujemy posłowi motywu,
          którego nie znamy.
        </li>
        <li>
          <span className="font-medium text-atrament">Nazwisk osób prywatnych.</span>{' '}
          We wnioskach o uchylenie immunitetu z oskarżenia prywatnego nie powtarzamy
          nazwisk oskarżycieli ani ich pełnomocników. Rejestr Sejmu je podaje, ale to
          my sprawiamy, że da się je łatwo wyszukać. Nazwisko posła zostaje, a pełny
          tytuł jest pod odnośnikiem do rejestru.
        </li>
        <li>
          <span className="font-medium text-atrament">Nazw beneficjentów, które mogą być osobą.</span>{' '}
          Dotacje i pomoc publiczną dostają też rolnicy i jednoosobowe firmy, których
          nazwą jest imię i nazwisko. Nazwę pokazujemy tylko wtedy, gdy widać w niej
          formę prawną albo instytucję (np. „sp. z o.o.”, „gmina”, „szpital”) i nie ma
          w niej imienia z rejestru PESEL. Pozostałych nie wymieniamy, ale zawsze
          podajemy, ilu ich jest, i wliczamy ich kwoty do sum.
        </li>
        <li>
          <span className="font-medium text-atrament">Barw partyjnych.</span>{' '}
          Kolory na wykresach są nasze i służą wyłącznie rozróżnieniu bloków.
          Loga klubów dają pięć podobnych czerwieni i trzy granaty — na ich
          podstawie nie da się narysować czytelnego półkola izby.
        </li>
      </ul>

      <h2 className="szryft mt-10 text-2xl font-semibold">Jak nas sprawdzić</h2>
      <p className="mt-4 leading-relaxed text-atrament-2">
        Każda liczba ma obok mały odnośnik prowadzący wprost do rejestru, z którego
        pochodzi. Jeśli coś się nie zgadza, źródło rozstrzyga — nie my. Na stronie{' '}
        <Link href="/stan" className="text-akcent underline underline-offset-4 hover:no-underline">
          stanu danych
        </Link>{' '}
        piszemy też, czego jeszcze nie zaimportowaliśmy.
      </p>
    </div>
  );
}
