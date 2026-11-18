// Plan 4 Task 3: every engine event has its own wording in the log; the banner track lists the battle's objectives.
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, cardKind, type GameEvent, type GameState } from '../../src/engine';
import { eventLog, rollSummary } from '../../src/ui/game/logText';
import { createGame } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { objectiveSummary, objectiveTipLines } from '../../src/ui/game/objectiveText';
import { build, H, leaderId } from '../rules/helpers';

const s: GameState = build({
  units: [
    { side: 'bottom', key: 'BR/LN', at: [6, 6] },
    { side: 'top', key: 'FR/LN', at: [2, 6] },
    { side: 'top', key: 'FR/LC', at: [2, 7] },
  ],
  leaders: [{ side: 'bottom', at: [6, 6], name: 'Wellesley' }],
});
const HUMAN = 'bottom' as const;
const BR_LN = 'u1', FR_LN = 'u2', FR_LC = 'u3';
const path = (n: number) => Array.from({ length: n }, (_, i) => H(2, 6 + i));
const lead = leaderId(s, 0);

const SAMPLES: Record<GameEvent['t'], GameEvent> = {
  turnStart: { t: 'turnStart', side: 'top', turn: 3 },
  cardPlayed: { t: 'cardPlayed', side: 'top', card: 0, kind: 'firstStrike', effective: null },
  ordered: { t: 'ordered', side: 'top', ids: [FR_LN, FR_LC] },
  move: { t: 'move', id: FR_LN, path: path(3) },
  combat: { t: 'combat', purpose: 'melee', attacker: FR_LN, target: BR_LN, dice: 3 },
  roll: { t: 'roll', purpose: 'fire', faces: ['infantry', 'flag'], scoring: [true, false], by: FR_LN, against: BR_LN },
  damage: { t: 'damage', id: BR_LN, amount: 1, left: 3, reason: 'melee' },
  eliminated: { t: 'eliminated', id: BR_LN },
  removed: { t: 'removed', id: BR_LN, reason: 'left by the exit' },
  leaderKilled: { t: 'leaderKilled', id: lead },
  leaderSafe: { t: 'leaderSafe', id: lead },
  leaderLeft: { t: 'leaderLeft', id: lead },
  flags: { t: 'flags', id: BR_LN, flags: 2, ignored: 1, bounce: false },
  retreat: { t: 'retreat', id: FR_LN, path: path(3) },
  retire: { t: 'retire', id: FR_LC, path: path(3) },
  leaderRetreat: { t: 'leaderRetreat', id: lead, path: path(2), offBoard: false },
  attach: { t: 'attach', leader: lead, unit: BR_LN },
  advance: { t: 'advance', id: FR_LN, path: path(2) },
  squareFormed: { t: 'squareFormed', id: BR_LN, slot: 2 },
  squareLeft: { t: 'squareLeft', id: BR_LN, slot: 2 },
  cardReturned: { t: 'cardReturned', side: 'bottom', slot: 1 },
  rallied: { t: 'rallied', id: BR_LN, blocks: 1 },
  shortSupply: { t: 'shortSupply', id: FR_LN, hex: H(3, 6) },
  banner: { t: 'banner', side: 'top', total: 1, reason: 'unit eliminated' },
  held: { t: 'held', side: 'bottom', held: 2, total: 3, reason: 'the ridge' },
  draw: { t: 'draw', side: 'bottom' },
  scoutDrew: { t: 'scoutDrew', side: 'top' },
  discarded: { t: 'discarded', side: 'top', card: 0 },
  reshuffle: { t: 'reshuffle' },
  log: { t: 'log', text: 'Something happened.' },
  victory: { t: 'victory', winner: 'bottom', reason: 'six banners' },
  guerrilla: { t: 'guerrilla', side: 'bottom', what: 'cancelled', held: 0, pool: 6 },
  moveFirst: { t: 'moveFirst', picks: { top: 0, bottom: null }, values: { top: 1, bottom: 99 }, first: 'top' },
};
const KILL = 'Each enemy unit or leader eliminated: 1 banner';
const line = (e: GameEvent, human: 'top' | 'bottom' = HUMAN) => eventLog(e, s, s, human);

