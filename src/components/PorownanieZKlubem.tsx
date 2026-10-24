import Link from 'next/link';
import { stylGlosu } from '@/lib/barwy-glosu';
import { dataSlownie, skroc } from '@/lib/format';
import { etykieta as etykietaGlosu } from '@/lib/glosy';
import { MIN_RESZTY, type Odstepstwo } from '@/lib/niezaleznosc';
import { opisJednaLinia } from '@/lib/opis-glosowania';

/**
 * Glosowania, w ktorych posel zaglosowal inaczej niz reszta klubu — wspolne dla
 * strony posla (8 najnowszych) i pelnej listy (/posel/[slug]/inaczej), zeby obie
 * mowily to samo i tak samo liczyly.
 */
export function ListaOdstepstw({ odstepstwa, klub }: { odstepstwa: readonly Odstepstwo[]; klub: string | null }) {
  return (
    <ul className="pozycje">
      {odstepstwa.map((o) => (
        <li key={`${o.posiedzenie}-${o.numer}`}>
          <div className="min-w-0">
            <p className="meta">{`${dataSlownie(o.data)}${o.klub_id !== klub ? ` · wtedy w klubie ${o.klub_id}` : ''}`}</p>
            <Link href={`/glosowanie/${o.posiedzenie}-${o.numer}`} className="tytul-poz">{skroc(opisJednaLinia(o), 140)}</Link>
            <p className="meta mt-1 flex flex-wrap gap-x-4">
              <span><span className="miejsce-probka kropka" style={stylGlosu(o.glos)} />{`poseł: ${etykietaGlosu(o.glos).krotka}`}</span>
              <span><span className="miejsce-probka kropka" style={stylGlosu(o.wiekszosc)} />{`reszta klubu: ${etykietaGlosu(o.wiekszosc).krotka}`}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Jak liczymy „inaczej niz klub” — te same zdania na obu stronach. */
export function MetodaPorownania() {
  return (
    <ul>
      <li>Porównujemy tylko głosy „za”, „przeciw” i „wstrzymał się”. Nieobecność nie jest stanowiskiem.</li>
      <li>Punktem odniesienia jest najczęstszy głos pozostałych członków klubu — bez samego posła.</li>
      <li>{`Głosowanie liczymy, gdy reszta klubu oddała co najmniej ${MIN_RESZTY} głosy i miała jeden wyraźnie najczęstszy głos. Przy remisie nie ma z czym porównać.`}</li>
      <li>Posłowie niezrzeszeni nie tworzą klubu, więc ich głosów nie porównujemy.</li>
      <li>Każdy głos porównujemy z klubem z dnia głosowania.</li>
      <li>
        Głos inny niż klub może wynikać z przekonań, z umowy w klubie albo z pomyłki
        przy przycisku. Rejestr tego nie podaje — i my też tego nie rozstrzygamy.
      </li>
    </ul>
  );
}
