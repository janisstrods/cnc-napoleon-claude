// Rules: RR §12.2, §12.4, §12.5 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { CARD_LIST, forceDice, leaderMoves, type DieFace, type Side } from '../../src/engine';
import { H, attack, build, combatDice, endMoves, endTurn, ev, giveCard, leaderId, must, play, type Pos } from './helpers';

const FACES5: DieFace[] = ['infantry', 'cavalry', 'artillery', 'flag', 'sabre'];

/** Rows 0 hexes c..c of the top baseline filled with FR/LN units (ids follow the existing units). */
const topRow = (r: number, cs: number[]): NonNullable<Pos['units']> => cs.map((c) => ({ side: 'top' as const, key: 'FR/LN' as const, at: [r, c] as [number, number] }));

describe('Élan (R53)', () => {
  const elanPos = (): Pos => ({
    units: [
      { side: 'bottom', key: 'BR/LN', at: [5, 6] }, // u1
      { side: 'top', key: 'FR/LN', at: [4, 6] },    // u2
      { side: 'bottom', key: 'BR/HC', at: [6, 2] }, // u3
      { side: 'bottom', key: 'BR/HA', at: [6, 10] }, // u4
    ],
    leaders: [{ side: 'bottom', at: [7, 0] }],
  });

  it('dice = Command; each arm symbol orders a unit of that arm, a flag any piece, a sabre nothing; +1 in every battle (R53)', () => {
    const s0 = build(elanPos());
    forceDice(FACES5);
    const d = play(s0, 'elan');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'elan', side: 'bottom', faces: FACES5 });
    const L = leaderId(s, 0);
    expect(d.answer({ kind: 'assign', ids: ['u2', 'u3', 'u4', L, null] })).toBe(false); // u2 is the enemy's
    expect(d.answer({ kind: 'assign', ids: ['u3', 'u3', 'u4', L, null] })).toBe(false); // u3 is cavalry, not infantry
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u3', 'u4', L, 'u1'] })).toBe(false); // a sabre orders nothing
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u3', 'u4', 'u1', null] })).toBe(false); // u1 twice
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u3', 'u4', 'u1'] })).toBe(false); // one entry per die
    expect(d.answer({ kind: 'assign', ids: ['u4', 'u3', 'u4', L, null] })).toBe(false); // HA is artillery, not infantry
    must(d, { kind: 'assign', ids: ['u1', 'u3', 'u4', L, null] });
    expect(Object.keys(s.turn.ordered).sort()).toEqual(['u1', 'u3', 'u4', L].sort());
    expect(Object.values(s.turn.ordered).every((o) => o.cardMods)).toBe(true);
    endMoves(d);
    ev(d);
    forceDice(Array(30).fill('sabre'));
    attack(d, 'u1', H(4, 6));
    expect(combatDice(ev(d), 'melee')).toBe(5);
    forceDice([]);
  });

  it('null is legal for every face, an arm face included; a flag may take a unit of any arm', () => {
    const s0 = build(elanPos());
    forceDice(FACES5);
    const d = play(s0, 'elan');
    const s = d.state;
    must(d, { kind: 'assign', ids: [null, null, null, 'u3', null] });
    expect(Object.keys(s.turn.ordered)).toEqual(['u3']);
  });

  it('an Élan flag that orders an attached leader detaches him (§6.2, R53)', () => {
    const s0 = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [2, 6] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
    const L = leaderId(s0, 0);
    forceDice(['flag', 'sabre', 'sabre', 'sabre', 'sabre']);
    const d = play(s0, 'elan');
    const s = d.state;
    must(d, { kind: 'assign', ids: [L, null, null, null, null] });
    expect(Object.keys(s.turn.ordered)).toEqual([L]);
    expect(s.turn.ordered[L].isLeader).toBe(true);
    expect(d.pending).toMatchObject({ kind: 'move' });
    expect(leaderMoves(s, L).some((t) => t.hex !== H(5, 6))).toBe(true);
  });

  it('asks nothing when every die is a sabre, and the turn goes on to the draw (§12.2)', () => {
    const s0 = build(elanPos());
    forceDice(Array(5).fill('sabre'));
    const d = play(s0, 'elan');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(Object.keys(s.turn.ordered)).toEqual([]);
  });

  it('a flag on a leader attached to a square is refused unless an arm face also orders the square (R32, R53)', () => {
    const s0 = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], square: 1 }, { side: 'top', key: 'FR/LN', at: [1, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    forceDice(['flag', 'infantry', 'sabre', 'sabre']);   // the square lowers Command to 4
    const d = play(s0, 'elan');
    const L = leaderId(d.state, 0);
    expect(d.answer({ kind: 'assign', ids: [L, null, null, null] })).toBe(false);
    expect(d.answer({ kind: 'assign', ids: [L, 'u1', null, null] })).toBe(true);
  });

  it('an answered Élan or Rally that orders nothing still emits an empty ordered event', () => {
    const s0 = build(elanPos());
    forceDice(FACES5);
    const d = play(s0, 'elan');
    ev(d);
    must(d, { kind: 'assign', ids: [null, null, null, null, null] });
    expect(ev(d)).toContainEqual({ t: 'ordered', side: 'bottom', ids: [] });
  });

  it('rolls with the purpose elan', () => {
    const s0 = build(elanPos());
    forceDice(FACES5);
    const d = play(s0, 'elan');
    const s = d.state;
    const roll = ev(d).find((e) => e.t === 'roll');
    expect(roll).toMatchObject({ t: 'roll', purpose: 'elan', faces: FACES5 });
  });

  it('Élan reshuffles at the end of the turn (R53)', () => {
    const s0 = build(elanPos());
    forceDice(FACES5);
    const d = play(s0, 'elan');
    const s = d.state;
    const id = s.turn.card!;
    expect(CARD_LIST[id]).toBe('elan');
    must(d, { kind: 'assign', ids: [null, null, null, null, null] });
    endTurn(d);
    expect(s.discard).toEqual([]);
    const held = [...s.deck, ...s.players.top.hand, ...s.players.bottom.hand];
    expect(held).toContain(id);
    expect(ev(d).some((e) => e.t === 'reshuffle')).toBe(true);
  });
});

