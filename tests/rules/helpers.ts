// Independent QA helpers for the rules suite (tests/rules). Uses only the public engine API.
// The kit's battles put the French army at the top and the British at the bottom: the opposite of every real battle,
// so no test passes by an engine that assumes the British are on top.
import { expect } from 'vitest';
import {
  ARMS, CARD_LIST, GameDriver, NUM_HEXES, SIDES, UNIT_STATS, createGame, passableFor, statsOf, forceDice, forcedDiceLeft, hexId,
  type Answer, type CardKind, type Decision, type DefendChoice, type DieFace, type GameEvent, type GameState, type RollPurpose,
  type RowKey, type ScenarioSetup, type Side, type TerrainSetup, type Unit, type UnitSetup, type LeaderSetup,
} from '../../src/engine';

/** A scenario entry placed `at: [r, c]` instead of by `r` and `c`. */
type At<T> = Omit<T, 'r' | 'c'> & { at: [number, number] };

/**
 * A QA battle: any `ScenarioSetup` field (the rest take defaults: no pieces or terrain, `first: 'bottom'`, `banners: 99`)
 * plus shorthands. Pieces and terrain stand `at: [r, c]`; a unit's `blocks` sets its strength after the build (its
 * `maxBlocks` keeps the row's blocks); a leader's name defaults to Ldr<i>. Both sides hold `cards` cards (5) unless
 * `topCards` or `bottomCards` says otherwise.
 *
 * Ids: units u1..un in order, then the leaders (use `leaderId`).
 */
export type Pos = Partial<Omit<ScenarioSetup, 'top' | 'bottom' | 'units' | 'leaders' | 'terrain'>> & {
  units?: (At<Omit<UnitSetup, 'blocks'>> & { blocks?: number })[];
  leaders?: (Omit<At<LeaderSetup>, 'name'> & { name?: string })[];
  terrain?: At<TerrainSetup>[];
  cards?: number;
  topCards?: number;
  bottomCards?: number;
};

export const H = (r: number, c: number): number => hexId(r, c);

/** The scenario data of a QA battle (`Pos`). */
export function setupOf(p: Pos): ScenarioSetup {
  const { units, leaders, terrain, cards, topCards, bottomCards, ...rest } = p;
  return {
    id: 'qa',
    name: 'QA',
    ...rest,
    top: { army: 'French', nation: 'FR', commander: 'T', cards: topCards ?? cards ?? 5 },
    bottom: { army: 'British', nation: 'BR', commander: 'B', cards: bottomCards ?? cards ?? 5 },
    first: p.first ?? 'bottom',
    banners: p.banners ?? 99,
    terrain: (terrain ?? []).map(({ at: [r, c], ...t }) => ({ ...t, r, c })),
    units: (units ?? []).map(({ at: [r, c], blocks: _blocks, ...u }) => ({ ...u, r, c })),
    leaders: (leaders ?? []).map(({ at: [r, c], name, ...l }, i) => ({ ...l, name: name ?? `Ldr${i}`, r, c })),
  };
}

/** Build a state (seed 4242). Units get ids u1..un in order; leaders get the following L ids (use `leaderId`). */
export function build(p: Pos, seed = 4242): GameState {
  const s = createGame(setupOf(p), seed);
  (p.units ?? []).forEach((u, i) => {
    if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
  });
  return s;
}

/** Id of the i-th leader in the Pos (0-based). */
export function leaderId(s: GameState, i: number): string {
  return s.leaders[i].id;
}

const onTrack = (s: GameState, id: number): boolean => SIDESLIST.some((side) => s.players[side].squareTrack.includes(id));
const SIDESLIST: Side[] = ['top', 'bottom'];

/** Take card `id` out of the deck, the discard and the hands (a hand's slot gets a harmless deck card). */
function pull(s: GameState, id: number): void {
  for (const side of SIDESLIST) {
    const hand = s.players[side].hand;
    const i = hand.indexOf(id);
    if (i >= 0) {
      const j = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike' && CARD_LIST[c] !== CARD_LIST[id]);
      hand[i] = s.deck.splice(j, 1)[0];
    }
  }
  const d = s.deck.indexOf(id);
  if (d >= 0) s.deck.splice(d, 1);
  const x = s.discard.indexOf(id);
  if (x >= 0) s.discard.splice(x, 1);
}

