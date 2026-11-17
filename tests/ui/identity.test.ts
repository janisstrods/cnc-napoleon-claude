import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { STORAGE_PREFIX, storageKey } from '../../src/ui/storage';

// Vite's raw glob, because the project has no Node type definitions for fs.
const sources = import.meta.glob<string>('../../src/**/*.{ts,tsx}', { eager: true, query: '?raw', import: 'default' });

describe('project identity', () => {
  it('keys localStorage under ccn-', () => {
    expect(STORAGE_PREFIX).toBe('ccn-');
    expect(storageKey('muted')).toBe('ccn-muted');
  });
  it('never uses the Ancients prefix or dev hook in src', () => {
    const offenders = Object.keys(sources).filter((p) => /['"`]cca-|__cca\b/.test(sources[p]));
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
  it('is titled Commands & Colours: Napoleonics', () => {
    expect(indexHtml).toContain('<title>Commands &amp; Colours: Napoleonics</title>');
  });
});
