// Napoleonic ranks (Captain, Colonel, Marshal), the medal's ribbon and star, and Triumphs for all 33 battles.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../../src/scenarios';
import { CATALOGUE } from '../../src/scenarios/catalogue';
import { ENGINE_VERSION, devRouteConfig, loadSaved, type Difficulty } from '../../src/ui/game/controller';
import { LEVELS, MEDAL_FOR, loadRecord } from '../../src/ui/record';
import { ScenarioSelect } from '../../src/ui/screens/Menus';
import { Medal, MEDAL_LEVEL } from '../../src/ui/screens/Medal';
import { TriumphsDialog, tallyText } from '../../src/ui/screens/Triumphs';
import { recordTotals } from '../../src/ui/record';
import { visibleBattles } from '../../src/ui/screens/picker';
import { storageKey } from '../../src/ui/storage';
import { stubStorage, useStubStorageCleanup } from '../support/storage';

useStubStorageCleanup();

const FS = 'node:fs';
const readText = async (p: string): Promise<string> => (await import(FS)).readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Napoleonic ranks', () => {
  it('levels are Captain, Colonel, Marshal, with bronze, silver, gold', () => {
    expect(LEVELS).toEqual(['captain', 'colonel', 'marshal']);
    expect(MEDAL_FOR).toEqual({ captain: 'bronze', colonel: 'silver', marshal: 'gold' });
    expect(MEDAL_LEVEL).toEqual({ gold: 'Marshal', silver: 'Colonel', bronze: 'Captain' });
    stubStorage();
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    for (const [name, text] of [
      ['Captain', 'A forgiving opponent that makes mistakes.'],
      ['Colonel', 'A capable general. Recommended.'],
      ['Marshal', 'Thinks deeper and punishes errors.'],
    ]) {
      expect(html).toContain(name);
      expect(html).toContain(text);
    }
  });

  it('old level keys are dropped from a loaded record', () => {
    const m = stubStorage();
    m.set(storageKey('record-v1'), JSON.stringify({ version: 1, battles: { '001': { bottom: { tribune: { won: 1, lost: 0, draw: 0 } } } } }));
    expect(loadRecord()['001']).toBeUndefined();
  });

  it('a saved game with an old difficulty is discarded', () => {
    const m = stubStorage();
    m.set(storageKey('autosave-v1'), JSON.stringify({
      version: 1, engine: ENGINE_VERSION, config: { scenarioId: '001', humanSide: 'bottom', difficulty: 'tribune', seed: 1 }, answers: [],
    }));
    expect(loadSaved()).toBeNull();
  });

  it('a stored old difficulty falls back to Colonel in the picker', () => {
    const m = stubStorage();
    m.set(storageKey('difficulty'), 'tribune');
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    expect(html).toMatch(/class="choice has-medal active"[^>]*><b>Colonel<\/b>/);
  });

  it('the dev route takes the new slugs only', () => {
    expect(devRouteConfig('#/play/000/top/colonel')).toMatchObject({ scenarioId: '000', humanSide: 'top', difficulty: 'colonel' });
    expect(devRouteConfig('#/play/000/top/tribune')).toBeNull();
    const d: Difficulty = 'marshal';
    expect(devRouteConfig(`#/play/000/top/${d}/7`)).toMatchObject({ seed: 7 });
  });
});

describe('Triumphs for 33 battles', () => {
  it('lists all 33 catalogue battles; unplayable ones say so', () => {
    stubStorage();
    const html = renderToStaticMarkup(createElement(TriumphsDialog, {
      open: true, record: {}, onClose: () => {}, onRecord: () => {}, onPick: () => {},
    }));
    expect(CATALOGUE.length).toBe(33);
    for (const c of CATALOGUE) expect(html.split(`>${c.name.replace(/'/g, '&#x27;')}<`).length - 1, c.name).toBe(1);
    const playable = CATALOGUE.filter((c) => SCENARIOS.some((s) => s.id === c.id && !s.hidden));
    expect(html.split('Not yet available').length - 1).toBe(CATALOGUE.length - playable.length);
    expect(html.split('Not yet available').length - 1).toBe(18);
    expect(html.split('class="tri-cell"').length - 1).toBe(15);
    const ids = visibleBattles(SCENARIOS).map((s) => s.id);
    expect(tallyText(recordTotals({}, ids))).toContain('of 30 medals');
    expect(tallyText(recordTotals({}, ids))).toContain('of 15 battles fought');
  });

  it('a medal has its ribbon and star; legend says "beat the Marshal"', () => {
    const gold = renderToStaticMarkup(createElement(Medal, { standing: 'gold' }));
    expect(gold).toContain('medal-ribbon');
    expect(gold).toContain('medal-star');
    expect(renderToStaticMarkup(createElement(Medal, { standing: 'none' }))).not.toContain('medal-ribbon');
    stubStorage();
    const html = renderToStaticMarkup(createElement(TriumphsDialog, {
      open: true, record: {}, onClose: () => {}, onRecord: () => {}, onPick: () => {},
    }));
    for (const t of ['beat the Marshal', 'beat the Colonel', 'beat the Captain']) expect(html).toContain(t);
  });

  it('no Ancients level word in src/ui, and no file there or in tests/ui names the legacy alias', async () => {
    const files = import.meta.glob('../../{src,tests}/ui/**/*.{ts,tsx,css}');
    const level = new RegExp(['Recruit', 'Tribune', 'Consul'].join('|'), 'i');
    const alias = ['Legacy', 'Difficulty'].join('');
    let n = 0;
    for (const p of Object.keys(files)) {
      if (p.includes('/ui/history/') || p.endsWith('/ranks.test.ts') || p.endsWith('/no-ancients.test.ts')) continue;
      const s = await readText(p);
      n++;
      expect(s.includes(alias), p).toBe(false);
      if (p.includes('/src/ui/')) expect(s.match(level), p).toBeNull();
    }
    expect(n).toBeGreaterThan(50);
  });
});
