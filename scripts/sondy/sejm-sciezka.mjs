/**
 * Sonda: jedna sciezka API Sejmu, klientem z ponawianiem 404 (pulapka 1
 * z CLAUDE.md: F5 oddaje 404 text/html na poprawny adres).
 *
 *   node scripts/sondy/sejm-sciezka.mjs --uruchom processes
 */
const BAZA = 'https://api.sejm.gov.pl/sejm/term10';
const nl = (s = '') => process.stdout.write(`${s}\n`);
const argi = process.argv.slice(2);
const sciezka = argi.find((a) => !a.startsWith('--'));
if (!sciezka || !argi.includes('--uruchom')) {
  nl('node scripts/sondy/sejm-sciezka.mjs --uruchom processes');
  process.exit(2);
}
for (let proba = 1; proba <= 5; proba++) {
  const start = Date.now();
  const odp = await fetch(`${BAZA}/${sciezka}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'jawne.pl/0.1 (agregator danych publicznych)' },
    signal: AbortSignal.timeout(60_000),
  });
  const tekst = await odp.text();
  const s = ((Date.now() - start) / 1000).toFixed(1);
  if (!odp.ok) {
    nl(`proba ${proba}: HTTP ${odp.status} ${odp.headers.get('content-type')} (${s} s)`);
    await new Promise((r) => setTimeout(r, 1500 * proba));
    continue;
  }
  nl(`proba ${proba}: HTTP 200, ${(tekst.length / 1024).toFixed(1)} kB (${s} s)`);
  try {
    const j = JSON.parse(tekst);
    if (Array.isArray(j)) {
      nl(`   tablica, ${j.length} elementow`);
      nl(`   pola pierwszego: ${Object.keys(j[0] ?? {}).join(', ')}`);
      nl(`   przyklad: ${JSON.stringify(j[0]).slice(0, 400)}`);
    } else {
      nl(`   obiekt, pola: ${Object.keys(j).join(', ')}`);
    }
  } catch {
    nl(`   nie JSON: ${tekst.slice(0, 200)}`);
  }
  break;
}
