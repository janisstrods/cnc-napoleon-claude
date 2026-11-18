// Rules: RR §15.7, §16, §16.1–§16.18 (design/rules-reference.md)
// The Spanish battles' own rules, run in their real setups: each test builds `createGame(scenarioById(id).setup, seed)` and drives it
// with the rules kit (tests/rules/helpers.ts). Where a test moves a piece first, it only puts it beside the action: the rule under test
// is still played through the driver.
import { afterEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, bannerTotal, createGame, forceDice, guerrillaHeld, guerrillaPool, guerrillaSide, leaderMoves, moveFirstOptions, moveFirstValue,
  neighbours, stopsOnEntry, terrainAt, unitMoves, worksMask, directionTo, areAdjacent, HEX_DIRS, hexId, type GameState, type Side,
} from '../../src/engine';
import { updateHeld } from '../../src/engine/objectives';
import { damage } from '../../src/engine/casualties';
import { cardKind } from '../../src/engine/cards';
import { passableFor, terrainReduction, worksAcross } from '../../src/engine/terrain';
import { statsOf } from '../../src/engine/units';
import { scenarioById } from '../../src/scenarios';
import { H, endMoves, endTurn, ev, giveCard, must, n, passTurn, play, violations } from '../rules/helpers';

afterEach(() => forceDice([]));

const real = (id: string, seed = 1): GameState => createGame(scenarioById(id).setup, seed);
const unit = (s: GameState, id: string) => s.units.find((x) => x.id === id)!;
const put = (s: GameState, id: string, r: number, c: number): void => {
  const at = hexId(r, c);
  if (s.units.some((x) => x.hex === at && x.id !== id)) throw new Error(`hex ${r},${c} is occupied`);
  unit(s, id).hex = at;
};
const MISS = n('artillery', 80);
const HIT = n('infantry', 12);

/** Answer the follow-ups of a melee (advance, breakthrough, flags) with the plainest legal answer, stopping at the next real decision. */
function settle(d: GameDriver): void {
  for (let i = 0; i < 20 && d.pending; i++) {
    const p = d.pending;
    if (p.kind === 'advance') must(d, { kind: 'yesno', yes: false });
    else if (p.kind === 'ignoreFlags') must(d, { kind: 'ignoreFlags', count: 0 });
    else if (p.kind === 'breakthroughExtra') must(d, { kind: 'hex', hex: p.required ? p.options[0] : null });
    else if (p.kind === 'bonusMelee') must(d, { kind: 'hex', hex: null });
    else if (p.kind === 'retreat' || p.kind === 'leaderRetreat') must(d, { kind: 'choose', index: 0 });
    else break;
  }
}

/** The attacker declares an attack with the dice forced to `dice`; a defend decision, if any, is answered 'stand'. */
function strike(d: GameDriver, id: string, target: number, dice = HIT, defend: 'stand' | 'formSquare' = 'stand'): void {
  forceDice(dice);
  must(d, { kind: 'attack', unit: id, target });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: defend });
  settle(d);
}

/** A free hex next to `h` (not listed in `not`), preferring `prefer`. */
function beside(s: GameState, h: number, not: number[] = []): number {
  const free = neighbours(h).filter((x) => passableFor(s, x, null) && !s.units.some((u) => u.hex === x) && !not.includes(x));
  if (!free.length) throw new Error(`no free hex beside ${h}`);
  return free[0];
}

/** The first card of the active side's turn: a pass (`probeC` ordering nothing), then every question is answered plainly. */
const bottomPasses = (d: GameDriver): void => passTurn(d);

