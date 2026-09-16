import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsujCsv } from './csv';
import { czytajGminyPkw, sprawdzGminyPkw } from './pkw';

/*
 * PROBKA TO ORYGINALNE BAJTY pliku PKW (BOM, CRLF, cudzyslowy przy tekstach,
 * liczby bez cudzyslowu), obciete do 9 pol na granicy srednika. Wybrane
 * wiersze to dokladnie te przypadki, ktore sie wywracaja:
 *   20101  — TERYT z obcietym zerem (dolnoslaskie)
 *   101801 — "gm. Boleslawiec" w lodzkim, imiennik gminy z dolnoslaskiego
 *   106101 — miasto na prawach powiatu, bez prefiksu
 *   146502 — dzielnica Warszawy, bez prefiksu
 *   (pusty) — obwod za granica
 */
const PROBKA = Buffer.from(
  '77u/IlRFUllUIEdtaW55IjsiR21pbmEiOyJQb3dpYXQiOyJXb2pld8OzZHp0d28iOyJOciBva3LEmWd1IjsiTGljemJhIGtvbWlzamkiOyJMaWN6YmEgdXd6Z2zEmWRuaW9ueWNoIGtvbWlzamkiOyJLb21pc2phIG90cnp5bWHFgmEga2FydCBkbyBnxYJvc293YW5pYSI7IkxpY3piYSB3eWJvcmPDs3cgdXByYXduaW9ueWNoIGRvIGfFgm9zb3dhbmlhIg0KMjAxMDE7Im0uIEJvbGVzxYJhd2llYyI7ImJvbGVzxYJhd2llY2tpIjsiZG9sbm/Fm2zEhXNraWUiOzE7MjQ7MjQ7MjY3MzM7Mjg0MjENCjEwMTgwMTsiZ20uIEJvbGVzxYJhd2llYyI7IndpZXJ1c3pvd3NraSI7IsWCw7NkemtpZSI7MTE7NDs0OzI5MjU7MzA2OA0KMTAwMTAxOyJtLiBCZcWCY2hhdMOzdyI7ImJlxYJjaGF0b3dza2kiOyLFgsOzZHpraWUiOzEwOzI4OzI4OzM5MTkzOzQwODQzDQoxMDYxMDE7IsWBw7NkxboiOyLFgcOzZMW6IjsixYLDs2R6a2llIjs5OzMyMjszMjI7NDcwNjg3OzQ5OTY3MQ0KMTQ2NTAyOyJCZW1vd28iOyJXYXJzemF3YSI7Im1hem93aWVja2llIjsxOTs1Mzs1Mzs4OTgwODs5Mzc4Ng0KOyJBbGJhbmlhIjsiemFncmFuaWNhIjs7MTk7MTsxOzgzNDs4NTUNCg==',
  'base64',
).toString('utf8');

describe('parsujCsv', () => {
  it('zdejmuje BOM — inaczej pierwsza kolumna nie nazywa sie "TERYT Gminy"', () => {
    expect(parsujCsv(PROBKA)[0]![0]).toBe('TERYT Gminy');
  });

  it('obsluguje CRLF i nie tworzy pustego wiersza na koncu', () => {
    expect(parsujCsv(PROBKA)).toHaveLength(7);
  });

  it('podwojony cudzyslow wewnatrz pola to jeden cudzyslow', () => {
    expect(parsujCsv('"a ""b"" c";2')).toEqual([['a "b" c', '2']]);
  });

  it('separator w cudzyslowie nie dzieli pola', () => {
    expect(parsujCsv('"a;b";c')).toEqual([['a;b', 'c']]);
  });

  it('ostatni wiersz bez znaku konca linii nie ginie', () => {
    expect(parsujCsv('a;b\nc;d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('czytajGminyPkw', () => {
  const w = czytajGminyPkw(PROBKA);
  const gmina = (teryt: string) => w.gminy.find((g) => g.teryt === teryt);

  it('dopelnia TERYT obciety do 5 cyfr', () => {
    expect(gmina('020101')).toMatchObject({ nazwa: 'Bolesławiec', rodzaj: 'miasto', okreg: 1 });
    expect(gmina('20101')).toBeUndefined();
  });

  it('rozroznia imiennikow po TERYT, powiecie i wojewodztwie', () => {
    expect(gmina('101801')).toMatchObject({
      nazwa: 'Bolesławiec', rodzaj: 'gmina', powiat: 'wieruszowski', wojewodztwo: 'łódzkie', okreg: 11,
    });
  });

  it('miasto na prawach powiatu nie ma prefiksu', () => {
    expect(gmina('106101')).toMatchObject({ nazwa: 'Łódź', rodzaj: 'miasto na prawach powiatu', okreg: 9 });
  });

  it('dzielnica Warszawy jest dzielnica, nie miastem', () => {
    expect(gmina('146502')).toMatchObject({ nazwa: 'Bemowo', rodzaj: 'dzielnica Warszawy', okreg: 19 });
  });

  it('obwod za granica nie udaje gminy', () => {
    expect(w.gminy).toHaveLength(5);
    expect(w.zagranica).toEqual([{ nazwa: 'Albania', okreg: 19, uprawnionych: 855 }]);
  });

  it('czyta liczbe uprawnionych z wlasciwej kolumny', () => {
    expect(gmina('100101')?.uprawnionych).toBe(40843);
  });

  it('brak kolumny to blad z nazwa kolumny, a nie cicho przesuniete dane', () => {
    expect(() => czytajGminyPkw('"Gmina";"Powiat"\r\n"a";"b"\r\n')).toThrow(/TERYT Gminy/);
  });
});

describe('sprawdzGminyPkw', () => {
  it('probka z 5 gmin zglasza brakujace okregi', () => {
    const problemy = sprawdzGminyPkw(czytajGminyPkw(PROBKA));
    expect(problemy.join('\n')).toMatch(/okregi bez zadnej gminy: 2, 3, 4/);
  });

  it('okreg w dwoch wojewodztwach jest bledem odczytu', () => {
    const w = czytajGminyPkw(PROBKA);
    w.gminy.push({ ...w.gminy[0]!, teryt: '999999', wojewodztwo: 'inne' });
    expect(sprawdzGminyPkw(w, 1).join('\n')).toMatch(/okreg 1 lezy w kilku wojewodztwach/);
  });

  // Test na PELNYM pliku z repozytorium — to on jest zrodlem importu.
  it('pelny plik PKW przechodzi kontrole bez uwag', () => {
    const pelny = readFileSync(
      join(__dirname, '..', 'zrodla', 'pkw-2023', 'wyniki_gl_na_listy_po_gminach_sejm_utf8.csv'),
      'utf8',
    );
    const w = czytajGminyPkw(pelny);
    expect(sprawdzGminyPkw(w)).toEqual([]);
    expect(w.nieznanePrefiksy).toEqual([]);
    // 2477 gmin, z czego Warszawa rozpisana na 18 dzielnic.
    expect(w.gminy).toHaveLength(2494);
    expect(w.zagranica).toHaveLength(91);
  });
});
