// Legal-answer helpers: random legal answers for any decision (tests, AI) and the greedy dice assignment.
import { answerError } from './decisions';
import { battleReady, battleTargets, movablePieces, pieceMoves } from './options';
import { sampleOrders } from './orders';
import { pieceHex, unitsOf, leadersOf } from './query';
import type { Answer, Decision, GameState } from './types';

export type Rand = () => number;

function pick<T>(arr: readonly T[], rnd: Rand): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function shuffled<T>(arr: readonly T[], rnd: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Greedy assignment of dice to pieces: each die in turn takes the first of its `choices` that leaves the assignment valid
 * (`check` finds no error) with the dice after it unused, or none (null). `choices` is called once per die, in order.
 */
export function greedyAssign(
  dice: number, choices: (i: number) => readonly string[], check: (ids: (string | null)[]) => string | null,
): (string | null)[] {
  const ids: (string | null)[] = [];
  for (let i = 0; i < dice; i++) {
    const unused: null[] = Array(dice - i - 1).fill(null);
    ids.push(choices(i).find((id) => !check([...ids, id, ...unused])) ?? null);
  }
  return ids;
}

/** A random legal answer for any decision. */
export function randomAnswer(s: GameState, d: Decision, rnd: Rand): Answer {
  switch (d.kind) {
    case 'playCard':
      return { kind: 'playCard', card: pick(s.players[d.side].hand, rnd) };
    case 'orders': {
      const o = sampleOrders(s, d.side, d.card, rnd);
      return o.single ? { kind: 'orders', pieces: o.pieces, single: true } : { kind: 'orders', pieces: o.pieces };
    }
    case 'leaveSquare':
    case 'advance':
    case 'guerrilla':
      return { kind: 'yesno', yes: rnd() < 0.5 };
    case 'moveFirst':
      return { kind: 'playCard', card: pick(d.options, rnd) };
    case 'move': {
      if (rnd() < 0.1) return { kind: 'endMove' };
      const ids = movablePieces(s);
      if (!ids.length) return { kind: 'endMove' };
      const id = pick(ids, rnd);
      const moves = pieceMoves(s, id);
      const to = pick(moves, rnd);
      return { kind: 'move', piece: id, to: to.hex };
    }
    case 'battle': {
      const ids = battleReady(s);
      if (!ids.length || rnd() < 0.03) return { kind: 'endBattle' };
      const id = pick(ids, rnd);
      return { kind: 'attack', unit: id, target: pick(battleTargets(s, id), rnd).hex };
    }
    case 'combinedArms': {
      const ids = d.options.filter(() => rnd() < 0.5);
      return { kind: 'select', ids: ids.length === 0 && d.required ? [pick(d.options, rnd)] : ids };
    }
    case 'defend':
      return { kind: 'defend', choice: pick(d.options, rnd) };
    case 'ignoreFlags':
      return { kind: 'ignoreFlags', count: Math.floor(rnd() * (d.max + 1)) };
    case 'retreat':
    case 'leaderRetreat':
      return { kind: 'choose', index: Math.floor(rnd() * d.options.length) };
    case 'scoutKeep':
      return { kind: 'choose', index: Math.floor(rnd() * d.cards.length) };
    case 'shortSupplyTarget':
      return { kind: 'choose', index: Math.floor(rnd() * d.options.length) };
    case 'breakthroughExtra':
      return { kind: 'hex', hex: !d.required && rnd() < 0.3 ? null : pick(d.options, rnd) };
    case 'bonusMelee':
      return { kind: 'hex', hex: rnd() < 0.2 ? null : pick(d.targets, rnd) };
    case 'shortSupplyHex':
      return { kind: 'hex', hex: pick(d.options, rnd) };
    case 'elan':
    case 'rally': {
      const pieces = [...unitsOf(s, d.side).map((u) => u.id), ...leadersOf(s, d.side).map((l) => l.id)].filter((id) => pieceHex(s, id) !== undefined);
      const ids = greedyAssign(d.faces.length, () => shuffled(pieces, rnd), (trial) => answerError(s, d, { kind: 'assign', ids: trial }));
      return { kind: 'assign', ids };
    }
  }
}
