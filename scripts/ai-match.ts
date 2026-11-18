// AI match runner. The computer opponent is the seeded random stub of Plan 2B T1c-3a, so a match is the stub against itself
// (or against uniformly random answers) on each battle: a smoke test that every game finishes, and a timing of its turns.
// Usage: npx vite-node scripts/ai-match.ts -- [--games 2] [--scenarios 000] [--a tribune] [--b recruit] [--random]
//        [--shard 0/4] [--seedOffset 0]
//   --random: side B plays uniformly random legal answers instead of the stub.
import { GameDriver, bannerTotal, createGame, other, randomAnswer, type Side } from '../src/engine';
import { SCENARIOS, scenarioById } from '../src/scenarios';
import { personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { arg, flag, jobSeed, lcg, playAiGame, shardJobs } from './lib';

const A = arg('a', 'tribune') as Difficulty;
const B = arg('b', 'recruit') as Difficulty;
const games = Number(arg('games', '1'));
const scen = arg('scenarios', SCENARIOS.map((s) => s.id).join(',')).split(',');
const randomB = flag('random');
const seedOffset = Number(arg('seedOffset', '0'));

const mine = shardJobs(scen, games);

let aWins = 0;
let bWins = 0;
const timeA: number[] = [];
const timeB: number[] = [];
for (const job of mine) {
  const info = scenarioById(job.sc);
  const seed = jobSeed(job, seedOffset);
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide = other(job.aSide);
  const mk = (side: Side, diff: Difficulty): AiOptions => ({
    side, difficulty: diff, personality: personalityFor(info.setup[side].commander, info.setup[side].army), seed: seed * 3 + (side === 'top' ? 1 : 2),
  });
  const rnd = lcg(seed);
  let rejects = 0;
  playAiGame(d, { [job.aSide]: mk(job.aSide, A), [bSide]: mk(bSide, B) } as Record<Side, AiOptions>, {
    answer: (dec) => (dec.side !== job.aSide && randomB ? randomAnswer(d.state, dec, rnd) : undefined),
    planMs: (side, ms) => (side === job.aSide ? timeA : timeB).push(ms),
    rejected: (dec, ans) => {
      rejects++;
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
    },
    fallback: rnd,
  });
  const w = d.state.winner;
  if (w === job.aSide) aWins++;
  else if (w === bSide) bWins++;
  console.log(`${job.sc} A(${A})=${job.aSide} vs B(${randomB ? 'random' : B}) -> ${w === job.aSide ? 'A' : w === bSide ? 'B' : 'none'} ` +
    `${bannerTotal(d.state, job.aSide)}-${bannerTotal(d.state, bSide)} turns=${d.state.turn.number}${rejects ? ` rejects=${rejects}` : ''}`);
}
const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const max = (x: number[]) => (x.length ? Math.max(...x) : 0);
console.log(`RESULT A=${A} wins ${aWins}, B=${randomB ? 'random' : B} wins ${bWins}, games ${mine.length}`);
console.log(`TIME A card plans avg ${avg(timeA).toFixed(0)}ms max ${max(timeA).toFixed(0)}ms; B avg ${avg(timeB).toFixed(0)}ms max ${max(timeB).toFixed(0)}ms`);
