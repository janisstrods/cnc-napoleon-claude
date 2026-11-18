// Rules data of the 18 Spanish battles of Expansion #1 (RR §16.1–§16.18; armies and commanders from the plan's Decisions table).
// Top is the Allied side (nation SP or BR) and holds the guerrilla rule where in effect; bottom is the French (FR).
// Every map objective hex of design/data must be claimed here (the converter checks).
// The files are hidden from the picker until the Expansion #1 screens are ready (Plan 7C Task 17 flips EXP1_HIDDEN).
import type { Nation } from '../../src/engine/codes';
import type { BattleMeta } from './convert';

export const EXP1_HIDDEN = true;

type Obj = NonNullable<BattleMeta['objectives']>[number];
type Rule = NonNullable<BattleMeta['sideRules']>[number];

const top = (army: string, nation: Nation, commander: string, cards: number): BattleMeta['top'] => ({ army, nation, commander, cards });
const bottom = (commander: string, cards: number): BattleMeta['bottom'] => ({ army: 'French', nation: 'FR', commander, cards });
const guerrilla = (counters: number): Rule => ({ kind: 'guerrilla', side: 'top', counters });
const hexes = (...h: [number, number][]): [number, number][] => h;

/** One battle's meta, hidden while EXP1_HIDDEN holds. */
function battle(b: Omit<BattleMeta, 'hidden'>): BattleMeta {
  return { ...b, ...(EXP1_HIDDEN ? { hidden: true } : {}) };
}

const RIDGE_114 = hexes([2, 3], [3, 1], [3, 2], [3, 3], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4], [6, 3]);
const HILLS_117: Record<string, [number, number][]> = {
  left: hexes([1, 1], [2, 1], [2, 2], [3, 0], [3, 2], [4, 0]),
  centre: hexes([1, 6], [1, 7], [2, 4], [2, 5], [2, 6], [2, 8], [3, 6]),
  right: hexes([1, 10], [2, 11], [3, 9], [3, 10], [3, 11], [4, 12]),
};
const majority117: Obj[] = Object.entries(HILLS_117).flatMap(([name, h]): Obj[] => [
  { kind: 'majority', side: 'top', hexes: h, banners: 1, startHeld: true, text: `The Spanish hold the ${name} hills.` },
  { kind: 'majority', side: 'bottom', hexes: h, banners: 1, text: `The French hold the ${name} hills.` },
]);