describe('101: the Swiss break (S30)', () => {
  it('101: two FR/SWI lost by Spanish attacks → the other two leave; 2 banners, not 4', () => {
    const s = real('101');
    const swiss = s.units.filter((x) => x.side === 'bottom' && x.key === 'FR/SWI').map((x) => x.id);
    expect(swiss).toEqual(['u17', 'u18', 'u19', 'u20']);
    unit(s, 'u17').blocks = 1;
    unit(s, 'u18').blocks = 1;
    const a = beside(s, unit(s, 'u17').hex, [unit(s, 'u18').hex]);
    put(s, 'u3', Math.floor(a / 13), a % 13);
    const b = beside(s, unit(s, 'u18').hex, [a]);
    put(s, 'u10', Math.floor(b / 13), b % 13);
    const d = new GameDriver(s);
    bottomPasses(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    ev(d);
    const card = giveCard(d.state, 'top', 'forward');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u3', 'u10'] });
    endMoves(d);
    strike(d, 'u3', unit(s, 'u17').hex);
    expect(d.state.units.filter((x) => x.key === 'FR/SWI' && x.side === 'bottom').map((x) => x.id)).toEqual(['u18', 'u19', 'u20']);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    strike(d, 'u10', unit(s, 'u18').hex);
    const es = ev(d);
    expect(d.state.units.filter((x) => x.key === 'FR/SWI' && x.side === 'bottom')).toEqual([]);
    expect(es.filter((e) => e.t === 'removed')).toEqual([{ t: 'removed', id: 'u19', reason: 'broken' }, { t: 'removed', id: 'u20', reason: 'broken' }]);
    expect(bannerTotal(d.state, 'top')).toBe(2); // two lost units, not four
    expect(d.state.units.filter((x) => x.key === 'SP/SWI')).toHaveLength(2); // the Spanish Swiss have no such rule
    expect(d.state.leaders.find((l) => l.name === 'Schramm')?.hex).toBe(H(6, 4)); // alone, not killed
    expect(d.state.winner).toBeNull();
    expect(violations(d.state, false)).toEqual([]);
  });
});

describe('102: exits off row 0 (S31)', () => {
  it('102: a Spanish unit steps off row 0; the first three exits score nothing and the fourth scores', () => {
    const s = real('102');
    const four = ['u1', 'u3', 'u4', 'u6'];
    four.forEach((id, i) => put(s, id, 0, 2 + 2 * i));
    const d = new GameDriver(s);
    bottomPasses(d);
    const card = giveCard(d.state, 'top', 'grandManoeuvre');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: four });
    expect(d.pending?.kind).toBe('move');
    for (let i = 0; i < 4; i++) {
      const id = four[i];
      expect(unitMoves(d.state, id).some((t) => t.hex === OFF_BOARD), id).toBe(true);
      must(d, { kind: 'move', piece: id, to: OFF_BOARD });
      expect(d.state.units.some((x) => x.id === id)).toBe(false);
      expect(bannerTotal(d.state, 'top'), `after exit ${i + 1}`).toBe(i < 3 ? 0 : 1);
    }
    expect(ev(d).filter((e) => e.t === 'removed' && e.reason === 'exit')).toHaveLength(4);
    // the French have no exit
    expect(d.state.units.filter((x) => x.side === 'bottom' && x.hex >= 0).every((x) => !unitMoves(d.state, x.id).some((t) => t.hex === OFF_BOARD))).toBe(true);
  });
});

describe('Guerrilla Action at the start of the battle (S15, §15.5)', () => {
  const ONE = ['103', '107', '110', '111', '118'];
  for (const id of [...ONE, '112', '101']) {
    const held = ONE.includes(id) ? 1 : 0;
    it(`${id}: the Allied side starts with ${held} counter, ${6 - held} in the pool, and is asked only while it holds one`, () => {
      const s = real(id);
      expect(guerrillaSide(s)).toBe('top');
      expect(guerrillaHeld(s)).toBe(held);
      expect(guerrillaPool(s)).toBe(6 - held);
      const d = new GameDriver(s);
      const card = giveCard(d.state, 'bottom', 'probeC');
      must(d, { kind: 'playCard', card });
      if (held) expect(d.pending).toMatchObject({ kind: 'guerrilla', side: 'top', mode: 'spend', card: 'probeC', held: 1, pool: 5 });
      else expect(d.pending?.kind).toBe('orders');
    });
  }

  it('103: spending the counter: a sabre lets the card stand; any other face cancels it (S18, S19)', () => {
    for (const [face, what] of [['sabre', 'stood'], ['infantry', 'cancelled']] as const) {
      const s = real('103');
      const d = new GameDriver(s);
      const card = giveCard(d.state, 'bottom', 'forward');
      must(d, { kind: 'playCard', card });
      forceDice([face]);
      must(d, { kind: 'yesno', yes: true });
      expect(ev(d).find((e) => e.t === 'guerrilla')).toMatchObject({ what, held: 0, pool: 6 });
      expect(guerrillaHeld(d.state)).toBe(0);
      expect(guerrillaPool(d.state)).toBe(6);
      if (what === 'stood') expect(d.pending).toMatchObject({ kind: 'orders', side: 'bottom' });
      else expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' }); // nothing ordered; the French drew one card
    }
  });
});

