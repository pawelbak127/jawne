import { describe, expect, it } from 'vitest';
import { KATEGORIE, OPIS_KATEGORII, formaZnana, kategoriaFormy } from './formy-pomocy.js';

describe('kategoriaFormy — kody zmierzone w rejestrze 01.10.2026', () => {
  it('wypłacone z budżetu: dotacje, refundacje, dopłaty, wniesienie kapitału', () => {
    for (const k of ['A1.1', 'A1.2', 'A1.3', 'A1.4', 'A1.5', 'B1.1']) {
      expect(kategoriaFormy(k)).toBe('wyplacone');
    }
  });

  it('niepobrane: zwolnienia, umorzenia, obniżki, odstąpienie od mienia', () => {
    // Wszystkie te kody naprawde sa w bazie; A2.5 to 73 739 przypadkow.
    for (const k of ['A2.1', 'A2.3', 'A2.4', 'A2.5', 'A2.7', 'A2.8', 'A2.9', 'A2.10',
      'A2.11', 'A2.12', 'A2.13', 'A2.14', 'A2.15', 'A2.16']) {
      expect(kategoriaFormy(k)).toBe('niepobrane');
    }
  });

  it('zwrotne i warunkowe: pożyczki, kredyty, gwarancje, poręczenia', () => {
    for (const k of ['C1.1', 'C1.2', 'C1.4', 'C1.5', 'D1.1', 'D1.2']) {
      expect(kategoriaFormy(k)).toBe('zwrotne');
    }
  });

  it('ulgi w terminie: odroczenia i raty — tu kwota to korzyść z odsetek', () => {
    for (const k of ['C2.1', 'C2.2', 'C2.3.1', 'C2.4', 'C2.5', 'C2.7', 'C2.8', 'C2.9', 'C2.11']) {
      expect(kategoriaFormy(k)).toBe('terminy');
    }
  });

  it('ROZSTRZYGA PRZEDROSTEK, bo rejestr rozbudowuje kody w głąb', () => {
    // A2.8 i A2.8.1 to ta sama grupa; C2.1 i C2.1.2 tak samo.
    expect(kategoriaFormy('A2.8.1')).toBe(kategoriaFormy('A2.8'));
    expect(kategoriaFormy('C2.1.2')).toBe(kategoriaFormy('C2.1'));
    expect(kategoriaFormy('C2.4.1')).toBe(kategoriaFormy('C2.4'));
    // Hipotetyczne poglebienie w przyszlosci tez trafi tam, gdzie powinno.
    expect(kategoriaFormy('A1.4.7')).toBe('wyplacone');
  });

  it('nie myli A1 z A2 ani C1 z C2 — to różnica między wydatkiem a ubytkiem', () => {
    expect(kategoriaFormy('A1.1')).not.toBe(kategoriaFormy('A2.1'));
    expect(kategoriaFormy('C1.1')).not.toBe(kategoriaFormy('C2.1'));
  });

  it('kod nieznany i brak kodu to „inne”, a nie zgadywanie', () => {
    expect(kategoriaFormy('E')).toBe('inne');
    expect(kategoriaFormy(null)).toBe('inne');
    expect(kategoriaFormy('')).toBe('inne');
    expect(kategoriaFormy('Z9.9')).toBe('inne');
  });

  it('formaZnana oddziela nowość w rejestrze od naszego braku', () => {
    expect(formaZnana('A2.5')).toBe(true);
    expect(formaZnana('E')).toBe(false);
    expect(formaZnana(null)).toBe(false);
  });

  it('każda kategoria ma etykietę i wyjaśnienie — inaczej liczba stoi bez mianownika', () => {
    for (const k of KATEGORIE) {
      expect(OPIS_KATEGORII[k].etykieta.length).toBeGreaterThan(3);
      expect(OPIS_KATEGORII[k].wyjasnienie.length).toBeGreaterThan(20);
    }
  });
});
