// 104 Espinosa de los Monteros, 10–11 November 1808. Top: Blake's Spanish Army of the Left; bottom: Victor's French 1st Corps.
// The map is drawn with the Spaniards at the top, facing east: north is to the right, so Las Peñucas (the Asturians' ridge)
// lies at the top right and San Román's hill beside the Trueba at the top left. Positions follow Oman's description.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '104',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In November 1808 Napoleon came to Spain in person with a reinforced army to destroy the Spanish armies. On the northern flank Joaquín Blake's Army of the Left, of Galicians, Asturians and the regulars La Romana had brought home from Denmark, had advanced on Bilbao. Marshal Lefebvre beat it at Zornoza on 31 October and pushed it back through Valmaseda.",
      "Marshal Victor, rebuked by the Emperor for his slowness on 5 November, then led the pursuit while Lefebvre swung inland to cut off the retreat. Hungry, ragged and short of perhaps 6,000 men lost to battle and desertion, Blake turned to bay on 10 November in a strong position before Espinosa de los Monteros.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of the Left',
      commanders: ['Joaquín Blake (commanding)', 'Conde de San Román (Baltic division)', 'Acevedo (Asturians)', 'Riquelme (3rd Division)'],
      strength: 'c. 22,000 to 23,000 on the field, with only six guns (Oman)',
      forces: "Galician divisions, Acevedo's Asturians (mostly raw levies) and La Romana's regulars from Denmark.",
    },
    bottom: {
      name: 'French 1st Corps',
      commanders: ['Marshal Victor (commanding)', 'Villatte', 'Ruffin', 'Lapisse, with Maison'],
      strength: 'c. 21,000 infantry in three divisions (Oman)',
      forces: "Thirty-four infantry battalions: Villatte's twelve, then twenty-two of Ruffin's and Lapisse's.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'river', points: [[45, -30], [55, 130], [48, 300], [38, 460], [55, 640]], width: 16, label: 'Trueba' },
      { kind: 'road', points: [[110, 640], [105, 470], [88, 320], [100, 190], [200, 90], [330, 50]] },
      { kind: 'hills', points: [[85, 160], [275, 155], [285, 265], [95, 280]] },
      { kind: 'hills', points: [[705, 105], [960, 100], [980, 270], [720, 285]] },
      { kind: 'woods', points: [[95, 305], [335, 295], [345, 365], [105, 375]] },
      { kind: 'fields', points: [[300, 245], [660, 245], [660, 320], [300, 320]], label: 'Campo de Pedralva' },
      { kind: 'town', at: [375, 62], size: 28, label: 'Espinosa' },
      { kind: 'label', at: [845, 128], text: 'Las Peñucas' },
      { kind: 'label', at: [215, 28], text: 'To Reinosa' },
    ],
    units: [
      { id: 'sanroman', side: 'top', kind: 'infantry', label: 'San Román', w: 90 },
      { id: 'mendiz', side: 'top', kind: 'infantry', label: 'Mendizábal', w: 80 },
      { id: 'riq', side: 'top', kind: 'infantry', label: 'Riquelme', w: 80 },
      { id: 'fig', side: 'top', kind: 'infantry', label: 'Figueroa', w: 80 },
      { id: 'ace', side: 'top', kind: 'infantry', label: 'Acevedo', w: 150 },
      { id: 'guns', side: 'top', kind: 'artillery', label: 'Six guns', w: 46 },
      { id: 'mahy', side: 'top', kind: 'infantry', label: 'Mahy', w: 70 },
      { id: 'mart', side: 'top', kind: 'infantry', label: 'Martinengo', w: 80 },
      { id: 'villatte', side: 'bottom', kind: 'infantry', label: 'Villatte', w: 120 },
      { id: 'puthod', side: 'bottom', kind: 'infantry', label: 'Puthod', w: 80 },
      { id: 'ruffin', side: 'bottom', kind: 'infantry', label: 'Ruffin', w: 90 },
      { id: 'lapisse', side: 'bottom', kind: 'infantry', label: 'Lapisse', w: 120 },
    ],
    phases: [
      {
        title: '10 November: Villatte attacks',
        caption: "Blake's semicircle covers Espinosa, San Román’s Baltic troops on the hill by the Trueba, Acevedo’s Asturians on the far ridge. Villatte’s leading division charges the hill with six battalions and holds the Spanish centre with six; the Baltic troops hold.",
        at: {
          sanroman: [195, 215],
          mendiz: [335, 215],
          riq: [455, 215],
          fig: [580, 212],
          ace: [835, 195],
          guns: [395, 172],
          mahy: [480, 115],
          mart: [150, 140],
          villatte: [480, 400],
          puthod: [200, 335],
        },
        arrows: [
          { side: 'bottom', points: [[200, 322], [195, 285], [195, 250]] },
          { side: 'bottom', points: [[480, 385], [480, 330], [480, 290]] },
        ],
      },
      {
        title: 'Victor’s three o’clock assault',
        caption: "Victor comes up with Ruffin and Lapisse. Nine fresh battalions strike the same hill, and Blake feeds in his 3rd Division and part of the 2nd. At dusk the heights are still Spanish and the French fall back into the woods.",
        at: {
          ruffin: [305, 345],
          lapisse: [640, 450],
          riq: [265, 160],
        },
        arrows: [
          { side: 'bottom', points: [[305, 330], [260, 295], [225, 255]] },
          { side: 'top', points: [[440, 198], [350, 150], [280, 158]] },
        ],
      },
      {
        title: '11 November: Asturians break',
        caption: "Victor feints at the road while most of Lapisse’s division, Maison leading under a cloud of skirmishers, climbs Las Peñucas. Acevedo and his brigadiers Quirós and Valdés are struck down and the Asturians flee.",
        at: {
          mahy: [275, 120],
          lapisse: [820, 335],
        },
        broken: ['ace'],
        arrows: [
          { side: 'bottom', points: [[815, 320], [810, 280], [815, 235]] },
          { side: 'bottom', points: [[480, 385], [480, 345]] },
        ],
      },
      {
        title: 'The line collapses',
        caption: "Maison, on the captured heights, falls on Figueroa’s flank while Victor sends his whole line forward. The Spaniards give way everywhere, wade the Trueba and flee towards Reinosa, leaving their six guns and baggage.",
        at: {
          lapisse: [700, 225],
          villatte: [480, 355],
          puthod: [185, 262],
          ruffin: [305, 270],
        },
        broken: ['sanroman', 'mendiz', 'riq', 'fig', 'mahy', 'mart'],
        gone: ['guns'],
        arrows: [
          { side: 'bottom', points: [[700, 215], [640, 205], [600, 205]] },
          { side: 'bottom', points: [[480, 345], [480, 305]] },
          { side: 'top', points: [[335, 195], [310, 120], [270, 40]], style: 'rout' },
          { side: 'top', points: [[580, 192], [520, 110], [440, 30]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'French victory; the Army of the Left is routed',
    losses: 'Oman: Spanish killed and wounded probably under 3,000, French over 1,000; other totals run higher.',
    text: [
      "Straggling cost Blake more than the fighting. Oman counts some 12,000 men at Reinosa out of the 23,000 who stood at Espinosa; Napier saw only about 7,000. On 14 November Soult's cavalry fell on his convoy, and the wounded Acevedo was, it is said, killed with it.",
      "Blake abandoned his guns and wagons and struggled over the mountains to the coast. There La Romana arrived on 15 November to replace him. With the Army of the Left broken, Napoleon, already at Burgos, was free to march on Madrid.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 1 (1902), Section VII chap. 3, pp. 402–16 and the retreat that followed',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 1 (1828), Book IV chap. 1, pp. 391–93',
  ],
};

export default history;
