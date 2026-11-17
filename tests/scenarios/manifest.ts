// Expected setup of each battle, checked by per-box scenario tests (none yet: the Napoleonic battles add theirs here).
// `terrain` and `checksum` fingerprint the board (see checksum.ts), so a moved piece or changed terrain hex shows.
import type { RowKey } from '../../src/engine/codes';
import type { SideSetup } from '../../src/engine/setup';
import type { Side } from '../../src/engine/types';
import type { Checksums, TerrainTally } from './checksum';

type PerSide<T> = Record<Side, T>;

export interface BattleManifest {
  name: string;
  year: string;
  banners: number;
  first: Side;
  /** Per side: army, nation, commander and hand size. */
  sides: PerSide<Pick<SideSetup, 'army' | 'nation' | 'commander' | 'cards'>>;
  /** Leaders on the board at setup, per side, in file order. */
  leaders: PerSide<string[]>;
  /** Units on the board per side and row key. */
  units: PerSide<Partial<Record<RowKey, number>>>;
  /** Terrain rows, works sides and bridges. */
  terrain: TerrainTally;
  /** FNV-1a checksums of the terrain and of the unit and leader positions. */
  checksum: Checksums;
}

/** Empty: the Napoleonic battles add their manifests here (Plan 6). */
export const MANIFEST: Record<string, BattleManifest> = {};
