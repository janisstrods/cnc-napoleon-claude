// Generic screens and controller plumbing on the Napoleonic contract: picker tabs (from EXPANSIONS), save and restore,
// controller notices and toasts, the dev route.
// The mocked scenario list adds 990, a visible copy of 000 in the exp1 box (000 is hidden), so the picker has a battle to show.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNIT_STATS, cloneState, randomAnswer, type Side } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { GameController, devRouteConfig, loadSaved, newSessionConfig, type SessionConfig } from '../../src/ui/game/controller';
import { RandomOpponent } from '../../src/ui/game/opponent';
import { PICKER_TABS, battlesOf, loadPickerTab, savePickerTab, tabForKey } from '../../src/ui/screens/picker';
import { ScenarioSelect } from '../../src/ui/screens/Menus';
import { stubStorage, dropStorage } from '../support/storage';
import { SeededOpponent, eventPlayer, newSince, runToHuman, useFakeClock } from './controller-helpers';

vi.mock('../../src/scenarios', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/scenarios')>();
  const raw = (await import('../../src/scenarios/data/000.json')).default as unknown as import('../../src/scenarios').ScenarioJson;
  const optioned = m.scenarioFromJson({
    ...raw, id: '990', name: 'Visible drill', hidden: false, expansion: 'exp1',
  });
  const SCENARIOS = [...m.SCENARIOS, optioned];
  return { ...m, SCENARIOS, scenarioById: (id: string) => SCENARIOS.find((s) => s.id === id) ?? m.scenarioById(id) };
});

afterEach(dropStorage);

const sc = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('battle picker tabs', () => {
  it('two tabs, in box order, from EXPANSIONS; a battle is in exactly one tab; the hidden drill is in none', () => {
    expect(PICKER_TABS.map((t) => [t.id, t.label])).toEqual([['base', 'The Peninsula & Waterloo'], ['exp1', 'The Spanish Army']]);
    expect(ids(battlesOf(SCENARIOS, 'exp1')).filter((id) => id !== '990')).toEqual([]); // 990 is the mocked stand-in
    expect(ids(battlesOf(SCENARIOS, 'base'))).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, '0')));
    expect(ids(battlesOf(SCENARIOS, 'exp1'))).toEqual(['990']);
    for (const s of SCENARIOS.filter((x) => !x.hidden)) expect(PICKER_TABS.filter((t) => battlesOf(SCENARIOS, t.id).includes(s)), s.id).toHaveLength(1);
  });

  it('remembers the last tab; unknown values and missing storage fall back to the base game', () => {
    expect(loadPickerTab()).toBe('base'); // no localStorage at all
    const m = stubStorage();
    expect(loadPickerTab()).toBe('base');
    savePickerTab('exp1');
    expect(m.get('ccn-battle-tab')).toBe('exp1');
    expect(loadPickerTab()).toBe('exp1');
    m.set('ccn-battle-tab', 'nonsense');
    expect(loadPickerTab()).toBe('base');
  });

  it('arrow keys step through the tabs (wrapping), Home and End jump; other keys do nothing', () => {
    expect(tabForKey('base', 'ArrowRight')).toBe('exp1');
    expect(tabForKey('exp1', 'ArrowRight')).toBe('base');
    expect(tabForKey('base', 'ArrowLeft')).toBe('exp1');
    expect(tabForKey('exp1', 'ArrowLeft')).toBe('base');
    expect(tabForKey('exp1', 'Home')).toBe('base');
    expect(tabForKey('base', 'End')).toBe('exp1');
    for (const k of ['Enter', ' ', 'ArrowDown', 'a']) expect(tabForKey('base', k), k).toBeUndefined();
  });

  it('the tabs are ARIA tabs: the selected one is in the tab order and labels the battle list it controls', () => {
    const m = stubStorage();
    m.set('ccn-battle-tab', 'exp1');
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((x) => x[0]);
    expect(tabs).toHaveLength(2);
    const attr = (el: string, a: string) => new RegExp(`${a}="([^"]*)"`).exec(el)?.[1];
    expect(tabs.map((t) => attr(t, 'aria-selected'))).toEqual(['false', 'true']);
    expect(tabs.map((t) => attr(t, 'tabindex'))).toEqual(['-1', '0']);
    expect(tabs.map((t) => attr(t, 'aria-controls'))).toEqual(['battle-list', 'battle-list']);
    expect(html).toMatch(/role="tablist" aria-label="Battles"/);
    const panel = /<div[^>]*role="tabpanel"[^>]*>/.exec(html)![0];
    expect(attr(panel, 'id')).toBe('battle-list');
    expect(attr(panel, 'aria-labelledby')).toBe(attr(tabs[1], 'id'));
    expect(html).toContain('Visible drill'); // the Spanish Army list is the one shown
    expect(html).not.toContain('>Drill<');
  });
});

describe('a saved battle is restored', () => {
  useFakeClock();

  it('the session config and the answers come back, and the restored game replays them', async () => {
    const m = stubStorage();
    const cfg: SessionConfig = { ...newSessionConfig('000', 'bottom', 'recruit'), seed: 777 };
    const c = new GameController(cfg, new SeededOpponent());
    try {
      await runToHuman(c); // wait for the human's first decision, then answer it (which saves)
      c.answer(randomAnswer(c.driver.state, c.view.pending!, () => 0.3));
    } finally {
      c.dispose();
    }
    expect(m.has('ccn-autosave-v1')).toBe(true);
    const saved = loadSaved()!;
    expect(saved.config).toMatchObject({ scenarioId: '000', seed: 777 });
    expect(saved.answers.length).toBeGreaterThan(0);
    const r = new GameController(saved.config, new RandomOpponent(), saved.answers, saved.check);
    try {
      expect(r.driver.answers).toEqual(saved.answers);
    } finally {
      r.dispose();
    }
  });
});

