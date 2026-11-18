// Play review: print a game turn by turn with an ASCII board: the card, orders, moves, battles, the general's `say` lines and the
// top evaluation terms at each card decision. Works for every battle, the Spanish 101-118 included.
// Usage: npx vite-node scripts/ai-review.ts -- --scenario 007 [--level 1] [--opp 1|random] [--turns 10] [--seed 1] [--side bottom|top|both]
//        [--scale 1] [--deterministic]
//   --level: the reviewed general (captain, colonel, marshal or 0, 1, 2). --side: which side it plays (default bottom); the other side
//   is the opponent, a general at level --opp (default: the same level) or uniformly random answers. `both`: the general plays both sides.
//   Board cells read `<b|t><unit code><blocks>` (bottom or top side); `*` marks an attached leader, a lone leader shows as `<b|t>*Nam`.
import { CARD_DEFS, CARD_LIST, GameDriver, codeOf, createGame, hexLabel, randomAnswer, type GameEvent, type GameState, type Side } from '../src/engine';
import { scenarioById } from '../src/scenarios';
import { personalityFor, type AiOptions } from '../src/ai';
import { evalTerms } from '../src/ai/evaluate';
import { weightsFor } from '../src/ai/values';
import { arg, flag, lcg, levelArg, parseLevel, playAiGame } from './lib';

const scId = arg('scenario', '007');
const level = levelArg('level', 'colonel');
const oppText = arg('opp', level);
const randomOpp = oppText === 'random';
const oppLevel = randomOpp ? level : parseLevel(oppText);
const maxTurns = Number(arg('turns', '12'));
const seed = Number(arg('seed', '1'));
const scale = Number(arg('scale', '1'));
const deterministic = flag('deterministic');
const aiSide = arg('side', 'bottom') as Side | 'both';
if (aiSide !== 'both' && aiSide !== 'top' && aiSide !== 'bottom') throw new Error(`--side must be top, bottom or both, not ${aiSide}`);
const info = scenarioById(scId);
const d = new GameDriver(createGame(info.setup, seed));

const TER: Record<string, string> = {
  plain: '.', hill: 'h', forest: 'f', rugged: 'r', town: 'T', windmill: 'w', fortress: 'F', river: '~', ford: 'd', fordNoStop: 'd', brook: 'k',
  bridge: '=', sandQuarry: 'q', walledFarm: 'W', void: ' ',
};

function board(s: GameState): string {
  const lines: string[] = [];
  for (let r = 0; r < 9; r++) {
    let line = r % 2 ? '   ' : '';
    for (let c = 0; c < (r % 2 ? 12 : 13); c++) {
      const h = r * 13 + c;
      const u = s.units.find((x) => x.hex === h);
      const l = s.leaders.find((x) => x.hex === h);
      let cell: string;
      if (u) cell = `${u.side === 'top' ? 't' : 'b'}${codeOf(u.key)}${u.blocks}${u.square ? 'Q' : l ? '*' : ''}`;
      else if (l) cell = `${l.side === 'top' ? 't' : 'b'}*${l.name.slice(0, 3)}`;
      else cell = TER[s.terrain[h]] ?? '?';
      line += cell.padEnd(6);
    }
    lines.push(`${r} ${line}`);
  }
  return lines.join('\n');
}

const name = (s: GameState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (u) return `${u.side[0]}${codeOf(u.key)}(${u.id}@${hexLabel(u.hex)},${u.blocks})`;
  const l = s.leaders.find((x) => x.id === id);
  if (l) return `${l.side[0]}*${l.name || l.id}@${l.hex >= 0 ? hexLabel(l.hex) : 'off'}`;
  return id;
};
const path = (p: number[]) => p.map((h) => (h >= 0 ? hexLabel(h) : 'OFF')).join('>');

