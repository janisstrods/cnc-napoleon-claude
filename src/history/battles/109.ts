// 109 Talavera, the Spanish flank, 28 July 1809. Top: Cuesta's Spanish army with Campbell's British 4th Division; bottom: the French 4th Corps and the King's reserve.
// Drawn as in 005 (the whole battle): allies at the top, north to the right, the Tagus and Talavera at the top left. This history covers the northern end of Cuesta's line
// at the Pajar de Vergara; the Cerro de Medellín, to the right, is only touched on. Distances and unit places are schematic.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '109',
  date: '28 July 1809',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "On 28 July 1809 Wellesley's army and General Cuesta's Spaniards fought King Joseph's French at Talavera on the Tagus. Wellesley's own fight on the Cerro de Medellín is told in 005; this history follows the Spanish end of the line.",
      "Cuesta's Army of Estremadura held the town and the walled, enclosed ground north of it as far as the Pajar de Vergara knoll, where it joined Campbell's British 4th Division. Cuesta had fallen back from Torrijos in some disorder, and a night panic on 27 July, blamed by Oman on Portago's division, had thinned his ranks further.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish army, with the British 4th Division',
      commanders: ['Cuesta (Spanish army)', 'Campbell (British 4th Division)', 'Manglano (division by the Pajar)', 'Henestrosa (cavalry)'],
      strength: 'Spaniards c. 32,000, of whom five or six battalions fought (Oman)',
      forces: 'Infantry behind banks and olive groves, Spanish guns in the Pajar redoubt beside British ones, cavalry behind, and a reserve division lent away.',
    },
    bottom: {
      name: 'French 4th Corps and reserve',
      commanders: ['King Joseph Bonaparte', 'Marshal Victor (1st Corps, other flank)', 'Sebastiani (4th Corps)', 'Leval (German division)'],
      strength: '4th Corps c. 14,000 in 23 battalions; Leval’s Germans c. 4,500 (Oman)',
      forces: "Leval's Baden, Hessian, Nassau and Dutch troops on the left, Sebastiani's French division, dragoons, and eighty guns in all.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'river', points: [[50, -30], [30, 200], [60, 420], [35, 640]], width: 22, label: 'Tagus' },
      { kind: 'woods', points: [[95, 105], [470, 98], [480, 330], [105, 340]] },
      { kind: 'hills', points: [[690, 40], [860, 40], [880, 215], [700, 230]] },
      { kind: 'hills', points: [[955, 10], [1050, 10], [1050, 260], [960, 260]] },
      { kind: 'river', points: [[1000, 238], [820, 252], [640, 247], [480, 257], [300, 247], [150, 252]], width: 8, label: 'Portiña brook' },
      { kind: 'town', at: [120, 58], size: 28, label: 'Talavera' },
      { kind: 'redoubt', at: [350, 125], size: 22 },
      { kind: 'label', at: [350, 66], text: 'Pajar de Vergara' },
      { kind: 'label', at: [200, 295], text: 'Olive groves' },
      { kind: 'label', at: [790, 103], text: 'Cerro de Medellín' },
      { kind: 'label', at: [930, 112], text: 'Segurilla' },
    ],
    units: [
      { id: 'iglesias', side: 'top', kind: 'infantry', label: 'Iglesias', w: 90, h: 28 },
      { id: 'manglano', side: 'top', kind: 'infantry', label: 'Manglano', w: 90, h: 28 },
      { id: 'portago', side: 'top', kind: 'infantry', label: 'Portago', w: 90, h: 28 },
      { id: 'guns', side: 'top', kind: 'artillery', label: 'Pajar guns (Sp./Br.)', w: 44 },
      { id: 'campbell', side: 'top', kind: 'infantry', label: 'Campbell (4th Div.)', w: 100, h: 28 },
      { id: 'guards', side: 'top', kind: 'guard', label: 'Guards', w: 70 },
      { id: 'rey', side: 'top', kind: 'cavalry', label: 'Regiment del Rey', w: 60 },
      { id: 'bass', side: 'top', kind: 'infantry', label: 'Bassecourt', w: 90, h: 28 },
      { id: 'milhaud', side: 'bottom', kind: 'heavycavalry', label: "Milhaud's dragoons", w: 80 },
      { id: 'leval', side: 'bottom', kind: 'infantry', label: 'Leval (Germans)', w: 120, h: 32 },
      { id: 'poles', side: 'bottom', kind: 'infantry', label: 'Polish battalions', w: 70, h: 28 },
      { id: 'sebast', side: 'bottom', kind: 'infantry', label: 'Sebastiani', w: 110, h: 32 },
      { id: 'latour', side: 'bottom', kind: 'heavycavalry', label: 'Latour-Maubourg', w: 90 },
      { id: 'fguns', side: 'bottom', kind: 'artillery', label: 'French guns (80)', w: 50 },
      { id: 'reserve', side: 'bottom', kind: 'guard', label: 'Dessolles, Guards', w: 100 },
    ],
    phases: [
      {
        title: 'The Spanish line',
        caption: "Cuesta holds Talavera and the groves with his infantry, and Milhaud's dragoons watch its exits. Before the main attack Cuesta lends Wellesley his reserve under Bassecourt, round behind the British line, and some guns for the Pajar redoubt.",
        at: {
          iglesias: [140, 140],
          manglano: [235, 170],
          portago: [345, 190],
          guns: [350, 125],
          campbell: [475, 150],
          guards: [610, 150],
          rey: [250, 225],
          bass: [890, 178],
          milhaud: [150, 335],
          leval: [400, 345],
          poles: [400, 420],
          sebast: [560, 335],
          latour: [620, 420],
          fguns: [250, 395],
          reserve: [560, 520],
        },
        arrows: [{ side: 'top', points: [[300, 215], [600, 215], [860, 185]] }],
      },
      {
        title: "Leval's Germans attack",
        caption: "At about 2.30, after the guns open, Leval's nine battalions rush the Pajar through the vines. The Baden troops face the guns, the Nassau and Dutch face Campbell, the Hessians and Frankforters face the Spaniards. Canister and a charge by Campbell break them.",
        at: {
          leval: [400, 235],
          poles: [400, 300],
        },
        arrows: [
          { side: 'bottom', points: [[360, 320], [365, 275], [370, 245]] },
          { side: 'bottom', points: [[450, 320], [448, 275], [445, 245]] },
          { side: 'top', points: [[475, 172], [470, 205]] },
        ],
      },
      {
        title: 'Second attack; the Rey charge',
        caption: "About four o'clock Leval tries again, with less energy. Campbell and two or three Spanish battalions advance on his flanks, and the Rey cavalry regiment cuts up the Hessians and Frankforters and takes four guns. Leval loses seventeen guns in all.",
        at: {
          leval: [425, 262],
          rey: [320, 258],
          manglano: [255, 200],
          portago: [345, 215],
        },
        broken: ['leval'],
        arrows: [
          { side: 'bottom', points: [[425, 335], [425, 305], [425, 285]] },
          { side: 'top', points: [[240, 225], [300, 250], [330, 285]] },
        ],
      },
      {
        title: 'Cuesta stays put',
        caption: "The French fall back by dusk, and Victor leaves the Cerro de Cascajal at 3 a.m. Cuesta does not counter-attack, and Oman thinks he was probably right.",
        at: {
          leval: [380, 390],
          poles: [420, 455],
          sebast: [560, 400],
          latour: [630, 470],
          fguns: [250, 470],
        },
        arrows: [
          { side: 'bottom', points: [[395, 330], [388, 380], [385, 420]], style: 'retreat' },
          { side: 'bottom', points: [[560, 350], [560, 400], [560, 440]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: "Allied success on the Spanish flank; Leval's division shattered",
    losses: "Leval 1,007 (nearly a quarter) and 17 guns; Campbell 236; Spaniards near the Pajar perhaps 150–180 (Oman's estimate). Cuesta reported 1,201 for his whole army.",
    text: [
      "Oman praised the few Spanish battalions, the cavalry and the guns that fought, but regretted that an army unable to manoeuvre could not exploit the repulse. Cuesta left Talavera for Oropesa on the night of 3 August, Zayas and Albuquerque following at noon on the 4th, as Wellesley crossed the Tagus (005).",
      "On the night of 12–13 August Cuesta, never fully recovered from injuries received at Medellín, suffered a paralytic stroke and resigned; Eguía took over the Army of Estremadura. Areizaga, who fought at Alcañiz and María (107, 108), later took command of the Junta's largest army and lost at Ocaña.",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 2 (1903), section XVI, chs. 6–7, pp. 507–56; Cuesta’s stroke and resignation, p. 605',
    'W. F. P. Napier, History of the War in the Peninsula, vol. 2 (1829), Book IX, ch. 2 (Talavera)',
  ],
};

export default history;
