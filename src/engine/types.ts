// Shared engine types. This file is the contract between engine, AI and UI (frozen after Plan 2B's T1c).
// Everything here is plain serialisable data (no functions, no classes). The id lists (TERRAIN_TYPES, SIDES, SECTIONS)
// are the source of their types and let setup validate scenario data.
import type { Arm, Nation, RowKey } from './codes';
import type { UnitStats } from './units';

/** Both sides, top first. */
export const SIDES = ['top', 'bottom'] as const;
export type Side = (typeof SIDES)[number];

/** The three sections, left to right from a side's own point of view. */
export const SECTIONS = ['left', 'center', 'right'] as const;
export type SectionName = (typeof SECTIONS)[number];

/** Hexside / neighbour directions, in the board's neighbour order (row 0 at the top, so NE and NW point up the board). */
export type HexDir = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

/** Hex index = r * 13 + c. r: 0..8 (0 = top edge), c: 0..12 on even rows, 0..11 on odd rows. -1 = off board. */
export type HexId = number;

export const ROWS = 9;
export const COLS = 13;
export const OFF_BOARD: HexId = -1;

/** `T` readonly all the way down: every property, and every array as a readonly array (plain data). */
export type DeepReadonly<T> = T extends readonly (infer E)[]
  ? readonly DeepReadonly<E>[]
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

export type DieFace = 'infantry' | 'cavalry' | 'artillery' | 'flag' | 'sabre';
export const TERRAIN_TYPES = ['plain', 'hill', 'forest', 'rugged', 'town', 'windmill', 'fortress', 'river', 'ford',
  'fordNoStop', 'brook', 'bridge', 'sandQuarry', 'walledFarm', 'void'] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];
export type UnitTag = 'light' | 'grenadier' | 'guard' | 'heavy' | 'horseArtillery';
export type SquareSlot = 1 | 2 | 3 | 4;

export interface Unit { id: string; side: Side; key: RowKey; hex: HexId; blocks: number; maxBlocks: number; square?: SquareSlot }
export interface Leader { id: string; side: Side; name: string; hex: HexId }
export interface PlayerState {
  side: Side; army: string; nation: Nation; commander: string;
  cards: number;                     // the scenario's hand size
  hand: number[];                    // card ids (index into CARD_LIST)
  squareTrack: (number | null)[];    // length 4; slot i holds the card of the square with counter i+1
  banners: number;                   // permanent banners
  resources: Record<string, number>; // per-side counters for later expansions (Guerrilla counters); {} in the base game
}

export type CardKind =
  | 'scoutL' | 'scoutC' | 'scoutR' | 'probeL' | 'probeC' | 'probeR' | 'attackL' | 'attackC' | 'attackR'
  | 'assaultL' | 'assaultC' | 'assaultR' | 'coordinatedAdvance' | 'flankAttack' | 'forward' | 'reconInForce'
  | 'bayonetCharge' | 'bombard' | 'cavalryCharge' | 'counterAttack' | 'elan' | 'fireAndHold' | 'firstStrike'
  | 'forceMarch' | 'coldSteel' | 'leadership' | 'grandManoeuvre' | 'rally' | 'shortSupply';
export type CardGroup = 'section' | 'tactic';
export interface MoveOption { max: number; battle: boolean }
export interface UnitMatch { arms?: readonly Arm[]; tags?: readonly UnitTag[] }    // matches when the arm OR a tag matches
export interface DiceMod { plus: number; arms?: readonly Arm[]; tags?: readonly { tag: UnitTag; arm: Arm; plus: number }[] }
export interface MoveMod { options: readonly MoveOption[]; only?: UnitMatch; leader?: number }
export interface OrderMods {
  fire: DiceMod | null; melee: DiceMod | null;
  bonusMelee: boolean;      // the melee mod also applies to the bonus melee
  lostInTown: boolean;      // no card dice battling into or out of a hex whose TerrainStats.cancelsCavalryCharge
  move: MoveMod | 'forceMarch' | null;  // replaces the allowance of matching ordered units
  noMove: boolean; noFire: boolean; noMelee: boolean;
}
export type SelectRule =
  | { kind: 'sections'; counts: Partial<Record<SectionName, number | 'command'>> }
  | { kind: 'kinds'; match: UnitMatch; max: number; notAdjacentToEnemy: boolean }
  | { kind: 'sectionAll'; match: UnitMatch }
  | { kind: 'adjacentToEnemy' }
  | { kind: 'leaders' }
  | { kind: 'grandManoeuvre'; max: number }
  | { kind: 'dice'; roll: 'elan' | 'rally' }
  | { kind: 'shortSupply' }
  | { kind: 'none' }
  | { kind: 'copy' };
