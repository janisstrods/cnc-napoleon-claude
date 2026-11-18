// Battle objectives on the game screen (rules-reference §13): the banner track's counts, and the tooltip lines of an
// objective hex: what it scores, for whom, and its state now.
import { bannerTotal, other, type GameState, type HexId, type ObjectiveDef, type Side } from '../../engine';

/** A side's banners for the track: `total` (permanent + held, the number that wins) and `held` (of them, can be lost). */
export function bannerCounts(s: GameState, side: Side): { total: number; held: number } {
  const total = bannerTotal(s, side);
  return { total, held: Math.max(0, total - s.players[side].banners) };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** A scenario text without its closing full stop (it is followed by a colon). */
const bare = (text: string) => text.replace(/[.\s]+$/, '');
/** "a British", "an Allied" */
const aOrAn = (w: string) => `${/^[AEIOU]/i.test(w) ? 'an' : 'a'} ${w}`;

/** Tooltip lines of one objective for hex `h` (none when the hex plays no part in it). */
function objectiveLines(s: GameState, o: ObjectiveDef, i: number, h: HexId): string[] {
  const army = (side: Side) => s.players[side].army;
  const st = s.special.objState[i];
  switch (o.kind) {
    case 'tempHex':
      return o.hex === h ? [`${bare(o.text)}: ${aOrAn(army(o.side))} unit here at the start of its turn holds ${plural(o.banners, 'banner')}${st?.held ? ' (held now)' : ''}`] : [];
    case 'tempGroup':
      return o.hexes.includes(h) ? [`${bare(o.text)}: ${plural(o.banners, 'banner')} for the ${army(o.side)} army while it holds these hexes${st?.held ? ' (held now)' : ''}`] : [];
    case 'exit':
      return o.hex === h ? [`${bare(o.text)}: ${aOrAn(army(o.side))} unit here may leave the battlefield — ${plural(o.banners, 'banner')}`] : [];
    case 'killWeight':
      return [];
  }
}

/** Tooltip lines of the battle objectives on hex `h`: what the hex scores, for whom, and its state now. */
export function objectiveTipLines(s: GameState, h: HexId): string[] {
  return s.scenario.objectives.flatMap((o, i) => objectiveLines(s, o, i, h));
}

/**
 * What each of `side`'s battle objectives scores, one line each (the banner track's tooltip): identical objectives are
 * merged, and the last line is the rule every battle has.
 */
export function objectiveSummary(s: GameState, side: Side): string[] {
  const lines: string[] = [];
  const merged = new Map<string, number[]>();
  s.scenario.objectives.forEach((o, i) => {
    if (o.side !== side) return;
    switch (o.kind) {
      case 'tempHex': {
        const key = `${bare(o.text)}|${o.banners}`;
        const at = merged.get(key);
        if (at) at.push(i);
        else {
          merged.set(key, [i]);
          lines.push(key);
        }
        break;
      }
      case 'tempGroup':
        lines.push(`${bare(o.text)}: ${plural(o.banners, 'banner')} while held at the start of its turn${s.special.objState[i]?.held ? ' (held now)' : ''}`);
        break;
      case 'exit':
        lines.push(`${bare(o.text)}: a unit ${o.leadersScore ? 'or leader ' : ''}that leaves the battlefield here scores ${plural(o.banners, 'banner')}`);
        break;
      case 'killWeight':
        lines.push(`First ${s.players[other(side)].army} ${o.enemyArm} unit eliminated: ${plural(o.first, 'banner')}; each later one: ${o.later}`);
        break;
    }
  });
  const out = lines.map((l) => {
    const ids = merged.get(l);
    if (!ids) return l;
    const [text, banners] = l.split('|');
    const n = Number(banners);
    const held = ids.filter((i) => s.special.objState[i]?.held).length;
    if (ids.length === 1) return `${text}: ${plural(n, 'banner')} while held at the start of its turn${held ? ' (held now)' : ''}`;
    return `${text} (${ids.length} hexes): ${plural(n, 'banner')} each while held at the start of their turn${held ? ` (${held} held now)` : ''}`;
  });
  out.push('Each enemy unit or leader eliminated: 1 banner');
  return out;
}
