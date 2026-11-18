import { GameDriver, createGame, randomAnswer, type Answer, type GameEvent, type GameState } from '../../src/engine';
import { playBattle } from '../ai/soak';
import { scenarioById } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';

export interface Golden { id: string; hash: string; answers: number; winner: string }

export function fnv(str: string, h = 0x811c9dc5): number {
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Behaviour-level digest of a state. */
export function digest(s: GameState) {
  return {
    units: s.units.map((u) => [u.id, u.side, u.key, u.hex, u.blocks, u.square ?? 0]),
    leaders: s.leaders.map((l) => [l.id, l.side, l.hex]),
    hands: [s.players.top.hand, s.players.bottom.hand],
    tracks: [s.players.top.squareTrack, s.players.bottom.squareTrack],
    banners: [s.players.top.banners, s.players.bottom.banners],
    deck: s.deck, discard: s.discard, rng: s.rng, rngCalls: s.rngCalls, winner: s.winner, special: s.special,
  };
}
function hashEvents(h: number, evs: GameEvent[]): number { for (const e of evs) h = fnv(JSON.stringify(e), h); return h; }

/** Random-legal games: engine only. */
function randomGame(scId: string, seed: number): Golden {
  const d = new GameDriver(createGame(scenarioById(scId).setup, seed));
  const rnd = mulberry32(seed);
  let h = hashEvents(0x811c9dc5, d.drainEvents().map((q) => q.e));
  let steps = 0;
  while (!d.over && steps++ < 20000) {
    if (!d.answer(randomAnswer(d.state, d.pending!, rnd))) throw new Error(`random answer rejected in rnd-${scId}-${seed}: ${d.lastError}`);
    h = hashEvents(h, d.drainEvents().map((q) => q.e));
  }
  h = fnv(JSON.stringify(digest(d.state)), h);
  return { id: `rnd-${scId}-${seed}`, hash: h.toString(16), answers: d.answers.length, winner: String(d.state.winner) };
}

/** One random game per battle: 000 (seed 11), 001-015 (10 + n), 101-118 (110 + n - 100). */
export const RANDOM_GAMES: [string, number][] = [
  ['000', 11],
  ...Array.from({ length: 15 }, (_, i): [string, number] => [String(i + 1).padStart(3, '0'), 11 + i]),
  ...Array.from({ length: 18 }, (_, i): [string, number] => [String(101 + i), 111 + i]),
];

/** AI-vs-AI games at a quiet budget scale (events and final digest). */
export const AI_GAMES: [string, number][] = [['005', 31], ['010', 32], ['101', 33], ['116', 34]];

function aiGame(scId: string, seed: number): Golden {
  const r = playBattle(scId, { seed, budgetScale: 0.05, record: true });
  let h = 0x811c9dc5;
  for (const e of r.events) h = fnv(e, h);
  h = fnv(JSON.stringify(digest(r.d.state)), h);
  return { id: `ai-${scId}-${seed}`, hash: h.toString(16), answers: r.d.answers.length, winner: String(r.d.state.winner) };
}

export function randomGolden(): Golden[] { return RANDOM_GAMES.map(([s, n]) => randomGame(s, n)); }
export function aiGolden(): Golden[] { return AI_GAMES.map(([s, n]) => aiGame(s, n)); }
/** The golden-game list: random games, then AI games. */
export function goldenGames(): Golden[] { return [...randomGolden(), ...aiGolden()]; }

export interface SaveFixture { scenarioId: string; seed: number; rngCalls: number; stateHash: string; answers: Answer[] }

/** A mid-game save of battle 116: the first 60 answers of random play, with the position's rng count and hash. */
export function makeSaveFixture(): SaveFixture {
  const scenarioId = '116', seed = 17;
  const d = new GameDriver(createGame(scenarioById(scenarioId).setup, seed));
  const rnd = mulberry32(seed);
  while (d.answers.length < 60) {
    if (!d.answer(randomAnswer(d.state, d.pending!, rnd))) throw new Error(`save fixture answer rejected: ${d.lastError}`);
  }
  const dg = digest(d.state);
  return { scenarioId, seed, rngCalls: dg.rngCalls, stateHash: fnv(JSON.stringify(dg)).toString(16), answers: [...d.answers] };
}