export interface CardDef {
  kind: CardKind; title: string; group: CardGroup; count: number; text: string;
  sections: SectionName[]; detach: boolean; select: SelectRule; mods: OrderMods; draw: 'normal' | 'scout' | 'reshuffle';
}

export interface OrderedPiece {
  id: string; isLeader: boolean; startHex: HexId;
  moved: number;            // hexes moved in this turn's Movement phase
  moveDone: boolean;
  battled: boolean;         // made its one battle (fire, melee or a Combined Arms share)
  cardMods: boolean;        // the card's OrderMods apply (false for a fallback or La Grande Manoeuvre's single option)
  stopEntered: boolean;     // entered a hex that stops movement this turn (terrain, a works crossing, a lone friendly leader)
  noBattle: boolean;        // entered terrain that forbids battle this turn (RR §4.1)
  attachedThisTurn: boolean;// a leader joined it: it may not move afterwards
  bonusMeleeDone: boolean;
  stayInSquare: boolean;    // enemy cavalry was adjacent when it was ordered (RR §6.3)
}
export type TurnPhase = 'card' | 'orders' | 'move' | 'battle' | 'draw' | 'done';
export interface TurnState {
  number: number; card: number | null; effective: CardKind | null; mirrored: boolean; phase: TurnPhase;
  command: number;                         // Command fixed when the card was played (RR §5.3)
  ordered: Record<string, OrderedPiece>;
  mods: OrderMods;
  firstStrikes: Record<Side, number>;      // First Strikes played reactively this turn
  reshuffle: boolean; scout: boolean;      // Draw-phase effects of the card (or of the card copied)
  retreatEnds: HexId[];                    // end hexes of retreats by units of the non-active side this turn (Fire and Hold, R58)
  guerrilla: 'none' | 'stood' | 'cancelled'; // Guerrilla Action against this turn's card (RR §15.5): none tried, the card stood, or cancelled
}

export type ObjectiveDef = DeepReadonly<
  | { kind: 'tempHex'; side: Side; hex: HexId; timing: 'turnStart'; banners: number; text: string }
  | { kind: 'tempGroup'; side: Side; hexes: HexId[]; timing: 'turnStart'; banners: number; text: string }
  | { kind: 'exit'; side: Side; hex: HexId; banners: number; leadersScore: boolean; retreatOff: boolean; text: string }
  | { kind: 'killWeight'; side: Side; enemyArm: Arm; first: number; later: number }
  // Expansion #1 (RR §15.8): any one hex of the group held at turn start; a group majority (either side may hold it, `side`
  // starts holding it when `startHeld`); exits off a whole baseline (`free` exits score nothing); a sudden-death win when
  // `need` enemy units of `keys` (all of them at setup) are eliminated
  | { kind: 'tempAny'; side: Side; hexes: HexId[]; timing: 'turnStart'; banners: number; text: string }
  | { kind: 'majority'; side: Side; hexes: HexId[]; banners: number; startHeld: boolean; text: string }
  | { kind: 'exitEdge'; side: Side; row: 0 | 8; free: number; banners: number; text: string }
  | { kind: 'suddenDeath'; side: Side; keys: RowKey[]; need: number; text: string }>;
export type ObjectiveOf<K extends ObjectiveDef['kind']> = Extract<ObjectiveDef, { kind: K }>;
export interface ObjectiveState {
  held: boolean; count: number;   // held: temp objectives; count: kills (killWeight)
  holders?: string[];             // units holding a turn-start objective (Expansion #1 kinds; absent until set)
}
export type SideRuleDef = DeepReadonly<
  | { kind: 'flagIgnoreOn'; side: Side; terrain: TerrainType; flags: number }        // 006 fortress (RR §14.6)
  | { kind: 'impetuousCavalry'; side: Side; keys: RowKey[] }                         // 015 (RR §14.15)
  // Expansion #1 (RR §15.5, §15.8)
  | { kind: 'guerrilla'; side: Side; counters: number }                              // the guerrilla side and its starting counters
  | { kind: 'breakOnLosses'; side: Side; keys: RowKey[]; losses: number; start: number } // after `losses` of them, the rest leave; start: count at setup
  | { kind: 'handShrink'; side: Side; floor: number }                                // each banner lost shrinks the hand down to `floor`
  | { kind: 'squareCap'; side: Side; units: number }                                 // at most `units` different units ever form square
  | { kind: 'cavalryChargeFolly'; side: Side }>;                                     // `side` may not square or First Strike on an enemy Cavalry Charge turn
