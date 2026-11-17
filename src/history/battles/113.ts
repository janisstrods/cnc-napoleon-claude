// 113 Alba de Tormes, 28 November 1809. Top: the Duke del Parque's Spanish Army of the Left; bottom: Kellermann's French cavalry, with Marchand's 6th Corps infantry arriving late.
// Drawn as in the scenario: Spaniards at the top, the Tormes along the top edge with its bridge, the French coming from the bottom. The orientation of the real river is not
// taken from the sources, so no north is given. Oman's account sets the order of the Spanish line; distances and unit places are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '113',
  date: '28 November 1809',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In October 1809 the Duke del Parque's Spanish Army of the Left won at Tamames, and Marchand's French 6th Corps fell back on Salamanca. When the main Spanish army was crushed at Ocaña on 19 November, Del Parque, unaware, was marching on Salamanca again; he heard of the disaster on the morning of 24 November.",
      "He at once gave up his conquests, fearing French reinforcements from Madrid, and retired towards the hills by way of Alba de Tormes. Kellermann, commanding in Old Castile, set off after him on 26 November with his cavalry, leaving the infantry and guns to follow.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of the Left',
      commanders: ['Duke del Parque (commanding)', 'Losada (division on the right)', 'Belveder and La Carrera (divisions on the left)'],
      strength: 'c. 32,000 in all, about 18,000 on the near bank when the charge came (Oman)',
      forces: 'Five infantry divisions, many of them raw Leonese levies, about 1,200 horse and some guns; two divisions were still across the Tormes.',
    },
    bottom: {
      name: 'French cavalry and 6th Corps',
      commanders: ['Kellermann (commanding)', 'Lorcet (chasseur and hussar brigade)', 'Marchand (6th Corps infantry)'],
      strength: 'Over 3,000 sabres at first, with the infantry ten miles behind (Oman)',
      forces: "Lorcet's chasseurs and hussars and six dragoon regiments; Marchand's leading infantry and guns came up after about two and a half hours.",
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[130, -10], [880, -10], [880, 72], [130, 72]], label: 'Upland beyond the river' },
      { kind: 'river', points: [[-30, 100], [250, 92], [500, 102], [760, 92], [1030, 100]], width: 16, label: 'Tormes' },
      { kind: 'town', at: [530, 140], size: 28, label: 'Alba de Tormes' },
      { kind: 'road', points: [[500, 60], [500, 100], [520, 125]], label: 'Bridge' },
      { kind: 'hills', points: [[640, 210], [840, 205], [850, 300], [650, 305]] },
      { kind: 'label', at: [745, 322], text: 'Rising ground' },
    ],
    units: [
      { id: 'losada', side: 'top', kind: 'infantry', label: 'Losada', w: 90, h: 28 },
      { id: 'belveder', side: 'top', kind: 'infantry', label: 'Belveder', w: 90, h: 28 },
      { id: 'carrera', side: 'top', kind: 'infantry', label: 'La Carrera', w: 90, h: 28 },
      { id: 'scav', side: 'top', kind: 'cavalry', label: 'Spanish cavalry', w: 90 },
      { id: 'sguns', side: 'top', kind: 'artillery', label: 'Battery', w: 44 },
      { id: 'ballas', side: 'top', kind: 'infantry', label: 'Ballasteros', w: 90, h: 28 },
      { id: 'castro', side: 'top', kind: 'infantry', label: 'Castrofuerte', w: 90, h: 28 },
      { id: 'lorcet', side: 'bottom', kind: 'cavalry', label: "Lorcet's brigade", w: 90 },
      { id: 'dragoons', side: 'bottom', kind: 'heavycavalry', label: 'Six dragoon regts', w: 110 },
      { id: 'marchand', side: 'bottom', kind: 'infantry', label: 'Marchand, guns', w: 100, h: 28 },
    ],
    phases: [
      {
        title: 'Caught in camp',
        caption: "On the afternoon of the 28th Kellermann finds the whole Spanish army around Alba. Ballasteros and Castrofuerte are over the river; the other three divisions, with the cavalry in front, hurry into line.",
        at: {
          ballas: [300, 45],
          castro: [700, 45],
          losada: [230, 215],
          belveder: [390, 215],
          carrera: [710, 250],
          scav: [440, 290],
          sguns: [350, 215],
          lorcet: [330, 520],
          dragoons: [540, 555],
        },
        arrows: [{ side: 'bottom', points: [[430, 590], [440, 540], [440, 500]] }],
      },
      {
        title: 'The cavalry charge',
        caption: "Without waiting for his infantry, Kellermann sends Lorcet in, followed by the dragoons in three lines. They scatter the Spanish horse, break Losada's division and part of Belveder's, and take a battery. The wrecks jam the bridge.",
        at: {
          lorcet: [330, 330],
          dragoons: [460, 345],
          losada: [270, 205],
          belveder: [410, 200],
        },
        broken: ['losada', 'scav'],
        gone: ['sguns'],
        arrows: [
          { side: 'bottom', points: [[330, 480], [320, 400], [300, 320]] },
          { side: 'bottom', points: [[470, 490], [470, 410], [440, 330], [330, 235]] },
          { side: 'top', points: [[360, 260], [430, 190], [500, 140]], style: 'rout' },
        ],
      },
      {
        title: 'The squares hold',
        caption: "La Carrera's division and the rest of Belveder's, in brigade squares on rising ground, beat off the charge but are cut off from the bridge. After about two and a half hours the French infantry arrive, and La Carrera retreats at dusk.",
        at: {
          carrera: [790, 270],
          belveder: [650, 225],
          lorcet: [520, 340],
          dragoons: [640, 345],
          marchand: [380, 430],
        },
        arrows: [
          { side: 'bottom', points: [[560, 380], [650, 330], [720, 295]] },
          { side: 'bottom', points: [[380, 520], [380, 470], [380, 450]] },
          { side: 'top', points: [[780, 245], [680, 180], [575, 140]], style: 'retreat' },
        ],
      },
      {
        title: 'Night and dispersal',
        caption: "Marchand's leading brigade storms Alba and takes two guns at a barricade. Del Parque slips away in the dark; by Oman's account panic then breaks up the three divisions that fought, and many of the unengaged Leonese go with them.",
        at: {
          marchand: [400, 195],
          lorcet: [480, 260],
          dragoons: [610, 285],
          ballas: [300, 45],
          castro: [700, 45],
        },
        gone: ['losada', 'belveder', 'carrera', 'scav'],
        arrows: [
          { side: 'bottom', points: [[400, 400], [450, 280], [490, 200]] },
          { side: 'top', points: [[350, 60], [200, 15]], style: 'rout' },
          { side: 'top', points: [[650, 60], [800, 15]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: "French victory: the Army of the Left scattered",
    losses: "Spanish about 3,000 killed or taken, five flags and nine guns; French under 300 (Oman, who counts 4 officers killed and 14 wounded).",
    text: [
      "The army rallied in the hills behind Tamames: some 20,000 within ten or twelve days, without guns, says Napier, while Oman counts 26,000 after a month. Left to winter in the Sierra de Gata, it lost about 9,000 more men to fever, dysentery and hunger by mid-January 1810.",
      "Oman blames Del Parque for dividing his army with a river behind it, yet calls Kellermann's unsupported charge a reckless stroke that no one could have foreseen. Neither commander, he adds, was entitled to expect such an outcome.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 3 (1908), Section XVII, ch. IV, pp. 97–102 (Internet Archive scan pagination)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 3 (Boone edition, title page 1831; Internet Archive scan), Book IX, ch. VI, pp. 86–89',
  ],
};

export default history;
