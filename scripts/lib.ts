// Shared plumbing for the dev scripts (scripts/ai-match.ts): command-line flags, the scripts' fallback generator, the
// tournament job list, and the AI-vs-AI game loop.
import {
  GameDriver, OFF_BOARD, bannerTotal, battleTargets, distance, randomAnswer, statsOf, type Answer, type Decision, type GameEvent, type GameState, type Side, type Unit,
} from '../src/engine';
import { SCENARIOS, scenarioById } from '../src/scenarios';
import { DIFFICULTIES, chooseAnswer, newMemory, type AiMemory, type AiOptions, type Difficulty } from '../src/ai';

/** The value after `--name` on the command line, or `def`. */
export function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/** Is `--name` on the command line? */
export const flag = (name: string) => process.argv.includes(`--${name}`);

/** `--shard i/n`: this run plays the jobs i, i + n, i + 2n... (default 0/1, every job). */
export function shardArg(): [number, number] {
  const text = arg('shard', '0/1');
  const m = /^(\d+)\/(\d+)$/.exec(text);
  const [i, n] = m ? [Number(m[1]), Number(m[2])] : [-1, 0];
  if (!(n >= 1 && i >= 0 && i < n)) throw new Error(`--shard must be i/n with 0 <= i < n, not "${text}"`);
  return [i, n];
}

/** The scripts' small seeded generator of floats in [0, 1) (random players, rejected-answer fallbacks). */
export function lcg(seed: number): () => number {
  let r = seed;
  return () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
}

/** One game of a tournament: a battle, the side side A plays, and the game's number. */
export interface Job { sc: string; aSide: Side; g: number }

/** Every battle `games` times, A as bottom and then as top, as `--shard` shares them out by pair (a game's two jobs stay together). */
export function shardJobs(scenarios: string[], games: number): Job[] {
  const [shard, shards] = shardArg();
  const jobs: Job[] = [];
  let pair = 0;
  for (const sc of scenarios) for (let g = 0; g < games; g++, pair++) {
    if (pair % shards === shard) for (const aSide of ['bottom', 'top'] as Side[]) jobs.push({ sc, aSide, g });
  }
  return jobs;
}

/**
 * A job's game seed, the same for both sides of a pair (`--seedOffset` shifts the games to fresh seeds); the AIs' own seeds add the
 * side. `mirror`: both sides play the same AI (same level and budget), so the pair's second game would replay the first move for
 * move; it gets a seed of its own (+7 when A is the top army, as in the Ancients runs).
 */
export const jobSeed = (job: Job, seedOffset: number, mirror = false) =>
  1000 * Number(job.sc) + 17 * (job.g + seedOffset) + (mirror && job.aSide === 'top' ? 7 : 0);

export interface PlayHooks {
  /** The last turn played (default: no limit). */
  maxTurn?: number;
  /** Before each decision is answered. */
  before?: (dec: Decision) => void;
  /** An answer for the decision instead of its side's AI (undefined: the AI answers). */
  answer?: (dec: Decision) => Answer | undefined;
  /** The thinking time of an AI turn plan (a card decision). */
  planMs?: (side: Side, ms: number) => void;
  /** Once the answer is chosen, before it is applied (`ai`: the AI's full result and memory, when the AI chose it). */
  chosen?: (dec: Decision, ans: Answer, ai?: { say?: string; mem: AiMemory }) => void;
  /** A rejected answer (`d.lastError` says why); with `fallback`, a random legal answer from it then replaces it. */
  rejected?: (dec: Decision, ans: Answer) => void;
  fallback?: () => number;
  /** After each answer, with the events it produced. */
  after?: (dec: Decision, events: GameEvent[]) => void;
}

/**
 * Play the game in `d` to the end (or past `maxTurn`, or 20000 decisions): each side's AI (`opts`, a memory per side)
 * answers its decisions unless `hooks.answer` does. Returns the memories.
 */
