// Plan 7C Task 15: Guerrilla Action and Vitoria's opening on screen (RR §15.5, §16.16).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, GameDriver, answerError, cardKind, createGame, guerrillaHeld, other, randomAnswer,
  type Decision, type GameEvent, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { GameController, newSessionConfig, type ViewState } from '../../src/ui/game/controller';
import { aiPacing } from '../../src/ui/game/controller';
import { enterBelongsToHand, freshSelection } from '../../src/ui/game/boardKeys';
import { gamePrompt, focusPromptTarget } from '../../src/ui/game/prompts';
import { decisionTitle, promptSpec } from '../../src/ui/game/promptSpec';
import { GuerrillaCounters, HandStrip } from '../../src/ui/game/panels';
import { handChoices, undoBlockedNote, type UiSel } from '../../src/ui/game/uiModel';
import { mulberry32 } from '../support/rng';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };
const noop = () => {};
const html = (el: JSX.Element) => renderToStaticMarkup(el);

type Guerrilla = Extract<Decision, { kind: 'guerrilla' }>;
const spend: Guerrilla = { kind: 'guerrilla', side: 'top', mode: 'spend', card: 'attackC', held: 1, pool: 5 };
const scout: Guerrilla = { kind: 'guerrilla', side: 'top', mode: 'scout', card: 'scoutC', held: 1, pool: 5 };

/** The prompt bar of `d` for the human, with the controller and view faked (only what gamePrompt reads). */
function bar(s: GameState, d: Decision, human: Side, undo: ViewState['undo'] = null) {
  const view = { pending: d, over: null, fatal: false, aiThinking: false, generalThinking: false, undo } as unknown as ViewState;
  return gamePrompt({ controller: {} as GameController, view, s, human, ai: other(human), ui: SEL, setUi: noop, answer: noop, onExit: noop });
}
const markup = (p: ReturnType<typeof bar>) => (p?.buttons ?? []).map((b) => html(b));

describe('Guerrilla prompts', () => {
  const s = createGame(scenarioById('103').setup, 1);

  it('spend prompt: title, the card named, the odds, two answers legal, then the general', () => {
    const p = promptSpec(s, spend);
    expect(p.title).toBe('Guerrilla Action');
    expect(p.title).toBe(decisionTitle(spend));
    expect(p.text).toContain(CARD_DEFS.attackC.title);
    expect(p.text).toContain('It fails only on a sabre: 1 chance in 6.');
    expect(p.actions.map((a) => [a.key, a.label])).toEqual([['yes', 'Spend a counter'], ['no', 'Keep it'], ['auto', 'Let the general decide']]);
    expect(p.actions[0].answer).toEqual({ kind: 'yesno', yes: true });
    expect(p.actions[1].answer).toEqual({ kind: 'yesno', yes: false });
    for (const a of p.actions) if (a.answer !== 'auto') expect(answerError(s, spend, a.answer), a.key).toBeNull();
  });

  it('scout prompt: two answers legal, then the general', () => {
    const p = promptSpec(s, scout);
    expect(p.title).toBe('Guerrilla Action: Scout');
    expect(p.text).toContain('instead of drawing');
    expect(p.text).not.toContain(CARD_DEFS.scoutC.title);
    expect(p.title).toBe(decisionTitle(scout));
    expect(p.actions.map((a) => [a.key, a.label])).toEqual([['yes', 'Take a counter (draw 1 card)'], ['no', 'Draw 2, keep 1'], ['auto', 'Let the general decide']]);
    for (const a of p.actions) if (a.answer !== 'auto') expect(answerError(s, scout, a.answer), a.key).toBeNull();
  });

  it('keyboard: spending is irreversible, so no Enter takes it by default; taking a Scout counter is the primary button', () => {
    const [yes, no, auto] = markup(bar(s, spend, 'top'));
    for (const b of [yes, no, auto]) expect(b).toContain('data-nofocus');
    const [yes2, no2, auto2] = markup(bar(s, scout, 'top'));
    expect(yes2).toContain('kit-btn--primary');
    expect(yes2).not.toContain('data-nofocus');
    expect(no2).toContain('data-nofocus');
    expect(auto2).toContain('data-nofocus');
    // a prompt with nothing safe to focus falls to the bar itself
    expect(focusPromptTarget({ querySelector: (sel: string) => (sel === '.prompt-bar' ? { focus: () => {} } : null) })).toBe('bar');
  });
});

