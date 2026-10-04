import { describe, expect, it } from 'vitest';
import { adresWystapienia, minutyWystapienia, opisCzasu } from './stenogramy';

describe('czas wystapienia', () => {
  it('liczy minuty z dwoch znacznikow rejestru', () => {
    expect(minutyWystapienia('2023-11-13T12:13:33', '2023-11-13T12:44:26')).toBe(31);
  });

  it('wystapienie na pismie nie ma konca — polpauza, nie zero (zasada 4)', () => {
    expect(minutyWystapienia('2026-09-17T10:00:00', null)).toBeNull();
    expect(minutyWystapienia(null, null)).toBeNull();
  });

  it('koniec przed poczatkiem to blad danych, nie ujemny czas', () => {
    expect(minutyWystapienia('2026-09-17T10:05:00', '2026-09-17T10:00:00')).toBeNull();
  });

  it('opis: ponizej minuty, minuty albo nic', () => {
    expect(opisCzasu(0)).toBe('poniżej minuty');
    expect(opisCzasu(4)).toBe('4 min');
    expect(opisCzasu(null)).toBeNull();
  });
});

it('adres tresci wystapienia w rejestrze', () => {
  expect(adresWystapienia(1, '2023-11-13', 2))
    .toBe('https://api.sejm.gov.pl/sejm/term10/proceedings/1/2023-11-13/transcripts/2');
});
