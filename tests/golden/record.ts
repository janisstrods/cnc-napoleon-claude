import { GameDriver, createGame, randomAnswer, type GameEvent, type GameState } from '../../src/engine';
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
    deck: s.deck, discard: s.discard, rng: s.rng, rngCalls: s.rngCalls, winner: s.winner,
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

export const RANDOM_GAMES: [string, number][] = [['000', 11]];

/** The golden-game list (the AI games return with the Napoleonic AI). */
export function goldenGames(): Golden[] {
  return RANDOM_GAMES.map(([s, n]) => randomGame(s, n));
}
