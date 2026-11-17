// French infantry. Uniform choices come from written descriptions and general period knowledge; where sources differ the
// choice is hedged in a comment. Every man carries a musket and bayonet and a calfskin pack with a rolled greatcoat.
import { CLOTH } from '../nations';
import type { FrInfantryKey } from '../keys';
import type { Dress, FootSpec, Headwear } from '../uniform';

// Local swatches (not in CLOTH): the company pompom colours of the line, the light infantry's bright green.
const POMPOM_GREEN = '#3c8f3a';
const POMPOM_VIOLET = '#7a3f9a';
const LIGHT_GREEN = '#3f8f3c';

const tails = (d: Partial<Dress> & Pick<Dress, 'facings' | 'trousers'>): Dress => ({ coat: CLOTH.frenchBlue, cut: 'tails', belts: CLOTH.white, ...d });
const foot = (dress: Dress, head: Headwear, poses: FootSpec['poses'], order: FootSpec['order'], guard?: true): FootSpec => ({
  drawing: 'foot', dress, head, weapon: 'musket', poses, order, pack: true, ...(guard ? { guard } : {}),
});

export const FR_INFANTRY_SPECS: Record<FrInfantryKey, FootSpec> = {
  // Line: white lapels, scarlet facings, white breeches; red-piped blue shoulder straps (the facing colour is the piping);
  // the pompom shows the company (green, sky, orange, violet), cycled by figure.
  'FR/LN': foot(
    tails({ facings: CLOTH.scarlet, lapels: CLOTH.white, trousers: CLOTH.white, gaiters: CLOTH.black, shoulders: { kind: 'straps', colour: CLOTH.frenchBlue } }),
    { kind: 'shako', plate: 'brass', pompoms: [POMPOM_GREEN, CLOTH.sky, CLOTH.orange, POMPOM_VIOLET] },
    ['shoulder', 'shoulder', 'charge', 'shoulder'], 'close',
  ),
  // Light infantry: all blue, blue lapels piped white, green epaulettes, tall green plume tipped yellow, white cords.
  'FR/LT': foot(
    tails({ facings: CLOTH.frenchBlue, lapels: CLOTH.frenchBlue, lace: CLOTH.white, trousers: CLOTH.frenchBlue, gaiters: CLOTH.black, shoulders: { kind: 'epaulettes', colour: LIGHT_GREEN } }),
    { kind: 'shako', plate: 'brass', cords: CLOTH.white, plume: { colour: LIGHT_GREEN, tip: CLOTH.yellow, tall: true } },
    ['aim', 'port', 'aim', 'port'], 'loose',
  ),
  // Converged line grenadiers in bearskins. Some had gone to the shako by 1808; the bearskin is kept because it reads at
  // board scale. No plate on this one: the plate marks the Old Guard.
  'FR/GR': foot(
    tails({ facings: CLOTH.scarlet, lapels: CLOTH.white, trousers: CLOTH.white, gaiters: CLOTH.black, shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet } }),
    { kind: 'bearskin', plate: 'none', cords: CLOTH.scarlet, plume: { colour: CLOTH.scarlet, tall: true } },
    ['shoulder', 'shoulder', 'shoulder', 'shoulder'], 'close',
  ),
  // Young Guard: shako with scarlet cords and a tall scarlet plume. Sources differ on lapel length and gaiter colour; short
  // lapels are not drawn separately at this scale and the gaiters are black.
  'FR/YG': foot(
    tails({ facings: CLOTH.scarlet, lapels: CLOTH.white, trousers: CLOTH.white, gaiters: CLOTH.black, shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet } }),
    { kind: 'shako', plate: 'brass', cords: CLOTH.scarlet, plume: { colour: CLOTH.scarlet, tall: true } },
    ['shoulder', 'charge', 'shoulder', 'charge'], 'close', true,
  ),
  // Old Guard grenadiers: bearskin with the brass plate, scarlet plume, white cords; white breeches and white gaiters.
  'FR/OG': foot(
    tails({ facings: CLOTH.scarlet, lapels: CLOTH.white, trousers: CLOTH.white, gaiters: CLOTH.white, shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet } }),
    { kind: 'bearskinPlate', plate: 'brass', cords: CLOTH.white, plume: { colour: CLOTH.scarlet, tall: true } },
    ['shoulder', 'shoulder', 'shoulder', 'shoulder'], 'close', true,
  ),
  // The National Guard of 1814 (Aire): a grey greatcoat over mixed civilian kit, blue facings, oilcloth-covered shako.
  'FR/ML': foot(
    { coat: CLOTH.greatcoatGrey, cut: 'greatcoat', facings: CLOTH.frenchBlue, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'coveredShako', pompoms: [CLOTH.white] },
    ['port', 'shoulder', 'port', 'shoulder'], 'close',
  ),
};
