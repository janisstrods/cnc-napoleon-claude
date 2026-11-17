// Cavalry specs. All stubs until Task 3: the main coat colour, a plain helmet, the horse build.
import { CLOTH } from '../nations';
import type { CavalryKey } from '../keys';
import type { Dress, HorseSpec } from '../uniform';

const dress = (coat: string): Dress => ({ coat, cut: 'jacket', facings: CLOTH.scarlet, trousers: CLOTH.white, belts: CLOTH.white });
const stub = (coat: string, horse: HorseSpec['horse'], guard?: true): HorseSpec => ({
  drawing: 'horse', dress: dress(coat), head: { kind: 'dragoonHelmet' }, weapon: horse === 'heavy' ? 'sword' : 'sabre', horse,
  coats: ['bay', 'chestnut', 'brown', 'black'], shabraque: { cloth: coat, trim: CLOTH.yellow }, ...(guard ? { guard } : {}), stub: true,
});

export const CAVALRY_SPECS: Record<CavalryKey, HorseSpec> = {
  'FR/LC': stub(CLOTH.chasseurGreen, 'light'),
  'FR/LNC': { ...stub(CLOTH.frenchBlue, 'light'), weapon: 'lance' },
  'FR/HC': stub(CLOTH.dragoonGreen, 'heavy'),
  'FR/CU': stub(CLOTH.frenchBlue, 'heavy'),
  'FR/GHC': stub(CLOTH.frenchBlue, 'heavy', true),
  'BR/LC': stub(CLOTH.frenchBlue, 'light'),
  'BR/HC': stub(CLOTH.britishRed, 'heavy'),
  'BR/GHC': stub(CLOTH.britishRed, 'heavy', true),
  'PT/LC': stub(CLOTH.portugueseBlue, 'light'),
  'PT/HC': stub(CLOTH.portugueseBlue, 'heavy'),
  'AL/LC': stub(CLOTH.brunswickBlack, 'light'),
};
