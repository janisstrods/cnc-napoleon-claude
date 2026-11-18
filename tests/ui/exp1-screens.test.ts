// Plan 7C Task 17: the Spanish battles 101-118 on the screens: the picker tab, random battle, Triumphs, the Expansion #1 rules tab
// and the Walled Farm row of the Terrain tab. Rules text is written from RR §15 (design/rules-reference.md).
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { MOVE_FIRST_VALUE, UNIT_KEYS, UNIT_STATS, CARD_DEFS, createGame, other, type GameState, type Side } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { CATALOGUE } from '../../src/scenarios/catalogue';
import { TEXTS } from '../../src/scenarios/texts';
import type { GameController, ViewState } from '../../src/ui/game/controller';
import { committedShown } from '../../src/ui/game/panels';
import { eventLog, rollSummary } from '../../src/ui/game/logText';
import { gamePrompt } from '../../src/ui/game/prompts';
import { handShrinkNote } from '../../src/ui/game/squareText';
import type { UiSel } from '../../src/ui/game/uiModel';
import { recordTotals } from '../../src/ui/record';
import { personalityFor } from '../../src/ai/personality';
import { RulesTabBody, terrainRows } from '../../src/ui/screens/RulesReference';
import { RULES_TEXT } from '../../src/ui/screens/rulesText';
import { ScenarioSelect } from '../../src/ui/screens/Menus';
import { TriumphsDialog, tallyText } from '../../src/ui/screens/Triumphs';
import { battlesOf, randomPick, visibleBattles } from '../../src/ui/screens/picker';
import { dropStorage, stubStorage } from '../support/storage';

afterEach(dropStorage);

const SPANISH = Array.from({ length: 18 }, (_, i) => String(101 + i));
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const text = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ');

describe('Expansion #1 in the picker', () => {
  it('the Spanish tab of the picker lists 101–118 in order with their briefings', () => {
    stubStorage().set('ccn-battle-tab', 'exp1');
    expect(battlesOf(SCENARIOS, 'exp1').map((s) => s.id)).toEqual(SPANISH);
    const list = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    expect([...list.matchAll(/scen-item/g)]).toHaveLength(18);
    for (const id of SPANISH) {
      const name = SCENARIOS.find((s) => s.id === id)!.name;
      expect(list, id).toContain(esc(name));
      const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle: id }));
      expect(html, id).toContain(esc(TEXTS[id].blurb));
      for (const line of TEXTS[id].specialText ?? []) expect(html, `${id}: ${line}`).toContain(esc(line));
    }
  });

  it('the Vitoria briefing does not name a side that moves first: the opening cards decide', () => {
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle: '116' }));
    expect(text(html)).not.toMatch(/(Allied|French) move first/);
    expect(text(html)).toContain('Opening cards decide who moves first');
    expect(text(renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle: '101' })))).toContain('French move first');
  });

  it('random battle may land on a Spanish battle', () => {
    const spanish = new Set<string>();
    const n = visibleBattles(SCENARIOS).length;
    for (let i = 0; i < n - 1; i++) {
      const r = randomPick(SCENARIOS, '001', () => (i + 0.5) / (n - 1)); // always below 1
      if (r && SPANISH.includes(r.battle.id)) spanish.add(r.battle.id);
    }
    expect(spanish.size).toBe(18);
  });
});

describe('Triumphs with the Spanish battles', () => {
  it('Triumphs lists all 33 battles and none is "Not yet available"; the tally counts 33 battles', () => {
    stubStorage();
    const html = renderToStaticMarkup(createElement(TriumphsDialog, { open: true, record: {}, onClose: () => {}, onRecord: () => {}, onPick: () => {} }));
    expect(CATALOGUE).toHaveLength(33);
    expect(html).not.toContain('Not yet available');
    expect(html.split('class="tri-cell"').length - 1).toBe(33);
    for (const c of CATALOGUE) expect(html.split(`>${esc(c.name)}<`).length - 1, c.name).toBe(1);
    const t = tallyText(recordTotals({}, visibleBattles(SCENARIOS).map((s) => s.id)));
    expect(t).toContain('of 66 medals');
    expect(t).toContain('of 33 battles fought');
  });
});

