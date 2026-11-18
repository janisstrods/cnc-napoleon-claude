// The text of the in-game rules reference, written in our own words from design/rules-reference.md (the RR; the section of
// each block is named in the comment above it). A `reading` is a play-affecting interpretation, shown as a plain
// "Our reading:" note without its ruling mark (the marks live in the RR and design/rulings.md). Numbers that a table
// holds (unit rows, terrain, cards) are not written here: the tabs read them from the tables.
import { EXPANSIONS, UNIT_KEYS, UNIT_STATS, type Expansion } from '../../engine';

export type RulesTab = 'basics' | 'units' | 'combat' | 'squares' | 'terrain' | 'cards' | Expansion;

export interface RulesBlock {
  heading: string;
  paragraphs: string[];
  /** One sentence: how we read a point the rulebook leaves open, where it changes play. */
  reading?: string;
}

const GENERAL_TABS: [RulesTab, string][] = [
  ['basics', 'Basics'],
  ['units', 'Units'],
  ['combat', 'Combat'],
  ['squares', 'Squares & Combined Arms'],
  ['terrain', 'Terrain'],
  ['cards', 'Cards'],
];

/** The tabs of the dialog: the general ones, then one for each expansion that has unit rows in the table. */
export function rulesTabs(): [RulesTab, string][] {
  const boxes = EXPANSIONS.filter((e) => e.number > 0 && UNIT_KEYS.some((k) => UNIT_STATS[k].expansion === e.id)).map((e): [RulesTab, string] => [e.id, e.name]);
  return [...GENERAL_TABS, ...boxes];
}

/** The conditions that forbid a square (RR §9.5, a to g). */
export const SQUARE_CONDITIONS: readonly string[] = [
  'Its owner holds two or fewer Command cards (cards on the square track do not count).',
  'It stands in a town or on a windmill.',
  'It stands on Field Works and the cavalry attacks across a works hexside (through an open hexside it may form).',
  'The cavalry is battling back.',
  'The infantry is attacking the cavalry and the cavalry plays First Strike.',
  'Its owner plays First Strike against that melee.',
  'All four places of its owner’s square track are full.',
];

/** What each die face does (RR §3.1): fire, melee against a unit, against a lone leader, in Retire and Reform. */
export const DICE_ROWS: Record<'infantry' | 'cavalry' | 'artillery' | 'flag' | 'sabre', [string, string, string, string]> = {
  infantry: ['A hit on infantry, otherwise a miss.', 'A hit on infantry, otherwise a miss.', 'No effect.', 'A miss.'],
  cavalry: ['A hit on cavalry, otherwise a miss.', 'A hit on cavalry, otherwise a miss.', 'No effect.', 'A hit on cavalry: the only face that counts.'],
  artillery: ['A hit on artillery, otherwise a miss.', 'A hit on artillery, otherwise a miss.', 'No effect.', 'A miss.'],
  flag: ['A retreat for the target.', 'A retreat for the target.', 'No effect.', 'Ignored.'],
  sabre: ['A miss.', 'A hit on any unit, unless the attacker is Militia or Rifles.', 'Kills him, even from Militia or Rifles.', 'A miss.'],
};

