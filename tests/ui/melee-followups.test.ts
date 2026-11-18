// Plan 4 Task 5: flags, retreats, take ground, breakthrough and bonus melee on the board.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CARD_DEFS, cardKind, eligiblePieces, hexLabel, meleeDice, neighbours, stopsOnEntry, terrainAt, retreatOptions, leaderRetreatOptions, type Decision, type GameState, type HexId, type LeaderRetreatOption,
} from '../../src/engine';
import { GameController, newSessionConfig, type ViewState } from '../../src/ui/game/controller';
import { DECISION_TITLES, decisionTitle, promptSpec } from '../../src/ui/game/promptSpec';
import { gamePrompt } from '../../src/ui/game/prompts';
import { boardMarks, bonusBadges, leaderRetreatChoices, retreatChoices, type UiSel } from '../../src/ui/game/uiModel';
import { H, build, leaderId, play, type Pos } from '../rules/helpers';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, assign: null };
const text = (b: JSX.Element[]) => b.map((x) => renderToStaticMarkup(x).replace(/<[^>]+>/g, ''));
const ctx = (d: Decision, human: 'top' | 'bottom', st: GameState) => {
  const noop = () => {};
  const view = { pending: d, over: null, fatal: false, generalThinking: false, undo: null, display: st } as unknown as ViewState;
  return { controller: {} as GameController, view, s: st, human, ai: human === 'top' ? 'bottom' as const : 'top' as const, ui: SEL, setUi: noop, answer: noop, onExit: noop };
};

describe('decision titles', () => {
  it('titles: take ground, break through, Retire and Reform, bonus melee', () => {
    const adv = (how: 'takeGround' | 'breakthrough'): Decision => ({ kind: 'advance', side: 'bottom', unit: 'u1', hex: 5, how });
    expect(decisionTitle(adv('takeGround'))).toBe('Take ground?');
    expect(decisionTitle(adv('breakthrough'))).toBe('Break through?');
    const ret = (reason: 'retreat' | 'retireReform'): Decision => ({ kind: 'retreat', side: 'bottom', unit: 'u1', options: [], reason });
    expect(decisionTitle(ret('retireReform'))).toBe('Retire and Reform');
    expect(decisionTitle(ret('retreat'))).toBe('Retreat');
    const def = (bonus: boolean): Decision => ({ kind: 'defend', side: 'bottom', attacker: 'u1', target: 'u2', options: ['stand'], bonus });
    expect(decisionTitle(def(true))).toBe('Under attack! (bonus melee)');
    expect(decisionTitle(def(false))).toBe('Under attack!');
    // every other kind, and the spec, use the table
    const others: Decision[] = [
      { kind: 'playCard', side: 'bottom' }, { kind: 'move', side: 'bottom' }, { kind: 'ignoreFlags', side: 'bottom', unit: 'u1', flags: 1, max: 0 },
      { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [], required: true }, { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets: [] },
    ];
    for (const d of others) expect(decisionTitle(d)).toBe(DECISION_TITLES[d.kind]);
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }] });
    for (const d of [adv('takeGround'), ret('retireReform'), def(true), ...others]) expect(promptSpec(s, d).title).toBe(decisionTitle(d));
  });
});

describe('flags', () => {
  const flagText = (key: 'BR/LN' | 'FR/LN' | 'AL/LN', square = false) => {
    const s = build({ units: [{ side: 'bottom', key, at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }] });
    if (square) s.units[0].square = 1;
    return promptSpec(s, { kind: 'ignoreFlags', side: 'bottom', unit: 'u1', flags: 2, max: 1 }).text;
  };

  it('the flag prompt says what a flag not ignored costs', () => {
    expect(flagText('BR/LN')).toContain('Each flag not ignored moves it back 1 hex;');
    expect(flagText('FR/LN')).toContain('moves it back 1 hex');
    expect(flagText('AL/LN')).toContain('moves it back 2 hexes');
    expect(flagText('BR/LN')).toContain('a hex it cannot take costs a block.');
    expect(flagText('BR/LN', true)).toContain('costs a block per hex');
    expect(flagText('BR/LN', true)).not.toContain('moves it back');
  });

  it('the flag chooser has the table title and the count in the text', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }] });
    const d: Decision = { kind: 'ignoreFlags', side: 'bottom', unit: 'u1', flags: 2, max: 1 };
    const p = gamePrompt(ctx(d, 'bottom', s))!;
    expect(p.title).toBe('Flags');
    expect(p.text).toContain('2 flags');
    expect(text(p.buttons).at(-1)).toBe('Let the general decide');
  });
});