export function playAiGame(d: GameDriver, opts: Record<Side, AiOptions>, hooks: PlayHooks = {}): Record<Side, AiMemory> {
  const mems = { top: newMemory(), bottom: newMemory() };
  const maxTurn = hooks.maxTurn ?? Infinity;
  let steps = 0;
  while (!d.over && steps++ < 20000 && d.state.turn.number <= maxTurn) {
    const dec = d.pending!;
    hooks.before?.(dec);
    let ans = hooks.answer?.(dec);
    if (ans) hooks.chosen?.(dec, ans);
    else {
      const mem = mems[dec.side];
      const t0 = hooks.planMs ? performance.now() : 0;
      const res = chooseAnswer(d.state, dec, opts[dec.side], mem);
      if (hooks.planMs && dec.kind === 'playCard') hooks.planMs(dec.side, performance.now() - t0);
      ans = res.answer;
      hooks.chosen?.(dec, ans, { say: res.say, mem });
    }
    if (!d.answer(ans)) {
      hooks.rejected?.(dec, ans);
      if (hooks.fallback) d.answer(randomAnswer(d.state, d.pending!, hooks.fallback));
    }
    const events = d.drainEvents().map((q) => q.e);
    hooks.after?.(dec, events);
  }
  return mems;
}

// ---------------------------------------------------------------------------------------------------------------------
// Arguments

/** A level named `captain`, `colonel` or `marshal`, or numbered 0, 1 or 2. Anything else throws. */
export function parseLevel(text: string): Difficulty {
  if ((DIFFICULTIES as readonly string[]).includes(text)) return text as Difficulty;
  if (/^[0-2]$/.test(text)) return DIFFICULTIES[Number(text)];
  throw new Error(`Unknown level "${text}": use captain, colonel, marshal or 0, 1, 2`);
}

/** The level after `--name` (names or 0/1/2), or `def`. */
export const levelArg = (name: string, def: Difficulty): Difficulty => parseLevel(arg(name, def));

/** A comma-separated list of battle ids (the Spanish battles 101-118 included); an unknown id throws. */
export function scenarioList(text: string): string[] {
  const ids = text.split(',').map((x) => x.trim()).filter(Boolean);
  for (const id of ids) scenarioById(id);
  return ids;
}

/** The ids of every battle the pickers offer (the hidden drill 000 is left out). */
export const visibleScenarioIds = (): string[] => SCENARIOS.filter((s) => !s.hidden).map((s) => s.id);

/** The 95 % Wilson score interval of `wins` in `n` games ([0, 1] when there are none). */
export function wilson(wins: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - half) / d), Math.min(1, (centre + half) / d)];
}

// ---------------------------------------------------------------------------------------------------------------------
// Behaviour counters (ai-balance): the anti-goal checks of Plan 5 Task 11, read from decisions, answers and GameEvents only

export interface Counters {
  /** Defend decisions that offered a reaction, and how often it was chosen. */
  squareOffers: number; squaresFormed: number; rrOffers: number; rrUsed: number; fsOffers: number; fsPlayed: number;
  /** Combat events that had guns joining (Combined Arms). */
  combinedArms: number;
  /** Artillery fire events by distance 1..5 (index 0 is distance 1). */
  gunShotsByRange: number[];
  /** Melees declared by infantry (an attack or a bonus melee), and of them those by infantry at 2 blocks or fewer on full-strength infantry. */
  infantryMelees: number; wornAttacks: number;
  leadersLost: number;
  exits: number;
  /** Turns (at the card decision) that began with the active side holding a temporary-objective banner. */
  heldTurns: number;
}

export const zeroCounters = (): Counters => ({
  squareOffers: 0, squaresFormed: 0, rrOffers: 0, rrUsed: 0, fsOffers: 0, fsPlayed: 0, combinedArms: 0, gunShotsByRange: [0, 0, 0, 0, 0],
  infantryMelees: 0, wornAttacks: 0, leadersLost: 0, exits: 0, heldTurns: 0,
});

/** Add `b` into `a`. */
export function addCounters(a: Counters, b: Counters): Counters {
  for (const k of Object.keys(a) as (keyof Counters)[]) {
    const x = a[k];
    const y = b[k];
    if (Array.isArray(x) && Array.isArray(y)) y.forEach((v, i) => { x[i] = (x[i] ?? 0) + v; });
    else (a as unknown as Record<string, number>)[k] += y as number;
  }
  return a;
}

