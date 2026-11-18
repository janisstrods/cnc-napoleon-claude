// Commander temperaments: plain data weights that tune the evaluation and the commentary voice. They come from the
// commanders of the fifteen battles (and the Napoleon of the Waterloo-style scenario), not from the Ancients tables.
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
  P('veteran', 'The Veteran', 'Steady professional: balanced and sound.', [0.55, 0.55, 0.55, 0.5], 'stoic', 0.5),
];

const VETERAN = PERSONALITIES[PERSONALITIES.length - 1];

export function personalityById(id: string): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? VETERAN;
}

/** Commander patterns, tried in order against the commander's name (matched case-insensitively). */
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
  [/mass[eé]na/i, 'massena'],
  [/junot/i, 'junot'],
  [/marmont/i, 'marmont'],
  [/reynier/i, 'reynier'],
];

/** The default for a commander without a temperament of his own: the French take Reynier's, everyone else Hill's. */
const NATION_DEFAULT: Readonly<Record<Nation, string>> = { FR: 'reynier', BR: 'hill', PT: 'hill', AL: 'hill', SP: 'hill' };

/**
 * A fitting default personality for a historical commander: his own temperament, else his nation's. Without a `nation`
 * the army's name decides (a French army is French, anything else British). The Veteran is the last resort only.
 */
export function personalityFor(commander: string, army: string, nation?: Nation): Personality {
  for (const [re, id] of BY_NAME) if (re.test(commander)) return personalityById(id);
  const n: Nation = nation ?? (/french/i.test(army) ? 'FR' : 'BR');
  return personalityById(NATION_DEFAULT[n] ?? 'veteran');
}
