// Per-battle rules data for the converter: the base battles (meta-base.ts); Plan 7 spreads EXP1_META in.
import type { BattleMeta } from './convert';
import { BASE_META } from './meta-base';

export const META: Readonly<Record<string, BattleMeta>> = { ...BASE_META };