describe('Rally (R54)', () => {
  const rallyPos = (): Pos => ({
    units: [
      { side: 'bottom', key: 'BR/LN', at: [6, 6], blocks: 2 }, // u1
      { side: 'bottom', key: 'BR/HC', at: [6, 2] },            // u2 full
      { side: 'top', key: 'FR/LN', at: [1, 6], blocks: 1 },    // u3, the enemy's
    ],
  });
  const FACES: DieFace[] = ['infantry', 'infantry', 'infantry', 'flag', 'sabre'];

  it('arm symbols return blocks to under-strength units of that arm anywhere, never above the start (R54)', () => {
    const s0 = build(rallyPos());
    forceDice(FACES);
    const d = play(s0, 'rally');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'rally', side: 'bottom', faces: FACES });
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u1', 'u1', null, null] })).toBe(false); // would reach 5
    expect(d.answer({ kind: 'assign', ids: ['u2', 'u1', null, null, null] })).toBe(false);  // u2 is cavalry
    expect(d.answer({ kind: 'assign', ids: ['u3', null, null, null, null] })).toBe(false);  // the enemy's
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u1', null, 'u1', null] })).toBe(false);  // a flag rallies nothing
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u1', null, null, 'u1'] })).toBe(false);  // nor a sabre
    must(d, { kind: 'assign', ids: ['u1', 'u1', null, null, null] });
    expect(s.units[0].blocks).toBe(4);
    expect(s.turn.ordered.u1).toBeDefined();
    expect(s.turn.ordered.u1.cardMods).toBe(false);
    expect(Object.keys(s.turn.ordered)).toEqual(['u1']);
    const rallied = ev(d).filter((e) => e.t === 'rallied');
    expect(rallied).toEqual([{ t: 'rallied', id: 'u1', blocks: 2 }]);
  });

  it('a rally of one block orders the unit; null for the arm faces is legal', () => {
    const s0 = build(rallyPos());
    forceDice(FACES);
    const d = play(s0, 'rally');
    const s = d.state;
    must(d, { kind: 'assign', ids: [null, 'u1', null, null, null] });
    expect(s.units[0].blocks).toBe(3);
    expect(s.turn.ordered.u1).toBeDefined();
  });

  it('asks nothing when no arm face matches an under-strength unit', () => {
    const s0 = build(rallyPos());
    forceDice(['cavalry', 'artillery', 'flag', 'sabre', 'cavalry']);
    const d = play(s0, 'rally');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(Object.keys(s.turn.ordered)).toEqual([]);
    expect(s.units[0].blocks).toBe(2);
  });

  it('a rallied square is ordered like any rallied unit (§9.5, [Interp R33])', () => {
    const s0 = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], blocks: 3, square: 1 }, { side: 'top', key: 'FR/LN', at: [1, 6] }] });
    forceDice(['infantry', 'sabre', 'sabre', 'sabre']);   // the square on the track lowers Command to 4 (R28)
    const d = play(s0, 'rally');
    const s = d.state;
    ev(d);
    must(d, { kind: 'assign', ids: ['u1', null, null, null] });
    expect(s.units[0].blocks).toBe(4);
    // a square can neither move nor battle, so the turn may already be over: the event shows the order
    expect(ev(d)).toContainEqual({ t: 'ordered', side: 'bottom', ids: ['u1'] });
  });
});

