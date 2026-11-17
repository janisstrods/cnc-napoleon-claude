// The vocabulary of the Napoleonic miniatures: what a figure wears and carries, as data. Later tasks fill in the specs and
// the renderers; they do not add to these types.

export type FootHeadgear = 'shako' | 'bearskin' | 'bearskinPlate' | 'coveredShako' | 'stovepipe' | 'barretina' | 'roundHat';
export type HorseHeadgear = 'tarleton' | 'dragoonHelmet' | 'cuirassierHelmet' | 'crestedHelmet' | 'czapka';
export type CommandHeadgear = 'bicorne';
export type HeadgearKind = FootHeadgear | HorseHeadgear | CommandHeadgear;

export interface Headwear {
  kind: HeadgearKind;
  /** Felt, fur or metal colour (a default per kind). */
  body?: string;
  plume?: { colour: string; tip?: string; tall?: boolean };
  /** Cycled by figure index (French company colours). */
  pompoms?: readonly string[];
  cords?: string;
  plate?: 'brass' | 'white' | 'skull' | 'none';
  /** Horsehair mane or fur crest of a helmet. */
  mane?: string;
  /** Dragoon-helmet fur band, Tarleton turban. */
  turban?: string;
  /** Bicorne only (default athwart). */
  worn?: 'athwart' | 'foreAft';
}

export interface Dress {
  coat: string;
  cut: 'tails' | 'jacket' | 'greatcoat' | 'dolman';
  /** Collar and cuffs. */
  facings: string;
  /** Plastron colour; absent = single-breasted. */
  lapels?: string;
  lace?: string;
  shoulders?: { kind: 'epaulettes' | 'wings' | 'straps'; colour: string };
  trousers: string;
  gaiters?: string;
  belts: string;
  pelisse?: { colour: string; fur: string };
  cuirass?: 'steel';
  sash?: string;
}

export type FootWeapon = 'musket' | 'rifle';
export type FootPose = 'shoulder' | 'port' | 'aim' | 'kneelAim' | 'charge';
export type HorseCoatName = 'bay' | 'chestnut' | 'black' | 'grey' | 'brown' | 'dun';

export interface FootSpec {
  drawing: 'foot';
  dress: Dress;
  head: Headwear;
  weapon: FootWeapon;
  /** By figure index 0..3. */
  poses: readonly [FootPose, FootPose, FootPose, FootPose];
  order: 'close' | 'loose';
  pack: boolean;
  guard?: true;
  stub?: true;
}

export type CavalryWeapon = 'sabre' | 'sword' | 'lance';
export interface HorseSpec {
  drawing: 'horse';
  dress: Dress;
  head: Headwear;
  weapon: CavalryWeapon;
  carbine?: true;
  pennon?: readonly [string, string];
  horse: 'light' | 'heavy';
  coats: readonly HorseCoatName[];
  shabraque: { cloth: string; trim: string; sheepskin?: true };
  guard?: true;
  stub?: true;
}

export type GunPiece = 'gun' | 'rammer' | 'linstock' | 'ammo' | 'driver';
export interface GunSpec {
  drawing: 'gun';
  crew: { dress: Dress; head: Headwear };
  carriage: string;
  barrel: 'bronze' | 'iron';
  /** [0] = front piece, removed last. */
  pieces: readonly [GunPiece, GunPiece, GunPiece, GunPiece];
  guard?: true;
  stub?: true;
}

export type FigureSpec = FootSpec | HorseSpec | GunSpec;

export interface FlagSpec {
  kind: 'vertical' | 'horizontal' | 'union';
  colours: readonly string[];
}
export interface LeaderSpec {
  dress: Dress;
  head: Headwear;
  horse: HorseCoatName;
  flag: FlagSpec;
  stub?: true;
}