describe('take ground, breakthrough, bonus melee', () => {
  const pos = (side: 'top' | 'bottom'): Pos => {
    const at: [number, number] = side === 'bottom' ? [6, 5] : [2, 6];
    return { units: [{ side, key: 'BR/HC', at, blocks: 3 }, { side: side === 'top' ? 'bottom' : 'top', key: 'FR/LN', at: [4, 6] }] };
  };

  it('advance and breakthrough preview the path from the unit', () => {
    const s = build(pos('bottom'));
    const from = s.units[0].hex;
    const [h1, h2] = neighbours(from);
    const adv: Decision = { kind: 'advance', side: 'bottom', unit: 'u1', hex: h1, how: 'takeGround' };
    const m = boardMarks(s, adv, SEL, 'bottom');
    expect(m.pathAt(h1)).toEqual([from, h1]);
    expect(m.pathAt(null)).toBeNull();
    expect(m.highlights.get(h1)).toBe('move');
    const bt: Decision = { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [h1, h2], required: false };
    const mb = boardMarks(s, bt, SEL, 'bottom');
    expect(mb.pathAt(h1)).toEqual([from, h1]);
    expect(mb.pathAt(h2)).toEqual([from, h2]);
    expect(mb.highlights.get(h2)).toBe('move');
    expect(mb.pathAt(from)).toBeNull();
  });

  it('a flipped board previews the same path', () => {
    const s = build(pos('top'));
    const from = s.units[0].hex;
    const h = neighbours(from)[0];
    const adv: Decision = { kind: 'advance', side: 'top', unit: 'u1', hex: h, how: 'breakthrough' };
    expect(boardMarks(s, adv, SEL, 'top').pathAt(h)).toEqual([from, h]);
    expect(boardMarks(s, adv, SEL, 'bottom').pathAt(h)).toBeNull(); // not the human's decision
  });

  it('the texts say what each decision offers', () => {
    const s = build(pos('bottom'));
    const h = neighbours(s.units[0].hex)[0];
    const adv = (how: 'takeGround' | 'breakthrough'): Decision => ({ kind: 'advance', side: 'bottom', unit: 'u1', hex: h, how });
    expect(promptSpec(s, adv('takeGround')).text).toBe('British Heavy Cavalry may take ground in the hex its enemy left.');
    expect(promptSpec(s, adv('breakthrough')).text).toBe('British Heavy Cavalry may break through into the hex its enemy left, then move one more hex.');
    const bt: Decision = { kind: 'breakthroughExtra', side: 'bottom', unit: 'u1', options: [h], required: false };
    expect(promptSpec(s, bt).text).toBe('British Heavy Cavalry breaks through: click a hex to move on, or stay.');
    expect(promptSpec(s, { ...bt, required: true } as Decision).text).toContain('click a hex to move on.');
  });

  it('a breakthrough that cannot go on says so: a hex that stops entry, or after a bonus melee', () => {
    const s = build({ ...pos('bottom'), terrain: [{ at: [5, 5], t: 'town' }] });
    const from = s.units[0].hex;
    const town = neighbours(from).find((h) => terrainAt(s, h) === 'town');
    const plain = neighbours(from).find((h) => !stopsOnEntry(s, from, h))!;
    expect(town).toBeDefined();
    const adv = (hex: number): Decision => ({ kind: 'advance', side: 'bottom', unit: 'u1', hex, how: 'breakthrough' });
    expect(promptSpec(s, adv(town!)).text).toBe('British Heavy Cavalry may break through into the hex its enemy left; it stops there.');
    expect(promptSpec(s, adv(plain)).text).toContain('then move one more hex');
    s.turn.ordered.u1 = { ...(s.turn.ordered.u1 as object), id: 'u1', bonusMeleeDone: true } as never;
    expect(promptSpec(s, adv(plain)).text).toBe('British Heavy Cavalry may take ground in the hex its enemy left (no further move after a bonus melee).');
    expect(promptSpec(s, adv(plain)).title).toBe('Take ground?');
    expect(decisionTitle(adv(plain), s)).toBe('Take ground?');
    expect(decisionTitle(adv(plain))).toBe('Break through?');
  });

  it('bonus melee targets carry their dice', () => {
    const s = build({ units: [
      { side: 'bottom', key: 'BR/HC', at: [4, 6], blocks: 3 },
      { side: 'top', key: 'FR/LN', at: [3, 6] }, { side: 'top', key: 'FR/LN', at: [4, 7] },
    ] });
    const from = s.units[0].hex;
    const targets = neighbours(from).filter((h) => s.units.some((u) => u.side === 'top' && u.hex === h));
    expect(targets).toHaveLength(2);
    const d = { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets } as Extract<Decision, { kind: 'bonusMelee' }>;
    const badges = bonusBadges(s, d);
    expect([...badges.keys()].sort()).toEqual([...targets].sort());
    for (const h of targets) {
      const foe = s.units.find((u) => u.hex === h)!;
      const n = meleeDice(s, s.units[0], foe, { role: 'bonus', moved: 0, declared: true });
      expect(n).toBeGreaterThanOrEqual(3);
      expect(badges.get(h)).toBe(`${n} dice`);
    }
    const m = boardMarks(s, d, SEL, 'bottom');
    for (const h of targets) {
      expect(m.badges.get(h)).toBe(badges.get(h));
      expect(m.highlights.get(h)).toBe('targetClose');
    }
  });
});

