// Rules: RR §3.1, §8.1, §8.2, §9.1–§9.3 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { answerError, battleTargets, type DieFace, type GameDriver, type RowKey } from '../../src/engine';
import { H, attack, build, duel, endMoves, ev, forceDice, must, n, play, toBattle, u, type Pos } from './helpers';

const SAFE = n('sabre', 12); // a sabre never hits infantry fire and is no flag: padding after the dice a test cares about

/** A bottom firer u1 at (6,6) fires at a top unit u2 at (4,6) (two hexes); the dice come out as `faces`, then padding. */
const fire = (key: RowKey, target: RowKey, faces: DieFace[], extra: Pos = {}): GameDriver => {
  const d = toBattle(build({ ...extra, units: [{ side: 'bottom', key, at: [6, 6] }, { side: 'top', key: target, at: [4, 6] }, ...(extra.units ?? [])] }), 'attackC', ['u1']);
  forceDice([...faces, ...SAFE]);
  attack(d, 'u1', H(4, 6));
  return d;
};

describe('fire (§3.1, §8.2)', () => {
  it('fire: the matching arm symbol hits; sabres never do (§3.1, §8.2)', () => {
    const d = fire('BR/LN', 'FR/LN', ['infantry', 'sabre', 'cavalry', 'artillery', 'infantry']);
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(ev(d).some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
  });
  it('a Cuirassier ignores 1 hit of each infantry fire, not of artillery fire (R8, R34)', () => {
    expect(u(fire('BR/LN', 'FR/CU', ['cavalry', 'cavalry', 'infantry', 'infantry', 'infantry']), 'u2')!.blocks).toBe(3);
    expect(u(fire('BR/FA', 'FR/CU', ['cavalry', 'cavalry', 'infantry']), 'u2')!.blocks).toBe(2);
  });
  it('hits beyond the blocks are lost; hits come before flags (§3.1)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['infantry', 'infantry', 'flag', 'flag', 'flag', ...SAFE]);
    attack(d, 'u1', H(4, 6));
    const e = ev(d);
    expect(e.some((x) => x.t === 'eliminated' && x.id === 'u2')).toBe(true);
    expect(e.some((x) => x.t === 'retreat' || x.t === 'flags')).toBe(false);
  });
  it('each unit battles once per turn (§8.1)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 7] }] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    expect(battleTargets(d.state, 'u1').length).toBeGreaterThan(0);
    forceDice(SAFE);
    attack(d, 'u1', H(4, 6));
    expect(d.pending?.kind).toBe('battle');
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    expect(battleTargets(d.state, 'u3').length).toBeGreaterThan(0);
  });
});

describe('melee and battle back (§9.2, §9.3)', () => {
  it('melee and battle back: FR/LN battles back with +1 against infantry (§9.3, R2)', () => {
    expect(duel('BR/LN', 'FR/LN')).toEqual({ attack: 4, back: 5 });
  });
  it('battle back takes no card dice (§9.3)', () => {
    expect(duel('BR/HC', 'FR/LN', { card: 'cavalryCharge' })).toEqual({ attack: 5, back: 4 });
  });
  it('a guns unit battles back with its range-1 dice', () => {
    expect(duel('BR/LN', 'FR/FA')).toEqual({ attack: 4, back: 4 });
  });
  it('a defender that failed a retreat and lost a block still battles back (R38)', () => {
    const s = build({ units: [
      { side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] },
      { side: 'top', key: 'FR/LN', at: [3, 5] }, { side: 'top', key: 'FR/LN', at: [3, 6] },
    ] });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(['flag', 'artillery', 'artillery', 'artillery', ...n('artillery', 10)]);
    attack(d, 'u1', H(4, 6));
    must(d, { kind: 'ignoreFlags', count: 0 });
    const e = ev(d);
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(e.find((x) => x.t === 'combat' && x.purpose === 'battleBack')).toMatchObject({ dice: 4 });
  });
  it('no battle back by a defender that retreated or was eliminated (§9.3)', () => {
    const base: Pos = { units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }] };
    const retreated = toBattle(build(base), 'attackC', ['u1']);
    ev(retreated);
    forceDice(['flag', ...n('artillery', 20)]);
    attack(retreated, 'u1', H(4, 6));
    must(retreated, { kind: 'choose', index: 0 });
    const e1 = ev(retreated);
    expect(e1.some((x) => x.t === 'retreat' && x.id === 'u2')).toBe(true);
    expect(e1.some((x) => x.t === 'combat' && x.purpose === 'battleBack')).toBe(false);
    const dead = toBattle(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }] }), 'attackC', ['u1']);
    ev(dead);
    forceDice(['infantry', ...n('artillery', 20)]);
    attack(dead, 'u1', H(4, 6));
    const e2 = ev(dead);
    expect(e2.some((x) => x.t === 'eliminated' && x.id === 'u2')).toBe(true);
    expect(e2.some((x) => x.t === 'combat' && x.purpose === 'battleBack')).toBe(false);
  });
  it('a defender attacked by several units battles back against each (§9.3)', () => {
    const s = build({ units: [
      { side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 5] }, { side: 'top', key: 'FR/LN', at: [4, 6] },
    ] });
    const d = toBattle(s, 'attackC', ['u1', 'u2']);
    ev(d);
    forceDice(n('artillery', 40));
    attack(d, 'u1', H(4, 6));
    attack(d, 'u2', H(4, 6));
    expect(ev(d).filter((x) => x.t === 'combat' && x.purpose === 'battleBack')).toHaveLength(2);
  });
});

