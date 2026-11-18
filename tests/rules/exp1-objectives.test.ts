// Rules: RR §15.8, §16.2, §16.5, §16.13–§16.15, §16.17 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { GameDriver, OFF_BOARD, bannerTotal, exitPiece, forceDice, pieceMoves, type GameEvent, type GameState } from '../../src/engine';
import type { ObjectiveSetup } from '../../src/engine';
import { H, attack, build, endTurn, ev, leaderId, miss, must, n, passTurn, play, toBattle, turn, endMoves } from './helpers';

const heldEv = (es: GameEvent[], side: 'top' | 'bottom') => es.filter((e) => e.t === 'held' && e.side === side);
const far = { side: 'bottom' as const, key: 'BR/LN' as const, at: [8, 8] as [number, number] };

/** Move `id` to a hex `ok` accepts (never off the board); returns the hex. */
function step(d: GameDriver, id: string, ok: (h: number) => boolean): number {
  const t = pieceMoves(d.state, id).find((m) => m.hex !== OFF_BOARD && ok(m.hex));
  if (!t) throw new Error(`${id} has no such move`);
  must(d, { kind: 'move', piece: id, to: t.hex });
  return t.hex;
}

describe('tempAny (S35)', () => {
  const group = [[2, 5], [2, 6]] as [number, number][];
  const obj: ObjectiveSetup = { kind: 'tempAny', side: 'top', hexes: group };
  const inGroup = (h: number) => group.some(([r, c]) => H(r, c) === h);

  it('tempAny: a unit on either hex at turn start holds it; one banner whatever the count (S35)', () => {
    const s = build({ objectives: [obj], first: 'bottom', units: [{ side: 'top', key: 'FR/LN', at: [2, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }, far] });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(0);
    ev(d);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    expect(d.state.special.objState[0].holders?.slice().sort()).toEqual(['u1', 'u2']);
    expect(heldEv(ev(d), 'top')).toHaveLength(1);
    // one unit on the far hex alone holds it too
    const s2 = build({ objectives: [obj], first: 'bottom', units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, far] });
    const d2 = new GameDriver(s2);
    passTurn(d2);
    expect(bannerTotal(d2.state, 'top')).toBe(1);
  });

  it('tempAny: lost when the last holder leaves, even if a non-holder stands on the other hex (S35)', () => {
    const s = build({
      objectives: [obj], first: 'bottom',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 5] }, { side: 'top', key: 'FR/LN', at: [3, 6] }, far],
    });
    const d = new GameDriver(s);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    ev(d);
    turn(d, 'attackC', ['u1', 'u2']);
    step(d, 'u2', (h) => inGroup(h) && h !== H(2, 5));          // a newcomer on the other hex
    expect(d.state.special.objState[0].holders).toEqual(['u1']);   // ... is not a holder
    expect(bannerTotal(d.state, 'top')).toBe(1);
    step(d, 'u1', (h) => !inGroup(h));
    expect(bannerTotal(d.state, 'top')).toBe(0);
    const lost = heldEv(ev(d), 'top');
    expect(lost).toHaveLength(1);
    expect(lost[0]).toMatchObject({ total: 0 });
  });
});

