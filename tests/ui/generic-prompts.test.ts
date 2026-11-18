// The game screen's prompts on the new contract: every one of the 20 decision kinds has a titled prompt with the general's
// button (so the player is never stuck), and every button it offers is a legal answer. promptSpec is the pure description
// the prompt bar renders.
import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, answerError, cardKind, createGame, hexId, type Decision, type DefendChoice, type GameState,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { DECISION_TITLES, decisionTitle, promptSpec } from '../../src/ui/game/promptSpec';
import { SeededOpponent, useFakeClock } from './controller-helpers';

const s: GameState = createGame(scenarioById('000').setup, 1);
const hand = s.players.bottom.hand;
const DEFENCES: DefendChoice[] = ['stand', 'retireReform', 'formSquare', 'firstStrike'];
const elan: Decision = { kind: 'elan', side: 'bottom', faces: ['infantry', 'flag'] };
const rally: Decision = { kind: 'rally', side: 'bottom', faces: ['cavalry'] };
const scout: Extract<Decision, { kind: 'scoutKeep' }> = { kind: 'scoutKeep', side: 'bottom', cards: [hand[0], hand[1]] };

/** One decision of every kind, with ids and hexes that exist in the drill battle's opening position. */
const SAMPLES: Decision[] = [
  { kind: 'playCard', side: 'bottom' },
  { kind: 'orders', side: 'bottom', card: 'probeC', mirrored: false, single: false },
  { kind: 'leaveSquare', side: 'bottom', unit: 'u6' },
  { kind: 'move', side: 'bottom' },
  { kind: 'battle', side: 'bottom' },
  { kind: 'combinedArms', side: 'bottom', unit: 'u7', target: hexId(2, 6), options: ['u10'], required: false },
  { kind: 'defend', side: 'bottom', attacker: 'u1', target: 'u6', options: DEFENCES, bonus: false, artillery: [] },
  { kind: 'ignoreFlags', side: 'bottom', unit: 'u6', flags: 2, max: 1 },
  { kind: 'retreat', side: 'bottom', unit: 'u6', options: [{ path: [hexId(7, 4)], end: hexId(7, 4), losses: 0, attach: null }], reason: 'retreat' },
  { kind: 'leaderRetreat', side: 'bottom', leader: 'L12', options: [{ path: [], end: hexId(6, 6), offBoard: false, escapes: [], attach: null, eliminated: false }] },
  { kind: 'advance', side: 'bottom', unit: 'u7', hex: hexId(5, 6), how: 'takeGround' },
  { kind: 'breakthroughExtra', side: 'bottom', unit: 'u9', options: [hexId(4, 3), hexId(4, 4)], required: false },
  { kind: 'bonusMelee', side: 'bottom', unit: 'u7', targets: [hexId(2, 6)] },
  elan,
  rally,
  scout,
  { kind: 'shortSupplyTarget', side: 'bottom', options: ['u1', 'u2'] },
  { kind: 'shortSupplyHex', side: 'bottom', unit: 'u1', options: [hexId(3, 5), hexId(3, 6)] },
  { kind: 'guerrilla', side: 'bottom', mode: 'spend', card: 'attackC', held: 1, pool: 5 },
  { kind: 'moveFirst', side: 'bottom', options: [hand[0], hand[1]] },
];

