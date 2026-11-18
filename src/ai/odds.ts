// Per-die odds and joint (hits, flags) distributions, derived from the engine's own scoring (`scoreRoll` over the six
// faces of `DIE_SIDES`), so a change to the dice or the scoring rules reaches the AI without a second copy of them.
import { DIE_SIDES, sabreKills, scoreRoll, type Arm, type UnitStats } from '../engine';

/** Probabilities for one die: it hits, it shows a flag, it shows a sabre (the face; a sabre may or may not hit). */
export interface DieOdds {
  hit: number;
  flag: number;
  sabre: number;
}

/** Per-die odds of `by` rolling at a `target` arm: `scoreRoll([face], …)` over each of the six faces. */
export function dieOdds(kind: 'fire' | 'melee' | 'retireReform', by: UnitStats, target: Arm): DieOdds {
  let hit = 0;
  let flag = 0;
  let sabre = 0;
  for (const face of DIE_SIDES) {
    const r = scoreRoll([face], kind, by, target);
    hit += r.hits;
    flag += r.flags;
    if (sabreKills([face])) sabre++;
  }
  return { hit: hit / DIE_SIDES.length, flag: flag / DIE_SIDES.length, sabre: sabre / DIE_SIDES.length };
}

const cache = new Map<number | string, Float64Array>();

/** Die odds are whole numbers of faces out of six: `faces` is that count (0..6), or -1 for odds that are not. */
function faces(p: number): number {
  const f = Math.round(p * DIE_SIDES.length);
  return Math.abs(f / DIE_SIDES.length - p) < 1e-9 ? f : -1;
}

/**
 * P(hits = h, flags = f) of `n` dice at `h * (n + 1) + f` (each die: a hit, a flag, or neither). Shared and cached: do not
 * write to the result.
 */
export function rollDist(n: number, o: Pick<DieOdds, 'hit' | 'flag'>): Float64Array {
  // keyed on the dice count and the faces that hit and flag (a number: no string built per call), else on the odds themselves
  const fh = faces(o.hit);
  const ff = faces(o.flag);
  const key = fh >= 0 && ff >= 0 ? (n * 7 + fh) * 7 + ff : `${n}:${o.hit.toFixed(9)}:${o.flag.toFixed(9)}`;
  const known = cache.get(key);
  if (known) return known;
  const w = n + 1;
  const none = Math.max(0, 1 - o.hit - o.flag);
  let cur = new Float64Array(w * w);
  cur[0] = 1;
  for (let d = 0; d < n; d++) {
    const next = new Float64Array(w * w);
    for (let h = 0; h <= d; h++) {
      for (let f = 0; h + f <= d; f++) {
        const p = cur[h * w + f];
        if (p === 0) continue;
        next[(h + 1) * w + f] += p * o.hit;
        next[h * w + f + 1] += p * o.flag;
        next[h * w + f] += p * none;
      }
    }
    cur = next;
  }
  cache.set(key, cur);
  return cur;
}

/** P(at least one of `n` dice shows a sabre): what kills a lone leader (the engine's `sabreKills`). */
export function pAnySabre(n: number): number {
  if (n <= 0) return 0;
  const face = DIE_SIDES.filter((f) => sabreKills([f])).length / DIE_SIDES.length;
  return 1 - (1 - face) ** n;
}
