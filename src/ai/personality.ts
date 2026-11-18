// Commander temperaments: plain data weights that tune the evaluation and the commentary voice. They come from the
// commanders of the thirty-three battles (base 001–015, Expansion #1 101–118; the drill scenario 000 adds no one), not from the Ancients tables.
import type { Nation } from '../engine';

export type Voice = 'bold' | 'methodical' | 'reckless' | 'cunning' | 'stoic';

export interface Personality {
  id: string;
  name: string;
  /** One-line description for menus. */
  epithet: string;
  /** 0..1 appetite for attacking, closing the distance and accepting even trades. */
  aggression: number;
  /** 0..1 weight on protecting own units, leaders and weakened troops. */
  caution: number;
  /** 0..1 patience with strong cards, skirmishing, flanking, use of terrain and ambushes. */
  cunning: number;
  /** 0..1 how readily the mounted arm is flung forward. */
  dash: number;
  /** Battle-log voice. */
  voice: Voice;
  /** 0..1 how talkative the commander is. */
  chatter: number;
}

const P = (
  id: string, name: string, epithet: string, [aggression, caution, cunning, dash]: [number, number, number, number], voice: Voice, chatter: number,
): Personality => ({ id, name, epithet, aggression, caution, cunning, dash, voice, chatter });

export const PERSONALITIES: Personality[] = [
  P('wellington', 'Wellington', 'Patient and exact: holds good ground, then strikes when the enemy is spent.', [0.45, 0.8, 0.85, 0.35], 'stoic', 0.4),
  P('moore', 'Moore', 'Thorough and humane: drills his men hard and fights a measured battle.', [0.5, 0.65, 0.7, 0.45], 'methodical', 0.5),
  P('hill', 'Hill', 'Dependable lieutenant: never rash, never absent when the line wavers.', [0.5, 0.7, 0.55, 0.4], 'stoic', 0.45),
  P('picton', 'Picton', 'Fierce and impatient: leads from the front and wants the bayonet.', [0.85, 0.3, 0.35, 0.55], 'bold', 0.8),
  P('beresford', 'Beresford', 'Cautious organiser: keeps the line tidy and spends men sparingly.', [0.4, 0.75, 0.4, 0.35], 'methodical', 0.4),
  P('craufurd', 'Craufurd', 'Sharp-tempered skirmisher: quick to strike and quick to withdraw.', [0.75, 0.4, 0.7, 0.6], 'bold', 0.75),
  P('bock', 'Bock', 'Hard-riding horseman: believes a charge settles most arguments.', [0.7, 0.45, 0.45, 0.95], 'bold', 0.55),
  P('napoleon', 'Napoleon', 'Master of timing: feints, concentrates, then breaks the line at its weakest point.', [0.75, 0.5, 0.95, 0.75], 'cunning', 0.7),
  P('ney', 'Ney', 'Reckless and brave: the first into the fight and the last out of it.', [0.92, 0.2, 0.3, 0.9], 'reckless', 0.85),
  P('soult', 'Soult', 'Methodical campaigner: manoeuvres with care and counts the cost.', [0.6, 0.6, 0.7, 0.5], 'methodical', 0.5),
  P('massena', 'Masséna', 'Shrewd and stubborn: patient in defence, ruthless when an opening shows.', [0.6, 0.55, 0.8, 0.5], 'cunning', 0.55),
  P('junot', 'Junot', 'Headstrong and impetuous: throws the columns forward and hopes for the best.', [0.8, 0.3, 0.4, 0.7], 'reckless', 0.75),
  P('marmont', 'Marmont', 'Ambitious and brisk: presses a fair advantage, sometimes too far.', [0.6, 0.45, 0.65, 0.6], 'bold', 0.6),
  P('reynier', 'Reynier', 'Sound corps commander: steady, orthodox and hard to rattle.', [0.55, 0.55, 0.55, 0.5], 'stoic', 0.45),
  P('castanos', 'Castaños', 'Cautious victor of Bailén: prefers to hold his ground and let the French come.', [0.4, 0.8, 0.6, 0.35], 'stoic', 0.4),
  P('blake', 'Blake', 'Brave but rash in manoeuvre: marches his columns further than they can be supported.', [0.7, 0.35, 0.35, 0.5], 'bold', 0.6),
  P('cuesta', 'Cuesta', 'Obstinate old cavalryman: attacks headlong and will not take advice.', [0.85, 0.3, 0.3, 0.7], 'reckless', 0.65),
  P('belveder', 'Belveder', 'Inexperienced and hesitant: fights by the book and loses the thread when it tears.', [0.45, 0.5, 0.3, 0.4], 'methodical', 0.5),
  P('san_juan', 'San Juan', 'Stubborn in defence: gives up a pass only when there is nobody left to hold it.', [0.35, 0.7, 0.5, 0.3], 'stoic', 0.45),
  P('del_parque', 'Del Parque', 'Steady and dutiful: a sound commander without flair.', [0.5, 0.6, 0.5, 0.45], 'stoic', 0.45),
  P('freire', 'Freire', 'A cavalryman at heart: looks for the opening that horse can ride through.', [0.6, 0.45, 0.45, 0.9], 'bold', 0.55),
  P('areizaga', 'Areizaga', 'Reckless and overconfident: throws his army forward without a thought for the cost.', [0.9, 0.2, 0.25, 0.6], 'reckless', 0.8),
  P('graham', 'Graham', 'Bold and quick to seize a chance: goes straight for the enemy at Barrosa.', [0.8, 0.4, 0.55, 0.55], 'bold', 0.7),
  P('dupont', 'Dupont', 'Brave but outmatched: brittle once the plan goes wrong.', [0.55, 0.4, 0.4, 0.5], 'methodical', 0.5),
  P('lefebvre', 'Lefebvre', 'Blunt old soldier: attacks hard and manoeuvres little.', [0.7, 0.4, 0.35, 0.5], 'bold', 0.65),
  P('victor', 'Victor', 'Aggressive corps commander: presses on, sometimes ahead of his orders.', [0.7, 0.45, 0.5, 0.55], 'bold', 0.6),
  P('suchet', 'Suchet', 'Methodical and efficient: the best French commander of the Spanish war.', [0.6, 0.6, 0.85, 0.55], 'methodical', 0.5),
  P('kellermann', 'Kellermann', 'Dashing cavalry general: sends the horse in early and often.', [0.7, 0.4, 0.45, 0.9], 'bold', 0.6),
  P('milhaud', 'Milhaud', 'Hard-riding dragoon: lives for the charge.', [0.7, 0.4, 0.4, 0.95], 'bold', 0.55),
  P('marchand', 'Marchand', 'Dependable divisional commander: steady, if unremarkable.', [0.5, 0.55, 0.5, 0.45], 'stoic', 0.45),
  P('joseph', 'King Joseph', 'Hesitant and easily advised: slow to commit and quick to fall back.', [0.3, 0.7, 0.35, 0.3], 'stoic', 0.5),
  P('veteran', 'The Veteran', 'Steady professional: balanced and sound.', [0.55, 0.55, 0.55, 0.5], 'stoic', 0.5),
];