describe('keyboard: Enter on a hand card', () => {
  it('only selects it: the screen-wide Enter handler leaves a hand card (and a handled key) alone', () => {
    const inHand = { closest: (sel: string) => (sel === '.hand-cards' ? {} : null) };
    const elsewhere = { closest: () => null };
    expect(enterBelongsToHand(inHand, false)).toBe(true);
    expect(enterBelongsToHand(elsewhere, false)).toBe(false);
    expect(enterBelongsToHand(elsewhere, true)).toBe(true);
    expect(enterBelongsToHand(null, false)).toBe(false);
  });
});

describe('Move First prompt', () => {
  const s = createGame(scenarioById('116').setup, 1);
  const d = new GameDriver(s).pending as Extract<Decision, { kind: 'moveFirst' }>;

  it('is the playCard hand chooser: title, text with the tie side from the state, one action per eligible card, all legal', () => {
    expect(d.kind).toBe('moveFirst');
    const p = promptSpec(s, d);
    expect(p.title).toBe('Choose your opening card');
    expect(p.text).toBe('The card ordering fewer units moves first; the Allies win a tie.');
    expect(s.players[s.first].army).toBe('Allied');
    expect(p.actions.slice(0, -1).map((a) => a.answer)).toEqual(d.options.map((card) => ({ kind: 'playCard', card })));
    for (const a of p.actions) if (a.answer !== 'auto') expect(answerError(s, d, a.answer), a.key).toBeNull();
    // the other army's word comes from the state too
    const t = { ...s, first: other(s.first) } as GameState;
    expect(promptSpec(t, d).text).toBe(`The card ordering fewer units moves first; the ${t.players[t.first].army} win a tie.`);
  });

  it('marks only eligible cards in the hand; an ineligible card is not clickable', () => {
    const hand = s.players[d.side].hand;
    const odd: Decision = { kind: 'moveFirst', side: d.side, options: [hand[0]] };
    expect(handChoices(s, odd, d.side)).toEqual([hand[0]]);
    expect(handChoices(s, { kind: 'playCard', side: d.side }, d.side)).toEqual(hand);
    expect(handChoices(s, odd, other(d.side))).toEqual([]);
    const out = html(createElement(HandStrip, { s, d: odd, human: d.side, ui: SEL, setUi: noop }));
    expect(out.match(/is-playable/g)).toHaveLength(1);
    expect(out.match(/is-disabled/g)).toHaveLength(hand.length - 1);
  });

  it('a first-turn playCard bound to the committed card offers only that card', () => {
    const t = createGame(scenarioById('116').setup, 1);
    const hand = t.players.bottom.hand;
    t.special.moveFirst = { done: true, picks: { top: null, bottom: hand[2] }, committed: { top: null, bottom: hand[2] } };
    expect(handChoices(t, { kind: 'playCard', side: 'bottom' }, 'bottom')).toEqual([hand[2]]);
    t.special.turnsDone.bottom = 1;
    expect(handChoices(t, { kind: 'playCard', side: 'bottom' }, 'bottom')).toEqual(hand);
  });
});

/** A controller on 116 whose displayed state is edited by `edit`, rendered as the whole game screen. */
async function screenOf(human: Side, edit: (s: GameState) => void, scenario = '116'): Promise<string> {
  const { GameScreen } = await import('../../src/ui/game/GameScreen');
  const c = new GameController({ ...newSessionConfig(scenario, human, 'captain'), seed: 5 }, new SeededOpponent());
  try {
    edit(c.view.display);
    return html(createElement(GameScreen, { controller: c, onExit: noop }));
  } finally {
    c.dispose();
  }
}

