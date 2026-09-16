import { describe, expect, it } from 'vitest';
import { slugifikuj, slugPosla } from './slug';

describe('slugifikuj', () => {
  it('sprowadza polskie znaki do ASCII', () => {
    expect(slugifikuj('Władysław Kosiniak-Kamysz')).toBe('wladyslaw-kosiniak-kamysz');
    expect(slugifikuj('Żaneta Cwalińska-Weychert')).toBe('zaneta-cwalinska-weychert');
  });

  it('radzi sobie z „ł", ktore nie rozklada sie przez NFD', () => {
    expect(slugifikuj('łódź')).toBe('lodz');
  });

  it('nie zostawia myslnikow na brzegach', () => {
    expect(slugifikuj('  — Anna Maria —  ')).toBe('anna-maria');
  });
});

describe('slugPosla', () => {
  it('imiennik dostaje identyfikator rejestrowy, nie numer porzadkowy', () => {
    const zajete = new Set(['jan-kowalski']);
    expect(slugPosla('Jan Kowalski', zajete, 412)).toBe('jan-kowalski-412');
  });

  it('pierwszy o danym nazwisku ma adres czysty', () => {
    expect(slugPosla('Jan Kowalski', new Set(), 412)).toBe('jan-kowalski');
  });

  it('nazwisko bez liter ASCII nie daje pustego adresu', () => {
    expect(slugPosla('***', new Set(), 7)).toBe('posel-7');
  });
});
