// Hidden information, end to end: chooseAnswer never reads the opponent's hand, the cards on its square track, the deck order or the game
// generator. For each decision of a corpus (every 7th decision of deterministic level-1 games of 000, 004 and 012, plus hand-built
// positions) a variant re-deals the opponent's hand, track cards and deck (same sizes, same slots) and changes `rng`; the answer
// (and the line spoken) must be the same. Budget: 15 s.
import { describe, expect, it } from 'vitest';
import {
  GameDriver, cloneState, createGame, forceDice, type Answer, type Decision, type DieFace, type GameState, type Side,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { chooseAnswer, newMemory, type AiOptions } from '../../src/ai';
import { Rng } from '../../src/ai/rand';
import { H, attack, build, must, n, play, toBattle, type Pos } from '../rules/helpers';
import { failOnAiErrors } from './no-ai-errors';
import { aiOptions } from './soak';

failOnAiErrors();

type Units = NonNullable<Pos['units']>;
const top = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'top' as const, key, at, ...extra });
const bot = (key: Units[number]['key'], at: [number, number], extra: object = {}) => ({ side: 'bottom' as const, key, at, ...extra });
const PAD = n('artillery', 40);

/** The state with the opponent of `me` re-dealt: its hand, filled track slots and the deck from the pool of those cards; `rng` changed. */
function redeal(s: GameState, me: Side, seed: number): GameState {
  const c = cloneState(s);
  const opp = c.players[me === 'top' ? 'bottom' : 'top'];
  const track = opp.squareTrack.filter((x): x is number => x !== null);
  const pool = [...opp.hand, ...c.deck, ...track];
  new Rng(seed).shuffle(pool);
  const k = opp.hand.length;
  opp.hand = pool.slice(0, k);
  let t = k;
  opp.squareTrack = opp.squareTrack.map((x) => (x === null ? null : pool[t++]));
  c.deck = pool.slice(t);
  c.rng = (c.rng ^ (0x9e3779b9 + seed)) >>> 0;
  c.rngCalls = c.rngCalls + seed;
  return c;
}

interface Case { label: string; state: GameState; decision: Decision; opts: AiOptions }

