// Validators of the dice-driven tactic cards and the Short Supply options (RR §12.2, R53–R55).
import { baselineRow, colOf, hexId, rowOf, sectionsOf } from './hex';
import { isLeaderId, isEmptyHex, leaderById, pieceById, unitById, unitsOf } from './query';
import { passableFor } from './terrain';
import { statsOf } from './units';
import { ROWS, type DieFace, type GameState, type HexId, type Side, type Unit } from './types';

const isArmFace = (f: DieFace): boolean => f === 'infantry' || f === 'cavalry' || f === 'artillery';

/** The unit with this id if it is `side`'s own and on the board. */
function ownUnit(s: GameState, side: Side, id: string): Unit | undefined {
  const u = unitById(s, id);
  return u && u.side === side && u.hex >= 0 ? u : undefined;
}

/** Why an Élan assignment is refused, or null: one entry per die, `null` always allowed (R53). */
export function validateElan(s: GameState, side: Side, faces: readonly DieFace[], ids: readonly (string | null)[]): string | null {
  if (ids.length !== faces.length) return 'Assign every die.';
  const seen = new Set<string>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    if (seen.has(id)) return 'Each piece takes one order.';
    seen.add(id);
    const face = faces[i];
    if (face === 'sabre') return 'A sabre orders nothing.';
    const p = pieceById(s, id);
    if (!p || p.side !== side || p.hex < 0) return 'Order only your own units and leaders.';
    if (face !== 'flag' && (isLeaderId(id) || statsOf(s, p as Unit).arm !== face)) return `That symbol orders only ${face} units.`;
  }
  // a leader attached to a unit in square detaches only together with that unit (R32)
  for (const id of seen) {
    if (!isLeaderId(id)) continue;
    const l = leaderById(s, id)!;
    const unit = s.units.find((u) => u.side === l.side && u.hex === l.hex);
    if (unit?.square !== undefined && !seen.has(unit.id)) return 'A leader cannot detach from a square.';
  }
  return null;
}

/** Why a Rally assignment is refused, or null: arm faces on own units of that arm, never above the starting blocks (R54). */
export function validateRally(s: GameState, side: Side, faces: readonly DieFace[], ids: readonly (string | null)[]): string | null {
  if (ids.length !== faces.length) return 'Assign every die.';
  const gain = new Map<string, number>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    if (!isArmFace(faces[i])) return 'Only an infantry, cavalry or artillery symbol rallies.';
    const u = ownUnit(s, side, id);
    if (!u) return 'Rally only your own units.';
    if (statsOf(s, u).arm !== faces[i]) return `That symbol rallies only ${faces[i]} units.`;
    gain.set(id, (gain.get(id) ?? 0) + 1);
  }
  for (const [id, n] of gain) {
    const u = unitById(s, id)!;
    if (u.blocks + n > u.maxBlocks) return `${u.key} cannot exceed its starting strength.`;
  }
  return null;
}

/** Does some arm face match an under-strength own unit of that arm? (Rally asks only then.) */
export function canRally(s: GameState, side: Side, faces: readonly DieFace[]): boolean {
  return unitsOf(s, side).some((u) => u.blocks < u.maxBlocks && faces.includes(statsOf(s, u).arm));
}

/** The units Short Supply may lift: any unit of either side not in square; never a lone leader (R55). */
export function shortSupplyTargets(s: GameState, _side: Side): string[] {
  return s.units.filter((u) => u.hex >= 0 && u.square === undefined).map((u) => u.id);
}

/** The hexes a Short Supply unit may be placed on: its own baseline in its section(s), else the row in front, else none; its own hex counts when it stands there (R55). */
export function shortSupplyHexes(s: GameState, unitId: string): HexId[] {
  const u = unitById(s, unitId);
  if (!u || u.hex < 0) return [];
  const arm = statsOf(s, u).arm;
  const secs = sectionsOf(u.hex, u.side);
  const base = baselineRow(u.side);
  const front = u.side === 'top' ? base + 1 : base - 1;
  for (const r of [base, front]) {
    if (r < 0 || r >= ROWS) continue;
    const out: HexId[] = [];
    for (let c = 0; c < 13; c++) {
      const h = hexId(r, c);
      if (rowOf(h) !== r || colOf(h) !== c) continue;
      if (sectionsOf(h, u.side).some((x) => secs.includes(x)) && (h === u.hex || isEmptyHex(s, h)) && passableFor(s, h, arm)) out.push(h);
    }
    if (out.length) return out;
  }
  return [];
}
