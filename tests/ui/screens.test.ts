// Generic screens and controller plumbing, re-pointed at 000 after Plan 2A removed the Ancients battles: picker tabs,
// optional rules (start and restore), controller notices and toasts, the dev route.
// The mocked scenario list adds 990, a visible copy of 000 in the exp1 box that offers an optional rule (000 is hidden and
// offers none), so the picker and the option round trip have a battle to show.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_DEFS, UNIT_STATS, cardKind, cloneState, randomAnswer, type GameState, type QueuedEvent, type Side,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import {
  GameController, devRouteConfig, initialState, loadSaved, newSessionConfig, type SessionConfig,
} from '../../src/ui/game/controller';
import { RandomOpponent } from '../../src/ui/game/opponent';
import {
  OPTIONAL_RULES, PICKER_TABS, battlesOf, chosenOptions, loadOptionChoices, loadPickerTab, offeredOptions, optionValue,
  saveOptionChoice, savePickerTab, tabForKey,
} from '../../src/ui/screens/picker';
import { OptionToggle, ScenarioSelect } from '../../src/ui/screens/Menus';
import { stubStorage, dropStorage } from '../support/storage';
import { SeededOpponent, eventPlayer, newSince, runToHuman, useFakeClock } from './controller-helpers';

vi.mock('../../src/scenarios', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../src/scenarios')>();
  const raw = (await import('../../src/scenarios/data/000.json')).default as unknown as import('../../src/scenarios').ScenarioJson;
  const optioned = m.scenarioFromJson({
    ...raw, id: '990', name: 'Optioned drill', hidden: false, expansion: 'exp1', options: { tacticalFlexibility: true }, tacticalFlexibility: 'top',
  });
  const SCENARIOS = [...m.SCENARIOS, optioned];
  return { ...m, SCENARIOS, scenarioById: (id: string) => SCENARIOS.find((s) => s.id === id) ?? m.scenarioById(id) };
});

afterEach(dropStorage);

