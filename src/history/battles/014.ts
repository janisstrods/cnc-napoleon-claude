// Quatre Bras (16 June 1815). Top: British and Allied (Wellington); bottom: French (Ney).
// North is at the top: the French come up the Charleroi road from Frasnes in the south, the Allies hold the crossroads to the north,
// with the Bossu wood to the west (left). Distances are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '014',
  date: '16 June 1815',
  context: {
    war: 'Waterloo campaign (Seventh Coalition), June 1815',
    text: [
      "Napoleon returned from Elba in March 1815, and the powers of Europe set their armies against him. He chose to strike first. On 15 June he crossed the Sambre into Belgium with the Army of the North, hoping to defeat Wellington's Allied army (British, Dutch-Belgian and German) and Blücher's Prussians one after the other.",
      "On 16 June he attacked the Prussians at Ligny himself and sent Marshal Ney up the Brussels road to seize the crossroads of Quatre Bras, which linked the two Allied armies. The Prince of Orange held it with Perponcher's Dutch-Belgian division until Wellington's regiments marched in from Nivelles and Brussels.",
    ],
  },
  sides: {
    top: {
      name: 'British and Allied army',
      commanders: ['Duke of Wellington (commanding)', 'Prince of Orange (I Corps)', 'Perponcher (Dutch-Belgian division)', 'Picton (5th Division)'],
      strength: 'About 7,800 men at two o’clock (Houssaye), swelling through the evening as reinforcements arrived',
      forces: 'Dutch-Belgian and Nassau troops first, then British, Hanoverian and Brunswick brigades marching in through the afternoon.',
    },
    bottom: {
      name: 'French (Army of the North, left wing)',
      commanders: ['Marshal Ney (commanding)', 'Reille (II Corps)', 'Foy and Bachelu (divisions)', 'Kellermann (cuirassiers)'],
      strength: 'Perhaps 20,000 men (Houssaye’s count of bayonets and sabres); d’Erlon’s I Corps never arrived',
      forces: 'Three divisions of Reille’s II Corps (Bachelu, Foy, Jérôme), Piré’s light cavalry and one brigade of Kellermann’s cuirassiers, with strong artillery.',
    },
  },
  map: {
    north: 0,
    terrain: [
      { kind: 'woods', points: [[40, 80], [300, 80], [330, 220], [300, 322], [130, 332], [40, 300]], label: 'Bossu wood' },
      { kind: 'hills', points: [[470, 150], [740, 148], [762, 230], [480, 240]] },
      { kind: 'river', points: [[-40, 384], [200, 372], [330, 368], [500, 372], [760, 370], [1040, 380]], width: 10 },
      { kind: 'road', points: [[400, -20], [410, 112], [405, 330], [402, 640]] },
      { kind: 'road', points: [[-30, 100], [410, 112], [1030, 150]] },
      { kind: 'label', at: [455, 24], text: 'to Brussels' },
      { kind: 'label', at: [455, 592], text: 'to Frasnes' },
      { kind: 'label', at: [60, 108], text: 'Nivelles' },
      { kind: 'label', at: [940, 134], text: 'Namur' },
      { kind: 'town', at: [410, 112], size: 20, label: 'Quatre Bras' },
      { kind: 'farm', at: [405, 330], size: 16, label: 'Gemioncourt' },
      { kind: 'farm', at: [258, 342], size: 14, label: 'Pierrepont' },
      { kind: 'farm', at: [640, 205], size: 16, label: 'Piraumont' },
    ],
    units: [
      { id: 'weimar', side: 'top', kind: 'infantry', label: 'Saxe-Weimar’s Nassau', w: 80, h: 28 },
      { id: 'perp', side: 'top', kind: 'infantry', label: 'Perponcher’s division', w: 84, h: 28 },
      { id: 'tart', side: 'top', kind: 'artillery', label: 'Allied batteries', w: 44, h: 24 },
      { id: 'kempt', side: 'top', kind: 'infantry', label: 'Kempt (Picton)', w: 80, h: 28 },
      { id: 'pack', side: 'top', kind: 'infantry', label: 'Pack’s brigade', w: 80, h: 28 },
      { id: 'hano', side: 'top', kind: 'infantry', label: 'Hanoverians', w: 70, h: 26 },
      { id: 'merlen', side: 'top', kind: 'cavalry', label: 'Van Merlen’s brigade', w: 76, h: 22 },
      { id: 'bruns', side: 'top', kind: 'infantry', label: 'Brunswick corps', w: 80, h: 28 },
      { id: 'halkett', side: 'top', kind: 'infantry', label: 'Halkett’s brigade', w: 80, h: 28 },
      { id: 'guards', side: 'top', kind: 'guard', label: 'Guards (Maitland)', w: 84, h: 28 },
      { id: 'bachelu', side: 'bottom', kind: 'infantry', label: 'Bachelu’s division', w: 90, h: 28 },
      { id: 'foy', side: 'bottom', kind: 'infantry', label: 'Foy’s division', w: 90, h: 28 },
      { id: 'jerome', side: 'bottom', kind: 'infantry', label: 'Jérôme’s division', w: 90, h: 28 },
      { id: 'pire', side: 'bottom', kind: 'cavalry', label: 'Piré’s lancers', w: 76, h: 22 },
      { id: 'fart', side: 'bottom', kind: 'artillery', label: 'French batteries', w: 44, h: 24 },
      { id: 'keller', side: 'bottom', kind: 'heavycavalry', label: 'Kellermann (cuirass.)', w: 80, h: 24 },
    ],
    phases: [
      {
        title: 'Ney attacks',
        caption: 'Ney strikes between two and three at the Prince of Orange’s 7,800 Dutch-Belgians. Bachelu drives the outposts back on Piraumont and Foy takes Gemioncourt; from three Jérôme attacks Pierrepont and the Bossu wood.',
        at: {
          weimar: [300, 190],
          perp: [540, 270],
          tart: [500, 160],
          bachelu: [580, 470],
          foy: [410, 478],
          jerome: [240, 480],
          pire: [500, 538],
          fart: [470, 430],
        },
        arrows: [
          { side: 'bottom', points: [[580, 446], [600, 340], [630, 250]] },
          { side: 'bottom', points: [[410, 454], [408, 380], [405, 346]] },
          { side: 'bottom', points: [[240, 456], [250, 400], [262, 360]] },
        ],
      },
      {
        title: 'Reinforcements arrive',
        caption: 'About three, Picton’s division and van Merlen’s cavalry arrive, and the Brunswickers follow. Kempt’s bayonets throw Bachelu back towards Piraumont, while Jérôme’s men take most of the Bossu wood. The Duke of Brunswick falls.',
        at: {
          kempt: [700, 170],
          pack: [590, 178],
          hano: [610, 100],
          merlen: [350, 290],
          bruns: [420, 205],
          weimar: [290, 170],
          perp: [545, 290],
          bachelu: [610, 335],
          foy: [412, 372],
          jerome: [250, 300],
          pire: [540, 530],
        },
        arrows: [
          { side: 'top', points: [[700, 196], [690, 235], [668, 262]] },
          { side: 'bottom', points: [[690, 290], [650, 330], [625, 355]], style: 'retreat' },
          { side: 'bottom', points: [[250, 380], [250, 330], [250, 300]] },
        ],
      },
      {
        title: 'Kellermann charges',
        caption: 'About six (Houssaye; others say nearer five), Ney orders Kellermann to charge with a single cuirassier brigade. They break the 69th and 33rd of Halkett’s brigade and reach the crossroads, but, unsupported, are shot down and flee.',
        at: {
          halkett: [450, 288],
          merlen: [335, 268],
          keller: [475, 128],
          foy: [412, 410],
          bachelu: [590, 400],
          jerome: [250, 320],
        },
        broken: ['keller'],
        arrows: [
          { side: 'bottom', points: [[420, 420], [430, 330], [462, 150]] },
          { side: 'bottom', points: [[500, 150], [540, 250], [570, 380]], style: 'retreat' },
        ],
      },
      {
        title: 'Allies counter-attack',
        caption: 'From about seven the Guards of Maitland and Byng, with Brunswick and Nassau troops, push forward. The French leave the wood and give up Gemioncourt and Piraumont. By nightfall both armies are back where they began.',
        at: {
          guards: [340, 262],
          halkett: [440, 285],
          pack: [570, 250],
          kempt: [700, 235],
          bruns: [420, 205],
          weimar: [250, 215],
          merlen: [530, 345],
          foy: [412, 450],
          bachelu: [590, 450],
          jerome: [240, 450],
          fart: [480, 520],
          keller: [560, 548],
        },
        arrows: [
          { side: 'top', points: [[340, 180], [310, 250], [280, 300]] },
          { side: 'top', points: [[440, 250], [440, 300], [425, 345]] },
          { side: 'top', points: [[690, 210], [680, 260], [650, 300]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'draw',
    result: 'Indecisive: the Allies held the crossroads',
    losses: 'French about 4,300 and Allies about 4,700, both estimates (Houssaye); British and Hanoverian returns total 2,911.',
    text: [
      'Houssaye describes a battle that ended without result, both armies back on their morning ground. Ney had failed to take Quatre Bras, and d’Erlon’s corps, marching and countermarching between the two fields, fought at neither. Wellington’s dispatch claims every French attempt on the position was repulsed.',
      'That night Blücher, beaten at Ligny, fell back on Wavre, and Wellington withdrew on the 17th to the ridge by Waterloo, where the campaign was decided two days later.',
    ],
  },
  sources: [
    'Houssaye, 1815: Waterloo (tr. A. E. Mann, 1900), book II ch. III',
    'Wellington to Bathurst, Waterloo, 19 June 1815, and return of Quatre Bras losses, in Gurwood, Dispatches, vol. XII, pp. 478–485',
  ],
};

export default history;
