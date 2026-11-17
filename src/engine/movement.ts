// Movement (RR §6.2, §7). Skeleton: the unit's own allowance only; no entering units or enemy leaders; terrain via
// `passableFor` / `stopsOnEntry`; exits through `exitAllowedFrom` (→ T5 completes the card allowances).
import { neighbours } from './hex';
import { exitAllowedFrom, exitPiece, updateHeld } from './objectives';
import { attachedLeader, leaderAt, leaderById, unitAt, unitById } from './query';
import { noBattleAfterEntering, passableFor, stopsOnEntry } from './terrain';
import { LEADER_MOVE, statsOf } from './units';
import { OFF_BOARD, type FlowCtx, type GameState, type HexId, type MoveOption, type OrderedPiece, type Unit } from './types';

export interface MoveTarget { hex: HexId; path: HexId[]; stops: boolean; battle: boolean; attach: string | null }

/** The allowances of an ordered unit this turn. Skeleton: its own row. */
export function moveOptions(s: GameState, u: Unit, _op: OrderedPiece): readonly MoveOption[] {
  return statsOf(s, u).move;
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
  const max = Math.max(0, ...moveOptions(s, u, op).map((o) => o.max));
  const hasLeader = !!attachedLeader(s, u);
  const battleAt = (d: number, h: HexId): boolean =>
    moveOptions(s, u, op).some((o) => o.max >= d && o.battle) && (d === 0 || u.blocks >= st.battleAfterMoveMinBlocks) && !noBattleAfterEntering(s, h, st);
  const out: MoveTarget[] = [];
  const seen = new Set<HexId>([u.hex]);
  type Node = { hex: HexId; path: HexId[] };
  const queue: Node[] = [{ hex: u.hex, path: [u.hex] }];
  const exits = (n: Node, stopped: boolean) => {
    if (!stopped && n.path.length - 1 + 1 <= max && exitAllowedFrom(s, u, n.hex)) {
      out.push({ hex: OFF_BOARD, path: [...n.path, OFF_BOARD], stops: true, battle: false, attach: null });
    }
  };
  exits(queue[0], false);
  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    if (n.path.length - 1 >= max) continue;
    for (const h of neighbours(n.hex)) {
      if (seen.has(h) || !passableFor(s, h, st.arm) || unitAt(s, h)) continue;
      const l = leaderAt(s, h);
      let attach: string | null = null;
      if (l) {
        if (l.side !== u.side || hasLeader) continue;
        attach = l.id;
      }
      seen.add(h);
      const path = [...n.path, h];
      const stops = attach !== null || stopsOnEntry(s, n.hex, h);
      out.push({ hex: h, path, stops, battle: battleAt(path.length - 1, h), attach });
      if (!stops) {
        queue.push({ hex: h, path });
        exits({ hex: h, path }, false);
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
  const out: MoveTarget[] = [];
  const seen = new Set<HexId>([l.hex]);
  type Node = { hex: HexId; path: HexId[] };
  const queue: Node[] = [{ hex: l.hex, path: [l.hex] }];
  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    if (n.path.length - 1 >= LEADER_MOVE) continue;
    for (const h of neighbours(n.hex)) {
      if (seen.has(h) || !passableFor(s, h, null)) continue;
      const v = unitAt(s, h);
      const o = leaderAt(s, h);
      if ((v && v.side !== l.side) || (o && o.side !== l.side)) continue;
      seen.add(h);
      const path = [...n.path, h];
      const stops = stopsOnEntry(s, n.hex, h) || (!!v && !o);
      if (!o) out.push({ hex: h, path, stops: stops || !!v, battle: false, attach: v ? v.id : null });
      if (!stopsOnEntry(s, n.hex, h)) {
        queue.push({ hex: h, path });
        if (!o && !v && path.length - 1 + 1 <= LEADER_MOVE && exitAllowedFrom(s, l, h)) {
          out.push({ hex: OFF_BOARD, path: [...path, OFF_BOARD], stops: true, battle: false, attach: null });
        }
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
    if (target.hex === OFF_BOARD) exitPiece(s, ctx, pieceId);
    else {
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
    if (target.hex === OFF_BOARD) exitPiece(s, ctx, pieceId);
    else {
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