export interface ScenarioConfigData {
  objectives: ObjectiveDef[]; sideRules: SideRuleDef[];
  unitStats: Partial<Record<RowKey, UnitStats>>;   // rows changed by unitOverrides, resolved at setup
  leadersAtStart: Record<Side, number>;
  moveFirst: boolean;                              // the first player is decided by revealed cards (RR §15.8)
}
export type ScenarioConfig = DeepReadonly<ScenarioConfigData>;
export interface SpecialState {
  objState: ObjectiveState[]; turnsDone: Record<Side, number>; leadersEliminated: Record<Side, number>;
  squared: Record<Side, string[]>;                 // ids of the units that ever formed square (in order)
  handSize: Record<Side, number>;                  // the hand size now (cards held plus the square track); starts at the scenario's
  /** Move First by revealed cards (RR §15.8): the secret picks, then the cards each side must play on its first turn. */
  moveFirst: { done: boolean; picks: Record<Side, number | null>; committed: Record<Side, number | null> } | null;
}

export interface GameState {
  scenarioId: string;
  terrain: TerrainType[];  // length ROWS*COLS; never changed in play (cloneState shares it)
  works: number[];         // Field Works hexsides per hex: bit i = HEX_DIRS[i]; 0 = none (shared, never changed)
  units: Unit[]; leaders: Leader[]; players: Record<Side, PlayerState>;
  deck: number[];          // top of the deck = end of the array (pop)
  discard: number[]; first: Side; active: Side; turn: TurnState;
  lastCard: Record<Side, CardKind | null>;   // effective card of each side's last turn (Counter-Attack)
  bannersToWin: number; rng: number; rngCalls: number;
  winner: Side | 'draw' | null; winReason: string;
  scenario: ScenarioConfig; special: SpecialState;
}

/** A melee in progress (engine-internal, passed between melee.ts and its hooks). */
export interface MeleeCtx {
  attacker: string; target: string; targetHex: HexId; role: 'attack' | 'bonus';
  artillery: string[]; reaction: DefendChoice | null; declaredMoved: number;
}

export type DefendChoice = 'stand' | 'retireReform' | 'formSquare' | 'firstStrike';
export interface RetreatOption { path: HexId[]; end: HexId; losses: number; attach: string | null }
export interface LeaderRetreatOption { path: HexId[]; end: HexId; offBoard: boolean; escapes: string[]; attach: string | null; eliminated: boolean }

export type Decision =
  | { kind: 'playCard'; side: Side }
  | { kind: 'orders'; side: Side; card: CardKind; mirrored: boolean; single: boolean }
  | { kind: 'leaveSquare'; side: Side; unit: string }
  | { kind: 'move'; side: Side }
  | { kind: 'battle'; side: Side }
  | { kind: 'combinedArms'; side: Side; unit: string; target: HexId; options: string[]; required: boolean }
  | { kind: 'defend'; side: Side; attacker: string; target: string; options: DefendChoice[]; bonus: boolean; artillery: string[] }  // artillery: the Combined Arms guns that joined (declared before the reaction, R40)
  | { kind: 'ignoreFlags'; side: Side; unit: string; flags: number; max: number }
  | { kind: 'retreat'; side: Side; unit: string; options: RetreatOption[]; reason: 'retreat' | 'retireReform' }
  | { kind: 'leaderRetreat'; side: Side; leader: string; options: LeaderRetreatOption[] }
  | { kind: 'advance'; side: Side; unit: string; hex: HexId; how: 'takeGround' | 'breakthrough' }
  | { kind: 'breakthroughExtra'; side: Side; unit: string; options: HexId[]; required: boolean }
  | { kind: 'bonusMelee'; side: Side; unit: string; targets: HexId[] }
  | { kind: 'elan'; side: Side; faces: DieFace[] }
  | { kind: 'rally'; side: Side; faces: DieFace[] }
  | { kind: 'scoutKeep'; side: Side; cards: [number, number] }
  | { kind: 'shortSupplyTarget'; side: Side; options: string[] }
  | { kind: 'shortSupplyHex'; side: Side; unit: string; options: HexId[] }
  // spend a counter against the card (`spend`: card is the enemy card) or take one instead of a Scout draw (`scout`: card null)
  | { kind: 'guerrilla'; side: Side; mode: 'spend' | 'scout'; card: CardKind | null; held: number; pool: number }
  | { kind: 'moveFirst'; side: Side; options: number[] };   // the secret opening card: answer playCard with one of options

