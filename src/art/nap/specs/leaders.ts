// Leader specs, one per art nation: what a general wears, rides and carries, from written descriptions and general period
// knowledge (hedged below where sources differ).
//
// The flag is a readability device in the manner of the Ancients army standard, not a claim that generals carried flags: it
// lets a player tell the four generals apart on a 65 px hex. Its `colours` are, for the stripe kinds, in stripe order (top to
// bottom, or hoist to fly); for 'union' they are [cross, saltire and border, field].
import { CLOTH, METAL } from '../nations';
import type { ArtNation } from '../keys';
import type { Dress, LeaderSpec } from '../uniform';

// Local swatch: the British dark-blue facing (also used by the heavy dragoons in specs/cavalry.ts).
const DARK_BLUE = '#1f2a55';

const gen = (d: Pick<Dress, 'coat' | 'facings' | 'sash'>): Dress => ({
  cut: 'tails', trousers: CLOTH.white, belts: CLOTH.white, lace: METAL.gold, shoulders: { kind: 'epaulettes', colour: METAL.gold }, ...d,
});

export const LEADER_SPECS: Record<ArtNation, LeaderSpec> = {
  // French general or marshal: blue coat, heavy gold embroidery (drawn as lace and aiguillette), white breeches, a scarlet sash
  // (the gold of "scarlet and gold" is the fringe, not drawn at this size), bicorne athwart with white feather edging and the
  // tricolour cockade (blue outermost). Grey horse (Napoleon's own were grey; marshals' mounts varied).
  FR: {
    dress: gen({ coat: CLOTH.frenchBlue, facings: CLOTH.frenchBlue, sash: CLOTH.scarlet }),
    head: { kind: 'bicorne', cords: METAL.gold, plume: { colour: CLOTH.white }, pompoms: [CLOTH.frenchBlue, CLOTH.white, CLOTH.scarlet] },
    horse: 'grey',
    flag: { kind: 'vertical', colours: [CLOTH.frenchBlue, CLOTH.white, CLOTH.scarlet] },
  },
  // British general: Wellington wore a plain blue undress frock, but staff in general dress wore red; red reads against the
  // blue French and is the brief's choice. Gold lace, crimson sash, white-over-red plume on a bicorne worn fore and aft,
  // black cockade. Bay horse.
  BR: {
    dress: gen({ coat: CLOTH.britishRed, facings: DARK_BLUE, sash: CLOTH.crimson }),
    head: { kind: 'bicorne', worn: 'foreAft', cords: METAL.gold, plume: { colour: CLOTH.white, tip: CLOTH.scarlet, tall: true }, pompoms: [CLOTH.black] },
    horse: 'bay',
    flag: { kind: 'union', colours: [CLOTH.britishRed, CLOTH.white, CLOTH.frenchBlue] },
  },
  // Portuguese general: blue coat with scarlet facings and gold, crimson sash, bicorne athwart. The national cockade of
  // 1808-14 was blue and red (the blue-and-white one dates from 1821), drawn red outermost so that it reads against the dark
  // felt. Chestnut horse. Flag: blue over red, matching the cockade (a readability device, as for every nation).
  PT: {
    dress: gen({ coat: CLOTH.portugueseBlue, facings: CLOTH.scarlet, sash: CLOTH.crimson }),
    head: { kind: 'bicorne', cords: METAL.gold, pompoms: [CLOTH.scarlet, CLOTH.portugueseBlue] },
    horse: 'chestnut',
    flag: { kind: 'horizontal', colours: [CLOTH.portugueseBlue, CLOTH.scarlet] },
  },
  // Dutch-Belgian general: blue coat with gold, orange sash and orange cockade (the House of Orange). Black horse. Flag: the
  // Netherlands' red, white and blue (the 1815 colours; orange is on the sash).
  AL: {
    dress: gen({ coat: CLOTH.dutchBlue, facings: CLOTH.dutchBlue, sash: CLOTH.orange }),
    head: { kind: 'bicorne', cords: METAL.gold, pompoms: [CLOTH.orange] },
    horse: 'black',
    flag: { kind: 'horizontal', colours: [CLOTH.scarlet, CLOTH.white, CLOTH.dutchBlue] },
  },
};
