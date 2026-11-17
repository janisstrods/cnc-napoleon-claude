// 101 Bailén, 19 July 1808. Top: Castaños's Spanish Army of Andalusia (Reding's and Coupigny's divisions at Bailén); bottom: Dupont's French corps.
// North is to the left: the French come from Andújar in the west (bottom), the Spanish hold the hills west of Bailén (top), the Rumblar runs between.
// The map shows the main fight of 19 July; Castaños's own force and Jones's division (opposite Andújar) are off the map. Distances are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '101',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In June 1808 General Dupont led a corps of young conscripts, with Swiss and Guard detachments, over the Sierra Morena to seize Cádiz. He took Córdoba on 7 June, then fell back to Andújar as Andalusia rose behind him. Castaños gathered the Spanish regulars and militia of the south against him.",
      "In mid-July the Spanish forced the Guadalquivir above Andújar. Reding crossed at Mengíbar on 16 July and took Bailén, which lay on Dupont's road to the Sierra Morena. Dupont had split his army, sending Vedel to the Sierra; on the night of 18 July he marched to break through, with a convoy of baggage behind him.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of Andalusia',
      commanders: ['Castaños (commanding)', 'Reding (division)', 'Coupigny (division)', 'La Peña (reserve)'],
      strength: 'c. 33,000–34,000 in all; about 17,000 under Reding and Coupigny at Bailén (Oman)',
      forces: 'Seventeen regular battalions, six militia and five new levies at Bailén, with about 1,200 horse and 16 guns (Oman).',
    },
    bottom: {
      name: 'French corps of Dupont',
      commanders: ['Dupont (commanding)', 'Vedel (2nd Division)', 'Barbou (1st Division)', 'Chabert (vanguard brigade)'],
      strength: 'c. 24,000 entered Spain, 21,000 fit (Napier); about 11,000 marched with Dupont (Oman)',
      forces: 'Mostly raw conscripts, four Swiss battalions, Marines of the Guard, dragoons and cuirassiers; only two veteran battalions (Oman).',
    },
  },
  map: {
    north: 270,
    terrain: [
      { kind: 'hills', points: [[190, 150], [300, 130], [380, 190], [330, 280], [210, 280]] },
      { kind: 'hills', points: [[640, 150], [760, 130], [840, 190], [790, 290], [660, 280]] },
      { kind: 'hills', points: [[400, 8], [500, 2], [620, 10], [600, 60], [440, 62]] },
      { kind: 'river', points: [[-20, 508], [200, 520], [420, 500], [640, 520], [880, 502], [1020, 515]], width: 16, label: 'Rumblar' },
      { kind: 'road', points: [[500, 112], [500, 300], [506, 520], [520, 640]] },
      { kind: 'town', at: [500, 118], size: 22, label: 'Bailén' },
      { kind: 'label', at: [500, 70], text: 'San Cristóbal' },
      { kind: 'label', at: [260, 125], text: 'Zumacar Chico' },
      { kind: 'label', at: [745, 125], text: 'Cerrajón' },
      { kind: 'label', at: [610, 330], text: 'to Andújar' },
      { kind: 'label', at: [850, 112], text: 'to La Carolina' },
    ],
    units: [
      { id: 'reding', side: 'top', kind: 'infantry', label: 'Reding', w: 100, h: 26 },
      { id: 'coup', side: 'top', kind: 'infantry', label: 'Coupigny', w: 100, h: 26 },
      { id: 'sguns', side: 'top', kind: 'artillery', label: 'Spanish guns', w: 54 },
      { id: 'scav', side: 'top', kind: 'cavalry', label: 'Spanish horse', w: 80, h: 24 },
      { id: 'sguard', side: 'top', kind: 'infantry', label: 'Guard vs Vedel', w: 80, h: 24 },
      { id: 'lapena', side: 'top', kind: 'infantry', label: 'La Peña', w: 90, h: 26 },
      { id: 'cruz', side: 'top', kind: 'light', label: 'Cruz-Murgeón', w: 70, h: 24 },
      { id: 'chabert', side: 'bottom', kind: 'infantry', label: 'Chabert', w: 100, h: 26 },
      { id: 'swiss', side: 'bottom', kind: 'infantry', label: 'Swiss (Schramm)', w: 100, h: 26 },
      { id: 'prive', side: 'bottom', kind: 'heavycavalry', label: 'Privé’s dragoons', w: 90, h: 24 },
      { id: 'dupre', side: 'bottom', kind: 'cavalry', label: 'Dupré', w: 76, h: 24 },
      { id: 'pann', side: 'bottom', kind: 'infantry', label: 'Pannetier', w: 100, h: 26 },
      { id: 'marines', side: 'bottom', kind: 'guard', label: 'Marines of Guard', w: 90, h: 26 },
      { id: 'vedel', side: 'bottom', kind: 'infantry', label: 'Vedel', w: 100, h: 26 },
      { id: 'bouss', side: 'bottom', kind: 'cavalry', label: 'Boussard', w: 76, h: 24 },
    ],
    phases: [
      {
        title: 'Chabert’s first attack',
        caption: 'Reding holds Zumacar Chico and Coupigny the Cerrajón, astride the road, with guns at the centre and a guard east of Bailén. Early on 19 July Chabert’s vanguard attacks along the road and is beaten back.',
        at: {
          reding: [270, 214],
          coup: [730, 214],
          sguns: [500, 236],
          scav: [380, 92],
          sguard: [500, 40],
          chabert: [500, 420],
          swiss: [330, 470],
          prive: [680, 462],
          dupre: [500, 580],
        },
        arrows: [{ side: 'bottom', points: [[500, 400], [500, 340], [500, 290]] }],
      },
      {
        title: 'Dupont’s attacks fail',
        caption: 'The Swiss and Privé’s dragoons take the Cerrajón summit but are thrown back. Pannetier’s brigade attacks about eight, and about half past twelve the Marines of the Guard come on; they break on the Spanish guns. Dupont is wounded.',
        at: {
          chabert: [500, 440],
          swiss: [350, 360],
          prive: [700, 340],
          pann: [370, 450],
          marines: [600, 455],
          dupre: [620, 400],
          reding: [270, 230],
        },
        broken: ['chabert', 'marines'],
        arrows: [
          { side: 'bottom', points: [[340, 340], [300, 300], [275, 260]] },
          { side: 'bottom', points: [[700, 318], [720, 275], [730, 245]] },
          { side: 'bottom', points: [[380, 424], [340, 340], [290, 266]] },
        ],
      },
      {
        title: 'Truce and Vedel’s return',
        caption: 'Dupont asks for a truce in the afternoon. Vedel, back from La Carolina, reaches the field about five and attacks San Cristóbal until Dupont’s flag halts him. Most Swiss with the French go over or surrender; La Peña’s division arrives at the Rumblar.',
        at: {
          vedel: [680, 36],
          bouss: [820, 52],
          lapena: [420, 575],
          cruz: [250, 570],
          swiss: [350, 395],
          prive: [700, 400],
        },
        broken: ['swiss', 'prive'],
        arrows: [
          { side: 'bottom', points: [[820, 20], [740, 40], [620, 44]] },
          { side: 'top', points: [[420, 548], [440, 520], [460, 490]] },
          { side: 'top', points: [[250, 548], [270, 520], [300, 500]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Spanish victory; Dupont’s army capitulates',
    losses: 'French about 2,000 killed and wounded, and some 17,600 surrendered (Oman: 8,242 with Dupont, 9,393 with Vedel); Spanish about 1,000 killed and wounded.',
    text: [
      "Dupont's men laid down their arms on 23 July and Vedel's the next day; Napier dates the surrender a day earlier. The terms promised shipment to France, with Vedel's troops included although he stood outside the trap. Collingwood would not let Spanish ships carry them, and the Seville junta declined to honour the pact.",
      "The prisoners were held on hulks at Cádiz and then on the island of Cabrera, where many died; Vedel's men stayed captive until 1814. Joseph Bonaparte left Madrid about the start of August and the French fell back to the Ebro. Napoleon came to Spain in person that autumn to restore the position.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 1 (1902), Section III, ch. IV, pp. 176–205 (page numbers as in the Gutenberg/Internet Archive text)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 1 (1828), Book I, ch. VIII (Dupont in Andalusia) and the observations that follow it',
  ],
};

export default history;