export const RULES_TEXT: Record<RulesTab, RulesBlock[]> = {
  basics: [
    // RR §1
    {
      heading: 'The board',
      paragraphs: [
        'The battlefield is nine rows of hexes. One army starts at the top and defends the top row as its baseline; the other starts at the bottom. A unit that retreats always falls back toward its own baseline.',
        'The field is split into a left, a centre and a right section, judged from each player’s own side: your left is your opponent’s right. A hex on a dotted line belongs to both neighbouring sections.',
      ],
    },
    // RR §5.2
    {
      heading: 'The turn',
      paragraphs: [
        'Play one Command card. Its orders say which sections and how many units or leaders you may order. If it can order nothing, the turn jumps to the draw.',
        'Move the ordered pieces one at a time, finishing each before the next, and complete all movement before any battle. Then each ordered unit makes at most one battle, fire or melee, with all its follow-ups before the next unit begins.',
        'Finally discard the card and draw one. The game ends the instant a side reaches its banner target, whoever is playing and whatever is happening.',
      ],
    },
    // RR §5.3
    {
      heading: 'Command',
      paragraphs: [
        'Command is the number of cards in your hand, counting the one you have just played. Cards lying on the square track are not in your hand and are not counted, so every unit in square lowers your Command by one until its card comes back.',
        'Assault, Élan and Rally depend on Command. A hand of five with one unit in square plays Assault with Command four.',
      ],
      reading: 'Command for Assault, Élan and Rally is fixed when the card is played, so a square that comes out during that turn’s orders gets its card back but does not raise it.',
    },
    // RR §13
    {
      heading: 'Victory',
      paragraphs: [
        'Each battle sets a target of Victory Banners for both sides. You gain one banner for every enemy unit you wipe out and one for every enemy leader killed. A leader who leaves by his own baseline gives nothing away.',
        'Many battles add objectives. A hex objective gives its banner if one of your units stands on it when your own turn starts, and the banner is lost the moment that unit leaves or dies. A group objective needs every hex of the group held and is lost as soon as one is empty. An exit objective gives one banner for each unit that walks off the board at the named hex. One battle weights the kills of certain enemy units.',
        'A banner total is permanent banners plus the objective banners held right now. Holding a hex for many turns still gives only one banner.',
      ],
    },
  ],

  units: [
    // RR §2.1, §2.5
    {
      heading: 'Unit cards',
      paragraphs: [
        'Every unit is a group of blocks in one hex, and each block it loses is a hit taken. A leader is a single block and is not a unit. The cards below are written from the game’s own unit table, so they always agree with the rules in play.',
      ],
    },
    // RR §2.2
    {
      heading: 'French',
      paragraphs: [
        'Moving fire rounds up: halve the blocks, round up, then add the unit’s own bonus die.',
        'French line infantry roll one extra die in melee, but only when the target is an infantry unit. Cuirassiers ignore one hit from every infantry volley, though not from guns or melee. Militia and Rifles never score with sabres against units, yet a sabre still kills a lone leader.',
      ],
    },
    // RR §2.3, §14 (Waterloo)
    {
      heading: 'British',
      paragraphs: [
        'Moving fire rounds up as well. British line infantry fire with a bonus die only when they stand still; after moving they fire as plain halved dice.',
        'Rifles shoot to range three but their sabres do not hit units. In the battle of Waterloo the British cavalry are impetuous: after a successful melee they must follow up into the vacated hex, and then one hex further if a legal one lies toward the French.',
      ],
      reading: 'That further hex is skipped if the vacated hex stops movement (a forest, a town, a ford, a quarry or a works hexside), and the bonus melee that may follow stays optional.',
    },
    // RR §2.4, §2.5
    {
      heading: 'Portuguese',
      paragraphs: [
        'Moving fire rounds down: halve the blocks, drop the remainder, then add the bonus die.',
        'That rounding can leave nothing: a single block of line infantry or militia that has moved cannot fire at all.',
      ],
      reading: 'A unit whose base fire or melee is nothing at that range cannot make the shot, and no card, Élan and Bombard included, creates it.',
    },
    // RR §2.4
    {
      heading: 'Allied',
      paragraphs: [
        `The Allied contingents (Nassau, Hanover, the Dutch-Belgians and Brunswick) share the Portuguese values and round moving fire down. They fight for the British side: they are friends of the British and Portuguese, and their leaders may join any unit of that side.`,
        `The one difference is that Allied line infantry give ${UNIT_STATS['AL/LN'].retreat.first} hexes of ground for every flag they accept, where most other units give one.`,
      ],
    },
  ],

  combat: [
    // RR §3.1
    {
      heading: 'The battle dice',
      paragraphs: [
        'A battle die has six faces: infantry on two of them, then cavalry, artillery, a flag and a sabre once each. A hit needs the symbol of the target’s arm; flags make the target retreat.',
      ],
    },
    // RR §3.2
    {
      heading: 'How many dice',
      paragraphs: [
        'Start from the unit’s base dice (its blocks, or the gun table by range), add the bonus of its type, then the extras of the card that ordered it. A unit in square, or cavalry attacking a square, never rolls more than one die. Terrain then takes dice away, and the total cannot go below nothing.',
        'A unit may declare a battle only if it would roll at least one die. If its dice fall to nothing after the declaration, the battle still counts as its turn but does nothing.',
      ],
    },
    // RR §8
    {
      heading: 'Fire',
      paragraphs: [
        'Only infantry and artillery fire, at an enemy unit at a distance of two or more hexes and within range, over a clear line of sight. Cavalry and leaders never fire, and a lone leader can never be fired at. A unit next to an enemy unit may not fire; if it battles it must melee.',
        'Fire brings no battle back, no Retire and Reform and no taking ground. Hits come off first, then any leader check, then the retreats.',
      ],
      reading: 'A gun on a hill may fire over one friendly piece standing on the adjacent low hex, if that hex blocks no sight; the target may be at any height.',
    },
    // RR §9.2
    {
      heading: 'Melee',
      paragraphs: [
        'A unit may attack an adjacent enemy unit, or a lone leader. The attacker declares the target, and any guns that join (see Squares & Combined Arms), before any dice are rolled. The defender may then make one reaction: Retire and Reform, form square, or play First Strike.',
        'Dice are rolled, hits come off, the leader check is made and the retreats are resolved. If the defender was wiped out or driven from its hex, the attacker may take ground or break through. Otherwise a defender still in place battles back.',
      ],
    },
    // RR §9.3
    {
      heading: 'Battle back',
      paragraphs: [
        'A defender that kept at least one block and its hex fights back with its normal melee dice and its own terrain, but never with the extra dice of a card, since it was not ordered. There is no battle back against fire, after Retire and Reform, after the defender used First Strike, or by a lone leader.',
        'A unit that fights back never takes ground or breaks through, and First Strike cannot be played against it.',
      ],
    },
    // RR §10
    {
      heading: 'Flags and retreats',
      paragraphs: [
        'Each flag moves the target back its retreat distance toward its own baseline, one hex per step to a hex on the side nearer home, whatever direction the blow came from. A step may not enter a hex with another unit or enemy leader, impassable ground, or the board edge. Other terrain is ignored.',
        'Every hex a unit cannot retreat costs it a block. If a path of the full length exists the owner must take it; a unit in square never moves, so each hex costs a block.',
        'Flags may be ignored one at a time: one for an attached leader, one for support (two or more friendly units, squares or lone leaders next to it), one for a unit that ignores flags by its type, and one for infantry or guns attacked across Field Works. A unit retreating without a leader may end on a lone friendly leader, who joins it.',
      ],
    },
    // RR §11
    {
      heading: 'Leaders under fire',
      paragraphs: [
        'When a unit with a leader loses blocks, the opponent rolls two dice and the leader dies on two sabres. If the unit is wiped out, one die is rolled and one sabre kills him; otherwise he retreats one to three hexes, and may stop on a friendly unit that has no leader.',
        'A lone leader attacked in melee dies to any sabre and otherwise retreats. If his retreat meets enemy units, each one rolls a normal escape: a sabre kills him, and a third blocked hex ends him.',
      ],
    },
  ],

  squares: [
    // RR §9.5
    {
      heading: 'Forming a square',
      paragraphs: [
        'When enemy cavalry declares a melee against your infantry on the enemy’s turn, the infantry unit may form square, whatever its type or size. A random card from your hand, unseen by the enemy, goes face down on your square track and a numbered counter goes on the unit. You may look at your track but not rearrange it.',
        'It may not form square when:',
      ],
    },
    // RR §9.5
    {
      heading: 'The square fights first',
      paragraphs: [
        'Against cavalry, a square rolls first, with one die, whenever the cavalry melees it. Every flag it rolls is a bounce flag that nothing can ignore. If the cavalry survives and stays in its hex, it then attacks with its own die and the square does not battle back.',
        'Against infantry or guns, a square fights like anyone else: the attacker rolls first and the square battles back with one die. A square never moves, takes ground or breaks through. It may fire only if no enemy unit is adjacent. It cannot be chosen for Short Supply.',
      ],
    },
    // RR §6.3, §9.5
    {
      heading: 'Leaving a square',
      paragraphs: [
        'An ordered square may come out only if no enemy cavalry is adjacent when the order is given; if cavalry is there it stays all turn, even if the cavalry is driven off later. Coming out is not moving: the card returns to your hand and the unit may then move and battle normally.',
        'When a square loses its last block, its card also returns and the enemy gains the banner for the unit.',
      ],
    },
    // RR §9.6
    {
      heading: 'Combined Arms',
      paragraphs: [
        'When an ordered infantry or cavalry unit declares a melee, ordered guns of the same army may join it against the same unit, never against a lone leader. Each gun must not have battled this turn, must be within its range and must have a clear line of sight. A gun next to the target always qualifies.',
        'Each gun rolls its own dice, with its card extras and its own terrain, and everything is rolled together. A gun that joins has used its battle for the turn, even if its dice are lost. If the square or First Strike beats the melee unit first, the guns’ dice are never rolled.',
      ],
      reading: 'A hill battery may not join a Combined Arms attack by firing over a friendly unit; that allowance belongs to ordinary fire only.',
    },
    // RR §9.4
    {
      heading: 'Retire and Reform',
      paragraphs: [
        'Cavalry attacked by infantry (a Combined Arms attack led by infantry included) may declare Retire and Reform before any dice are rolled. The attacker rolls everything, but only cavalry symbols hit. If the cavalry survives it falls back exactly two hexes, each toward its own baseline, and does not battle back; the infantry may take ground.',
        'It is not allowed against fire, guns or cavalry, and not if no legal path of two hexes exists. A cavalry unit with no leader may instead step one hex onto a lone friendly leader.',
      ],
      reading: 'Terrain that only stops movement does not block that path; impassable ground, other units and the board edge do.',
    },
    // RR §12.3
    {
      heading: 'First Strike',
      paragraphs: [
        'The defender plays First Strike after a melee is declared and before the attacker rolls. His unit fights first with its normal dice and terrain, without card extras. If the attacker is not wiped out or pushed from its hex, it then attacks as ordered and the defender does not battle back.',
        'Only one per melee, aimed at the infantry or cavalry unit of a Combined Arms attack, never at its guns. It cannot answer a battle back, and the unit that used it never takes ground. Each First Strike played is replaced by a draw at the end of that turn.',
      ],
    },
    // RR §9.7
    {
      heading: 'Taking ground',
      paragraphs: [
        'When an attacking infantry unit wipes out its target or drives it from its hex, it may move into the empty hex. This is optional, and the unit stops there if the hex stops movement.',
        'It is never allowed after fire, to a square, to guns, to a unit battling back, to a unit that used First Strike, or to a unit that has already entered a hex that stops movement this turn.',
      ],
    },
    // RR §9.8
    {
      heading: 'Breakthrough and bonus melee',
      paragraphs: [
        'When attacking cavalry wipes out or drives off its target, it may move into the empty hex and then optionally one hex more, in any direction, obeying terrain. A cavalry unit that took the empty hex may then make one bonus melee against any adjacent enemy unit or lone leader.',
        'The bonus melee is a full melee: the defender may form square or play First Strike, and battles back. If it also succeeds, the cavalry may move into that vacated hex only. Infantry and guns never get a bonus melee.',
      ],
    },
  ],

  terrain: [
    // RR §4.1, §4.2
    {
      heading: 'Reading the table',
      paragraphs: [
        'Terrain takes dice away from a battle. “Into it” applies when the target stands there; “out of it” when the battling unit does. A unit battling back counts its own hex as “out of” and the enemy’s as “into”. Reductions add together, and the total can lower dice to nothing.',
      ],
    },
    // RR §4.2, §4.3, §8.3
    {
      heading: 'Hills and sight',
      paragraphs: [
        'A hill costs dice according to the pair of hexes: attacking uphill and hill to hill cost more than attacking downhill, and the relation is counted once per battle. A hill hex blocks sight in between, except across the top of one connected hill, where its units still block.',
        'Forests, towns, windmills and rugged hills block sight; so does any unit or leader on a hex in between. Rivers, fords, bridges, works and quarries do not.',
      ],
    },
    // RR §4.4
    {
      heading: 'Field Works',
      paragraphs: [
        'Works protect only the hexsides drawn on their tile. A battle is across a works hexside when the attacker stands in the narrow wedge beyond it, which for melee means on the hex next to that side. Only then do works cost dice, let infantry and guns ignore a flag, and forbid a square. Crossing a works hexside in either direction ends a move.',
        'On a hill, a battle across a works hexside uses the works values and leaves out the hill relation; through an open hexside the hill relation applies and the works do nothing.',
      ],
    },
  ],

  cards: [
    // RR §12.1
    {
      heading: 'Section cards',
      paragraphs: [
        'Section cards name sections and how many units or leaders you may order in each. An attached leader may detach with one of these orders; the unit he leaves is not ordered by it.',
      ],
    },
    // RR §12.2
    {
      heading: 'Tactic cards',
      paragraphs: [
        'Tactic cards order the kind of unit they name, anywhere on the board unless they say otherwise. If you have no unit of that kind at all, the card orders one unit of your choice that fights by its normal rules. Card extras apply only to ordered units on your own turn, never to a battle back.',
      ],
    },
    // RR §12.2, §12.4
    {
      heading: 'Notes on the cards',
      paragraphs: [
        'Counter-Attack copies the card the opponent played at the start of his last turn, swapping left and right; a First Strike he played in reply does not count. Élan and a copied Élan reshuffle the deck before the draw. Scout draws two cards at the end of the turn, keeps one and discards the other face up.',
        'Short Supply orders no unit: a unit it moves may not battle that turn, but an enemy unit moved by it still battles back later.',
      ],
      reading: 'A unit already standing on its own baseline in that section stays on the baseline: its own hex counts among the hexes it may choose, and the row in front is used only if the baseline has no free hex.',
    },
  ],

  base: [],
  exp1: [],
};
