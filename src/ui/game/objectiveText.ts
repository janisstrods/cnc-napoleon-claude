// Battle objectives on the game screen (rules-reference §13): the banner track's counts, and the tooltip lines of an
// objective hex: what it scores, for whom, and its state now.
import { UNIT_STATS, bannerTotal, other, rowOf, type GameState, type HexId, type ObjectiveDef, type ObjectiveOf, type Side } from '../../engine';

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

/** An objective's text as a marker or panel shows it: the unit that will score is not known yet, so `{unit}` reads "unit". */
export const objectiveMarkerText = (o: ObjectiveDef): string => ('text' in o ? o.text.replace('{unit}', 'unit') : '');

/** "The left hills" out of "The Spanish hold the left hills." (the whole text when it does not read that way). */
function placeOf(text: string): string {
  const m = /\bholds?\s+(.+?)\.?\s*$/.exec(text);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : bare(text);
}

/**
 * Title of a majority group's marker. A contested group has one record per side with the same hexes: `holder` is the index of
 * the record whose side holds it now (its own text), or undefined while nobody does (neither side's text is true then).
 */
export function majorityMarkerText(defs: readonly ObjectiveOf<'majority'>[], holder: number | undefined): string {
  return holder === undefined ? `${placeOf(defs[0].text)}: held by neither side` : defs[holder].text;
}

/** The indices of the majority records over the same hexes as record `i` (a contested group is two). */
function groupOf(s: GameState, i: number): number[] {
  const key = (o: ObjectiveDef) => (o.kind === 'majority' ? [...o.hexes].sort((a, b) => a - b).join(',') : '');
  const mine = key(s.scenario.objectives[i]);
  return s.scenario.objectives.flatMap((o, j) => (o.kind === 'majority' && key(o) === mine ? [j] : []));
}

/** "the French army", or "no one": who holds a majority group now. */
function holderName(s: GameState, group: number[]): string {
  const h = group.find((j) => s.special.objState[j]?.held);
  return h === undefined ? 'no one' : `the ${s.players[s.scenario.objectives[h].side as Side].army} army`;
}

const exitsUsed = (o: ObjectiveOf<'exitEdge'>, n: number) =>
  `${bare(o.text.replace('{unit}', 'unit'))}: ${o.free > 0 ? `${n} of ${o.free} free exits used; each later exit scores` : 'each exit scores'} ${plural(o.banners, 'banner')}`;

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
    case 'tempAny':
      return o.hexes.includes(h) ? [`${bare(o.text)}: ${plural(o.banners, 'banner')} for the ${army(o.side)} army while a unit stands on any of these ${o.hexes.length} hexes at the start of its turn${st?.held ? ' (held now)' : ''}`] : [];
    case 'majority': {
      const group = groupOf(s, i);
      // a contested group is one line, said by its first record
      return o.hexes.includes(h) && group[0] === i ? [`${placeOf(o.text)}: ${plural(o.banners, 'banner')} for the army that holds most of these ${o.hexes.length} hexes at the start of its turn — held by ${holderName(s, group)}`] : [];
    }
    case 'exitEdge':
      return rowOf(h) === o.row ? [exitsUsed(o, st?.count ?? 0)] : [];
    case 'killWeight':
    case 'suddenDeath':
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
  // identical tempHex objectives (same text, same banners) are one line
  type Merged = { text: string; banners: number; ids: number[] };
  const lines: (string | Merged)[] = [];
  const merged: Merged[] = [];
  let kills = false;
  s.scenario.objectives.forEach((o, i) => {
    if (o.side !== side) return;
    switch (o.kind) {
      case 'tempHex': {
        const text = bare(o.text);
        const at = merged.find((m) => m.text === text && m.banners === o.banners);
        if (at) at.ids.push(i);
        else {
          const m = { text, banners: o.banners, ids: [i] };
          merged.push(m);
          lines.push(m);
        }
        break;
      }
      case 'tempGroup':
        lines.push(`${bare(o.text)}: ${plural(o.banners, 'banner')} while held at the start of its turn${s.special.objState[i]?.held ? ' (held now)' : ''}`);
        break;
      case 'exit':
        lines.push(`${bare(o.text)}: a unit ${o.leadersScore ? 'or leader ' : ''}that leaves the battlefield here scores ${plural(o.banners, 'banner')}`);
        break;
      case 'tempAny':
        lines.push(`${bare(o.text)}: ${plural(o.banners, 'banner')} while a unit stands on any of these ${o.hexes.length} hexes at the start of its turn${s.special.objState[i]?.held ? ' (held now)' : ''}`);
        break;
      case 'majority':
        lines.push(`${bare(o.text)}: ${plural(o.banners, 'banner')} while it holds most of these ${o.hexes.length} hexes — held by ${holderName(s, groupOf(s, i))}`);
        break;
      case 'exitEdge':
        lines.push(exitsUsed(o, s.special.objState[i]?.count ?? 0));
        break;
      case 'suddenDeath': {
        const left = Math.max(0, o.need - (s.special.objState[i]?.count ?? 0));
        const guns = o.keys.every((k) => UNIT_STATS[k].arm === 'artillery');
        lines.push(`${bare(o.text)}: ${left} ${guns ? (left === 1 ? 'battery' : 'batteries') : (left === 1 ? 'unit' : 'units')} left before the ${s.players[o.side].army} win`);
        break;
      }
      case 'killWeight':
        kills = true;
        lines.push(`First ${s.players[other(side)].army} ${o.enemyArm} unit eliminated: ${plural(o.first, 'banner')}; each later one: ${o.later}`);
        break;
    }
  });
  const out = lines.map((l) => {
    if (typeof l === 'string') return l;
    const held = l.ids.filter((i) => s.special.objState[i]?.held).length;
    if (l.ids.length === 1) return `${l.text}: ${plural(l.banners, 'banner')} while held at the start of its turn${held ? ' (held now)' : ''}`;
    return `${l.text} (${l.ids.length} hexes): ${plural(l.banners, 'banner')} each while held at the start of their turn${held ? ` (${held} held now)` : ''}`;
  });
  // a side with a weighted kill objective already scores its first enemy casualties above: the plain rule covers the rest
  out.push(kills ? 'Each other enemy unit or leader eliminated: 1 banner' : 'Each enemy unit or leader eliminated: 1 banner');
  return out;
}