describe('104: the Trueba and the Shallow Stream (S24)', () => {
  it('104: no unit may enter the Trueba; a unit entering the Shallow Stream stops there', () => {
    const s = real('104');
    for (const [r, c] of [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 0]]) {
      expect(terrainAt(s, H(r, c)), `${r},${c}`).toBe('river');
      for (const arm of [null, 'infantry', 'cavalry', 'artillery'] as const) expect(passableFor(s, H(r, c), arm), `${r},${c} ${arm}`).toBe(false);
    }
    // a Spanish unit beside the Trueba is offered no river hex
    const d = new GameDriver(s);
    bottomPasses(d);
    const card = giveCard(d.state, 'top', 'grandManoeuvre');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u3', 'u4', 'u17'] });
    const river = new Set([H(0, 1), H(0, 2), H(0, 3), H(0, 4), H(1, 0), H(2, 0)]);
    for (const id of ['u3', 'u4']) {
      expect(areAdjacent(unit(d.state, id).hex, H(0, 1)) || areAdjacent(unit(d.state, id).hex, H(0, 2)), id).toBe(true);
      for (const t of unitMoves(d.state, id)) expect(t.path.some((h) => river.has(h)), `${id} to ${t.hex}`).toBe(false);
    }
    // the Shallow Stream: (5,10) is next to the Spanish militia at (5,11); it may enter the stream and stops there
    const ford = H(5, 10);
    expect(terrainAt(d.state, ford)).toBe('ford');
    expect(stopsOnEntry(d.state, H(5, 11), ford)).toBe(true);
    const moves = unitMoves(d.state, 'u17');
    const into = moves.find((t) => t.hex === ford);
    expect(into).toBeDefined();
    expect(into!.stops).toBe(true);
    expect(moves.filter((t) => t.path.slice(0, -1).includes(ford))).toEqual([]); // nothing is reached through it
  });
});

