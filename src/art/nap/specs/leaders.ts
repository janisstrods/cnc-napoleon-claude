// Leader specs, one per art nation. Stubs until Task 6.
import { CLOTH } from '../nations';
import type { ArtNation } from '../keys';
import type { Dress, LeaderSpec } from '../uniform';

const dress = (coat: string): Dress => ({ coat, cut: 'tails', facings: CLOTH.scarlet, trousers: CLOTH.white, belts: CLOTH.white });

export const LEADER_SPECS: Record<ArtNation, LeaderSpec> = {
  FR: { dress: dress(CLOTH.frenchBlue), head: { kind: 'bicorne' }, horse: 'grey', flag: { kind: 'vertical', colours: [CLOTH.frenchBlue, CLOTH.white, CLOTH.scarlet] }, stub: true },
  BR: { dress: dress(CLOTH.britishRed), head: { kind: 'bicorne' }, horse: 'bay', flag: { kind: 'union', colours: [CLOTH.britishRed, CLOTH.white, CLOTH.frenchBlue] }, stub: true },
  PT: { dress: dress(CLOTH.portugueseBlue), head: { kind: 'bicorne' }, horse: 'bay', flag: { kind: 'horizontal', colours: [CLOTH.white, CLOTH.portugueseBlue] }, stub: true },
  AL: { dress: dress(CLOTH.dutchBlue), head: { kind: 'bicorne' }, horse: 'brown', flag: { kind: 'horizontal', colours: [CLOTH.scarlet, CLOTH.white, CLOTH.dutchBlue] }, stub: true },
};
