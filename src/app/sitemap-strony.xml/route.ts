import { odpowiedzXml, xmlMapy } from '@/lib/mapa-strony';
import { adresyStron } from '@/lib/mapa-strony-dane';

// Mapa nie dziedziczy ustawienia z layoutu — bez tego zostaje z dnia budowania.
export const revalidate = 3600;

export function GET(): Response {
  return odpowiedzXml(xmlMapy(adresyStron()));
}
