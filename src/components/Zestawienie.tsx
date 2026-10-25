import { skroc, zlote } from '@/lib/format';
import { nazwaDoPokazania } from '@/lib/prywatnosc';

/**
 * Lista "nazwa -> kwota". `ukrywajOsoby` przepuszcza nazwy przez regule
 * z `prywatnosc.ts` — potrzebne tam, gdzie nazwa moze byc osoba fizyczna
 * (np. udzielajacym pomocy bywa jednoosobowa firma szkoleniowa).
 * Bez ucinania etykiet do 200 znakow: najdluzsze przeznaczenie w rejestrze
 * ma 175, a ucinanie przy 110 zostawialo „rekompensate za realizacje uslug…”
 * (przeglad tresci 24.10.2026).
 */
export function Zestawienie({ tytul, wiersze, ukrywajOsoby = false }: {
  tytul: string;
  wiersze: { nazwa: string; przypadkow: number; brutto: number | null }[];
  ukrywajOsoby?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-kreska bg-papier-2 p-6 shadow-karta">
      <p className="text-sm font-medium">{tytul}</p>
      <ul className="mt-3 divide-y divide-kreska">
        {wiersze.map((w) => {
          const n = ukrywajOsoby ? nazwaDoPokazania(w.nazwa) : { tekst: w.nazwa, pominieta: false };
          return (
            <li key={w.nazwa} className="flex items-baseline gap-4 py-2 text-sm">
              <span className={`min-w-0 flex-1 leading-snug ${n.pominieta ? 'text-atrament-3 italic' : ''}`}>{skroc(n.tekst, 200)}</span>
              <span className="liczby w-24 shrink-0 text-right font-medium">{zlote(w.brutto)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
