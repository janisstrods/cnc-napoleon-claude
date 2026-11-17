// The 70 Command cards (RR §12.1–§12.2): the table and its pure helpers. The skeleton draw, effective-card and battle-ban hooks are at the end (logic in T11 / T12a).
// Imports only codes, types, hex, rng, expansions, units, terrain, query.
import { other } from './query';
import { shuffle } from './rng';
import type { UnitStats } from './units';
import type { CardDef, CardKind, DiceMod, FlowCtx, GameState, OrderMods, OrderedPiece, SectionName, SelectRule, Side, Unit } from './types';

export const NO_MODS: OrderMods = {
  fire: null, melee: null, bonusMelee: false, lostInTown: false, move: null, noMove: false, noFire: false, noMelee: false,
};

const mods = (m: Partial<OrderMods>): OrderMods => ({ ...NO_MODS, ...m });
const plus = (n: number, extra: Partial<DiceMod> = {}): DiceMod => ({ plus: n, ...extra });

interface Spec {
  title: string; group: 'section' | 'tactic'; count: number; text: string; sections?: SectionName[]; detach: boolean;
  select: SelectRule; mods?: OrderMods; draw?: CardDef['draw'];
}
const def = (kind: CardKind, x: Spec): CardDef => ({
  kind, title: x.title, group: x.group, count: x.count, text: x.text, sections: x.sections ?? [], detach: x.detach, select: x.select,
  mods: x.mods ?? NO_MODS, draw: x.draw ?? 'normal',
});

const SEC: Record<'L' | 'C' | 'R', { name: SectionName; label: string }> = {
  L: { name: 'left', label: 'Left' }, C: { name: 'center', label: 'Centre' }, R: { name: 'right', label: 'Right' },
};
const NUM_WORDS = ['no', 'one', 'two', 'three'];
type Family = 'scout' | 'probe' | 'attack' | 'assault';
const FAMILY: Record<Family, { title: string; counts: Record<'L' | 'C' | 'R', number>; per: number | 'command'; draw: CardDef['draw'] }> = {
  scout: { title: 'Scout', counts: { L: 2, C: 2, R: 2 }, per: 1, draw: 'scout' },
  probe: { title: 'Probe', counts: { L: 4, C: 6, R: 4 }, per: 2, draw: 'normal' },
  attack: { title: 'Attack', counts: { L: 4, C: 6, R: 4 }, per: 3, draw: 'normal' },
  assault: { title: 'Assault', counts: { L: 2, C: 2, R: 2 }, per: 'command', draw: 'normal' },
};
function familyText(f: Family, label: string): string {
  const per = FAMILY[f].per;
  const orders = per === 'command' ? 'as many units as your Command allows' : `${NUM_WORDS[per]} unit${per === 1 ? '' : 's'}`;
  const extra = f === 'scout' ? ' At the draw phase you take two cards and keep one.' : '';
  return `Give orders to ${orders} in your ${label} section.${extra}`;
}
const sec = (f: Family, side: 'L' | 'C' | 'R'): CardDef => {
  const kind = `${f}${side}` as CardKind;
  const { name, label } = SEC[side];
  return def(kind, {
    title: `${FAMILY[f].title} ${label}`, group: 'section', count: FAMILY[f].counts[side], text: familyText(f, label), sections: [name],
    detach: true, select: { kind: 'sections', counts: { [name]: FAMILY[f].per } }, draw: FAMILY[f].draw,
  });
};