const sc = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('battle picker tabs', () => {
  it('four tabs, in box order; a battle is in exactly one tab; the hidden drill is in none', () => {
    expect(PICKER_TABS.map((t) => [t.id, t.label])).toEqual([
      ['base', 'Punic Wars'], ['exp1', 'Greece & the East'], ['exp2', 'Rome & the Barbarians'], ['exp3', 'Roman Civil Wars'],
    ]);
    expect(ids(battlesOf(SCENARIOS, 'exp1'))).toEqual(['990']);
    for (const t of ['base', 'exp2', 'exp3'] as const) expect(battlesOf(SCENARIOS, t)).toEqual([]);
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
    expect(tabForKey('exp1', 'ArrowRight')).toBe('exp2');
    expect(tabForKey('exp2', 'ArrowRight')).toBe('exp3');
    expect(tabForKey('exp3', 'ArrowRight')).toBe('base');
    expect(tabForKey('base', 'ArrowLeft')).toBe('exp3');
    expect(tabForKey('exp1', 'ArrowLeft')).toBe('base');
    expect(tabForKey('exp2', 'ArrowLeft')).toBe('exp1');
    expect(tabForKey('exp3', 'ArrowLeft')).toBe('exp2');
    expect(tabForKey('exp1', 'Home')).toBe('base');
    expect(tabForKey('exp3', 'Home')).toBe('base');
    expect(tabForKey('base', 'End')).toBe('exp3');
    for (const k of ['Enter', ' ', 'ArrowDown', 'a']) expect(tabForKey('base', k), k).toBeUndefined();
  });

  it('the tabs are ARIA tabs: the selected one is in the tab order and labels the battle list it controls', () => {
    const m = stubStorage();
    m.set('ccn-battle-tab', 'exp1');
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((x) => x[0]);
    expect(tabs).toHaveLength(4);
    const attr = (el: string, a: string) => new RegExp(`${a}="([^"]*)"`).exec(el)?.[1];
    expect(tabs.map((t) => attr(t, 'aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
    expect(tabs.map((t) => attr(t, 'tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    expect(tabs.map((t) => attr(t, 'aria-controls'))).toEqual(['battle-list', 'battle-list', 'battle-list', 'battle-list']);
    expect(html).toMatch(/role="tablist" aria-label="Battles"/);
    const panel = /<div[^>]*role="tabpanel"[^>]*>/.exec(html)![0];
    expect(attr(panel, 'id')).toBe('battle-list');
    expect(attr(panel, 'aria-labelledby')).toBe(attr(tabs[1], 'id'));
    expect(html).toContain('Optioned drill'); // the Expansion #1 list is the one shown
    expect(html).not.toContain('>Drill<');
  });
});

describe('optional rules in the briefing', () => {
  it('only a battle with `options` offers one, on by default', () => {
    expect(SCENARIOS.filter((s) => offeredOptions(s).length).map((s) => s.id)).toEqual(['990']);
    expect(offeredOptions(sc('990'))).toEqual(['tacticalFlexibility']);
    expect(optionValue(sc('990'), 'tacticalFlexibility', {})).toBe(true);
    expect(chosenOptions(sc('000'), { tacticalFlexibility: false })).toBeUndefined();
  });

  it('the explanation names the army it weakens', () => {
    expect(OPTIONAL_RULES.tacticalFlexibility.text(sc('990'))).toMatch(/^non-Roman heavy infantry .* only 3 dice\.$/);
  });

  it('the switch: the checkbox carries the state, the visible on/off word is hidden from screen readers', () => {
    const html = (on: boolean) => renderToStaticMarkup(createElement(OptionToggle, { sc: sc('990'), id: 'tacticalFlexibility', on, onToggle: () => {} }));
    expect(html(true)).toMatch(/<input type="checkbox" checked=""\/>/);
    expect(html(true)).toContain('<i aria-hidden="true">on</i>');
    expect(html(false)).not.toMatch(/checked/);
    expect(html(false)).toContain('<i aria-hidden="true">off</i>');
    expect(html(false)).toContain(OPTIONAL_RULES.tacticalFlexibility.name);
  });

  it('a remembered choice overrides the default and is kept per option in ccn-options', () => {
    const m = stubStorage();
    expect(loadOptionChoices()).toEqual({});
    const c = saveOptionChoice({}, 'tacticalFlexibility', false);
    expect(JSON.parse(m.get('ccn-options')!)).toEqual({ tacticalFlexibility: false });
    expect(loadOptionChoices()).toEqual({ tacticalFlexibility: false });
    expect(chosenOptions(sc('990'), c)).toEqual({ tacticalFlexibility: false });
    m.set('ccn-options', JSON.stringify({ tacticalFlexibility: 'no', bogus: true }));
    expect(loadOptionChoices()).toEqual({});
    m.set('ccn-options', '{not json');
    expect(loadOptionChoices()).toEqual({});
  });
});

describe('optional rules reach the engine on start and on restore', () => {
  useFakeClock();
  const tf = (s: GameState) => s.scenario.tacticalFlexibility !== null;

  it('the session config carries the options into createGame', () => {
    const off = newSessionConfig('990', 'bottom', 'recruit', { tacticalFlexibility: false });
    expect(off.options).toEqual({ tacticalFlexibility: false });
    expect(tf(initialState(off))).toBe(false);
    expect(tf(initialState({ ...off, options: undefined }))).toBe(true); // the scenario default
    expect(tf(initialState({ ...off, options: { tacticalFlexibility: true } }))).toBe(true);
    expect(newSessionConfig('990', 'bottom', 'recruit').options).toBeUndefined();
    expect(newSessionConfig('990', 'bottom', 'recruit', {}).options).toBeUndefined();
  });

  it('a saved battle with the option off is restored with it off', async () => {
    const m = stubStorage();
    const cfg: SessionConfig = { ...newSessionConfig('990', 'bottom', 'recruit', { tacticalFlexibility: false }), seed: 777 };
    const c = new GameController(cfg, new SeededOpponent());
    try {
      expect(tf(c.driver.initial)).toBe(false);
      await runToHuman(c); // wait for the human's first decision, then answer it (which saves)
      c.answer(randomAnswer(c.driver.state, c.view.pending!, () => 0.3));
    } finally {
      c.dispose();
    }
    expect(m.has('ccn-autosave-v1')).toBe(true);
    const saved = loadSaved()!;
    expect(saved.config.options).toEqual({ tacticalFlexibility: false });
    expect(saved.answers.length).toBeGreaterThan(0);
    const r = new GameController(saved.config, new RandomOpponent(), saved.answers, saved.check);
    try {
      expect(tf(r.driver.initial)).toBe(false);
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

  it('a unit removed from the field gets the generic notice', async () => {
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
      expect(lastLog(c)).toBe(`${s0.players.bottom.army} ${UNIT_STATS[unit.type].name} removed from the field (no banner).`);
    } finally {
      c.dispose();
    }
  });

  it('a lost command card is named to the human, and kept hidden for the computer', async () => {
    const { c, animate } = await settled('000', 'bottom');
    try {
      const s0 = c.driver.state;
      const mine = s0.players.bottom.hand[0];
      const title = CARD_DEFS[cardKind(mine)].title;
      await animate({ t: 'cardLost', side: 'bottom', card: mine }, s0);
      expect(c.view.toast).toMatchObject({ kind: 'notice', text: `You lose a command card: ${title}` });
      expect(lastLog(c)).toBe(`The ${s0.players.bottom.army} army loses a command card (${title}).`);
      const theirs = s0.players.top.hand[0];
      await animate({ t: 'cardLost', side: 'top', card: theirs }, s0);
      expect(lastLog(c)).toBe(`The ${s0.players.top.army} army loses a command card.`);
      await vi.advanceTimersByTimeAsync(2800); // the second notice waits for the first
      expect(c.view.toast).toMatchObject({ kind: 'notice', text: `${s0.players.top.army} loses a command card` });
      expect(c.view.toast!.text).not.toContain(CARD_DEFS[cardKind(theirs)].title);
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
    const s0 = c.driver.state;
    const lose = async () => {
      const done = (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate({ e: { t: 'cardLost', side: 'bottom', card: s0.players.bottom.hand[0] }, state: s0 });
      await vi.advanceTimersByTimeAsync(0);
      await done;
    };
    return { c, lose, toast: (c as unknown as Toaster).toast.bind(c) };
  }

  it('a card-loss notice stays up for its full time: "Your turn" waits for it, then shows for its own', async () => {
    const { c, lose, toast } = await onDrill();
    try {
      await lose();
      const notice = c.view.toast;
      expect(notice).toMatchObject({ kind: 'notice' });
      await vi.advanceTimersByTimeAsync(300);
      toast('Your turn', 'turn', 1400);
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(2400); // 2.7 s after the notice appeared
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(200); // 2.9 s: the notice is over (at 2.8 s)
      expect(c.view.toast).toMatchObject({ kind: 'turn', text: 'Your turn' });
      await vi.advanceTimersByTimeAsync(1200); // 4.1 s
      expect(c.view.toast).toMatchObject({ kind: 'turn' });
      await vi.advanceTimersByTimeAsync(200); // 4.3 s: its own 1.4 s are over
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('two notices show one after the other; "Your turn" replaces nothing but another "Your turn"', async () => {
    const { c, lose, toast } = await onDrill();
    try {
      toast('Your turn', 'turn', 1400);
      await lose(); // a notice may replace "Your turn" at once
      const first = c.view.toast;
      expect(first).toMatchObject({ kind: 'notice' });
      await lose();
      expect(c.view.toast).toBe(first);
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toMatchObject({ kind: 'notice' });
      expect(c.view.toast).not.toBe(first);
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('a "Your turn" still waiting when the human has already answered is dropped', async () => {
    const { c, lose, toast } = await onDrill();
    try {
      await lose();
      toast('Your turn', 'turn', 1400);
      c.driver.answers.push({ kind: 'endMove' }); // constructed: the human has answered since
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toBeNull();
    } finally {
      c.driver.answers.pop();
      c.dispose();
    }
  });
});

describe('dev route', () => {
  it('starts every battle', () => {
    for (const s of SCENARIOS) {
      const cfg = devRouteConfig(`#/play/${s.id}/top/consul/42`)!;
      expect(cfg, s.id).toMatchObject({ scenarioId: s.id, humanSide: 'top', difficulty: 'consul', seed: 42 });
      const c = new GameController(cfg, new RandomOpponent());
      c.dispose();
      expect(c.driver.initial.scenarioId).toBe(s.id);
    }
    expect(devRouteConfig('#/play/000/bottom/recruit?cards=leadershipAny')).toMatchObject({ scenarioId: '000', devCards: ['leadershipAny'] });
    expect(devRouteConfig('#/play/999/bottom/recruit')).toBeNull();
    expect(devRouteConfig('#/gallery/art')).toBeNull();
  });
});
