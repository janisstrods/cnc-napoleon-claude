// Rules: RR §12.2 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, GameDriver, neighbours, autoOrders, battleTargets, cardForbidsBattle, fallbackActive, fireDice, meleeDice, pieceMoves, randomAnswer,
  answerError, sampleOrders, validateOrders, baseMeleeDice, type CardKind, type GameState, type RowKey, type Side,
} from '../../src/engine';
import { game } from '../scenarios/helpers';
import { H, attack, build, combatDice, endMoves, endTurn, ev, forceDice, giveCard, leaderId, must, n, noFirstStrike, play, toBattle, turn, u, type Pos } from './helpers';

const bottom = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const topU = (key: RowKey, at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const far = topU('FR/LN', [0, 12]);
const orders = (s: GameState, kind: CardKind, pieces: string[], single = false) => validateOrders(s, 'bottom', kind, pieces, single);
/** A state at the orders decision of the bottom player's card (`pos` built, card played, nothing ordered yet). */
const at = (pos: Pos, kind: CardKind): GameDriver => play(build(pos), kind);

describe('Bayonet Charge', () => {
  it('Bayonet Charge: up to 4 infantry, no fire, Guard infantry +1 in melee (§12.2)', () => {
    const five = [[6, 0], [6, 2], [6, 4], [6, 8], [6, 10]].map(([r, c]) => bottom('BR/LN', [r, c]));
    const d = at({ units: [...five, bottom('BR/HC', [6, 6]), far] }, 'bayonetCharge');
    expect(orders(d.state, 'bayonetCharge', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(orders(d.state, 'bayonetCharge', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
    expect(orders(d.state, 'bayonetCharge', ['u6'])).not.toBeNull();
    // no fire target: BR/LN at (6,6) with FR/LN two hexes away
    const s = build({ units: [bottom('BR/LN', [6, 6]), topU('FR/LN', [4, 6])] });
    const e = toBattle(s, 'bayonetCharge', ['u1']);
    expect(battleTargets(e.state, 'u1').filter((t) => t.kind === 'fire')).toEqual([]);
    // BR/GG 5 blocks next to FR/LN: 5 + 1 (against infantry) + 1 (Guard) = 7
    const g = toBattle(build({ units: [bottom('BR/GG', [5, 6]), topU('FR/LN', [4, 6])] }), 'bayonetCharge', ['u1']);
    expect(battleTargets(g.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 7 }]);
    expect(meleeDice(g.state, u(g, 'u1')!, u(g, 'u2')!, { role: 'attack', moved: 0 })).toBe(7);
  });
  it('Bayonet Charge with no infantry on the board orders 1 unit with no bonus ([Interp R57])', () => {
    const s = build({ units: [bottom('BR/FA', [6, 6]), topU('FR/LN', [4, 6])] });
    const d = play(s, 'bayonetCharge');
    expect(fallbackActive(d.state, 'bottom', 'bayonetCharge')).toBe(true);
    expect(orders(d.state, 'bayonetCharge', [])).not.toBeNull();
    expect(orders(d.state, 'bayonetCharge', ['u1'])).toBeNull();
    must(d, { kind: 'orders', pieces: ['u1'] });
    expect(d.state.turn.ordered.u1.cardMods).toBe(false);
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'fire', dice: 3 }]);
  });
});

describe('Bombard', () => {
  it('Bombard: up to 4 guns; move up to 3 and no battle, or stay and battle with +2 (GA +3) (R59)', () => {
    const guns = [[6, 0], [6, 2], [6, 4], [6, 8], [6, 10]].map(([r, c]) => bottom('BR/FA', [r, c]));
    const d = at({ units: [...guns, far] }, 'bombard');
    expect(orders(d.state, 'bombard', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(orders(d.state, 'bombard', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
    const s = build({ units: [bottom('BR/FA', [6, 6]), topU('FR/LN', [4, 6])] });
    const e = play(s, 'bombard', ['u1']);
    expect(pieceMoves(e.state, 'u1').length).toBeGreaterThan(0);            // it may move up to 3 instead
    must(e, { kind: 'move', piece: 'u1', to: H(5, 6) });
    endMoves(e);
    expect(battleTargets(e.state, 'u1')).toEqual([]);                       // moved: no battle
    const f = toBattle(build({ units: [bottom('BR/FA', [6, 6]), topU('FR/LN', [4, 6])] }), 'bombard', ['u1']);
    expect(battleTargets(f.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'fire', dice: 5 }]);   // 3 standing at range 2, +2
  });
});

describe('Cavalry Charge', () => {
  it('Cavalry Charge: up to 4 cavalry and/or horse artillery; bonus lost into or out of a town, kept across works (R60)', () => {
    const d = at({ units: [bottom('BR/HC', [6, 0]), bottom('BR/HC', [6, 2]), bottom('BR/LC', [6, 4]), bottom('BR/HA', [6, 8]), bottom('BR/LN', [6, 6]), far] }, 'cavalryCharge');
    expect(orders(d.state, 'cavalryCharge', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(orders(d.state, 'cavalryCharge', ['u5'])).not.toBeNull();
    const melee = (t: Pos['terrain'], atk: [number, number] = [5, 6]) => {
      const e = toBattle(build({ units: [bottom('BR/HC', atk, { blocks: 3 }), topU('FR/LN', [4, 6])], terrain: t }), 'cavalryCharge', ['u1']);
      return battleTargets(e.state, 'u1').find((x) => x.kind === 'melee')?.dice;
    };
    expect(melee([{ at: [4, 6], t: 'town' }])).toBe(1);                       // 4 - 3, no +1
    const works = [{ at: [4, 6] as [number, number], t: 'fieldworks' as const, on: 'plain' as const, sides: ['E', 'NE', 'NW', 'W', 'SW', 'SE'] as const }];
    expect(melee(works as unknown as Pos['terrain'])).toBe(3);                // 4 + 1 - 2
    expect(melee([{ at: [5, 6], t: 'town' }])).toBe(1);                       // out of a town
  });
});

describe('Fire and Hold', () => {
  it('Fire and Hold: up to 4 infantry/artillery not adjacent to an enemy unit; +1 fire; no move (R58)', () => {
    const pos: Pos = { units: [bottom('BR/LN', [5, 6]), bottom('BR/LN', [6, 8]), topU('FR/LN', [4, 6])] };
    const d = at(pos, 'fireAndHold');
    expect(orders(d.state, 'fireAndHold', ['u1'])).not.toBeNull();
    expect(orders(d.state, 'fireAndHold', ['u2'])).toBeNull();
    const e = toBattle(build({ units: [bottom('BR/LN', [6, 6]), topU('FR/LN', [4, 6])] }), 'fireAndHold', ['u1']);
    expect(fireDice(e.state, u(e, 'u1')!, H(4, 6), { role: 'attack', moved: 0 })).toBe(6);
    expect(pieceMoves(e.state, 'u1')).toEqual([]);
  });
  it('Fire and Hold: an enemy that retreated next to the unit stops its fire and melee, even once it is gone (R58)', () => {
    const s = build({
      units: [bottom('BR/LN', [6, 6]), bottom('BR/LN', [2, 6]), bottom('BR/FA', [6, 4]), topU('FR/LN', [4, 6], { blocks: 2 }), topU('FR/LN', [0, 6])],
    });
    const d = toBattle(s, 'fireAndHold', ['u1', 'u2', 'u3']);
    expect(battleTargets(d.state, 'u2').length).toBeGreaterThan(0);          // it could fire at Y before the retreat
    forceDice([...n('flag', 1), ...n('cavalry', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'ignoreFlags') must(d, { kind: 'ignoreFlags', count: 0 });
    if (d.pending?.kind === 'retreat') {
      const i = d.pending.options.findIndex((o) => o.end === H(3, 5) || o.end === H(3, 6));
      must(d, { kind: 'choose', index: Math.max(0, i) });
    }
    const x = u(d, 'u4')!;
    expect([H(3, 5), H(3, 6)]).toContain(x.hex);
    expect(d.state.turn.retreatEnds).toEqual([x.hex]);
    expect(battleTargets(d.state, 'u2')).toEqual([]);
    forceDice(n('infantry', 10));
    expect(battleTargets(d.state, 'u3').some((t) => t.hex === x.hex)).toBe(true);
    attack(d, 'u3', x.hex);
    expect(u(d, 'u4')).toBeUndefined();                                      // eliminated: gone, yet the ban stands
    expect(battleTargets(d.state, 'u2')).toEqual([]);
    forceDice([]);
  });
  it('Fire and Hold with every infantry and gun adjacent orders nothing: no fallback ([Interp R57])', () => {
    const pos: Pos = { units: [bottom('BR/LN', [5, 6]), topU('FR/LN', [4, 6])] };
    const d = at(pos, 'fireAndHold');
    expect(fallbackActive(d.state, 'bottom', 'fireAndHold')).toBe(false);
    expect(d.pending?.kind).toBe('playCard');                                // nothing to order: the turn goes to the draw
    expect(orders(d.state, 'fireAndHold', ['u1'])).not.toBeNull();
    expect(orders(d.state, 'fireAndHold', [])).toBeNull();
  });
});

describe('Force March', () => {
  it('Force March: all infantry of one section (§12.2)', () => {
    const d = at({ units: [bottom('BR/LN', [6, 2]), bottom('BR/LN', [6, 4]), bottom('BR/LN', [6, 6]), far] }, 'forceMarch');
    expect(orders(d.state, 'forceMarch', ['u1', 'u2'])).toBeNull();           // left
    expect(orders(d.state, 'forceMarch', ['u2', 'u3'])).toBeNull();           // centre
    expect(orders(d.state, 'forceMarch', ['u1'])).not.toBeNull();
    expect(orders(d.state, 'forceMarch', ['u1', 'u2', 'u3'])).not.toBeNull();
    expect(orders(d.state, 'forceMarch', [])).not.toBeNull();
  });
});

describe('Give Them the Cold Steel', () => {
  const P: Pos = { units: [bottom('BR/LN', [5, 6]), bottom('BR/LT', [6, 2]), topU('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [5, 7] }] };
  it('Give Them the Cold Steel orders every unit adjacent to an enemy unit, no move, no fire, +1 melee (R61)', () => {
    const s = build(P);
    expect(autoOrders(s, 'bottom', 'coldSteel')).toEqual(['u1']);
    expect(autoOrders(s, 'bottom', 'probeC')).toBeNull();
    const d = play(s, 'coldSteel');
    expect(d.pending?.kind).not.toBe('orders');
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 5 }]);
  });
  it('Cold Steel with no unit adjacent to an enemy orders nothing and the turn goes to the draw (§5.2)', () => {
    const s = build({ units: [bottom('BR/LN', [6, 6]), topU('FR/LN', [4, 6])] });
    expect(autoOrders(s, 'bottom', 'coldSteel')).toEqual([]);
    const d = play(s, 'coldSteel');
    expect(d.pending?.kind).toBe('playCard');
    expect(d.pending?.side).toBe('top');
    expect(Object.keys(d.state.turn.ordered)).toEqual([]);
  });
  it('Cold Steel: a unit no longer adjacent when its turn comes cannot battle (R61)', () => {
    const s = build({ units: [bottom('BR/LN', [5, 6]), bottom('BR/LN', [5, 5]), topU('FR/LN', [4, 6], { blocks: 1 })] });
    const d = play(s, 'coldSteel');
    expect(battleTargets(d.state, 'u2').length).toBe(1);
    forceDice(n('infantry', 10));
    attack(d, 'u1', H(4, 6));
    if (d.pending?.kind === 'advance') must(d, { kind: 'yesno', yes: false });
    forceDice([]);
    expect(u(d, 'u3')).toBeUndefined();
    expect(battleTargets(d.state, 'u2')).toEqual([]);
    // the ban itself: an enemy that stepped away leaves the ordered unit unable to battle while the battle phase is still open
    const e = play(build({ units: [bottom('BR/LN', [5, 6]), bottom('BR/LN', [5, 5]), topU('FR/LN', [4, 6])] }), 'coldSteel');
    expect(cardForbidsBattle(e.state, e.state.turn.ordered.u2, u(e, 'u2')!)).toBe(false);
    e.state.units[2].hex = H(0, 6);
    expect(cardForbidsBattle(e.state, e.state.turn.ordered.u2, u(e, 'u2')!)).toBe(true);
    expect(battleTargets(e.state, 'u2')).toEqual([]);
  });
});

describe('Leadership', () => {
  it('Leadership orders every leader and the units they stay with: +1 in each battle (R20)', () => {
    const P: Pos = { units: [bottom('BR/LN', [5, 6]), topU('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [5, 6] }, { side: 'bottom', at: [6, 2] }] };
    const s = build(P);
    const L1 = leaderId(s, 0), L2 = leaderId(s, 1);
    const d = play(s, 'leadership');
    expect(orders(d.state, 'leadership', [L1])).not.toBeNull();
    expect(orders(d.state, 'leadership', ['u1'])).not.toBeNull();
    expect(orders(d.state, 'leadership', [L1, L2, 'u1'])).toBeNull();
    expect(orders(d.state, 'leadership', [L1, L2])).toBeNull();               // L1 detaches, u1 is not ordered
    expect(orders(d.state, 'leadership', ['u1', L1, L2, 'u2'])).not.toBeNull();
    must(d, { kind: 'orders', pieces: [L1, L2, 'u1'] });
    endMoves(d);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'melee', dice: 5 }]);
    const e = play(build(P), 'leadership', [L1, L2]);
    expect(Object.keys(e.state.turn.ordered).sort()).toEqual([L1, L2].sort());
    // with no leader: one unit, no bonus
    const f = play(build({ units: [bottom('BR/LN', [5, 6]), topU('FR/LN', [4, 6])] }), 'leadership');
    expect(fallbackActive(f.state, 'bottom', 'leadership')).toBe(true);
    expect(orders(f.state, 'leadership', [])).not.toBeNull();
    must(f, { kind: 'orders', pieces: ['u1'] });
    expect(f.state.turn.ordered.u1.cardMods).toBe(false);
    expect(battleTargets(f.state, 'u1').map((t) => t.dice)).toEqual([4]);
  });
  it("card dice never apply on the opponent's turn (§12.2)", () => {
    const s = build({ units: [bottom('BR/LN', [5, 6]), topU('FR/LN', [4, 6])], leaders: [{ side: 'bottom', at: [5, 6] }] });
    const d = play(s, 'leadership', [leaderId(s, 0), 'u1']);
    endTurn(d);
    expect(d.pending?.side).toBe('top');
    turn(d, 'attackC', ['u2']);
    endMoves(d);
    ev(d);
    forceDice(n('cavalry', 40));
    attack(d, 'u2', H(5, 6));
    const plain = baseMeleeDice(d.state, u(d, 'u1')!, u(d, 'u2')!, 0);
    expect(combatDice(ev(d), 'battleBack')).toBe(plain);
    forceDice([]);
  });
});

describe('La Grande Manoeuvre', () => {
  it('La Grande Manoeuvre: up to 4 units or leaders, not squares, 4 hexes no battle; or 1 unit under its own rules (R62)', () => {
    const P: Pos = { units: [bottom('BR/LN', [6, 6], { square: 1 }), bottom('BR/LN', [6, 4]), topU('FR/LN', [4, 5])] };
    const d = at(P, 'grandManoeuvre');
    expect(orders(d.state, 'grandManoeuvre', ['u1', 'u2'])).not.toBeNull();
    expect(orders(d.state, 'grandManoeuvre', ['u2'])).toBeNull();
    expect(orders(d.state, 'grandManoeuvre', ['u1'], true)).toBeNull();
    expect(orders(d.state, 'grandManoeuvre', ['u1', 'u2'], true)).not.toBeNull();
    const e = play(build(P), 'grandManoeuvre', ['u2'], { single: true });
    expect(e.state.turn.ordered.u2.cardMods).toBe(false);
    const foe = H(4, 5);
    const to = pieceMoves(e.state, 'u2').find((m) => neighbours(foe).includes(m.hex))!;
    expect(to).toBeDefined();
    must(e, { kind: 'move', piece: 'u2', to: to.hex });
    endMoves(e);
    expect(battleTargets(e.state, 'u2').length).toBeGreaterThan(0);
  });
});

describe('Counter-Attack and the random answer', () => {
  it("a copied card's fallback works as the original's (R57)", () => {
    const s = build({ first: 'top', units: [topU('FR/LN', [0, 6]), bottom('BR/FA', [6, 6])] });
    const d = play(s, 'bayonetCharge', ['u1']);
    endTurn(d);
    expect(d.pending?.side).toBe('bottom');
    turn(d, 'counterAttack', ['u2']);
    expect(d.state.turn.effective).toBe('bayonetCharge');
    expect(d.state.turn.ordered.u2.cardMods).toBe(false);
  });
  it('randomAnswer gives a legal orders answer for every card kind (sampleOrders)', () => {
    const rich: Pos = {
      units: [
        bottom('BR/LN', [6, 2]), bottom('BR/LN', [6, 4]), bottom('BR/LN', [6, 6]), bottom('BR/FA', [6, 8]), bottom('BR/HC', [6, 10]), bottom('BR/HA', [6, 12]),
        bottom('BR/LN', [5, 4], { square: 1 }), topU('FR/LN', [4, 6]), topU('FR/LN', [0, 12]),
      ],
      leaders: [{ side: 'bottom', at: [6, 4] }, { side: 'bottom', at: [6, 2] }, { side: 'bottom', at: [5, 4] }, { side: 'bottom', at: [7, 5] }],
    };
    const bare = (): GameState => {
      const s = game('000');
      s.units = s.units.filter((x) => !/\/(LN|LT|GR|ML|YG|OG|FA|GA|RI|GG|HA)$/.test(x.key));
      s.leaders = [];
      return s;
    };
    const makers: [string, () => GameState][] = [['rich', () => build(rich)], ['000', () => game('000')], ['bare', bare]];
    let asked = 0;
    for (const [, make] of makers) {
      for (const kind of Object.keys(CARD_DEFS) as CardKind[]) {
        const sel = CARD_DEFS[kind].select.kind;
        if (sel === 'dice' || sel === 'shortSupply' || sel === 'none' || sel === 'copy') continue;
        const s = make();
        noFirstStrike(s);
        const side: Side = s.active;
        const card = giveCard(s, side, kind);
        const d = new GameDriver(s);
        must(d, { kind: 'playCard', card });
        if (d.pending?.kind !== 'orders') continue;
        for (let i = 0; i < 20; i++) {
          const rnd = mulberry(i * 7919 + kind.length);
          const a = randomAnswer(d.state, d.pending, rnd);
          expect(answerError(d.state, d.pending, a), `${kind} ${JSON.stringify(a)}`).toBeNull();
          asked++;
        }
        expect(sampleOrders(d.state, side, kind, () => 0.5)).toBeDefined();
      }
    }
    expect(asked).toBeGreaterThan(100);
  });
});

function mulberry(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
