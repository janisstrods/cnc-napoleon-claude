// 116 Vitoria, 21 June 1813. Top: Wellington's British, Portuguese and Spanish army; bottom: King Joseph's three French armies.
// Drawn with the Allies at the top, so west is up and north points to the right: the Zadorra runs along the top, the Puebla gap and Hill's column are at the left,
// Graham's column and the upper Zadorra at the right, and Vitoria at the lower right. Distances and unit places are schematic; the divisions are shown as single blocks.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '116',
  date: '21 June 1813',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In 1813 Napoleon needed his veterans in Germany, and King Joseph, with Marshal Jourdan as his chief of staff, held Spain with scattered armies. Wellington began his advance in late May, sending his left wing north of the Douro, and turned each French position in turn. The French blew up Burgos castle in mid-June and Joseph halted in the basin of Vitoria on 19 June, hoping that Clausel's detached force would reach him.",
      "The winding Zadorra, whose eleven bridges the French left unblown, ran across his front, and his line faced the Bayas, from which Wellington was expected. Instead four columns, the largest of them Graham's on the Bilbao road, converged on the river and on the road to France.",
    ],
  },
  sides: {
    top: {
      name: 'British, Portuguese and Spanish army',
      commanders: ['Wellington (commanding)', 'Hill (right column)', 'Picton and Dalhousie (centre)', 'Graham (left column)'],
      strength: 'About 75,000 present, not counting the 6th Division and Giron (Oman)',
      forces: "Seven British divisions (the 7th with one brigade up), Silveira's Portuguese, Morillo's and Longa's Spaniards, strong cavalry and about 75 guns in the closing cannonade.",
    },
    bottom: {
      name: 'French Armies of the South, Centre and Portugal',
      commanders: ['King Joseph Bonaparte (commanding)', 'Marshal Jourdan (chief of staff)', "Gazan (South), D'Erlon (Centre), Reille (Portugal)"],
      strength: 'About 57,000 fighting men, 63,000 of all ranks, 153 guns (Oman)',
      forces: "Gazan's Army of the South on the river line, D'Erlon's Army of the Centre behind it, Reille on the Bilbao road, the Royal Guard and a large cavalry reserve.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'hills', points: [[300, -10], [640, -10], [640, 40], [300, 40]], label: 'Monte Arrato' },
      { kind: 'hills', points: [[0, 100], [380, 122], [400, 228], [10, 255]], label: 'Heights of Puebla' },
      { kind: 'hills', points: [[350, 245], [480, 232], [515, 335], [370, 362]] },
      {
        kind: 'river',
        points: [[-30, 45], [70, 60], [170, 100], [240, 112], [330, 105], [400, 112], [450, 140], [470, 190], [520, 205], [565, 160], [570, 112], [630, 98], [700, 115], [760, 150], [820, 180], [880, 205], [935, 250], [985, 300], [1040, 340]],
        width: 12,
        label: 'Zadorra',
      },
      { kind: 'road', points: [[40, 70], [230, 215], [400, 300], [560, 380], [680, 430], [800, 490]], label: 'Great road' },
      { kind: 'road', points: [[800, 490], [900, 420], [985, 300]] },
      { kind: 'road', points: [[800, 490], [880, 560], [960, 640]], label: 'Salvatierra road' },
      { kind: 'town', at: [235, 215], size: 14, label: 'Subijana' },
      { kind: 'town', at: [410, 303], size: 16, label: 'Arinez' },
      { kind: 'town', at: [800, 490], size: 32, label: 'Vitoria' },
      { kind: 'town', at: [890, 185], size: 14, label: 'Gamarra Mayor' },
      { kind: 'label', at: [250, 92], text: 'Nanclares' },
      { kind: 'label', at: [430, 108], text: 'Villodas' },
      { kind: 'label', at: [525, 222], text: 'Tres Puentes' },
      { kind: 'label', at: [610, 80], text: 'Mendoza' },
      { kind: 'label', at: [690, 395], text: 'Zuazo' },
      { kind: 'label', at: [985, 275], text: 'Durana' },
    ],
    units: [
      { id: 'morillo', side: 'top', kind: 'infantry', label: 'Morillo (Sp.)', w: 76 },
      { id: 'div2', side: 'top', kind: 'infantry', label: 'Stewart, 2nd', w: 76 },
      { id: 'silv', side: 'top', kind: 'infantry', label: 'Silveira (Port.)', w: 70 },
      { id: 'div4', side: 'top', kind: 'infantry', label: 'Cole, 4th', w: 76 },
      { id: 'light', side: 'top', kind: 'light', label: 'Light Div.', w: 76 },
      { id: 'div3', side: 'top', kind: 'infantry', label: 'Picton, 3rd', w: 76 },
      { id: 'div7', side: 'top', kind: 'infantry', label: 'Dalhousie, 7th', w: 76 },
      { id: 'pack', side: 'top', kind: 'infantry', label: 'Pack, Bradford', w: 76 },
      { id: 'div1', side: 'top', kind: 'infantry', label: 'Graham, 1st', w: 76 },
      { id: 'div5', side: 'top', kind: 'infantry', label: 'Oswald, 5th', w: 70 },
      { id: 'longa', side: 'top', kind: 'infantry', label: 'Longa (Sp.)', w: 66 },
      { id: 'cav', side: 'top', kind: 'cavalry', label: 'Cavalry', w: 66 },
      { id: 'guns', side: 'top', kind: 'artillery', label: 'Dickson guns', w: 44 },
      { id: 'maransin', side: 'bottom', kind: 'infantry', label: 'Maransin', w: 70 },
      { id: 'conroux', side: 'bottom', kind: 'infantry', label: 'Conroux', w: 76 },
      { id: 'daricau', side: 'bottom', kind: 'infantry', label: 'Daricau', w: 76 },
      { id: 'leval', side: 'bottom', kind: 'infantry', label: 'Leval', w: 76 },
      { id: 'villatte', side: 'bottom', kind: 'infantry', label: 'Villatte', w: 76 },
      { id: 'darm', side: 'bottom', kind: 'infantry', label: 'Darmagnac', w: 76 },
      { id: 'cass', side: 'bottom', kind: 'infantry', label: 'Cassagne', w: 76 },
      { id: 'guard', side: 'bottom', kind: 'guard', label: 'Royal Guard', w: 70 },
      { id: 'fcav', side: 'bottom', kind: 'cavalry', label: 'Cavalry', w: 66 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'Guns', w: 44 },
      { id: 'sarrut', side: 'bottom', kind: 'infantry', label: 'Sarrut', w: 70 },
      { id: 'lamart', side: 'bottom', kind: 'infantry', label: 'Lamartinière', w: 76 },
    ],
    phases: [
      {
        title: 'Eight in the morning',
        caption: "Hill crosses the Zadorra below the Puebla gap and Morillo's Spaniards climb the heights; the centre columns wait hidden on Monte Arrato. Graham's column, delayed by Reille's outposts, comes down towards the upper river.",
        at: {
          morillo: [80, 140], div2: [170, 70], silv: [90, 25], div4: [260, 25], light: [440, 60], div3: [545, 25],
          div7: [650, 65], pack: [735, 25], div1: [850, 65], div5: [880, 25], longa: [930, 112],
          maransin: [120, 215], conroux: [300, 272], daricau: [340, 322], leval: [450, 262], villatte: [430, 388],
          darm: [650, 405], cass: [560, 445], guard: [700, 520], fcav: [470, 505], fguns: [470, 330],
          sarrut: [870, 128], lamart: [925, 292],
        },
        arrows: [
          { side: 'top', points: [[80, 95], [85, 130], [100, 175]] },
          { side: 'top', points: [[190, 85], [205, 120], [220, 160]] },
          { side: 'top', points: [[850, 85], [865, 110], [875, 150]] },
        ],
      },
      {
        title: 'Heights and bridges',
        caption: "Maransin and then Rey's brigade fail on the Puebla heights, and Villatte is drawn up after them. A peasant guides Kempt's riflemen over the unwatched Tres Puentes bridge; Picton storms Mendoza. Graham's 5th Division takes Gamarra Mayor.",
        at: {
          morillo: [130, 170], div2: [235, 150], maransin: [150, 240], villatte: [355, 180],
          light: [515, 152], div3: [610, 140], div5: [905, 135], div1: [830, 95], sarrut: [860, 252], longa: [945, 195],
        },
        arrows: [
          { side: 'top', points: [[440, 75], [480, 110], [515, 140]] },
          { side: 'top', points: [[545, 45], [590, 90], [610, 128]] },
          { side: 'top', points: [[150, 105], [150, 135], [145, 160]] },
          { side: 'top', points: [[905, 62], [905, 100], [900, 125]] },
          { side: 'bottom', points: [[420, 375], [380, 300], [358, 200]] },
        ],
      },
      {
        title: 'Arinez falls',
        caption: "Picton's 3rd Division, with Kempt's riflemen leading, storms Arinez and Leval's hill, the decisive blow. The 4th Division crosses at Nanclares, Dickson's guns mass, and the French fall back to a line from Zuazo to Gomecha.",
        at: {
          div3: [425, 262], light: [510, 228], div4: [335, 150], div7: [660, 150], cav: [300, 205], guns: [385, 225],
          leval: [460, 350], daricau: [380, 388], conroux: [330, 322], maransin: [180, 285], villatte: [225, 345],
          darm: [650, 385], cass: [545, 420], fguns: [560, 340], longa: [935, 265], div5: [905, 160],
          sarrut: [850, 255], lamart: [890, 345],
        },
        broken: ['leval'],
        arrows: [
          { side: 'top', points: [[425, 185], [430, 232], [430, 258]] },
          { side: 'top', points: [[505, 150], [508, 190], [508, 220]] },
          { side: 'top', points: [[960, 205], [957, 240]] },
          { side: 'bottom', points: [[445, 310], [455, 335], [460, 345]], style: 'retreat' },
        ],
      },
      {
        title: 'Rout of the French',
        caption: "About four o'clock Wellington's line, with 75 guns, advances again, and the French give way without a serious stand. With the Bayonne road cut at Durana, Joseph's army flees by the Salvatierra road, leaving guns and baggage.",
        at: {
          morillo: [235, 270], div2: [340, 255], div4: [440, 335], div3: [560, 380], light: [650, 320], div7: [745, 290],
          guns: [520, 295], cav: [470, 410], div1: [830, 205], div5: [900, 235], longa: [960, 315],
          maransin: [470, 470], conroux: [560, 510], daricau: [640, 535], leval: [735, 545], villatte: [400, 515],
          darm: [740, 440], cass: [625, 465], guard: [835, 548], fcav: [540, 575], fguns: [600, 430],
          sarrut: [790, 385], lamart: [885, 378],
        },
        broken: ['fguns', 'maransin'],
        arrows: [
          { side: 'top', points: [[430, 290], [480, 340], [555, 385]] },
          { side: 'top', points: [[300, 225], [350, 300], [410, 370]] },
          { side: 'bottom', points: [[620, 520], [720, 560], [800, 595]], style: 'rout' },
          { side: 'bottom', points: [[830, 400], [840, 460], [850, 520]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Allied victory; the French lose nearly all their guns',
    losses: "French about 8,000 on the official return, though Napier thought under 6,000 exclusive of prisoners; Allies about 5,100–5,200, mostly British and Portuguese, in the 2nd and 3rd Divisions and Robinson's brigade.",
    text: [
      "Joseph's army broke up and fled towards Pamplona, leaving 151 guns by Oman's count (Napier says 143), Jourdan's baton, the treasury and the plunder of Spain. The pursuit was feeble, and much of the baggage was looted by followers of both armies. Clausel, who had been marching to join the King, escaped by forced marches to Zaragoza.",
      "Wellington was made a field marshal, and Napoleon sent Soult to rebuild the beaten armies. The French made one last effort in the Pyrenees, ending at San Marcial (117), while the blockade of Pamplona went on into the autumn.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 6 (1922), section XXXVI, chs. 7–8, pp. 384–452; strengths pp. 388 and 754–57; trophies p. 442; losses pp. 445–46',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 5 (1836), Book XX, ch. 8, pp. 548–67 (trophies and losses at pp. 565–66)',
  ],
};

export default history;
