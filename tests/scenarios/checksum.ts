// Fingerprints of a built battle, so the manifest notices any change to the verified map data: a terrain tally (terrain rows,
// works sides, bridges) and two checksums, one over every terrain hex (with its works mask) and one over every unit and
// leader position. The tallies explain a failure; the checksums catch moves that leave every count unchanged.
import { colOf, rowOf } from '../../src/engine/hex';
import type { GameState, TerrainType } from '../../src/engine/types';

export interface TerrainTally {
  /** Hexes per terrain type; plain and void are not listed. */
  types: Partial<Record<TerrainType, number>>;
  /** Field Works hexes and the number of works hexsides over all of them. */
  works: { hexes: number; sides: number };
  /** Bridge hexes (also counted under `types.bridge`). */
  bridges: number;
}

export interface Checksums {
  /** Every non-plain terrain hex or works hex, with its works mask. */
  terrain: string;
  /** Every unit (side, key, hex, square, strength) and leader (side, name, hex). */
  pieces: string;
}

/** 32-bit FNV-1a of the UTF-16 code units, as 8 hex digits. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const popcount = (n: number): number => {
  let c = 0;
  for (let m = n; m; m &= m - 1) c++;
  return c;
};

const at = (h: number): string => `${rowOf(h)},${colOf(h)}`;

export function terrainTally(s: GameState): TerrainTally {
  const tally: TerrainTally = { types: {}, works: { hexes: 0, sides: 0 }, bridges: 0 };
  s.terrain.forEach((t, h) => {
    if (s.works[h]) {
      tally.works.hexes++;
      tally.works.sides += popcount(s.works[h]);
    }
    if (t === 'plain' || t === 'void') return;
    tally.types[t] = (tally.types[t] ?? 0) + 1;
    if (t === 'bridge') tally.bridges++;
  });
  return tally;
}

/** The lines the terrain checksum is taken over: `type:r,c` plus `:w<mask>` for a hex with Field Works (plain ones included). */
export function terrainLines(s: GameState): string[] {
  const lines: string[] = [];
  s.terrain.forEach((t, h) => {
    if ((t === 'plain' || t === 'void') && !s.works[h]) return;
    lines.push(`${t}:${at(h)}${s.works[h] ? `:w${s.works[h]}` : ''}`);
  });
  return lines.sort();
}

/** One line per unit (`side:key:r,c[:sN]:blocks`) and leader (`side:name:r,c`). */
export function pieceLines(s: GameState): string[] {
  const units = s.units.map((u) => `${u.side}:${u.key}:${at(u.hex)}${u.square ? `:s${u.square}` : ''}:${u.blocks}`);
  const leaders = s.leaders.map((l) => `${l.side}:${l.name}:${at(l.hex)}`);
  return [...units, ...leaders].sort();
}

export function checksums(s: GameState): Checksums {
  return { terrain: fnv1a(terrainLines(s).join('\n')), pieces: fnv1a(pieceLines(s).join('\n')) };
}
