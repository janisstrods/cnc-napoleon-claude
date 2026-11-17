// Rules: RR §13.1, §13.2, §13.3, §13.4 (design/rules-reference.md)
import { describe, expect, it } from 'vitest';
import { GameDriver, OFF_BOARD, bannerTotal, forceDice, pieceMoves, type GameEvent, type GameState } from '../../src/engine';
import type { ObjectiveSetup, UnitSetup } from '../../src/engine';
import { H, attack, build, endMoves, endTurn, ev, leaderId, miss, must, n, passTurn, play, toBattle, turn } from './helpers';

const heldEvents = (es: GameEvent[], side: 'top' | 'bottom') => es.filter((e) => e.t === 'held' && e.side === side);
const offers = (s: GameState, id: string) => pieceMoves(s, id).some((m) => m.hex === OFF_BOARD);

describe('victory and banners', () => {
  it('1 banner per enemy unit eliminated; the game ends the instant the target is reached (§13.1–§13.2, R64)', () => {
    const s = build({
      banners: 1,
      units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [0, 0] }],
    });
    const d = toBattle(s, 'attackC', ['u1']);
    ev(d);
    forceDice(n('infantry', 30));
    attack(d, 'u1', H(4, 6));
    expect(d.state.winner).toBe('bottom');
    expect(d.pending).toBeNull();
    const es = ev(d);
    expect(es[es.length - 1].t).toBe('victory');
  });

  it('victory can go to the non-active side during a battle back (§13.1)', () => {
    const s = build({
      banners: 1,
      units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 6] }],
    });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice([miss('BR/LN', 'FR/LN'), ...n('infantry', 30)]);
    attack(d, 'u1', H(4, 6));
    expect(d.state.winner).toBe('top');
    expect(d.pending).toBeNull();
  });

  it('one event is applied fully before the check ([Interp R64] / R64)', () => {
    const s = build({
      banners: 2, first: 'top',
      objectives: [{ kind: 'tempHex', side: 'top', hex: [4, 6] }],
      units: [{ side: 'bottom', key: 'BR/LN', at: [5, 6] }, { side: 'top', key: 'FR/LN', at: [4, 6], blocks: 1 }],
    });
    s.players.bottom.banners = 1;
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    turn(d, 'attackC', ['u1']);
    endMoves(d);
    forceDice(n('infantry', 30));
    attack(d, 'u1', H(4, 6));
    expect(d.state.winner).toBe('bottom');
    expect(bannerTotal(d.state, 'top')).toBe(0);
  });
});

describe('temporary objectives', () => {
  const tempHex: ObjectiveSetup = { kind: 'tempHex', side: 'top', hex: [2, 5] };
  const far = { side: 'bottom', key: 'BR/LN', at: [7, 6] } as const satisfies { side: UnitSetup['side']; key: UnitSetup['key']; at: number[] };

  it('tempHex: gained at the start of its own turn, not the opponent’s (§13.3, R66)', () => {
    const s = build({ objectives: [tempHex], units: [{ side: 'top', key: 'FR/LN', at: [2, 5] }, far], first: 'bottom' });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(0);
    ev(d);
    passTurn(d);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    const h = heldEvents(ev(d), 'top');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ t: 'held', total: 1 });
  });

  it('tempHex: lost the instant the unit leaves; not regained until a later own turn start; never accumulates', () => {
    const s = build({
      objectives: [tempHex], first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [2, 5] }, { side: 'top', key: 'FR/LN', at: [2, 6] }, far],
    });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(1);
    turn(d, 'attackC', ['u1', 'u2']);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 4) });
    expect(bannerTotal(d.state, 'top')).toBe(0);
    expect(heldEvents(ev(d), 'top').length).toBeGreaterThanOrEqual(1);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 5) });
    expect(bannerTotal(d.state, 'top')).toBe(0);
    endMoves(d);
    endTurn(d);
    passTurn(d);   // bottom
    expect(bannerTotal(d.state, 'top')).toBe(1);   // top's next turn start, u2 on (2,5)
    for (let i = 0; i < 3; i++) {
      passTurn(d);
      passTurn(d);
      expect(bannerTotal(d.state, 'top')).toBe(1);
    }
  });

  it('a turn-start banner that reaches the target wins before the card (§13.3)', () => {
    const s = build({ banners: 1, first: 'top', objectives: [tempHex], units: [{ side: 'top', key: 'FR/LN', at: [2, 5] }, far] });
    const d = new GameDriver(s);
    expect(d.state.winner).toBe('top');
    expect(d.pending).toBeNull();
  });

  it('a lone leader never holds an objective (R65)', () => {
    const s = build({
      objectives: [tempHex], first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [0, 0] }, far], leaders: [{ side: 'top', at: [2, 5] }],
    });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'top')).toBe(0);
  });

  it('tempGroup: every hex held → its banners; either hex empty → all lost (§13.4, 003)', () => {
    const s = build({
      objectives: [{ kind: 'tempGroup', side: 'bottom', hexes: [[6, 5], [6, 6]], banners: 2 }], first: 'bottom',
      units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'bottom', key: 'BR/LN', at: [6, 6] }, { side: 'top', key: 'FR/LN', at: [1, 6] }],
    });
    const d = new GameDriver(s);
    expect(bannerTotal(d.state, 'bottom')).toBe(2);
    turn(d, 'attackC', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(6, 4) });
    expect(bannerTotal(d.state, 'bottom')).toBe(0);
  });

  it('tempGroup: one hex held is nothing', () => {
    const s = build({
      objectives: [{ kind: 'tempGroup', side: 'bottom', hexes: [[6, 5], [6, 6]], banners: 2 }], first: 'bottom',
      units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LN', at: [1, 6] }],
    });
    expect(bannerTotal(new GameDriver(s).state, 'bottom')).toBe(0);
  });
});

