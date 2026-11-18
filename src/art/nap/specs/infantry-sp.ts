// The infantry of the Spanish war (Expansion #1): the Spanish army of 1808-1812 and the Swiss regiments in Spanish and in French
// service. Uniform choices come from written descriptions and general period knowledge; where sources differ the choice is
// hedged in a comment. The Spanish army re-dressed several times in these years (white coats in 1808, blue from 1810, and much
// improvised dress between), so each key wears the look the brief names. Every regular carries a musket and a pack; the
// militia carry no packs. A Swiss unit's base edge is its row's nation colour (SP/SWI the Spanish yellow, FR/SWI the French
// blue); its coat comes from history.
import { CLOTH } from '../nations';
import type { SpInfantryKey } from '../keys';
import type { Dress, FootSpec, Headwear } from '../uniform';

// Local swatches (CLOTH is not edited).
const VIOLET = '#5a3a7a'; // the royal regiments' facing (Rey, Reina, Príncipe)
const SP_BLUE = '#1e2a52'; // the Spanish dark blue of the light infantry, the Swiss and the gunners
const MILITIA_BROWN = '#6e4a2a'; // a brown civilian coat
const MILITIA_BREECHES = '#9a8a68'; // undyed cloth breeches
const BLACK_FELT = '#1b1a1a';

const foot = (dress: Dress, head: Headwear, poses: FootSpec['poses'], order: FootSpec['order'], pack = true): FootSpec => ({
  drawing: 'foot', dress, head, weapon: 'musket', poses, order, pack,
});

// The line's 1808 coat: white with lapels, collar and cuffs in the regimental colour. Facings varied by regiment; violet, the
// royal regiments' colour, is the choice here because it reads on white and is worn by no other unit in the game.
const SP_LINE: Dress = {
  coat: CLOTH.white, cut: 'tails', facings: VIOLET, lapels: VIOLET, trousers: CLOTH.white, gaiters: CLOTH.black, belts: CLOTH.white,
};

export const SP_INFANTRY_SPECS: Record<SpInfantryKey, FootSpec> = {
  // Line (the 1808 look): the white coat above, and a black bicorne worn athwart, edged with white tape, with the red cockade.
  'SP/LN': foot(
    SP_LINE,
    { kind: 'bicorne', body: BLACK_FELT, cords: CLOTH.white, pompoms: [CLOTH.scarlet] },
    ['shoulder', 'aim', 'shoulder', 'shoulder'], 'close',
  ),
  // Light infantry: a dark blue jacket with scarlet collar and cuffs, blue breeches, black belts and the round hat. Sources
  // differ: some battalions wore a crested leather helmet instead; the round hat is the brief's.
  'SP/LT': foot(
    { coat: SP_BLUE, cut: 'jacket', facings: CLOTH.scarlet, trousers: SP_BLUE, belts: CLOTH.black },
    { kind: 'roundHat', pompoms: [CLOTH.scarlet] },
    ['aim', 'port', 'kneelAim', 'aim'], 'loose',
  ),
  // Grenadiers: the line's white coat with red epaulettes and a tall fur cap with a brass front plate (the royal arms).
  'SP/GR': foot(
    { ...SP_LINE, shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet } },
    { kind: 'bearskinPlate', plate: 'brass', plume: { colour: CLOTH.scarlet, tall: true } },
    ['shoulder', 'shoulder', 'shoulder', 'shoulder'], 'close',
  ),
  // Militia and new levies: a brown civilian-style coat, undyed breeches, black belts, a round hat and no pack; the hat and the
  // missing pack are what the eye should catch.
  'SP/ML': foot(
    { coat: MILITIA_BROWN, cut: 'tails', facings: MILITIA_BROWN, trousers: MILITIA_BREECHES, belts: CLOTH.black },
    { kind: 'roundHat', pompoms: [CLOTH.scarlet] },
    ['port', 'shoulder', 'port', 'shoulder'], 'close', false,
  ),
  // Swiss in Spanish service (Reding, Wimpffen and the rest): dark blue coat with scarlet lapels and facings, white breeches,
  // shako with a brass plate and white cords. Regiments differed in their facings; scarlet was the commonest.
  'SP/SWI': foot(
    { coat: SP_BLUE, cut: 'tails', facings: CLOTH.scarlet, lapels: CLOTH.scarlet, trousers: CLOTH.white, gaiters: CLOTH.black, belts: CLOTH.white },
    { kind: 'shako', plate: 'brass', cords: CLOTH.white, pompoms: [CLOTH.white] },
    ['shoulder', 'shoulder', 'aim', 'shoulder'], 'close',
  ),
  // Swiss in French service: the red coat of the Swiss regiments, with yellow lapels and facings (the 1st Regiment's; the 2nd
  // to 4th wore blue, black and sky blue), white breeches, red shoulder straps piped yellow and a shako with a white plume.
  'FR/SWI': foot(
    {
      coat: CLOTH.britishRed, cut: 'tails', facings: CLOTH.yellow, lapels: CLOTH.yellow, trousers: CLOTH.white, gaiters: CLOTH.black,
      belts: CLOTH.white, shoulders: { kind: 'straps', colour: CLOTH.britishRed },
    },
    { kind: 'shako', plate: 'brass', plume: { colour: CLOTH.white } },
    ['shoulder', 'aim', 'shoulder', 'aim'], 'close',
  ),
};