describe('the move prompt', () => {
  const move = (withLeader: boolean) => {
    const pos: Pos = {
      first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [8, 5] }],
      leaders: withLeader ? [{ side: 'top', at: [2, 6] }] : [],
    };
    const s0 = build(pos);
    const d = play(s0, 'probeC', withLeader ? ['u1', leaderId(s0, 0)] : ['u1']);
    expect(d.pending).toMatchObject({ kind: 'move', side: 'top' });
    return gamePrompt(ctx(d.pending!, 'top', d.state))!.text;
  };

  it('explains detaching when an ordered unit has a leader', () => {
    expect(move(true)).toContain('To detach a leader, move him before his unit.');
    expect(move(false)).not.toContain('To detach a leader');
  });

  it('says nothing about detaching when the leader himself is not ordered', () => {
    const pos: Pos = {
      first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 6] }, { side: 'bottom', key: 'BR/LN', at: [8, 5] }],
      leaders: [{ side: 'top', at: [2, 6] }],
    };
    const d = play(build(pos), 'probeC', ['u1']);
    expect(d.state.turn.ordered[leaderId(d.state, 0)]).toBeUndefined();
    expect(gamePrompt(ctx(d.pending!, 'top', d.state))!.text).not.toContain('To detach a leader');
  });
});

describe('retreats', () => {
  it('a unit retreat offers one button per end hex, named by its hex', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [5, 6] }] });
    const opts = retreatOptions(s, s.units[0], 1);
    expect(opts.length).toBeGreaterThan(1);
    const d: Decision = { kind: 'retreat', side: 'bottom', unit: 'u1', options: opts, reason: 'retreat' };
    const ch = retreatChoices(s, d);
    expect(ch.map((c) => c.end)).toEqual([...new Set(opts.map((o) => o.end))]);
    expect(ch.every((c) => c.label.includes(hexLabel(c.end)))).toBe(true);
    expect(opts[ch[1].index].end).toBe(ch[1].end);
    const p = gamePrompt(ctx(d, 'bottom', s))!;
    expect(text(p.buttons).filter((b) => b.includes(hexLabel(ch[0].end)))).toHaveLength(1);
    expect(p.title).toBe('Retreat');
    expect(gamePrompt(ctx({ ...d, reason: 'retireReform' }, 'bottom', s))!.title).toBe('Retire and Reform');
  });

  // a lone leader hemmed by two enemy units: some end hexes need an escape roll
  const lone = () => {
    const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [7, 7] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
    return { s, l: leaderId(s, 0) };
  };

  it('a leader retreat: one choice per end hex, the safest first, escapes marked', () => {
    const { s, l } = lone();
    const lead = s.leaders.find((x) => x.id === l)!;
    const opts = leaderRetreatOptions(s, lead);
    const d: Decision = { kind: 'leaderRetreat', side: 'bottom', leader: l, options: opts };
    const ch = leaderRetreatChoices(s, d);
    const hexChoices = ch.filter((c) => c.kind === 'hex');
    expect(new Set(hexChoices.map((c) => c.end)).size).toBe(hexChoices.length);
    for (const c of hexChoices) {
      const same = opts.filter((o) => !o.offBoard && !o.eliminated && o.end === c.end);
      expect(c.escapes).toBe(Math.min(...same.map((o) => o.escapes.length)));
      expect(opts[c.index]).toBe(same.find((o) => o.escapes.length === c.escapes));
    }
    const m = boardMarks(s, d, SEL, 'bottom');
    for (const c of hexChoices) {
      if (c.escapes > 0) expect(m.badges.get(c.end), hexLabel(c.end)).toMatch(/^Escape/);
      else expect(m.badges.has(c.end)).toBe(false);
    }
    expect(hexChoices.length).toBeGreaterThan(0);
    const p = gamePrompt(ctx(d, 'bottom', s))!;
    expect(text(p.buttons).filter((b) => b.includes('Let the general decide'))).toHaveLength(1);
    expect(p.buttons.length).toBeLessThanOrEqual(ch.length + 1);
  });

  it('a leader retreat with escapes shows the risk on its button and the path on hover', () => {
    const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [6, 6] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
    const l = leaderId(s, 0);
    const mk = (path: HexId[], escapes: string[], end = path[path.length - 1]): LeaderRetreatOption => ({ path, end, offBoard: false, escapes, attach: null, eliminated: false });
    const risky = mk([H(6, 6), H(7, 6)], ['u1']);
    const safe = mk([H(6, 5)], []);
    const d: Decision = { kind: 'leaderRetreat', side: 'bottom', leader: l, options: [safe, risky, { ...mk([H(6, 6), H(7, 6)], ['u1', 'u1']), end: H(7, 6) }] };
    const ch = leaderRetreatChoices(s, d);
    expect(ch.map((c) => [c.end, c.escapes])).toEqual([[H(6, 5), 0], [H(7, 6), 1]]);
    expect(ch[1].label).toMatch(/escape/i);
    expect(ch[0].label).not.toMatch(/escape/i);
    const m = boardMarks(s, d, SEL, 'bottom');
    expect(m.badges.get(H(7, 6))).toBe('Escape ×1');
    expect(m.pathAt(H(7, 6))).toEqual([s.leaders[0].hex, H(6, 6), H(7, 6)]);
  });
});

