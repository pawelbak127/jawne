/**
 * Stan "nie ma jeszcze pliku bazy".
 *
 * To nie jest awaria, tylko etap pracy: baza powstaje z publicznego API
 * jednym poleceniem. Pokazujemy polecenie zamiast komunikatu o bledzie,
 * bo to jedyna rzecz, ktora odwiedzajacy moze z tym zrobic.
 */
export function BrakDanych() {
  return (
    <div className="obszar py-24">
      <div className="mx-auto max-w-lg rounded-2xl border border-kreska bg-papier-2 p-8 text-center shadow-karta">
        <h1 className="szryft text-2xl font-semibold">Baza jeszcze nie została zbudowana</h1>
        <p className="mt-3 text-atrament-2">
          Serwis czyta lokalny plik z danymi Sejmu. Powstaje on z publicznego API
          jednym poleceniem — nie trzeba żadnych haseł ani konta.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl bg-papier-3 px-4 py-3 text-left text-sm">
          npm run import wszystko
        </pre>
        <p className="mt-4 text-xs text-atrament-3">
          Etapy „kluby”, „posłowie” i „głosowania” trwają kilka sekund. Etap „głosy”
          pobiera ponad dwa miliony głosów imiennych i trwa kilkanaście minut.
        </p>
      </div>
    </div>
  );
}