describe('who may battle (§8.1, §9.1, R15, R62)', () => {
  it('no attack is offered with 0 dice (R15)', () => {
    const s = build({
      terrain: [{ at: [4, 6], t: 'town' }],
      units: [{ side: 'bottom', key: 'BR/LC', at: [5, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 5] }],
    });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    expect(battleTargets(d.state, 'u3').length).toBeGreaterThan(0);
    expect(d.answer({ kind: 'attack', unit: 'u1', target: H(4, 6) })).toBe(false);
    expect(answerError(d.state, { kind: 'battle', side: 'bottom' }, { kind: 'attack', unit: 'u1', target: H(4, 6) })).toBe('That unit cannot battle there.');
  });
  const moved = (mover: RowKey, from: [number, number], to: [number, number], terrain: Pos['terrain'] = []): number => {
    const s = build({ terrain, units: [{ side: 'bottom', key: mover, at: from }, { side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 5] }] });
    const d = play(s, 'attackC', ['u1', 'u3']);
    must(d, { kind: 'move', piece: 'u1', to: H(...to) });
    endMoves(d);
    expect(d.pending?.kind).toBe('battle');
    return battleTargets(d.state, 'u1').length;
  };
  it('a gun that moved, a light unit that moved 2, a unit that entered a forest may not melee (§9.1)', () => {
    expect(moved('BR/FA', [6, 6], [5, 6])).toBe(0);
    expect(moved('BR/LT', [7, 6], [5, 6])).toBe(0);
    expect(moved('BR/LN', [6, 6], [5, 6], [{ at: [5, 6], t: 'forest' }])).toBe(0);
    expect(moved('BR/LN', [6, 6], [5, 6])).toBeGreaterThan(0);
  });
  it('a La Grande Manoeuvre unit that did not move may not battle (R62)', () => {
    const p: Pos = { units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }] };
    const s = build(p);
    const d = play(s, 'grandManoeuvre', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    const d2 = play(build(p), 'grandManoeuvre', ['u1'], { single: true });
    expect(battleTargets(d2.state, 'u1').length).toBeGreaterThan(0);
  });
});

describe('Fire and Hold bookkeeping (R58)', () => {
  it('only retreats of the non-active side are recorded (R58)', () => {
    const run = (side: 'attacker' | 'defender') => {
      const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [5, 4] }] });
      const d = toBattle(s, 'attackC', ['u1', 'u3']);
      ev(d);
      // attacker: its attack misses, the battle back rolls a flag; defender: the attack rolls a flag
      forceDice(side === 'defender' ? ['flag', ...n('artillery', 20)] : [...n('artillery', 4), 'flag', ...n('artillery', 20)]);
      attack(d, 'u1', H(4, 6));
      must(d, { kind: 'choose', index: 0 });
      return d.state.turn.retreatEnds;
    };
    expect(run('attacker')).toEqual([]);
    expect(run('defender')).toEqual([H(3, 5)]);
  });
});
