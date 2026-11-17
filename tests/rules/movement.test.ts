// Rules: RR §6.2, §7.1, §7.2 (design/rules-reference.md)
import { describe, expect, it, vi } from 'vitest';
import type { GameState as GS, HexId } from '../../src/engine';
import { OFF_BOARD, battleReady, canBattleAfterMove, fireDice, pieceMoves, type CardKind, type GameState, type MoveTarget } from '../../src/engine';
import { H, build, ev, forceDice, must, leaderId, play, type Pos } from './helpers';

const moves = (p: Pos, id = 'u1', card: CardKind = 'probeC', pieces: string[] = [id]): MoveTarget[] => {
  const d = play(build(p), card, pieces);
  return pieceMoves(d.state, id);
};
const reach = (m: MoveTarget[]) => new Map(m.map((t) => [t.hex, t.battle]));
const hexes = (m: MoveTarget[]) => new Set(m.map((t) => t.hex));
const B = (key: string, r: number, c: number) => ({ side: 'bottom' as const, key: key as never, at: [r, c] as [number, number] });
const T = (key: string, r: number, c: number) => ({ side: 'top' as const, key: key as never, at: [r, c] as [number, number] });
const one = (key: string, extra: Pos = {}) => moves({ units: [B(key, 6, 6)], ...extra });

// Exit hexes for the exit tests below (T13 owns the real `exitAllowedFrom`; here it is a table).
const exitHexes = new Set<HexId>();
vi.mock('../../src/engine/objectives', async (orig) => ({
  ...(await orig<typeof import('../../src/engine/objectives')>()),
  exitAllowedFrom: (_s: GS, _p: unknown, h: HexId) => exitHexes.has(h),
}));

