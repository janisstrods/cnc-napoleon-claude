// Artillery specs: the crew's dress and headgear, the carriage colour and the barrel metal, from written descriptions and
// general period knowledge. Where sources differ the choice is hedged in a comment. Horse artillery (the spec has a `team`) is
// told apart from foot artillery by its limber and pair of draught horses with a mounted driver, its light-cavalry headgear and a lighter carriage.
import { CLOTH } from '../nations';
import type { ArtilleryKey } from '../keys';
import type { Dress, GunSpec, Headwear } from '../uniform';

// Local swatches (CLOTH is not edited).
const DARK_BLUE = '#1f2a55'; // the Royal Artillery's coat (a shade darker than the French blue)
const OLIVE = '#5f6b3c'; // the French carriage: Gribeauval olive green
const OLIVE_LIGHT = '#788652'; // the horse-artillery carriage, lighter
const BLUE_GREY = '#6e7e88'; // the British and Portuguese carriage
const BLUE_GREY_LIGHT = '#8397a4'; // the horse-artillery carriage, lighter
const GREY_GREEN = '#5a6a50'; // the Dutch carriage (hedged: sources differ on its colour)
const FUR_HAIR = '#171412';

const FOUR = ['gun', 'rammer', 'linstock', 'ammo'] as const;

const gun = (dress: Dress, head: Headwear, carriage: string, pieces: GunSpec['pieces'], opts: { guard?: true; team?: true } = {}): GunSpec => ({
  drawing: 'gun', crew: { dress, head }, carriage, barrel: 'bronze', pieces, ...opts,
});

// French foot artillery: dark-blue coat with blue lapels piped scarlet, scarlet epaulettes, blue trousers. The collar and
// cuffs are scarlet here (sources differ: some plates show them blue, piped red; scarlet reads better at board scale).
const FR_FOOT: Dress = {
  coat: CLOTH.frenchBlue, cut: 'tails', facings: CLOTH.scarlet, lapels: CLOTH.frenchBlue, lace: CLOTH.scarlet,
  shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet }, trousers: CLOTH.frenchBlue, belts: CLOTH.white,
};

export const ARTILLERY_SPECS: Record<ArtilleryKey, GunSpec> = {
  'FR/FA': gun(FR_FOOT, { kind: 'shako', plate: 'brass', pompoms: [CLOTH.scarlet], cords: CLOTH.scarlet }, OLIVE, FOUR),
  // Horse artillery: a hussar-like dolman in the same blue with scarlet lace, blue overalls, shako with a scarlet plume.
  'FR/HA': gun(
    { coat: CLOTH.frenchBlue, cut: 'dolman', facings: CLOTH.scarlet, lace: CLOTH.scarlet, trousers: CLOTH.frenchBlue, belts: CLOTH.white },
    { kind: 'shako', plate: 'brass', plume: { colour: CLOTH.scarlet }, cords: CLOTH.scarlet }, OLIVE_LIGHT, FOUR, { team: true },
  ),
  // Guard foot artillery: the same dress, a bearskin with a scarlet plume and cords (no plate).
  'FR/GA': gun(FR_FOOT, { kind: 'bearskin', plate: 'none', cords: CLOTH.scarlet, plume: { colour: CLOTH.scarlet, tall: true } }, OLIVE, FOUR, { guard: true }),
  // Royal Artillery: dark-blue coatee, scarlet collar and cuffs, yellow cord (lace), grey trousers, stovepipe with a brass
  // plate (the brief's; the Belgic shako also appears in 1812-15 plates, so sources differ).
  'BR/FA': gun(
    { coat: DARK_BLUE, cut: 'tails', facings: CLOTH.scarlet, lace: CLOTH.yellow, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'stovepipe', plate: 'brass' }, BLUE_GREY, FOUR,
  ),
  // Royal Horse Artillery: dark-blue jacket, scarlet collar and cuffs, yellow lace, grey overalls, a Tarleton helmet with a
  // fur crest and a scarlet turban (the turban colour is a hedge).
  'BR/HA': gun(
    { coat: DARK_BLUE, cut: 'jacket', facings: CLOTH.scarlet, lace: CLOTH.yellow, trousers: CLOTH.trouserGrey, belts: CLOTH.white },
    { kind: 'tarleton', mane: FUR_HAIR, turban: CLOTH.scarlet }, BLUE_GREY_LIGHT, FOUR, { team: true },
  ),
  // Portuguese artillery: blue coat, black collar and cuffs piped scarlet, blue trousers (a hedge), barretina with a brass plate.
  'PT/FA': gun(
    { coat: CLOTH.portugueseBlue, cut: 'tails', facings: CLOTH.black, lace: CLOTH.scarlet, trousers: CLOTH.portugueseBlue, belts: CLOTH.black },
    { kind: 'barretina', plate: 'brass' }, BLUE_GREY, FOUR,
  ),
  // Dutch-Belgian artillery (1815): blue coat with black facings, blue trousers (a hedge), shako with an orange pompom; the
  // carriage is grey-green (sources differ on the Dutch carriage colour).
  'AL/FA': gun(
    { coat: CLOTH.dutchBlue, cut: 'tails', facings: CLOTH.black, trousers: CLOTH.dutchBlue, belts: CLOTH.black },
    { kind: 'shako', plate: 'brass', pompoms: [CLOTH.orange] }, GREY_GREEN, FOUR,
  ),
};
