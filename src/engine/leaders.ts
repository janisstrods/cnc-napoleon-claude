// Leaders in combat (RR §11): the casualty check, a leader whose unit is lost, and melee against a lone leader.
import { ask, type Gen } from './decisions';
import { emitRoll, killLeader } from './casualties';
import { escapeDice, flagRerollApplies, meleeDice, rerollFlags, sabreKills } from './dice';
import { onBaseline } from './hex';
import { attachedLeader, unitAt } from './query';
import { leaderRetreatOptions } from './retreat';
import { rollDice } from './rng';
import { statsOf } from './units';
import type { FlowCtx, GameState, Leader, MeleeCtx, Unit } from './types';

/**
 * The casualty check after a unit lost blocks or was eliminated (RR §11.1, R18). The opponent rolls 2 dice when the unit
 * survives (2 sabres kill the leader) and 1 when it was eliminated (a sabre kills him). Returns true when he is killed.
 */
export function* leaderCasualtyCheck(s: GameState, ctx: FlowCtx, u: Unit, eliminated: boolean): Gen<boolean> {
  const leader = attachedLeader(s, u);
  if (!leader) return false;
  const faces = rollDice(s, eliminated ? 1 : 2);
  emitRoll(ctx, 'leaderCheck', faces, faces.map((f) => f === 'sabre'), null, leader.id);
  const sabres = faces.filter((f) => f === 'sabre').length;
  if (eliminated ? sabres >= 1 : sabres >= 2) {
    killLeader(s, ctx, leader, 'casualty check');
    return true;
  }
  ctx.emit({ t: 'leaderSafe', id: leader.id });
  return false;
}

/** A leader leaves the map by his own baseline: no banner for the enemy (R25, R65). */
function leaveMap(s: GameState, ctx: FlowCtx, l: Leader): void {
  s.leaders = s.leaders.filter((x) => x.id !== l.id);
  delete s.turn.ordered[l.id];
  ctx.emit({ t: 'leaderLeft', id: l.id });
}

/**
 * A leader left alone on a hex (his unit was lost, or he was beaten in melee) retreats (RR §11.2–§11.4). From his own
 * baseline he leaves the map. Otherwise the owner picks a path (always asked, even with one option); each enemy unit hex
 * on it is an escape roll (R24), a third eliminates him, impassable terrain that stops him even 1 hex eliminates him.
 */
export function* leaderLosesUnit(s: GameState, ctx: FlowCtx, l: Leader): Gen {
  if (onBaseline(l.hex, l.side)) {
    leaveMap(s, ctx, l);
    return;
  }
  const options = leaderRetreatOptions(s, l);
  const a = yield* ask(s, ctx, { kind: 'leaderRetreat', side: l.side, leader: l.id, options });
  const pick = options[(a as { index: number }).index];
  const from = l.hex;
  const seen = (i: number) => [from, ...pick.path.slice(0, i + 1)];
  for (let i = 0; i < pick.path.length; i++) {
    const enemy = unitAt(s, pick.path[i]);
    if (!enemy || enemy.side === l.side || !pick.escapes.includes(enemy.id)) continue;
    const faces = rollDice(s, escapeDice(s, enemy));
    emitRoll(ctx, 'escape', faces, faces.map((f) => f === 'sabre'), enemy.id, l.id);
    if (sabreKills(faces)) {
      l.hex = enemy.hex;
      ctx.emit({ t: 'leaderRetreat', id: l.id, path: seen(i), offBoard: false });
      killLeader(s, ctx, l, 'escape failed');
      return;
    }
  }
  if (pick.eliminated) {
    if (pick.path.length) {
      l.hex = pick.end;
      ctx.emit({ t: 'leaderRetreat', id: l.id, path: [from, ...pick.path], offBoard: false });
    }
    killLeader(s, ctx, l, 'no way out');
    return;
  }
  if (pick.offBoard) {
    l.hex = pick.end;
    ctx.emit({ t: 'leaderRetreat', id: l.id, path: [from, ...pick.path], offBoard: true });
    leaveMap(s, ctx, l);
    return;
  }
  l.hex = pick.end;
  ctx.emit({ t: 'leaderRetreat', id: l.id, path: [from, ...pick.path], offBoard: false });
  if (pick.attach) ctx.emit({ t: 'attach', leader: l.id, unit: pick.attach });
}

/**
 * Melee against a lone leader (RR §11.4, R21): the attacker rolls its melee dice for the hex (terrain and cards apply);
 * a sabre kills him, otherwise flags do nothing and he retreats. No battle back. Returns true: he always leaves the hex.
 */
export function* loneLeaderMelee(s: GameState, ctx: FlowCtx, attacker: Unit, l: Leader, m: MeleeCtx): Gen<boolean> {
  const purpose = m.role === 'bonus' ? 'bonus' : 'melee';
  const dice = meleeDice(s, attacker, l, { role: m.role, moved: m.declaredMoved, declared: true });
  // Defensive: battleTargets never offers a 0-die attack, so the driver cannot reach this; RR §3.2, R15: nothing to roll, he stays.
  if (dice === 0) return false;
  ctx.emit({ t: 'combat', purpose, attacker: attacker.id, target: l.id, dice });
  const faces = rollDice(s, dice);
  emitRoll(ctx, purpose, faces, faces.map((f) => f === 'sabre'), attacker.id, l.id);
  let killed = sabreKills(faces);
  if (flagRerollApplies(s, attacker, l, m.role)) {  // S12: a lancer's flags are re-rolled against a lone leader too; a re-rolled sabre kills
    const again = rerollFlags(s, ctx, purpose, faces, 'leader', statsOf(s, attacker), 'infantry', { by: attacker.id, against: l.id });
    if (again) killed ||= sabreKills(again.faces);
  }
  if (killed) killLeader(s, ctx, l, 'melee');
  else if (!s.winner) yield* leaderLosesUnit(s, ctx, l);
  return true;
}

