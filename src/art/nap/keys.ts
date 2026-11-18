// The unit keys the miniature art draws: survey §2.1 (without LDR), the French lancers, and the rows Expansion #1 brings (the
// Spanish army, the Swiss in French and Spanish service, the Guard light cavalry). This file and nations.ts and specs/ are the only places that name
// nations and unit codes; drawing code works from the data they hold.
import type { UnitKey } from '../../engine/codes';

export const ART_NATIONS = ['FR', 'BR', 'PT', 'AL', 'SP'] as const;
export type ArtNation = (typeof ART_NATIONS)[number];

export const FR_INFANTRY = ['FR/LN', 'FR/LT', 'FR/GR', 'FR/YG', 'FR/OG', 'FR/ML'] as const satisfies readonly UnitKey[];
export const ALLIED_INFANTRY = [
  'BR/LN', 'BR/LT', 'BR/RI', 'BR/GR', 'BR/GG', 'PT/LN', 'PT/LT', 'PT/ML', 'AL/LN', 'AL/LT', 'AL/ML',
] as const satisfies readonly UnitKey[];
/** The infantry of the Spanish war (Expansion #1): the Spanish army and the Swiss in Spanish and in French service. */
export const SP_INFANTRY = ['SP/LN', 'SP/LT', 'SP/GR', 'SP/ML', 'SP/SWI', 'FR/SWI'] as const satisfies readonly UnitKey[];
export const CAVALRY = [
  'FR/LC', 'FR/LNC', 'FR/HC', 'FR/CU', 'FR/GHC', 'FR/GLC', 'BR/LC', 'BR/HC', 'BR/GHC', 'PT/LC', 'PT/HC', 'AL/LC', 'SP/LC', 'SP/HC', 'SP/CU',
] as const satisfies readonly UnitKey[];
export const ARTILLERY = ['FR/FA', 'FR/HA', 'FR/GA', 'BR/FA', 'BR/HA', 'PT/FA', 'AL/FA', 'SP/FA'] as const satisfies readonly UnitKey[];

export type FrInfantryKey = (typeof FR_INFANTRY)[number];
export type AlliedInfantryKey = (typeof ALLIED_INFANTRY)[number];
export type SpInfantryKey = (typeof SP_INFANTRY)[number];
export type CavalryKey = (typeof CAVALRY)[number];
export type ArtilleryKey = (typeof ARTILLERY)[number];
export type ArtKey = FrInfantryKey | AlliedInfantryKey | SpInfantryKey | CavalryKey | ArtilleryKey;

export const ART_KEYS: readonly ArtKey[] = [...FR_INFANTRY, ...ALLIED_INFANTRY, ...SP_INFANTRY, ...CAVALRY, ...ARTILLERY];

const KEY_SET: ReadonlySet<string> = new Set(ART_KEYS);
export function isArtKey(k: string): k is ArtKey {
  return KEY_SET.has(k);
}

export function artNationOf(k: ArtKey): ArtNation {
  return k.slice(0, 2) as ArtNation;
}
