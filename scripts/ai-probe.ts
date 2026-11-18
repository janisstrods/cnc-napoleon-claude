// Per-battle speed probe (Plan 5 Task 11): plays each battle deterministically (level A against level B, `--scale`, to `--maxTurn`)
// and reports, per battle and level, the budget nodes and the CPU time of the card and battle decisions, the time per node, and
// the deterministic scale whose node cap gives each level about the nodes its shipped time cap buys (the P-a matching: a decision
// that took longer than its cap is counted at the nodes the cap would have bought, pro rata; the cap N is then the smallest whose
// mean min(nodes, N) reaches that mean). CPU time (process.cpuUsage) is less load-sensitive than wall time, but on a loaded
// machine it still runs high (shared caches, efficiency cores), so a matched scale measured there is a lower bound.
// Usage: npx vite-node scripts/ai-probe.ts -- [--scenarios 001,012,113] [--a marshal] [--b colonel] [--scale 1] [--maxTurn 10]
//        [--aSide bottom] [--json out.json]
import { writeFileSync } from 'node:fs';
import { GameDriver, createGame, other, type Side } from '../src/engine';
import { scenarioById } from '../src/scenarios';
import { DIFFICULTIES, chooseAnswer, newMemory, personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { LEVELS } from '../src/ai/planner';
import { arg, levelArg, scenarioList } from './lib';

const A = levelArg('a', 'marshal');
const B = levelArg('b', 'colonel');
const scale = Number(arg('scale', '1'));
const maxTurn = Number(arg('maxTurn', '10'));
const aSide = arg('aSide', 'bottom') as Side;

interface Row { sc: string; turn: number; kind: 'playCard' | 'battle'; level: Difficulty; nodes: number; cpuMs: number }
const rows: Row[] = [];
for (const sc of scenarioList(arg('scenarios', '001,012,113'))) {
  const info = scenarioById(sc);
  const seed = 1000 * Number(sc);
  const d = new GameDriver(createGame(info.setup, seed));
  const mk = (side: Side, difficulty: Difficulty): AiOptions => ({
    side, difficulty, seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: scale, deterministic: true,
    personality: personalityFor(info.setup[side].commander, info.setup[side].army, info.setup[side].nation),
  });
  const opts = { [aSide]: mk(aSide, A), [other(aSide)]: mk(other(aSide), B) } as Record<Side, AiOptions>;
  const mems = { top: newMemory(), bottom: newMemory() };
  let steps = 0;
  while (!d.over && steps++ < 20000 && d.state.turn.number <= maxTurn) {
    const dec = d.pending!;
    const c0 = process.cpuUsage();
    const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
    const cpu = process.cpuUsage(c0);
    if (dec.kind === 'playCard' || dec.kind === 'battle') {
      rows.push({ sc, turn: d.state.turn.number, kind: dec.kind, level: opts[dec.side].difficulty, nodes: mems[dec.side].last?.nodes ?? 0, cpuMs: (cpu.user + cpu.system) / 1000 });
    }
    if (!d.answer(r.answer)) throw new Error(`${sc}: the engine refused the AI's ${dec.kind} answer`);
    d.drainEvents();
  }
}
const json = arg('json', '');
if (json) writeFileSync(json, JSON.stringify(rows));

const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
console.log('| Battle | Level | Decision | n | Nodes (avg) | CPU ms (avg, max) | µs per node |');
console.log('|---|---|---|---|---|---|---|');
const keys = [...new Set(rows.map((r) => `${r.sc}|${r.level}|${r.kind}`))].sort();
for (const k of keys) {
  const [sc, level, kind] = k.split('|');
  const r = rows.filter((x) => x.sc === sc && x.level === level && x.kind === kind);
  const nodes = mean(r.map((x) => x.nodes));
  const cpu = mean(r.map((x) => x.cpuMs));
  console.log(`| ${sc} | ${level} | ${kind} | ${r.length} | ${nodes.toFixed(0)} | ${cpu.toFixed(0)}, ${Math.max(...r.map((x) => x.cpuMs)).toFixed(0)} | ${nodes ? ((1000 * cpu) / nodes).toFixed(0) : '-'} |`);
}
for (const level of DIFFICULTIES) {
  for (const kind of ['playCard', 'battle'] as const) {
    const r = rows.filter((x) => x.level === level && x.kind === kind);
    if (!r.length) continue;
    const cfg = LEVELS[DIFFICULTIES.indexOf(level)];
    const share = kind === 'battle' ? 0.3 : 1;
    const cap = cfg.budgetMs * share;
    const timed = mean(r.map((x) => Math.min(x.nodes, (x.nodes * cap) / Math.max(1, x.cpuMs))));
    let n = 1;
    while (n < 100000 && mean(r.map((x) => Math.min(x.nodes, n))) < timed) n++;
    console.log(`${level} ${kind}: n=${r.length}, deterministic nodes ${mean(r.map((x) => x.nodes)).toFixed(0)}, over the ${cap} ms cap ${r.filter((x) => x.cpuMs > cap).length}, ` +
      `nodes the cap buys ${timed.toFixed(0)} -> matching cap ${n} nodes = scale ${(n / (cfg.maxSims * share)).toFixed(3)}`);
  }
}
