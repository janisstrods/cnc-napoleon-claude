// Rules: RR §1, §5.1–§5.3, §6.1, §6.2, §12.1, §12.4, §12.5 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { CARD_LIST, GameDriver, sectionsOf, validateOrders, type CardKind, type GameState, type Side } from '../../src/engine';
import { H, build, endMoves, endTurn, ev, giveCard, leaderId, must, noFirstStrike, play, type Pos } from './helpers';

it('sections from each side, dotted-line hexes in two (§1)', () => {
  expect([[6, 2], [6, 4], [6, 6], [6, 8], [6, 10]].map(([r, c]) => sectionsOf(H(r, c), 'bottom'))).toEqual([['left'], ['left', 'center'], ['center'], ['center', 'right'], ['right']]);
  // hex.ts lists a section in the player's own Left, Centre, Right order, so the top side reads ['center', 'right'] here
  expect(sectionsOf(H(2, 4), 'top')).toEqual(['center', 'right']); expect(sectionsOf(H(2, 2), 'top')).toEqual(['right']);
});

const B = (cs: number[]): Pos => ({ units: cs.map((c) => ({ side: 'bottom' as const, key: 'BR/LN' as const, at: [6, c] as [number, number] })) });
const err = (p: Pos, kind: CardKind, pieces: string[]) => { const d = play(build(p), kind); return validateOrders(d.state, 'bottom', kind, pieces); };

describe('orders by section', () => {
  it('Probe orders 2 in its section; a dotted-line unit counts for either (§12.1, §6.1)', () => {
    expect(err(B([2, 4, 6]), 'probeL', ['u1', 'u2'])).toBeNull(); expect(err(B([2, 4, 6]), 'probeL', ['u3'])).not.toBeNull();
    expect(err(B([2, 4, 6]), 'probeC', ['u2', 'u3'])).toBeNull(); expect(err(B([2, 4, 6, 8]), 'probeC', ['u2', 'u3', 'u4'])).not.toBeNull();
  });
  it('Scout 1, Attack 3, Assault up to Command (R52)', () => {
    expect(err(B([4, 5, 6, 7, 8]), 'scoutC', ['u1', 'u2'])).not.toBeNull();
    expect(err(B([4, 5, 6, 7, 8]), 'attackC', ['u1', 'u2', 'u3'])).toBeNull(); expect(err(B([4, 5, 6, 7, 8]), 'attackC', ['u1', 'u2', 'u3', 'u4'])).not.toBeNull();
    expect(err(B([4, 5, 6, 7, 8]), 'assaultC', ['u1', 'u2', 'u3', 'u4', 'u5'])).toBeNull();   // hand 5: Command 5
  });
  it('a square on the track lowers Command: hand of 5 with one square plays Assault for 4 (§5.3, R28, R52)', () => {
    const p: Pos = { units: [...B([4, 5, 6, 7]).units!, { side: 'bottom', key: 'BR/LN', at: [6, 8], square: 1 }] };
    const d = play(build(p), 'assaultC'); expect(d.state.turn.command).toBe(4);
    expect(validateOrders(d.state, 'bottom', 'assaultC', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(validateOrders(d.state, 'bottom', 'assaultC', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
  });
  it('the four multi-section cards (§12.1)', () => {
    const p = B([0, 1, 5, 6, 7, 11, 12]);   // u1, u2 left; u3, u4, u5 centre; u6, u7 right
    expect(err(p, 'coordinatedAdvance', ['u1', 'u3', 'u4', 'u6'])).toBeNull(); expect(err(p, 'coordinatedAdvance', ['u1', 'u2', 'u3', 'u6'])).not.toBeNull();
    expect(err(p, 'flankAttack', ['u1', 'u2', 'u6', 'u7'])).toBeNull(); expect(err(p, 'flankAttack', ['u3'])).not.toBeNull();
    expect(err(p, 'forward', ['u1', 'u2', 'u3', 'u4', 'u6', 'u7'])).toBeNull(); expect(err(p, 'forward', ['u3', 'u4', 'u5'])).not.toBeNull();
    expect(err(p, 'reconInForce', ['u1', 'u3', 'u6'])).toBeNull(); expect(err(p, 'reconInForce', ['u3', 'u4'])).not.toBeNull();
  });
  it("the top player's Left is the bottom player's Right (§1)", () => {
    const s = build({ first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [2, 10] }] });
    const d = play(s, 'probeL');
    expect(validateOrders(d.state, 'top', 'probeL', ['u1'])).toBeNull();
    expect(validateOrders(d.state, 'top', 'probeR', ['u1'])).not.toBeNull();
  });
});

describe('leaders and orders', () => {
  const P: Pos = { units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 7] }], leaders: [{ side: 'bottom', at: [6, 6] }] };
  it('an attached leader goes with his unit on one order; detaching costs one order (§6.2)', () => {
    const s = build(P); const L = leaderId(s, 0);
    const d = play(s, 'probeC'); const ok = (ids: string[], k: CardKind = 'probeC') => validateOrders(d.state, 'bottom', k, ids);
    expect(ok(['u1', 'u2'])).toBeNull(); expect(ok([L, 'u1'])).toBeNull();
    expect(ok([L, 'u1', 'u2'])).not.toBeNull(); expect(ok([L], 'bayonetCharge')).not.toBeNull();
  });
  it('a leader attached to a square cannot detach alone (§6.2, R32)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], square: 1 }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const L = leaderId(s, 0); const d = play(s, 'probeC');
    expect(validateOrders(d.state, 'bottom', 'probeC', [L])).not.toBeNull();
    expect(validateOrders(d.state, 'bottom', 'probeC', ['u1'])).toBeNull();
    expect(validateOrders(d.state, 'bottom', 'probeC', [L, 'u1'])).toBeNull();
  });
  it('a lone leader is one order in his own section', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 2] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const L = leaderId(s, 0); const d = play(s, 'probeC');
    expect(validateOrders(d.state, 'bottom', 'probeC', [L])).toBeNull();
    expect(validateOrders(d.state, 'bottom', 'probeL', [L])).not.toBeNull();
  });
});