const VETERAN = PERSONALITIES[PERSONALITIES.length - 1];

export function personalityById(id: string): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? VETERAN;
}

/** Commander patterns, tried in order against the commander's name (matched case- and accent-insensitively: the name is stripped of accents first, so the patterns are plain ASCII). */
const BY_NAME: [RegExp, string][] = [
  [/wellesley|wellington/i, 'wellington'],
  [/moore/i, 'moore'],
  [/\bhill\b/i, 'hill'],
  [/picton/i, 'picton'],
  [/beresford/i, 'beresford'],
  [/crau(f)?urd|crauford/i, 'craufurd'],
  [/\bbock\b/i, 'bock'],
  [/napoleon/i, 'napoleon'],
  [/\bney\b/i, 'ney'],
  [/soult/i, 'soult'],
  [/massena/i, 'massena'],
  [/junot/i, 'junot'],
  [/marmont/i, 'marmont'],
  [/reynier/i, 'reynier'],
  [/castanos/i, 'castanos'],
  [/\bblake\b/i, 'blake'],
  [/cuesta/i, 'cuesta'],
  [/belveder/i, 'belveder'],
  [/san juan/i, 'san_juan'],
  [/del parque/i, 'del_parque'],
  [/freire/i, 'freire'],
  [/areizaga/i, 'areizaga'],
  [/graham/i, 'graham'],
  [/dupont/i, 'dupont'],
  [/lefebvre/i, 'lefebvre'],
  [/\bvictor\b/i, 'victor'],
  [/suchet/i, 'suchet'],
  [/kellermann/i, 'kellermann'],
  [/milhaud/i, 'milhaud'],
  [/marchand/i, 'marchand'],
  [/\bjoseph\b/i, 'joseph'],
];

/** The default for a commander without a temperament of his own: the French take Reynier's, the Spanish Del Parque's, everyone else Hill's. */
const NATION_DEFAULT: Readonly<Record<Nation, string>> = { FR: 'reynier', BR: 'hill', PT: 'hill', AL: 'hill', SP: 'del_parque' };

/**
 * A fitting default personality for a historical commander: his own temperament, else his nation's. Without a `nation`
 * the army's name decides (a French army is French, anything else British). The Veteran is the last resort only.
 */
export function personalityFor(commander: string, army: string, nation?: Nation): Personality {
  const plain = commander.normalize('NFD').replace(/\p{M}/gu, '');
  for (const [re, id] of BY_NAME) if (re.test(plain)) return personalityById(id);
  const n: Nation = nation ?? (/french/i.test(army) ? 'FR' : 'BR');
  return personalityById(NATION_DEFAULT[n] ?? 'veteran');
}
