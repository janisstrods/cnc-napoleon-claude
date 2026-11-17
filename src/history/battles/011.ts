// Salamanca, attack on the French right (22 July 1812). Top: British (Wellington); bottom: French (Marmont, then Clausel).
// The map is turned: north points to the right, so the allied heights run along the top edge, the Arapile hills and the forest of
// Alba lie at the left, and Foy's plateau at Calvarisa de Ariba is at the lower right. Distances and unit places are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '011',
  date: '22 July 1812',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "For a month Wellington and Marshal Marmont had marched and countermarched along the Douro and the Tormes. On 22 July the French main body filed west along the plateau south of the village of Arapiles, leaving Foy's division and Ferey's behind at Calvarisa de Ariba, facing the allied left across rolling, wooded ground.",
      "Wellington held the Light and 1st Divisions there, hidden behind the crest, while Pakenham and Leith struck the French left (told in 010). This history covers the allied left, the French counterstroke that failed in the centre, and the last stand at dusk.",
    ],
  },
  sides: {
    top: {
      name: 'British, with Portuguese',
      commanders: ['Wellington (army commander)', 'C. Alten (Light Division)', 'H. Campbell (1st Division)', 'Bock (heavy dragoons)'],
      strength: 'Army c. 50,000; the left wing did little fighting until evening (Oman)',
      forces: "Light and 1st Divisions, Bock's heavy dragoons and 7th Division early on; in the evening Clinton's 6th Division and Rezende's Portuguese.",
    },
    bottom: {
      name: 'French (Army of Portugal)',
      commanders: ['Foy (1st Division)', 'Ferey (3rd Division)', 'Clausel (in command from about 6 pm)', 'Bonnet (wounded; the Arapile)'],
      strength: 'Army c. 48,500; Foy and Ferey held the French right (Oman)',
      forces: "Foy's division with a regiment of Boyer's dragoons and Ferey's four regiments; then Bonnet, Clausel and Sarrut rallying behind them.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'hills', points: [[-60, -40], [1060, -40], [1060, 150], [900, 160], [720, 142], [520, 152], [340, 142], [270, 150], [-60, 150]] },
      { kind: 'hills', points: [[200, 175], [282, 165], [304, 215], [264, 250], [205, 235]] },
      { kind: 'hills', points: [[75, 285], [170, 275], [195, 330], [140, 368], [70, 342]] },
      { kind: 'hills', points: [[505, 320], [610, 310], [632, 385], [550, 418], [495, 388]] },
      { kind: 'hills', points: [[560, 450], [790, 440], [840, 540], [760, 600], [570, 600]] },
      { kind: 'woods', points: [[-60, 480], [200, 490], [262, 565], [250, 640], [-60, 640]], label: 'forest of Alba' },
      { kind: 'town', at: [245, 85], size: 14, label: 'Arapiles' },
      { kind: 'town', at: [660, 565], size: 18, label: 'Calvarisa de Ariba' },
      { kind: 'farm', at: [560, 352], size: 10, label: 'N.S. de la Peña' },
      { kind: 'label', at: [255, 268], text: 'Lesser Arapile' },
      { kind: 'label', at: [70, 395], text: 'Greater Arapile' },
    ],
    units: [
      { id: 'light', side: 'top', kind: 'infantry', label: 'Light Division (Alten)', w: 100 },
      { id: 'first', side: 'top', kind: 'infantry', label: '1st Div. (H. Campbell)', w: 100 },
      { id: 'guards', side: 'top', kind: 'guard', label: 'Guards brigade', w: 90 },
      { id: 'kgl', side: 'top', kind: 'infantry', label: 'KGL brigade', w: 90 },
      { id: 'seventh', side: 'top', kind: 'infantry', label: '7th Division', w: 100 },
      { id: 'screen', side: 'top', kind: 'light', label: '68th, 2nd Caçadores', w: 100 },
      { id: 'rifles', side: 'top', kind: 'light', label: '95th Rifles', w: 80 },
      { id: 'bock', side: 'top', kind: 'heavycavalry', label: "Bock's KGL heavies" },
      { id: 'aten', side: 'top', kind: 'cavalry', label: "V. Alten's squadrons" },
      { id: 'fus', side: 'top', kind: 'infantry', label: 'Fusilier brigade', w: 90 },
      { id: 'clinton', side: 'top', kind: 'infantry', label: '6th Div. (Clinton)', w: 110 },
      { id: 'foy', side: 'bottom', kind: 'infantry', label: 'Foy (1st Division)', w: 110 },
      { id: 'fvolt', side: 'bottom', kind: 'light', label: "Foy's voltigeurs", w: 80 },
      { id: 'ferey', side: 'bottom', kind: 'infantry', label: "Ferey's line regiments", w: 110 },
      { id: 'fer31', side: 'bottom', kind: 'light', label: '31st Léger', w: 80 },
      { id: 'boyer', side: 'bottom', kind: 'heavycavalry', label: "Boyer's dragoons" },
      { id: 'bonnet', side: 'bottom', kind: 'infantry', label: 'Bonnet (Arapile)', w: 100 },
      { id: 'guns', side: 'bottom', kind: 'artillery', label: 'Guns on the Arapile', w: 50 },
      { id: 'claus', side: 'bottom', kind: 'infantry', label: 'Clausel', w: 90 },
    ],
    phases: [
      {
        title: 'Skirmish at the chapel',
        caption: "At daybreak Foy's voltigeurs push at the hill of Nuestra Señora de la Peña. The 68th and the 2nd Caçadores of the 7th Division throw them back, and the two skirmish lines trade fire for hours.",
        at: {
          seventh: [450, 235],
          screen: [545, 330],
          guards: [560, 112],
          first: [670, 118],
          kgl: [780, 118],
          light: [880, 170],
          aten: [740, 50],
          bock: [830, 80],
          foy: [650, 495],
          fvolt: [570, 410],
          ferey: [800, 555],
          fer31: [520, 555],
          boyer: [860, 480],
          bonnet: [150, 400],
          guns: [125, 322],
        },
        arrows: [{ side: 'top', points: [[545, 262], [548, 295], [550, 318]] }],
      },
      {
        title: 'Foy and Ferey left behind',
        caption: "The French main body files west, and Ferey hurries across to the centre, leaving Foy two miles from the rest. The 7th Division is drawn back, the 95th take over the slopes, and the Light and 1st Divisions pin Foy.",
        at: {
          ferey: [340, 445],
          fer31: [235, 455],
          seventh: [510, 215],
          rifles: [545, 335],
          light: [800, 290],
          first: [670, 190],
        },
        gone: ['screen'],
        arrows: [
          { side: 'bottom', points: [[760, 575], [600, 545], [430, 470]] },
          { side: 'top', points: [[880, 195], [840, 250], [805, 285]] },
        ],
      },
      {
        title: "Clausel's counterstroke",
        caption: "In the evening Clausel and Bonnet, with Boyer's dragoons, drive the 4th Division back down its slope. Clinton's 6th Division then advances over the same ground and beats Bonnet's division in a close musketry duel.",
        at: {
          claus: [85, 235],
          fus: [105, 150],
          bonnet: [270, 310],
          boyer: [365, 330],
          clinton: [380, 185],
        },
        arrows: [
          { side: 'bottom', points: [[170, 385], [235, 335], [262, 320]] },
          { side: 'bottom', points: [[430, 430], [390, 370], [372, 340]] },
          { side: 'top', points: [[370, 205], [335, 265], [295, 305]] },
        ],
      },
      {
        title: "Ferey's stand at dusk",
        caption: "Bonnet breaks and the Arapile is abandoned. Ferey's line holds the forest edge against Clinton for half an hour or more, while Foy falls back before the Light Division and the army escapes into the night.",
        at: {
          ferey: [110, 440],
          fer31: [220, 450],
          clinton: [215, 372],
          fus: [60, 335],
          foy: [450, 560],
          light: [690, 430],
          first: [570, 270],
          boyer: [380, 520],
          claus: [150, 255],
        },
        broken: ['bonnet', 'claus'],
        gone: ['guns'],
        arrows: [
          { side: 'top', points: [[330, 240], [270, 320], [225, 360]] },
          { side: 'bottom', points: [[640, 540], [550, 565], [470, 570]], style: 'retreat' },
          { side: 'top', points: [[800, 300], [750, 380], [700, 425]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Allied victory; the French right covers the flight',
    losses: "6th Division about 1,500, its Portuguese brigade 487 in fifteen minutes; Bonnet's division at least 2,200, Ferey's four regiments over 1,100 (Oman).",
    text: [
      "Clausel's counterstroke gave the French half an hour of hope before Clinton's 6th Division and Spry's Portuguese, led by Beresford, turned it back. Ferey, killed or mortally wounded (sources differ), and Foy bought time for the army to escape.",
      "Wellington believed that the Spanish garrison still held the castle of Alba de Tormes, so his pursuit marched toward the fords of Huerta. In fact the French poured over the bridge at Alba until three in the morning. Their next rearguard is 012.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 5 (1914), section 33, chs. 6–7, pp. 418–472',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 4, book 18, chs. 3–4',
    "Wellington to Bathurst, 24 July 1812, Wellington's Dispatches (Gurwood), vol. 9, pp. 301–307",
  ],
};

export default history;
