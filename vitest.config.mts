import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'ingest/**/*.test.ts'], environment: 'node' },
  // Alias „@/" jak w tsconfig. Bez niego nie da sie przetestowac niczego
  // z `src/app/` — a tam mieszkaja trasy, ktore mowia czytelnikowi
  // i wyszukiwarkom rzeczy wiazace (robots.txt, mapa strony).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
