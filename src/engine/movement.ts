// Movement (RR §6.2, §7): card allowances, terrain stops, leaders, exits. Terrain via `passableFor` / `stopsOnEntry`.
import { neighbours } from './hex';
import { exitAllowedFrom, exitPiece, updateHeld } from './objectives';
import { attachedLeader, leaderAt, leaderById, unitAt, unitById } from './query';
import { noBattleAfterEntering, passableFor, stopsOnEntry } from './terrain';
import { LEADER_MOVE, matches, statsOf } from './units';
import { OFF_BOARD, type FlowCtx, type GameState, type HexId, type MoveOption, type OrderedPiece, type Unit } from './types';

export interface MoveTarget { hex: HexId; path: HexId[]; stops: boolean; battle: boolean; attach: string | null }

/** The allowances of an ordered unit this turn (RR §7.1, §12.2, R33, R73). */
export function moveOptions(s: GameState, u: Unit, op: OrderedPiece): readonly MoveOption[] {
  const st = statsOf(s, u);
  const m = s.turn.mods;
  if (u.square || (m.noMove && op.cardMods)) return [{ max: 0, battle: true }];
  if (!op.cardMods || m.move === null) return st.move;
  if (m.move === 'forceMarch') {
    const fast = st.tags.some((t) => t === 'light' || t === 'grenadier' || t === 'guard') || !!attachedLeader(s, u);
    return fast ? [{ max: 2, battle: true }] : [{ max: 1, battle: true }, { max: 2, battle: false }];
  }
  return !m.move.only || matches(st, m.move.only) ? m.move.options : st.move;
}

/** May the unit battle after moving `op.moved` hexes (and having entered no battle-barring terrain)? */
export function canBattleAfterMove(s: GameState, u: Unit, op: OrderedPiece): boolean {
  if (op.noBattle) return false;
  const opts = moveOptions(s, u, op);
  if (op.moved === 0) return opts.some((o) => o.battle);
  return opts.some((o) => o.max >= op.moved && o.battle) && u.blocks >= statsOf(s, u).battleAfterMoveMinBlocks;
}

/** The hexes an ordered unit may move to (path includes the start hex). A piece moves at most once per turn. */
export function unitMoves(s: GameState, id: string): MoveTarget[] {
  const u = unitById(s, id);
  const op = s.turn.ordered[id];
  if (!u || !op || u.hex < 0 || op.moveDone || op.attachedThisTurn) return [];
  const st = statsOf(s, u);
  const hasLeader = !!attachedLeader(s, u);
  const opts = moveOptions(s, u, op);
  const max = Math.max(0, ...opts.map((o) => o.max));
  const battleAt = (d: number, h: HexId): boolean =>
    opts.some((o) => o.max >= d && o.battle) && (d === 0 || u.blocks >= st.battleAfterMoveMinBlocks) && !noBattleAfterEntering(s, h, st);
  const out: MoveTarget[] = [];
  const slot = new Map<HexId, number>();  // hex -> index in `out`
  const expanded = new Set<HexId>([u.hex]);  // hexes whose onward moves are queued (a hex is entered stopping or not by path)
  type Node = { hex: HexId; path: HexId[] };
  const queue: Node[] = [{ hex: u.hex, path: [u.hex] }];
  let exited = false;
  const exits = (n: Node) => {
    if (!exited && n.path.length - 1 + 1 <= max && exitAllowedFrom(s, u, n.hex)) {
      exited = true;
      out.push({ hex: OFF_BOARD, path: [...n.path, OFF_BOARD], stops: true, battle: false, attach: null });
    }
  };
  exits(queue[0]);
  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    if (n.path.length - 1 >= max) continue;
    for (const h of neighbours(n.hex)) {
      if (h === u.hex || !passableFor(s, h, st.arm) || unitAt(s, h)) continue;
      const l = leaderAt(s, h);
      let attach: string | null = null;
      if (l) {
        if (l.side !== u.side || hasLeader) continue;
        attach = l.id;
      }
      const path = [...n.path, h];
      const stops = attach !== null || stopsOnEntry(s, n.hex, h);
      const target: MoveTarget = { hex: h, path, stops, battle: battleAt(path.length - 1, h), attach };
      // One target per hex: the first (shortest) path; an equally short path that does not stop replaces a stopping one.
      const at = slot.get(h);
      if (at === undefined) { slot.set(h, out.length); out.push(target); }
      else if (out[at].stops && !stops && out[at].path.length === path.length) out[at] = target;
      if (!stops && !expanded.has(h)) {
        expanded.add(h);
        queue.push({ hex: h, path });
        exits({ hex: h, path });
      }
    }
  }
  return out;
}