describe('105: the 4-sided redoubt and the sudden death (S23, S32)', () => {
  const SIDES_PROTECTED = ['E', 'SE', 'SW', 'W'];

  it('105: the redoubt (5,3) protects E, SE, SW, W and not NE, NW', () => {
    const s = real('105');
    const works = H(5, 3);
    expect(terrainAt(s, works)).toBe('plain');
    expect(unit(s, 'u17')).toMatchObject({ key: 'SP/FA', hex: works });
    const dirs = HEX_DIRS.filter((_, i) => (worksMask(s, works) & (1 << i)) !== 0);
    expect([...dirs].sort()).toEqual([...SIDES_PROTECTED].sort());
    for (const nb of neighbours(works)) {
      const dir = HEX_DIRS[directionTo(works, nb)];
      expect(worksAcross(s, works, nb), dir).toBe(SIDES_PROTECTED.includes(dir));
    }
  });

  it('105: an attack across a protected side rolls fewer dice than one from an open side', () => {
    const dice = (dir: string): number => {
      const s = real('105');
      const works = H(5, 3);
      const from = neighbours(works).find((x) => HEX_DIRS[directionTo(works, x)] === dir)!;
      expect(s.units.some((x) => x.hex === from)).toBe(false);
      put(s, 'u25', Math.floor(from / 13), from % 13);
      const d = new GameDriver(s);
      const card = giveCard(d.state, 'bottom', 'forward');
      must(d, { kind: 'playCard', card });
      if (d.pending?.kind === 'guerrilla') must(d, { kind: 'yesno', yes: false });
      must(d, { kind: 'orders', pieces: ['u25'] });
      endMoves(d);
      ev(d);
      forceDice(MISS);
      must(d, { kind: 'attack', unit: 'u25', target: works });
      if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
      const e = ev(d).find((x) => x.t === 'combat' && x.purpose === 'melee');
      return e && e.t === 'combat' ? e.dice : -1;
    };
    const open = dice('NE');
    expect(open).toBeGreaterThan(0);
    for (const dir of ['E', 'W']) expect(dice(dir), dir).toBeLessThan(open);
  });

  it('105: the third SP/FA lost ends the battle at once, by hits, on the French turn (S32)', () => {
    const s = real('105');
    const guns = s.units.filter((x) => x.key === 'SP/FA').map((x) => x.id);
    expect(guns).toEqual(['u4', 'u11', 'u17']);
    const ctx = { emit: () => undefined };
    damage(s, ctx, unit(s, 'u4'), 5, 'test');
    damage(s, ctx, unit(s, 'u11'), 5, 'test');
    expect(s.winner).toBeNull();
    unit(s, 'u17').blocks = 1;
    const from = neighbours(H(5, 3)).find((x) => HEX_DIRS[directionTo(H(5, 3), x)] === 'NE')!;
    put(s, 'u25', Math.floor(from / 13), from % 13);
    const d = new GameDriver(s);
    const card = giveCard(d.state, 'bottom', 'forward');
    must(d, { kind: 'playCard', card });
    if (d.pending?.kind === 'guerrilla') must(d, { kind: 'yesno', yes: false });
    must(d, { kind: 'orders', pieces: ['u25'] });
    endMoves(d);
    strike(d, 'u25', H(5, 3), n('artillery', 12)); // an artillery face hits a battery
    expect(d.state.winner).toBe('bottom');
    expect(d.pending).toBeNull();
  });
});

