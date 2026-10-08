'use client';

import { useEffect, useRef } from 'react';

/**
 * Spis dzialow strony: na telefonie przyklejony pasek, w Standardowym od
 * 1280 px boczna kolumna (globals.css, `.z-spisem`). Odnosniki dzialaja bez
 * JavaScriptu; skrypt doklada tylko podswietlenie dzialu, ktory czytelnik
 * wlasnie oglada.
 */
export function SpisDzialow({ dzialy }: { dzialy: { id: string; nr: number; nazwa: string }[] }) {
  const korzen = useRef<HTMLElement>(null);

  useEffect(() => {
    const linki = [...(korzen.current?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [])];
    if (!linki.length || !('IntersectionObserver' in window)) return;
    const wgId = new Map(linki.map((a) => [a.hash.slice(1), a]));
    const obserwator = new IntersectionObserver((wpisy) => {
      for (const w of wpisy) {
        if (!w.isIntersecting) continue;
        for (const a of linki) { a.classList.remove('biezacy'); a.removeAttribute('aria-current'); }
        const a = wgId.get(w.target.id);
        if (a) { a.classList.add('biezacy'); a.setAttribute('aria-current', 'location'); }
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    for (const id of wgId.keys()) {
      const el = document.getElementById(id);
      if (el) obserwator.observe(el);
    }
    return () => obserwator.disconnect();
  }, []);

  return (
    <nav ref={korzen} className="spis" aria-label="Działy tej strony">
      <ol>
        {dzialy.map((d) => (
          <li key={d.id}>
            <a href={`#${d.id}`}><span className="znak">{d.nr}</span>{d.nazwa}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
