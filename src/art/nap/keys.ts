// The unit keys the miniature art draws: survey §2.1 (without LDR) plus the French lancers, which the spec names and the
// Vistula lancers are expected to need in Expansion #1. This file and nations.ts and specs/ are the only places that name
// nations and unit codes; drawing code works from the data they hold.
import type { UnitKey } from '../../engine/codes';

export const ART_NATIONS = ['FR', 'BR', 'PT', 'AL'] as const; // SP: Plan 7
export type ArtNation = (typeof ART_NATIONS)[number];

export const FR_INFANTRY = ['FR/LN', 'FR/LT', 'FR/GR', 'FR/YG', 'FR/OG', 'FR/ML'] as const satisfies readonly UnitKey[];
export const ALLIED_INFANTRY = [
  'BR/LN', 'BR/LT', 'BR/RI', 'BR/GR', 'BR/GG', 'PT/LN', 'PT/LT', 'PT/ML', 'AL/LN', 'AL/LT', 'AL/ML',
] as const satisfies readonly UnitKey[];
export const CAVALRY = [
  'FR/LC', 'FR/LNC', 'FR/HC', 'FR/CU', 'FR/GHC', 'BR/LC', 'BR/HC', 'BR/GHC', 'PT/LC', 'PT/HC', 'AL/LC',
] as const satisfies readonly UnitKey[];
export const ARTILLERY = ['FR/FA', 'FR/HA', 'FR/GA', 'BR/FA', 'BR/HA', 'PT/FA', 'AL/FA'] as const satisfies readonly UnitKey[];

export type FrInfantryKey = (typeof FR_INFANTRY)[number];
export type AlliedInfantryKey = (typeof ALLIED_INFANTRY)[number];
export type CavalryKey = (typeof CAVALRY)[number];
export type ArtilleryKey = (typeof ARTILLERY)[number];
export type ArtKey = FrInfantryKey | AlliedInfantryKey | CavalryKey | ArtilleryKey;

export const ART_KEYS: readonly ArtKey[] = [...FR_INFANTRY, ...ALLIED_INFANTRY, ...CAVALRY, ...ARTILLERY];

const KEY_SET: ReadonlySet<string> = new Set(ART_KEYS);
export function isArtKey(k: string): k is ArtKey {
  return KEY_SET.has(k);
}

export function artNationOf(k: ArtKey): ArtNation {
  return k.slice(0, 2) as ArtNation;
}