/**
 * Put a card of `kind` into `side`'s hand (replacing the first card, which goes to the bottom of the deck) and return
 * its id. Cards move only between the deck, the discard and the hands, never off a square track.
 */
export function giveCard(s: GameState, side: Side, kind: CardKind): number {
  const hand = s.players[side].hand;
  const already = hand.find((c) => CARD_LIST[c] === kind);
  if (already !== undefined) return already;
  const all = CARD_LIST.map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0);
  const free = all.find((i) => !onTrack(s, i) && i !== s.turn.card && !s.players.top.hand.includes(i) && !s.players.bottom.hand.includes(i))
    ?? all.find((i) => !onTrack(s, i) && i !== s.turn.card)!;
  pull(s, free);
  const old = hand[0];
  hand[0] = free;
  s.deck.unshift(old);
  return free;
}

/** Make sure nobody holds First Strike (so no unexpected defend decisions). */
export function noFirstStrike(s: GameState): void {
  for (const side of SIDESLIST) {
    const hand = s.players[side].hand;
    for (let i = 0; i < hand.length; i++) {
      if (CARD_LIST[hand[i]] === 'firstStrike') {
        const j = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike');
        const repl = s.deck.splice(j, 1)[0];
        s.deck.unshift(hand[i]);
        hand[i] = repl;
      }
    }
  }
}

export function must(d: GameDriver, a: Answer): void {
  const ok = d.answer(a);
  if (!ok) throw new Error(`answer ${JSON.stringify(a)} rejected: ${d.lastError} (pending ${JSON.stringify(d.pending)})`);
}

/**
 * Start the active player's turn with a card of `kind`, ordering `pieces` (if the card asks for a selection).
 * The active player is s.active (set via Pos.first). Strips First Strike from both hands unless keepFS.
 * `single` is La Grande Manoeuvre's "1 unit, normal rules" answer.
 */
export function play(s: GameState, kind: CardKind, pieces?: string[], opts: { keepFS?: boolean; single?: boolean } = {}): GameDriver {
  if (!opts.keepFS) noFirstStrike(s);
  const card = giveCard(s, s.active, kind);
  const d = new GameDriver(s);
  must(d, { kind: 'playCard', card });
  if (pieces && d.pending?.kind === 'orders') must(d, opts.single ? { kind: 'orders', pieces, single: true } : { kind: 'orders', pieces });
  return d;
}

/** Play a card and order pieces, then end movement (skip to battle). */
export function toBattle(s: GameState, kind: CardKind, pieces: string[]): GameDriver {
  const d = play(s, kind, pieces);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  return d;
}

export function u(d: GameDriver | GameState, id: string): Unit | undefined {
  const s = 'state' in d ? d.state : d;
  return s.units.find((x) => x.id === id);
}

export function ev(d: GameDriver): GameEvent[] {
  return d.drainEvents().map((q) => q.e);
}

/** Dice count of the first 'combat' event with the given purpose (and attacker). */
export function combatDice(es: GameEvent[], purpose: RollPurpose, attacker?: string): number | undefined {
  const e = es.find((x) => x.t === 'combat' && x.purpose === purpose && (!attacker || x.attacker === attacker));
  return e && e.t === 'combat' ? e.dice : undefined;
}

export function rolls(es: GameEvent[], purpose?: RollPurpose): DieFace[][] {
  return es.filter((x) => x.t === 'roll' && (!purpose || x.purpose === purpose)).map((x) => (x as { faces: DieFace[] }).faces);
}

export function pendingKind(d: GameDriver): Decision['kind'] | null {
  return d.pending?.kind ?? null;
}

/** Faces helper: k copies of a face. */
export function n(face: DieFace, k: number): DieFace[] {
  return Array(k).fill(face);
}

export { forceDice, forcedDiceLeft };

/** Play a card of `kind` for the active side of a running game and order `pieces` (hands are manipulated in place). */
export function turn(d: GameDriver, kind: CardKind, pieces: string[]): void {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
}

/** End the movement of the ordered pieces still to move. */
export function endMoves(d: GameDriver): void {
  while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
}

/**
 * Finish the active player's turn: end the movement and the battles not fought, and answer anything else pending with the
 * plainest legal answer ('stand', none, the first option, no) until the next player's card is asked for.
 */