/** The hexes an ordered lone or detached leader may move to: up to `LEADER_MOVE` hexes, through friendly pieces. */
export function leaderMoves(s: GameState, id: string): MoveTarget[] {
  const l = leaderById(s, id);
  const op = s.turn.ordered[id];
  if (!l || !op || l.hex < 0 || op.moveDone) return [];
  const host = unitAt(s, l.hex);
  if (host?.square) return [];  // R32
  const mv = s.turn.mods.move;
  const reachMax = op.cardMods && mv !== null && mv !== 'forceMarch' && mv.leader !== undefined ? mv.leader : LEADER_MOVE;
  const out: MoveTarget[] = [];
  const slot = new Map<HexId, number>();
  const expanded = new Set<HexId>([l.hex]);
  type Node = { hex: HexId; path: HexId[] };
  const queue: Node[] = [{ hex: l.hex, path: [l.hex] }];
  let exited = false;
  const exits = (path: HexId[]) => {
    if (!exited && path.length - 1 + 1 <= reachMax && exitAllowedFrom(s, l, path[path.length - 1])) {
      exited = true;
      out.push({ hex: OFF_BOARD, path: [...path, OFF_BOARD], stops: true, battle: false, attach: null });
    }
  };
  exits([l.hex]);
  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    if (n.path.length - 1 >= reachMax) continue;
    for (const h of neighbours(n.hex)) {
      if (h === l.hex || !passableFor(s, h, null)) continue;
      const v = unitAt(s, h);
      const o = leaderAt(s, h);
      if ((v && v.side !== l.side) || (o && o.side !== l.side)) continue;
      const path = [...n.path, h];
      const stopTerrain = stopsOnEntry(s, n.hex, h);
      if (!o) {
        const target: MoveTarget = { hex: h, path, stops: stopTerrain || !!v, battle: false, attach: v ? v.id : null };
        const at = slot.get(h);
        if (at === undefined) { slot.set(h, out.length); out.push(target); }
        else if (out[at].stops && !target.stops && out[at].path.length === path.length) out[at] = target;
      }
      if (!stopTerrain && !expanded.has(h)) {
        expanded.add(h);
        queue.push({ hex: h, path });
        exits(path);
      }
    }
  }
  return out;
}

/** Move a unit and its attached leader to `hex`; no event (callers emit `move`, `retreat`, `advance`, `shortSupply`). */
export function relocate(s: GameState, u: Unit, hex: HexId): void {
  const l = attachedLeader(s, u);
  u.hex = hex;
  if (l) l.hex = hex;
}

/** Piece `pieceId` makes move `target`, one of its options. */
export function applyMove(s: GameState, ctx: FlowCtx, pieceId: string, target: MoveTarget): void {
  const op = s.turn.ordered[pieceId];
  const left = target.path.length - 1;
  op.moved = left;
  op.moveDone = true;
  op.stopEntered = target.stops;
  ctx.emit({ t: 'move', id: pieceId, path: target.path });
  if (op.isLeader) {
    const l = leaderById(s, pieceId)!;
    if (target.hex === OFF_BOARD) {
      l.hex = target.path[target.path.length - 2];  // stand on the exit hex when exitPiece runs (T13 reads it)
      exitPiece(s, ctx, pieceId);
    } else {
      l.hex = target.hex;
      if (target.attach) {
        ctx.emit({ t: 'attach', leader: l.id, unit: target.attach });
        const uo = s.turn.ordered[target.attach];
        if (uo) uo.attachedThisTurn = true;
      }
    }
  } else {
    const u = unitById(s, pieceId)!;
    const ldr = attachedLeader(s, u);
    const lo = ldr ? s.turn.ordered[ldr.id] : undefined;
    if (lo) lo.moveDone = true;
    if (target.hex === OFF_BOARD) {
      relocate(s, u, target.path[target.path.length - 2]);  // stand on the exit hex when exitPiece runs (T13 reads it)
      exitPiece(s, ctx, pieceId);
    } else {
      relocate(s, u, target.hex);
      op.noBattle = noBattleAfterEntering(s, target.hex, statsOf(s, u));
      if (target.attach) {
        ctx.emit({ t: 'attach', leader: target.attach, unit: u.id });
        const lo2 = s.turn.ordered[target.attach];
        if (lo2) lo2.moveDone = true;
      }
    }
  }
  updateHeld(s, ctx);
}
