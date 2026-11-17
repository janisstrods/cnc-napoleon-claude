// 110 Tamames, 18 October 1809. Top: Del Parque's Spanish Army of the Left; bottom: Marchand's French 6th Corps.
// Schematic. The Spaniards hold the heights above Tamames, Losada on their right (the viewer's left, on the steeper ground), La Carrera on the left, Belveder behind;
// the French come up from Salamanca, which lay to the north-east, so north points down and to the right (the scenario map has the same layout).
// Distances, the stream and unit places are indicative only.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '110',
  date: '18 October 1809',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "After Talavera the Spanish Central Junta planned a double offensive for the autumn. Areizaga's army was to march on Madrid from La Mancha, while Del Parque's Army of the Left, gathered at Ciudad Rodrigo, was to clear León and Old Castile. Wellington refused to lend Portuguese troops to the northern thrust.",
      "Del Parque moved up to Tamames on 5 October with his Galician divisions. Marchand, who held Salamanca with the 6th Corps now that Ney had left Spain, marched out on 17 October and found the Spaniards drawn up on the heights above the village.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of the Left',
      commanders: ['Duque del Parque (commanding)', 'Martín de la Carrera (vanguard)', 'Losada and Belveder (divisions)', 'Prince of Anglona (cavalry)'],
      strength: 'About 20,000 foot, 1,000–1,500 horse, 18 guns (Oman); Napier gives 1,000 horse',
      forces: "Raw Galician divisions on a hill, Belveder's reserve behind La Carrera, Anglona's weak cavalry on the left. Ballesteros's Asturians had not yet come up.",
    },
    bottom: {
      name: 'French 6th Corps',
      commanders: ['Marchand (commanding)', 'Maucune, Marcognet and Labassée (brigades)', 'Lorcet (cavalry)'],
      strength: 'About 12,000 foot, 1,200 horse, 14 guns (Oman); Napier gives 11,000 men',
      forces: 'Nineteen battalions of old regiments from the army of Germany, with hussars, chasseurs and dragoons; two battalions stayed in Salamanca.',
    },
  },
  map: {
    north: 135,
    terrain: [
      { kind: 'hills', points: [[20, 110], [560, 100], [700, 150], [760, 285], [560, 292], [330, 280], [20, 290]] },
      { kind: 'woods', points: [[880, 330], [990, 320], [995, 400], [900, 410]] },
      { kind: 'river', points: [[330, 400], [250, 470], [175, 545], [150, 650]], width: 9, label: 'Stream (fordable)' },
      { kind: 'woods', points: [[110, 330], [205, 322], [225, 395], [120, 405]] },
      { kind: 'road', points: [[480, 400], [640, 460], [820, 560], [900, 650]], label: 'To Salamanca' },
      { kind: 'town', at: [470, 385], size: 30, label: 'Tamames' },
      { kind: 'label', at: [200, 80], text: 'Heights above Tamames' },
    ],
    units: [
      { id: 'losada', side: 'top', kind: 'infantry', label: 'Losada (right)', w: 120, h: 30 },
      { id: 'sguns', side: 'top', kind: 'artillery', label: 'Two batteries', w: 46 },
      { id: 'village', side: 'top', kind: 'light', label: 'Light troops', w: 60 },
      { id: 'carrera', side: 'top', kind: 'infantry', label: 'La Carrera (left)', w: 120, h: 30 },
      { id: 'cguns', side: 'top', kind: 'artillery', label: "La Carrera's guns", w: 46 },
      { id: 'belveder', side: 'top', kind: 'infantry', label: 'Belveder (reserve)', w: 110, h: 30 },
      { id: 'anglona', side: 'top', kind: 'cavalry', label: 'Anglona', w: 70 },
      { id: 'lt25', side: 'bottom', kind: 'light', label: '25th Léger', w: 70 },
      { id: 'marcognet', side: 'bottom', kind: 'infantry', label: 'Marcognet (39th, 76th)', w: 120, h: 30 },
      { id: 'labassee', side: 'bottom', kind: 'infantry', label: 'Labassée (27th, 59th)', w: 110, h: 30 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'French guns', w: 46 },
      { id: 'maucune', side: 'bottom', kind: 'infantry', label: 'Maucune (6th, 69th)', w: 120, h: 30 },
      { id: 'lorcet', side: 'bottom', kind: 'cavalry', label: 'Lorcet (hussars)', w: 70 },
      { id: 'dragoons', side: 'bottom', kind: 'heavycavalry', label: 'Dragoons', w: 64 },
    ],
    phases: [
      {
        title: 'Marchand finds Del Parque',
        caption: "Marchand reaches Tamames after a long march and attacks at once. Maucune's brigade and the cavalry swing right to take the Spanish left in flank, while Marcognet and the 25th Léger prepare to press the centre and the Spanish right.",
        at: {
          losada: [250, 215],
          sguns: [380, 232],
          village: [450, 355],
          carrera: [620, 205],
          cguns: [715, 232],
          belveder: [610, 105],
          anglona: [865, 245],
          lt25: [110, 480],
          marcognet: [400, 495],
          labassee: [520, 545],
          fguns: [620, 545],
          maucune: [700, 480],
          lorcet: [850, 480],
          dragoons: [790, 550],
        },
        arrows: [{ side: 'bottom', points: [[720, 465], [850, 430], [840, 340]] }],
      },
      {
        title: "Maucune breaks the Spanish left",
        caption: "Lorcet's horse charge into La Carrera's line and take its divisional guns, and Anglona's cavalry flee from squares of the 69th. Belveder's reserve takes in the broken men and halts Maucune on the slope.",
        at: {
          maucune: [770, 340],
          lorcet: [690, 300],
          dragoons: [820, 410],
          carrera: [620, 215],
          belveder: [590, 115],
          anglona: [890, 150],
        },
        broken: ['anglona'],
        arrows: [
          { side: 'bottom', points: [[780, 450], [770, 380], [720, 320]] },
          { side: 'top', points: [[860, 250], [890, 190], [905, 120]], style: 'rout' },
        ],
      },
      {
        title: "Marcognet's brigade is repulsed",
        caption: "Marcognet's two regiments halt part-way up the steep slope under the fire of two batteries and Losada's line, then recoil in disorder. Losada's men and the light troops from Tamames pursue them to the foot of the hill. The 25th Léger do not press home.",
        at: {
          marcognet: [350, 345],
          lt25: [110, 450],
          losada: [270, 255],
          village: [455, 420],
          labassee: [500, 480],
        },
        broken: ['marcognet'],
        arrows: [
          { side: 'bottom', points: [[390, 480], [370, 420], [355, 360]] },
          { side: 'top', points: [[295, 270], [325, 320], [350, 350]] },
        ],
      },
      {
        title: 'Marchand retires',
        caption: "Maucune withdraws under cover of his cavalry; Labassée's two regiments cover Marcognet's rout. Marchand falls back on Salamanca, having lost 1,300 or more. Del Parque halts his pursuit before the French reserves.",
        at: {
          maucune: [740, 410],
          lorcet: [850, 385],
          dragoons: [800, 480],
          marcognet: [470, 550],
          lt25: [120, 530],
          labassee: [630, 515],
          fguns: [720, 575],
          village: [455, 370],
          losada: [250, 225],
        },
        arrows: [
          { side: 'bottom', points: [[770, 450], [830, 520], [880, 590]], style: 'retreat' },
          { side: 'bottom', points: [[470, 515], [560, 480], [640, 470]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Spanish victory; the 6th Corps repulsed',
    losses: "French 1,300–1,400 (Marchand reported 1,300), including General Lorcet wounded; Spaniards 713 killed and wounded (Oman). The 76th lost its eagle.",
    text: [
      "Oman called it the first general action since Bailén in which the Spaniards won clearly, and gave much of the credit to the ground, to Del Parque's seven-to-four superiority and to Ney's absence. Napier credited the recovery of the left to La Carrera, Mendizábal and the duke.",
      "Marchand fell back to Salamanca on 19 October and abandoned it a few days later. Del Parque, joined by Ballesteros, entered it on about 24–25 October, then withdrew to the hills. He was caught and beaten at Alba de Tormes at the end of November, after Ocaña (111, 112) had wrecked the southern army.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 3 (Oxford, 1908; Internet Archive scan), section XVII, ch. 4, pp. 75–81 (Tamames; losses, p. 79 and appendix IV, p. 528); Alba de Tormes, pp. 98–101',
    "W. F. P. Napier, History of the War in the Peninsula, vol. 3 (1831), Book IX [as headed in that volume], ch. IV, pp. 64–66 (Tamames); ch. VI, pp. 86–89 (Alba de Tormes)",
  ],
};

export default history;