const far: Pos['units'] = [{ side: 'top', key: 'FR/LN', at: [0, 12] }];

describe('the turn', () => {
  it('a card that can order nothing skips to the draw (§5.2)', () => {
    const d = play(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, ...far!] }), 'probeL');
    expect(d.pending?.kind).toBe('playCard'); expect(d.pending?.side).toBe('top');
    const kinds = ev(d).map((e) => e.t);
    expect(kinds.slice(kinds.indexOf('cardPlayed'))).toEqual(['cardPlayed', 'draw', 'turnStart']);
  });
  it('the turn: start, card, orders, moves, battles, draw (§5.2)', () => {
    const d = play(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, ...far!] }), 'probeC', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) }); endMoves(d);
    const kinds = ev(d).map((e) => e.t);
    const seq = ['turnStart', 'cardPlayed', 'ordered', 'move', 'draw', 'turnStart'];
    let i = 0; for (const k of kinds) if (k === seq[i]) i++;
    expect(i).toBe(seq.length);
  });
  it('Command is fixed when the card is played (§5.3)', () => { const d = play(build(B([6])), 'probeC', ['u1']); expect(d.state.turn.command).toBe(5); });
  it('draw: discard the card, draw 1; an empty deck takes the shuffled discard (§12.4)', () => {
    const d = play(build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, ...far!] }), 'probeC', ['u1']);
    const id = d.state.turn.card!;
    endTurn(d);
    expect(d.state.players.bottom.hand).toHaveLength(5); expect(d.state.discard).toContain(id);
    const e = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, ...far!] });
    const d2 = play(e, 'probeC', ['u1']);
    d2.state.discard.push(...d2.state.deck); d2.state.deck = [];
    ev(d2); endTurn(d2);
    expect(ev(d2).some((x) => x.t === 'reshuffle')).toBe(true);
    expect(d2.state.players.bottom.hand).toHaveLength(5);
    const s = d2.state;
    expect(s.deck.length + s.discard.length + s.players.top.hand.length + s.players.bottom.hand.length).toBe(70);
  });
});

/** Start the turn of the active side with a card of `kind`; `prep` may change the state after the card is in hand. */
function start(s: GameState, kind: CardKind, prep: (s: GameState, card: number) => void = () => undefined, pieces: string[] = []): GameDriver {
  noFirstStrike(s);
  const card = giveCard(s, s.active, kind);
  prep(s, card);
  const d = new GameDriver(s);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
  return d;
}
const scoutPos: Pos = { units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, ...far!] };

