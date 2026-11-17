// Every figure's spec, by key, and the leaders' by nation.
import type { ArtKey } from '../keys';
import type { FigureSpec } from '../uniform';
import { ARTILLERY_SPECS } from './artillery';
import { CAVALRY_SPECS } from './cavalry';
import { ALLIED_INFANTRY_SPECS } from './infantry-allies';
import { FR_INFANTRY_SPECS } from './infantry-fr';

export { ALLIED_INFANTRY_SPECS, ARTILLERY_SPECS, CAVALRY_SPECS, FR_INFANTRY_SPECS };
export { LEADER_SPECS } from './leaders';

export const FIGURE_SPECS: Record<ArtKey, FigureSpec> = { ...FR_INFANTRY_SPECS, ...ALLIED_INFANTRY_SPECS, ...CAVALRY_SPECS, ...ARTILLERY_SPECS };