describe('log wording', () => {
  it('every event kind has its own wording, never the raw kind', () => {
    for (const e of Object.values(SAMPLES)) {
      const l = line(e);
      expect(l, e.t).not.toBeNull();
      expect(l!.text, e.t).not.toBe(e.t);
      expect(l!.text.length, e.t).toBeGreaterThan(8);
    }
  });

  it('a square forms with its counter and names no card', () => {
    const l = line({ t: 'squareFormed', id: BR_LN, slot: 2 })!;
    expect(l.text).toBe('British Line Infantry forms square (counter 2).');
    for (const def of Object.values(CARD_DEFS)) expect(l.text).not.toContain(def.title);
  });

  it('a card back from the square track', () => {
    expect(line({ t: 'cardReturned', side: 'bottom', slot: 1 })!.text).toBe('A card returns to the British hand from the square track.');
  });

  it('First Strike played by the defender', () => {
    expect(line({ t: 'cardPlayed', side: 'top', card: 0, kind: 'firstStrike', effective: null })!.text).toBe(`${s.players.top.commander} plays First Strike.`);
  });

  it('Retire and Reform', () => {
    expect(line({ t: 'retire', id: FR_LC, path: path(3) })!.text).toBe('French Light Cavalry retires and reforms 2 hexes.');
  });

  it("the opponent's moves and orders are logged, the human's are not", () => {
    expect(line({ t: 'move', id: FR_LN, path: path(3) })!.text).toBe('French Line Infantry moves 2 hexes.');
    expect(line({ t: 'move', id: BR_LN, path: path(3) })).toBeNull();
    expect(line({ t: 'ordered', side: 'top', ids: ['u2', 'u3', 'u2'] })!.text).toBe(`${s.players.top.commander} orders 3 units.`);
    expect(line({ t: 'ordered', side: 'top', ids: [] })!.text).toBe('No units could be ordered.');
    expect(line({ t: 'ordered', side: 'bottom', ids: ['u1'] })).toBeNull();
    expect(line({ t: 'retreat', id: FR_LN, path: path(1) })).toBeNull();
  });

  it('roll summaries name what scores', () => {
    expect(rollSummary('retireReform', ['cavalry', 'sabre'], [true, false])).toBe('1 hit (cavalry symbols only)');
    expect(rollSummary('elan', ['infantry', 'infantry', 'flag', 'sabre'], [false, false, false, false])).toBe('2 infantry, 1 flag, 1 sabre');
  });

  it('a killWeight objective is listed for its side', () => {
    const k = build({ units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }], objectives: [{ kind: 'killWeight', side: 'bottom', enemyArm: 'infantry', first: 1, later: 2 }] });
    expect(objectiveSummary(k, 'bottom')).toEqual(['First French infantry unit eliminated: 1 banner; each later one: 2', 'Each other enemy unit or leader eliminated: 1 banner']);
    expect(objectiveSummary(k, 'top')).toEqual([KILL]);
  });

  it('a roll that no combat line announced names itself; an attack roll gets the short arrow', () => {
    const roll = (purpose: 'elan' | 'rally' | 'leaderCheck' | 'escape' | 'fire', by: string | null, against: string | null): GameEvent => ({
      t: 'roll', purpose, faces: ['sabre', 'flag'], scoring: [true, false], by, against,
    });
    expect(line(roll('elan', null, null))!.text).toBe('Élan: 1 flag, 1 sabre.');
    expect(line(roll('rally', null, null))!.text).toBe('Rally: 1 flag, 1 sabre.');
    expect(line(roll('leaderCheck', null, lead))!.text).toBe('Wellesley — leader casualty check: 1 sabre rolled.');
    expect(line(roll('escape', FR_LC, lead))!.text).toBe('Wellesley tries to escape: the leader is hit.');
    expect(line(roll('fire', FR_LN, BR_LN))!.text).toMatch(/^→ /);
  });

  it("001's two identical hill objectives are one line, without a stray full stop", () => {
    const g = createGame(scenarioById('001').setup, 1);
    const sum = objectiveSummary(g, 'top');
    expect(sum).toEqual([
      'Anglo-Portuguese hold a hill on the French baseline (2 hexes): 1 banner each while held at the start of their turn',
      KILL,
    ]);
    for (const o of g.scenario.objectives) if (o.kind === 'tempHex') for (const l of objectiveTipLines(g, o.hex)) expect(l).not.toContain('.:');
  });

  it("the Scout's discard is named for both sides (it is face up)", () => {
    for (const side of ['top', 'bottom'] as const) {
      expect(eventLog({ t: 'discarded', side, card: 0 }, s, s, HUMAN)!.text).toContain(CARD_DEFS[cardKind(0)].title);
    }
  });

  it("the engine's raw casualty notes are dropped", () => {
    expect(line({ t: 'log', text: 'u5 is eliminated (melee).' })).toBeNull();
  });
});

describe('Retire and Reform combat line', () => {
  it('says the defender retires, not the attacker', () => {
    const l = eventLog({ t: 'combat', purpose: 'retireReform', attacker: FR_LN, target: BR_LN, dice: 1 }, s, s, HUMAN);
    expect(l!.text).toMatch(/; the defender retires and reforms\.$/);
    expect(l!.text).not.toMatch(/retires and reforms against/);
  });
});