export function endTurn(d: GameDriver): void {
  for (let i = 0; i < 200 && d.pending && d.pending.kind !== 'playCard'; i++) {
    const p = d.pending;
    switch (p.kind) {
      case 'move': must(d, { kind: 'endMove' }); break;
      case 'battle': must(d, { kind: 'endBattle' }); break;
      case 'orders': must(d, { kind: 'orders', pieces: [] }); break;
      case 'leaveSquare':
      case 'advance':
      case 'guerrilla': must(d, { kind: 'yesno', yes: false }); break;
      case 'moveFirst': must(d, { kind: 'playCard', card: p.options[0] }); break;
      case 'combinedArms': must(d, { kind: 'select', ids: [] }); break;
      case 'defend': must(d, { kind: 'defend', choice: 'stand' }); break;
      case 'ignoreFlags': must(d, { kind: 'ignoreFlags', count: 0 }); break;
      case 'retreat':
      case 'leaderRetreat':
      case 'scoutKeep':
      case 'shortSupplyTarget': must(d, { kind: 'choose', index: 0 }); break;
      case 'breakthroughExtra': must(d, { kind: 'hex', hex: p.required ? p.options[0] : null }); break;
      case 'bonusMelee': must(d, { kind: 'hex', hex: null }); break;
      case 'shortSupplyHex': must(d, { kind: 'hex', hex: p.options[0] }); break;
      case 'elan':
      case 'rally': must(d, { kind: 'assign', ids: p.faces.map(() => null) }); break;
    }
  }
}

/** Finish the active player's turn doing nothing with a plain section card (hands are manipulated in place). */
export function passTurn(d: GameDriver, kind: CardKind = 'probeC'): void {
  turn(d, kind, []);
  endTurn(d);
}

/** Events from the latest turnStart of `side` on. */
export function fromTurnStart(es: GameEvent[], side: Side): GameEvent[] {
  const i = es.map((e) => e.t === 'turnStart' && e.side === side).lastIndexOf(true);
  expect(i).toBeGreaterThanOrEqual(0);
  return es.slice(i);
}

// ---------------------------------------------------------------------------------------------------------------------
// One melee: a bottom attacker (u1) at (5,6) against a top defender (u2) at (4,6)

/** The first arm symbol of `ARMS` that matches neither unit's arm: a sure miss between them. */
export function miss(a: RowKey, b: RowKey): DieFace {
  return ARMS.find((arm) => arm !== UNIT_STATS[a].arm && arm !== UNIT_STATS[b].arm)!;
}

/** A `duel`: the card played (default `attackC`), the strengths at the start, the terrain under each unit. */
export interface DuelOpts {
  card?: CardKind;
  atkBlocks?: number;
  defBlocks?: number;
  atkT?: Omit<TerrainSetup, 'r' | 'c'>;
  defT?: Omit<TerrainSetup, 'r' | 'c'>;
}

/** Declare an attack, answering a following `combinedArms` with `o.guns ?? []` and a `defend` with `o.defend ?? 'stand'`. */
export function attack(d: GameDriver, unit: string, hex: number, o: { defend?: DefendChoice; guns?: string[] } = {}): void {
  must(d, { kind: 'attack', unit, target: hex });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: o.guns ?? [] });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: o.defend ?? 'stand' });
}

/** The attacker attacks the defender, which stands; every die misses. Returns the attack and battle-back dice. */
export function duel(atk: RowKey, def: RowKey, o: DuelOpts = {}): { attack?: number; back?: number } {
  const terrain: NonNullable<Pos['terrain']> = [];
  if (o.atkT) terrain.push({ ...o.atkT, at: [5, 6] });
  if (o.defT) terrain.push({ ...o.defT, at: [4, 6] });
  const s = build({
    units: [
      { side: 'bottom', key: atk, at: [5, 6], blocks: o.atkBlocks },
      { side: 'top', key: def, at: [4, 6], blocks: o.defBlocks },
    ],
    terrain,
  });
  const d = play(s, o.card ?? 'attackC', ['u1']);
  endMoves(d);
  expect(d.pending?.kind).toBe('battle');
  ev(d);
  forceDice(n(miss(atk, def), 30));
  attack(d, 'u1', H(4, 6));
  const e = ev(d);
  forceDice([]);
  return { attack: combatDice(e, 'melee'), back: combatDice(e, 'battleBack') };
}

