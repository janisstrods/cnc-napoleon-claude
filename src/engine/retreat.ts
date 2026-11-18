// Retreat paths (RR §1, §10.1). Pure functions. Leader retreats (→ T6b) and Retire and Reform (→ T8) are stubs.
import { onBaseline, rearHexes } from './hex';
import { attachedLeader, leaderAt, unitAt } from './query';
import { passableFor } from './terrain';
import { statsOf } from './units';
import type { GameState, HexId, Leader, LeaderRetreatOption, RetreatOption, Unit } from './types';

function cmpPath(a: HexId[], b: HexId[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/**
 * Retreat options for a unit that must retreat `hexes` hexes toward its own side: paths of retreat neighbours that avoid
 * units, enemy leaders and impassable hexes. A unit without a leader may end early on a lone friendly leader (attach); one
 * with a leader may pass but not end there (R75). Full paths if any exist, else the longest with a loss per hex short (R74).
 * Ascending by end hex.
 */
export function retreatOptions(s: GameState, u: Unit, hexes: number): RetreatOption[] {
  const arm = statsOf(s, u).arm;
  const hasLeader = !!attachedLeader(s, u);
  const complete: RetreatOption[] = [];
  const ends: { path: HexId[] }[] = [];
  const walk = (cur: HexId, path: HexId[]) => {
    const onLeader = path.length > 0 && hasLeader && leaderAt(s, cur)?.side === u.side;
    if (path.length === hexes) {
      if (onLeader) return; // R75: a unit with a leader may pass a lone friendly leader but not end there
      complete.push({ path, end: cur, losses: 0, attach: null });
      return;
    }
    if (!onLeader) ends.push({ path });
    for (const h of rearHexes(cur, u.side)) {
      if (unitAt(s, h) || !passableFor(s, h, arm)) continue;
      const l = leaderAt(s, h);
      if (l) {
        if (l.side !== u.side) continue;
        if (!hasLeader) {
          complete.push({ path: [...path, h], end: h, losses: 0, attach: l.id });
          continue;
        }
      }
      walk(h, [...path, h]);
    }
  };
  walk(u.hex, []);
  const byKey = (a: RetreatOption, b: RetreatOption) => a.end - b.end || cmpPath(a.path, b.path);
  if (complete.length) return complete.sort(byKey);
  const longest = Math.max(...ends.map((e) => e.path.length));
  return ends.filter((e) => e.path.length === longest)
    .map((e) => ({ path: e.path, end: e.path.length ? e.path[e.path.length - 1] : u.hex, losses: hexes - longest, attach: null }))
    .sort(byKey);
}

/**
 * A retreating leader's options (RR §11.3, §11.4; R24, R25): paths of 1-3 steps through retreat neighbours. He passes friendly
 * units and lone friendly leaders, may end on a friendly unit without a leader (attach) but not on a leader or an enemy; a hex
 * with only an enemy leader is passed with no roll; an enemy unit hex is entered as an escape (the owner may choose one
 * even when a free path exists), and a third enemy hex eliminates him. A path that reaches his baseline with steps to spare
 * also has an `offBoard` form (he leaves the map). With no way to take even 1 step the only option is `eliminated`.
 * Ascending by end hex, then path.
 */
export function leaderRetreatOptions(s: GameState, l: Leader): LeaderRetreatOption[] {
  const out: LeaderRetreatOption[] = [];
  if (onBaseline(l.hex, l.side)) return [{ path: [], end: l.hex, offBoard: true, escapes: [], attach: null, eliminated: false }];
  const walk = (cur: HexId, path: HexId[], escapes: string[]) => {
    if (path.length > 0 && onBaseline(cur, l.side) && path.length < 3) {
      out.push({ path, end: cur, offBoard: true, escapes, attach: null, eliminated: false });
    }
    if (path.length === 3) return;
    for (const h of rearHexes(cur, l.side)) {
      if (!passableFor(s, h, null)) continue;
      const v = unitAt(s, h);
      const o = leaderAt(s, h);
      const next = [...path, h];
      const last = next.length === 3;
      if (v && v.side !== l.side) {
        if (escapes.length >= 2) {
          out.push({ path: next, end: h, offBoard: false, escapes, attach: null, eliminated: true });
          continue;
        }
        if (!last) walk(h, next, [...escapes, v.id]);
        continue;
      }
      if (o && o.side !== l.side) {
        if (!last) walk(h, next, escapes);
        continue;
      }
      const attachable = v && v.side === l.side && !o;
      const free = !v && !o;
      if (free || attachable) out.push({ path: next, end: h, offBoard: false, escapes, attach: attachable ? v.id : null, eliminated: false });
      if (!last) walk(h, next, escapes);
    }
  };
  walk(l.hex, [], []);
  if (!out.length) return [{ path: [], end: l.hex, offBoard: false, escapes: [], attach: null, eliminated: true }];
  return out.sort((a, b) => a.end - b.end || cmpPath(a.path, b.path) || Number(a.offBoard) - Number(b.offBoard));
}

/** Retire and Reform paths. Stub: none (→ T8). */
export function retireReformOptions(_s: GameState, _u: Unit): RetreatOption[] {
  return [];
}
