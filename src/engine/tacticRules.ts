// Validators of the dice-driven tactic cards (RR §12.2). Stubs until T12b.
import type { DieFace, GameState, HexId, Side } from './types';

/** Why an Élan assignment is refused, or null. Stub: always refused (→ T12b). */
export function validateElan(_s: GameState, _side: Side, _faces: readonly DieFace[], _ids: readonly (string | null)[]): string | null {
  return 'Not available.';
}

/** Why a Rally assignment is refused, or null. Stub: always refused (→ T12b). */
export function validateRally(_s: GameState, _side: Side, _faces: readonly DieFace[], _ids: readonly (string | null)[]): string | null {
  return 'Not available.';
}

/** The units Short Supply may lift. Stub: none (→ T12b). */
export function shortSupplyTargets(_s: GameState, _side: Side): string[] {
  return [];
}

/** The hexes a Short Supply unit may be placed on. Stub: none (→ T12b). */
export function shortSupplyHexes(_s: GameState, _unitId: string): HexId[] {
  return [];
}
