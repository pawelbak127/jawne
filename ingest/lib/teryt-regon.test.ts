import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { zalozSchemat } from './baza.js';
import { przeliczTerytRegon, slownikGmin, terytZNazw } from './teryt-regon.js';
import { nipZTekstu } from '../../src/lib/nip.js';
import { znormalizujNabywcow } from './teryt-regon.js';

let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  zalozSchemat(db);
  db.prepare('insert into okregi (nr, nazwa, wojewodztwo) values (?,?,?)').run(1, 'okręg', 'małopolskie');
  const g = db.prepare(
    'insert into gminy (teryt, nazwa, rodzaj, powiat, wojewodztwo, okreg_nr, szukaj) values (?,?,?,?,?,?,?)',
  );
  g.run('126101', 'Kraków', 'miasto na prawach powiatu', 'Kraków', 'małopolskie', 1, 'krakow');
  g.run('106101', 'Łódź', 'miasto na prawach powiatu', 'Łódź', 'łódzkie', 1, 'lodz');
  g.run('120101', 'Sucha Beskidzka', 'miasto', 'suski', 'małopolskie', 1, 'sucha');
  // Gmina z mysnikiem w PRAWDZIWEJ nazwie — nie wolno jej potraktowac jak delegatury.
  g.run('041001', 'Brodnica-Wieś', 'gmina', 'brodnicki', 'kujawsko-pomorskie', 1, 'brodnica');
});

describe('terytZNazw — nazwy z REGON na nasz kod', () => {
  it('dopasowuje gminę wprost', () => {
    const s = slownikGmin(db);
    expect(terytZNazw(s, 'Sucha Beskidzka', 'suski', 'MAŁOPOLSKIE')).toBe('120101');
  });

  it('DELEGATURĘ miasta na prawach powiatu sprowadza do miasta (pułapka 31 w REGON)', () => {
    const s = slownikGmin(db);
    // Tak BIR naprawdę nazywa te jednostki — zmierzone 01.10.2026.
    expect(terytZNazw(s, 'Kraków-Podgórze', 'Kraków', 'MAŁOPOLSKIE')).toBe('126101');
    expect(terytZNazw(s, 'Kraków-Nowa Huta', 'Kraków', 'MAŁOPOLSKIE')).toBe('126101');
    expect(terytZNazw(s, 'Łódź-Bałuty', 'Łódź', 'ŁÓDZKIE')).toBe('106101');
  });

  it('Warszawa jest jedną jednostką niezależnie od dzielnicy (pułapka 24)', () => {
    const s = slownikGmin(db);
    expect(terytZNazw(s, 'Warszawa-Wola', 'Warszawa', 'MAZOWIECKIE')).toBe('146501');
    expect(terytZNazw(s, 'Wilanów', 'Warszawa', 'MAZOWIECKIE')).toBe('146501');
  });

  it('NIE tnie po myślniku tam, gdzie myślnik jest częścią nazwy gminy', () => {
    const s = slownikGmin(db);
    // „Brodnica-Wieś" w powiecie brodnickim: przedrostek NIE jest nazwą powiatu,
    // więc dopasowanie po delegaturze się nie uruchamia.
    expect(terytZNazw(s, 'Brodnica-Wieś', 'brodnicki', 'KUJAWSKO-POMORSKIE')).toBe('041001');
    expect(terytZNazw(s, 'Brodnica-Coś', 'brodnicki', 'KUJAWSKO-POMORSKIE')).toBeNull();
  });

  it('brak którejkolwiek nazwy to brak kodu, nie zgadywanie', () => {
    const s = slownikGmin(db);
    expect(terytZNazw(s, null, 'Kraków', 'MAŁOPOLSKIE')).toBeNull();
    expect(terytZNazw(s, 'Kraków-Podgórze', null, 'MAŁOPOLSKIE')).toBeNull();
    expect(terytZNazw(s, 'Nieznana', 'nieznany', 'MAŁOPOLSKIE')).toBeNull();
  });
});

describe('przeliczTerytRegon — naprawa bez sieci', () => {
  it('dokłada TERYT wierszom, które go nie miały, i nie rusza reszty', () => {
    const w = db.prepare(
      'insert into regon (nip, regon, nazwa, typ, wojewodztwo, powiat, gmina, teryt, rekordow, pobrano)'
      + ' values (?,?,?,?,?,?,?,?,1,?)',
    );
    w.run('1111111111', '1', 'Alfa', 'P', 'MAŁOPOLSKIE', 'Kraków', 'Kraków-Podgórze', null, 'teraz');
    w.run('2222222222', '2', 'Beta', 'P', 'MAŁOPOLSKIE', 'suski', 'Sucha Beskidzka', '120101', 'teraz');
    w.run('3333333333', '3', 'Gamma', 'P', null, null, null, null, 'teraz');

    expect(przeliczTerytRegon(db)).toEqual({ sprawdzono: 2, doszlo: 1, nadal: 1 });
    expect(db.prepare('select teryt from regon where nip = ?').get('1111111111')).toEqual({ teryt: '126101' });
    // Wiersz bez adresu zostaje bez kodu — brak danych to stan, nie zero.
    expect(db.prepare('select teryt from regon where nip = ?').get('3333333333')).toEqual({ teryt: null });
  });
});

describe('znormalizujNabywcow — NIP zamawiającego z wolnego tekstu', () => {
  it('wyciąga NIP z zapisów, które naprawdę są w TED, a śmieć zeruje', () => {
    const w = db.prepare('insert into ted_ogloszenia (numer, data, nabywca_id, wykonawcow) values (?,?,?,1)');
    // Wszystkie cztery postacie zmierzone w rejestrze 01.10.2026.
    w.run('A', '2026-01-01', 'NIP 9570730409');
    w.run('B', '2026-01-01', '954-22-69-625');
    w.run('C', '2026-01-01', '5250008057');
    w.run('D', '2026-01-01', 'PL-ABC-123');

    const wynik = znormalizujNabywcow(db, nipZTekstu);
    // „C" ma juz dziesiec cyfr, wiec nie jest nawet sprawdzane.
    expect(wynik.sprawdzono).toBe(3);
    expect(wynik.poprawione).toBe(2);
    expect(wynik.wyzerowane).toBe(1);
    const nip = (n: string) => (db.prepare('select nabywca_id as x from ted_ogloszenia where numer = ?').get(n) as { x: string | null }).x;
    expect(nip('A')).toBe('9570730409');
    expect(nip('B')).toBe('9542269625');
    expect(nip('C')).toBe('5250008057');
    expect(nip('D')).toBeNull();
  });
});
