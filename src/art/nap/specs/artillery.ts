// Artillery specs. All stubs until Task 5: the crew's coat colour, a plain shako, a bronze gun.
import { CLOTH } from '../nations';
import type { ArtilleryKey } from '../keys';
import type { Dress, GunSpec } from '../uniform';

const PIECES = ['gun', 'rammer', 'linstock', 'ammo'] as const;

const dress = (coat: string): Dress => ({ coat, cut: 'jacket', facings: CLOTH.scarlet, trousers: CLOTH.trouserGrey, belts: CLOTH.white });
const stub = (coat: string, pieces: GunSpec['pieces'] = PIECES, guard?: true): GunSpec => ({
  drawing: 'gun', crew: { dress: dress(coat), head: { kind: 'shako' } }, carriage: CLOTH.dragoonGreen, barrel: 'bronze', pieces,
  ...(guard ? { guard } : {}), stub: true,
});

export const ARTILLERY_SPECS: Record<ArtilleryKey, GunSpec> = {
  'FR/FA': stub(CLOTH.frenchBlue),
  'FR/HA': stub(CLOTH.frenchBlue, ['gun', 'driver', 'rammer', 'ammo']),
  'FR/GA': stub(CLOTH.frenchBlue, PIECES, true),
  'BR/FA': stub(CLOTH.frenchBlue),
  'BR/HA': stub(CLOTH.frenchBlue, ['gun', 'driver', 'rammer', 'ammo']),
  'PT/FA': stub(CLOTH.portugueseBlue),
  'AL/FA': stub(CLOTH.dutchBlue),
};