describe('controller notices', () => {
  useFakeClock();

  /** A controller waiting for the human's first decision, animations skipped, with its event animation exposed. */
  async function settled(id: string, human: Side) {
    const c = new GameController({ ...newSessionConfig(id, human, 'recruit'), seed: 9 }, new SeededOpponent());
    await runToHuman(c);
    return { c, animate: eventPlayer(c) };
  }
  const lastLog = (c: GameController) => c.view.log[c.view.log.length - 1].text;

  it('a unit removed from the field is logged with the engine reason and flashed', async () => {
    const { c, animate } = await settled('000', 'bottom');
    try {
      const s0 = c.driver.state;
      const unit = s0.units.find((u) => u.side === 'bottom')!;
      const gone = cloneState(s0);
      gone.units = gone.units.filter((u) => u.id !== unit.id);
      // the computer's play on the way here may have left a damage flash on this very hex: only the removal's own is counted
      const added = newSince(c);
      await animate({ t: 'removed', id: unit.id, reason: 'left the field' }, gone);
      expect(added().flashes.filter((f) => f.hex === unit.hex).map((f) => f.text)).toEqual(['Removed']);
      expect(lastLog(c)).toBe(`${s0.players.bottom.army} ${UNIT_STATS[unit.key].name} removed from the field (left the field).`);
    } finally {
      c.dispose();
    }
  });

  it('a notice shows once, however often it is asked for', async () => {
    const { c } = await settled('000', 'top');
    try {
      const text = 'Choose one of the highlighted hexes.';
      c.notice(text);
      expect(c.view.toast).toMatchObject({ text, kind: 'notice' });
      const id = c.view.toast?.id;
      c.notice(text);
      expect(c.view.toast?.id).toBe(id);
      c.notice('Another notice');
      expect(c.view.toast?.text).toBe(text); // waits for the first to run its time
    } finally {
      c.dispose();
    }
  });
});

describe('controller toasts', () => {
  useFakeClock();
  type Toaster = { toast(text: string, kind: 'turn' | 'notice', ms: number): void };
  /** A controller on 000 waiting for the human, animations skipped. */
  async function onDrill() {
    const c = new GameController({ ...newSessionConfig('000', 'bottom', 'recruit'), seed: 9 }, new SeededOpponent());
    await runToHuman(c);
    c.hurry();
    return { c, toast: (c as unknown as Toaster).toast.bind(c) };
  }

  it('a notice stays up for its full time: "Your turn" waits for it, then shows for its own', async () => {
    const { c, toast } = await onDrill();
    try {
      c.notice('First notice');
      const notice = c.view.toast;
      expect(notice).toMatchObject({ kind: 'notice' });
      await vi.advanceTimersByTimeAsync(300);
      toast('Your turn', 'turn', 1400);
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(1600); // 1.9 s after the notice appeared
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(200); // 2.1 s: the notice is over (at 2.0 s)
      expect(c.view.toast).toMatchObject({ kind: 'turn', text: 'Your turn' });
      await vi.advanceTimersByTimeAsync(1200); // 3.3 s
      expect(c.view.toast).toMatchObject({ kind: 'turn' });
      await vi.advanceTimersByTimeAsync(200); // 3.5 s: its own 1.4 s are over
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('two notices show one after the other; "Your turn" replaces nothing but another "Your turn"', async () => {
    const { c, toast } = await onDrill();
    try {
      toast('Your turn', 'turn', 1400);
      c.notice('One'); // a notice may replace "Your turn" at once
      const first = c.view.toast;
      expect(first).toMatchObject({ kind: 'notice', text: 'One' });
      c.notice('Two');
      expect(c.view.toast).toBe(first);
      await vi.advanceTimersByTimeAsync(2050);
      expect(c.view.toast).toMatchObject({ kind: 'notice', text: 'Two' });
      await vi.advanceTimersByTimeAsync(2050);
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('a "Your turn" still waiting when the human has already answered is dropped', async () => {
    const { c, toast } = await onDrill();
    try {
      c.notice('Busy');
      toast('Your turn', 'turn', 1400);
      c.driver.answers.push({ kind: 'endMove' } as never); // constructed: the human has answered since
      await vi.advanceTimersByTimeAsync(2050);
      expect(c.view.toast).toBeNull();
    } finally {
      c.driver.answers.pop();
      c.dispose();
    }
  });
});

describe('dev route', () => {
  it('starts every battle (000, and the stand-in 990)', () => {
    for (const s of SCENARIOS) {
      const cfg = devRouteConfig(`#/play/${s.id}/top/consul/42`)!;
      expect(cfg, s.id).toMatchObject({ scenarioId: s.id, humanSide: 'top', difficulty: 'consul', seed: 42 });
      const c = new GameController(cfg, new RandomOpponent());
      c.dispose();
      expect(c.driver.initial.scenarioId).toBe(s.id);
    }
    expect(devRouteConfig('#/play/000/bottom/recruit?cards=probeC')).toMatchObject({ scenarioId: '000', devCards: ['probeC'] });
    expect(devRouteConfig('#/play/999/bottom/recruit')).toBeNull();
    expect(devRouteConfig('#/gallery/art')).toBeNull();
  });
});
