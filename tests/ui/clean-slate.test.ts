// Clean slate: the Ancients battles are gone; the hidden drill 000, the generated base battles and the Spanish battles 101–118 remain.
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
  it('the hidden drill battle, the generated base battles and the Spanish battles remain', () => {
    const spanish = Array.from({ length: 18 }, (_, i) => String(101 + i));
    expect(SCENARIOS.map((s) => s.id)).toEqual(['000', ...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')), ...spanish]);
    expect(scenarioById('000').hidden).toBe(true);
    for (const id of spanish) expect(scenarioById(id).hidden, id).toBeUndefined();   // visible since Plan 7C Task 17
  });

  it('the battle picker shows no hidden battle and random battle never picks the drill', () => {
    const base = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0'));
    const spanish = Array.from({ length: 18 }, (_, i) => String(101 + i));
    expect(visibleBattles(SCENARIOS).map((s) => s.id)).toEqual([...base, ...spanish]);
    expect(battlesOf(SCENARIOS, 'base').map((s) => s.id)).toEqual(base);
    expect(battlesOf(SCENARIOS, 'exp1').map((s) => s.id)).toEqual(spanish);
    let n = 0;
    const rnd = () => ((n = (n * 7 + 3) % 101), n / 101);
    for (let i = 0; i < 50; i++) expect(visibleBattles(SCENARIOS).map((s) => s.id)).toContain(randomPick(SCENARIOS, '000', rnd)!.battle.id);
    expect(randomPick([], '')).toBeNull();
  });

  it('a saved game of a battle that no longer exists is dropped', () => {
    const store = stubStorage();
    const key = storageKey('autosave-v1');
    const save = (id: string) => JSON.stringify({ version: 1, engine: ENGINE_VERSION, config: { scenarioId: id, difficulty: 'colonel', seed: 1 }, answers: [] });
    store.set(key, save('000'));
    expect(loadSaved()?.config.scenarioId).toBe('000'); // control: a save of an existing battle is kept
    store.set(key, save('999'));
    expect(loadSaved()).toBeNull();
    expect(store.has(key)).toBe(false);
    clearSaved();
  });

  it('the picker never shows the hidden Drill; Start is enabled with the first base battle shown', () => {
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    expect(html).not.toContain('Drill');
    expect([...html.matchAll(/scen-item/g)]).toHaveLength(15);
    expect(html).toContain('Roliça (French First Position)');
    expect(/<button(?=[^>]*\bdisabled)(?=[^>]*start-btn)[^>]*>(<span[^>]*>)?To Battle!/.test(html)).toBe(false);
    expect(/<button[^>]*start-btn[^>]*>(<span[^>]*>)?To Battle!/.test(html)).toBe(true);
    // also when the Triumphs record asks for it by id
    expect(renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle: '000' }))).not.toContain('Drill');
  });
});