describe('the opening cards on the screen', () => {
  it("the opponent's pick is not in the DOM, a title or an aria-label before the reveal", async () => {
    // the engine writes picks only at the reveal; even a state that held one early must not show it
    const secret = (s: GameState) => {
      const own = new Set(s.players.bottom.hand.map((c) => CARD_DEFS[cardKind(c)].title));
      const card = s.deck.find((c) => !own.has(CARD_DEFS[cardKind(c)].title) && cardKind(c) !== 'forward')!;
      return card;
    };
    let title = '';
    const out = await screenOf('bottom', (s) => {
      const card = secret(s);
      title = CARD_DEFS[cardKind(card)].title;
      s.special.moveFirst = { done: false, picks: { top: card, bottom: null }, committed: { top: card, bottom: null } };
    });
    expect(title.length).toBeGreaterThan(0);
    expect(out).not.toContain(title);
    expect(out).not.toContain('Opening card');
    expect(out).not.toContain('committed-card');
  });

  it("the committed card shows face up beside the second player's hand until its first turn ends", async () => {
    const edit = (turns: number, human: Side) => (s: GameState) => {
      const second = other(s.first);
      const card = s.players[second].hand[0];
      s.special.moveFirst = { done: true, picks: { top: null, bottom: null, [second]: card }, committed: { top: null, bottom: null, [second]: card } };
      s.special.turnsDone[second] = turns;
      s.active = turns ? s.active : s.first;
      void human;
    };
    for (const human of ['top', 'bottom'] as Side[]) {
      const probe = createGame(scenarioById('116').setup, 5);
      const second = other(probe.first);
      const title = CARD_DEFS[cardKind(probe.players[second].hand[0])].title;
      const before = await screenOf(human, edit(0, human));
      expect(before).toContain('Opening card');
      expect(before).toContain(title); // face up: the title is readable (CardView), whoever the human is
      if (human === second) expect(before).toContain('is-committed'); // the human's own card is marked in its hand
      else expect(before).toContain(`class="committed-card" data-side="${second}"`);
      const after = await screenOf(human, edit(1, human));
      expect(after, human).not.toContain('committed-card');
      expect(after, human).not.toContain('is-committed');
    }
  });
});

