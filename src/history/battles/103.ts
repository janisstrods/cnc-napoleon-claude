// 103 Gamonal, 10 November 1808. Top: Belvedere's Spanish Army of Estremadura; bottom: Soult's French 2nd Corps with Lasalle's and Milhaud's cavalry.
// North is to the right: Burgos lies to the west (top), the French come from the east (bottom). The Arlanzón guards the Spanish right (left of the map).
// The wood and the exact lines are schematic; Bessières's cavalry on the Madrid road and the guns' exact places are not shown.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '103',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "Napoleon reached Vitoria on 6 November 1808, ready to drive through the centre of the Spanish line. Burgos lay on the road to Madrid. Marshal Bessières had been slow to advance on it, and on 9 November Soult arrived to take over the 2nd Corps.",
      "The Spanish force in front of him was the Army of Estremadura, commanded since 2 November by the young Count of Belvedere, a nobleman with no battlefield experience. Instead of using Burgos's defences, he marched out and drew up in the open before Gamonal, with the Arlanzón on his right and his left near Vellimar.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of Estremadura',
      commanders: ['Count of Belvedere (commanding)', 'De Alós (1st Division)', 'Henestrosa (2nd Division)'],
      strength: 'About 8,600 foot, 1,100 horse, 16 guns (Oman); Napier gives 11,150 foot and 30 guns',
      forces: 'Estremaduran line and Royal Guards battalions in two lines, three cavalry regiments and two batteries in the centre.',
    },
    bottom: {
      name: 'French 2nd Corps',
      commanders: ['Marshal Soult (commanding)', 'Mouton (infantry)', 'Lasalle (light cavalry)', 'Milhaud (dragoons)'],
      strength: 'Nearly 5,000 horse and Mouton’s twelve battalions engaged (Oman); Merle and Bonnet stayed back',
      forces: 'Lasalle’s light cavalry and Milhaud’s dragoons, with Mouton’s division; two more infantry divisions were not needed.',
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'river', points: [[110, -20], [125, 150], [105, 300], [120, 460], [110, 620]], width: 18, label: 'Arlanzón' },
      { kind: 'woods', points: [[220, 340], [520, 330], [800, 350], [790, 420], [520, 430], [240, 420]] },
      { kind: 'road', points: [[480, 20], [480, 220], [490, 400], [500, 640]] },
      { kind: 'town', at: [480, 20], size: 20, label: 'Burgos' },
      { kind: 'town', at: [480, 72], size: 18, label: 'Gamonal' },
      { kind: 'town', at: [880, 200], size: 18, label: 'Vellimar' },
    ],
    units: [
      { id: 'line1', side: 'top', kind: 'infantry', label: 'First line', w: 110, h: 26 },
      { id: 'guards', side: 'top', kind: 'guard', label: 'Royal Guards', w: 70, h: 24 },
      { id: 'line2', side: 'top', kind: 'infantry', label: 'Second line', w: 100, h: 26 },
      { id: 'gunsS', side: 'top', kind: 'artillery', label: 'Two batteries', w: 54 },
      { id: 'cavR', side: 'top', kind: 'cavalry', label: 'Cavalry (right)', w: 76, h: 24 },
      { id: 'cavL', side: 'top', kind: 'cavalry', label: 'Cavalry (left)', w: 76, h: 24 },
      { id: 'mouton', side: 'bottom', kind: 'infantry', label: 'Mouton', w: 100, h: 26 },
      { id: 'lasalle', side: 'bottom', kind: 'cavalry', label: 'Lasalle', w: 90, h: 24 },
      { id: 'milhaud', side: 'bottom', kind: 'heavycavalry', label: 'Milhaud', w: 90, h: 24 },
      { id: 'merle', side: 'bottom', kind: 'infantry', label: 'Merle (rear)', w: 90, h: 26 },
      { id: 'bonnet', side: 'bottom', kind: 'infantry', label: 'Bonnet (rear)', w: 90, h: 26 },
    ],
    phases: [
      {
        title: 'Belvedere draws up',
        caption: 'Belvedere forms in the open before Gamonal: six battalions in the first line with a cavalry regiment on each flank and two batteries in the centre, four more battalions behind. A wood in front hides the French advance.',
        at: {
          line1: [480, 220],
          guards: [610, 212],
          line2: [480, 160],
          gunsS: [400, 235],
          cavR: [230, 222],
          cavL: [760, 222],
          mouton: [640, 500],
          lasalle: [430, 520],
          milhaud: [200, 540],
          merle: [780, 572],
          bonnet: [910, 572],
        },
      },
      {
        title: 'Cavalry sweep the plain',
        caption: 'Milhaud’s dragoons ride to the river on the Spanish right and Lasalle’s light cavalry forms the centre as Mouton’s twelve battalions advance through the wood. Nearly 5,000 horse ride over five battalions, which have no time to form square.',
        at: {
          mouton: [640, 400],
          lasalle: [430, 330],
          milhaud: [200, 330],
          cavR: [230, 240],
        },
        broken: ['cavR'],
        arrows: [
          { side: 'bottom', points: [[640, 480], [640, 430], [640, 370]] },
          { side: 'bottom', points: [[430, 500], [430, 400], [430, 270]] },
          { side: 'bottom', points: [[210, 520], [200, 420], [215, 300]] },
        ],
      },
      {
        title: 'Rout of the Spanish',
        caption: 'The army breaks and Belvedere’s two attempts to rally it fail; his sixteen guns are lost and most of the men flee towards Lerma. French cavalry cut down fugitives, and the French sack Burgos that night.',
        at: {
          lasalle: [380, 262],
          mouton: [580, 262],
          milhaud: [230, 310],
        },
        broken: ['line1', 'line2', 'cavL'],
        gone: ['gunsS'],
        arrows: [
          { side: 'top', points: [[420, 200], [340, 120], [250, 40]], style: 'rout' },
          { side: 'top', points: [[760, 230], [650, 130], [540, 50]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive French victory',
    losses: 'Spanish probably about 2,500 killed and wounded, some 900 prisoners and all 16 guns (Oman); Napier says 2,500 killed, 900 taken, 20 guns. French under about 200.',
    text: [
      "Fugitives poured through Burgos, past the jammed baggage, and on to Lerma; Belvedere himself got away. That night the French plundered Burgos, and a house beside Napoleon's own lodging was looted and set on fire.",
      "The way to Madrid lay open. Soult went in pursuit of Blake's beaten army, and Victor attacked Blake at Espinosa de los Monteros on 10 and 11 November. Napoleon pushed on through Somosierra and reached Madrid in early December.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 1 (1902), Section VII, ch. IV, pp. 417–24 (1902 edition pagination, Internet Archive scan)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 1 (1828), Book IV, ch. I, the account of Gamonal, pp. 388–91 of the Internet Archive scan',
  ],
};

export default history;