describe('movement', () => {
  it('allowances (§7.1)', () => {
    const ln = one('BR/LN');
    expect(ln.length).toBe(6);
    expect(ln.every((t) => t.battle)).toBe(true);
    const lt = reach(one('BR/LT'));
    expect(lt.get(H(4, 6))).toBe(false);
    expect(lt.get(H(5, 6))).toBe(true);
    expect(reach(one('BR/LC')).get(H(3, 6))).toBe(true);
    const hc = reach(one('BR/HC'));
    expect(hc.get(H(4, 6))).toBe(true);
    expect(hc.has(H(3, 6))).toBe(false);
    const fa = reach(one('BR/FA'));
    expect(fa.get(H(5, 6))).toBe(false);
    expect(fa.has(H(4, 6))).toBe(false);
    const ha = reach(one('BR/HA'));
    expect(ha.get(H(5, 6))).toBe(true);
    expect(ha.get(H(4, 6))).toBe(false);
    const ha1 = reach(moves({ units: [{ ...B('BR/HA', 6, 6), blocks: 1 }] }));
    expect(ha1.get(H(5, 6))).toBe(false); // R12
    const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }] });
    const d = play(s, 'probeC', [leaderId(s, 0)]);
    expect(hexes(pieceMoves(d.state, leaderId(s, 0))).has(H(3, 6))).toBe(true);
  });

  it('units block; enemy leaders block units (§7.2)', () => {
    const m1 = reach(moves({ units: [B('BR/LT', 6, 6), B('BR/LN', 5, 5), B('BR/LN', 5, 6)] }));
    expect(m1.has(H(4, 6))).toBe(false);
    expect(m1.has(H(5, 5))).toBe(false);
    expect(m1.has(H(5, 6))).toBe(false);
    const m2 = reach(moves({ units: [B('BR/LT', 6, 6)], leaders: [{ side: 'top', at: [5, 6] }] }));
    expect(m2.has(H(5, 6))).toBe(false);
    expect(m2.has(H(4, 6))).toBe(true);
  });

  it('a unit without a leader may enter a lone friendly leader and stops; one with a leader may not enter or pass (R80)', () => {
    const p: Pos = { units: [B('BR/LC', 6, 6)], leaders: [{ side: 'bottom', at: [5, 6] }] };
    const s = build(p);
    const m = moves(p);
    const t = m.find((x) => x.hex === H(5, 6))!;
    expect(t.stops).toBe(true);
    expect(t.attach).toBe(leaderId(s, 0));
    expect(hexes(m).has(H(4, 6))).toBe(true); // through (5,5)
    const q: Pos = { units: [B('BR/LC', 6, 6)], leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [5, 6] }] };
    const mq = hexes(moves(q));
    expect(mq.has(H(5, 6))).toBe(false);
    const r: Pos = { ...q, units: [B('BR/LC', 6, 6), B('BR/LN', 5, 5)] };
    expect(hexes(moves(r)).has(H(4, 6))).toBe(false);
  });

  it('a lone leader passes friendly pieces, attaches to a leaderless unit, never ends on a leader or enters enemies (§7.2)', () => {
    const p: Pos = {
      units: [B('BR/LN', 5, 6), B('BR/LN', 5, 5), T('FR/LN', 4, 6)],
      leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [5, 5] }],
    };
    const s = build(p);
    const d = play(s, 'probeC', [leaderId(s, 0)]);
    const m = pieceMoves(d.state, leaderId(s, 0));
    expect(m.find((x) => x.hex === H(5, 6))?.attach).toBe('u1');
    expect(hexes(m).has(H(5, 5))).toBe(false);
    expect(hexes(m).has(H(4, 5))).toBe(true);
    expect(hexes(m).has(H(4, 6))).toBe(false);
  });

  const stopTerrain: [string, Pos['terrain'], Pos['rivers']?][] = [
    ['forest', [{ at: [5, 6], t: 'forest' }]],
    ['town', [{ at: [5, 6], t: 'town' }]],
    ['windmill', [{ at: [5, 6], t: 'windmill' }]],
    ['fortress', [{ at: [5, 6], t: 'fortress' }]],
    ['ford', [{ at: [5, 6], t: 'river', crossing: 'ford' }]],
    ['brook', [{ at: [5, 6], t: 'river' }], 'brook'],
    ['sandQuarry', [{ at: [5, 6], t: 'sandQuarry' }]],
  ];
  for (const [name, terrain, rivers] of stopTerrain) {
    it(`terrain stops: ${name} (§4.1, §7.2)`, () => {
      const m = moves({ units: [B('BR/LC', 6, 6)], terrain, rivers });
      expect(m.find((x) => x.hex === H(5, 6))?.stops).toBe(true);
      expect(hexes(m).has(H(4, 6))).toBe(true);
    });
  }
  it('terrain does not stop: fordNoStop, bridge (§4.1)', () => {
    const a = moves({ units: [B('BR/LC', 6, 6)], terrain: [{ at: [5, 6], t: 'river' }], rivers: 'fordableNoStop' });
    expect(a.find((x) => x.hex === H(5, 6))?.stops).toBe(false);
    const b = moves({ units: [B('BR/LC', 6, 6)], terrain: [{ at: [5, 6], t: 'river', crossing: 'bridge' }] });
    expect(b.find((x) => x.hex === H(5, 6))?.stops).toBe(false);
  });

  it('crossing a works hexside stops the move, both ways (§4.4)', () => {
    const works: Pos['terrain'] = [{ at: [5, 6], t: 'fieldworks', on: 'plain', sides: ['SE'] }];
    const fromSide = moves({ units: [B('BR/LC', 6, 7)], terrain: works });
    expect(fromSide.find((x) => x.hex === H(5, 6))?.stops).toBe(true);
    const open = moves({ units: [B('BR/LC', 6, 6)], terrain: works });
    expect(open.find((x) => x.hex === H(5, 6))?.stops).toBe(false);
    expect(hexes(open).has(H(4, 6))).toBe(true);
    const leaving = moves({ units: [B('BR/LC', 5, 6)], terrain: works });
    expect(leaving.find((x) => x.hex === H(6, 7))?.stops).toBe(true);
  });

  it('river and rugged hill are impassable; the sand quarry is impassable to artillery only (§4.1)', () => {
    const river: Pos['terrain'] = [{ at: [5, 6], t: 'river' }];
    expect(hexes(moves({ units: [B('BR/LC', 6, 6)], terrain: river })).has(H(5, 6))).toBe(false);
    const rugged: Pos['terrain'] = [{ at: [5, 6], t: 'rugged' }];
    expect(hexes(moves({ units: [B('BR/LC', 6, 6)], terrain: rugged })).has(H(5, 6))).toBe(false);
    for (const terrain of [river, rugged]) {
      const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain });
      const d = play(s, 'probeC', [leaderId(s, 0)]);
      expect(hexes(pieceMoves(d.state, leaderId(s, 0))).has(H(5, 6))).toBe(false);
    }
    const sq: Pos['terrain'] = [{ at: [5, 6], t: 'sandQuarry' }];
    const ln = moves({ units: [B('BR/LN', 6, 6)], terrain: sq });
    expect(ln.find((x) => x.hex === H(5, 6))?.stops).toBe(true);
    expect(hexes(moves({ units: [B('BR/HA', 6, 6)], terrain: sq })).has(H(5, 6))).toBe(false);
  });

  it('no battle after entering a forest (except light) or a town (R42)', () => {
    const forest: Pos['terrain'] = [{ at: [5, 6], t: 'forest' }];
    expect(reach(moves({ units: [B('BR/LN', 6, 6)], terrain: forest })).get(H(5, 6))).toBe(false);
    expect(reach(moves({ units: [B('BR/LT', 6, 6)], terrain: forest })).get(H(5, 6))).toBe(true);
    expect(reach(moves({ units: [B('BR/LT', 6, 6)], terrain: [{ at: [5, 6], t: 'town' }] })).get(H(5, 6))).toBe(false);
  });

  it('a leader who joins a unit stops it moving; attaching does not order it (§6.2)', () => {
    const p: Pos = { units: [B('BR/LN', 5, 6), T('FR/LN', 3, 6)], leaders: [{ side: 'bottom', at: [6, 6] }] };
    const s = build(p);
    const lid = leaderId(s, 0);
    const d = play(s, 'probeC', [lid, 'u1']);
    must(d, { kind: 'move', piece: lid, to: H(5, 6) });
    expect(ev(d).some((e) => e.t === 'attach')).toBe(true);
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    expect(battleReady(d.state)).toContain('u1');
    const s2 = build(p);
    const d2 = play(s2, 'probeC', [leaderId(s2, 0)]);
    must(d2, { kind: 'move', piece: leaderId(s2, 0), to: H(5, 6) });
    expect(d2.state.turn.ordered.u1).toBeUndefined();
  });

  it('nobody leaves the board without an exit objective (§7.2)', () => {
    const m = moves({ units: [T('FR/LN', 0, 6)], first: 'top' });
    expect(m.some((t) => t.hex === OFF_BOARD)).toBe(false);
  });

  it('each piece moves at most once per turn (§7.2)', () => {
    const s = build({ units: [B('BR/LC', 6, 6)] });
    const d = play(s, 'probeC', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
  });

  it('a square cannot move, and its attached leader cannot move alone (R32, R33)', () => {
    const s = build({ units: [{ ...B('BR/LN', 6, 6) }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    s.units[0].square = 1;
    const d = play(s, 'probeC', ['u1']);
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    const lid = leaderId(s, 0);
    d.state.turn.ordered[lid] = { ...d.state.turn.ordered.u1, id: lid, isLeader: true, moved: 0, moveDone: false };
    expect(pieceMoves(d.state, lid)).toEqual([]);
    d.state.units[0].square = undefined;  // control: the same leader moves once the unit is out of square
    expect(pieceMoves(d.state, lid).length).toBeGreaterThan(0);
  });

  it('an unmoved La Grande Manoeuvre unit may not battle (R62)', () => {
    const s = build({ units: [B('BR/LN', 5, 6), T('FR/LN', 4, 6)] });
    const d = play(s, 'grandManoeuvre', ['u1']);
    const u1 = d.state.units[0];
    expect(canBattleAfterMove(d.state, u1, d.state.turn.ordered.u1)).toBe(false);
    expect(pieceMoves(d.state, 'u1').every((t) => !t.battle)).toBe(true);
  });

  describe('card movement (§12.2; [Interp R57] does not apply: cards order these units)', () => {
    const at = (key: string, card: CardKind, hex: number, extra: Pos = {}, pieces?: string[]) =>
      reach(moves({ units: [B(key, 6, 6)], ...extra }, 'u1', card, pieces)).get(hex);
    it('bayonetCharge', () => {
      expect(at('BR/LN', 'bayonetCharge', H(4, 6))).toBe(true);
      expect(at('BR/LT', 'bayonetCharge', H(4, 6))).toBe(true);
    });
    it('forceMarch', () => {
      expect(at('BR/GR', 'forceMarch', H(4, 6))).toBe(true);
      expect(at('BR/LN', 'forceMarch', H(5, 6))).toBe(true);
      expect(at('BR/LN', 'forceMarch', H(4, 6))).toBe(false);
      const led: Pos = { leaders: [{ side: 'bottom', at: [6, 6] }] };
      expect(at('BR/LN', 'forceMarch', H(4, 6), led)).toBe(true);
    });
    it('cavalryCharge', () => {
      expect(at('BR/HC', 'cavalryCharge', H(3, 6))).toBe(true);
      expect(at('BR/LC', 'cavalryCharge', H(3, 6))).toBe(true);
      expect(hexes(moves({ units: [B('BR/LC', 6, 6)] }, 'u1', 'cavalryCharge')).has(H(2, 6))).toBe(false);
      expect(at('BR/HA', 'cavalryCharge', H(5, 6))).toBe(true);
      expect(at('BR/HA', 'cavalryCharge', H(4, 6))).toBe(false);
    });
    it('bombard', () => {
      expect(at('BR/FA', 'bombard', H(3, 6))).toBe(false);
      const s = build({ units: [B('BR/FA', 6, 6)] });
      const d = play(s, 'bombard', ['u1']);
      expect(canBattleAfterMove(d.state, d.state.units[0], d.state.turn.ordered.u1)).toBe(true);
      expect(at('BR/HA', 'bombard', H(3, 6))).toBe(false);
    });
    it('grandManoeuvre and fireAndHold', () => {
      expect(at('BR/LN', 'grandManoeuvre', H(2, 6))).toBe(false);
      const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }] });
      const d = play(s, 'grandManoeuvre', [leaderId(s, 0)]);
      const ms = pieceMoves(d.state, leaderId(s, 0));
      expect(ms.some((t) => t.path.length === 5)).toBe(true);
      expect(ms.every((t) => t.path.length <= 5)).toBe(true);
      expect(moves({ units: [B('BR/LN', 6, 6)] }, 'u1', 'fireAndHold')).toEqual([]);
    });
  });

  it('"moved" is hexes moved this turn; a Force March unit that moved 2 fires its moving dice ([Interp R73])', () => {
    const s = build({ units: [B('BR/GR', 6, 6), T('FR/LN', 2, 6)] });
    const d = play(s, 'forceMarch', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.turn.ordered.u1.moved).toBe(2);
    expect(fireDice(d.state, d.state.units[0], H(2, 6), { role: 'attack', moved: 2 })).toBe(3);
    forceDice([]);
  });

  it('a Force March unit that moves 2 has moved 2 ([Interp R73])', () => {
    const s = build({ units: [B('BR/GR', 6, 6), T('FR/LN', 2, 6)] });
    const d = play(s, 'forceMarch', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.turn.ordered.u1.moved).toBe(2);
  });

  describe('a hex entered by a stopping path (carry-forward)', () => {
    // (4,6) has a works side SE: entering it from (5,6) crosses the works and stops; from (5,5) it does not. The enemy on
    // (4,7) leaves (4,6) as the only way on to (3,6) within three steps.
    const terrain: Pos['terrain'] = [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['SE'] }];
    it('a unit reaches beyond a hex a first path stops at', () => {
      const m = moves({ units: [B('BR/LC', 6, 6), T('FR/LN', 4, 7)], terrain });
      expect(hexes(m).has(H(3, 6))).toBe(true);
      expect(m.find((t) => t.hex === H(4, 6))?.stops).toBe(false);
      expect(m.filter((t) => t.hex === H(4, 6)).length).toBe(1);
    });
    it('a leader reaches beyond a hex a first path stops at', () => {
      const p: Pos = { units: [T('FR/LN', 4, 7)], leaders: [{ side: 'bottom', at: [6, 6] }], terrain };
      const s = build(p);
      const d = play(s, 'probeC', [leaderId(s, 0)]);
      const m = pieceMoves(d.state, leaderId(s, 0));
      expect(hexes(m).has(H(3, 6))).toBe(true);
      expect(m.filter((t) => t.hex === H(4, 6)).length).toBe(1);
    });
  });

  describe('exits (RR §7.2, R67; the exit table is mocked, T13 owns the rule)', () => {
    const withExit = <T,>(hs: HexId[], f: () => T): T => { exitHexes.clear(); hs.forEach((h) => exitHexes.add(h)); try { return f(); } finally { exitHexes.clear(); } };
    const lm = (p: Pos) => { const s = build(p); const d = play(s, 'probeC', [leaderId(s, 0)]); return { d, lid: leaderId(s, 0), m: pieceMoves(d.state, leaderId(s, 0)) }; };
    it('a unit is offered one OFF_BOARD target, even when the exit is reached by a stopping path first', () => {
      // exit hex (4,6) is entered from (5,6) across the works (stops) first, from (5,5) without stopping later
      const works: Pos['terrain'] = [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['SE'] }];
      const m = withExit([H(4, 6)], () => moves({ units: [B('BR/LC', 6, 6), T('FR/LN', 4, 7)], terrain: works }));
      expect(m.filter((t) => t.hex === OFF_BOARD).length).toBe(1);
    });
    it('a leader standing on an exit hex may step off; one passing a friendly unit on it may exit', () => {
      const a = withExit([H(6, 6)], () => lm({ leaders: [{ side: 'bottom', at: [6, 6] }] }));
      expect(a.m.some((t) => t.hex === OFF_BOARD)).toBe(true);
      const b = withExit([H(5, 6)], () => lm({ units: [B('BR/LN', 5, 6)], leaders: [{ side: 'bottom', at: [6, 6] }] }));
      expect(b.m.some((t) => t.hex === OFF_BOARD)).toBe(true);
    });
    // 'the exiting piece stands on the exit hex when exitPiece runs' moved to objectives.test.ts (real exit objectives; exitPiece throws elsewhere)
  });
});
