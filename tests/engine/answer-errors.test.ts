// Every Decision kind refuses a malformed or illegal answer with a message (answerError, the one validator the UI and the AI share).
import { describe, expect, it } from 'vitest';
import { answerError, orderLimit, pieceMoves, type Answer, type Decision, type GameState } from '../../src/engine';
import { H, build, toBattle } from '../rules/helpers';

type Refusals = { [K in Decision['kind']]: { d: Extract<Decision, { kind: K }>; bad: Answer[]; ok?: Answer } };

/** A battle-phase state: bottom BR/LN u1 (centre) ordered by Attack Centre, next to top FR/LN u2; plus a crowd of bottom units. */
function battleState(): GameState {
  const crowd = [3, 4, 5, 6, 7, 8].map((c) => ({ side: 'bottom' as const, key: 'BR/LN' as const, at: [6, c] as [number, number] }));
  const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }, ...crowd] });
  return toBattle(s, 'attackC', ['u1']).state;
}

/** A state where a 1-block infantry unit ordered to fire has only a 0-dice target (a unit in town, range 2). */
function zeroDiceState(town = true): GameState {
  const s = build({
    terrain: town ? [{ at: [3, 6], t: 'town' }] : [],
    units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [3, 6] }],
  });
  return toBattle(s, 'attackC', ['u1']).state;
}

const s = battleState();
const own = s.units.filter((x) => x.side === 'bottom').map((x) => x.id);   // u1, u3..u8
const tooMany = own.slice(0, orderLimit(s, 'bottom', 'attackC') + 1);

const SAMPLES: Refusals = {
  playCard: { d: { kind: 'playCard', side: 'bottom' }, bad: [{ kind: 'endMove' }, { kind: 'playCard', card: 9999 }] },
  orders: {
    d: { kind: 'orders', side: 'bottom', card: 'attackC', mirrored: false, single: false },
    bad: [{ kind: 'endMove' }, { kind: 'orders', pieces: ['u1', 'nope'] }, { kind: 'orders', pieces: ['u2'] }, { kind: 'orders', pieces: tooMany }, { kind: 'orders', pieces: ['u1'], single: true }],
    ok: { kind: 'orders', pieces: ['u1'] },
  },
  leaveSquare: { d: { kind: 'leaveSquare', side: 'bottom', unit: 'u1' }, bad: [{ kind: 'endMove' }], ok: { kind: 'yesno', yes: true } },
  move: { d: { kind: 'move', side: 'bottom' }, bad: [{ kind: 'attack', unit: 'u1', target: H(4, 6) }, { kind: 'move', piece: 'u1', to: H(0, 0) }], ok: { kind: 'endMove' } },
  battle: { d: { kind: 'battle', side: 'bottom' }, bad: [{ kind: 'endMove' }, { kind: 'attack', unit: 'u1', target: H(0, 0) }], ok: { kind: 'attack', unit: 'u1', target: H(4, 6) } },
  combinedArms: {
    d: { kind: 'combinedArms', side: 'bottom', unit: 'u1', target: H(4, 6), options: ['u3'], required: true },
    bad: [{ kind: 'endMove' }, { kind: 'select', ids: ['u9'] }, { kind: 'select', ids: ['u3', 'u3'] }, { kind: 'select', ids: [] }],
    ok: { kind: 'select', ids: ['u3'] },
  },
  defend: { d: { kind: 'defend', side: 'top', attacker: 'u1', target: 'u2', options: ['stand', 'formSquare'], bonus: false, artillery: [] }, bad: [{ kind: 'endMove' }, { kind: 'defend', choice: 'retireReform' }], ok: { kind: 'defend', choice: 'stand' } },
  ignoreFlags: { d: { kind: 'ignoreFlags', side: 'top', unit: 'u2', flags: 2, max: 1 }, bad: [{ kind: 'endMove' }, { kind: 'ignoreFlags', count: 2 }, { kind: 'ignoreFlags', count: -1 }], ok: { kind: 'ignoreFlags', count: 1 } },
  retreat: {
    d: { kind: 'retreat', side: 'top', unit: 'u2', options: [{ path: [H(3, 6)], end: H(3, 6), losses: 0, attach: null }], reason: 'retreat' },
    bad: [{ kind: 'endMove' }, { kind: 'choose', index: 1 }, { kind: 'choose', index: -1 }], ok: { kind: 'choose', index: 0 },
  },
  leaderRetreat: {
    d: { kind: 'leaderRetreat', side: 'top', leader: 'L1', options: [{ path: [H(3, 6)], end: H(3, 6), offBoard: false, escapes: [], attach: null, eliminated: false }] },
    bad: [{ kind: 'endMove' }, { kind: 'choose', index: 1 }], ok: { kind: 'choose', index: 0 },
  },
  advance: { d: { kind: 'advance', side: 'bottom', unit: 'u1', hex: H(4, 6), how: 'takeGround' }, bad: [{ kind: 'hex', hex: H(4, 6) }], ok: { kind: 'yesno', yes: false } },
  breakthroughExtra: {
    d: { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [H(3, 6)], required: true },
    bad: [{ kind: 'endMove' }, { kind: 'hex', hex: H(0, 0) }, { kind: 'hex', hex: null }], ok: { kind: 'hex', hex: H(3, 6) },
  },
  bonusMelee: { d: { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets: [H(4, 6)] }, bad: [{ kind: 'endMove' }, { kind: 'hex', hex: H(0, 0) }], ok: { kind: 'hex', hex: null } },
  elan: { d: { kind: 'elan', side: 'bottom', faces: ['infantry', 'flag'] }, bad: [{ kind: 'endMove' }, { kind: 'assign', ids: ['u1'] }, { kind: 'assign', ids: [null, null, null] }], ok: { kind: 'assign', ids: [null, null] } },
  rally: { d: { kind: 'rally', side: 'bottom', faces: ['infantry'] }, bad: [{ kind: 'endMove' }, { kind: 'assign', ids: [] }], ok: { kind: 'assign', ids: [null] } },
  scoutKeep: { d: { kind: 'scoutKeep', side: 'bottom', cards: [1, 2] }, bad: [{ kind: 'endMove' }, { kind: 'choose', index: 2 }], ok: { kind: 'choose', index: 1 } },
  shortSupplyTarget: { d: { kind: 'shortSupplyTarget', side: 'bottom', options: ['u1', 'u2'] }, bad: [{ kind: 'endMove' }, { kind: 'choose', index: 2 }], ok: { kind: 'choose', index: 0 } },
  shortSupplyHex: {
    d: { kind: 'shortSupplyHex', side: 'bottom', unit: 'u1', options: [H(8, 6)] },
    bad: [{ kind: 'endMove' }, { kind: 'hex', hex: H(0, 0) }, { kind: 'hex', hex: null }], ok: { kind: 'hex', hex: H(8, 6) },
  },
};