/** Every card kind, in the order of the `CardKind` union (CARD_LIST and card ids follow this key order). */
export const CARD_DEFS: Readonly<Record<CardKind, CardDef>> = {
  scoutL: sec('scout', 'L'),
  scoutC: sec('scout', 'C'),
  scoutR: sec('scout', 'R'),
  probeL: sec('probe', 'L'),
  probeC: sec('probe', 'C'),
  probeR: sec('probe', 'R'),
  attackL: sec('attack', 'L'),
  attackC: sec('attack', 'C'),
  attackR: sec('attack', 'R'),
  assaultL: sec('assault', 'L'),
  assaultC: sec('assault', 'C'),
  assaultR: sec('assault', 'R'),
  coordinatedAdvance: def('coordinatedAdvance', {
    title: 'Coordinated Advance', group: 'section', count: 2, sections: ['left', 'center', 'right'], detach: true,
    text: 'Order one unit on each wing and two in the centre.', select: { kind: 'sections', counts: { left: 1, center: 2, right: 1 } },
  }),
  flankAttack: def('flankAttack', {
    title: 'Flank Attack', group: 'section', count: 2, sections: ['left', 'right'], detach: true,
    text: 'Order two units on each wing; the centre stays quiet.', select: { kind: 'sections', counts: { left: 2, right: 2 } },
  }),
  forward: def('forward', {
    title: 'Forward', group: 'section', count: 2, sections: ['left', 'center', 'right'], detach: true,
    text: 'Order two units in every section.', select: { kind: 'sections', counts: { left: 2, center: 2, right: 2 } },
  }),
  reconInForce: def('reconInForce', {
    title: 'Recon in Force', group: 'section', count: 2, sections: ['left', 'center', 'right'], detach: true,
    text: 'Order one unit in every section.', select: { kind: 'sections', counts: { left: 1, center: 1, right: 1 } },
  }),
  bayonetCharge: def('bayonetCharge', {
    title: 'Bayonet Charge', group: 'tactic', count: 2, detach: false,
    text: 'Up to four infantry units may advance two hexes and still fight in melee, but may not fire; guards add a die.',
    select: { kind: 'kinds', match: { arms: ['infantry'] }, max: 4, notAdjacentToEnemy: false },
    mods: mods({ melee: plus(0, { tags: [{ tag: 'guard', arm: 'infantry', plus: 1 }] }), move: { options: [{ max: 2, battle: true }] }, noFire: true }),
  }),
  bombard: def('bombard', {
    title: 'Bombard', group: 'tactic', count: 2, detach: false,
    text: 'Up to four artillery units add two dice to their fire and melee; guard guns add one more; they may move three hexes without fighting.',
    select: { kind: 'kinds', match: { arms: ['artillery'] }, max: 4, notAdjacentToEnemy: false },
    mods: mods({
      fire: plus(2, { tags: [{ tag: 'guard', arm: 'artillery', plus: 1 }] }), melee: plus(2, { tags: [{ tag: 'guard', arm: 'artillery', plus: 1 }] }),
      move: { options: [{ max: 0, battle: true }, { max: 3, battle: false }] },
    }),
  }),
  cavalryCharge: def('cavalryCharge', {
    title: 'Cavalry Charge', group: 'tactic', count: 3, detach: false,
    text: 'Up to four cavalry or horse artillery units; cavalry roll an extra die in melee, heavy horse may move three and still fight, but the bonus is lost in towns.',
    select: { kind: 'kinds', match: { arms: ['cavalry'], tags: ['horseArtillery'] }, max: 4, notAdjacentToEnemy: false },
    mods: mods({
      melee: plus(1, { arms: ['cavalry'], tags: [{ tag: 'guard', arm: 'cavalry', plus: 1 }] }), bonusMelee: true, lostInTown: true,
      move: { options: [{ max: 3, battle: true }], only: { tags: ['heavy'] } },
    }),
  }),
  counterAttack: def('counterAttack', {
    title: 'Counter-Attack', group: 'tactic', count: 2, detach: false,
    text: 'Play the same orders your opponent used on their last turn, mirrored if it named a wing.', select: { kind: 'copy' },
  }),
  elan: def('elan', {
    title: 'Élan', group: 'tactic', count: 1, detach: false,
    text: 'Roll dice equal to your Command; each arm face orders a unit of that arm and each flag any unit or leader, and ordered units gain a die in every battle. The deck is reshuffled at the draw.',
    select: { kind: 'dice', roll: 'elan' }, mods: mods({ fire: plus(1), melee: plus(1), bonusMelee: true }), draw: 'reshuffle',
  }),
  fireAndHold: def('fireAndHold', {
    title: 'Fire and Hold', group: 'tactic', count: 2, detach: false,
    text: 'Up to four infantry or artillery units not next to the enemy fire with an extra die, but may neither move nor melee.',
    select: { kind: 'kinds', match: { arms: ['infantry', 'artillery'] }, max: 4, notAdjacentToEnemy: true },
    mods: mods({ fire: plus(1), noMove: true, noMelee: true }),
  }),
  firstStrike: def('firstStrike', {
    title: 'First Strike', group: 'tactic', count: 2, detach: false,
    text: 'Played when a unit is attacked in melee: the defender strikes first before the attacker rolls.', select: { kind: 'none' },
  }),
  forceMarch: def('forceMarch', {
    title: 'Force March', group: 'tactic', count: 2, detach: false,
    text: 'Order all the infantry of one section; light, grenadier, guard and led infantry may move two hexes and still fight, other foot may move two without fighting.',
    select: { kind: 'sectionAll', match: { arms: ['infantry'] } }, mods: mods({ move: 'forceMarch' }),
  }),
  coldSteel: def('coldSteel', {
    title: 'Give Them the Cold Steel', group: 'tactic', count: 1, detach: false,
    text: 'Order every unit of yours already next to the enemy; they melee with an extra die but may neither move nor fire.',
    select: { kind: 'adjacentToEnemy' }, mods: mods({ melee: plus(1), noMove: true, noFire: true }),
  }),
  leadership: def('leadership', {
    title: 'Leadership', group: 'tactic', count: 2, detach: true,
    text: 'Order units that stand with a leader; each fights with an extra die in fire and melee.',
    select: { kind: 'leaders' }, mods: mods({ fire: plus(1), melee: plus(1), bonusMelee: true }),
  }),
  grandManoeuvre: def('grandManoeuvre', {
    title: 'La Grande Manoeuvre', group: 'tactic', count: 1, detach: true,
    text: 'Up to four units, wherever they stand, may move four hexes without fighting; a leader may move four as well.',
    select: { kind: 'grandManoeuvre', max: 4 }, mods: mods({ move: { options: [{ max: 4, battle: false }], leader: 4 } }),
  }),
  rally: def('rally', {
    title: 'Rally', group: 'tactic', count: 1, detach: false,
    text: 'Roll dice equal to your Command; each infantry, cavalry or artillery face returns a block to a wounded unit of that arm, and a unit that gains one is ordered.', select: { kind: 'dice', roll: 'rally' },
  }),
  shortSupply: def('shortSupply', {
    title: 'Short Supply', group: 'tactic', count: 1, detach: false,
    text: 'Choose one unit, yours or the enemy’s, and its owner lifts it to a free hex of its own baseline in the same section; it orders nothing.', select: { kind: 'shortSupply' },
  }),
};

