// Rules data of the 15 base battles (RR §14, §14.1–§14.15; armies and commanders from design/survey.md §1).
// Top is the British side (nation BR), bottom the French (FR); mixed armies (PT, AL rows) come from the unit keys, not the nation.
// Every map objective hex of design/data must be claimed here (the converter checks).
import type { BattleMeta } from './convert';

const top = (army: string, commander: string, cards: number): BattleMeta['top'] => ({ army, nation: 'BR', commander, cards });
const bottom = (commander: string, cards: number): BattleMeta['bottom'] => ({ army: 'French', nation: 'FR', commander, cards });
const tempHex = (side: 'top' | 'bottom', r: number, c: number, text: string): NonNullable<BattleMeta['objectives']>[number] =>
  ({ kind: 'tempHex', side, hex: [r, c], timing: 'turnStart', banners: 1, text });
// Oman's spelling, house style of the histories (src/history/battles/001.ts:24); design/data keeps "(unnamed)".
const BRENNIER = { '(unnamed)': 'Brennier' };

export const BASE_META: Readonly<Record<string, BattleMeta>> = {
  '001': {
    top: top('Anglo-Portuguese', 'Wellesley', 6), bottom: bottom('Delaborde', 5), first: 'top', banners: 5, rivers: 'fordable',
    objectives: [tempHex('top', 8, 2, 'Anglo-Portuguese hold a hill on the French baseline.'), tempHex('top', 8, 11, 'Anglo-Portuguese hold a hill on the French baseline.')],
    leaderNames: BRENNIER,
  },
  '002': { top: top('Anglo-Portuguese', 'Wellesley', 6), bottom: bottom('Delaborde', 5), first: 'top', banners: 5, rivers: 'none', leaderNames: BRENNIER },
  '003': {
    top: top('Anglo-Portuguese', 'Wellesley', 6), bottom: bottom('Junot', 5), first: 'bottom', banners: 6, rivers: 'fordable',
    objectives: [{ kind: 'tempGroup', side: 'bottom', hexes: [[1, 3], [1, 4]], timing: 'turnStart', banners: 2, text: 'The French hold Vimiero.' }],
  },
  '004': { top: top('British', 'Moore', 5), bottom: bottom('Soult', 5), first: 'bottom', banners: 6, rivers: 'fordable' },
  '005': { top: top('British', 'Wellesley', 6), bottom: bottom('King Joseph', 5), first: 'bottom', banners: 7, rivers: 'brook' },
  '006': {
    top: top('Anglo-Portuguese', 'Craufurd', 4), bottom: bottom('Ney', 4), first: 'top', banners: 6, rivers: 'impassable',
    objectives: [{ kind: 'exit', side: 'top', hex: [0, 4], banners: 1, leadersScore: false, retreatOff: false, text: 'Anglo-Portuguese {unit} crosses the Côa bridge.' }],
    sideRules: [{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }],
  },
  '007': { top: top('Anglo-Portuguese', 'Wellington', 6), bottom: bottom('Massena', 5), first: 'bottom', banners: 6, rivers: 'fordable' },
  '008': { top: top('Anglo-Portuguese', 'Wellington', 6), bottom: bottom('Massena', 5), first: 'bottom', banners: 7, rivers: 'none' },
  '009': { top: top('Anglo-Portuguese', 'Wellington', 6), bottom: bottom('Ney', 5), first: 'top', banners: 6, rivers: 'impassable' },
  '010': { top: top('Anglo-Portuguese', 'Wellington', 6), bottom: bottom('Marmont', 5), first: 'bottom', banners: 6, rivers: 'impassable' },
  '011': { top: top('British', 'Wellington', 6), bottom: bottom('Marmont', 5), first: 'top', banners: 6, rivers: 'fordableNoStop' },
  '012': {
    top: top('British', 'Bock', 6), bottom: bottom('Foy', 6), first: 'bottom', banners: 6, rivers: 'none',
    objectives: [{ kind: 'killWeight', side: 'top', enemyArm: 'infantry', first: 1, later: 2 }],
    squares: [{ r: 3, c: 8, slot: 1 }, { r: 3, c: 9, slot: 2 }],
  },
  '013': {
    top: top('Anglo-Portuguese', 'Hill', 6), bottom: bottom('Clausel', 5), first: 'top', banners: 6, rivers: 'fordable',
    objectives: [tempHex('top', 7, 0, 'Anglo-Portuguese hold Nauzeilles.'), tempHex('top', 8, 11, 'Anglo-Portuguese hold the Seminary.')],
  },
  '014': {
    top: top('Anglo-Allied', 'Wellington', 6), bottom: bottom('Ney', 5), first: 'bottom', banners: 9, rivers: 'fordableNoStop',
    objectives: [tempHex('bottom', 1, 5, 'The French hold Quatre Bras.')],
  },
  '015': {
    top: top('Anglo-Allied', 'Wellington', 6), bottom: bottom('Napoleon', 6), first: 'bottom', banners: 8, rivers: 'none',
    objectives: [
      tempHex('bottom', 3, 5, 'The French hold La Haye Sainte.'), tempHex('bottom', 4, 1, 'The French hold Hougoumont.'),
      tempHex('bottom', 4, 12, 'The French hold Papelotte.'),
    ],
    sideRules: [{ kind: 'impetuousCavalry', side: 'top', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] }],
  },
};