/** The units as they stand now, by id (copies): events describe what happened to them, after the answer changed the state. */
export function snapshotUnits(s: GameState): Map<string, Unit> {
  return new Map(s.units.map((u) => [u.id, { ...u }]));
}

/** A melee declared by unit `id` on the unit at `hex`: counted for infantry, and as worn at 2 blocks or fewer against full-strength infantry. */
function countMelee(c: Counters, s: GameState, id: string, hex: number): void {
  const a = s.units.find((u) => u.id === id);
  const t = s.units.find((u) => u.hex === hex && u.side !== a?.side);
  if (!a || !t || statsOf(s, a).arm !== 'infantry') return;
  c.infantryMelees++;
  if (a.blocks <= 2 && statsOf(s, t).arm === 'infantry' && t.blocks >= t.maxBlocks) c.wornAttacks++;
}

/** Count one decision and its answer (before the answer is applied). */
export function countDecision(c: Counters, s: GameState, dec: Decision, ans: Answer): void {
  if (dec.kind === 'battle' && ans.kind === 'attack') {
    // a melee, not a shot: the engine's own target list says which
    if (battleTargets(s, ans.unit).find((x) => x.hex === ans.target)?.kind === 'melee') countMelee(c, s, ans.unit, ans.target);
    return;
  }
  if (dec.kind === 'bonusMelee') {
    if (ans.kind === 'hex' && ans.hex !== null) countMelee(c, s, dec.unit, ans.hex);
    return;
  }
  if (dec.kind !== 'defend') return;
  const choice = ans.kind === 'defend' ? ans.choice : null;
  if (dec.options.includes('formSquare')) { c.squareOffers++; if (choice === 'formSquare') c.squaresFormed++; }
  if (dec.options.includes('retireReform')) { c.rrOffers++; if (choice === 'retireReform') c.rrUsed++; }
  if (dec.options.includes('firstStrike')) { c.fsOffers++; if (choice === 'firstStrike') c.fsPlayed++; }
}

/** A card decision: count the turn if the side to act starts it holding objective banners. */
export function countTurnStart(c: Counters, s: GameState, dec: Decision): void {
  if (dec.kind === 'playCard' && bannerTotal(s, dec.side) > s.players[dec.side].banners) c.heldTurns++;
}

