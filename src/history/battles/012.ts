// García Hernández (23 July 1812). Top: British and King's German Legion cavalry (Wellington, Bock, Anson); bottom: French (Foy).
// The map's compass is left out: the allies come from Alba de Tormes (top left) and the French retreat along the road to
// Peñaranda (bottom right). Distances and unit places are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '012',
  date: '23 July 1812',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "After Salamanca the beaten Army of Portugal crossed the Tormes at Alba in the night and fled east. Wellington pushed after it next day, riding himself with the head of Anson's light dragoons, with Bock's German heavy dragoons following and the infantry far behind.",
      "About seven miles beyond Alba the patrols found a rearguard behind the Caballero brook, at the village of García Hernández: Foy's division, which had hardly fought on the 22nd, with a brigade of Curto's chasseurs and a battery. Napier puts the clash at about ten in the morning.",
    ],
  },
  sides: {
    top: {
      name: 'Allied cavalry',
      commanders: ['Wellington (with the vanguard)', "Bock (King's German Legion heavy dragoons)", 'G. Anson (light dragoons)'],
      strength: 'c. 770 German heavy dragoons and four squadrons of light dragoons (Oman)',
      forces: "The 1st and 2nd Dragoons of the King's German Legion, who had never charged before, and two squadrons each of the 11th and 16th Light Dragoons.",
    },
    bottom: {
      name: "French (Foy's division)",
      commanders: ['Foy (commanding the rearguard)', 'Chemineau (brigade)', 'Curto (light cavalry)'],
      strength: 'c. 2,400 in the 6th Léger and 76th Line, with the 39th, 69th, chasseurs and a battery (Oman)',
      forces: "Foy's 1st Division: 6th Léger, 39th, 69th and 76th Line, about eight battalions in all, with Curto's chasseurs brigade and one battery.",
    },
  },
  map: {
    terrain: [
      { kind: 'road', points: [[-30, 70], [140, 190], [235, 330], [420, 425], [640, 478], [880, 565], [1030, 615]] },
      { kind: 'river', points: [[-30, 262], [200, 250], [420, 248], [640, 232], [860, 212], [1030, 200]], width: 11, label: 'Caballero brook' },
      { kind: 'hills', points: [[630, 405], [790, 385], [940, 430], [985, 520], [900, 580], [700, 580], [620, 500]], label: 'La Serna' },
      { kind: 'hills', points: [[270, 280], [380, 270], [440, 310], [400, 350], [290, 350]] },
      { kind: 'town', at: [225, 345], size: 20, label: 'García Hernández' },
      { kind: 'label', at: [80, 40], text: 'from Alba de Tormes' },
      { kind: 'label', at: [760, 592], text: 'to Peñaranda' },
    ],
    units: [
      { id: 'a11', side: 'top', kind: 'cavalry', label: '11th Light Dragoons', w: 66 },
      { id: 'a16', side: 'top', kind: 'cavalry', label: '16th Light Dragoons', w: 66 },
      { id: 'k1', side: 'top', kind: 'heavycavalry', label: '1st KGL Dragoons', w: 66 },
      { id: 'decken', side: 'top', kind: 'heavycavalry', label: "von der Decken's sqn", w: 52 },
      { id: 'reiz', side: 'top', kind: 'heavycavalry', label: "Reizenstein's sqn", w: 52 },
      { id: 'k2', side: 'top', kind: 'heavycavalry', label: '2nd KGL Dragoons', w: 66 },
      { id: 'light', side: 'top', kind: 'infantry', label: 'Light Division', w: 100 },
      { id: 'curto', side: 'bottom', kind: 'cavalry', label: "Curto's chasseurs", w: 70 },
      { id: 'fbat', side: 'bottom', kind: 'artillery', label: 'French battery' },
      { id: 'f76a', side: 'bottom', kind: 'infantry', label: '76th, 1st bn (square)', w: 46, h: 40 },
      { id: 'f76b', side: 'bottom', kind: 'infantry', label: '76th, 2nd bn', w: 70 },
      { id: 'f6', side: 'bottom', kind: 'light', label: '6th Léger', w: 100, h: 22 },
      { id: 'f39', side: 'bottom', kind: 'infantry', label: '39th Line', w: 80 },
      { id: 'f69', side: 'bottom', kind: 'infantry', label: '69th Line (square)', w: 56, h: 46 },
      { id: 'chauvel', side: 'bottom', kind: 'cavalry', label: "Chauvel's hussars", w: 70 },
    ],
    phases: [
      {
        title: 'The rearguard at the brook',
        caption: "Anson's dragoons find Foy's rearguard. The chasseurs form on a rise north of the village; the infantry stand beside them, out of sight, and the leading regiments are already marching off down the road.",
        at: {
          a11: [160, 95],
          a16: [260, 100],
          k1: [470, 75],
          k2: [580, 60],
          curto: [345, 318],
          fbat: [300, 365],
          f76a: [520, 365],
          f76b: [610, 400],
          f6: [740, 440],
          f39: [770, 497],
          f69: [900, 545],
        },
        arrows: [{ side: 'bottom', points: [[800, 485], [860, 540], [920, 585]], style: 'retreat' }],
      },
      {
        title: 'The chasseurs bolt',
        caption: "Two squadrons each of the 11th and 16th Light Dragoons charge Curto's chasseurs, who flee at once. The German heavies, still forming, pursue and take a volley in the flank from a battalion of the 76th in square.",
        at: {
          a11: [330, 255],
          a16: [410, 262],
          curto: [215, 475],
          k1: [520, 300],
          k2: [610, 190],
        },
        broken: ['curto'],
        gone: ['fbat'],
        arrows: [
          { side: 'top', points: [[170, 115], [250, 190], [325, 250]] },
          { side: 'top', points: [[270, 120], [345, 190], [405, 252]] },
          { side: 'bottom', points: [[340, 340], [280, 420], [225, 470]], style: 'rout' },
          { side: 'top', points: [[480, 95], [510, 190], [520, 285]] },
        ],
      },
      {
        title: 'The square is ridden down',
        caption: "Von der Decken's squadron charges the square at the gallop. He falls at the second volley, but a dying horse crashes into the front rank and the dragoons break in. A whole battalion of the 76th is taken.",
        at: {
          decken: [440, 325],
          k1: [560, 285],
          k2: [670, 255],
          a11: [230, 420],
          a16: [330, 450],
        },
        broken: ['f76a'],
        arrows: [{ side: 'top', points: [[440, 305], [480, 340], [505, 358]] }, { side: 'top', points: [[330, 280], [280, 360], [240, 410]] }],
      },
      {
        title: 'The slope of La Serna',
        caption: "Reizenstein's squadron cuts up the rear of the 6th Léger as it climbs, and the 2nd Dragoons ride down the rest on the skyline. A last charge on the 69th's square is shot down, and Foy marches on.",
        at: {
          reiz: [625, 375],
          k2: [715, 478],
          f6: [760, 440],
          f69: [900, 550],
          f39: [780, 505],
          chauvel: [905, 455],
          light: [180, 40],
          f76b: [640, 418],
        },
        broken: ['f6', 'f76b'],
        arrows: [
          { side: 'top', points: [[620, 350], [640, 395], [655, 425]] },
          { side: 'top', points: [[680, 400], [740, 470], [750, 470]] },
          { side: 'bottom', points: [[830, 520], [880, 560], [930, 590]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Allied cavalry victory; Foy escapes with the rest',
    losses: "German dragoons 127 of about 770; French about 1,100, mostly prisoners (Oman). Wellington's dispatch reported three battalions taken.",
    text: [
      "Wellington had never seen a more gallant charge, and Foy agreed. Oman calls it the most dashing success of any allied cavalry in the war, won by squadron leaders without orders from above. Napier added that cavalry alone could not beat veteran infantry except by surprise.",
      "Foy marched on and met Chauvel's cavalry from the Army of the North six miles away. The pursuit slackened, Clausel reached Arévalo, and Wellington entered Madrid on 12 August. The German regiments kept the battle honour on their guidons.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 5 (1914), section 33, ch. 8, pp. 475–482',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 4, book 18, ch. 4',
    "Wellington to Bathurst, 24 July 1812, Wellington's Dispatches (Gurwood), vol. 9, pp. 301–307",
  ],
};

export default history;
