import { describe, expect, it } from 'vitest';
import { adresStronyBzp, dzienPublikacji, kwotaBzp, tekstZHtml, wynikiCzesci, type WykonawcaBzp } from './bzp';

const W = (nazwa: string | null, nip: string | null): WykonawcaBzp =>
  ({ contractorName: nazwa, contractorNationalId: nip, contractorCity: null, contractorProvince: null });

const czesc = (nr: number | null, o: { unie?: boolean; min?: string; max?: string; wyb?: string; umowa?: string; nazwa?: string }) => [
  nr === null ? 'SEKCJA V ZAKOŃCZENIE POSTĘPOWANIA' : `SEKCJA V ZAKOŃCZENIE POSTĘPOWANIA (dla części ${nr})`,
  `5.1.) Postępowanie zakończyło się zawarciem umowy albo unieważnieniem postępowania: ${o.unie ? 'Postępowanie/część postępowania zakończyła się unieważnieniem' : 'Postępowanie/cześć postępowania zakończyła się zawarciem umowy'}`,
  '6.1.) Liczba otrzymanych ofert lub wniosków: 3',
  `6.2.) Cena lub koszt oferty z najniższą ceną lub kosztem: ${o.min ?? '100,00'} PLN`,
  `6.3.) Cena lub koszt oferty z najwyższą ceną lub kosztem: ${o.max ?? '300,00'} PLN`,
  `6.4.) Cena lub koszt oferty wykonawcy, któremu udzielono zamówienia: ${o.wyb ?? '150,00'} PLN`,
  ...(o.nazwa ? [`7.3.1) Nazwa (firma) wykonawcy, któremu udzielono zamówienia (dotyczy pełnomocnika): ${o.nazwa}`] : []),
  `8.2.) Wartość umowy/umowy ramowej: ${o.umowa ?? '150,00'} PLN`,
].join('\n');

describe('kwotaBzp', () => {
  it('twarda spacja, zwykla spacja i kropki jako separatory tysiecy', () => {
    expect(kwotaBzp('646 980,00')).toBe(646980);
    expect(kwotaBzp('274044,00')).toBe(274044);
    expect(kwotaBzp('1.234.567,89')).toBe(1234567.89);
    expect(kwotaBzp('')).toBeNull();
    expect(kwotaBzp(null)).toBeNull();
  });
});

describe('tekstZHtml', () => {
  it('linie z <br>/<p>, encje, twarda spacja zostaje', () => {
    expect(tekstZHtml('<p>6.2.) Cena: 1&nbsp;000,00 PLN</p><p>  6.3.)  x </p><style>.a{}</style>'))
      .toBe('6.2.) Cena: 1 000,00 PLN\n6.3.) x');
  });
});

describe('wynikiCzesci', () => {
  it('jedna czesc: kwoty, liczba ofert, wykonawca z NIP-em z listy', () => {
    const w = wynikiCzesci(czesc(null, { nazwa: 'Infonet Projekt SA', umowa: '274 044,00' }), [W('Infonet Projekt SA', '5532087889')]);
    expect(w).toEqual([{
      czesc: 1, uniewaznione: false, ofert: 3, cenaMin: 100, cenaMax: 300, cenaWybrana: 150, wartoscUmowy: 274044,
      wykonawca: 'Infonet Projekt SA', wykonawcaNip: '5532087889',
    }]);
  });

  it('kwota tylko z tej samej linii — nie lapie numeru nastepnego pola', () => {
    const t = czesc(null, { nazwa: 'A sp. z o.o.' }).replace('8.2.) Wartość umowy/umowy ramowej: 150,00 PLN', '8.2.) Wartość umowy/umowy ramowej:\n8.3.) Coś: 9');
    expect(wynikiCzesci(t, [])[0]!.wartoscUmowy).toBeNull();
  });

  it('cena wybrana spoza [min, max] to blad zamawiajacego — nie zapisujemy', () => {
    const w = wynikiCzesci(czesc(null, { min: '32000,00', max: '40000,00', wyb: '8992402029,00', nazwa: 'X sp. z o.o.' }), []);
    expect(w[0]!.cenaWybrana).toBeNull();
  });

  it('wiele czesci: wykonawca PO POZYCJI, uniewaznione bez wykonawcy i kwot', () => {
    const t = ['Część 1', czesc(1, { nazwa: 'ZTM Innovations Sp. z o.o.' }), czesc(2, { unie: true }), czesc(3, { nazwa: 'Varimed Sp. z o.o.' })].join('\n');
    const w = wynikiCzesci(t, [W('ZTM Innovations Sp. z o.o.', '7773245612'), W(null, null), W('Varimed Sp. z o.o.', '8990202964')]);
    expect(w.map((c) => [c.czesc, c.uniewaznione, c.wykonawcaNip])).toEqual([[1, false, '7773245612'], [2, true, null], [3, false, '8990202964']]);
    expect(w[1]!.wartoscUmowy).toBeNull();
  });

  it('ta sama nazwa z dwoma NIP-ami (literowka zamawiajacego) — pozycja rozstrzyga, nie pierwsza z nazwa', () => {
    const t = [czesc(1, { nazwa: 'ZTM Innovations Sp. z o.o.' }), czesc(2, { nazwa: 'ZTM Innovations Sp. z o.o.' })].join('\n');
    const w = wynikiCzesci(t, [W('ZTM Innovations Sp. z o.o.', '7773245612'), W('ZTM Innovations Sp. z o.o.', '9512272893')]);
    expect(w.map((c) => c.wykonawcaNip)).toEqual(['7773245612', '9512272893']);
  });

  it('liczby czesci i wykonawcow sie nie zgadzaja — dopasowanie po nazwie', () => {
    const t = [czesc(1, { nazwa: 'Beta S.A.' }), czesc(2, { nazwa: 'Alfa sp. z o.o.' })].join('\n');
    const w = wynikiCzesci(t, [W('Alfa sp. z o.o.', '5260152844')]);
    expect(w.map((c) => c.wykonawcaNip)).toEqual([null, '5260152844']);
  });
});

describe('daty i adresy', () => {
  it('data publikacji w polskim kalendarzu (UTC 23:30 to juz nastepny dzien)', () => {
    expect(dzienPublikacji('2026-10-13T23:30:00Z')).toBe('2026-10-14');
  });

  it('adres strony dnia z SearchAfter', () => {
    const a = adresStronyBzp('2026-10-14', 'abc');
    expect(a).toContain('NoticeType=TenderResultNotice');
    expect(a).toContain('PublicationDateFrom=2026-10-14');
    expect(a).toContain('SearchAfter=abc');
  });
});
