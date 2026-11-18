// AI-vs-AI balance runs with behaviour counters (Plan 5 Task 10).
// Usage: npx vite-node scripts/ai-balance.ts -- [--scenarios 001,101 | (every visible battle)] [--games 2] [--a 1] [--b 1] [--scale 0.5] [--scaleA x] [--scaleB y]
//        [--deterministic] [--shard 0/4] [--seedOffset 0] [--json out.json] [--persTop id] [--persBottom id] [--maxTurn 150]
//   Each seed is played twice, A as bottom and then as top (a paired game), so with --a = --b the win rates measure the battle's
//   balance and with --a 2 --b 1 they measure strength. With the same AI on both sides (same level and scale) the swapped game would
//   replay the first move for move, so it is played on the seed + 7 instead (jobSeed's `mirror`). --a/--b: captain, colonel,
//   marshal or 0, 1, 2. --deterministic passes
//   `deterministic: true` to both sides: no clock is read, the node budget alone limits the work, and the results do not depend on
//   machine load. The JSON holds one row per game (`GameRow`, scripts/lib.ts); only its `timing` field depends on the machine.
//   Both games of a pair share the game seed, except a mirrored pair (see above); the AIs' own seeds add the side.
//   `sims`: AiMemory.last.sims summed over the AI decisions (simulated turns at a card decision, not nodes); `nodes`:
//   AiMemory.last.nodes summed (the budget nodes charged).
//   Counters come from engine events and the decisions and answers, never from AI internals; nodes, decision times and fallbacks
//   are the harness's own figures. `--persTop/--persBottom` force a temperament (default: the commander's own, personalityFor).
//   Summarise the files with ai-balance-report.ts.
import { writeFileSync } from 'node:fs';
import { GameDriver, bannerTotal, createGame, other, type Side } from '../src/engine';
import { scenarioById } from '../src/scenarios';
import { personalityById, personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import {
  addCounters, arg, countDecision, countEvents, countTurnStart, flag, jobSeed, lcg, levelArg, mirrored, playAiGame, scenarioList, shardJobs, snapshotUnits,
  visibleScenarioIds, wilson, zeroCounters, type GameRow,
} from './lib';

const A = levelArg('a', 'colonel');
const B = levelArg('b', 'colonel');
const games = Number(arg('games', '2'));
const scale = Number(arg('scale', '0.5'));
/** Per-side overrides of `--scale` (Task 11, P-a: each level at the node count its shipped time cap buys). */
const scaleA = Number(arg('scaleA', String(scale)));
const scaleB = Number(arg('scaleB', String(scale)));
const deterministic = flag('deterministic');
const scen = scenarioList(arg('scenarios', visibleScenarioIds().join(',')));
const seedOffset = Number(arg('seedOffset', '0'));
const maxTurn = Number(arg('maxTurn', '150'));
const jsonOut = arg('json', '');
const persBy: Record<Side, string> = { top: arg('persTop', ''), bottom: arg('persBottom', '') };

const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const max = (x: number[]) => (x.length ? Math.max(...x) : 0);

const results: GameRow[] = [];
for (const job of shardJobs(scen, games)) {
  const info = scenarioById(job.sc);
  // A against itself (same level and budget): the swapped game would be a copy, so it gets its own seed (jobSeed's `mirror`)
  const seed = jobSeed(job, seedOffset, mirrored(A, B, scaleA, scaleB));
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide = other(job.aSide);
  const mk = (side: Side, diff: Difficulty, budgetScale: number): AiOptions => ({
    side, difficulty: diff, seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale, deterministic,
    personality: persBy[side] ? personalityById(persBy[side]) : personalityFor(info.setup[side].commander, info.setup[side].army, info.setup[side].nation),
  });
  const opt = { [job.aSide]: mk(job.aSide, A, scaleA), [bSide]: mk(bSide, B, scaleB) } as Record<Side, AiOptions>;
  const c = zeroCounters();
  let rejects = 0;
  let sims = 0;
  let nodes = 0;
  let known = snapshotUnits(d.state);
  const ms: Record<Side, number[]> = { top: [], bottom: [] };
  const mems = playAiGame(d, opt, {
    maxTurn,
    before: (dec) => {
      countTurnStart(c, d.state, dec);
      known = snapshotUnits(d.state);
    },
    planMs: (side, t) => ms[side].push(t),
    chosen: (dec, ans, ai) => {
      countDecision(c, d.state, dec, ans);
      if (ai?.mem.last) {
        sims += ai.mem.last.sims;
        nodes += ai.mem.last.nodes;
      }
    },
    rejected: (dec, ans) => {
      rejects++;
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
    },
    fallback: lcg(seed),
    after: (_, events) => countEvents(c, d.state, known, events),
  });
  const w = d.state.winner;
  const row: GameRow = {
    sc: job.sc, aSide: job.aSide, seed, winner: w === null ? 'none' : String(w),
    banners: [bannerTotal(d.state, 'bottom'), bannerTotal(d.state, 'top')], turns: d.state.turn.number, reason: d.state.winReason,
    a: A, b: B, rejects, fallbacks: mems.top.fallbacks + mems.bottom.fallbacks, sims, nodes,
    timing: { A: { avg: avg(ms[job.aSide]), max: max(ms[job.aSide]) }, B: { avg: avg(ms[bSide]), max: max(ms[bSide]) } }, c,
  };
  results.push(row);
  const nz = Object.entries(c).filter(([, v]) => (Array.isArray(v) ? v.some(Boolean) : v)).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('/') : v}`).join(' ');
  console.log(`${job.sc} A(${A})=${job.aSide} winner=${row.winner}${w === job.aSide ? '(A)' : w === bSide ? '(B)' : ''} bottom-top ${row.banners[0]}-${row.banners[1]} ` +
    `turns=${row.turns} sims=${sims} nodes=${nodes} msA=${row.timing.A.avg.toFixed(0)} msB=${row.timing.B.avg.toFixed(0)}${rejects ? ` rejects=${rejects}` : ''}${row.fallbacks ? ` fallbacks=${row.fallbacks}` : ''} ${nz}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results));
const aW = results.filter((x) => x.winner === x.aSide).length;
const bW = results.filter((x) => x.winner !== 'none' && x.winner !== 'draw' && x.winner !== x.aSide).length;
const total = results.reduce((t, r) => addCounters(t, r.c), zeroCounters());
const [lo, hi] = wilson(aW, results.length);
console.log(`RESULT A=${A} wins ${aW} (${Math.round((100 * aW) / Math.max(1, results.length))} %, 95 % Wilson [${Math.round(100 * lo)} %, ${Math.round(100 * hi)} %]), B=${B} wins ${bW}, games ${results.length}, rejects ${results.reduce((n, r) => n + r.rejects, 0)}, ` +
  `fallbacks ${results.reduce((n, r) => n + r.fallbacks, 0)}, leadersLost ${total.leadersLost}`);