describe('106: Medellín (S29, S33, S34)', () => {
  it('106: the Spanish move first; a French banner costs a card; a third unit cannot form square', () => {
    const s = real('106');
    expect(s.active).toBe('top');
    expect(s.special.handSize).toEqual({ top: 6, bottom: 5 });
    const d = new GameDriver(s);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    // top passes (the guerrilla question is on the French turn only)
    passTurn(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    // the French cavalry charge three Spanish infantry; the first is a 1-block unit
    const st = d.state;
    st.special.squared.top = [];
    const targets = ['u7', 'u10', 'u11', 'u13'];
    const cav = ['u19', 'u22', 'u26'];
    unit(st, 'u7').blocks = 1;
    const used: number[] = [];
    cav.forEach((c, i) => {
      const spot = beside(st, unit(st, targets[i]).hex, used);
      used.push(spot);
      put(st, c, Math.floor(spot / 13), spot % 13);
    });
    const handBefore = st.players.top.hand.length;
    expect(handBefore).toBe(6);
    const card = giveCard(st, 'bottom', 'cavalryCharge');
    must(d, { kind: 'playCard', card });
    if (d.pending?.kind === 'guerrilla') must(d, { kind: 'yesno', yes: false }); // the French turn: asked, declines
    must(d, { kind: 'orders', pieces: cav });
    endMoves(d);
    ev(d);
    // first charge: kills the 1-block unit = a French banner = one random Spanish card, face up in the discard pile
    strike(d, cav[0], unit(st, targets[0]).hex);
    expect(bannerTotal(st, 'bottom')).toBe(1);
    expect(st.players.top.hand).toHaveLength(5);
    expect(st.special.handSize.top).toBe(5);
    expect(ev(d).filter((e) => e.t === 'discarded')).toHaveLength(1);
    // the next two Spanish units may form square, the fourth may not
    for (const [i, t] of [[1, targets[1]], [2, targets[2]]] as const) {
      forceDice(MISS);
      must(d, { kind: 'attack', unit: cav[i], target: unit(st, t).hex });
      if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
      expect(d.pending, t).toMatchObject({ kind: 'defend', options: ['stand', 'formSquare'] });
      must(d, { kind: 'defend', choice: 'formSquare' });
      settle(d);
    }
    expect(st.special.squared.top).toEqual(['u10', 'u11']);
    endTurn(d);
    passTurn(d); // top
    // second French turn: a third unit (u13) is refused a square although the hand still holds 3 or more cards
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    expect(st.players.top.hand.length).toBeGreaterThanOrEqual(3);
    const c13 = cav[0];
    const spot = beside(st, unit(st, 'u13').hex, used);
    put(st, c13, Math.floor(spot / 13), spot % 13);
    const card2 = giveCard(st, 'bottom', 'cavalryCharge');
    must(d, { kind: 'playCard', card: card2 });
    if (d.pending?.kind === 'guerrilla') must(d, { kind: 'yesno', yes: false });
    must(d, { kind: 'orders', pieces: [c13] });
    endMoves(d);
    forceDice(MISS);
    must(d, { kind: 'attack', unit: c13, target: unit(st, 'u13').hex });
    if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
    expect(d.pending?.kind).not.toBe('defend');
    expect(unit(st, 'u13').square).toBeUndefined();
    expect(st.special.squared.top).toEqual(['u10', 'u11']);
  });
});

describe('108: María (S26, S29)', () => {
  it('108: the abbey is a town; the Spanish move first', () => {
    const s = real('108');
    expect(terrainAt(s, H(8, 0))).toBe('town');
    expect(worksMask(s, H(8, 0))).toBe(0);
    expect(scenarioById('108').setup.objectives ?? []).toEqual([]);
    expect(s.active).toBe('top');
    expect(new GameDriver(s).pending).toMatchObject({ kind: 'playCard', side: 'top' });
    // the abbey hex reduces an infantry melee into it like any town (no extra effect)
    const inf = s.units.find((x) => x.side === 'bottom' && x.key === 'FR/LN')!;
    const town = H(7, 0);
    expect(terrainAt(s, town)).toBe('plain');
    const intoTown = terrainReduction(s, inf, 'melee', H(7, 0), H(8, 0));
    const intoPlain = terrainReduction(s, inf, 'melee', H(7, 0), H(8, 1));
    expect(terrainAt(s, H(8, 1))).toBe('plain');
    expect(intoTown).toBeLessThan(intoPlain);
  });
});

describe('109: the brook, two flat redoubts, a mixed army (S23, S25, S27)', () => {
  it('109: the brook stops; both redoubts on plain with their sides; a Spanish leader attaches to a British unit', () => {
    const s = real('109');
    for (const [r, c] of [[0, 9], [0, 10], [1, 10], [2, 11], [3, 11]]) expect(terrainAt(s, H(r, c)), `${r},${c}`).toBe('brook');
    expect(stopsOnEntry(s, H(1, 9), H(1, 10))).toBe(true);
    expect(terrainAt(s, H(2, 9))).toBe('plain');
    expect(terrainAt(s, H(2, 10))).toBe('plain');
    const sides = (h: number) => HEX_DIRS.filter((_, i) => (worksMask(s, h) & (1 << i)) !== 0).sort();
    expect(sides(H(2, 9))).toEqual(['SE', 'SW', 'W']);
    expect(sides(H(2, 10))).toEqual(['E', 'SE', 'SW']);
    expect(unit(s, 'u17')).toMatchObject({ key: 'SP/FA', hex: H(2, 9) });
    expect(unit(s, 'u18')).toMatchObject({ key: 'BR/FA', hex: H(2, 10) });
    // one side, one hand: Cuesta (Spanish) may go to the British infantry at (0,11)
    const cuesta = s.leaders.find((l) => l.name === 'Cuesta')!;
    const brit = s.units.find((x) => x.key === 'BR/LN' && x.hex === H(0, 11))!;
    expect(brit.side).toBe('top');
    cuesta.hex = H(0, 10) - 0; // beside the British infantry, on the brook's edge
    const free = beside(s, brit.hex, [H(0, 9)]);
    cuesta.hex = free;
    const d = new GameDriver(s);
    bottomPasses(d);
    const card = giveCard(d.state, 'top', 'forward');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: [cuesta.id] });
    const to = leaderMoves(d.state, cuesta.id).find((t) => t.hex === brit.hex);
    expect(to).toBeDefined();
    expect(to!.attach).toBe(brit.id);
    must(d, { kind: 'move', piece: cuesta.id, to: brit.hex });
    expect(d.state.leaders.find((l) => l.id === cuesta.id)!.hex).toBe(brit.hex);
    expect(guerrillaSide(d.state)).toBe('top');
  });
});

