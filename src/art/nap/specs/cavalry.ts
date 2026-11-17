// Cavalry specs: what each horseman wears, carries and rides, from written descriptions and general period knowledge.
// Where sources differ the choice is hedged in a comment. Horses are the table's coats, cycled by figure index.
import { CLOTH, METAL } from '../nations';
import type { CavalryKey } from '../keys';
import type { MountedSpec } from '../rider';
import type { Dress } from '../uniform';

// Local swatches (a spec may add one; CLOTH is not edited).
const DARK_BLUE = '#1f2a55'; // the British light dragoon's jacket and the heavy dragoon's facings
const HAIR = '#171412'; // black horsehair manes and fur crests
const GREEN_PLUME = '#3f8a4a';
const FUR_BROWN = '#54382a';
const GREY_FUR = '#8a8780';
const WHITE_PLUME = '#f0ece0';

const white = CLOTH.white;
const dress = (d: Pick<Dress, 'coat' | 'cut' | 'facings' | 'trousers'> & Partial<Dress>): Dress => ({ belts: white, ...d });

export const CAVALRY_SPECS: Record<CavalryKey, MountedSpec> = {
  // Chasseurs a cheval: green jacket (the habit-veste), scarlet facings, green overalls. Plume green over red.
  'FR/LC': {
    drawing: 'horse', horse: 'light', weapon: 'sabre', coats: ['bay', 'chestnut'],
    dress: dress({ coat: CLOTH.chasseurGreen, cut: 'jacket', facings: CLOTH.scarlet, trousers: CLOTH.chasseurGreen, lace: CLOTH.yellow, shoulders: { kind: 'straps', colour: CLOTH.scarlet } }),
    head: { kind: 'shako', plume: { colour: CLOTH.scarlet, tip: GREEN_PLUME, tall: false }, cords: CLOTH.yellow },
    shabraque: { cloth: CLOTH.chasseurGreen, trim: white, sheepskin: true },
  },
  // Vistula Legion lancers: dark-blue kurtka with yellow facings and plastron lapels, crimson overalls (regiments varied
  // in the overall colour; crimson reads clearly against the blue), white-plumed czapka, red-over-white pennon.
  'FR/LNC': {
    drawing: 'horse', horse: 'light', weapon: 'lance', coats: ['bay', 'brown'], pennon: [CLOTH.scarlet, white],
    dress: dress({ coat: CLOTH.frenchBlue, cut: 'jacket', facings: CLOTH.yellow, lapels: CLOTH.yellow, trousers: CLOTH.crimson }),
    head: { kind: 'czapka', body: CLOTH.frenchBlue, cords: CLOTH.yellow, plume: { colour: WHITE_PLUME, tall: true } },
    shabraque: { cloth: CLOTH.frenchBlue, trim: CLOTH.yellow },
  },
  // Dragoons: green habit with scarlet facings and epaulettes, white breeches, brass helmet with a black mane and a brown fur turban; carbine.
  'FR/HC': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'sloped', carbine: true, coats: ['bay', 'brown'],
    dress: dress({ coat: CLOTH.dragoonGreen, cut: 'tails', facings: CLOTH.scarlet, trousers: white, shoulders: { kind: 'epaulettes', colour: CLOTH.scarlet } }),
    head: { kind: 'dragoonHelmet', body: METAL.brass, mane: HAIR, turban: FUR_BROWN },
    shabraque: { cloth: CLOTH.dragoonGreen, trim: white },
  },
  // Cuirassiers: blue habit-veste, scarlet facings, steel breastplate, white breeches; steel helmet, black mane, scarlet plume.
  'FR/CU': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'raised', coats: ['black', 'brown'],
    dress: dress({ coat: CLOTH.frenchBlue, cut: 'jacket', facings: CLOTH.scarlet, trousers: white, cuirass: 'steel' }),
    head: { kind: 'cuirassierHelmet', body: METAL.steel, mane: HAIR, plume: { colour: CLOTH.scarlet } },
    shabraque: { cloth: CLOTH.frenchBlue, trim: white },
  },
  // Grenadiers a cheval of the Guard: blue habit, white lapels, orange aiguillette, scarlet epaulettes, white breeches, bearskin with a scarlet plume.
  'FR/GHC': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'sloped', coats: ['black'], guard: true,
    dress: dress({ coat: CLOTH.frenchBlue, cut: 'tails', facings: CLOTH.scarlet, lapels: white, lace: CLOTH.orange, trousers: white, shoulders: { kind: 'epaulettes', colour: CLOTH.orange } }),
    head: { kind: 'bearskin', plume: { colour: CLOTH.scarlet, tall: true } },
    shabraque: { cloth: CLOTH.frenchBlue, trim: METAL.gold },
  },
  // British light dragoons: dark-blue jacket, buff facings, white breeches, black Tarleton helmet with a fur crest and a
  // buff turban (the pre-1812 pattern is a hedge: the 1812 reform put them in lancer or hussar dress).
  'BR/LC': {
    drawing: 'horse', horse: 'light', weapon: 'sabre', coats: ['bay', 'chestnut'],
    dress: dress({ coat: DARK_BLUE, cut: 'jacket', facings: CLOTH.buff, trousers: white, lace: CLOTH.buff, shoulders: { kind: 'wings', colour: white } }),
    head: { kind: 'tarleton', mane: HAIR, turban: CLOTH.buff },
    shabraque: { cloth: CLOTH.britishRed, trim: CLOTH.yellow, sheepskin: true },
  },
  // Heavy dragoons: red coatee, dark-blue facings, white breeches. The 1812 helmet (brass, black crest) is worn throughout:
  // before 1812 they wore a bicorne, but the helmet reads as heavy cavalry.
  'BR/HC': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'sloped', coats: ['bay', 'brown'],
    dress: dress({ coat: CLOTH.britishRed, cut: 'tails', facings: DARK_BLUE, trousers: white, shoulders: { kind: 'straps', colour: white } }),
    head: { kind: 'crestedHelmet', body: METAL.brass, mane: HAIR },
    shabraque: { cloth: DARK_BLUE, trim: CLOTH.yellow },
  },
  // Life Guards (Household Cavalry): red coatee, dark-blue facings, gold lace, white breeches, gilt helmet with a black crest
  // and a red-over-blue plume (the brief's; the regiments' plumes were white, and varied).
  'BR/GHC': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'raised', coats: ['black'], guard: true,
    dress: dress({ coat: CLOTH.britishRed, cut: 'tails', facings: DARK_BLUE, lace: METAL.gold, trousers: white, shoulders: { kind: 'epaulettes', colour: METAL.gold } }),
    head: { kind: 'crestedHelmet', body: METAL.gold, mane: HAIR, plume: { colour: DARK_BLUE, tip: CLOTH.scarlet } },
    shabraque: { cloth: DARK_BLUE, trim: METAL.gold },
  },
  // Portuguese cavalry: blue jacket, scarlet facings, white breeches; Tarleton-pattern helmet with a fur crest.
  'PT/LC': {
    drawing: 'horse', horse: 'light', weapon: 'sabre', coats: ['chestnut', 'dun'],
    dress: dress({ coat: CLOTH.portugueseBlue, cut: 'jacket', facings: CLOTH.scarlet, trousers: white }),
    head: { kind: 'tarleton', mane: HAIR },
    shabraque: { cloth: CLOTH.portugueseBlue, trim: CLOTH.scarlet },
  },
  // Portuguese dragoons: blue coatee, white facings, white breeches; brass helmet with a black mane.
  'PT/HC': {
    drawing: 'horse', horse: 'heavy', weapon: 'sword', carry: 'sloped', coats: ['bay'],
    dress: dress({ coat: CLOTH.portugueseBlue, cut: 'tails', facings: white, trousers: white }),
    head: { kind: 'dragoonHelmet', body: METAL.brass, mane: HAIR },
    shabraque: { cloth: CLOTH.portugueseBlue, trim: white },
  },
  // Brunswick hussars: black dolman with sky-blue facings and lace, a black pelisse with grey fur, black shako with the
  // death's-head plate.
  'AL/LC': {
    drawing: 'horse', horse: 'light', weapon: 'sabre', coats: ['black', 'bay'],
    dress: dress({ coat: CLOTH.brunswickBlack, cut: 'dolman', facings: CLOTH.sky, lace: CLOTH.sky, trousers: CLOTH.brunswickBlack, belts: CLOTH.sky, pelisse: { colour: CLOTH.black, fur: GREY_FUR } }),
    head: { kind: 'shako', body: CLOTH.black, plate: 'skull', cords: CLOTH.sky },
    shabraque: { cloth: CLOTH.black, trim: CLOTH.sky },
  },
};
