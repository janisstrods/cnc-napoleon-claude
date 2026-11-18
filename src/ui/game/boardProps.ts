// What a board shows of a game state, as the props of its art: the painted battlefield (`BoardArt`) and the unit and leader
// tokens. Shared by the battle board, the briefing's setup preview and the dev galleries.
import { nationOf, type GameState, type Leader, type Side, type Unit } from '../../engine';
import type { LeaderTokenProps, UnitTokenProps } from '../../art';
import type { BoardArtProps } from '../terrain';

/**
 * `BoardArt` props of a game state: its terrain and works, and on the frame the names of the armies drawn at the top and
 * bottom of the screen.
 */
export function boardArtProps(s: GameState, flipped: boolean): BoardArtProps {
  return {
    terrain: s.terrain,
    works: s.works,
    flipped,
    topLabel: s.players[flipped ? 'bottom' : 'top'].army,
    bottomLabel: s.players[flipped ? 'top' : 'bottom'].army,
  };
}

/** The human's pieces face right, the enemy's left. */
export function facingFor(side: Side, humanSide: Side): 'left' | 'right' {
  return side === humanSide ? 'right' : 'left';
}

/** `UnitToken` props of unit `u`: its own nation's colours (a unit of any nation may stand on either side), its strength. */
export function unitTokenProps(u: Unit, humanSide: Side): UnitTokenProps {
  return { unitKey: u.key, nation: nationOf(u.key), blocks: u.blocks, maxBlocks: u.maxBlocks, facing: facingFor(u.side, humanSide) };
}

/** `LeaderToken` props of leader `l` (name aside, which the caller gives), `attached` to a unit or alone. */
export function leaderTokenProps(s: GameState, l: Leader, attached: boolean, humanSide: Side): Omit<LeaderTokenProps, 'name'> {
  return { nation: s.players[l.side].nation, attached, facing: facingFor(l.side, humanSide) };
}
