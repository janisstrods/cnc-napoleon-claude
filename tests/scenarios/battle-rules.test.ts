// Rules: RR §13.3–§13.4, §14.1–§14.15 (design/rules-reference.md)
// The base battles' objectives and side rules in their real setups: the meta's hexes and sides are wired to the right battle.
// The rules themselves are tested by Plan 2B T13. The fortress flag-ignore (006) and the impetuous breakthrough (015) are
// predicate checks here; their behaviour is applied by Plan 2B T6a (retreat flag ignores) and T7 (forced breakthrough).
import { describe, expect, it } from 'vitest';
import { exitAllowedFrom, exitPiece, scoreKill, turnStartObjectives, updateHeld } from '../../src/engine/objectives';
import { bannerTotal } from '../../src/engine/banners';
import { unitAt } from '../../src/engine/query';
import { impetuous, sideRuleFlagIgnores } from '../../src/engine/scenarioRules';
import { passableFor } from '../../src/engine/terrain';
import { statsOf } from '../../src/engine/units';
import type { GameState, HexId, Side, Unit } from '../../src/engine/types';
import { game, H } from './helpers';

const ctx = { emit: () => {} };

const placed = new WeakMap<GameState, Set<string>>();

/** Remove any unit on `hex`, then move the first unit of `side` (file order, not one already placed by this helper) whose arm may stand there onto it. */
function placeOn(s: GameState, side: Side, hex: HexId): Unit {
  s.units = s.units.filter((u) => u.hex !== hex);
  const done = placed.get(s) ?? new Set<string>();
  placed.set(s, done);
  const u = s.units.find((x) => x.side === side && !done.has(x.id) && passableFor(s, hex, statsOf(s, x).arm));
  if (!u) throw new Error(`no ${side} unit may stand on ${hex}`);
  done.add(u.id);
  u.hex = hex;
  return u;
}

const byKey = (s: GameState, side: Side, key: string): Unit => {
  const u = s.units.find((x) => x.side === side && x.key === key);
  if (!u) throw new Error(`no ${side} ${key}`);
  return u;
};

