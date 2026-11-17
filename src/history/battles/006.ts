// 006 River Côa, 24 July 1810. Top: Craufurd's Light Division (British and Portuguese); bottom: Ney's 6th Corps and cavalry.
// The Côa runs down the left of the map; the French come from the south-east, towards Almeida at the top right.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '006',
  context: {
    war: 'Peninsular War: Massena’s invasion of Portugal, 1810',
    text: [
      "In 1810 Marshal Massena's Army of Portugal advanced on Wellington's Anglo-Portuguese army, first taking Ciudad Rodrigo on 10 July after a siege. Wellington waited on the Portuguese side of the frontier but left Robert Craufurd's Light Division watching the French, with orders not to fight beyond the Côa.",
      "Almeida, a Portuguese fortress about two miles east of the Côa, was the next French target. On 21 July Ney's 6th Corps advanced and Craufurd fell back to the glacis of Almeida, but against Wellington's wishes he stayed east of the river, with a single narrow bridge behind him. Ney attacked at dawn on the 24th.",
    ],
  },
  sides: {
    top: {
      name: 'Anglo-Portuguese Light Division',
      commanders: ['Robert Craufurd (commanding)', 'Colonel Sydney Beckwith (95th Rifles)'],
      strength: 'about 4,000 (Oman); Napier: 4,000 infantry, 1,100 horse, six guns',
      forces: '1/43rd, 1/52nd, 1/95th, two Portuguese Caçadore battalions, cavalry including German hussars, and horse artillery.',
    },
    bottom: {
      name: 'French 6th Corps and cavalry',
      commanders: ['Marshal Ney (commanding)', 'Loison (leading division)', 'Mermet (second line)'],
      strength: 'about 24,000 (Oman); Napier: 24,000 infantry, 5,000 cavalry, 30 guns',
      forces: 'Loison’s and Mermet’s divisions, part of Marchand’s, reserve cavalry and an elite chasseur battalion.',
    },
  },
  map: {
    north: 0,
    terrain: [
      { kind: 'river', points: [[120, -30], [165, 75], [110, 230], [165, 420], [105, 640]], width: 22, label: 'Côa' },
      { kind: 'hills', points: [[225, 75], [310, 70], [320, 140], [235, 150]] },
      { kind: 'fields', points: [[330, 145], [700, 155], [720, 330], [340, 320]] },
      { kind: 'road', points: [[820, 100], [620, 138], [420, 152], [300, 128], [255, 80], [190, 78]] },
      { kind: 'road', points: [[960, 590], [900, 380], [850, 112]], label: 'to Ciudad Rodrigo' },
      { kind: 'town', at: [850, 80], size: 30, label: 'Almeida' },
      { kind: 'label', at: [190, 38], text: 'Bridge' },
      { kind: 'label', at: [285, 168], text: 'Pine knoll' },
      { kind: 'label', at: [690, 305], text: 'Walled fields' },
    ],
    units: [
      { id: 'd43', side: 'top', kind: 'infantry', label: '43rd', w: 66 },
      { id: 'd52', side: 'top', kind: 'infantry', label: '52nd', w: 66 },
      { id: 'd95', side: 'top', kind: 'light', label: '95th Rifles', w: 70 },
      { id: 'cacad', side: 'top', kind: 'light', label: 'Caçadores', w: 70 },
      { id: 'cav', side: 'top', kind: 'cavalry', label: 'Cavalry', w: 80 },
      { id: 'rha', side: 'top', kind: 'artillery', label: 'Ross’s RHA', w: 52 },
      { id: 'lamotte', side: 'bottom', kind: 'cavalry', label: 'Lamotte', w: 70 },
      { id: 'gardanne', side: 'bottom', kind: 'heavycavalry', label: 'Gardanne', w: 70 },
      { id: 'hus3', side: 'bottom', kind: 'cavalry', label: '3rd Hussars', w: 70 },
      { id: 'loison', side: 'bottom', kind: 'infantry', label: 'Loison', w: 130 },
      { id: 'mermet', side: 'bottom', kind: 'infantry', label: 'Mermet', w: 120 },
      { id: 'marchand', side: 'bottom', kind: 'infantry', label: 'Marchand', w: 100 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'French guns', w: 56 },
      { id: 'f66', side: 'bottom', kind: 'infantry', label: '66th Line', w: 70 },
      { id: 'chass', side: 'bottom', kind: 'light', label: 'Elite chasseurs', w: 70 },
    ],
    phases: [
      {
        title: 'Dawn, 24 July',
        caption: 'After a night of rain Ney’s cavalry drives in Craufurd’s pickets. The Light Division forms with its left near the walls of Almeida and its right trending back to the river, and waits for the French infantry.',
        at: {
          d43: [640, 178],
          cacad: [505, 192],
          d52: [405, 172],
          d95: [585, 235],
          cav: [520, 280],
          rha: [470, 138],
          lamotte: [520, 345],
          gardanne: [720, 385],
          hus3: [820, 375],
          loison: [560, 440],
          mermet: [500, 510],
          marchand: [700, 550],
          fguns: [640, 475],
        },
        arrows: [
          { side: 'bottom', points: [[520, 400], [525, 350], [530, 305]] },
          { side: 'bottom', points: [[720, 440], [715, 390], [700, 340]] },
        ],
      },
      {
        title: 'Loison storms the line',
        caption: 'Loison’s thirteen battalions attack at the double, and the 3rd Hussars gallop between the division’s left flank and the walls of Almeida, whose gunners fire wildly. Turned on his left, Craufurd orders the retreat to the bridge.',
        at: {
          loison: [560, 290],
          lamotte: [440, 292],
          gardanne: [700, 262],
          hus3: [775, 180],
          mermet: [500, 400],
          marchand: [700, 480],
          fguns: [640, 380],
          d43: [630, 178],
          d95: [585, 235],
          cav: [385, 225],
        },
        arrows: [
          { side: 'bottom', points: [[560, 440], [560, 370], [560, 308]] },
          { side: 'bottom', points: [[830, 370], [805, 275], [775, 195]] },
          { side: 'top', points: [[385, 215], [345, 175], [300, 135]], style: 'retreat' },
          { side: 'top', points: [[470, 150], [390, 118], [300, 100]], style: 'retreat' },
        ],
      },
      {
        title: 'The race for the bridge',
        caption: 'Cavalry and guns gallop down the road while the infantry fall back from wall to wall. Five companies of the 52nd are almost cut off at the river until McLeod charges with men of the 43rd and 95th and retakes the pine knoll.',
        at: {
          d43: [268, 104],
          d95: [292, 130],
          d52: [235, 195],
          cacad: [75, 170],
          rha: [80, 110],
          cav: [85, 300],
          loison: [405, 175],
          lamotte: [350, 230],
          hus3: [510, 150],
          mermet: [480, 270],
          gardanne: [640, 230],
          fguns: [470, 215],
          marchand: [650, 370],
        },
        arrows: [
          { side: 'top', points: [[420, 172], [330, 185], [245, 165]], style: 'retreat' },
          { side: 'top', points: [[262, 135], [295, 120]] },
          { side: 'bottom', points: [[430, 205], [330, 160], [300, 125]] },
        ],
      },
      {
        title: 'Ney storms the bridge',
        caption: 'Ney sends the 66th, then an elite chasseur battalion, against the bridge. Riflemen, Caçadores and guns across the gorge shoot them down and the chasseurs lose most of their men. Craufurd holds until midnight, then retires to Pinhel.',
        at: {
          d43: [48, 130],
          d95: [48, 168],
          d52: [48, 206],
          cacad: [48, 244],
          rha: [40, 86],
          f66: [270, 118],
          chass: [232, 100],
          loison: [345, 160],
        },
        broken: ['f66', 'chass'],
        arrows: [
          { side: 'bottom', points: [[340, 140], [290, 112], [200, 80]] },
          { side: 'bottom', points: [[345, 160], [290, 128], [205, 90]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'draw',
    result: 'Indecisive: the Light Division escapes, but Almeida is cut off',
    losses: 'Allies about 316 to 333; French 527 by Oman’s count, over 1,000 by Napier’s, most of them at the bridge.',
    text: [
      "Wellington had forbidden the fight and was displeased, though he kept his confidence in Craufurd. Picton, at Pinhel, is said to have refused to bring up the 3rd Division, and the two generals quarrelled; the story was disputed. Massena's report claimed a far greater success than the day had brought.",
      "The French invested Almeida. On 26 August a magazine exploded inside the fortress, and the governor surrendered the next day. Wellington could not relieve the place, and Massena advanced into Portugal, towards Bussaco.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 3 (1908), pp. 257–66 and 272–75',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 2, Book XI, chap. 4 (combat of the Côa)',
  ],
};

export default history;
