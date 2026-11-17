// 118 Ordal, the night of 12–13 September 1813. Top: Adam's advanced guard of Bentinck's Anglo-Sicilian army with a Spanish brigade; bottom: Suchet's Army of Aragon.
// Drawn with the Allies at the top, facing the French, who come up the Barcelona road from Molins de Rey. The Allies look north-east, so north points to the lower right. The ravine
// and viaduct lie in front of the pass; Villafranca is off the top. Distances and places are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '118',
  date: '12–13 September 1813',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "In September 1813 Lord William Bentinck, with the Anglo-Sicilian army, advanced from Tarragona to Villafranca. He believed reports that Suchet had sent large forces north to France and that the French might leave Catalonia. In fact Suchet had gathered most of his Army of Aragon at Molins de Rey, near Barcelona.",
      "On 12 September Bentinck sent Colonel Adam's advanced guard ten miles forward to hold the Ordal pass, where a Spanish brigade joined it that evening. Suchet heard of the move and resolved to retake the pass by a night surprise, while Decaen marched by another valley to turn the Allied flank.",
    ],
  },
  sides: {
    top: {
      name: 'Anglo-Sicilian advanced guard and Spaniards',
      commanders: ['Colonel Adam (advanced guard)', 'Colonel Torres (Spanish brigade)', 'Colonel Reeves (2/27th Foot)', 'Lord William Bentinck (at Villafranca)'],
      strength: 'About 1,500–1,600 under Adam plus 2,300 Spaniards (Oman); Napier says Adam had about 1,200',
      forces: 'The 2/27th, the Calabrese Free Corps, German and Swiss rifle companies, four light guns, Brunswick hussars and three Spanish battalions of Sarsfield’s division.',
    },
    bottom: {
      name: 'French Army of Aragon',
      commanders: ['Marshal Suchet (commanding)', 'Harispe (division)', 'Habert (division)', 'Mesclop (leading brigade)'],
      strength: "About 10,000 infantry and 1,500 horse in Suchet's column (Oman); Decaen's other column about 7,000 foot",
      forces: "Harispe's and Habert's divisions in one long column on the high road with Suchet's cavalry behind, and Bugeaud's battalion sent by the goat-path.",
    },
  },
  map: {
    north: 135,
    terrain: [
      { kind: 'woods', points: [[40, 100], [260, 90], [280, 190], [50, 205]] },
      { kind: 'woods', points: [[740, 90], [950, 85], [960, 185], [750, 195]] },
      { kind: 'woods', points: [[760, 500], [960, 500], [985, 590], [770, 590]] },
      { kind: 'hills', points: [[80, 225], [920, 210], [940, 345], [60, 355]] },
      { kind: 'river', points: [[-30, 405], [200, 425], [420, 450], [600, 435], [800, 460], [1040, 445]], width: 8, label: 'Ravine' },
      { kind: 'road', points: [[470, -20], [480, 200], [498, 350], [503, 445], [540, 600]], },
      { kind: 'redoubt', at: [498, 335], size: 24 },
      { kind: 'redoubt', at: [445, 268], size: 22 },
      { kind: 'redoubt', at: [575, 250], size: 22 },
      { kind: 'label', at: [580, 480], text: 'Ordal viaduct' },
      { kind: 'label', at: [400, 585], text: 'to Molins de Rey' },
      { kind: 'label', at: [690, 242], text: 'Ordal ridge' },
      { kind: 'label', at: [150, 455], text: 'Goat-path' },
      { kind: 'label', at: [470, 20], text: 'to Villafranca' },
    ],
    units: [
      { id: 'a27', side: 'top', kind: 'infantry', label: '2/27th (Inniskillings)', w: 84 },
      { id: 'rifles', side: 'top', kind: 'light', label: 'Rifles', w: 70 },
      { id: 'guns', side: 'top', kind: 'artillery', label: 'Guns (4)', w: 44 },
      { id: 'torres', side: 'top', kind: 'infantry', label: 'Torres (Spanish)', w: 100 },
      { id: 'calab', side: 'top', kind: 'infantry', label: 'Calabrese Free Corps', w: 90 },
      { id: 'hors', side: 'top', kind: 'cavalry', label: 'Horse', w: 70 },
      { id: 'mesclop', side: 'bottom', kind: 'infantry', label: 'Mesclop (Harispe)', w: 90 },
      { id: 'harispe', side: 'bottom', kind: 'infantry', label: 'Harispe (reserve bde)', w: 90 },
      { id: 'habert', side: 'bottom', kind: 'infantry', label: 'Habert', w: 90 },
      { id: 'bugeaud', side: 'bottom', kind: 'light', label: 'Bugeaud (2/116th)', w: 76 },
      { id: 'fhuss', side: 'bottom', kind: 'cavalry', label: 'French cavalry', w: 70 },
    ],
    phases: [
      {
        title: 'The pass at nightfall',
        caption: "Adam holds the old trenches above the viaduct: the 2/27th on the right, riflemen and guns by the road, the Spaniards in the centre, the Calabrese on the left. No picket guards the bridge. Suchet's column is ten miles away.",
        at: {
          a27: [215, 300],
          rifles: [498, 322],
          guns: [490, 268],
          torres: [345, 300],
          calab: [700, 300],
          hors: [570, 195],
          mesclop: [500, 585],
          harispe: [420, 590],
          habert: [590, 590],
          bugeaud: [180, 560],
          fhuss: [680, 590],
        },
        arrows: [{ side: 'bottom', points: [[510, 570], [505, 520], [503, 480]] }],
      },
      {
        title: 'Across the viaduct',
        caption: "A little before midnight, in moonlight, Mesclop's leading regiments cross the bridge unopposed, fire on a Spanish patrol and storm the front trench. Each battalion behind deploys to its left, towards the Allied right, while Bugeaud climbs the goat-path.",
        at: {
          mesclop: [498, 365],
          habert: [575, 470],
          harispe: [420, 470],
          bugeaud: [170, 455],
          rifles: [498, 290],
          fhuss: [610, 560],
        },
        arrows: [
          { side: 'bottom', points: [[503, 470], [500, 420], [498, 372]] },
          { side: 'bottom', points: [[170, 520], [160, 480], [165, 440]] },
        ],
      },
      {
        title: 'The right flank turned',
        caption: "The Spaniards fight well and twice counter-attack, but Habert's division and Harispe's reserve outflank them while Bugeaud turns the 27th. Adam is hit early, and Reeves, who orders a retreat, is wounded soon after, leaving no commander.",
        at: {
          mesclop: [470, 365],
          habert: [350, 375],
          harispe: [245, 375],
          bugeaud: [190, 345],
          rifles: [530, 275],
        },
        broken: ['a27'],
        arrows: [
          { side: 'bottom', points: [[500, 425], [440, 395], [390, 380]] },
          { side: 'bottom', points: [[240, 425], [215, 390], [200, 355]] },
          { side: 'top', points: [[345, 290], [350, 320], [350, 345]] },
        ],
      },
      {
        title: 'Dispersal',
        caption: "By perhaps two or three in the morning the Allied line has broken. Survivors of the 27th and the Spaniards scatter in the dark, the guns are taken on the road, and the Calabrese slip away along the crest, nearly intact.",
        at: {
          torres: [345, 215],
          a27: [250, 200],
          calab: [830, 205],
          mesclop: [470, 300],
          fhuss: [540, 200],
        },
        broken: ['torres'],
        gone: ['guns', 'rifles', 'hors'],
        arrows: [
          { side: 'top', points: [[345, 290], [345, 255], [345, 225]], style: 'rout' },
          { side: 'top', points: [[700, 290], [790, 250], [830, 215]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: "French night victory; Adam's advanced guard routed",
    losses: "Allies just over 1,000, 464 of them prisoners, mostly wounded; Suchet's 271 covers this and the next day's cavalry fight, and Oman suspects nearer 300 for Ordal alone.",
    text: [
      "Four guns and many prisoners were taken. Bentinck fell back from Villafranca on the 13th in good order, and Lord Frederick Bentinck's cavalry checked Suchet's horsemen at the Venta de Monjos before the army retired to Tarragona. Oman blames Adam's neglect of precautions and Bentinck's trust in the pass; Napier faults Adam over the bridge but defends Bentinck's advance.",
      "Bentinck sailed for Sicily on 22 September, leaving Clinton in command, and the Allied threat to the French in Catalonia faded.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 7 (1930), section XL, ch. 3, pp. 96–109 (Ordal pp. 98–104; Villafranca pp. 104–08; losses pp. 103–04 and appendix)',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 6 (1840), Book XXI, ch. 2, pp. 55–61 (combat of Ordal pp. 56–58, observations pp. 59–61)',
  ],
};

export default history;
