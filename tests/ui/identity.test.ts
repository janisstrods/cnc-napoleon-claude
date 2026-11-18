import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { saveRecord } from '../../src/ui/record';
import { setMuted } from '../../src/ui/sound';
import { loadSaved } from '../../src/ui/game/controller';
import { loadRecord } from '../../src/ui/record';
import { CreditsText } from '../../src/ui/screens/Menus';
import { STORAGE_PREFIX, storageKey } from '../../src/ui/storage';
import { stubStorage, useStubStorageCleanup } from '../support/storage';

useStubStorageCleanup();

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
  it('touches browser storage only in src/ui/storage.ts', () => {
    const offenders = Object.keys(sources).filter((p) => !p.endsWith('/src/ui/storage.ts') && /\b(localStorage|sessionStorage|indexedDB)\b/.test(sources[p]));
    expect(offenders).toEqual([]);
  });
  it('never passes a string literal key to storage', () => {
    const offenders = Object.keys(sources).filter((p) => /storage\.(get|set|remove)\(\s*['"`]/.test(sources[p]));
    expect(offenders).toEqual([]);
  });
  it('ignores Ancients data on the same origin and leaves it untouched', () => {
    const m = stubStorage();
    const cca = { 'cca-autosave-v1': '{"scenarioId":"007","seed":1,"answers":[]}', 'cca-record-v1': '{"007":{"top":{"recruit":{"won":1,"lost":0,"draw":0}}}}', 'cca-muted': '0' };
    for (const [k, v] of Object.entries(cca)) m.set(k, v);
    expect(loadSaved()).toBeNull();
    expect(loadRecord()).toEqual({});
    saveRecord({ '001': { top: { captain: { won: 1, lost: 0, draw: 0 } } } });
    setMuted(true);
    for (const [k, v] of Object.entries(cca)) expect(m.get(k)).toBe(v);
    expect([...m.keys()].filter((k) => !k.startsWith('cca-')).every((k) => k.startsWith('ccn-'))).toBe(true);
  });
  it("credits both boxes and keeps GMT's spelling to the disclaimer", () => {
    const html = renderToStaticMarkup(createElement(CreditsText));
    expect(html).toContain('The Spanish Army');
    expect(html).not.toMatch(/to come/);
    const paras = html.split('</p>');
    expect(paras.filter((p) => p.includes('Commands &amp; Colors')).length).toBe(1); // the disclaimer paragraph only
  });
});
