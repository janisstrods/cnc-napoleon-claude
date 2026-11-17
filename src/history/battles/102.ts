// 102 Zornoza, 31 October 1808. Top: Blake's Spanish Army of the Left (Galicia); bottom: Lefebvre's French IV Corps with Villatte's division.
// North is to the right: Blake comes from Bilbao in the west (top) and the French from Durango in the east (bottom), the road running between.
// Distances and the side on which Villatte stood are schematic. Acevedo's and Martinengo's detachments, which were elsewhere, are not shown.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '102',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "After Bailén the French fell back to the Ebro, and Napoleon came to Spain in November 1808 with veteran troops from Germany. His plan was to break the Spanish line on its wings before the Spanish could unite. On the left, Blake's Army of Galicia had retaken Bilbao in October and then advanced along the road towards Durango.",
      "Blake stood at Zornoza for about a week while the French gathered. Lefebvre, commanding the IV Corps, attacked on 31 October, apparently before the Emperor's design was complete, and without waiting for the whole of the force near him.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of Galicia',
      commanders: ['Blake (commanding)'],
      strength: 'About 18,000–19,000 (Oman); Napier gives a far higher 36,000 total',
      forces: 'Galician divisions, vanguard and reserve brigades and a few units of La Romana’s army; only six guns kept in the front (Oman).',
    },
    bottom: {
      name: 'French IV Corps and Villatte',
      commanders: ['Marshal Lefebvre (commanding)', 'Villatte (1st Corps)', 'Sebastiani (division)', 'Leval (division)'],
      strength: 'About 21,000 in three divisions (Oman); Napier counts about 25,000',
      forces: 'Villatte’s division from Victor’s 1st Corps and the 4th Corps divisions of Sebastiani and Leval (largely German), with many guns.',
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'hills', points: [[620, 140], [800, 120], [900, 200], [860, 300], [650, 290]] },
      { kind: 'hills', points: [[250, 180], [430, 170], [440, 250], [240, 260]] },
      { kind: 'road', points: [[480, -20], [470, 200], [490, 400], [500, 640]] },
      { kind: 'town', at: [480, 66], size: 22, label: 'Zornoza' },
      { kind: 'label', at: [480, 20], text: 'to Bilbao' },
      { kind: 'label', at: [500, 580], text: 'to Durango' },
    ],
    units: [
      { id: 'vang', side: 'top', kind: 'light', label: 'Vanguard Brigade', w: 90, h: 24 },
      { id: 'div1', side: 'top', kind: 'infantry', label: '1st Division', w: 90, h: 26 },
      { id: 'div3', side: 'top', kind: 'infantry', label: '3rd Division', w: 90, h: 26 },
      { id: 'div4', side: 'top', kind: 'infantry', label: '4th Division', w: 90, h: 26 },
      { id: 'resv', side: 'top', kind: 'infantry', label: 'Reserve Brigade', w: 90, h: 26 },
      { id: 'sguns', side: 'top', kind: 'artillery', label: 'Six guns', w: 54 },
      { id: 'vill', side: 'bottom', kind: 'infantry', label: 'Villatte', w: 100, h: 26 },
      { id: 'seb', side: 'bottom', kind: 'infantry', label: 'Sebastiani', w: 100, h: 26 },
      { id: 'leval', side: 'bottom', kind: 'infantry', label: 'Leval (Germans)', w: 100, h: 26 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'French guns', w: 70 },
    ],
    phases: [
      {
        title: 'Blake at Zornoza',
        caption: 'Blake’s vanguard holds low hills across the road, the 1st Division stands on higher ground to the left, and the 3rd and 4th support them. The reserve is in Zornoza. French columns come up the road from Durango in fog.',
        at: {
          vang: [480, 250],
          div1: [770, 235],
          div3: [300, 205],
          div4: [650, 150],
          resv: [480, 165],
          sguns: [410, 225],
          vill: [250, 470],
          seb: [490, 480],
          leval: [740, 470],
          fguns: [400, 540],
        },
      },
      {
        title: 'Lefebvre attacks',
        caption: 'Villatte’s division strikes the Spanish vanguard and spreads out to threaten the flank. Sebastiani advances in one column along the road, and Leval’s Germans attack the Spanish left, while French guns outweigh Blake’s six.',
        at: {
          vill: [260, 330],
          seb: [490, 340],
          leval: [740, 340],
          fguns: [440, 410],
        },
        arrows: [
          { side: 'bottom', points: [[260, 440], [262, 380], [268, 310]] },
          { side: 'bottom', points: [[490, 450], [490, 390], [490, 290]] },
          { side: 'bottom', points: [[740, 440], [742, 380], [744, 280]] },
        ],
      },
      {
        title: 'Blake falls back',
        caption: 'By midday the French are past Zornoza; Sebastiani breaks the centre and by afternoon Blake’s army is retreating towards Bilbao and Balmaseda, the wings covering the withdrawal. Spanish losses are about 600, French about 200.',
        at: {
          vang: [480, 262],
          seb: [480, 320],
          vill: [280, 280],
          leval: [740, 305],
          fguns: [440, 430],
        },
        broken: ['vang'],
        gone: ['sguns'],
        arrows: [
          { side: 'top', points: [[460, 140], [420, 85], [400, 30]], style: 'retreat' },
          { side: 'top', points: [[770, 205], [740, 120], [690, 50]], style: 'retreat' },
          { side: 'top', points: [[300, 175], [320, 100], [360, 40]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'French victory, but Blake escapes',
    losses: 'Spanish about 300 killed and wounded and 300 prisoners; French about 200 (Oman).',
    text: [
      "Blake left Bilbao on 1 November and Lefebvre entered it that night. Blake's detachments under Acevedo and Martinengo received his orders late; on 5 November he attacked Balmaseda to free Acevedo, and the Asturians got clear. Villatte's division, isolated, broke out with the loss of a gun and some prisoners.",
      "Napier called Lefebvre's attack hasty and ill-combined, and it let the Spanish escape the trap that Napoleon wanted. Blake's weary army fell back by Balmaseda to Espinosa de los Monteros, where Victor caught it on 10 and 11 November.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 1 (1902), Section VII, ch. III, pp. 402–11 (page numbers as in the Gutenberg/Internet Archive text)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 1 (1828), Book III, the account of the action at Zornosa (his spelling), pp. 379–83 of the Internet Archive scan',
  ],
};

export default history;