describe('majority (S36)', () => {
  const group = [[3, 4], [3, 5], [3, 6]] as [number, number][];
  const mine: ObjectiveSetup = { kind: 'majority', side: 'top', hexes: group };
  const theirs: ObjectiveSetup = { kind: 'majority', side: 'bottom', hexes: group };
  const inGroup = (h: number) => group.some(([r, c]) => H(r, c) === h);

  it('majority: held at own turn start with more hexes; one against none counts (S36)', () => {
    const s = build({ objectives: [mine, theirs], first: 'bottom', units: [{ side: 'top', key: 'FR/LN', at: [3, 4] }, far] });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(0);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    expect(bannerTotal(d.state, 'bottom')).toBe(0);
    expect(heldEv(ev(d), 'top').some((e) => e.t === 'held' && e.total === 1)).toBe(true);
  });

  it('majority: lost at once when the enemy ties, on the enemy\'s turn; the enemy takes it only at its own turn start (S36)', () => {
    const s = build({
      objectives: [{ ...mine, startHeld: true }, theirs], first: 'bottom',
      units: [{ side: 'top', key: 'FR/LN', at: [3, 4] }, { side: 'bottom', key: 'BR/LN', at: [4, 5] }, { side: 'bottom', key: 'BR/LN', at: [4, 6] }],
    });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    turn(d, 'attackC', ['u2', 'u3']);
    ev(d);
    step(d, 'u2', (h) => h === H(3, 5));
    expect(bannerTotal(d.state, 'top')).toBe(0);                    // 1 against 1: lost at once, on bottom's turn
    expect(bannerTotal(d.state, 'bottom')).toBe(0);                 // a tie gives it to nobody
    step(d, 'u3', (h) => h === H(3, 6));
    expect(bannerTotal(d.state, 'bottom')).toBe(0);                 // 2 against 1, but bottom takes it only at its own turn start
    endMoves(d);
    endTurn(d);
    passTurn(d);                                                    // top's turn, then bottom's turn start
    expect(bannerTotal(d.state, 'bottom')).toBe(1);
    expect(bannerTotal(d.state, 'top')).toBe(0);
  });

  it('majority: a lone leader counts for nothing (R65)', () => {
    const s = build({ objectives: [mine], first: 'bottom', units: [far], leaders: [{ side: 'top', at: [3, 4] }] });
    const d = new GameDriver(s);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(0);
    // ... and a unit beside him with the leader on another hex of the group still counts as one hex
    const s2 = build({ objectives: [mine], first: 'bottom', units: [{ side: 'top', key: 'FR/LN', at: [3, 5] }, far], leaders: [{ side: 'top', at: [3, 4] }] });
    const d2 = new GameDriver(s2);
    passTurn(d2);
    expect(bannerTotal(d2.state, 'top')).toBe(1);
  });

  it('majority startHeld: the start banner is the group banner, lost like any other (S36)', () => {
    const s = build({ objectives: [{ ...mine, startHeld: true }], first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [3, 4] }, far] });
    const d = play(s, 'attackC', ['u1']);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    ev(d);
    step(d, 'u1', (h) => !inGroup(h));
    expect(bannerTotal(d.state, 'top')).toBe(0);
    expect(heldEv(ev(d), 'top')[0]).toMatchObject({ total: 0 });
  });
});

