// AI match runner: the general (src/ai) at level A against level B (or against uniformly random answers) on each battle,
// each seed played with A as bottom and then as top. Prints one line per game and a summary: wins, rejected answers, AI
// fallbacks and the time of the card decisions.
// Usage: npx vite-node scripts/ai-match.ts -- [--games 1] [--scenarios 001,101] [--a colonel] [--b captain] [--random]
//        [--scale 1] [--deterministic] [--shard 0/4] [--seedOffset 0]
//   --a/--b: captain, colonel, marshal or 0, 1, 2. --random: side B plays uniformly random legal answers instead.
//   --scale: the thinking budget (AiOptions.budgetScale). --deterministic: no clock is read (the node budget limits the work),
//   so results do not depend on machine load. --scenarios takes any battle id, the Spanish battles 101-118 included.
//   With --a = --b (and no --random) the swapped game of a pair is played on the seed + 7 (it would otherwise replay the first).
import { GameDriver, bannerTotal, createGame, other, randomAnswer, type Side } from '../src/engine';
import { SCENARIOS, scenarioById } from '../src/scenarios';
import { personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { arg, flag, jobSeed, lcg, levelArg, mirrored, playAiGame, scenarioList, shardJobs } from './lib';

const A = levelArg('a', 'colonel');
const B = levelArg('b', 'captain');
const games = Number(arg('games', '1'));
const scen = scenarioList(arg('scenarios', SCENARIOS.map((s) => s.id).join(',')));
const scale = Number(arg('scale', '1'));
const deterministic = flag('deterministic');
const randomB = flag('random');
const seedOffset = Number(arg('seedOffset', '0'));

const mine = shardJobs(scen, games);

let aWins = 0;
let totalRejects = 0;
let fallbacks = 0;
let bWins = 0;
const timeA: number[] = [];
const timeB: number[] = [];
for (const job of mine) {
  const info = scenarioById(job.sc);
  // the same AI on both sides: the swapped game would replay the first, so it gets its own seed (jobSeed's `mirror`)
  const seed = jobSeed(job, seedOffset, mirrored(A, randomB ? 'random' : B, scale, scale));
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide = other(job.aSide);
  const mk = (side: Side, diff: Difficulty): AiOptions => ({
    side, difficulty: diff, personality: personalityFor(info.setup[side].commander, info.setup[side].army, info.setup[side].nation), seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: scale, deterministic,
  });
  const rnd = lcg(seed);
  let rejects = 0;
  const mems = playAiGame(d, { [job.aSide]: mk(job.aSide, A), [bSide]: mk(bSide, B) } as Record<Side, AiOptions>, {
    answer: (dec) => (dec.side !== job.aSide && randomB ? randomAnswer(d.state, dec, rnd) : undefined),
    planMs: (side, ms) => (side === job.aSide ? timeA : timeB).push(ms),
    rejected: (dec, ans) => {
      rejects++;
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
    },
    fallback: rnd,
  });
  fallbacks += mems.top.fallbacks + mems.bottom.fallbacks;
  totalRejects += rejects;
  const w = d.state.winner;
  if (w === job.aSide) aWins++;
  else if (w === bSide) bWins++;
  console.log(`${job.sc} A(${A})=${job.aSide} vs B(${randomB ? 'random' : B}) -> ${w === job.aSide ? 'A' : w === bSide ? 'B' : 'none'} ` +
    `${bannerTotal(d.state, job.aSide)}-${bannerTotal(d.state, bSide)} turns=${d.state.turn.number}${rejects ? ` rejects=${rejects}` : ''}`);
}
const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const max = (x: number[]) => (x.length ? Math.max(...x) : 0);
console.log(`RESULT A=${A} wins ${aWins}, B=${randomB ? 'random' : B} wins ${bWins}, games ${mine.length}, rejects ${totalRejects}, fallbacks ${fallbacks}`);
console.log(`TIME A card plans avg ${avg(timeA).toFixed(0)}ms max ${max(timeA).toFixed(0)}ms; B avg ${avg(timeB).toFixed(0)}ms max ${max(timeB).toFixed(0)}ms`);
