// Napoleonics vocabulary: nations, arms and unit codes. Imports nothing.
// UNIT_KEYS (the rows that actually exist) is added in Plan 2B from RR §2; until then `UnitKey` is the vocabulary.
export const NATIONS = ['FR', 'BR', 'PT', 'AL', 'SP'] as const;
export type Nation = (typeof NATIONS)[number];
export const ARMS = ['infantry', 'cavalry', 'artillery'] as const;
export type Arm = (typeof ARMS)[number];
export const UNIT_CODES = ['LN', 'LT', 'RI', 'GR', 'YG', 'OG', 'GG', 'ML', 'LC', 'LNC', 'HC', 'CU', 'GLC', 'GHC', 'FA', 'HA', 'GA'] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const ARM_OF: Readonly<Record<UnitCode, Arm>> = {
  LN: 'infantry', LT: 'infantry', RI: 'infantry', GR: 'infantry', YG: 'infantry', OG: 'infantry', GG: 'infantry', ML: 'infantry',
  LC: 'cavalry', LNC: 'cavalry', HC: 'cavalry', CU: 'cavalry', GLC: 'cavalry', GHC: 'cavalry',
  FA: 'artillery', HA: 'artillery', GA: 'artillery',
};

export const CODE_NAMES: Readonly<Record<UnitCode, string>> = {
  LN: 'Line Infantry', LT: 'Light Infantry', RI: 'Rifles', GR: 'Grenadiers', YG: 'Young Guard', OG: 'Old Guard', GG: 'Guard Grenadiers', ML: 'Militia',
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
