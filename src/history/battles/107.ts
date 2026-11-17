// 107 Alcañiz, 23 May 1809. Top: Blake's Spanish Army of the Right; bottom: Suchet's French III Corps.
// The map is turned so that the Spaniards face the French from the top: north points to the right. The Guadalope runs along the top edge behind the
// Spanish hills (Pueyos to the north, Las Horcas in the centre, La Perdiguera to the south), and the French come from Híjar, to the north.
// Distances and unit places are schematic. The scenario board draws the Spanish wings the other way round (Areizaga at the left); the map follows the history.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '107',
  date: '23 May 1809',
  context: {
    war: 'Peninsular War: the Spanish risings, 1809',
    text: [
      "After Zaragoza fell in February 1809, Aragon was held by Suchet's III Corps, but risings and a new Spanish field force pressed its outposts back. General Blake, newly given command of the forces of Aragon, Valencia and Catalonia, gathered an 'Army of the Right' and seized Alcañiz, south of the Ebro.",
      "Suchet reached Zaragoza on 19 May and took over from Junot a corps that was short of pay and confidence. Two days later he marched out with Musnier's division to join Laval's brigade, and on 23 May he found Blake on three hills east of Alcañiz, the Guadalope behind him.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of the Right',
      commanders: ['Blake (commanding)', 'Areizaga (left wing, Aragonese)', 'Lazan (centre)', 'Roca (right wing)'],
      strength: 'c. 8,700 with 19 guns (Oman); French sources claim far more',
      forces: 'Aragonese and Valencian infantry in three wings, about 450 cavalry, and the whole artillery on the central hill.',
    },
    bottom: {
      name: 'French III Corps (Army of Aragon)',
      commanders: ['Suchet (commanding, new to the corps)', 'Musnier (division)', 'Laval (brigade)'],
      strength: 'c. 8,100 with 18 guns (Suchet’s return, as given by Oman)',
      forces: 'Fourteen battalions (114th, 115th, 121st and 14th Line, 1st and 3rd Vistula), the 4th Hussars and half the 13th Cuirassiers.',
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'river', points: [[-40, 36], [250, 26], [600, 34], [1040, 28]], width: 18, label: 'Guadalope' },
      { kind: 'hills', points: [[70, 92], [300, 88], [320, 215], [180, 255], [60, 235]] },
      { kind: 'hills', points: [[345, 95], [545, 92], [560, 205], [350, 215]] },
      { kind: 'hills', points: [[700, 90], [920, 88], [960, 160], [930, 235], [720, 238]] },
      { kind: 'town', at: [445, 56], size: 24, label: 'Alcañiz' },
      { kind: 'label', at: [235, 218], text: 'La Perdiguera' },
      { kind: 'label', at: [585, 222], text: 'Las Horcas' },
      { kind: 'label', at: [815, 224], text: 'Cerro de los Pueyos' },
      { kind: 'label', at: [925, 575], text: 'To Híjar' },
    ],
    units: [
      { id: 'roca', side: 'top', kind: 'infantry', label: 'Roca (Valencians)', w: 130, h: 30 },
      { id: 'scav', side: 'top', kind: 'cavalry', label: 'Spanish cavalry', w: 64 },
      { id: 'guns', side: 'top', kind: 'artillery', label: 'Spanish guns (19)', w: 50 },
      { id: 'lazan', side: 'top', kind: 'infantry', label: 'Lazan (centre)', w: 100, h: 30 },
      { id: 'areiz', side: 'top', kind: 'infantry', label: 'Areizaga (Aragonese)', w: 130, h: 30 },
      { id: 'laval', side: 'bottom', kind: 'infantry', label: "Laval's brigade", w: 110, h: 30 },
      { id: 'hus', side: 'bottom', kind: 'cavalry', label: '4th Hussars', w: 64 },
      { id: 'm114', side: 'bottom', kind: 'infantry', label: '114th Line', w: 100, h: 30 },
      { id: 'm1v', side: 'bottom', kind: 'infantry', label: '1st Vistula', w: 80, h: 30 },
      { id: 'm115', side: 'bottom', kind: 'infantry', label: '115th and 121st', w: 100, h: 30 },
      { id: 'cuir', side: 'bottom', kind: 'heavycavalry', label: '13th Cuirassiers', w: 64 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'French guns (18)', w: 50 },
    ],
    phases: [
      {
        title: 'Three hills, one bridge',
        caption: "Blake holds three hills with his back to the river and a single bridge. Suchet, short of men, spends the morning feeling for the position, then sends Laval's brigade twice against the northern hill, the Cerro de los Pueyos.",
        at: {
          roca: [190, 165],
          scav: [90, 225],
          guns: [440, 150],
          lazan: [440, 190],
          areiz: [810, 165],
          laval: [790, 410],
          hus: [905, 470],
          m114: [470, 455],
          m1v: [595, 455],
          m115: [340, 465],
          cuir: [250, 520],
          fguns: [530, 520],
        },
        arrows: [
          { side: 'bottom', points: [[790, 385], [800, 320], [805, 215]] },
        ],
      },
      {
        title: 'The northern hill holds',
        caption: "Areizaga throws Laval back without great difficulty. Blake sends all his cavalry to that flank, but when the French retire the Spanish horse tries a flank charge and is badly mauled by Suchet's hussars.",
        at: {
          laval: [770, 335],
          scav: [890, 290],
          hus: [925, 360],
        },
        broken: ['scav'],
        arrows: [
          { side: 'bottom', points: [[805, 225], [790, 280], [775, 320]], style: 'retreat' },
          { side: 'top', points: [[130, 235], [470, 270], [850, 290]] },
          { side: 'bottom', points: [[935, 420], [925, 385]] },
        ],
      },
      {
        title: "Musnier's columns break",
        caption: "Suchet then sends two regiments, over 2,600 men in battalion columns, up Las Horcas. Grapeshot from the guns and musketry from the Spanish left halt them at a ditch on the slope, and they break and flee.",
        at: {
          m114: [440, 262],
          m1v: [550, 265],
        },
        broken: ['m114', 'm1v'],
        arrows: [
          { side: 'bottom', points: [[470, 420], [455, 330], [445, 265]] },
          { side: 'bottom', points: [[595, 420], [575, 335], [555, 270]] },
          { side: 'top', points: [[740, 160], [660, 215], [590, 245]] },
        ],
      },
      {
        title: 'Night panic',
        caption: "Suchet rallies his men behind the battalions still intact and draws off before night. A false alarm of Spanish cavalry then scatters Laval's troops, and the next morning the corps pours into San Per and Híjar, with Blake not pursuing.",
        at: {
          m114: [640, 450],
          m1v: [740, 490],
          m115: [540, 478],
          laval: [900, 440],
          hus: [940, 475],
          cuir: [400, 545],
          fguns: [600, 560],
        },
        arrows: [
          { side: 'bottom', points: [[600, 425], [760, 400], [880, 395]], style: 'retreat' },
          { side: 'bottom', points: [[440, 530], [640, 535], [850, 535]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: "Spanish victory; Suchet's corps falls back on Híjar",
    losses: 'French at least 700 or 800, with Suchet wounded in the foot; Spanish about 300 (Oman).',
    text: [
      "Blake did not follow up. He had few cavalry, thought Suchet nearly as strong as himself, and awaited reinforcements from Valencia. The French gave up their outlying posts, and recruits flocked to him in thousands, more than he could arm.",
      "Within three weeks he had about 25,000 men on the rolls and marched on Zaragoza by Belchite. Suchet turned on him at María (108) on 15 June, and routed him at Belchite on 18 June. Suchet's own memoirs, Oman remarks, slur over the defeat.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 2 (1903), section XV, ch. 3: Alcañiz at pp. 417–20 (order of battle in notes 518–19)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 2, Book VII, ch. 3 (Blake inflated by the success at Alcañiz; only a passing mention)',
  ],
};

export default history;