/** The attacker declares the attack (`extra` adds to the position); returns the driver at the defend decision or after it resolved. */
export function attackOn(atk: RowKey, def: RowKey, extra: Pos = {}): GameDriver {
  const s = build({ ...extra, units: [{ side: 'bottom', key: atk, at: [5, 6] }, { side: 'top', key: def, at: [4, 6] }, ...(extra.units ?? [])] });
  const d = toBattle(s, 'attackC', ['u1']);
  forceDice(n(miss(atk, def), 40)); // if the attack resolves at once (no defend decision), every die misses
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'combinedArms') must(d, { kind: 'select', ids: [] });
  return d;
}

/** The violated structural invariants of a state (empty = fine; used by invariants.test and the battles soak). `atPlayCard`: a card decision is pending, so every hand is whole. */
export function violations(s: GameState, atPlayCard: boolean): string[] {
  const out: string[] = [];
  // 1. each of the 70 cards exactly once
  const all = [...s.deck, ...s.discard, ...SIDES.flatMap((x) => [...s.players[x].hand, ...s.players[x].squareTrack.filter((c): c is number => c !== null)])];
  if (s.turn.card !== null) all.push(s.turn.card);
  const counts = new Map<number, number>();
  for (const c of all) counts.set(c, (counts.get(c) ?? 0) + 1);
  if (all.length !== CARD_LIST.length || counts.size !== CARD_LIST.length || [...counts.values()].some((k) => k !== 1)) out.push(`cards: ${all.length} held, ${counts.size} distinct`);
  // 2. hand plus filled track slots is the hand size (special.handSize: the scenario's, until a shrinking hand, S33) at every card decision
  if (atPlayCard) {
    for (const side of SIDES) {
      const p = s.players[side];
      if (p.hand.length + p.squareTrack.filter((c) => c !== null).length !== s.special.handSize[side]) out.push(`${side} holds ${p.hand.length} cards`);
    }
  }
  // 3. one unit and one leader per hex; no leader on an enemy; every piece on a board hex passable for it
  const uh = s.units.filter((u) => u.hex >= 0).map((u) => u.hex);
  if (new Set(uh).size !== uh.length) out.push('two units in one hex');
  const lh = s.leaders.filter((l) => l.hex >= 0).map((l) => l.hex);
  if (new Set(lh).size !== lh.length) out.push('two leaders in one hex');
  for (const u of s.units) {
    if (u.hex >= NUM_HEXES) out.push(`unit ${u.id} off the board table (${u.hex})`);
    else if (u.hex >= 0 && !passableFor(s, u.hex, statsOf(s, u).arm)) out.push(`unit ${u.id} on an impassable hex ${u.hex}`);
  }
  for (const l of s.leaders) {
    if (l.hex >= NUM_HEXES) out.push(`leader ${l.id} off the board table (${l.hex})`);
    else if (l.hex >= 0) {
      if (!passableFor(s, l.hex, null)) out.push(`leader ${l.id} on an impassable hex ${l.hex}`);
      const on = s.units.find((u) => u.hex === l.hex);
      if (on && on.side !== l.side) out.push(`leader ${l.id} stands on enemy unit ${on.id}`);
    }
  }
  // 4. 1 ≤ blocks ≤ maxBlocks
  for (const u of s.units) if (u.hex >= 0 && (u.blocks < 1 || u.blocks > u.maxBlocks)) out.push(`unit ${u.id} has ${u.blocks}/${u.maxBlocks} blocks`);
  // 5. a square's counter and the track slot agree, slots are unique per side
  for (const side of SIDES) {
    const mine = s.units.filter((u) => u.hex >= 0 && u.side === side && u.square !== undefined);
    const slots = mine.map((u) => u.square!);
    if (new Set(slots).size !== slots.length) out.push(`${side} has two squares in one slot`);
    for (const u of mine) if (s.players[side].squareTrack[u.square! - 1] === null) out.push(`square ${u.id} has no card on slot ${u.square}`);
    s.players[side].squareTrack.forEach((c, i) => {
      if (c !== null && !mine.some((u) => u.square === i + 1)) out.push(`${side} track slot ${i + 1} holds a card with no square`);
    });
  }
  return out;
}