describe('answerError', () => {
  it('has a sample for each of the 18 decision kinds', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([
      'advance', 'battle', 'bonusMelee', 'breakthroughExtra', 'combinedArms', 'defend', 'elan', 'ignoreFlags', 'leaderRetreat', 'leaveSquare',
      'move', 'orders', 'playCard', 'rally', 'retreat', 'scoutKeep', 'shortSupplyHex', 'shortSupplyTarget',
    ].sort());
  });

  for (const [kind, sample] of Object.entries(SAMPLES) as [string, { d: Decision; bad: Answer[]; ok?: Answer }][]) {
    it(`${kind}: refuses ${sample.bad.length} bad answers with a message`, () => {
      expect(sample.d.kind).toBe(kind);
      if (sample.ok) expect(answerError(s, sample.d, sample.ok), 'the legal sample').toBeNull();
      for (const a of sample.bad) {
        const err = answerError(s, sample.d, a);
        expect(err, JSON.stringify(a)).toEqual(expect.any(String));
        expect(err!.length, JSON.stringify(a)).toBeGreaterThan(0);
      }
    });
  }

  it('one piece over the limit is refused as too many, not for another reason', () => {
    expect(tooMany).toHaveLength(orderLimit(s, 'bottom', 'attackC') + 1);
    expect(answerError(s, SAMPLES.orders.d, { kind: 'orders', pieces: tooMany })).toBe('Too many orders.');
  });

  it('a reachable move is legal, an unreachable one is refused', () => {
    const m = pieceMoves(s, 'u1');
    expect(m.length).toBeGreaterThan(0);
    expect(answerError(s, SAMPLES.move.d, { kind: 'move', piece: 'u1', to: m[0].hex })).toBeNull();
  });

  it('says what to do when a card is expected', () => {
    expect(answerError(s, SAMPLES.playCard.d, { kind: 'move', piece: 'u1', to: 0 })).toBe('Play a card from your hand.');
  });

  it('a missing answer is refused', () => {
    expect(answerError(s, SAMPLES.playCard.d, null)).toBe('No answer.');
  });

  it('refuses an attack on a target worth 0 dice', () => {
    const z = zeroDiceState();
    const atk: Answer = { kind: 'attack', unit: 'u1', target: H(3, 6) };
    expect(answerError(zeroDiceState(false), { kind: 'battle', side: 'bottom' }, atk), 'control: the same shot on open ground').toBeNull();
    expect(answerError(z, { kind: 'battle', side: 'bottom' }, atk)).toEqual(expect.any(String));
  });
});