describe('base battles: objectives and side rules in their real setups', () => {
  it('001: the baseline hills give top a banner each at top’s turn start; a lone leader holds nothing', () => {
    const s = game('001');
    placeOn(s, 'top', H(8, 2));
    turnStartObjectives(s, ctx, 'top');
    expect(bannerTotal(s, 'top')).toBe(1);
    placeOn(s, 'top', H(8, 11));
    turnStartObjectives(s, ctx, 'top');
    expect(bannerTotal(s, 'top')).toBe(2);

    const t = game('001');
    t.units = t.units.filter((u) => u.hex !== H(8, 2));
    const lead = t.leaders.find((l) => l.side === 'top')!;
    lead.hex = H(8, 2);
    turnStartObjectives(t, ctx, 'top');
    expect(bannerTotal(t, 'top')).toBe(0);

    const b = game('001');
    placeOn(b, 'top', H(8, 2));
    turnStartObjectives(b, ctx, 'bottom');
    expect(bannerTotal(b, 'bottom')).toBe(0);
    expect(bannerTotal(b, 'top')).toBe(0);
  });

  it('003: French on both Vimiero hexes → 2; one emptied → 0 at once', () => {
    const s = game('003');
    placeOn(s, 'bottom', H(1, 3));
    const second = placeOn(s, 'bottom', H(1, 4));
    turnStartObjectives(s, ctx, 'bottom');
    expect(bannerTotal(s, 'bottom')).toBe(2);
    s.units = s.units.filter((u) => u !== second);
    updateHeld(s, ctx);
    expect(bannerTotal(s, 'bottom')).toBe(0);
  });

  it('006: the bridge exit is the top side’s; the fortress flag-ignore is the top side’s', () => {
    const s = game('006');
    const top = s.units.find((u) => u.side === 'top')!;
    const bottom = s.units.find((u) => u.side === 'bottom')!;
    expect(exitAllowedFrom(s, top, H(0, 4))).toBe(true);
    expect(exitAllowedFrom(s, top, H(0, 5))).toBe(false);
    expect(exitAllowedFrom(s, bottom, H(0, 4))).toBe(false);

    const fort = unitAt(s, H(0, 11));
    expect(fort?.side).toBe('top');
    expect(fort?.key).toBe('BR/FA');
    expect(sideRuleFlagIgnores(s, fort!)).toBe(1);

    const t = game('006');
    const french = placeOn(t, 'bottom', H(0, 12));
    expect(sideRuleFlagIgnores(t, french)).toBe(0);
    const britOnWindmill = placeOn(t, 'top', H(4, 10));
    expect(sideRuleFlagIgnores(t, britOnWindmill)).toBe(0);

    const u = game('006');
    expect(sideRuleFlagIgnores(u, placeOn(u, 'top', H(0, 12)))).toBe(1);
    expect(sideRuleFlagIgnores(u, placeOn(u, 'bottom', H(0, 11)))).toBe(0);

    // the exit scores: a unit 1 banner, a lone leader none (leadersScore false)
    const e = game('006');
    const unit = placeOn(e, 'top', H(0, 4));
    exitPiece(e, ctx, unit.id);
    expect(bannerTotal(e, 'top')).toBe(1);
    const lead = e.leaders.find((l) => l.side === 'top' && !e.units.some((x) => x.hex === l.hex))!;
    lead.hex = H(0, 4);
    exitPiece(e, ctx, lead.id);
    expect(bannerTotal(e, 'top')).toBe(1);
  });

  it('012: first French infantry kill 1, the next 2; French cavalry 1', () => {
    const s = game('012');
    scoreKill(s, ctx, byKey(s, 'bottom', 'FR/LN'));
    expect(bannerTotal(s, 'top')).toBe(1);
    scoreKill(s, ctx, byKey(s, 'bottom', 'FR/LT'));
    expect(bannerTotal(s, 'top')).toBe(3);
    scoreKill(s, ctx, byKey(s, 'bottom', 'FR/HC'));
    expect(bannerTotal(s, 'top')).toBe(4);
    scoreKill(s, ctx, byKey(s, 'top', 'BR/LC'));
    expect(bannerTotal(s, 'bottom')).toBe(1);
  });

  it('013: Nauzeilles (7,0) and the Seminary (8,11) for top', () => {
    const s = game('013');
    placeOn(s, 'top', H(7, 0));
    turnStartObjectives(s, ctx, 'top');
    expect(bannerTotal(s, 'top')).toBe(1);
    placeOn(s, 'top', H(8, 11));
    turnStartObjectives(s, ctx, 'top');
    expect(bannerTotal(s, 'top')).toBe(2);
    const t = game('013');
    placeOn(t, 'bottom', H(7, 0));
    placeOn(t, 'bottom', H(8, 11));
    turnStartObjectives(t, ctx, 'bottom');
    expect(bannerTotal(t, 'bottom')).toBe(0);
  });

  it('014: Quatre Bras (1,5) for bottom', () => {
    const s = game('014');
    placeOn(s, 'bottom', H(1, 5));
    turnStartObjectives(s, ctx, 'bottom');
    expect(bannerTotal(s, 'bottom')).toBe(1);
    const t = game('014');
    placeOn(t, 'top', H(1, 5));
    turnStartObjectives(t, ctx, 'top');
    expect(bannerTotal(t, 'top')).toBe(0);
  });

  it('015: the three farms for bottom; only British red-block cavalry is impetuous', () => {
    const s = game('015');
    for (const h of [H(3, 5), H(4, 1), H(4, 12)]) placeOn(s, 'bottom', h);
    turnStartObjectives(s, ctx, 'bottom');
    expect(bannerTotal(s, 'bottom')).toBe(3);

    const g = game('015');
    // R82 / RR §14.15: British red-block cavalry (BR/LC, BR/HC, BR/GHC) is impetuous; AL/LC is not.
    const cav = g.units.filter((u) => u.side === 'top' && ['BR/LC', 'BR/HC', 'BR/GHC'].includes(u.key));
    expect(cav.length).toBeGreaterThan(0);
    for (const u of cav) expect(impetuous(g, u)).toBe(true);
    // the rule data itself, and a top unit retagged BR/LC (015 starts with none)
    expect(g.scenario.sideRules).toContainEqual({ kind: 'impetuousCavalry', side: 'top', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] });
    const lc = { ...cav[0], key: 'BR/LC' as const };
    expect(impetuous(g, lc)).toBe(true);
    expect(impetuous(g, { ...lc, side: 'bottom' })).toBe(false);
    for (const u of g.units.filter((x) => x.side === 'top' && x.key === 'AL/LC')) expect(impetuous(g, u)).toBe(false);
    for (const u of g.units.filter((x) => x.side === 'bottom')) expect(impetuous(g, u)).toBe(false);
  });
});