describe('undo at the Scout keep', () => {
  useFakeClock();
  it('the controller offers no undo at scoutKeep, and still does at the orders', async () => {
    const c = new GameController({ ...newSessionConfig('000', 'bottom', 'recruit'), seed: 3 }, new SeededOpponent());
    try {
      await runToHuman(c);
      const s = c.driver.state;
      const card = s.players.bottom.hand.find((x) => CARD_DEFS[cardKind(x)].group === 'section' && eligiblePieces(s, 'bottom', cardKind(x)).length > 0)!;
      c.answer({ kind: 'playCard', card });
      await runToHuman(c);
      const undoable = (d: Decision | null) => (c as unknown as { undoable(d: Decision | null): string | null }).undoable(d);
      const here = c.view.pending!;
      expect(here.side).toBe('bottom');
      expect(undoable(here)).toBe('card');
      const hand = c.driver.state.players.bottom.hand;
      expect(undoable({ kind: 'scoutKeep', side: 'bottom', cards: [hand[0], hand[1]] })).toBeNull();
    } finally {
      c.dispose();
    }
  });
});

describe('leader retreat buttons', () => {
  const base = () => build({ units: [{ side: 'top', key: 'FR/LN', at: [6, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 5] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
  const opt = (path: HexId[], o: Partial<LeaderRetreatOption> = {}): LeaderRetreatOption =>
    ({ path, end: path[path.length - 1], offBoard: false, escapes: [], attach: null, eliminated: false, ...o });

  it('safe choices are emphasised, risky ones plain; one off-board and one fall button', () => {
    const s = base();
    const l = leaderId(s, 0);
    const d: Decision = { kind: 'leaderRetreat', side: 'bottom', leader: l, options: [
      opt([H(6, 4)]), opt([H(7, 6), H(8, 6)], { escapes: ['u1'] }),
      opt([H(8, 0)], { offBoard: true, escapes: ['u1', 'u1'] }), opt([H(8, 1)], { offBoard: true, escapes: ['u1'] }),
      opt([], { eliminated: true, end: s.leaders[0].hex }), opt([], { eliminated: true, end: s.leaders[0].hex }),
    ] };
    const ch = leaderRetreatChoices(s, d);
    expect(ch.filter((c) => c.kind === 'off')).toHaveLength(1);
    expect(ch.find((c) => c.kind === 'off')!.escapes).toBe(1);
    expect(ch.filter((c) => c.kind === 'dead')).toHaveLength(1);
    expect(ch.find((c) => c.kind === 'dead')!.label).toBe('He cannot escape');
    const html = gamePrompt(ctx(d, 'bottom', s))!.buttons.map((b) => renderToStaticMarkup(b));
    const variant = (frag: string) => html.find((h) => h.includes(frag))!;
    expect(variant(hexLabel(H(6, 4)))).toContain('kit-btn--secondary');
    expect(variant('escape past 1')).toContain('kit-btn--ghost');
    expect(variant('Leave the battlefield')).toContain('kit-btn--ghost');
    expect(variant('cannot escape')).toContain('kit-btn--ghost');
    expect(gamePrompt(ctx(d, 'bottom', s))!.text).toContain('amber');
    const offOnly: Decision = { ...d, options: [opt([H(6, 4)]), d.options[3]] };
    expect(gamePrompt(ctx(offOnly, 'bottom', s))!.text).toContain('leaving the battlefield');
    expect(gamePrompt(ctx({ ...d, options: [opt([H(6, 4)])] }, 'bottom', s))!.text).not.toContain('amber');
  });

  it('above the cap only meaningful choices get buttons', () => {
    const s = base();
    const l = leaderId(s, 0);
    const plain = [H(6, 0), H(6, 1), H(6, 2), H(6, 3), H(6, 4), H(7, 0), H(7, 1)].map((h) => opt([h]));
    const d: Decision = { kind: 'leaderRetreat', side: 'bottom', leader: l, options: [...plain, opt([H(7, 2)], { attach: 'u2' }), opt([H(7, 3), H(8, 3)], { escapes: ['u1'] })] };
    const p = gamePrompt(ctx(d, 'bottom', s))!;
    const labels = text(p.buttons);
    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain('join');
    expect(labels[1]).toContain('escape');
    expect(labels[2]).toBe('Let the general decide');
  });
});

describe('bonus melee dice for guns only', () => {
  it('a target no melee die reaches says "0 dice + guns"', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/FA', at: [4, 6] }, { side: 'top', key: 'FR/LN', at: [3, 6] }] });
    s.turn.ordered.u1 = { ...(s.turn.ordered.u1 as object), id: 'u1', moved: 1 } as never;
    expect(meleeDice(s, s.units[0], s.units[1], { role: 'bonus', moved: 1, declared: true })).toBe(0);
    const d = { kind: 'bonusMelee', side: 'bottom', unit: 'u1', targets: [H(3, 6)] } as Extract<Decision, { kind: 'bonusMelee' }>;
    expect(bonusBadges(s, d).get(H(3, 6))).toBe('0 dice + guns');
  });
});

describe('the leader retreat sentence', () => {
  const s = build({ units: [{ side: 'top', key: 'FR/LN', at: [6, 6] }, { side: 'bottom', key: 'BR/LN', at: [6, 5] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
  const l = leaderId(s, 0);
  const o = (path: HexId[], x: Partial<LeaderRetreatOption> = {}): LeaderRetreatOption =>
    ({ path, end: path[path.length - 1], offBoard: false, escapes: [], attach: null, eliminated: false, ...x });
  const say = (options: LeaderRetreatOption[]) => gamePrompt(ctx({ kind: 'leaderRetreat', side: 'bottom', leader: l, options }, 'bottom', s))!.text;

  it('names the amber hex only when a hex needs an escape, and leaving only when that has escapes', () => {
    const safeOff = o([H(8, 0)], { offBoard: true });
    const riskyOff = o([H(8, 0)], { offBoard: true, escapes: ['u1'] });
    const riskyHex = o([H(7, 6), H(8, 6)], { escapes: ['u1'] });
    const safeHex = o([H(6, 4)]);
    const hexOnly = say([safeHex, riskyHex, safeOff]);
    expect(hexOnly).toContain('amber hex');
    expect(hexOnly).not.toContain('leaving the battlefield');
    const offOnly = say([safeHex, riskyOff]);
    expect(offOnly).toContain('leaving the battlefield');
    expect(offOnly).not.toContain('amber');
    const both = say([safeHex, riskyHex, riskyOff]);
    expect(both).toContain('amber hex');
    expect(both).toContain('leaving the battlefield');
    expect(say([safeHex, safeOff])).not.toMatch(/amber|leaving/);
  });

  it('with no way out it says so, without the click hint', () => {
    const t = say([o([], { eliminated: true, end: s.leaders[0].hex })]);
    expect(t).toBe('Ldr0 has no way out.');
  });
});
