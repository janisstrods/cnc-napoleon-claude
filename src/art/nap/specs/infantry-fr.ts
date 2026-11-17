// French infantry specs. All stubs until Task 2: the main coat colour, a plain shako, the formation.
import { CLOTH } from '../nations';
import type { FrInfantryKey } from '../keys';
import type { Dress, FootSpec } from '../uniform';

const POSES = ['shoulder', 'shoulder', 'port', 'shoulder'] as const;

const dress = (coat: string): Dress => ({ coat, cut: 'tails', facings: CLOTH.scarlet, trousers: CLOTH.white, belts: CLOTH.white });
const stub = (coat: string, order: FootSpec['order'], guard?: true): FootSpec => ({
  drawing: 'foot', dress: dress(coat), head: { kind: 'shako' }, weapon: 'musket', poses: POSES, order, pack: true, ...(guard ? { guard } : {}), stub: true,
});

export const FR_INFANTRY_SPECS: Record<FrInfantryKey, FootSpec> = {
  'FR/LN': stub(CLOTH.frenchBlue, 'close'),
  'FR/LT': stub(CLOTH.frenchBlue, 'loose'),
  'FR/GR': stub(CLOTH.frenchBlue, 'close'),
  'FR/YG': stub(CLOTH.frenchBlue, 'close', true),
  'FR/OG': stub(CLOTH.frenchBlue, 'close', true),
  'FR/ML': stub(CLOTH.greatcoatGrey, 'loose'),
};
