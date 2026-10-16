import { describe, expect, it } from 'vitest';
import { identyfikatorUmami, skryptUmami } from './analityka';

describe('analityka', () => {
  it('bez identyfikatora wylaczona', () => {
    expect(identyfikatorUmami({})).toBeNull();
    expect(identyfikatorUmami({ JAWNE_UMAMI_ID: '  ' })).toBeNull();
  });

  it('przyjmuje tylko UUID — literowka nie trafia do HTML-a', () => {
    expect(identyfikatorUmami({ JAWNE_UMAMI_ID: '1b2c3d4e-0000-4abc-8def-1234567890ab' })).toBe('1b2c3d4e-0000-4abc-8def-1234567890ab');
    expect(identyfikatorUmami({ JAWNE_UMAMI_ID: '"><script>' })).toBeNull();
  });

  it('skrypt tylko z https, inaczej domyslny', () => {
    expect(skryptUmami({})).toBe('https://cloud.umami.is/script.js');
    expect(skryptUmami({ JAWNE_UMAMI_SKRYPT: 'http://zly.pl/s.js' })).toBe('https://cloud.umami.is/script.js');
    expect(skryptUmami({ JAWNE_UMAMI_SKRYPT: 'https://eu.przyklad.pl/script.js' })).toBe('https://eu.przyklad.pl/script.js');
  });
});
