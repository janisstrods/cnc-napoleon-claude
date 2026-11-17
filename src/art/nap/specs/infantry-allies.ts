// British, Portuguese and Allied infantry specs. All stubs until Task 2: the main coat colour, a plain shako, the formation.
import { CLOTH } from '../nations';
import type { AlliedInfantryKey } from '../keys';
import type { Dress, FootSpec } from '../uniform';

const POSES = ['shoulder', 'shoulder', 'port', 'shoulder'] as const;

const dress = (coat: string): Dress => ({ coat, cut: 'tails', facings: CLOTH.yellow, trousers: CLOTH.trouserGrey, belts: CLOTH.white });
const stub = (coat: string, order: FootSpec['order'], guard?: true): FootSpec => ({
  drawing: 'foot', dress: dress(coat), head: { kind: 'shako' }, weapon: 'musket', poses: POSES, order, pack: true, ...(guard ? { guard } : {}), stub: true,
});

export const ALLIED_INFANTRY_SPECS: Record<AlliedInfantryKey, FootSpec> = {
  'BR/LN': stub(CLOTH.britishRed, 'close'),
  'BR/LT': stub(CLOTH.rifleGreen, 'loose'),
  'BR/RI': { ...stub(CLOTH.rifleGreen, 'loose'), weapon: 'rifle' },
  'BR/GR': stub(CLOTH.britishRed, 'close'),
  'BR/GG': stub(CLOTH.britishRed, 'close', true),
  'PT/LN': stub(CLOTH.portugueseBlue, 'close'),
  'PT/LT': stub(CLOTH.cacadorBrown, 'loose'),
  'PT/ML': stub(CLOTH.greatcoatGrey, 'loose'),
  'AL/LN': stub(CLOTH.dutchBlue, 'close'),
  'AL/LT': stub(CLOTH.nassauGreen, 'loose'),
  'AL/ML': stub(CLOTH.brunswickBlack, 'loose'),
};