describe('exit objective', () => {
  const exit: Extract<ObjectiveSetup, { kind: 'exit' }> = { kind: 'exit', side: 'top', hex: [0, 4] };
  const far = { side: 'bottom', key: 'BR/LN', at: [8, 8] } as const satisfies { side: UnitSetup['side']; key: UnitSetup['key']; at: number[] };

  it('exit: steps off from the hex as one hex of movement, 1 permanent banner, does not battle (§13.4, [Interp R67])', () => {
    const s = build({
      objectives: [exit], first: 'top',
      units: [
        { side: 'top', key: 'FR/LC', at: [2, 4] }, { side: 'top', key: 'FR/LN', at: [1, 5] },
        { side: 'bottom', key: 'BR/LN', at: [4, 4] }, far,
      ],
    });
    const d = play(s, 'attackC', ['u1', 'u2']);
    expect(offers(d.state, 'u1')).toBe(true);
    expect(offers(d.state, 'u2')).toBe(false);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
    const es = ev(d);
    expect(es.some((e) => e.t === 'removed' && e.id === 'u1' && e.reason === 'exit')).toBe(true);
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.units.find((x) => x.id === 'u1')).toBeUndefined();
    expect(es.some((e) => e.t === 'combat')).toBe(false);
  });

  it('exit: a unit reaching the hex cannot also step off; FA on the hex can; FA one hex away cannot', () => {
    const lnAt1 = build({ objectives: [exit], first: 'top', units: [{ side: 'top', key: 'FR/LN', at: [1, 4] }, far] });
    const d1 = play(lnAt1, 'attackC', ['u1']);
    expect(pieceMoves(d1.state, 'u1').some((m) => m.hex === H(0, 4))).toBe(true);
    expect(offers(d1.state, 'u1')).toBe(false);
    const faOn = build({ objectives: [exit], first: 'top', units: [{ side: 'top', key: 'FR/FA', at: [0, 4] }, far] });
    expect(offers(play(faOn, 'attackC', ['u1']).state, 'u1')).toBe(true);
    const faNear = build({ objectives: [exit], first: 'top', units: [{ side: 'top', key: 'FR/FA', at: [1, 4] }, far] });
    expect(offers(play(faNear, 'attackC', ['u1']).state, 'u1')).toBe(false);
  });

  it('exit: not after a move that stopped on the hex (forest)', () => {
    const s = build({
      objectives: [exit], first: 'top', terrain: [{ at: [0, 4], t: 'forest' }],
      units: [{ side: 'top', key: 'FR/LC', at: [2, 4] }, far],
    });
    expect(offers(play(s, 'attackC', ['u1']).state, 'u1')).toBe(false);
  });

  // needs T5: leaderMoves checks the exit only after entering a hex, never from the start hex (a lone leader standing on the exit)
  it.todo('exit: a lone leader standing on the exit hex may exit (needs T5 rebase)');

  it('exit: a lone leader reaching the hex may exit and scores nothing (leadersScore false)', () => {
    const s = build({
      objectives: [exit], first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [3, 8] }, far], leaders: [{ side: 'top', at: [1, 4] }],
    });
    const d = play(s, 'attackC', [leaderId(s, 0)]);
    expect(offers(d.state, leaderId(d.state, 0))).toBe(true);
    must(d, { kind: 'move', piece: leaderId(d.state, 0), to: OFF_BOARD });
    expect(d.state.players.top.banners).toBe(0);
    expect(d.state.leaders).toHaveLength(0);
  });

  it('exit: with leadersScore true a lone leader scores', () => {
    const s = build({
      objectives: [{ ...exit, leadersScore: true }], first: 'top',
      units: [{ side: 'top', key: 'FR/LN', at: [3, 8] }, far], leaders: [{ side: 'top', at: [1, 4] }],
    });
    const d = play(s, 'attackC', [leaderId(s, 0)]);
    must(d, { kind: 'move', piece: leaderId(d.state, 0), to: OFF_BOARD });
    expect(d.state.players.top.banners).toBe(1);
  });

  it('exit: a unit steps off with its attached leader; one banner (R67)', () => {
    const s = build({
      objectives: [exit], first: 'top',
      units: [{ side: 'top', key: 'FR/FA', at: [0, 4] }, far], leaders: [{ side: 'top', at: [0, 4] }],
    });
    const d = play(s, 'attackC', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.leaders).toHaveLength(0);
  });

  it('exit: retreats never carry a unit off; elimination on the hex gives only the ordinary banner (R67)', () => {
    const s = build({
      objectives: [exit], first: 'bottom',
      units: [{ side: 'bottom', key: 'BR/LN', at: [1, 4] }, { side: 'top', key: 'FR/LN', at: [0, 4], blocks: 2 }],
    });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice([...n('flag', 1), ...n(miss('BR/LN', 'FR/LN'), 30)]);
    attack(d, 'u1', H(0, 4));
    endTurn(d);
    const t = d.state.units.find((x) => x.id === 'u2')!;
    expect(t.hex).toBe(H(0, 4));
    expect(t.blocks).toBe(1);
    passTurn(d);
    turn(d, 'attackC', ['u1']);
    endMoves(d);
    forceDice(n('infantry', 30));
    attack(d, 'u1', H(0, 4));
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.state.players.top.banners).toBe(0);
  });
});

