// Unit and leader descriptions, generated from the unit table: the lines of the hover tooltip and the unit cards of the
// rules reference.
import { CODE_NAMES, UNIT_STATS, codeOf, leaderUnit, type GameState, type Leader, type RowKey, type Unit, type UnitStats } from '../../engine';

/** Capitalise the first letter. */
function cap(x: string): string {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/** "Move 1, or 2 without battle" (a unit that may also move further and not battle), or the options listed. */
function moveText(st: UnitStats): string {
  const opts = [...st.move].sort((a, b) => a.max - b.max);
  if (opts.length === 1) return opts[0].max === 0 ? 'cannot move' : `${opts[0].max}${opts[0].battle ? '' : ' (no battle after moving)'}`;
  return opts.map((o) => (o.battle ? `${o.max}` : `${o.max} without battle`)).join(', or ');
}

/** The melee line: dice added to the blocks, more against infantry, none for a gun that melees as artillery. */
function meleeText(st: UnitStats): string {
  if (st.melee.kind === 'artillery') return 'Melee: as artillery, by its blocks and the range';
  const plus = st.melee.plus ? ` ${st.melee.plus > 0 ? '+' : '−'}${Math.abs(st.melee.plus)}` : '';
  const vs = st.melee.vsInfantry ? `, ${st.melee.vsInfantry > 0 ? '+' : '−'}${Math.abs(st.melee.vsInfantry)} against infantry` : '';
  return `Melee: its blocks${plus}${vs}${st.sabreHits ? '' : ', sabres do not hit'}`;
}

/** The fire line: range and dice, or nothing for a unit that does not fire. */
function fireText(st: UnitStats): string | null {
  const f = st.fire;
  if (f.kind === 'none') return null;
  if (f.kind === 'musket') {
    const standing = f.standing ? ` +${f.standing}` : '';
    const moving = f.moving ? ` ${f.moving > 0 ? '+' : '−'}${Math.abs(f.moving)}` : '';
    return `Fire: range ${f.range}, its blocks${standing} standing; half its blocks (${f.round === 'up' ? 'rounded up' : 'rounded down'})${moving} after moving`;
  }
  return `Fire: range ${f.range}, by its blocks and the distance${f.moved ? '' : ' (not after moving)'}`;
}

/** Retreat and flag lines: how far, and the flags the unit ignores. */
function retreatText(st: UnitStats): string {
  const r = st.retreat.first === st.retreat.then ? `${st.retreat.first}` : `${st.retreat.first}, then ${st.retreat.then}`;
  return `Retreat ${r} hex${st.retreat.first === 1 && st.retreat.then === 1 ? '' : 'es'} per flag${st.flagIgnore ? ` · ignores ${st.flagIgnore} flag${st.flagIgnore === 1 ? '' : 's'}` : ''}`;
}

/** "After moving: fire half its blocks, rounded down, less 1; melee 1 die less." (only a row that is worse after moving; null otherwise). */
function movingText(st: UnitStats): string | null {
  const parts: string[] = [];
  if (st.fire.kind === 'musket' && st.fire.moving < 0) parts.push(`fire half its blocks, rounded ${st.fire.round === 'up' ? 'up' : 'down'}, less ${-st.fire.moving}`);
  if (st.melee.kind === 'blocks' && st.melee.movedPlus < 0) parts.push(`melee ${-st.melee.movedPlus} ${st.melee.movedPlus === -1 ? 'die' : 'dice'} less`);
  return parts.length ? `After moving: ${parts.join('; ')}.` : null;
}

/** Stats lines for tooltips: blocks, move options, melee and fire rules, retreat, flags ignored, sabres. */
export function unitSummary(u: Unit): string[] {
  const st = UNIT_STATS[u.key];
  const lines = [`Move ${moveText(st)} · ${retreatText(st)}`, meleeText(st)];
  const fire = fireText(st);
  if (fire) lines.push(fire);
  const moving = movingText(st);
  if (moving) lines.push(moving);
  if (st.expansion === 'exp1' && st.retreat.first > 1) lines.push(`Retreats ${st.retreat.first} hexes per flag.`);
  if (st.rerollsFlags) lines.push('Re-rolls flags once when it attacks (not against cuirassiers).');
  if (st.immuneToFlagReroll) lines.push('Lancers do not re-roll flags against it.');
  if (st.tags.length) lines.push(cap(st.tags.map((t) => (t === 'horseArtillery' ? 'horse artillery' : t)).join(' · ')));
  if (st.ignoresInfantryFireHits) lines.push(`Ignores ${st.ignoresInfantryFireHits} hit${st.ignoresInfantryFireHits === 1 ? '' : 's'} from infantry fire`);
  return lines;
}

/** Tooltip lines for a leader: what he does with a unit, or alone on the board. */
export function leaderLines(s: GameState, l: Leader): string[] {
  return leaderUnit(s, l)
    ? ['Attached: the unit may ignore 1 flag; +1 die only with Leadership.']
    : ['Alone: cannot be fired at; a melee against him needs a sabre.'];
}

/** Rules-reference card of a unit row: [stats line, notes line]. */
export function unitCardLines(key: RowKey): [string, string] {
  const st = UNIT_STATS[key];
  const stats = `${st.blocks} blocks · move ${moveText(st)} · ${retreatText(st)}`;
  const notes = [meleeText(st), fireText(st)].filter((x): x is string => !!x);
  return [stats, `${notes.join('. ')}.`];
}

/** The unit's name as the tables give it ("Line Infantry"). */
export function unitName(key: RowKey): string {
  return CODE_NAMES[codeOf(key)];
}