/** CARD_DEFS expanded by count, in key order: 70 entries; a card id is an index into it. */
export const CARD_LIST: readonly CardKind[] = (Object.keys(CARD_DEFS) as CardKind[]).flatMap((k) => Array<CardKind>(CARD_DEFS[k].count).fill(k));

export function cardKind(id: number): CardKind {
  return CARD_LIST[id];
}

/** Swaps Left and Right (`probeL` ↔ `probeR`); other kinds unchanged. */
export function mirrorKind(k: CardKind): CardKind {
  if (k.endsWith('L') && CARD_DEFS[k].group === 'section' && k !== 'forward') return `${k.slice(0, -1)}R` as CardKind;
  if (k.endsWith('R') && CARD_DEFS[k].group === 'section' && k !== 'forward') return `${k.slice(0, -1)}L` as CardKind;
  return k;
}

/** Card dice of a unit: (arms absent or including its arm ? plus : 0) + Σ matching tags (tag ∈ st.tags && arm === st.arm). */
export function cardDice(mod: DiceMod | null, st: UnitStats): number {
  if (!mod) return 0;
  let n = !mod.arms || mod.arms.includes(st.arm) ? mod.plus : 0;
  for (const t of mod.tags ?? []) if (st.tags.includes(t.tag) && t.arm === st.arm) n += t.plus;
  return n;
}

/** Draw one card for `side` (an empty deck takes the shuffled discard pile: `reshuffle` event); emits `draw`. */
export function drawCard(s: GameState, ctx: FlowCtx, side: Side): void {
  if (s.deck.length === 0) {
    if (s.discard.length === 0) return;
    s.deck = s.discard;
    s.discard = [];
    shuffle(s, s.deck);
    ctx.emit({ t: 'reshuffle' });
  }
  s.players[side].hand.push(s.deck.pop()!);
  ctx.emit({ t: 'draw', side });
}

/** The card a played card acts as: Counter-Attack becomes a (mirrored) copy of the opponent's last card (R56). */
export function effectiveCard(s: GameState, side: Side, cardId: number): { kind: CardKind | null; mirrored: boolean } {
  const kind = cardKind(cardId);
  if (kind !== 'counterAttack') return { kind, mirrored: false };
  const last = s.lastCard[other(side)];
  if (!last) return { kind: null, mirrored: false };
  const copy = mirrorKind(last);
  return { kind: copy, mirrored: copy !== last };
}

/** Does the turn's card forbid this ordered unit to battle now (Fire and Hold R58, Cold Steel R61)? Stub: false (→ T12a). */
export function cardForbidsBattle(_s: GameState, _op: OrderedPiece, _u: Unit): boolean {
  return false;
}
