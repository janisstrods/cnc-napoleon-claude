// British, Portuguese and Allied infantry. Uniform choices come from written descriptions and general period knowledge; where
// sources differ the choice is hedged in a comment. Every man carries a musket (the rifles, a rifle) and a calfskin pack.
// AL is the Dutch-Belgian line (blue, orange pompom), the Nassau light troops (green; Papelotte at Waterloo) and the Dutch
// National Militia (greatcoats). The Brunswick black is AL/LC in the cavalry specs.
import { CLOTH } from '../nations';
import type { AlliedInfantryKey } from '../keys';
import type { Dress, FootSpec, Headwear } from '../uniform';

// Local swatches (not in CLOTH): the light-company and rifle green tuft; the militia's dark blue-grey greatcoat; the Portuguese
// militia's brown civilian trousers; the Foot Guards' dark blue facings; the stovepipe's black felt for the rifles.
const GREEN = '#3f8f3c';
const MILITIA_COAT = '#3d4658';
const CIVILIAN_BROWN = '#6e5a40';
const GUARD_BLUE = '#1f2f5e';
const RIFLE_BLACK = '#16181a';

const foot = (dress: Dress, head: Headwear, poses: FootSpec['poses'], order: FootSpec['order'], guard?: true, weapon: FootSpec['weapon'] = 'musket'): FootSpec => ({
  drawing: 'foot', dress, head, weapon, poses, order, pack: true, ...(guard ? { guard } : {}),
});

export const ALLIED_INFANTRY_SPECS: Record<AlliedInfantryKey, FootSpec> = {
  // British line: red coat with yellow collar and cuffs (facing colours varied by regiment; yellow is the common, readable
  // choice), white lace, grey trousers (breeches and gaiters gave way to grey trousers in the Peninsula), white cross belts.
  // The 1800 stovepipe with a brass plate and a white-over-red tuft (the battalion companies' tuft).
  'BR/LN': foot(
    { coat: CLOTH.britishRed, cut: 'tails', facings: CLOTH.yellow, lace: CLOTH.white, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'stovepipe', plate: 'brass', plume: { colour: CLOTH.scarlet, tip: CLOTH.white } },
    ['shoulder', 'aim', 'shoulder', 'aim'], 'close',
  ),
  // Light infantry: a short jacket, white-laced red wings, grey trousers; the bugle-horn badge and a green tuft.
  'BR/LT': foot(
    { coat: CLOTH.britishRed, cut: 'jacket', facings: CLOTH.britishRed, lace: CLOTH.white, shoulders: { kind: 'wings', colour: CLOTH.britishRed }, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'stovepipe', plate: 'white', plume: { colour: GREEN } },
    ['aim', 'port', 'aim', 'port'], 'loose',
  ),
  // The Rifles: a dark green jacket with black collar and cuffs, green trousers, black belts, a black stovepipe with no plate
  // and a green tuft. Kneeling aims are what set them apart from the red line at board scale.
  'BR/RI': foot(
    { coat: CLOTH.rifleGreen, cut: 'jacket', facings: CLOTH.black, trousers: CLOTH.rifleGreen, belts: CLOTH.black },
    { kind: 'stovepipe', body: RIFLE_BLACK, plate: 'none', plume: { colour: GREEN } },
    ['kneelAim', 'aim', 'kneelAim', 'port'], 'loose', undefined, 'rifle',
  ),
  // Grenadier companies: red wings laced white, a brass grenade plate and a tall white plume.
  'BR/GR': foot(
    { coat: CLOTH.britishRed, cut: 'tails', facings: CLOTH.yellow, lace: CLOTH.white, shoulders: { kind: 'wings', colour: CLOTH.britishRed }, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'stovepipe', plate: 'brass', plume: { colour: CLOTH.white, tall: true } },
    ['shoulder', 'shoulder', 'shoulder', 'shoulder'], 'close',
  ),
  // Foot Guards: dark blue facings, white lace, a white plume; they charge in the Hougoumont and Waterloo attacks.
  'BR/GG': foot(
    { coat: CLOTH.britishRed, cut: 'tails', facings: GUARD_BLUE, lace: CLOTH.white, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'stovepipe', plate: 'brass', plume: { colour: CLOTH.white } },
    ['shoulder', 'charge', 'shoulder', 'charge'], 'close', true,
  ),
  // Portuguese line: dark blue coat, scarlet collar and cuffs, white trousers, white belts; the barretina with its tall false
  // front, brass plate and a blue-and-white plume.
  'PT/LN': foot(
    { coat: CLOTH.portugueseBlue, cut: 'tails', facings: CLOTH.scarlet, trousers: CLOTH.white, belts: CLOTH.white },
    { kind: 'barretina', plate: 'brass', plume: { colour: CLOTH.sky, tip: CLOTH.white } },
    ['shoulder', 'aim', 'shoulder', 'aim'], 'close',
  ),
  // Caçadores: the brown jacket they are known by, black facings, brown trousers, black belts, a green plume.
  'PT/LT': foot(
    { coat: CLOTH.cacadorBrown, cut: 'jacket', facings: CLOTH.black, trousers: CLOTH.cacadorBrown, belts: CLOTH.black },
    { kind: 'barretina', plate: 'none', plume: { colour: GREEN } },
    ['aim', 'kneelAim', 'port', 'aim'], 'loose',
  ),
  // Militia: a blue coat over brown civilian trousers, black belts, and a round hat; they were poorly uniformed, so the hat and
  // trousers are what the eye should catch.
  'PT/ML': foot(
    { coat: CLOTH.portugueseBlue, cut: 'tails', facings: CLOTH.portugueseBlue, trousers: CIVILIAN_BROWN, belts: CLOTH.black },
    { kind: 'roundHat', pompoms: [CLOTH.white] },
    ['port', 'shoulder', 'port', 'shoulder'], 'close',
  ),
  // Dutch-Belgian line (1815): blue coat, white facings and belts and trousers, shako with a brass plate and an orange pompom.
  'AL/LN': foot(
    { coat: CLOTH.dutchBlue, cut: 'tails', facings: CLOTH.white, trousers: CLOTH.white, belts: CLOTH.white },
    { kind: 'shako', plate: 'brass', pompoms: [CLOTH.orange] },
    ['shoulder', 'aim', 'shoulder', 'aim'], 'close',
  ),
  // Nassau light troops: a green jacket with yellow facings, grey trousers, black belts, a green plume.
  'AL/LT': foot(
    { coat: CLOTH.nassauGreen, cut: 'jacket', facings: CLOTH.yellow, trousers: CLOTH.trouserGrey, belts: CLOTH.black },
    { kind: 'shako', plate: 'brass', plume: { colour: GREEN } },
    ['aim', 'port', 'aim', 'port'], 'loose',
  ),
  // Dutch National Militia (1815): the blue-grey greatcoat of the first issue with Dutch-blue facings, orange pompom.
  'AL/ML': foot(
    { coat: MILITIA_COAT, cut: 'greatcoat', facings: CLOTH.dutchBlue, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'shako', plate: 'none', pompoms: [CLOTH.orange] },
    ['port', 'shoulder', 'port', 'shoulder'], 'close',
  ),
};