function describe(e: GameEvent, s: GameState): string | null {
  switch (e.t) {
    case 'cardPlayed': return `  CARD ${CARD_DEFS[e.kind].title}${e.effective && e.effective !== e.kind ? ` -> ${CARD_DEFS[e.effective].title}` : ''}`;
    case 'ordered': return `  ORDERED ${e.ids.map((id) => name(s, id)).join(' ')}`;
    case 'move': return `  move ${name(s, e.id)} ${path(e.path)}`;
    case 'combat': return `  ${e.purpose.toUpperCase()} ${name(s, e.attacker)} -> ${name(s, e.target)} (${e.dice} dice${e.artillery?.length ? `, guns ${e.artillery.map((g) => `${g.id}:${g.dice}`).join(' ')}` : ''})`;
    case 'roll': return `     roll [${e.faces.map((f, i) => (e.scoring[i] ? f.toUpperCase() : f)).join(' ')}]`;
    case 'damage': return `     ${e.id} -${e.amount} (${e.left} left) ${e.reason}`;
    case 'eliminated': return `     ${e.id} ELIMINATED`;
    case 'removed': return `     ${e.id} REMOVED (${e.reason}, no banner)`;
    case 'leaderKilled': return `     leader ${e.id} KILLED`;
    case 'flags': return `     ${e.id} flags ${e.flags} ignored ${e.ignored}${e.bounce ? ' (bounce)' : ''}`;
    case 'retreat': return `     ${e.id} retreats ${path(e.path)}`;
    case 'retire': return `     ${e.id} retires and reforms ${path(e.path)}`;
    case 'leaderRetreat': return `     leader ${e.id} retreats ${path(e.path)}`;
    case 'advance': return `     ${e.id} advances ${path(e.path)}`;
    case 'squareFormed': return `     ${e.id} FORMS SQUARE (slot ${e.slot})`;
    case 'squareLeft': return `     ${e.id} leaves square`;
    case 'banner': return `  BANNER ${e.side} -> ${e.total} (${e.reason})`;
    case 'rallied': return `     ${e.id} rallied +${e.blocks}`;
    case 'log': return `  · ${e.text}`;
    case 'victory': return `  VICTORY ${e.winner}: ${e.reason}`;
    default: return null;
  }
}

const mk = (side: Side, lv: AiOptions['difficulty']): AiOptions => ({
  side, difficulty: lv, personality: personalityFor(info.setup[side].commander, info.setup[side].army, info.setup[side].nation),
  seed: seed * 11 + (side === 'top' ? 1 : 2), budgetScale: scale, deterministic,
});
const opts: Record<Side, AiOptions> = { top: mk('top', aiSide === 'bottom' ? oppLevel : level), bottom: mk('bottom', aiSide === 'top' ? oppLevel : level) };
const reviewed = (side: Side) => aiSide === 'both' || aiSide === side;
const rnd = lcg(seed);
console.log(`${info.id} ${info.name}: top=${info.setup.top.army} (${opts.top.personality.name}) bottom=${info.setup.bottom.army} (${opts.bottom.personality.name}); ` +
  `reviewing ${aiSide} at ${level}, opponent ${randomOpp ? 'random' : oppLevel}${deterministic ? ', deterministic' : ''}`);
console.log(board(d.state));
let lastTurn = 0;
let before = d.state;
playAiGame(d, opts, {
  maxTurn: maxTurns,
  before: (dec) => {
    const s = d.state;
    if (dec.kind === 'playCard' && s.turn.number !== lastTurn) {
      lastTurn = s.turn.number;
      console.log(board(s));
      console.log(`\n=== Turn ${s.turn.number}: ${s.players[dec.side].army} (${dec.side}) banners ${s.players.bottom.banners}b-${s.players.top.banners}t; hand: ${s.players[dec.side].hand.map((c) => CARD_LIST[c]).join(', ')}`);
    }
    if (dec.kind === 'playCard' && reviewed(dec.side)) {
      const terms = Object.entries(evalTerms(s, dec.side, weightsFor(opts[dec.side].personality))).filter(([, v]) => Number.isFinite(v) && v !== 0)
        .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 6);
      console.log(`  eval terms (${dec.side}): ${terms.map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
    }
  },
  answer: (dec) => (!randomOpp || reviewed(dec.side) ? undefined : randomAnswer(d.state, dec, rnd)),
  chosen: (dec, ans, ai) => {
    if (ai) {
      if (dec.kind === 'playCard') {
        const m = ai.mem.last;
        console.log(`  think ${m?.ms.toFixed(0)}ms nodes=${m?.sims} chosen: ${m?.plan}`);
      }
      if (['defend', 'ignoreFlags', 'advance', 'bonusMelee', 'breakthroughExtra', 'leaderRetreat', 'combinedArms', 'battle'].includes(dec.kind)) {
        console.log(`  [${dec.side} ${dec.kind}] -> ${JSON.stringify(ans)}`);
      }
      if (ai.say) console.log(`  SAY (${dec.side}) ${ai.say}`);
    }
    before = d.state;
  },
  rejected: (dec) => console.log(`REJECTED ${dec.kind}: ${d.lastError}`),
  fallback: rnd,
  after: (_, events) => {
    for (const e of events) {
      const t = describe(e, before);
      if (t) console.log(t);
    }
  },
});
console.log(board(d.state));
console.log(`\nResult: winner=${d.state.winner} ${d.state.winReason} banners b${d.state.players.bottom.banners}-t${d.state.players.top.banners}`);