export type Answer =
  | { kind: 'playCard'; card: number }                       // playCard, moveFirst
  | { kind: 'orders'; pieces: string[]; single?: boolean }   // single: La Grande Manoeuvre's "1 unit, normal rules"
  | { kind: 'move'; piece: string; to: HexId }               // to = OFF_BOARD: step off by an exit objective
  | { kind: 'endMove' }
  | { kind: 'attack'; unit: string; target: HexId }
  | { kind: 'endBattle' }
  | { kind: 'select'; ids: string[] }                        // combinedArms ([] = none)
  | { kind: 'defend'; choice: DefendChoice }
  | { kind: 'ignoreFlags'; count: number }
  | { kind: 'choose'; index: number }                        // retreat, leaderRetreat, scoutKeep (card kept), shortSupplyTarget
  | { kind: 'yesno'; yes: boolean }                          // leaveSquare, advance, guerrilla
  | { kind: 'hex'; hex: HexId | null }                       // breakthroughExtra, bonusMelee (null = decline), shortSupplyHex
  | { kind: 'assign'; ids: (string | null)[] };              // elan, rally: one entry per die

export type RollPurpose = 'fire' | 'melee' | 'battleBack' | 'firstStrike' | 'bonus' | 'squareFirst' | 'retireReform'
  | 'leaderCheck' | 'escape' | 'elan' | 'rally' | 'guerrilla';
export type GameEvent =
  | { t: 'turnStart'; side: Side; turn: number }
  | { t: 'cardPlayed'; side: Side; card: number; kind: CardKind; effective: CardKind | null }
  | { t: 'ordered'; side: Side; ids: string[] }
  | { t: 'move'; id: string; path: HexId[] }   // path includes the start hex; last = OFF_BOARD when it exited
  | { t: 'combat'; purpose: RollPurpose; attacker: string; target: string; dice: number; artillery?: { id: string; dice: number }[] }
  | { t: 'roll'; purpose: RollPurpose; faces: DieFace[]; scoring: boolean[]; by: string | null; against: string | null; from?: string[]; reroll?: true }
  | { t: 'damage'; id: string; amount: number; left: number; reason: string }
  | { t: 'eliminated'; id: string }
  | { t: 'removed'; id: string; reason: string }      // left the board by an exit: no banner to the enemy
  | { t: 'leaderKilled'; id: string } | { t: 'leaderSafe'; id: string } | { t: 'leaderLeft'; id: string }
  | { t: 'flags'; id: string; flags: number; ignored: number; bounce: boolean }
  | { t: 'retreat'; id: string; path: HexId[] } | { t: 'retire'; id: string; path: HexId[] }
  | { t: 'leaderRetreat'; id: string; path: HexId[]; offBoard: boolean }
  | { t: 'attach'; leader: string; unit: string }
  | { t: 'advance'; id: string; path: HexId[] }
  | { t: 'squareFormed'; id: string; slot: SquareSlot } | { t: 'squareLeft'; id: string; slot: SquareSlot }
  | { t: 'cardReturned'; side: Side; slot: SquareSlot }
  | { t: 'rallied'; id: string; blocks: number } | { t: 'shortSupply'; id: string; hex: HexId }
  | { t: 'banner'; side: Side; total: number; reason: string }
  | { t: 'held'; side: Side; held: number; total: number; reason: string }
  | { t: 'draw'; side: Side } | { t: 'scoutDrew'; side: Side } | { t: 'discarded'; side: Side; card: number }
  | { t: 'reshuffle' }
  | { t: 'log'; text: string; side?: Side }
  | { t: 'victory'; winner: Side | 'draw'; reason: string }
  | { t: 'guerrilla'; side: Side; what: 'stood' | 'cancelled' | 'gained'; held: number; pool: number }
  | { t: 'moveFirst'; picks: Record<Side, number | null>; values: Record<Side, number>; first: Side };

/** Emitter passed through engine generators. */
export interface FlowCtx {
  emit(e: GameEvent): void;
  /** Called when an answer is rejected (the same decision is asked again). */
  invalid?(msg: string): void;
}