describe('exitEdge (S31)', () => {
  const edge: ObjectiveSetup = { kind: 'exitEdge', side: 'top', row: 8, free: 3 };
  const ctx = { emit: () => {} };
  const baseline = [[8, 4], [8, 5], [8, 6], [8, 7], [8, 8]] as const;

  it('exitEdge: any baseline hex; the first three units score nothing, the fourth scores 1 (S31)', () => {
    const s = build({
      objectives: [edge], first: 'top',
      units: [...baseline.slice(0, 4).map(([r, c]) => ({ side: 'top' as const, key: 'FR/LN' as const, at: [r, c] as [number, number] })), { side: 'bottom', key: 'BR/LN', at: [0, 0] }],
    });
    const d = play(s, 'attackC', ['u1']);
    expect(pieceMoves(d.state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(true);
    // a hex off the edge row offers no exit
    const s2 = build({ objectives: [edge], first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [6, 5] }, { side: 'bottom', key: 'BR/LN', at: [0, 0] }] });
    expect(pieceMoves(play(s2, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(false);
    // the enemy's baseline row 0 is no exit of this objective
    const s3 = build({ objectives: [edge], first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [0, 5] }, { side: 'bottom', key: 'BR/LN', at: [8, 8] }] });
    expect(pieceMoves(play(s3, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(false);
    // the bottom side has no such objective
    const s4 = build({ objectives: [edge], first: 'bottom', units: [{ side: 'bottom', key: 'BR/LN', at: [8, 5] }, { side: 'top', key: 'FR/LN', at: [0, 0] }] });
    expect(pieceMoves(play(s4, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(false);
    const banners: number[] = [];
    for (const id of ['u1', 'u2', 'u3', 'u4']) {
      exitPiece(s, ctx, id);
      banners.push(s.players.top.banners);
    }
    expect(banners).toEqual([0, 0, 0, 1]);
    expect(s.special.objState[0].count).toBe(4);
  });

  it('exitEdge: a leader exits for nothing and is not counted; a retreat never carries a unit off (S31, R67)', () => {
    const s = build({
      objectives: [edge], first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [5, 5] }, { side: 'bottom', key: 'BR/LN', at: [0, 0] }], leaders: [{ side: 'top', at: [8, 6] }],
    });
    const d = play(s, 'attackC', [leaderId(s, 0)]);
    must(d, { kind: 'move', piece: leaderId(d.state, 0), to: OFF_BOARD });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.special.objState[0].count).toBe(0);
    expect(d.state.players.top.banners).toBe(0);
    // a unit forced to retreat from the edge row stays on the board (or loses blocks), never exits
    const r = build({
      objectives: [{ ...edge, free: 0 }], first: 'bottom',
      units: [{ side: 'top', key: 'FR/LN', at: [8, 6], blocks: 4 }, { side: 'bottom', key: 'BR/LN', at: [7, 6] }],
    });
    const rd = toBattle(r, 'attackC', ['u2']);
    forceDice([miss('BR/LN', 'FR/LN'), miss('BR/LN', 'FR/LN'), miss('BR/LN', 'FR/LN'), 'flag', 'flag', 'flag', 'flag', ...n('flag', 20)]);
    attack(rd, 'u2', H(8, 6));
    expect(r.special.objState[0].count).toBe(0);
    expect(r.players.top.banners).toBe(0);
    expect(rd.state.units.find((x) => x.id === 'u1')?.hex).not.toBe(OFF_BOARD);
  });

  it('exitEdge: stepping off costs a hex; a unit stopped on the baseline by terrain cannot exit (S31)', () => {
    // LN (1 hex): one hex to reach row 8 and the step off would be a second
    const a = build({ objectives: [edge], first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [7, 5] }, { side: 'bottom', key: 'BR/LN', at: [0, 0] }] });
    expect(pieceMoves(play(a, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(false);
    // LC reaches an edge-row hex that is forest and stops there: no exit
    const b = build({
      objectives: [edge], first: 'top', terrain: [3, 4, 5, 6, 7].map((c) => ({ at: [8, c] as [number, number], t: 'forest' as const })),   // every way to the edge row ends in a forest
      units: [{ side: 'top', key: 'FR/LC', at: [7, 5] }, { side: 'bottom', key: 'BR/LN', at: [0, 0] }],
    });
    expect(pieceMoves(play(b, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(false);
    // the same LC over open ground steps off from the edge hex
    const c = build({ objectives: [edge], first: 'top', units: [{ side: 'top', key: 'FR/LC', at: [7, 5] }, { side: 'bottom', key: 'BR/LN', at: [0, 0] }] });
    expect(pieceMoves(play(c, 'attackC', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(true);
  });
});

describe('suddenDeath (S32)', () => {
  const sd: ObjectiveSetup = { kind: 'suddenDeath', side: 'top', keys: ['BR/FA'], text: 'The guns are gone.' };

  it('suddenDeath: the third gun lost ends the battle at once, even by a failed retreat on the other side\'s turn (S32)', () => {
    const s = build({
      objectives: [sd], first: 'bottom',
      units: [
        { side: 'bottom', key: 'BR/FA', at: [8, 6], blocks: 1 }, { side: 'bottom', key: 'BR/FA', at: [8, 0] }, { side: 'bottom', key: 'BR/FA', at: [8, 1] },
        { side: 'top', key: 'FR/LN', at: [7, 6] },
      ],
    });
    expect(s.scenario.objectives[0]).toMatchObject({ kind: 'suddenDeath', need: 3 });
    s.special.objState[0].count = 2;   // two guns already lost
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    // the gun attacks; the battle-back flags drive it off the board's edge: no room, so it is eliminated
    forceDice([...n(miss('BR/FA', 'FR/LN'), 3), ...n('flag', 20)]);
    attack(d, 'u1', H(7, 6));
    expect(d.state.units.some((x) => x.id === 'u1')).toBe(false);
    expect(d.state.winner).toBe('top');
    expect(d.state.winReason).toBe('The guns are gone.');
    expect(d.pending).toBeNull();
    const es = ev(d);
    expect(es.filter((e) => e.t === 'victory')).toHaveLength(1);
    expect(es[es.length - 1].t).toBe('victory');
  });

  it('suddenDeath: a banner win in an earlier event stands (S32)', () => {
    const s = build({
      banners: 1, objectives: [sd], first: 'top',
      units: [{ side: 'bottom', key: 'BR/FA', at: [4, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [5, 6] }],
    });
    const d = toBattle(s, 'attackC', ['u2']);
    forceDice(n('artillery', 30));
    attack(d, 'u2', H(4, 6));
    expect(d.state.winner).toBe('top');
    expect(d.state.winReason).toMatch(/banners/);
    expect(ev(d).filter((e) => e.t === 'victory')).toHaveLength(1);
  });
});