describe('the draw phase', () => {
  it('Scout: draw 2, keep 1, discard 1 face up; even when it ordered nothing (§12.4, [Interp R51])', () => {
    const d = start(build(scoutPos), 'scoutC');
    const p = d.pending!;
    expect(p.kind).toBe('scoutKeep');
    if (p.kind !== 'scoutKeep') return;
    const es = ev(d);
    expect(es.filter((e) => e.t === 'scoutDrew')).toEqual([{ t: 'scoutDrew', side: 'bottom' }]);
    expect(es.filter((e) => e.t === 'draw')).toEqual([]);
    const [a, b] = p.cards;
    expect(JSON.stringify(es.filter((e) => e.t !== 'cardPlayed'))).not.toMatch(new RegExp(`\\b(${a}|${b})\\b`));
    must(d, { kind: 'choose', index: 1 });
    const after = ev(d);
    expect(d.state.players.bottom.hand).toContain(b); expect(d.state.players.bottom.hand).not.toContain(a);
    expect(d.state.discard).toContain(a);
    expect(after).toContainEqual({ t: 'discarded', side: 'bottom', card: a });
    expect(d.state.players.bottom.hand).toHaveLength(5);
  });
  it('Scout with one card left in the deck: the discard, Scout included, becomes the deck between the draws (R51)', () => {
    // crafted short deck: one card in the deck, two in the discard
    let scoutId = -1; let x = -1; let rest: number[] = [];
    const d = start(build(scoutPos), 'scoutC', (s, card) => {
      scoutId = card; [x, ...rest] = s.deck.slice(0, 3); s.deck = [x]; s.discard = rest.slice(0, 2);
    });
    const p = d.pending!;
    expect(p.kind).toBe('scoutKeep');
    if (p.kind !== 'scoutKeep') return;
    expect(p.cards).toContain(x);
    const other = p.cards.find((c) => c !== x)!;
    expect([...rest.slice(0, 2), scoutId]).toContain(other);
    expect(ev(d).some((e) => e.t === 'reshuffle')).toBe(true);
  });
  it('a Scout that discards an Élan it drew does not reshuffle (R53)', () => {
    const elan = CARD_LIST.indexOf('elan');
    const d = start(build(scoutPos), 'scoutC', (s) => {
      s.deck = s.deck.filter((c) => c !== elan); s.discard = s.discard.filter((c) => c !== elan);
      for (const sd of ['top', 'bottom'] as Side[]) s.players[sd].hand = s.players[sd].hand.filter((c) => c !== elan);
      // crafted two-card deck: the Élan is on top, so the Scout draws it first
      const keep = s.deck.shift()!; s.deck = [keep, elan];   // draws pop: Élan first
    });
    const p = d.pending!;
    expect(p.kind).toBe('scoutKeep');
    if (p.kind !== 'scoutKeep') return;
    expect(p.cards).toContain(elan);
    ev(d);
    must(d, { kind: 'choose', index: p.cards.indexOf(elan) === 0 ? 1 : 0 });
    expect(ev(d).some((e) => e.t === 'reshuffle')).toBe(false);
    expect(d.state.discard).toContain(elan);
  });
  it('Élan reshuffle: the discard and deck are shuffled together before the draws; square-track cards stay out (R53)', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6], square: 1 }, ...far!] });
    const track = s.players.bottom.squareTrack[0];
    // crafted short deck (2 cards) and discard (2 cards): the draw must come from the shuffle of both
    const d = start(s, 'elan', (st) => { const [a, b, c, e] = st.deck.splice(0, 4); st.discard = [a, b]; st.deck = [c, e]; });
    const id = CARD_LIST.indexOf('elan');
    endTurn(d);
    const st = d.state;
    const es = ev(d);
    const kinds = es.map((e) => e.t);
    expect(kinds).toContain('reshuffle');
    expect(kinds.indexOf('reshuffle')).toBeLessThan(kinds.indexOf('draw'));
    expect(st.discard).toEqual([]);
    expect([...st.deck, ...st.players.bottom.hand]).toContain(id);
    expect(st.players.bottom.squareTrack[0]).toBe(track); expect(st.deck).not.toContain(track!);
  });
  it('First Strike replacements are drawn before the active player draws, one per First Strike (R78)', () => {
    const s = build(scoutPos);
    s.turn.firstStrikes.top = 2;
    const d = start(s, 'probeC', undefined, ['u1']);
    endTurn(d);
    const draws = ev(d).filter((e) => e.t === 'draw').map((e) => (e as { side: Side }).side);
    expect(draws).toEqual(['top', 'top', 'bottom']);
  });
});

describe('Counter-Attack (§12.5, R56)', () => {
  const pos = (first: Side): Pos => ({ first, units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 10] }, { side: 'top', key: 'FR/LN', at: [2, 6] }] });
  it('first turn of the game orders nothing', () => {
    const d = start(build(pos('bottom')), 'counterAttack');
    expect(d.pending?.kind).toBe('playCard'); expect(d.pending?.side).toBe('top');
    expect(d.state.lastCard.bottom).toBeNull();
  });
  it('copies the last card mirrored', () => {
    const s = build(pos('bottom')); s.lastCard.top = 'probeL';
    noFirstStrike(s); const c = giveCard(s, 'bottom', 'counterAttack'); const d = new GameDriver(s);
    must(d, { kind: 'playCard', card: c });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'probeR', mirrored: true });
    must(d, { kind: 'orders', pieces: [] });
    expect(d.state.lastCard.bottom).toBe('probeR');
  });
  it('a copied Scout ends with scoutKeep; a copied First Strike orders nothing', () => {
    const s = build(pos('bottom')); s.lastCard.top = 'scoutL';
    const d = start(s, 'counterAttack');
    expect(d.pending?.kind).toBe('scoutKeep');
    const s2 = build(pos('bottom')); s2.lastCard.top = 'firstStrike';
    const d2 = start(s2, 'counterAttack');
    expect(d2.pending?.kind).toBe('playCard'); expect(d2.pending?.side).toBe('top');
  });
  it('a Counter-Attack that copied probeC is copied as probeC', () => {
    const s = build(pos('top')); s.lastCard.bottom = 'probeC';
    const d = start(s, 'counterAttack');
    expect(d.state.lastCard.top).toBe('probeC');
    const c = giveCard(d.state, 'bottom', 'counterAttack');
    must(d, { kind: 'playCard', card: c });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'probeC', mirrored: false });
  });
});