/** Count the events of one answer; `known` is `snapshotUnits` taken before it, `s` the scenario's state (for unit stats). */
export function countEvents(c: Counters, s: GameState, known: Map<string, Unit>, events: GameEvent[]): void {
  for (const e of events) {
    if (e.t === 'leaderKilled') c.leadersLost++;
    else if (e.t === 'move' && e.path[e.path.length - 1] === OFF_BOARD) c.exits++;
    else if (e.t === 'combat') {
      if (e.artillery && e.artillery.length > 0) c.combinedArms++;
      const a = known.get(e.attacker);
      const t = known.get(e.target);
      if (!a || !t) continue;
      const sa = statsOf(s, a);
      if (e.purpose === 'fire' && sa.arm === 'artillery') {
        const r = distance(a.hex, t.hex);
        if (r >= 1 && r <= 5) c.gunShotsByRange[r - 1]++;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// ai-balance results and their report

/** One game of ai-balance, as written to the JSON file. `timing` is the only machine-dependent field. */
export interface GameRow {
  sc: string; aSide: Side; seed: number; winner: string; banners: [number, number]; turns: number; reason: string;
  a: Difficulty; b: Difficulty;
  rejects: number; fallbacks: number;
  /** The `sims` of every AI decision summed (AiMemory.last.sims: simulated turns, not nodes, for a card decision; rollout nodes for a battle one). */
  sims: number;
  /** The budget nodes charged by every AI decision, summed (AiMemory.last.nodes: plan building, move scoring, simulations, rollouts). */
  nodes?: number;
  timing: { A: { avg: number; max: number }; B: { avg: number; max: number } };
  c: Counters;
}

const pct = (x: number) => `${Math.round(100 * x)} %`;
const avgOf = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);

/** The markdown report of a set of games: a table per battle, then the counter totals. Banners are bottom-top. */
export function balanceReport(all0: GameRow[], flagAt = 0.85): string {
  const out: string[] = [];
  const seen = new Set<string>();
  const rows = all0.filter((r) => {
    const k = `${r.sc}/${r.aSide}/${r.seed}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const dup = all0.length - rows.length;
  if (dup) out.push(`WARNING: ${dup} duplicate row${dup === 1 ? '' : 's'} (same battle, side and seed in more than one file) dropped.\n`);
  const by = new Map<string, GameRow[]>();
  for (const r of rows) by.set(r.sc, [...(by.get(r.sc) ?? []), r]);
  out.push('| Battle | Games | Bottom wins | Top wins | Bottom win rate (95 % Wilson) | Banners (bottom-top, avg) | Turns (avg, max) | Sims (avg) | Flag |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  let flagged = 0;
  const all = zeroCounters();
  for (const sc of SCENARIOS) {
    const rs = by.get(sc.id);
    if (!rs) continue;
    const n = rs.length;
    const bw = rs.filter((r) => r.winner === 'bottom').length;
    const tw = rs.filter((r) => r.winner === 'top').length;
    const share = Math.max(bw, tw) / n;
    const flag = share >= flagAt ? `${bw > tw ? 'bottom' : 'top'} ${pct(share)}` : '';
    if (flag) flagged++;
    for (const r of rs) addCounters(all, r.c);
    const [lo, hi] = wilson(bw, n);
    out.push(`| ${sc.id} ${sc.name} | ${n} | ${bw} (${sc.setup.bottom.army}) | ${tw} (${sc.setup.top.army}) | ${pct(bw / n)} [${pct(lo)}, ${pct(hi)}] | ` +
      `${avgOf(rs.map((r) => r.banners[0])).toFixed(1)}-${avgOf(rs.map((r) => r.banners[1])).toFixed(1)} | ` +
      `${Math.round(avgOf(rs.map((r) => r.turns)))}, ${Math.max(...rs.map((r) => r.turns))} | ${Math.round(avgOf(rs.map((r) => r.sims)))} | ${flag} |`);
  }
  const aWins = rows.filter((r) => r.winner === r.aSide).length;
  const bWins = rows.filter((r) => r.winner !== 'none' && r.winner !== 'draw' && r.winner !== r.aSide).length;
  const [aLo, aHi] = wilson(aWins, rows.length);
  const levels = [...new Set(rows.map((r) => `${r.a}/${r.b}`))].join(', ');
  const aName = rows[0]?.a ?? '?';
  const ms = rows.flatMap((r) => [r.timing.A.avg, r.timing.B.avg]);
  const mx = rows.flatMap((r) => [r.timing.A.max, r.timing.B.max]);
  out.push('');
  out.push(`Games ${rows.length}; flagged battles ${flagged}; levels A/B ${levels}; A (${aName}) won ${aWins} of ${rows.length} (${pct(aWins / Math.max(1, rows.length))}, 95 % Wilson [${pct(aLo)}, ${pct(aHi)}]), B won ${bWins}; ` +
    `rejects ${rows.reduce((n, r) => n + r.rejects, 0)}, fallbacks ${rows.reduce((n, r) => n + r.fallbacks, 0)}; ` +
    `card decision avg ${avgOf(ms).toFixed(0)} ms, max ${Math.max(0, ...mx).toFixed(0)} ms`);
  const fmt = (k: keyof Counters) => (k === 'gunShotsByRange' ? `${k} ${all.gunShotsByRange.join('/')}`
    : k === 'wornAttacks' ? `wornAttacks ${all.wornAttacks} of ${all.infantryMelees} infantry melees (${pct(all.wornAttacks / Math.max(1, all.infantryMelees))})`
      : `${k} ${all[k] as number}`);
  out.push(`Counters: ${(Object.keys(all) as (keyof Counters)[]).map(fmt).join(', ')}`);
  return out.join('\n');
}
