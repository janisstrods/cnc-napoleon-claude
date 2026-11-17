// Expected setup of each battle, checked by per-box scenario tests (none now: Plan 2A deleted the Ancients manifests; the
// Napoleonic battles add theirs here).
// `terrain` and `checksum` fingerprint the board (see checksum.ts): a tally of terrain hexes by type, river crossing and
// rampart edge, and one checksum over every terrain hex and one over every unit and leader position and elite. They
// were generated from the verified data files, so a moved piece, a changed terrain hex or ford, or a moved elite shows.
import type { GameOptions } from '../../src/engine/setup';
import type { ArmyLook, Blocks, EliteId, Legion, Side, SpecialRuleId, UnitType } from '../../src/engine/types';
import type { Checksums, TerrainTally } from './checksum';

type PerSide<T> = Record<Side, T>;

export interface BattleManifest {
  name: string;
  year: string;
  banners: number;
  first: Side;
  armies: PerSide<string>;
  commanders: PerSide<string>;
  cards: PerSide<number>;
  blocks: PerSide<Blocks>;
  looks: PerSide<ArmyLook>;
  /** Leaders on the board at setup, per side, in file order. */
  leaders: PerSide<string[]>;
  /** Leaders placed before the first turn, in placement order (117). */
  placeLeaders?: [Side, string][];
  /** Units on the board per side and type. */
  units: PerSide<Partial<Record<UnitType, number>>>;
  /** Units and leaders that start off the board (the ambush force of 206, the Gallic reinforcements of 308), per side. */
  reserves?: { units: PerSide<Partial<Record<UnitType, number>>>; leaders: PerSide<string[]> };
  /** Units that wait off the board for a forced placement (308's Roman MI, §18.9), not among the reserves: [side, type]. */
  placeUnits?: [Side, UnitType][];
  /** Legion rule per side (Marius' legions, 206-223 and 301-305; Julian legions, 306-319 but 310). */
  legions?: Partial<Record<Side, Legion>>;
  /** Elite units: [side, preset, unit type], in file order. */
  elites: [Side, EliteId, UnitType][];
  rules: SpecialRuleId[];
  /** Optional rules the battle offers, with their default. */
  options?: GameOptions;
  /** The side Fright at First Sight falls on (116: the Romans). */
  frightAtFirstSight?: Side;
  /** The Roman side of Tactical Flexibility (120, 121, 124). */
  tacticalFlexibility?: Side;
  /** Terrain hexes by type (plain excluded), river crossing and rampart edge. */
  terrain: TerrainTally;
  /** FNV-1a checksums of the terrain and of the unit and leader positions. */
  checksum: Checksums;
}

/** Empty: the Ancients battles were removed in Plan 2A; Napoleonic battles add their manifests here. */
export const MANIFEST: Record<string, BattleManifest> = {};

export const MANIFEST_EXP2: Record<string, BattleManifest> = {};

export const MANIFEST_EXP3: Record<string, BattleManifest> = {};
