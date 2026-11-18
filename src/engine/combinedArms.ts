// Combined Arms (RR §9.6): ordered artillery joining a melee, declared before the defender's reaction and before any dice.
import { ask, type Gen } from './decisions';
import { meleeDice } from './dice';
import { combinedArmsCandidates, gunDice } from './options';
import { unitById } from './query';
import type { FlowCtx, GameState, MeleeCtx } from './types';

/** Ask which candidate guns join this melee; each chosen gun has made its one battle at once (R4, [Interp R40]). */
export function* combinedArmsStep(s: GameState, ctx: FlowCtx, m: MeleeCtx): Gen<string[]> {
  const attacker = unitById(s, m.attacker);
  const target = unitById(s, m.target);
  if (!attacker || !target || attacker.side !== s.active) return [];
  const options = combinedArmsCandidates(s, attacker, target, m.role);
  if (options.length === 0) return [];
  // R15: the melee unit's own dice plus the guns' must come to at least 1, so a unit with none must bring a gun
  const required = meleeDice(s, attacker, target, { role: m.role, moved: s.turn.ordered[attacker.id]?.moved ?? 0, declared: true }) < 1;
  const a = yield* ask(s, ctx, { kind: 'combinedArms', side: attacker.side, unit: attacker.id, target: m.targetHex, options, required });
  const ids = options.filter((id) => (a as { ids: string[] }).ids.includes(id));
  for (const id of ids) s.turn.ordered[id].battled = true;
  return ids;
}

/** The dice each joining gun rolls now; the melee unit rolls its own. */
export function artilleryShares(s: GameState, m: MeleeCtx): { id: string; dice: number }[] {
  const target = unitById(s, m.target);
  if (!target) return [];
  const out: { id: string; dice: number }[] = [];
  for (const id of m.artillery) {
    const g = unitById(s, id);
    if (g && g.hex >= 0) out.push({ id, dice: gunDice(s, g, target, m.role) });
  }
  return out;
}