describe('113: the bridge at Alba de Tormes (S35)', () => {
  it('113: a French unit on the bridge at turn start holds 1 banner, lost when it leaves', () => {
    const s = real('113');
    expect(terrainAt(s, H(0, 6))).toBe('bridge');
    put(s, 'u15', 0, 6);
    const d = new GameDriver(s);
    const card = giveCard(d.state, 'bottom', 'forward');
    must(d, { kind: 'playCard', card });
    expect(bannerTotal(d.state, 'bottom')).toBe(1); // held at turn start
    expect(d.state.special.objState[0].held).toBe(true);
    if (d.pending?.kind === 'guerrilla') must(d, { kind: 'yesno', yes: false });
    must(d, { kind: 'orders', pieces: ['u15'] });
    const away = unitMoves(d.state, 'u15').find((t) => t.hex !== H(0, 6));
    expect(away).toBeDefined();
    must(d, { kind: 'move', piece: 'u15', to: away!.hex });
    expect(d.state.special.objState[0].held).toBe(false);
    expect(bannerTotal(d.state, 'bottom')).toBe(0); // lost the instant it left
  });
});

describe('114: Barrosa (S15, S36)', () => {
  it('114: the Anglo-Spanish start with the Ridge banner; no guerrilla rule', () => {
    const s = real('114');
    expect(bannerTotal(s, 'top')).toBe(1);
    expect(bannerTotal(s, 'bottom')).toBe(0);
    expect(guerrillaSide(s)).toBeNull();
    const d = new GameDriver(s);
    const card = giveCard(d.state, 'bottom', 'probeC');
    must(d, { kind: 'playCard', card });
    expect(d.pending?.kind).toBe('orders'); // never a guerrilla question
    endTurn(d);
    // Scout works normally: no counter is offered, the two-card draw keeps one
    const scout = giveCard(d.state, 'top', 'scoutC');
    const kinds: string[] = [];
    const answer = d.answer.bind(d);
    d.answer = (a) => { if (d.pending) kinds.push(d.pending.kind); return answer(a); };
    must(d, { kind: 'playCard', card: scout });
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
    kinds.push(d.pending?.kind ?? 'none');
    expect(kinds).not.toContain('guerrilla');
    expect(kinds).toContain('scoutKeep');
  });
});

