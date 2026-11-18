// Rules: RR §9.2, §12.3, §12.4 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { CARD_LIST, battleTargets, type DieFace, type GameDriver, type GameEvent, type RowKey } from '../../src/engine';
import { H, attack, build, combatDice, endTurn, ev, forceDice, giveCard, miss, must, n, play, rolls, toBattle, turn, endMoves, u, type Pos } from './helpers';

const PAD = n('artillery', 60); // an artillery face never hits infantry or cavalry
type Unit1 = NonNullable<Pos['units']>[number];
const bot = (key: RowKey, at: [number, number], extra: object = {}): Unit1 => ({ side: 'bottom', key, at, ...extra }) as Unit1;
const top = (key: RowKey, at: [number, number], extra: object = {}): Unit1 => ({ side: 'top', key, at, ...extra }) as Unit1;
const combats = (es: GameEvent[]) => es.filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat');

/** Bottom u1 (5,6) attacks top u2 (4,6), which holds First Strike; stops at the defend decision (or the next one). */
function fs(atk: RowKey, def: RowKey, extra: Pos = {}, blocks?: number): GameDriver {
  const s = build({ ...extra, units: [bot(atk, [5, 6], { blocks }), top(def, [4, 6]), ...(extra.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1']);
  giveCard(d.state, 'top', 'firstStrike');
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  return d;
}
const strike = (d: GameDriver, faces: DieFace[]): void => {
  forceDice([...faces, ...PAD]);
  must(d, { kind: 'defend', choice: 'firstStrike' });
};

describe('First Strike (§12.3)', () => {
  it('the defender may play First Strike after the declaration, before the attacker rolls (§12.3, R63)', () => {
    expect(fs('BR/LN', 'FR/LN').pending).toMatchObject({ kind: 'defend', options: ['stand', 'firstStrike'] });
  });

  it('it rolls first with normal dice and terrain, no cards; a surviving attacker then rolls its recounted dice; no battle back (R63)', () => {
    const d = fs('BR/LN', 'FR/LN');
    ev(d);
    const cardId = d.state.players.top.hand.find((c) => CARD_LIST[c] === 'firstStrike')!;
    strike(d, [...n('infantry', 1), ...n(miss('BR/LN', 'FR/LN'), 4), ...n('artillery', 3)]);
    const es = ev(d);
    expect(es.find((e) => e.t === 'cardPlayed')).toEqual({ t: 'cardPlayed', side: 'top', card: cardId, kind: 'firstStrike', effective: null });
    expect(d.state.discard).toContain(cardId);
    expect(d.state.players.top.hand).not.toContain(cardId);
    expect(combats(es).map((e) => [e.purpose, e.attacker, e.dice])).toEqual([['firstStrike', 'u2', 5], ['melee', 'u1', 3]]);
    expect(rolls(es, 'firstStrike')).toHaveLength(1);
    expect(u(d, 'u1')!.blocks).toBe(3);
    expect(es.some((e) => e.t === 'combat' && e.purpose === 'battleBack')).toBe(false);
  });

  it('terrain reduces the First Strike dice; cards add none (R3, §12.3)', () => {
    const d = fs('BR/LN', 'FR/LN', { terrain: [{ t: 'forest', at: [5, 6] }] });
    ev(d);
    strike(d, []);
    expect(combatDice(ev(d), 'firstStrike')).toBe(4);
  });

  it('an attacker eliminated or forced out by it does not roll (R63)', () => {
    const d = fs('BR/LN', 'FR/LN', {}, 2);
    ev(d);
    strike(d, n('infantry', 2));
    const es = ev(d);
    expect(combats(es).some((e) => e.purpose === 'melee')).toBe(false);
    expect(u(d, 'u1')?.hex ?? -1).toBeLessThan(0);
    const e = fs('BR/LN', 'FR/LN');
    ev(e);
    strike(e, ['flag', ...n(miss('BR/LN', 'FR/LN'), 4)]);
    if (e.pending?.kind === 'retreat') must(e, { kind: 'choose', index: 0 });
    const es2 = ev(e);
    expect(u(e, 'u1')!.hex).not.toBe(H(5, 6));
    expect(combats(es2).some((c) => c.purpose === 'melee' || c.purpose === 'battleBack')).toBe(false);
  });

  it('one choice per melee: First Strike or square or Retire and Reform (R77)', () => {
    const d = fs('BR/HC', 'FR/LN');
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare', 'firstStrike'] });
    ev(d);
    strike(d, []);
    expect(ev(d).some((e) => e.t === 'squareFormed')).toBe(false);
    expect(u(d, 'u2')!.square).toBeUndefined();
    const r = fs('BR/LN', 'FR/HC');
    expect(r.pending).toMatchObject({ kind: 'defend', options: ['stand', 'retireReform', 'firstStrike'] });
  });

  it('not against a battle back; usable against a bonus melee (R63)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    giveCard(d.state, 'bottom', 'firstStrike');
    forceDice(PAD);
    attack(d, 'u1', H(4, 6));
    const es = ev(d);
    expect(combats(es).some((e) => e.purpose === 'battleBack')).toBe(true);
    expect(d.pending?.kind).not.toBe('defend');
    // a bonus melee by BR/HC after it wins its first melee
    const s2 = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), top('FR/LN', [2, 6])] });
    const b = toBattle(s2, 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(b, 'u1', H(4, 6));
    must(b, { kind: 'yesno', yes: true });
    must(b, { kind: 'hex', hex: H(3, 6) });
    giveCard(b.state, 'top', 'firstStrike');
    forceDice(PAD);
    must(b, { kind: 'hex', hex: H(2, 6) });
    expect(b.pending).toMatchObject({ kind: 'defend', bonus: true, options: ['stand', 'formSquare', 'firstStrike'] });
  });

  it('aimed at the melee unit of a Combined Arms attack; the guns are spent and their dice lost if it is driven off (R40, R63)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6], { blocks: 1 }), top('FR/LN', [4, 6]), bot('BR/FA', [6, 5])] });
    const d = toBattle(s, 'attackC', ['u1', 'u3']);
    giveCard(d.state, 'top', 'firstStrike');
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'select', ids: ['u3'] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: ['stand', 'firstStrike'] });
    ev(d);
    strike(d, n('infantry', 5));
    const es = ev(d);
    expect(combats(es)).toHaveLength(1);
    expect(combats(es)[0]).toMatchObject({ purpose: 'firstStrike', attacker: 'u2', target: 'u1' });
    expect(combats(es).some((e) => e.purpose === 'melee')).toBe(false);
    expect(battleTargets(d.state, 'u3')).toEqual([]);
  });

  it('an attacking cavalry unit cannot Retire and Reform from the First Strike roll (§9.4)', () => {
    const d = fs('BR/HC', 'FR/LN');
    ev(d);
    strike(d, ['flag', ...n(miss('BR/HC', 'FR/LN'), 3)]);
    expect(d.pending?.kind === 'retreat' ? d.pending.reason : undefined).not.toBe('retireReform');
    expect(ev(d).some((e) => e.t === 'retire')).toBe(false);
  });

  it('the First Strike unit never takes ground or breaks through (§12.3)', () => {
    const d = fs('BR/LN', 'FR/HC', {}, 1);
    ev(d);
    strike(d, n('infantry', 4));
    expect(d.pending?.kind).not.toBe('advance');
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(ev(d).some((e) => e.t === 'advance')).toBe(false);
  });

  it('a horse battery that moved, declared a melee and was cut to 1 block still melees with 2 dice (R12)', () => {
    const e = play(build({ units: [bot('BR/HA', [6, 6]), top('FR/LN', [4, 6])] }), 'attackC', ['u1']);
    must(e, { kind: 'move', piece: 'u1', to: H(5, 6) });
    if (e.pending?.kind === 'move') must(e, { kind: 'endMove' });
    giveCard(e.state, 'top', 'firstStrike');
    must(e, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (e.pending?.kind === 'combinedArms') must(e, { kind: 'select', ids: [] });
    ev(e);
    strike(e, [...n('artillery', 2), ...n(miss('BR/HA', 'FR/LN'), 3)]);
    const es = ev(e);
    expect(u(e, 'u1')!.blocks).toBe(1);
    expect(combats(es).map((c) => c.purpose)).toEqual(['firstStrike', 'melee']);
    expect(combatDice(es, 'melee', 'u1')).toBe(2);
    expect(u(e, 'u1')!.hex).toBe(H(5, 6));
  });

  it('a square ordered to attack cavalry: the cavalry may play First Strike with at most 1 die (§9.5)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6], { square: 1 }), top('FR/HC', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1']);
    giveCard(d.state, 'top', 'firstStrike');
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending).toMatchObject({ kind: 'defend', options: expect.arrayContaining(['firstStrike']) });
    ev(d);
    strike(d, []);
    expect(combatDice(ev(d), 'firstStrike')).toBe(1);
  });

  it('a square defender already fights first against cavalry: no First Strike choice (R29)', () => {
    const s = build({ units: [bot('BR/HC', [5, 6]), top('FR/LN', [4, 6], { square: 1 })] });
    const d = toBattle(s, 'attackC', ['u1']);
    giveCard(d.state, 'top', 'firstStrike');
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).not.toBe('defend');
  });

  it('two First Strikes in one turn: both replacements drawn before the active player draws (R78)', () => {
    const s = build({ units: [bot('BR/LN', [5, 6]), bot('BR/LN', [5, 5]), top('FR/LN', [4, 6])] });
    const d = toBattle(s, 'attackC', ['u1', 'u2']);
    const st = d.state;
    const ids = CARD_LIST.map((k, i) => (k === 'firstStrike' ? i : -1)).filter((i) => i >= 0);
    giveCard(st, 'top', 'firstStrike');
    const other = ids.find((i) => !st.players.top.hand.includes(i))!;
    for (const c of [st.deck, st.discard, st.players.bottom.hand]) if (c.includes(other)) c.splice(c.indexOf(other), 1);
    st.deck.unshift(st.players.top.hand[1]);
    st.players.top.hand[1] = other;
    ev(d);
    forceDice(PAD);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'firstStrike' });
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'firstStrike' });
    endTurn(d);
    const draws = ev(d).filter((e) => e.t === 'draw').map((e) => (e as { side: string }).side);
    expect(draws.slice(0, 3)).toEqual(['top', 'top', 'bottom']);
    expect(d.state.players.top.hand).toHaveLength(5);
  });

  it('played as a turn card it orders nothing (R63)', () => {
    const s = build({ first: 'top', units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] });
    const d = play(s, 'firstStrike');
    const es = ev(d);
    expect(es.some((e) => e.t === 'ordered')).toBe(false);
    expect(es.some((e) => e.t === 'draw')).toBe(true);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('First Strike losses can leave a declared attacker in place with 0 dice: the attack still counts (R15)', () => {
    const d = fs('BR/HC', 'FR/LN', { terrain: [{ t: 'forest', at: [4, 6] }] }, 2);
    expect(d.pending).toMatchObject({ kind: 'defend' });
    ev(d);
    strike(d, [...n('cavalry', 1), ...n('artillery', 3)]);
    const es = ev(d);
    expect(u(d, 'u1')!.blocks).toBe(1);
    expect(combatDice(es, 'melee', 'u1')).toBe(0);
    expect(u(d, 'u2')!.blocks).toBe(4);
    expect(d.pending?.kind).toBe('playCard');  // the attack counted as the unit's battle: the turn is over
  });

  it('a reactive First Strike is not what Counter-Attack copies (R56)', () => {
    const s = build({ first: 'top', units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] });
    const d = play(s, 'probeL', []);
    endTurn(d);
    expect(d.state.lastCard.top).toBe('probeL');
    turn(d, 'attackC', ['u1']);
    endMoves(d);
    giveCard(d.state, 'top', 'firstStrike');
    forceDice(PAD);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'firstStrike' });
    endTurn(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.lastCard).toEqual({ top: 'probeL', bottom: 'attackC' });
  });
});