describe('a prompt for every decision', () => {
  it('every decision kind has a titled prompt with the general\'s button', () => {
    expect(new Set(SAMPLES.map((d) => d.kind)).size).toBe(20);
    expect(Object.keys(DECISION_TITLES)).toHaveLength(20);
    for (const d of SAMPLES) {
      const p = promptSpec(s, d);
      expect(p.title, d.kind).toBe(decisionTitle(d));
      expect(p.title.length, d.kind).toBeGreaterThan(0);
      expect(p.actions.at(-1), d.kind).toEqual({ key: 'auto', label: 'Let the general decide', answer: 'auto' });
    }
  });

  it('every other action is a legal answer', () => {
    for (const d of SAMPLES) {
      for (const a of promptSpec(s, d).actions) {
        if (a.answer !== 'auto') expect(answerError(s, d, a.answer), `${d.kind}/${a.key}`).toBeNull();
      }
    }
  });

  it('offers each decision\'s own choices', () => {
    const keys = (d: Decision) => promptSpec(s, d).actions.map((a) => a.key);
    expect(keys(SAMPLES.find((d) => d.kind === 'leaveSquare')!)).toEqual(['yes', 'no', 'auto']);
    const adv = promptSpec(s, SAMPLES.find((d) => d.kind === 'advance')!);
    expect(adv.actions.map((a) => [a.key, a.label])).toEqual([['yes', 'Advance'], ['no', 'Stay'], ['auto', 'Let the general decide']]);
    expect(adv.hexes).toEqual([hexId(5, 6)]);
    const def = promptSpec(s, SAMPLES.find((d) => d.kind === 'defend')!);
    expect(def.actions.map((a) => a.key)).toEqual([...DEFENCES, 'auto']);
    expect(def.actions.slice(0, 4).map((a) => a.label)).toEqual(['Stand', 'Retire and Reform', 'Form square', 'First Strike']);
    const bt = SAMPLES.find((d) => d.kind === 'breakthroughExtra')! as Extract<Decision, { kind: 'breakthroughExtra' }>;
    expect(keys(bt)).toEqual(['decline', 'auto']);
    expect(keys({ ...bt, required: true })).toEqual(['auto']);
    expect(promptSpec(s, bt).hexes).toEqual(bt.options);
    expect(keys(SAMPLES.find((d) => d.kind === 'bonusMelee')!)).toEqual(['decline', 'auto']);
    const ca = SAMPLES.find((d) => d.kind === 'combinedArms')!;
    expect(keys(ca)).toEqual(['u10', 'none', 'auto']);
    expect(promptSpec(s, ca).hexes).toEqual([s.units.find((u) => u.id === 'u10')!.hex]);
    const sup = SAMPLES.find((d) => d.kind === 'shortSupplyTarget')!;
    expect(promptSpec(s, sup).hexes).toEqual(['u1', 'u2'].map((id) => s.units.find((u) => u.id === id)!.hex));
    expect(promptSpec(s, SAMPLES.find((d) => d.kind === 'shortSupplyHex')!).hexes).toEqual([hexId(3, 5), hexId(3, 6)]);
  });

  it('Combined Arms with two guns offers to combine them all', () => {
    const d: Decision = { kind: 'combinedArms', side: 'bottom', unit: 'u7', target: hexId(2, 6), options: ['u10', 'u6'], required: false };
    const all = promptSpec(s, d).actions.find((a) => a.key === 'all')!;
    expect(all.label).toBe('Combine all 2 guns');
    expect(all.answer).toEqual({ kind: 'select', ids: ['u10', 'u6'] });
    expect(answerError(s, d, all.answer as never)).toBeNull();
    expect(promptSpec(s, SAMPLES.find((x) => x.kind === 'combinedArms')!).actions.map((a) => a.key)).not.toContain('all');
  });

  it('a required Combined Arms (no dice of its own) has no "none" action, and every action is legal', () => {
    const d: Decision = { kind: 'combinedArms', side: 'bottom', unit: 'u7', target: hexId(2, 6), options: ['u10'], required: true };
    const spec = promptSpec(s, d);
    expect(spec.actions.map((a) => a.key)).toEqual(['u10', 'auto']);
    for (const a of spec.actions) if (a.answer !== 'auto') expect(answerError(s, d, a.answer), a.key).toBeNull();
  });

  it('Élan and Rally offer the suggested assignment, then the general; Scout names its two cards', () => {
    expect(promptSpec(s, elan).actions.map((a) => a.key)).toEqual(['suggested', 'auto']);
    expect(promptSpec(s, rally).actions.map((a) => a.key)).toEqual(['suggested', 'auto']);
    expect(promptSpec(s, scout).actions.map((a) => a.label).slice(0, 2)).toEqual(
      [CARD_DEFS[cardKind(scout.cards[0])].title, CARD_DEFS[cardKind(scout.cards[1])].title],
    );
    expect(promptSpec(s, scout).actions.map((a) => a.key)).toEqual(['keep0', 'keep1', 'auto']);
  });
});

describe('the general decides for the human', () => {
  useFakeClock();

  it('autoAnswer alone plays the drill battle to a finish for the human', async () => {
    const { vi } = await import('vitest');
    const c = new GameController({ ...newSessionConfig('000', 'bottom', 'captain'), seed: 5 }, new SeededOpponent());
    try {
      for (let i = 0; i < 60000 && !c.view.over; i++) {
        if (c.view.fatal) throw new Error(`the game loop failed: ${c.view.error}`);
        if (c.view.pending) await c.autoAnswer();
        else {
          c.hurry();
          await vi.advanceTimersByTimeAsync(50);
        }
      }
      expect(c.view.over).not.toBeNull();
      expect(['top', 'bottom', 'draw']).toContain(c.view.over!.winner);
      expect(c.view.fatal).toBe(false);
    } finally {
      c.dispose();
    }
  });
});
