// Battlefield / terrain art for Commands & Colours: Napoleonics (original procedural SVG).
import { TERRAIN_STATS } from '../../engine/terrain';
import type { TerrainType } from '../../engine/types';

export { BoardArt, boardArtPropsEqual } from './BoardArt';
export type { BoardArtProps } from './BoardArt';
export { ObjectiveMarkers } from './objectives';
export type { ObjectiveMarkersProps } from './objectives';
export { TerrainIcon } from './TerrainIcon';

/** Human-readable terrain name ("Hill", "Forest", "Fordable river", ...): the row's name in `TERRAIN_STATS`. */
export function terrainName(t: TerrainType): string {
  return TERRAIN_STATS[t].name;
}
