// Expected setup of each battle, checked by per-box scenario tests (base.test.ts for 001–015; Plan 7 adds the Spanish battles).
// `terrain` and `checksum` fingerprint the board (see checksum.ts), so a moved piece or changed terrain hex shows.
// Units follow design/survey.md §2.1 and design/data; leaders are in file order (the unnamed French leader of 001/002 is Brennier).
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

const counts = (s: string): Record<string, number> => Object.fromEntries(s.split(', ').map((x) => { const [k, n] = x.split(' '); return [k, Number(n)]; }));
const U = (s: string) => counts(s) as Partial<Record<RowKey, number>>;
const T = (s: string, works = { hexes: 0, sides: 0 }, bridges = 0): TerrainTally => ({ types: counts(s) as TerrainTally['types'], works, bridges });
const ap = (commander: string, cards: number): BattleManifest['sides']['top'] => ({ army: 'Anglo-Portuguese', nation: 'BR', commander, cards });
const br = (commander: string, cards: number): BattleManifest['sides']['top'] => ({ army: 'British', nation: 'BR', commander, cards });
const aa = (commander: string, cards: number): BattleManifest['sides']['top'] => ({ army: 'Anglo-Allied', nation: 'BR', commander, cards });
const fr = (commander: string, cards: number): BattleManifest['sides']['bottom'] => ({ army: 'French', nation: 'FR', commander, cards });
const L = (s: string) => s.split(', ');
const CS = (terrain: string, pieces: string): Checksums => ({ terrain, pieces });

