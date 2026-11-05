/**
 * Komisje, którym rejestr przypisał projekt, w kolejności etapów.
 *
 * Znacznik tematu na karcie ustawy bierzemy stąd, a nie z własnej klasyfikacji
 * („Energetyka”, „Ochrona zdrowia”): tabela `procesy` nie ma kategorii, a temat
 * nadany przez nas byłby naszą interpretacją przy liczbie z rejestru.
 * ZMIERZONE 05.11.2026: komisję ma 602 z 603 uchwalonych ustaw.
 *
 * Kod `Sejm` nie jest komisją, tylko skierowaniem na posiedzenie izby
 * (pułapka 43), a kolejność etapów rozstrzyga, która komisja jest pierwsza.
 */
export function kodyKomisjiUstawy(etapy: readonly { kolejnosc: number; komisja: string | null }[]): string[] {
  const kody: string[] = [];
  for (const e of [...etapy].sort((a, b) => a.kolejnosc - b.kolejnosc)) {
    if (e.komisja && e.komisja !== 'Sejm' && !kody.includes(e.komisja)) kody.push(e.komisja);
  }
  return kody;
}
