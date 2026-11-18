// Per-battle rules data for the converter: the base battles (meta-base.ts) and the Spanish battles 101–118 (meta-exp1.ts).
import type { BattleMeta } from './convert';
import { BASE_META } from './meta-base';
import { EXP1_META } from './meta-exp1';

export const META: Readonly<Record<string, BattleMeta>> = { ...BASE_META, ...EXP1_META };