export const EXP1_META: Readonly<Record<string, BattleMeta>> = {
  '101': battle({
    top: top('Spanish', 'SP', 'Castaños', 5), bottom: bottom('Dupont', 5), first: 'bottom', banners: 7, rivers: 'fordable',
    sideRules: [guerrilla(0), { kind: 'breakOnLosses', side: 'bottom', keys: ['FR/SWI'], losses: 2 }],
  }),
  '102': battle({
    top: top('Spanish', 'SP', 'Blake', 4), bottom: bottom('Lefebvre', 5), first: 'bottom', banners: 6, rivers: 'fordable',
    objectives: [{ kind: 'exitEdge', side: 'top', row: 0, free: 3, banners: 1, text: 'Spanish {unit} leaves by the Spanish baseline.' }],
    sideRules: [guerrilla(0)],
  }),
  '103': battle({ top: top('Spanish', 'SP', 'Belveder', 5), bottom: bottom('Soult', 6), first: 'bottom', banners: 6, rivers: 'fordable', sideRules: [guerrilla(1)] }),
  '104': battle({
    top: top('Spanish', 'SP', 'Blake', 5), bottom: bottom('Victor', 5), first: 'bottom', banners: 7, rivers: 'impassable',
    riverRules: { 'Shallow Stream': 'fordable', 'Shallow Stream (source)': 'fordable' }, sideRules: [guerrilla(1)],
  }),
  '105': battle({
    top: top('Spanish', 'SP', 'San Juan', 4), bottom: bottom('Napoleon', 6), first: 'bottom', banners: 7, rivers: 'none',
    leaderNames: { unlabelled: '' },   // the map's three Spanish leaders carry no name; '' gives the UI's unnamed fallback
    objectives: [{ kind: 'suddenDeath', side: 'bottom', keys: ['SP/FA'], text: 'Every Spanish battery is lost.' }],
    sideRules: [guerrilla(1)],
  }),
  '106': battle({
    top: top('Spanish', 'SP', 'Cuesta', 6), bottom: bottom('Victor', 5), first: 'top', banners: 6, rivers: 'impassable',
    sideRules: [guerrilla(1), { kind: 'handShrink', side: 'top', floor: 3 }, { kind: 'squareCap', side: 'top', units: 2 }],
  }),
  '107': battle({ top: top('Spanish', 'SP', 'Blake', 5), bottom: bottom('Suchet', 5), first: 'bottom', banners: 6, rivers: 'impassable', sideRules: [guerrilla(1)] }),
  '108': battle({ top: top('Spanish', 'SP', 'Blake', 5), bottom: bottom('Suchet', 5), first: 'top', banners: 6, rivers: 'none', sideRules: [guerrilla(1)] }),
  '109': battle({ top: top('Anglo-Spanish', 'SP', 'Cuesta', 5), bottom: bottom('Victor', 5), first: 'bottom', banners: 6, rivers: 'brook', sideRules: [guerrilla(1)] }),
  '110': battle({ top: top('Spanish', 'SP', 'Del Parque', 6), bottom: bottom('Marchand', 6), first: 'bottom', banners: 8, rivers: 'fordable', sideRules: [guerrilla(1)] }),
  '111': battle({ top: top('Spanish', 'SP', 'Freire', 5), bottom: bottom('Milhaud', 6), first: 'bottom', banners: 7, rivers: 'none', sideRules: [guerrilla(1)] }),
  '112': battle({ top: top('Spanish', 'SP', 'Areizaga', 4), bottom: bottom('Soult', 5), first: 'bottom', banners: 6, rivers: 'none', sideRules: [guerrilla(0)] }),
  '113': battle({
    top: top('Spanish', 'SP', 'Del Parque', 4), bottom: bottom('Kellermann', 5), first: 'bottom', banners: 6, rivers: 'impassable',
    objectives: [{ kind: 'tempHex', side: 'bottom', hex: [0, 6], timing: 'turnStart', banners: 1, text: 'The French hold the Tormes bridge.' }],
    sideRules: [guerrilla(0)],
  }),
  '114': battle({
    top: top('Anglo-Spanish', 'BR', 'Graham', 6), bottom: bottom('Victor', 5), first: 'bottom', banners: 7, rivers: 'impassable',
    objectives: [
      { kind: 'majority', side: 'top', hexes: RIDGE_114, banners: 1, startHeld: true, text: 'The Anglo-Spanish hold Barrosa Ridge.' },
      { kind: 'majority', side: 'bottom', hexes: RIDGE_114, banners: 1, text: 'The French hold Barrosa Ridge.' },
    ],
  }),
  '115': battle({
    top: top('Allied', 'BR', 'Beresford', 5), bottom: bottom('Soult', 5), first: 'bottom', banners: 8, rivers: 'fordable',
    objectives: [{ kind: 'tempAny', side: 'bottom', hexes: hexes([4, 9], [4, 10]), timing: 'turnStart', banners: 1, text: 'The French hold Albuera.' }],
    sideRules: [guerrilla(0), { kind: 'cavalryChargeFolly', side: 'top' }],
  }),
  '116': battle({ top: top('Allied', 'BR', 'Wellington', 5), bottom: bottom('King Joseph', 4), first: 'top', banners: 9, rivers: 'impassable', moveFirst: 'reveal' }),
  '117': battle({ top: top('Spanish', 'SP', 'Freire', 5), bottom: bottom('Soult', 5), first: 'bottom', banners: 8, rivers: 'fordable', objectives: majority117, sideRules: [guerrilla(1)] }),
  '118': battle({ top: top('Anglo-Spanish', 'BR', 'Adam', 5), bottom: bottom('Suchet', 6), first: 'bottom', banners: 6, rivers: 'impassable', sideRules: [guerrilla(1)] }),
};