describe('kill weights', () => {
  it('killWeight: first enemy infantry 1, each later one 2; other arms 1 (§13.4, R65)', () => {
    const s = build({
      objectives: [{ kind: 'killWeight', side: 'bottom', enemyArm: 'infantry', first: 1, later: 2 }], first: 'bottom',
      units: [
        { side: 'bottom', key: 'BR/LN', at: [5, 5] }, { side: 'bottom', key: 'BR/LN', at: [5, 7] }, { side: 'bottom', key: 'BR/LN', at: [5, 3] },
        { side: 'bottom', key: 'BR/LN', at: [5, 11], blocks: 1 },
        { side: 'top', key: 'FR/LN', at: [4, 5], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 7], blocks: 1 },
        { side: 'top', key: 'FR/HC', at: [4, 3], blocks: 1 }, { side: 'top', key: 'FR/LN', at: [4, 11] },
      ],
    });
    const d = toBattle(s, 'attackC', ['u1', 'u2']);
    forceDice(n('infantry', 30));
    attack(d, 'u1', H(4, 5));
    if (d.pending?.kind === 'advance') must(d, { kind: 'yesno', yes: false });
    expect(d.state.players.bottom.banners).toBe(1);
    attack(d, 'u2', H(4, 7));
    expect(d.state.players.bottom.banners).toBe(3);
    endTurn(d);
    passTurn(d);   // top
    turn(d, 'attackL', ['u3']);
    endMoves(d);
    forceDice(n('cavalry', 30));
    attack(d, 'u3', H(4, 3));
    endTurn(d);
    expect(d.state.players.bottom.banners).toBe(4);
    forceDice(n('infantry', 30));
    // the top side scores 1 for each bottom unit killed
    expect(d.state.players.top.banners).toBe(0);
    turn(d, 'attackL', ['u8']);
    endMoves(d);
    attack(d, 'u8', H(5, 11));
    expect(d.state.players.top.banners).toBe(1);
  });
});
