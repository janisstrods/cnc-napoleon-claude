// Rules: RR §14, §14.5, §14.6, §14.12, §14.14, §14.15 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import {
  TERRAIN_STATS, attachedLeader, impetuous, lineOfSight, scoreLeaderKill, sideRuleFlagIgnores, statsOf,
  type FlowCtx, type GameEvent,
} from '../../src/engine';
import { H, build } from './helpers';

describe('side rules and battle data', () => {
  it('rivers per battle become terrain rows (§14 table, R47, R83)', () => {
    const t = (rivers: 'impassable' | 'fordable' | 'fordableNoStop' | 'brook') =>
      build({ rivers, terrain: [{ at: [4, 4], t: 'river' }, { at: [4, 5], t: 'river', crossing: 'ford' }, { at: [4, 6], t: 'river', crossing: 'bridge' }] }).terrain;
    const row = (x: ReturnType<typeof t>) => [x[H(4, 4)], x[H(4, 5)], x[H(4, 6)]];
    expect(row(t('impassable'))).toEqual(['river', 'ford', 'bridge']);
    expect(row(t('fordable'))).toEqual(['ford', 'fordNoStop', 'bridge']);
    expect(row(t('fordableNoStop'))).toEqual(['fordNoStop', 'fordNoStop', 'bridge']);
    expect(row(t('brook'))).toEqual(['brook', 'brook', 'bridge']);
  });

  it('005 brook: stops, no reductions, squares allowed, sight open (§14.5, R83)', () => {
    const b = TERRAIN_STATS.brook;
    expect(b.stopsOnEntry).toBe(true);
    expect(b.into.fire).toEqual({ infantry: 0, cavalry: 0, artillery: 0 });
    expect(b.into.melee).toEqual({ infantry: 0, cavalry: 0, artillery: 0 });
    expect(b.out.melee).toEqual({ infantry: 0, cavalry: 0, artillery: 0 });
    expect(b.squareAllowed).toBe(true);
    const s = build({ rivers: 'brook', terrain: [{ at: [4, 6], t: 'river' }] });
    expect(lineOfSight(s, H(2, 6), H(6, 6))).toBe(true);
  });

  it('006 fortress: a unit of the named side ignores 1 flag there; the other side nothing (§14.6, R84)', () => {
    const s = build({
      sideRules: [{ kind: 'flagIgnoreOn', side: 'top', terrain: 'fortress', flags: 1 }],
      terrain: [{ at: [2, 2], t: 'fortress' }, { at: [2, 4], t: 'fortress' }, { at: [2, 6], t: 'town' }],
      units: [{ side: 'top', key: 'FR/LN', at: [2, 2] }, { side: 'bottom', key: 'BR/LN', at: [2, 4] }, { side: 'top', key: 'FR/LN', at: [2, 6] }],
    });
    expect(sideRuleFlagIgnores(s, s.units[0])).toBe(1);
    expect(sideRuleFlagIgnores(s, s.units[1])).toBe(0);
    expect(sideRuleFlagIgnores(s, s.units[2])).toBe(0);
  });

  it('012 squares at setup: 2 random French cards on the track, 4 in hand (§14.12, R85)', () => {
    const s = build({
      bottomCards: 6,
      units: [{ side: 'bottom', key: 'FR/LT', at: [6, 4], square: 1 }, { side: 'bottom', key: 'FR/LT', at: [6, 8], square: 2 }, { side: 'top', key: 'FR/LN', at: [1, 6] }],
    });
    expect(s.players.bottom.hand).toHaveLength(4);
    expect(s.players.bottom.squareTrack.filter((c) => c !== null)).toHaveLength(2);
    expect(s.units[0].square).toBe(1);
    expect(s.units[1].square).toBe(2);
  });

  it('014–015 Allied line retreats 2 per flag; Allied units are ordinary units of their side (§14.14, R10)', () => {
    const s = build({
      units: [{ side: 'bottom', key: 'AL/LN', at: [6, 4] }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [1, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6] }],
    });
    expect(statsOf(s, s.units[0]).retreat).toEqual({ first: 2, then: 2 });
    expect(s.units[0].side).toBe(s.units[1].side);
    expect(attachedLeader(s, s.units[1])?.side).toBe('bottom');
  });

  it('015 impetuous cavalry: BR/LC, BR/HC, BR/GHC of the named side, not AL/LC (§14.15, R82)', () => {
    const s = build({
      sideRules: [{ kind: 'impetuousCavalry', side: 'bottom', keys: ['BR/LC', 'BR/HC', 'BR/GHC'] }],
      units: [
        { side: 'bottom', key: 'BR/HC', at: [6, 2] }, { side: 'bottom', key: 'AL/LC', at: [6, 4] }, { side: 'top', key: 'BR/HC', at: [2, 6] },
        { side: 'bottom', key: 'BR/LN', at: [6, 6] },
      ],
    });
    expect(impetuous(s, s.units[0])).toBe(true);
    expect(impetuous(s, s.units[1])).toBe(false);
    expect(impetuous(s, s.units[2])).toBe(false);
    expect(impetuous(s, s.units[3])).toBe(false);
  });

  it('every battle scores the ordinary banners too (§14)', () => {
    const s = build({
      objectives: [{ kind: 'killWeight', side: 'bottom', enemyArm: 'infantry', first: 3, later: 3 }],
      units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [1, 6] }],
      leaders: [{ side: 'top', at: [1, 6] }],
    });
    const es: GameEvent[] = [];
    const ctx: FlowCtx = { emit: (e) => es.push(e) };
    scoreLeaderKill(s, ctx, s.leaders[0]);
    expect(s.players.bottom.banners).toBe(1);
  });
});