export const MANIFEST: Record<string, BattleManifest> = {
  '001': {
    name: 'Roliça (French First Position)', year: '1808', banners: 5, first: 'top', sides: { top: ap('Wellesley', 6), bottom: fr('Delaborde', 5) },
    leaders: { top: L('Wellesley, Fergusson, Trant'), bottom: L('Delaborde, Brennier') },
    units: { top: U('BR/FA 2, BR/HA 1, BR/HC 1, BR/LN 5, BR/LT 1, PT/LC 1, PT/LN 2, PT/LT 1'), bottom: U('FR/FA 1, FR/LC 2, FR/LN 4, FR/LT 2') },
    terrain: T('ford 12, forest 8, hill 17, town 2'), checksum: CS('25e51e06', '6a1c6a60'),
  },
  '002': {
    name: 'Roliça (French Second Position)', year: '1808', banners: 5, first: 'top', sides: { top: ap('Wellesley', 6), bottom: fr('Delaborde', 5) },
    leaders: { top: L('Wellesley, Fergusson, Lake, Trant'), bottom: L('Delaborde, Brennier') },
    units: { top: U('BR/FA 2, BR/HA 1, BR/HC 1, BR/LN 5, BR/LT 1, PT/LC 1, PT/LN 2, PT/LT 1'), bottom: U('FR/FA 1, FR/LC 2, FR/LN 4, FR/LT 2') },
    terrain: T('forest 10, hill 12, rugged 13'), checksum: CS('69f54f10', 'af543979'),
  },
  '003': {
    name: 'Vimiero', year: '1808', banners: 6, first: 'bottom', sides: { top: ap('Wellesley', 6), bottom: fr('Junot', 5) },
    leaders: { top: L('Hill, Fane, Fergusson'), bottom: L('St. Clair, Kellermann, Solignac') },
    units: { top: U('BR/FA 2, BR/LC 1, BR/LN 9, BR/LT 1, BR/RI 1, PT/LC 1, PT/LN 2'), bottom: U('FR/FA 2, FR/GR 1, FR/HC 2, FR/LC 2, FR/LN 7, FR/LT 2') },
    terrain: T('ford 6, forest 7, hill 18, rugged 4, town 3'), checksum: CS('1c03eacf', '8d82a9f1'),
  },
  '004': {
    name: 'Corunna', year: '1809', banners: 6, first: 'bottom', sides: { top: br('Moore', 5), bottom: fr('Soult', 5) },
    leaders: { top: L('Moore, Baird, Hope'), bottom: L('Mermet, Merle, De Laborde') },
    units: { top: U('BR/FA 1, BR/GG 1, BR/LC 1, BR/LN 6, BR/LT 2, BR/RI 1'), bottom: U('FR/FA 2, FR/HC 2, FR/LN 8, FR/LT 3') },
    terrain: T('ford 17, forest 5, hill 18, town 4'), checksum: CS('f393543f', '45af5d51'),
  },
  '005': {
    name: 'Talavera', year: '1809', banners: 7, first: 'bottom', sides: { top: br('Wellesley', 6), bottom: fr('King Joseph', 5) },
    leaders: { top: L('Sherbrooke, Mackenzie, Hill'), bottom: L('Ruffin, Sebastiani, Merlin') },
    units: { top: U('BR/FA 3, BR/GG 1, BR/GHC 1, BR/LC 3, BR/LN 6, BR/LT 1, BR/RI 1'), bottom: U('FR/FA 3, FR/HC 1, FR/LC 2, FR/LN 10, FR/LT 3') },
    terrain: T('brook 14, forest 3, hill 22, town 1', { hexes: 1, sides: 3 }), checksum: CS('708b40c0', 'c327087e'),
  },
  '006': {
    name: 'River Côa', year: '1810', banners: 6, first: 'top', sides: { top: ap('Craufurd', 4), bottom: fr('Ney', 4) },
    leaders: { top: L('Craufurd, Anson, Sydney'), bottom: L('Ferey, Loison, Mermet') },
    units: { top: U('BR/FA 1, BR/HA 2, BR/HC 1, BR/LC 1, BR/LN 3, BR/LT 1, BR/RI 2, PT/LT 2'), bottom: U('FR/FA 1, FR/GR 1, FR/HC 2, FR/LC 3, FR/LN 6, FR/LT 3') },
    terrain: T('bridge 1, forest 2, fortress 2, hill 9, river 5, windmill 1', { hexes: 2, sides: 6 }, 1), checksum: CS('67cfd287', '000b02b6'),
  },
  '007': {
    name: "Bussaco (Reynier's Assault)", year: '1810', banners: 6, first: 'bottom', sides: { top: ap('Wellington', 6), bottom: fr('Massena', 5) },
    leaders: { top: L('Spry, Champalimaud, Mackinnon'), bottom: L('Heudelet, Merle, Soult') },
    units: { top: U('BR/FA 1, BR/HC 1, BR/LN 3, BR/LT 1, PT/FA 1, PT/LN 5, PT/ML 1'), bottom: U('FR/FA 2, FR/HC 1, FR/LC 1, FR/LN 7, FR/LT 5') },
    terrain: T('ford 6, forest 5, hill 28, town 3'), checksum: CS('d966ac31', '5bdd2808'),
  },
  '008': {
    name: "Bussaco (Ney's Assault)", year: '1810', banners: 7, first: 'bottom', sides: { top: ap('Wellington', 6), bottom: fr('Massena', 5) },
    leaders: { top: L('Craufurd, Pack'), bottom: L('Marchand, Ferey, Simon') },
    units: { top: U('BR/FA 1, BR/GG 1, BR/HC 1, BR/LN 4, BR/LT 2, BR/RI 1, PT/LN 3, PT/LT 1'), bottom: U('FR/FA 2, FR/LC 2, FR/LN 10, FR/LT 3') },
    terrain: T('forest 17, hill 21, town 4'), checksum: CS('880ebc80', 'eaa98127'),
  },
  '009': {
    name: 'Combat at Redinha', year: '1811', banners: 6, first: 'top', sides: { top: ap('Wellington', 6), bottom: fr('Ney', 5) },
    leaders: { top: L('Picton, Cole, Erskine, Pack'), bottom: L('Mermet, Loison, Marchand') },
    units: { top: U('BR/FA 1, BR/GG 1, BR/GR 1, BR/HA 1, BR/LC 2, BR/LN 2, BR/LT 1, PT/LN 3, PT/LT 1'), bottom: U('FR/FA 1, FR/HA 1, FR/LC 1, FR/LN 7, FR/LT 1') },
    terrain: T('bridge 1, forest 9, hill 17, river 10, town 2', { hexes: 0, sides: 0 }, 1), checksum: CS('25061fac', '01bcfdf1'),
  },
  '010': {
    name: 'Salamanca (Attack on the French Left)', year: '1812', banners: 6, first: 'bottom', sides: { top: ap('Wellington', 6), bottom: fr('Marmont', 5) },
    leaders: { top: L('Campbell, Wallace, Power'), bottom: L('Thomières, Maucune') },
    units: { top: U('BR/FA 1, BR/LC 1, BR/LN 6, BR/LT 1, BR/RI 1, PT/HC 2, PT/LN 2, PT/LT 1'), bottom: U('FR/FA 2, FR/LC 3, FR/LN 7, FR/LT 1') },
    terrain: T('bridge 1, forest 3, hill 18, river 8, town 1', { hexes: 0, sides: 0 }, 1), checksum: CS('d9e06f92', '69bc4e66'),
  },
  '011': {
    name: 'Salamanca (Attack on the French Right)', year: '1812', banners: 6, first: 'top', sides: { top: br('Wellington', 6), bottom: fr('Marmont', 5) },
    leaders: { top: L('Alten, H. Campbell, Bock'), bottom: L('Ferey, Foy') },
    units: { top: U('BR/FA 1, BR/GG 2, BR/HA 1, BR/HC 2, BR/LC 2, BR/LN 7, BR/LT 1, BR/RI 1'), bottom: U('FR/FA 2, FR/LC 1, FR/LN 8, FR/LT 3') },
    terrain: T('bridge 1, fordNoStop 12, forest 2, hill 16, town 4', { hexes: 0, sides: 0 }, 1), checksum: CS('8cb430be', '37ebcf6d'),
  },
  '012': {
    name: 'García Hernández', year: '1812', banners: 6, first: 'bottom', sides: { top: br('Bock', 6), bottom: fr('Foy', 6) },
    leaders: { top: L('Anson, Bock, Gleichen'), bottom: L('Curto, Foy') },
    units: { top: U('BR/HC 4, BR/LC 6'), bottom: U('FR/FA 1, FR/HC 2, FR/LC 2, FR/LN 6, FR/LT 2') },
    terrain: T('forest 3, hill 6, town 2'), checksum: CS('7231464b', 'c5ff8ccf'),
  },
  '013': {
    name: 'Combat at Aire', year: '1814', banners: 6, first: 'top', sides: { top: ap('Hill', 6), bottom: fr('Clausel', 5) },
    leaders: { top: L('Buchan, Da Costa, Stewart'), bottom: L('Harispe, Villatte') },
    units: { top: U('BR/HA 2, BR/LN 4, BR/LT 1, PT/HC 1, PT/LC 1, PT/LN 5, PT/LT 2'), bottom: U('FR/FA 1, FR/HC 1, FR/LC 1, FR/LN 6, FR/LT 1, FR/ML 2') },
    terrain: T('bridge 2, ford 11, fordNoStop 1, forest 10, hill 14, town 2', { hexes: 0, sides: 0 }, 2), checksum: CS('3bfeb3b3', '9746ccb1'),
  },
  '014': {
    name: 'Quatre Bras', year: '1815', banners: 9, first: 'bottom', sides: { top: aa('Wellington', 6), bottom: fr('Ney', 5) },
    leaders: { top: L('Alten, Picton, Prince of Orange, Perponcher'), bottom: L('Kellermann, Foy, Bachelu') },
    units: { top: U('AL/FA 2, AL/LC 2, AL/LN 5, AL/LT 1, AL/ML 1, BR/FA 2, BR/GG 2, BR/LN 3, BR/RI 1'), bottom: U('FR/CU 2, FR/FA 3, FR/LC 1, FR/LN 9, FR/LT 2') },
    terrain: T('bridge 2, fordNoStop 8, forest 12, hill 12, town 2', { hexes: 0, sides: 0 }, 2), checksum: CS('62010539', '361c6ee3'),
  },
  '015': {
    name: 'Waterloo', year: '1815', banners: 8, first: 'bottom', sides: { top: aa('Wellington', 6), bottom: fr('Napoleon', 6) },
    leaders: { top: L("Hill, Picton, Perponcher"), bottom: L("d'Erlon, Reille, Ney") },
    units: { top: U('AL/LC 2, AL/LN 6, AL/LT 1, BR/FA 3, BR/GG 1, BR/GHC 1, BR/HC 1, BR/LN 4, BR/LT 1, BR/RI 1'), bottom: U('FR/CU 1, FR/FA 2, FR/GA 1, FR/GHC 1, FR/HA 1, FR/LC 2, FR/LN 8, FR/LT 1, FR/OG 1, FR/YG 1') },
    terrain: T('forest 8, hill 14, sandQuarry 1, town 3'), checksum: CS('0c9da556', 'ac0548a2'),
  },
};