describe("115: Albuera (S24, S37, S42, S16)", () => {
  it('115: Albuera held from the French turn start; fords do not stop', () => {
    const s = real('115');
    // a British unit stands on (4,9) at the start: the French hold neither Albuera hex
    expect(unit(s, s.units.find((x) => x.hex === H(4, 9))!.id).side).toBe('top');
    expect(bannerTotal(s, 'bottom')).toBe(0);
    const frenchOn = s.units.find((x) => x.side === 'bottom' && x.key === 'FR/LN')!;
    s.units = s.units.filter((x) => x.hex !== H(4, 10));
    frenchOn.hex = H(4, 10);
    const d = new GameDriver(s);
    const card = giveCard(d.state, 'bottom', 'forward');
    must(d, { kind: 'playCard', card });
    expect(bannerTotal(d.state, 'bottom')).toBe(1);
    // the ford tiles of the ground do not stop: a unit crossing (5,3) is offered hexes beyond it
    // (entered from a real neighbour: `from` and `to` are different hexes)
    for (const [r, c] of [[5, 0], [5, 1], [5, 3], [6, 4]]) expect(stopsOnEntry(d.state, H(r, c + 1), H(r, c)), `${r},${c}`).toBe(false);
    for (const [r, c] of [[5, 2], [5, 5], [5, 6]]) expect(stopsOnEntry(d.state, H(5, c - 1), H(r, c)), `${r},${c}`).toBe(true);
  });

  it('115: a Guerrilla counter against the French Cavalry Charge: a sabre leaves the Folly on, any other face cancels the card', () => {
    const run = (face: 'sabre' | 'cavalry') => {
      const s = real('115');
      s.players.top.resources.guerrilla = 1; // the Allied side holds one counter
      const hc = s.units.find((x) => x.side === 'bottom' && statsOf(s, x).arm === 'cavalry')!;
      const target = s.units.find((x) => x.side === 'top' && x.key === 'BR/LN' && !s.units.some((y) => y.hex === beside(s, x.hex)))!;
      const spot = beside(s, target.hex);
      hc.hex = spot;
      giveCard(s, 'top', 'firstStrike');
      const d = new GameDriver(s);
      const card = giveCard(d.state, 'bottom', 'cavalryCharge');
      must(d, { kind: 'playCard', card });
      expect(d.pending).toMatchObject({ kind: 'guerrilla', mode: 'spend', card: 'cavalryCharge', held: 1 });
      forceDice([face]);
      must(d, { kind: 'yesno', yes: true });
      return { d, hc, target };
    };
    // sabre: the action fails, the charge goes ahead and the Folly stays on: no square, no First Strike
    {
      const { d, hc, target } = run('sabre');
      expect(d.state.turn.guerrilla).toBe('stood');
      expect(d.pending).toMatchObject({ kind: 'orders', side: 'bottom' });
      must(d, { kind: 'orders', pieces: [hc.id] });
      endMoves(d);
      ev(d);
      forceDice(MISS);
      must(d, { kind: 'attack', unit: hc.id, target: target.hex });
      if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
      expect(d.pending?.kind).not.toBe('defend'); // no choice of square or First Strike
      const es = ev(d);
      expect(es.some((e) => e.t === 'combat' && e.purpose === 'melee')).toBe(true);
      expect(es.some((e) => e.t === 'squareFormed' || (e.t === 'cardPlayed' && e.kind === 'firstStrike'))).toBe(false);
      expect(d.state.players.top.hand.some((c) => cardKind(c) === 'firstStrike')).toBe(true);
    }
    // any other face: the card is cancelled and no melee happens that turn
    {
      const { d, hc } = run('cavalry');
      expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' }); // no orders were asked
      const es = ev(d);
      expect(es.find((e) => e.t === 'guerrilla')).toMatchObject({ what: 'cancelled' });
      expect(es.some((e) => e.t === 'combat')).toBe(false);
      expect(unitMoves(d.state, hc.id)).toBeDefined();
      expect(d.state.turn.number).toBe(2);
    }
  });
});

