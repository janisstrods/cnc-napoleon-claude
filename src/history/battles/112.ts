// 112 Ocaña, 19 November 1809. Top: Areizaga's Spanish Army of La Mancha; bottom: Soult and King Joseph's French army.
// Schematic. North points down: the French come from Aranjuez to the north, so Ocaña and the Spanish left (west) are at the top right, the olive groves
// towards Noblejas and the Spanish right (east) at the left. The Spaniards stood in two lines behind a ravine that is deep in the west and shallow in the east.
// The order of the Spanish line follows Oman's reconstruction (he says the sources are thin); places are indicative only.
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '112',
  date: '19 November 1809',
  context: {
    war: 'Peninsular War, 1807–1814',
    text: [
      "The Central Junta's autumn plan for Madrid rested on Areizaga's army, which came out of the Sierra Morena in early November. He halted for three days at La Guardia (Napier says Dos Barrios), then marched and countermarched while Soult gathered the French corps. After the cavalry action of 18 November (111) his column reached Ocaña, on the 18th by Oman's account and on the morning of the 19th by Napier's.",
      "His trains were still far behind and his men too tired to march on, so he offered battle on the open plateau. Soult and King Joseph, though outnumbered in infantry, chose to attack at once rather than wait for Victor, who was nearly twenty miles off (Oman), and risk Areizaga slipping away. Oman puts Zayas on the Spanish left; Napier puts him on the right.",
    ],
  },
  sides: {
    top: {
      name: 'Spanish Army of La Mancha',
      commanders: ['Areizaga (commanding)', 'Zayas (vanguard)', 'Giron and Zerain (divisions)', 'Freire (cavalry)'],
      strength: 'About 46,000 foot, 5,500 horse, 60 guns (Oman); Napier: 45,000 foot, 7,000 horse',
      forces: 'Eight infantry divisions in two lines round Ocaña, the guns between them, and the cavalry on the open right flank, shaken by the day before.',
    },
    bottom: {
      name: 'French Army of Spain',
      commanders: ['Soult (directing)', 'King Joseph Bonaparte', 'Mortier and Sebastiani (corps)', 'Dessolles, Leval and Girard (divisions)'],
      strength: 'About 27,000 foot, 5,000 horse (Oman); Napier: 24,000 foot, 5,000 horse, 50 guns',
      forces: "Sebastiani's Polish and German divisions, Mortier's 5th Corps, Dessolles's brigades, the Royal Guard, and the massed cavalry.",
    },
  },
  map: {
    north: 180,
    terrain: [
      { kind: 'woods', points: [[20, 20], [250, 18], [260, 120], [40, 130]], label: 'Olive groves' },
      { kind: 'river', points: [[560, 305], [700, 292], [830, 290], [935, 318], [1010, 370]], width: 10, label: 'Ravine' },
      { kind: 'town', at: [800, 68], size: 28, label: 'Ocaña' },
      { kind: 'road', points: [[880, 585], [820, 420], [790, 200], [770, 80]], label: 'Road from Aranjuez' },
      { kind: 'label', at: [120, 335], text: 'Spanish right (east)' },
    ],
    units: [
      { id: 'zayas', side: 'top', kind: 'infantry', label: 'Zayas (vanguard)', w: 100, h: 28 },
      { id: 'vigodet', side: 'top', kind: 'infantry', label: 'Vigodet', w: 90, h: 28 },
      { id: 'giron', side: 'top', kind: 'infantry', label: 'Giron', w: 90, h: 28 },
      { id: 'castejon', side: 'top', kind: 'infantry', label: 'Castejón', w: 90, h: 28 },
      { id: 'lacy', side: 'top', kind: 'infantry', label: 'Lacy', w: 90, h: 28 },
      { id: 'second', side: 'top', kind: 'infantry', label: 'Jácome, Zerain', w: 140, h: 28 },
      { id: 'sguns', side: 'top', kind: 'artillery', label: 'Spanish guns', w: 46 },
      { id: 'rivas', side: 'top', kind: 'cavalry', label: "Rivas's horse", w: 60 },
      { id: 'freire', side: 'top', kind: 'cavalry', label: "Freire's cavalry", w: 80 },
      { id: 'werle', side: 'bottom', kind: 'infantry', label: 'Werlé (Poles)', w: 90, h: 28 },
      { id: 'leval', side: 'bottom', kind: 'infantry', label: 'Leval (Germans)', w: 90, h: 28 },
      { id: 'girard', side: 'bottom', kind: 'infantry', label: 'Girard (5th Corps)', w: 100, h: 28 },
      { id: 'cav', side: 'bottom', kind: 'heavycavalry', label: "Sebastiani's cavalry", w: 110 },
      { id: 'senarmont', side: 'bottom', kind: 'artillery', label: "Senarmont's guns", w: 50 },
      { id: 'dessolles', side: 'bottom', kind: 'infantry', label: 'Dessolles', w: 100, h: 28 },
      { id: 'guard', side: 'bottom', kind: 'guard', label: "King's Guard", w: 80 },
    ],
    phases: [
      {
        title: "Soult's plan",
        caption: "Areizaga's line stands in two ranks round Ocaña, the ravine covering his left and centre but not his right. Soult masses cavalry behind the Poles and Germans to strike that right; Dessolles faces Ocaña, with Senarmont's guns on a knoll before him.",
        at: {
          freire: [90, 250],
          lacy: [250, 215],
          castejon: [370, 215],
          giron: [490, 210],
          vigodet: [620, 195],
          zayas: [900, 215],
          rivas: [960, 120],
          second: [430, 130],
          sguns: [545, 262],
          cav: [150, 450],
          werle: [270, 400],
          leval: [390, 400],
          girard: [330, 480],
          senarmont: [640, 360],
          dessolles: [700, 440],
          guard: [830, 520],
        },
      },
      {
        title: 'Poles and Germans advance',
        caption: "Around eleven Senarmont's thirty guns open fire and Leval and Werlé press on the Spanish right. The Spaniards counter-charge and drive them back, wounding Leval, until Girard's fresh division is brought up through the broken line.",
        at: {
          werle: [270, 330],
          leval: [395, 330],
          girard: [335, 400],
          lacy: [250, 245],
          castejon: [375, 245],
          giron: [495, 235],
        },
        arrows: [
          { side: 'bottom', points: [[270, 380], [270, 350], [270, 320]] },
          { side: 'bottom', points: [[395, 380], [395, 350], [395, 320]] },
          { side: 'top', points: [[310, 245], [320, 290], [330, 330]] },
        ],
      },
      {
        title: 'Cavalry roll up the right',
        caption: "The massed French horse, hidden by olive groves and folds of ground, burst on Freire's cavalry and send it flying, then wheel in on the exposed flanks of Lacy, Castejón and Giron. The Spanish right dissolves, and thousands surrender.",
        at: {
          cav: [190, 300],
        },
        broken: ['freire', 'lacy', 'castejon', 'giron', 'second'],
        arrows: [
          { side: 'bottom', points: [[190, 440], [190, 370], [190, 320]] },
          { side: 'bottom', points: [[230, 285], [320, 240], [390, 200]] },
          { side: 'top', points: [[90, 230], [60, 130], [40, 40]], style: 'rout' },
        ],
      },
      {
        title: 'Ocaña falls',
        caption: "As the right collapses, Dessolles and the King's Guard cross the ravine and take Ocaña, pushing back Vigodet and the troops beside him. Areizaga leaves the field; Zayas's division covers the retreat towards Dos Barrios, and the pursuit lasts until nightfall.",
        at: {
          dessolles: [730, 160],
          guard: [820, 250],
          girard: [470, 345],
          zayas: [900, 300],
          senarmont: [650, 300],
          vigodet: [600, 110],
        },
        broken: ['vigodet'],
        arrows: [
          { side: 'bottom', points: [[700, 420], [720, 300], [730, 190]] },
          { side: 'top', points: [[860, 300], [640, 270], [430, 140]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive French victory; the Spanish army destroyed',
    losses: "Spaniards about 4,000 killed and wounded, 14,000 prisoners and 50 of 60 guns (Oman); Napier has 5,000, 26,000 captive and 45 guns. French about 90 officers and 1,900 men (Oman); Napier gives 1,700.",
    text: [
      "Oman judged Areizaga worse for rashness and vacillation than any other Spanish general of the war, and noted that he watched the battle from the church tower. When the army was rallied in the passes only about 21,000 foot and 3,000 horse remained. It was the Junta's main field army.",
      "The Central Junta never recovered. Soult and Joseph invaded Andalusia in January 1810; the Junta, on 29 January, handed power to a Regency at Cádiz, and Joseph entered Seville on 1 February. Del Parque's northern army had already been beaten at Alba de Tormes on 28 November (Oman).",
    ],
  },
  sources: [
    'Charles Oman, A History of the Peninsular War, vol. 3 (Oxford, 1908; Internet Archive scan), section XVII, ch. 4, pp. 90–97 (Ocaña; order of the Spanish line, pp. 91–93; losses, pp. 95–96); appendix VI, pp. 530–31; Alba de Tormes, pp. 98–101; section XVIII, ch. 1, p. 103, ch. 3, pp. 141–43',
    "W. F. P. Napier, History of the War in the Peninsula, vol. 3 (1831), Book IX, ch. V, pp. 78–85 (battle of Ocaña; strengths, p. 80; losses, p. 84)",
  ],
};

export default history;
