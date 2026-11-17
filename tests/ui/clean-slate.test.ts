// Plan 2A clean slate: the Ancients battles are gone; only the hidden drill battle 000 remains.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { battlesOf, PICKER_TABS, randomPick, visibleBattles } from '../../src/ui/screens/picker';
import { clearSaved, ENGINE_VERSION, loadSaved } from '../../src/ui/game/controller';
import { ScenarioSelect } from '../../src/ui/screens/Menus';
import { storageKey } from '../../src/ui/storage';
import { dropStorage, stubStorage } from '../support/storage';

afterEach(dropStorage);

describe('clean slate', () => {
  it('only the hidden drill battle remains', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['000']);
    expect(scenarioById('000').hidden).toBe(true);
  });

  it('the battle picker shows no hidden battle and random battle finds none', () => {
    expect(visibleBattles(SCENARIOS)).toEqual([]);
    for (const t of PICKER_TABS) expect(battlesOf(SCENARIOS, t.id)).toEqual([]);
    expect(randomPick(SCENARIOS, '000')).toBeNull();
    expect(randomPick([], '')).toBeNull();
  });

  it('a saved game of a battle that no longer exists is dropped', () => {
    const store = stubStorage();
    const key = storageKey('autosave-v1');
    const save = (id: string) => JSON.stringify({ version: 1, engine: ENGINE_VERSION, config: { scenarioId: id, seed: 1 }, answers: [] });
    store.set(key, save('000'));
    expect(loadSaved()?.config.scenarioId).toBe('000'); // control: a save of an existing battle is kept
    store.set(key, save('007'));
    expect(loadSaved()).toBeNull();
    expect(store.has(key)).toBe(false);
    clearSaved();
  });

  it('the picker never shows the hidden Drill, and with no battle its Start is disabled', () => {
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    expect(html).not.toContain('Drill');
    expect(html).not.toContain('scen-item');
    expect(/<button(?=[^>]*\bdisabled)(?=[^>]*start-btn)[^>]*>(<span[^>]*>)?To Battle!/.test(html)).toBe(true);
    // also when the Triumphs record asks for it by id
    expect(renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle: '000' }))).not.toContain('Drill');
  });
});
