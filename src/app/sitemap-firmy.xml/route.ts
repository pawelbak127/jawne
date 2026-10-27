import { odpowiedzXml, xmlMapy } from '@/lib/mapa-strony';
import { adresyFirm, adresyStron } from '@/lib/mapa-strony-dane';

// Mapa nie dziedziczy ustawienia z layoutu — bez tego zostaje z dnia budowania.
export const revalidate = 3600;

export function GET(): Response {
  // Liczba firm zalezy od dlugosci pierwszego pliku — patrz `adresyFirm`.
  return odpowiedzXml(xmlMapy(adresyFirm(adresyStron().length)));
}