describe('the Expansion #1 rules tab', () => {
  const html = renderToStaticMarkup(createElement(RulesTabBody, { tab: 'exp1' }));

  it('shows every exp1 row once and the readings as plain notes', () => {
    const rows = UNIT_KEYS.filter((k) => UNIT_STATS[k].expansion === 'exp1');
    expect(rows).toHaveLength(12);
    expect(html.split('class="unit-card"').length - 1).toBe(rows.length);
    const heads = [...html.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]);
    for (const h of ['Spanish units', 'Swiss infantry', 'Lancers and Guard light cavalry', 'Moving penalties', 'Retreats of two and three hexes', 'Guerrilla Action', 'Terrain and water', 'Mixed armies', 'New objectives']) expect(heads, h).toContain(h);
    // groups: Spanish, then Swiss, then French
    const group = (h: string) => html.split(/<h3>/).find((p) => p.startsWith(`${h}<`))!;
    const cards = (h: string) => [...group(h).matchAll(/unit-card-title">([\s\S]*?)<\/div>/g)].map((m) => text(m[1]));
    expect(cards('Spanish units')).toHaveLength(rows.filter((k) => k.startsWith('SP/') && k !== 'SP/SWI').length);
    expect(cards('Swiss infantry')).toHaveLength(2);
    expect(cards('Lancers and Guard light cavalry')).toHaveLength(2);
    expect(html.indexOf('Spanish units')).toBeLessThan(html.indexOf('Swiss infantry'));
    expect(html.indexOf('Swiss infantry')).toBeLessThan(html.indexOf('Lancers and Guard light cavalry'));
    const readings = RULES_TEXT.exp1.flatMap((b) => (b.reading ? [b.reading] : []));
    expect(readings.length).toBeGreaterThanOrEqual(10);
    for (const r of readings) {
      expect(r).not.toContain('[Interp');
      expect(r).not.toMatch(/\bS\d+\b/);
    }
    expect((text(html).match(/Our reading:/g) ?? []).length).toBe(readings.length);
    expect(text(html)).not.toMatch(/\b(color|center|maneuver|defense|armor)\b/i);
    expect(text(html)).not.toMatch(/\bS\d{1,2}\b|\bR\d{1,2}\b|Plan \d/);
  });

  it('carries the readings of S7, S8, S16, S20, S30, S33, S34, S36, S38 and S43', () => {
    const t = text(html);
    const reads = (re: RegExp) => expect(RULES_TEXT.exp1.some((b) => b.reading && re.test(b.reading)), String(re)).toBe(true);
    reads(/0 dice.*melee|melee.*0 dice/i);          // S7
    reads(/battle back.*standing|standing.*battle back/i); // S8
    reads(/whole .*side|side.*not .*nation/i);      // S16
    reads(/six/i);                                  // S20
    reads(/leader.*stays|stays.*leader/i);          // S30
    reads(/square track/i);                         // S33
    reads(/two units.*whole battle|whole battle.*two units/i); // S34
    reads(/lost at once|at once/i);                 // S36
    reads(/Scout is 1|Scout 1|Scout.*one/i);        // S38
    reads(/moves second/i);                         // S43
    expect(t).toMatch(/Guerrilla Action/);
  });
});

describe('the Walled Farm in the Terrain tab', () => {
  it('has its row with its icon', () => {
    const row = terrainRows().find((r) => r.key === 'terrain:walledFarm')!;
    expect(row.name).toBe('Walled farm');
    expect(row.icon).not.toBeNull();
    expect(renderToStaticMarkup(row.icon!)).toContain('<svg');
    expect(row.text).toMatch(/town/i);
    const trs = [...renderToStaticMarkup(createElement(RulesTabBody, { tab: 'terrain' })).matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    expect(trs.some((tr) => text(tr).trim().startsWith('Walled farm') && tr.includes('<svg'))).toBe(true);
  });
});

// ---- carries from the Task 15 re-review and the Task 16 play-throughs ----

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
const noop = () => {};

describe('Move First: a neutral bar while the picks are made (r1)', () => {
  const bar = (s: GameState, human: Side) => {
    const view = { pending: null, over: null, fatal: false, aiThinking: false, generalThinking: false, undo: null } as unknown as ViewState;
    return gamePrompt({ controller: {} as GameController, view, s, human, ai: other(human), ui: SEL, setUi: noop, answer: noop, onExit: noop });
  };

  it('shows "Choosing opening cards…" with no side named, whether or not the computer is asked, until the reveal', () => {
    const s = createGame(scenarioById('116').setup, 1);
    expect(s.special.moveFirst?.done).toBe(false);
    for (const human of ['top', 'bottom'] as const) {
      const p = bar(s, human);
      expect(p?.title).toBe('Choosing opening cards…');
      expect(p?.text).toBe('');
      expect(p?.buttons).toEqual([]);
    }
    // the computer's side picked nothing (not asked) or is being asked: the same bar, so it tells nothing
    const t = createGame(scenarioById('116').setup, 1);
    t.special.moveFirst = { done: false, picks: { top: null, bottom: null }, committed: { top: null, bottom: null } };
    expect(bar(t, 'bottom')?.title).toBe(bar(s, 'bottom')?.title);
    // after the reveal the ordinary bar is back
    const u = createGame(scenarioById('116').setup, 1);
    u.special.moveFirst = { done: true, picks: { top: null, bottom: null }, committed: { top: null, bottom: null } };
    expect(bar(u, 'bottom')?.title).not.toBe('Choosing opening cards…');
    // any other battle never shows it
    expect(bar(createGame(scenarioById('103').setup, 1), 'bottom')?.title).not.toBe('Choosing opening cards…');
  });
});

describe('keyboard source pins (r2)', () => {
  const src = readFileSync('src/ui/game/GameScreen.tsx', 'utf8');
  it('the screen-wide Enter handler asks enterBelongsToHand first', () => {
    expect(src).toMatch(/if \(e\.key === 'Enter'\) \{\s*\/\/[^\n]*\n\s*if \(enterBelongsToHand\(t instanceof Element \? t : null, e\.defaultPrevented\)\) return;/);
  });
  it('the primary-button lookup skips a button marked data-nofocus', () => {
    expect(src).toContain(".prompt-buttons .kit-btn--primary:not(:disabled):not([data-nofocus])");
  });
});

describe('the committed card shows only for the second player before its first turn (r3)', () => {
  const g = (done: boolean, turnsDone: { top: number; bottom: number }) => {
    const s = createGame(scenarioById('116').setup, 1);
    s.special.moveFirst = { done, picks: { top: 1, bottom: 2 }, committed: { top: 1, bottom: 2 } };
    s.special.turnsDone = turnsDone;
    return s;
  };
  it('false for the side that moves first, true for the other, false before the reveal and after its turn', () => {
    const s = g(true, { top: 0, bottom: 0 });
    const second = other(s.first);
    expect(committedShown(s, s.first)).toBe(false);
    expect(committedShown(s, second)).toBe(true);
    expect(committedShown(g(false, { top: 0, bottom: 0 }), second)).toBe(false);
    expect(committedShown(g(true, { top: 1, bottom: 1 }), second)).toBe(false);
  });
});

describe('Guerrilla roll: the card is lost once (Task 16 play-through)', () => {
  it('the roll subtitle says the card is lost; the log line says what it cost', () => {
    const s = createGame(scenarioById('103').setup, 1);
    const ev = eventLog({ t: 'guerrilla', side: 'top', what: 'cancelled', held: 0, pool: 6 }, s, s, 'bottom')!.text;
    const roll = rollSummary('guerrilla', ['flag'], [false]);
    expect(roll).toBe('No sabre: the card is lost');
    expect(ev).not.toMatch(/is lost/);
    expect(ev).toBe('Guerrillas cut the French orders: nothing moves this turn.');
  });
});

describe('106 shows one hand line (Task 15 re-review)', () => {
  it('the side panel has no second "Hand size" row; the rule is a note on the hand line', () => {
    const src = readFileSync('src/ui/game/GameScreen.tsx', 'utf8');
    expect(src).not.toContain('HandSizeLine');
    expect(src).toContain('handShrinkNote(');
    const s = createGame(scenarioById('106').setup, 1);
    expect(handShrinkNote(s, 'top')).toBe('The hand falls by one with each banner the French win, down to 3.');
    expect(handShrinkNote(s, 'bottom')).toBeUndefined();
    expect(handShrinkNote(createGame(scenarioById('103').setup, 1), 'top')).toBeUndefined();
  });
});

describe('rules text review round 1', () => {
  const all = RULES_TEXT.exp1.map((b) => [...b.paragraphs, b.reading ?? ''].join(' ')).join(' ');
  const block = (h: string) => RULES_TEXT.exp1.find((b) => b.heading === h)!;
  it('Zornoza exits: the Spanish leave by their own baseline; lancer First Strike; one-block rows', () => {
    const obj = block('New objectives').paragraphs.join(' ');
    expect(obj).toMatch(/Spanish may move units off the board by their own baseline/);
    expect(obj).not.toMatch(/far edge/);
    expect(block('Lancers and Guard light cavalry').paragraphs.join(' ')).toMatch(/First Strike[^.]*not against a cuirassier/);
    expect(block('Cells with no dice').paragraphs.join(' ')).toMatch(/Spanish line, Light infantry or Militia/);
    expect(block('Moving penalties').reading).not.toMatch(/because/);
  });
  it('the Vitoria values name every eligible card kind', () => {
    const text = block('Vitoria: the opening cards');
    const t = [...text.paragraphs, text.reading ?? ''].join(' ');
    const kinds = Object.keys(MOVE_FIRST_VALUE) as (keyof typeof MOVE_FIRST_VALUE)[];
    for (const k of kinds) {
      const title = CARD_DEFS[k as keyof typeof CARD_DEFS].title.replace(/ (Left|Centre|Right)$/, '');
      expect(t.includes(title), String(k)).toBe(true);
    }
    expect(all).not.toMatch(/value of a card is the units it orders/);
  });
  it('the personality of the computer general takes the commander nation', () => {
    const mk = readFileSync('src/ui/game/makeOpponent.ts', 'utf8');
    const menus = readFileSync('src/ui/screens/Menus.tsx', 'utf8');
    expect(mk).toMatch(/personalityFor\(army\.commander, army\.army, army\.nation\)/);
    expect(menus).toMatch(/personalityFor\(enemy\.commander, enemy\.army, enemy\.nation\)/);
    expect(personalityFor('', 'Spanish', 'SP').id).toBeTruthy();
  });
});