describe('the side rules in the army panel', () => {
  it('the counter panel shows held and pool and changes after a gained event', () => {
    const s0 = createGame(scenarioById('103').setup, 1);
    const side = 'top' as const;
    const text = (st: GameState) => html(createElement(GuerrillaCounters, { s: st, side })).replace(/<[^>]+>/g, '');
    expect(text(s0)).toContain('1 held · 5 in the pool');
    expect(html(createElement(GuerrillaCounters, { s: s0, side }))).toContain('guerrilla-counters');
    // a real game: the panel follows the engine's own gained and spent counts
    const seen = new Set<string>();
    let gained = false;
    for (let seed = 1; seed <= 40 && !gained; seed++) {
      const g = new GameDriver(createGame(scenarioById('103').setup, seed), { snapshots: true });
      const rnd = mulberry32(seed);
      for (let n = 0; n < 400 && g.pending && !gained; n++) {
        g.answer(randomAnswer(g.state, g.pending, rnd));
        for (const q of g.drainEvents()) {
          const e = q.e as GameEvent;
          if (e.t !== 'guerrilla' || !q.state) continue;
          const t = text(q.state);
          expect(t).toContain(`${e.held} held · ${e.pool} in the pool`);
          seen.add(t);
          if (e.what === 'gained') gained = true;
        }
      }
    }
    expect(gained).toBe(true);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('the counters are drawn at 24 px or larger', () => {
    const s = createGame(scenarioById('103').setup, 1);
    const out = html(createElement(GuerrillaCounters, { s, side: 'top' }));
    const sizes = [...out.matchAll(/<svg[^>]*width="(\d+)"/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBe(6);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
  });

  it('the counter panel is for the guerrilla side only', () => {
    const s = createGame(scenarioById('103').setup, 1);
    expect(html(createElement(GuerrillaCounters, { s, side: 'bottom' }))).toBe('');
    expect(html(createElement(GuerrillaCounters, { s: createGame(scenarioById('116').setup, 1), side: 'top' }))).toBe('');
  });
});

describe('the events reach the screen', () => {
  useFakeClock();

  it('the reveal is logged with both picks, and shows the picks only after it', async () => {
    const c = new GameController({ ...newSessionConfig('116', 'bottom', 'captain'), seed: 5 }, new SeededOpponent());
    try {
      await runToHuman(c);
      const d = c.view.pending!;
      expect(d.kind).toBe('moveFirst');
      expect(c.view.display.special.moveFirst?.picks).toEqual({ top: null, bottom: null });
      c.answer(randomAnswer(c.driver.state, d, mulberry32(1)));
      await runToHuman(c);
      expect(c.view.log.map((l) => l.text).some((x) => x.startsWith('Opening cards:'))).toBe(true);
      expect(c.view.display.special.moveFirst?.done).toBe(true);
    } finally {
      c.dispose();
    }
  });
});

describe('Undo after a Guerrilla answer', () => {
  useFakeClock();

  it('says why Undo is gone once the guerrilla side has answered, and only then', async () => {
    let withNote = 0;
    let without = 0;
    // 103: the guerrilla side holds a counter and is asked; 102: it holds none, so nothing was asked and Undo stays
    for (let seed = 1; seed <= 30 && (!withNote || !without); seed++) {
      const c = new GameController({ ...newSessionConfig(seed % 2 ? '103' : '102', 'bottom', 'captain'), seed }, new SeededOpponent(seed));
      try {
        await runToHuman(c);
        const rnd = mulberry32(seed);
        c.answer(randomAnswer(c.driver.state, c.view.pending!, rnd));
        await runToHuman(c);
        const d = c.view.pending!;
        if (d.kind !== 'orders') continue;
        const p = gamePrompt({ controller: c, view: c.view, s: c.view.display, human: 'bottom', ai: 'top', ui: SEL, setUi: noop, answer: noop, onExit: noop })!;
        const asked = c.view.undo === null;
        if (asked) {
          withNote++;
          expect(p.note, `seed ${seed}`).toBe('Undo is not available: the Spanish have answered the Guerrilla Action, so your card stands.');
          expect(markup(p).join('')).not.toContain('Undo card');
        } else {
          without++;
          expect(p.note).toBeUndefined();
          expect(markup(p).join('')).toContain('Undo card');
        }
      } finally {
        c.dispose();
      }
    }
    expect(withNote).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
  });

  it('the guerrilla side itself never sees the note', () => {
    const s = createGame(scenarioById('103').setup, 1);
    s.turn.card = s.players.top.hand[0];
    s.active = 'top';
    expect(guerrillaHeld(s)).toBe(1);
    const p = bar(s, { kind: 'orders', side: 'top', card: 'attackC', mirrored: false, single: false }, 'top', null);
    expect(p?.note).toBeUndefined();
  });
});

describe('review round 1', () => {
  const s103 = createGame(scenarioById('103').setup, 1);
  const s116 = createGame(scenarioById('116').setup, 1);

  it('the computer asking Move First shows no tell: no thinking indicator, no pause', () => {
    expect(aiPacing({ kind: 'moveFirst', side: 'top', options: [1] })).toEqual({ indicator: false, minMs: 0 });
  });

  it('a bound opening card says so whether or not it is selected, and a Move First pick shows its value', () => {
    const t = createGame(scenarioById('116').setup, 1);
    const hand = t.players.bottom.hand;
    t.special.moveFirst = { done: true, picks: { top: null, bottom: hand[0] }, committed: { top: null, bottom: hand[0] } };
    const d: Decision = { kind: 'playCard', side: 'bottom' };
    for (const selCard of [null, hand[0]]) {
      const view = { pending: d, over: null, fatal: false, aiThinking: false, generalThinking: false, undo: null } as unknown as ViewState;
      const p = gamePrompt({ controller: {} as GameController, view, s: t, human: 'bottom', ai: 'top', ui: { ...SEL, selCard }, setUi: noop, answer: noop, onExit: noop })!;
      expect(p.text, String(selCard)).toContain('You must play the opening card you chose.');
    }
    // a pick: the selected card's printed value
    const mf = new GameDriver(s116).pending as Extract<Decision, { kind: 'moveFirst' }>;
    const card = mf.options[0];
    const view = { pending: mf, over: null, fatal: false, aiThinking: false, generalThinking: false, undo: null } as unknown as ViewState;
    const p = gamePrompt({ controller: {} as GameController, view, s: s116, human: mf.side, ai: other(mf.side), ui: { ...SEL, selCard: card }, setUi: noop, answer: noop, onExit: noop })!;
    expect(p.text).toMatch(new RegExp(`${CARD_DEFS[cardKind(card)].title} \\(value \\d+\\)`));
  });

  it('the single legal card is preselected; two are not', () => {
    const t = createGame(scenarioById('116').setup, 1);
    const hand = t.players.bottom.hand;
    t.special.moveFirst = { done: true, picks: { top: null, bottom: hand[1] }, committed: { top: null, bottom: hand[1] } };
    expect(freshSelection(t, { kind: 'playCard', side: 'bottom' }, 'bottom').selCard).toBe(hand[1]);
    t.special.turnsDone.bottom = 1;
    expect(freshSelection(t, { kind: 'playCard', side: 'bottom' }, 'bottom').selCard).toBeNull();
    const mf = new GameDriver(s116).pending as Extract<Decision, { kind: 'moveFirst' }>;
    expect(freshSelection(s116, { ...mf, options: [mf.options[0]] }, mf.side).selCard).toBe(mf.options[0]);
    expect(freshSelection(s116, { ...mf, options: mf.options.slice(0, 2) }, mf.side).selCard).toBeNull();
  });

  it('the committed card shows only for the second player', async () => {
    const out = await screenOf('top', (s) => {
      s.special.moveFirst = { done: true, picks: { top: s.players.top.hand[0], bottom: s.players.bottom.hand[0] }, committed: { top: s.players.top.hand[0], bottom: s.players.bottom.hand[0] } };
      s.first = 'top';
    });
    // top moves first: the opponent (bottom, second) shows its card beside its hand; the human's own card is not shown apart
    expect(out.match(/class="committed-card"/g)).toHaveLength(1);
    expect(out).toContain('data-side="bottom"');
  });

  it("the computer's committed card is not drawn twice: one back fewer; the human's is in the hand, once", async () => {
    const probe = createGame(scenarioById('116').setup, 5);
    const first = probe.first;
    const edit = (s: GameState) => {
      const second = other(s.first);
      const card = s.players[second].hand[0];
      s.special.moveFirst = { done: true, picks: { top: null, bottom: null, [second]: card }, committed: { top: null, bottom: null, [second]: card } };
    };
    // the human is the first player: the computer is second, and its hand shows one back fewer beside the face-up card
    const human = first;
    const aiSecond = other(first);
    const out = await screenOf(human, edit);
    const plain = await screenOf(human, () => {});
    const count = (h: string) => (h.match(/aria-label="Command card \(face down\)"/g) ?? []).length;
    expect(count(out)).toBe(count(plain) - 1);
    void aiSecond;
    // the human is second: its own card is one hand slot marked and labelled, with no second copy beside the hand
    const mine = await screenOf(aiSecond, edit);
    expect(mine.match(/is-committed/g)).toHaveLength(1);
    expect(mine).not.toContain('class="committed-card"');
    expect(mine).toContain('Opening card');
  });

  it("the undo note: at orders 'your card stands'; at move 'your card and orders stand'; not once a unit has moved", () => {
    const s = createGame(scenarioById('103').setup, 1);
    s.active = 'bottom';
    s.turn.card = s.players.bottom.hand[0];
    const orders: Decision = { kind: 'orders', side: 'bottom', card: 'attackC', mirrored: false, single: false };
    const move: Decision = { kind: 'move', side: 'bottom' };
    expect(undoBlockedNote(s, orders, 'bottom', null)).toBe('Undo is not available: the Spanish have answered the Guerrilla Action, so your card stands.');
    expect(undoBlockedNote(s, move, 'bottom', null)).toBe('Undo is not available: the Spanish have answered the Guerrilla Action, so your card and orders stand.');
    expect(undoBlockedNote(s, move, 'bottom', 'move')).toBeNull();
    s.turn.ordered = { u1: { id: 'u1', moved: 1 } } as unknown as GameState['turn']['ordered'];
    expect(undoBlockedNote(s, move, 'bottom', null)).toBeNull();
    s.turn.ordered = {};
    s.turn.card = null;
    expect(undoBlockedNote(s, orders, 'bottom', null)).toBeNull();
    void s103;
  });

  it('the digit keys and the prompt ignore a card the decision does not allow', () => {
    const mf = new GameDriver(s116).pending as Extract<Decision, { kind: 'moveFirst' }>;
    const hand = s116.players[mf.side].hand;
    const bad = hand.find((c) => !mf.options.includes(c));
    const only: Decision = { kind: 'moveFirst', side: mf.side, options: [mf.options[0]] };
    const other1 = hand.find((c) => c !== mf.options[0])!;
    expect(handChoices(s116, only, mf.side)).not.toContain(other1);
    const view = { pending: only, over: null, fatal: false, aiThinking: false, generalThinking: false, undo: null } as unknown as ViewState;
    const p = gamePrompt({ controller: {} as GameController, view, s: s116, human: mf.side, ai: other(mf.side), ui: { ...SEL, selCard: other1 }, setUi: noop, answer: noop, onExit: noop })!;
    // a card that is not an option is not a selection: no Choose button
    expect(markup(p).join('')).not.toContain('Choose ');
    void bad;
  });
});