describe('116: Vitoria (S38, S43, S44)', () => {
  it('116: both sides pick before turn 1, top first; the opening follows the values', () => {
    let tested = 0;
    for (let seed = 1; seed <= 60 && tested < 2; seed++) {
      const s = real('116', seed);
      const opts = { top: moveFirstOptions(s, 'top'), bottom: moveFirstOptions(s, 'bottom') };
      if (!opts.top.length || !opts.bottom.length) continue;
      const lowTop = [...opts.top].sort((a, b) => moveFirstValue(s, 'top', a) - moveFirstValue(s, 'top', b));
      const lowBot = [...opts.bottom].sort((a, b) => moveFirstValue(s, 'bottom', a) - moveFirstValue(s, 'bottom', b));
      // top picks its highest, bottom its lowest: unless they tie, the bottom moves first
      const topPick = lowTop[lowTop.length - 1];
      const botPick = lowBot[0];
      const vt = moveFirstValue(s, 'top', topPick);
      const vb = moveFirstValue(s, 'bottom', botPick);
      const d = new GameDriver(s);
      expect(d.pending).toMatchObject({ kind: 'moveFirst', side: 'top', options: opts.top });
      must(d, { kind: 'playCard', card: topPick });
      expect(d.state.special.moveFirst?.done).toBe(false);
      expect(d.pending).toMatchObject({ kind: 'moveFirst', side: 'bottom', options: opts.bottom });
      must(d, { kind: 'playCard', card: botPick });
      const first: Side = vt === vb ? 'top' : vt < vb ? 'top' : 'bottom';
      const move = ev(d).find((e) => e.t === 'moveFirst');
      expect(move).toMatchObject({ t: 'moveFirst', first, picks: { top: topPick, bottom: botPick } });
      expect(d.state.active).toBe(first);
      expect(d.pending).toMatchObject({ kind: 'playCard', side: first });
      if (vt !== vb) tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('117: San Marcial (S36)', () => {
  it('117: the Spanish start with three group banners (3 of 8)', () => {
    const s = real('117');
    expect(s.bannersToWin).toBe(8);
    expect(bannerTotal(s, 'top')).toBe(3);
    expect(bannerTotal(s, 'bottom')).toBe(0);
    expect(s.special.objState.filter((o) => o.held)).toHaveLength(3);
    // a French majority in the centre group at the start of its turn takes that banner for the French and costs the Spanish theirs
    const centre = [[1, 6], [1, 7], [2, 4], [2, 5], [2, 6], [2, 8], [3, 6]] as const;
    const spanish = s.units.filter((x) => centre.some(([r, c]) => x.hex === H(r, c)));
    expect(spanish.length).toBeGreaterThan(0);
    const french = s.units.filter((x) => x.side === 'bottom' && x.key !== 'FR/FA');
    s.units = s.units.filter((x) => !spanish.includes(x));
    const spots = centre.slice(0, 4);
    spots.forEach(([r, c], i) => { french[i].hex = H(r, c); });
    const d = new GameDriver(s);
    const card = giveCard(d.state, 'bottom', 'probeC');
    must(d, { kind: 'playCard', card });
    expect(bannerTotal(d.state, 'bottom')).toBe(1);
    updateHeld(d.state, { emit: () => undefined }); // the Spanish record is refreshed at the next change on the hills
    expect(bannerTotal(d.state, 'top')).toBe(2);
  });
});

describe('118: Ordal Cross (S23)', () => {
  it('118: three hill works with sides SW, SE, E', () => {
    const s = real('118');
    const sides = (h: number) => HEX_DIRS.filter((_, i) => (worksMask(s, h) & (1 << i)) !== 0).sort();
    for (const [r, c, key] of [[3, 4, 'BR/FA'], [4, 9, 'SP/LN'], [5, 3, 'BR/LN']] as const) {
      expect(terrainAt(s, H(r, c)), `${r},${c}`).toBe('hill');
      expect(sides(H(r, c)), `${r},${c}`).toEqual(['E', 'SE', 'SW']);
      expect(s.units.find((x) => x.hex === H(r, c))?.key).toBe(key);
    }
    // an attack across a works side is reduced (E side open, W-facing side not)
    const hillUnit = s.units.find((x) => x.hex === H(5, 3))!;
    const work = H(5, 3);
    const east = neighbours(work).find((h) => HEX_DIRS[directionTo(work, h)] === 'E')!;
    const west = neighbours(work).find((h) => HEX_DIRS[directionTo(work, h)] === 'W')!;
    expect(worksAcross(s, work, east)).toBe(true);
    expect(worksAcross(s, work, west)).toBe(false);
    expect(hillUnit.side).toBe('top');
  });
});

describe('every Spanish battle plays on from its real setup', () => {
  it('every real setup passes the structural invariants (a bottom pass opens each)', () => {
    for (let id = 101; id <= 118; id++) {
      const s = real(String(id));
      expect(violations(s, true), String(id)).toEqual([]);
    }
  });
});

