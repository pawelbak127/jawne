'use client';

import { useState } from 'react';

/**
 * Przycisk „Kopiuj” dla akapitu do cytowania. Jedyny JavaScript tego bloku:
 * tekst stoi w HTML-u i da sie go zaznaczyc recznie, gdy schowek jest
 * niedostepny (stara przegladarka, strona bez HTTPS) — wtedy przycisk mowi
 * to wprost, zamiast udawac, ze sie udalo.
 */
export function Kopiuj({ tekst }: { tekst: string }) {
  const [stan, ustawStan] = useState<'gotowy' | 'skopiowano' | 'blad'>('gotowy');
  return (
    <button
      type="button"
      aria-live="polite"
      data-umami-event="kopiuj-akapit"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          ustawStan('skopiowano');
        } catch {
          ustawStan('blad');
        }
      }}
      className="min-h-11 rounded-lg border border-kreska bg-papier px-4 text-sm font-medium text-akcent shadow-karta"
    >
      {stan === 'skopiowano' ? 'Skopiowano ze źródłem' : stan === 'blad' ? 'Schowek niedostępny — zaznacz tekst' : 'Kopiuj akapit ze źródłem'}
    </button>
  );
}
