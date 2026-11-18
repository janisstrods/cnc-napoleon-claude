// Napoleonics vocabulary: nations, arms and unit codes. Imports nothing.
// `UnitKey` is the vocabulary (it can name a unit that has no row); UNIT_KEYS lists the rows of RR §2 (base game) and §15.1 (Expansion #1: lancers, Guard light cavalry, Swiss, the Spanish army).
export const NATIONS = ['FR', 'BR', 'PT', 'AL', 'SP'] as const;
export type Nation = (typeof NATIONS)[number];
export const ARMS = ['infantry', 'cavalry', 'artillery'] as const;
export type Arm = (typeof ARMS)[number];
export const UNIT_CODES = ['LN', 'LT', 'RI', 'GR', 'YG', 'OG', 'GG', 'ML', 'SWI', 'LC', 'LNC', 'HC', 'CU', 'GLC', 'GHC', 'FA', 'HA', 'GA'] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const ARM_OF: Readonly<Record<UnitCode, Arm>> = {
  LN: 'infantry', LT: 'infantry', RI: 'infantry', GR: 'infantry', YG: 'infantry', OG: 'infantry', GG: 'infantry', ML: 'infantry', SWI: 'infantry',
  LC: 'cavalry', LNC: 'cavalry', HC: 'cavalry', CU: 'cavalry', GLC: 'cavalry', GHC: 'cavalry',
  FA: 'artillery', HA: 'artillery', GA: 'artillery',
};

export const CODE_NAMES: Readonly<Record<UnitCode, string>> = {
  LN: 'Line Infantry', LT: 'Light Infantry', RI: 'Rifles', GR: 'Grenadiers', YG: 'Young Guard', OG: 'Old Guard', GG: 'Guard Grenadiers', ML: 'Militia', SWI: 'Swiss Infantry',
  LC: 'Light Cavalry', LNC: 'Lancers', HC: 'Heavy Cavalry', CU: 'Cuirassiers', GLC: 'Guard Light Cavalry', GHC: 'Guard Heavy Cavalry',
  FA: 'Foot Artillery', HA: 'Horse Artillery', GA: 'Guard Foot Artillery',
};

export const NATION_NAMES: Readonly<Record<Nation, string>> = {
  FR: 'French', BR: 'British', PT: 'Portuguese', AL: 'Allied', SP: 'Spanish',
};

export type UnitKey = `${Nation}/${UnitCode}`;

export function nationOf(k: UnitKey): Nation { return k.split('/')[0] as Nation; }
export function codeOf(k: UnitKey): UnitCode { return k.split('/')[1] as UnitCode; }
export function isUnitKey(s: string): s is UnitKey {
  const [n, c, ...rest] = s.split('/');
  return rest.length === 0 && (NATIONS as readonly string[]).includes(n) && (UNIT_CODES as readonly string[]).includes(c);
}

/** The unit rows of RR §2.2–§2.4 and, last, Expansion #1's rows (§15.1), in RR order. */
export const UNIT_KEYS = [
  'FR/LN', 'FR/LT', 'FR/GR', 'FR/YG', 'FR/OG', 'FR/ML', 'FR/LC', 'FR/HC', 'FR/CU', 'FR/GHC', 'FR/FA', 'FR/HA', 'FR/GA',
  'BR/LN', 'BR/LT', 'BR/RI', 'BR/GR', 'BR/GG', 'BR/LC', 'BR/HC', 'BR/GHC', 'BR/FA', 'BR/HA',
  'PT/LN', 'PT/LT', 'PT/ML', 'PT/LC', 'PT/HC', 'PT/FA',
  'AL/LN', 'AL/LT', 'AL/ML', 'AL/LC', 'AL/FA',
  'FR/LNC', 'FR/GLC', 'FR/SWI',
  'SP/LN', 'SP/LT', 'SP/GR', 'SP/ML', 'SP/SWI', 'SP/LC', 'SP/HC', 'SP/CU', 'SP/FA',
] as const satisfies readonly UnitKey[];
/** A UnitKey that has a UNIT_STATS row. */
export type RowKey = (typeof UNIT_KEYS)[number];
export function isRowKey(s: string): s is RowKey {
  return (UNIT_KEYS as readonly string[]).includes(s);
}
