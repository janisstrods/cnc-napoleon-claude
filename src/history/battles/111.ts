// 111 Ocaña, the cavalry action, 18 November 1809. Top: Freire's Spanish cavalry; bottom: Milhaud's dragoons and Paris's light cavalry of the French 4th Corps.
// Schematic. Same compass as 112: north points down, so the French come up from Aranjuez at the bottom and the Spanish column, marching west
// from La Zarza and Noblejas, arrives from the left towards Ocaña at the top right. Places and numbers of blocks are indicative only.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '111',
  date: '18 November 1809',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In November 1809 Areizaga's army from the Sierra Morena threatened Madrid, then dithered. After crossing and recrossing the Tagus near Villamanrique it began, on 17 November, to march back towards Ocaña and its old road to Andalusia, the column strung out between La Zarza and Noblejas.",
      "Soult, who directed King Joseph's army, had put his columns back on the road to Aranjuez to cut that retreat. On the 18th the French horse crossed the Tagus there (Oman says in the morning, Napier about one o'clock). Milhaud and Paris met Freire's cavalry at the head of the Spanish column, between Ontigola and Ocaña (Oman) or Antigüela and Ocaña (Napier).",
    ],
  },
  sides: {
    top: {
      name: 'Spanish cavalry of the Army of La Mancha',
      commanders: ['Freire (cavalry)', 'Bernuy and Rivas (division commanders)'],
      strength: 'Over 4,000 sabres in three of four divisions (Oman); Napier counts about 4,500',
      forces: 'A first line, with the reserves later massed into one solid column. No infantry or guns were in hand.',
    },
    bottom: {
      name: 'French dragoons and light cavalry',
      commanders: ['Sebastiani (4th Corps, took command)', 'Milhaud (dragoons)', 'Paris (light cavalry, killed)'],
      strength: 'Nearly 3,000 in eight regiments (Oman); Napier counts about 3,200',
      forces: "Milhaud's dragoon regiments, Paris's light horse of the 4th Corps with Polish lancers, and 5th Corps light cavalry coming up. No infantry in hand.",
    },
  },
  map: {
    north: 180,
    terrain: [
      { kind: 'road', points: [[880, 590], [670, 420], [440, 260], [210, 85]], label: 'Road from Aranjuez' },
      { kind: 'town', at: [160, 62], size: 26, label: 'Ocaña' },
      { kind: 'label', at: [850, 330], text: 'From La Zarza and Noblejas' },
      { kind: 'label', at: [850, 575], text: 'Aranjuez and the Tagus' },
      { kind: 'label', at: [260, 260], text: 'Open plateau' },
    ],
    units: [
      { id: 'front1', side: 'top', kind: 'cavalry', label: 'Spanish first line', w: 80 },
      { id: 'front2', side: 'top', kind: 'cavalry', label: 'Spanish first line', w: 80 },
      { id: 'res1', side: 'top', kind: 'heavycavalry', label: 'Spanish reserves', w: 80 },
      { id: 'res2', side: 'top', kind: 'heavycavalry', label: 'Spanish reserves', w: 80 },
      { id: 'milhaud', side: 'bottom', kind: 'heavycavalry', label: "Milhaud's dragoons", w: 80 },
      { id: 'drag2', side: 'bottom', kind: 'heavycavalry', label: 'Dragoons', w: 80 },
      { id: 'paris', side: 'bottom', kind: 'cavalry', label: "Paris's light horse", w: 80 },
      { id: 'lancers', side: 'bottom', kind: 'cavalry', label: 'Polish lancers', w: 70 },
    ],
    phases: [
      {
        title: 'The vanguards meet',
        caption: "After crossing at Aranjuez, Milhaud's leading dragoons chase some Spanish horse onto the plateau and find Freire's cavalry in front of them, supported by reserves behind. Paris and Sebastiani hurry up with the rest.",
        at: {
          front1: [670, 190],
          front2: [530, 175],
          res1: [750, 120],
          res2: [610, 105],
          milhaud: [550, 400],
          drag2: [650, 470],
          paris: [400, 430],
          lancers: [300, 400],
        },
        arrows: [{ side: 'top', points: [[840, 215], [700, 195], [570, 185]] }],
      },
      {
        title: "Paris's light horse charge",
        caption: "Paris's light horse break the Spanish first line, and in Napier's account Sebastiani sends them with the Polish lancers against the Spanish flank. Freire brings up his reserves and closes them into a solid column.",
        at: {
          paris: [480, 260],
          lancers: [350, 250],
          front1: [670, 190],
          front2: [530, 195],
          res1: [670, 130],
          res2: [570, 120],
        },
        broken: ['front1', 'front2'],
        arrows: [
          { side: 'bottom', points: [[400, 420], [430, 330], [465, 275]] },
          { side: 'bottom', points: [[300, 390], [320, 320], [340, 265]] },
        ],
      },
      {
        title: "Milhaud's dragoons charge the column",
        caption: "Milhaud's dragoons (Oman), or Sebastiani with his reserves (Napier), charge into the massed Spanish horse, which breaks and flees. About eighty prisoners are taken and several hundred men fall; General Paris is killed.",
        at: {
          milhaud: [600, 215],
          drag2: [670, 270],
          res1: [750, 80],
          res2: [650, 60],
        },
        broken: ['res1', 'res2'],
        gone: ['front1', 'front2'],
        arrows: [
          { side: 'bottom', points: [[550, 390], [570, 300], [595, 240]] },
          { side: 'bottom', points: [[650, 455], [665, 370], [670, 290]] },
          { side: 'top', points: [[670, 130], [780, 80], [900, 45]], style: 'rout' },
        ],
      },
      {
        title: 'Pursuit up to Ocaña',
        caption: "The French chase the beaten squadrons towards Ocaña, then stop on seeing Spanish infantry in the town and more coming up. Soult is told that Areizaga cannot slip away without a battle.",
        at: {
          milhaud: [440, 150],
          drag2: [530, 190],
          paris: [340, 165],
          lancers: [250, 140],
        },
        gone: ['res1', 'res2'],
        arrows: [
          { side: 'bottom', points: [[580, 240], [480, 190], [400, 150]] },
          { side: 'bottom', points: [[460, 255], [370, 205], [300, 160]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'French cavalry victory; the Spanish horse routed',
    losses: 'Spaniards: about eighty prisoners and several hundred killed and wounded (Oman, Napier). French: a few scores, among them General Paris killed.',
    text: [
      "Oman called it the largest cavalry fight of the whole Peninsular War. Both Oman and Napier describe the Spanish horse as shaken by it the next day.",
      "The clash, and the prisoners taken, persuaded Soult that Areizaga was trying to regain his road south and that a battle could be fought next day (Napier). On 19 November the French attacked him at Ocaña (112).",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 3 (Oxford, 1908; Internet Archive scan), section XVII, ch. 4, pp. 88–90 (the cavalry fight); the Spanish horse shaken next day, p. 93',
    "W. F. P. Napier, History of the War in the Peninsula, vol. 3 (1831), Book IX, ch. V, pp. 77–78 (cavalry combat at Ocaña); next-day state of the Spanish horse, p. 80",
  ],
};

export default history;