// ---------------------------------------------------------------------------------------------------------------------
// Hand-built positions of the kinds a game seldom reaches (the same builds as kinds.test.ts)
const o1 = (side: Side): AiOptions => aiOptions('001', side, { seed: 3, levels: { top: 1, bottom: 1 }, budgetScale: 0.05 });
function handBuilt(): Case[] {
  const out: Case[] = [];
  const add = (label: string, d: GameDriver): void => {
    forceDice([]);
    const dec = d.pending;
    if (!dec) throw new Error(`${label}: no decision`);
    out.push({ label: `hand-built ${label}`, state: d.state, decision: dec, opts: o1(dec.side) });
  };
  const win = (atk: 'BR/LN' | 'BR/HC', extra: Pos = {}): GameDriver => {
    const s = build({ ...extra, units: [bot(atk, [5, 6]), top('FR/LN', [4, 6], { blocks: 1 }), ...(extra.units ?? [])] });
    const d = toBattle(s, 'attackC', ['u1']);
    forceDice([...n('infantry', 4), ...PAD]);
    attack(d, 'u1', H(4, 6));
    return d;
  };
  const faces: DieFace[] = ['infantry', 'cavalry', 'artillery', 'flag', 'sabre'];
  forceDice(faces);
  add('elan', play(build({ units: [bot('BR/LN', [6, 6]), bot('BR/HC', [6, 2]), bot('BR/FA', [6, 10]), top('FR/LN', [3, 6])] }), 'elan'));
  forceDice(['infantry', 'cavalry', 'flag', 'sabre', 'infantry']);
  add('rally', play(build({ units: [bot('BR/LN', [6, 6], { blocks: 2 }), bot('BR/HC', [6, 2], { blocks: 2 }), top('FR/LN', [3, 6])] }), 'rally'));
  const sk = play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'scoutC', ['u1']);
  for (let i = 0; i < 40 && sk.pending && sk.pending.kind !== 'scoutKeep'; i++) {
    const p = sk.pending;
    if (p.kind === 'move') must(sk, { kind: 'endMove' });
    else if (p.kind === 'battle') must(sk, { kind: 'endBattle' });
    else if (p.kind === 'leaveSquare') must(sk, { kind: 'yesno', yes: false });
    else break;
  }
  add('scoutKeep', sk);
  add('shortSupplyTarget', play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'shortSupply'));
  const ssh = play(build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6])] }), 'shortSupply');
  must(ssh, { kind: 'choose', index: 0 });
  add('shortSupplyHex', ssh);
  const lr = toBattle(build({ leaders: [{ side: 'top', at: [4, 6] }], units: [bot('BR/LN', [5, 6])] }), 'attackC', ['u1']);
  forceDice(['flag', 'flag', ...PAD]);
  must(lr, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  add('leaderRetreat', lr);
  const bx = win('BR/HC');
  must(bx, { kind: 'yesno', yes: true });
  add('breakthroughExtra', bx);
  const ca = toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6]), bot('BR/FA', [5, 5])] }), 'assaultC', ['u1', 'u3']);
  must(ca, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  add('combinedArms', ca);
  const rt = toBattle(build({ units: [bot('BR/LN', [5, 6]), top('FR/LN', [4, 6])] }), 'attackC', ['u1']);
  forceDice(['flag', ...PAD]);
  must(rt, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  add('retreat', rt);
  const bm = win('BR/HC', { units: [top('FR/LN', [3, 6])] });
  must(bm, { kind: 'yesno', yes: true });
  must(bm, { kind: 'hex', hex: null });
  add('bonusMelee', bm);
  // an opponent with a hand, a filled track slot and cards to hide, on the move decisions of a square position
  const sq = build({ units: [bot('BR/LN', [6, 6]), top('FR/LN', [3, 6], { square: 1 })] });
  expect(sq.players.top.squareTrack.filter((x) => x !== null)).toHaveLength(1); // the setup dealt the square's card from the hand
  add('playCard with a hidden track card', new GameDriver(sq));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Every 7th decision of deterministic level-1 games
function sampled(id: string, seed: number, turns: number): Case[] {
  const out: Case[] = [];
  const d = new GameDriver(createGame(scenarioById(id).setup, seed));
  const mems = { top: newMemory(), bottom: newMemory() };
  let i = 0;
  while (!d.over && d.state.turn.number <= turns && i < 6000) {
    const dec = d.pending!;
    const o = aiOptions(id, dec.side, { seed, levels: { top: 1, bottom: 1 }, budgetScale: 0.05 });
    if (i % 7 === 0) out.push({ label: `${id} decision ${i} (${dec.kind})`, state: cloneState(d.state), decision: dec, opts: o });
    must(d, chooseAnswer(d.state, dec, o, mems[dec.side]).answer);
    d.drainEvents();
    i++;
  }
  return out;
}

const KINDS18: Decision['kind'][] = [
  'playCard', 'orders', 'leaveSquare', 'move', 'battle', 'combinedArms', 'defend', 'ignoreFlags', 'retreat', 'leaderRetreat', 'advance',
  'breakthroughExtra', 'bonusMelee', 'elan', 'rally', 'scoutKeep', 'shortSupplyTarget', 'shortSupplyHex',
];

describe('the AI never reads hidden information', () => {
  it('chooseAnswer answers the same on re-dealt hands, tracks, decks and generators, over every kind of decision', () => {
    const corpus: Case[] = [...handBuilt(), ...sampled('000', 41, 20), ...sampled('004', 42, 20), ...sampled('012', 43, 20)];
    const kinds = new Set(corpus.map((c) => c.decision.kind));
    expect(KINDS18.filter((k) => !kinds.has(k))).toEqual([]);
    expect(corpus.length).toBeGreaterThan(60);
    let compared = 0;
    for (const c of corpus) {
      const seed = 1 + (compared % 3);
      const v = redeal(c.state, c.decision.side, seed);
      const same = JSON.stringify(c.state.players) === JSON.stringify(v.players) && JSON.stringify(c.state.deck) === JSON.stringify(v.deck);
      const a: { answer: Answer; say?: string } = chooseAnswer(c.state, c.decision, c.opts, newMemory());
      const b = chooseAnswer(v, c.decision, c.opts, newMemory());
      expect(b, `${c.label}${same ? ' (the re-deal changed nothing)' : ''}`).toEqual(a);
      compared++;
    }
  });

  it('a followed plan is blind too: after a re-deal, both copies follow the plan through the turn with identical answers, lines, plans and generators', () => {
    let followed = 0;
    const starts: [string, number][] = [['000', 1], ['000', 2], ['000', 3], ['000', 4], ['004', 5], ['012', 6]];
    for (const [id, seed] of starts) {
      const base = createGame(scenarioById(id).setup, seed);
      const me = base.active;
      // the dice the engine rolls must be the same on both copies, so only the hidden cards are re-dealt
      const variant = redeal(base, me, seed + 10);
      variant.rng = base.rng;
      variant.rngCalls = base.rngCalls;
      const dA = new GameDriver(base);
      const dB = new GameDriver(variant);
      const memA = newMemory();
      const memB = newMemory();
      const o = aiOptions(id, me, { seed, levels: { top: 1, bottom: 1 }, budgetScale: 0.05 });
      for (let i = 0; i < 80 && dA.pending && dA.pending.side === me; i++) {
        const dec = dA.pending;
        expect(dB.pending, `${id} step ${i}`).toEqual(dec);
        const a = chooseAnswer(dA.state, dec, o, memA);
        const b = chooseAnswer(dB.state, dec, o, memB);
        expect(b, `${id} step ${i} (${dec.kind})`).toEqual(a);
        expect(memB.plan, `${id} plan at step ${i}`).toEqual(memA.plan);
        expect(memB.rngState).toBe(memA.rngState);
        if (memA.plan && dec.kind !== 'playCard' && memA.plan.next > 0) followed++;
        must(dA, a.answer);
        must(dB, b.answer);
      }
    }
    expect(followed, 'stored moves were followed on the copies').toBeGreaterThan(0);
  });
});