describe('Short Supply (R55)', () => {
  const base = (extra: NonNullable<Pos['units']> = []): Pos => ({
    units: [
      { side: 'top', key: 'FR/LN', at: [4, 6] },     // u1
      { side: 'bottom', key: 'BR/LN', at: [5, 6] },  // u2
      { side: 'top', key: 'FR/LN', at: [3, 3], square: 1 }, // u3, in square
      ...extra,
    ],
    leaders: [{ side: 'top', at: [4, 6] }, { side: 'bottom', at: [8, 0] }],
  });
  const row0 = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => H(0, c));

  it('any unit not in square, placed by its owner on its own baseline in its section, else the row in front (R55)', () => {
    const s0 = build(base());
    const d = play(s0, 'shortSupply');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'shortSupplyTarget', side: 'bottom', options: ['u1', 'u2'] });
    must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'shortSupplyHex', side: 'top', unit: 'u1' });
    const opts = (d.pending as { options: number[] }).options;
    expect(opts).toEqual([4, 5, 6, 7, 8].map((c) => H(0, c)));
    expect(d.answer({ kind: 'hex', hex: null })).toBe(false);
    expect(d.answer({ kind: 'hex', hex: H(0, 2) })).toBe(false);
    ev(d);
    must(d, { kind: 'hex', hex: H(0, 6) });
    expect(s.units[0].hex).toBe(H(0, 6));
    expect(s.leaders[0].hex).toBe(H(0, 6));
    expect(ev(d)).toContainEqual({ t: 'shortSupply', id: 'u1', hex: H(0, 6) });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });

  it('the opponent chooses for its own unit; the player of the card may lift his own (bottom unit to row 8)', () => {
    const s0 = build(base());
    const d = play(s0, 'shortSupply');
    const s = d.state;
    must(d, { kind: 'choose', index: 1 });
    expect(d.pending).toMatchObject({ kind: 'shortSupplyHex', side: 'bottom', unit: 'u2' });
    expect((d.pending as { options: number[] }).options).toEqual([4, 5, 6, 7, 8].map((c) => H(8, c)));
  });

  it('row 0 held: the row in front, columns 4 to 7; both held: no question, it stays', () => {
    const s0 = build(base(topRow(0, [4, 5, 6, 7, 8])));
    let d = play(s0, 'shortSupply');
    must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'shortSupplyHex', side: 'top', unit: 'u1' });
    expect((d.pending as { options: number[] }).options).toEqual([4, 5, 6, 7].map((c) => H(1, c)));

    const s2 = build(base([...topRow(0, [4, 5, 6, 7, 8]), ...topRow(1, [4, 5, 6, 7])]));
    d = play(s2, 'shortSupply');
    must(d, { kind: 'choose', index: 0 });
    expect(d.state.units[0].hex).toBe(H(4, 6));
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });

  it('a unit on a dotted-line hex may use either section (R55)', () => {
    const s0 = build({ units: [{ side: 'top', key: 'FR/LN', at: [4, 4] }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }] });
    const d = play(s0, 'shortSupply');
    const s = d.state;
    must(d, { kind: 'choose', index: 0 });
    expect((d.pending as { options: number[] }).options).toEqual(row0);
  });

  it('a unit already on its own baseline may stay: its own hex is a legal destination, never the row in front (R55)', () => {
    const s0 = build({ units: [...topRow(0, [4, 5, 6, 7, 8]), { side: 'bottom', key: 'BR/LN', at: [6, 6] }] });
    const d = play(s0, 'shortSupply');
    must(d, { kind: 'choose', index: 2 });   // u3 at (0,6)
    expect(d.pending).toMatchObject({ kind: 'shortSupplyHex', unit: 'u3', options: [H(0, 6)] });
    must(d, { kind: 'hex', hex: H(0, 6) });
    expect(d.state.units[2].hex).toBe(H(0, 6));
  });

  it('only hexes passable for the unit\'s arm are offered', () => {
    const s0 = build({
      units: [{ side: 'top', key: 'FR/HA', at: [4, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }],
      terrain: [{ t: 'sandQuarry', at: [0, 5] }, { t: 'river', at: [0, 7] }],
    });
    const d = play(s0, 'shortSupply');
    const s = d.state;
    must(d, { kind: 'choose', index: 0 });
    expect((d.pending as { options: number[] }).options).toEqual([4, 6, 8].map((c) => H(0, c)));
  });

  it('orders no unit (§12.2)', () => {
    const s0 = build(base());
    const d = play(s0, 'shortSupply');
    const s = d.state;
    must(d, { kind: 'choose', index: 1 });
    must(d, { kind: 'hex', hex: H(8, 6) });
    const es = ev(d);
    expect(es.some((e) => e.t === 'ordered')).toBe(false);
    expect(Object.keys(s.turn.ordered)).toEqual([]);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
});

describe('Counter-Attack copying (§12.5, R56)', () => {
  it("uses the copier's Command; copying Élan also reshuffles", () => {
    const s0 = build({
      first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [7, 6] }, { side: 'bottom', key: 'BR/HC', at: [7, 2] }],
      bottomCards: 5, topCards: 3,
    });
    // the top player plays Élan (all sabres), then the bottom player (hand 4 after the card + 1 → Command 5; the top player's Command was 3) copies it
    forceDice(Array(3).fill('sabre'));
    const d = play(s0, 'elan');
    const s = d.state;
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    const card = giveCard(s, 'bottom' as Side, 'counterAttack');
    ev(d);
    forceDice(['infantry', 'cavalry', 'sabre', 'sabre', 'sabre']);
    must(d, { kind: 'playCard', card });
    expect(d.pending).toMatchObject({ kind: 'elan', side: 'bottom' });
    expect((d.pending as { faces: DieFace[] }).faces).toHaveLength(5);
    must(d, { kind: 'assign', ids: ['u2', 'u3', null, null, null] });
    expect(s.turn.ordered.u2.cardMods).toBe(true);
    endTurn(d);
    expect(ev(d).some((e) => e.t === 'reshuffle')).toBe(true);
  });
  it('copying Rally uses the copier\'s Command', () => {
    const s0 = build({
      first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [7, 6], blocks: 1 }],
      bottomCards: 5, topCards: 3,
    });
    forceDice(['sabre', 'sabre', 'sabre']);
    const d = play(s0, 'rally');
    const s = d.state;
    const card = giveCard(s, 'bottom' as Side, 'counterAttack');
    forceDice(Array(5).fill('infantry'));
    must(d, { kind: 'playCard', card });
    expect(d.pending).toMatchObject({ kind: 'rally', side: 'bottom' });
    expect((d.pending as { faces: DieFace[] }).faces).toHaveLength(5);
  });
});
