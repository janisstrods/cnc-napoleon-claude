// Expected setup of the Spanish battles 101–118 (Expansion #1), in the format of manifest.ts.
// Units follow design/exp1-survey.md §2.1 (checked against the data when this was written) and design/data; every unit starts at its row's
// card strength (S41). Leaders are in file order. `terrain` and `checksum` fingerprint the board (see checksum.ts).
import type { Nation, RowKey } from '../../src/engine/codes';
import type { Checksums, TerrainTally } from './checksum';
import type { BattleManifest } from './manifest';

const counts = (s: string): Record<string, number> => Object.fromEntries(s.split(', ').map((x) => { const [k, n] = x.split(' '); return [k, Number(n)]; }));
const U = (s: string) => counts(s) as Partial<Record<RowKey, number>>;
const T = (s: string, works = { hexes: 0, sides: 0 }, bridges = 0): TerrainTally => ({ types: counts(s) as TerrainTally['types'], works, bridges });
const L = (s: string) => s.split(', ');
const CS = (terrain: string, pieces: string): Checksums => ({ terrain, pieces });
const side = (army: string, nation: Nation, commander: string, cards: number): BattleManifest['sides']['top'] => ({ army, nation, commander, cards });

export const MANIFEST_EXP1: Record<string, BattleManifest> = {
  '101': {
    name: 'Bailén', year: '1808', banners: 7, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Castaños', 5), bottom: side('French', 'FR', 'Dupont', 5) },
    leaders: { top: L('Reding, Coupigny'), bottom: L('Schramm, Chabert, Pannetier') },
    units: { top: U('SP/FA 2, SP/GR 1, SP/HC 2, SP/LC 2, SP/LN 5, SP/LT 2, SP/SWI 2'), bottom: U('FR/CU 1, FR/FA 2, FR/GR 1, FR/HC 1, FR/LC 2, FR/LN 4, FR/ML 2, FR/SWI 4') },
    terrain: T('ford 7, forest 7, hill 18'), checksum: CS('da23ba9a', '048b97a6'),
  },
  '102': {
    name: 'Zornoza', year: '1808', banners: 6, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Blake', 4), bottom: side('French', 'FR', 'Lefebvre', 5) },
    leaders: { top: L('Riquelme, Carbajal, Mendizabal, Ray'), bottom: L('Leval, Villatte, Sebastiani') },
    units: { top: U('SP/FA 1, SP/GR 2, SP/LN 9, SP/LT 3'), bottom: U('FR/FA 2, FR/LN 14') },
    terrain: T('bridge 1, ford 9, forest 6, hill 29', { hexes: 0, sides: 0 }, 1), checksum: CS('e4c7de70', 'c43db887'),
  },
  '103': {
    name: 'Gamonal', year: '1808', banners: 6, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Belveder', 5), bottom: side('French', 'FR', 'Soult', 6) },
    leaders: { top: L('Henestrosa, De Alos'), bottom: L('Milhaud, Lasalle, Mouton') },
    units: { top: U('SP/FA 2, SP/GR 2, SP/HC 1, SP/LC 3, SP/LN 5, SP/ML 1'), bottom: U('FR/FA 2, FR/HA 1, FR/HC 3, FR/LC 2, FR/LN 6, FR/LT 2, FR/ML 1') },
    terrain: T('ford 9, forest 8, town 3'), checksum: CS('e3724ca5', '56cf36f2'),
  },
  '104': {
    name: 'Espinosa de los Monteros', year: '1808', banners: 7, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Blake', 5), bottom: side('French', 'FR', 'Victor', 5) },
    leaders: { top: L('Romana, Blake, Acevedo'), bottom: L('Ruffin, Villatte, Lapisse') },
    units: { top: U('SP/FA 2, SP/GR 2, SP/LC 2, SP/LN 6, SP/LT 2, SP/ML 3'), bottom: U('FR/FA 2, FR/HA 1, FR/LC 2, FR/LN 10, FR/LT 2') },
    terrain: T('ford 4, forest 11, hill 11, river 6, town 4'), checksum: CS('bced714e', '5b40497e'),
  },
  '105': {
    name: 'Somosierra', year: '1808', banners: 7, first: 'bottom', sides: { top: side('Spanish', 'SP', 'San Juan', 4), bottom: side('French', 'FR', 'Napoleon', 6) },
    leaders: { top: L('unlabelled, unlabelled, unlabelled'), bottom: L('Pires, Ruffin') },
    units: { top: U('SP/FA 3, SP/GR 2, SP/LC 2, SP/LN 9, SP/LT 1'), bottom: U('FR/GA 1, FR/GLC 2, FR/LC 2, FR/LN 7, FR/LT 3') },
    terrain: T('forest 7, hill 13', { hexes: 1, sides: 4 }), checksum: CS('fab0343f', '1028ef00'),
  },
  '106': {
    name: 'Medellín', year: '1809', banners: 6, first: 'top', sides: { top: side('Spanish', 'SP', 'Cuesta', 6), bottom: side('French', 'FR', 'Victor', 5) },
    leaders: { top: L('Trias, Henestrosa, Albuquerque'), bottom: L('Lasalle, Latour-Maubourg, Villatte, Ruffin') },
    units: { top: U('SP/FA 3, SP/GR 2, SP/HC 1, SP/LC 3, SP/LN 6, SP/LT 1'), bottom: U('FR/FA 1, FR/HA 2, FR/HC 1, FR/LC 2, FR/LN 6, FR/LT 3') },
    terrain: T('bridge 1, hill 14, river 10, town 1', { hexes: 0, sides: 0 }, 1), checksum: CS('c11a3ddd', 'd773bddd'),
  },
  '107': {
    name: 'Alcañiz', year: '1809', banners: 6, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Blake', 5), bottom: side('French', 'FR', 'Suchet', 5) },
    leaders: { top: L('Roca, Areizaga, Lazan'), bottom: L('Laval, Musnier, Wathier') },
    units: { top: U('SP/FA 3, SP/LC 2, SP/LN 8, SP/LT 1'), bottom: U('FR/CU 1, FR/FA 2, FR/LC 1, FR/LN 9') },
    terrain: T('bridge 1, hill 28, river 3', { hexes: 0, sides: 0 }, 1), checksum: CS('9c25e009', '7a1956e0'),
  },
  '108': {
    name: 'María', year: '1809', banners: 6, first: 'top', sides: { top: side('Spanish', 'SP', 'Blake', 5), bottom: side('French', 'FR', 'Suchet', 5) },
    leaders: { top: L('Lazan, Roca'), bottom: L('Musnier, Habert, Wathier') },
    units: { top: U('SP/FA 2, SP/GR 1, SP/LC 2, SP/LN 7, SP/LT 2'), bottom: U('FR/CU 1, FR/FA 2, FR/LC 2, FR/LN 8, FR/LT 1') },
    terrain: T('hill 27, town 1'), checksum: CS('e24adf63', '27d285ee'),
  },
  '109': {
    name: 'Talavera (Spanish Flank)', year: '1809', banners: 6, first: 'bottom', sides: { top: side('Anglo-Spanish', 'SP', 'Cuesta', 5), bottom: side('French', 'FR', 'Victor', 5) },
    leaders: { top: L('Cuesta, Campbell'), bottom: L('Leval, Sebastiani, Milhaud') },
    units: { top: U('BR/FA 1, BR/GG 1, BR/LN 2, SP/FA 3, SP/GR 1, SP/HC 1, SP/LC 3, SP/LN 6, SP/LT 2'), bottom: U('FR/FA 3, FR/HA 1, FR/HC 3, FR/LC 1, FR/LN 7, FR/LT 2') },
    terrain: T('brook 5, forest 8, town 3', { hexes: 2, sides: 6 }), checksum: CS('1672d02c', '7da25a8f'),
  },
  '110': {
    name: 'Tamames', year: '1809', banners: 8, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Del Parque', 6), bottom: side('French', 'FR', 'Marchand', 6) },
    leaders: { top: L('Belveder, Anglona, La Carrera, Losada'), bottom: L('Maucune, Marcognet, Labassee, Lorcet') },
    units: { top: U('SP/FA 3, SP/GR 2, SP/HC 2, SP/LC 3, SP/LN 12, SP/LT 3'), bottom: U('FR/FA 2, FR/HA 1, FR/HC 1, FR/LC 3, FR/LN 9, FR/LT 3') },
    terrain: T('ford 4, forest 2, hill 15, town 3'), checksum: CS('190e0a1b', 'ee631cbc'),
  },
  '111': {
    name: 'Ocaña (Cavalry Action)', year: '1809', banners: 7, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Freire', 5), bottom: side('French', 'FR', 'Milhaud', 6) },
    leaders: { top: L('Rivas, Bernuy'), bottom: L('Paris, Milhaud') },
    units: { top: U('SP/CU 1, SP/HC 5, SP/LC 7'), bottom: U('FR/HA 2, FR/HC 5, FR/LC 5') },
    terrain: T('forest 5, hill 4'), checksum: CS('c2c1b25e', '354dab1f'),
  },
  '112': {
    name: 'Ocaña', year: '1809', banners: 6, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Areizaga', 4), bottom: side('French', 'FR', 'Soult', 5) },
    leaders: { top: L('Zerain, Freire, Zayas, Giron'), bottom: L('Leval, Milhaud, Dessolles, Girard') },
    units: { top: U('SP/FA 1, SP/GR 1, SP/HC 1, SP/LC 2, SP/LN 9, SP/LT 1'), bottom: U('FR/FA 1, FR/HC 2, FR/LN 8, FR/LNC 1, FR/LT 2') },
    terrain: T('forest 8, town 3'), checksum: CS('d354eaf0', '73748f48'),
  },
  '113': {
    name: 'Alba de Tormes', year: '1809', banners: 6, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Del Parque', 4), bottom: side('French', 'FR', 'Kellermann', 5) },
    leaders: { top: L('Losada, Salvador'), bottom: L('Lorcet, Kellermann') },
    units: { top: U('SP/FA 1, SP/LC 3, SP/LN 7, SP/ML 3'), bottom: U('FR/HC 6, FR/LC 3') },
    terrain: T('bridge 1, forest 5, hill 6, river 10', { hexes: 0, sides: 0 }, 1), checksum: CS('2b8ed24c', 'd7a095a6'),
  },
  '114': {
    name: 'Barrosa', year: '1811', banners: 7, first: 'bottom', sides: { top: side('Anglo-Spanish', 'BR', 'Graham', 6), bottom: side('French', 'FR', 'Victor', 5) },
    leaders: { top: L('Graham, Wheatley, Dilkes, Lardizabal'), bottom: L('Villatte, Ruffin, Leval') },
    units: { top: U('BR/FA 1, BR/GG 2, BR/LC 1, BR/LN 5, BR/LT 1, BR/RI 1, PT/LN 1, SP/LN 4'), bottom: U('FR/FA 2, FR/GR 3, FR/HC 1, FR/LN 6, FR/LT 4') },
    terrain: T('forest 12, hill 13, river 5, town 1'), checksum: CS('8151635d', 'c665b4da'),
  },
  '115': {
    name: 'Albuera', year: '1811', banners: 8, first: 'bottom', sides: { top: side('Allied', 'BR', 'Beresford', 5), bottom: side('French', 'FR', 'Soult', 5) },
    leaders: { top: L('Cole, Stewart, Blake, Harvey'), bottom: L('Girard, Gazan, Werle, Godinot') },
    units: { top: U('BR/FA 1, BR/HA 1, BR/HC 1, BR/LN 5, BR/LT 2, PT/LC 1, PT/LN 2, PT/LT 1, SP/GR 1, SP/LC 1, SP/LN 3, SP/LT 1'), bottom: U('FR/FA 2, FR/GR 1, FR/HC 1, FR/LC 1, FR/LN 8, FR/LNC 1, FR/LT 3') },
    terrain: T('bridge 1, ford 9, fordNoStop 4, forest 3, hill 14, town 2', { hexes: 0, sides: 0 }, 1), checksum: CS('9f259a6c', 'c552180d'),
  },
  '116': {
    name: 'Vitoria', year: '1813', banners: 9, first: 'top', sides: { top: side('Allied', 'BR', 'Wellington', 5), bottom: side('French', 'FR', 'King Joseph', 4) },
    leaders: { top: L('Ashworth, Kempt, Morillo, Stewart'), bottom: L('Leval, Conroux, Daricau, Villatte') },
    units: { top: U('BR/FA 1, BR/HC 1, BR/LC 2, BR/LN 7, BR/LT 1, BR/RI 1, PT/FA 1, PT/LN 3, PT/LT 1, SP/FA 1, SP/LN 3'), bottom: U('FR/FA 3, FR/HA 1, FR/LC 2, FR/LN 8, FR/LT 4, FR/ML 2') },
    terrain: T('bridge 2, hill 31, river 9, town 3', { hexes: 0, sides: 0 }, 2), checksum: CS('3bbe408e', '0b57a9d4'),
  },
  '117': {
    name: 'San Marcial', year: '1813', banners: 8, first: 'bottom', sides: { top: side('Spanish', 'SP', 'Freire', 5), bottom: side('French', 'FR', 'Soult', 5) },
    leaders: { top: L('Del Barco, Losada, Porlier'), bottom: L('Reille, Villatte, Lamartiniere') },
    units: { top: U('SP/FA 2, SP/GR 2, SP/LN 6, SP/LT 2, SP/ML 1'), bottom: U('FR/FA 2, FR/LN 9, FR/LT 2, FR/ML 2') },
    terrain: T('ford 11, forest 11, hill 24'), checksum: CS('3ec68393', '74cd9ae2'),
  },
  '118': {
    name: 'Ordal Cross', year: '1813', banners: 6, first: 'bottom', sides: { top: side('Anglo-Spanish', 'BR', 'Adam', 5), bottom: side('French', 'FR', 'Suchet', 6) },
    leaders: { top: L('Reeves, Torres, Adam'), bottom: L('Mesclop, Harispe, Habert') },
    units: { top: U('BR/FA 1, BR/LC 2, BR/LN 5, BR/RI 1, SP/GR 1, SP/LC 1, SP/LN 5'), bottom: U('FR/FA 1, FR/LC 2, FR/LN 11, FR/LT 2') },
    terrain: T('bridge 1, forest 13, hill 19, river 2', { hexes: 3, sides: 9 }, 1), checksum: CS('2cdbe20a', '6a6ebc68'),
  },
};
