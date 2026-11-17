// Terrain tooltips (RR §4): one tip per terrain row, worded from TERRAIN_STATS, plus the Field Works of a works hex.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TERRAIN_STATS, TERRAIN_TYPES, type ArmValues, type Reductions, type TerrainType } from '../../src/engine';
import { terrainName } from '../../src/ui/terrain';
import { TerrainTipBlock } from '../../src/ui/game/TerrainTipBlock';
import { terrainTip, type TerrainTip } from '../../src/ui/game/terrainTips';
import { H, build, type Pos } from '../rules/helpers';

const lines = (tip: TerrainTip | null) => tip!.lines.map((x) => `${x.kind}: ${x.text}`);
/** The tip of a single hex at (4, 6) of terrain `t` on an otherwise empty board (the state is edited: a setup cannot name every row). */
function tipOf(t: TerrainType, extra: Partial<Pos> = {}): TerrainTip | null {
  const s = build(extra);
  s.terrain[H(4, 6)] = t;
  return terrainTip(s, H(4, 6), false);
}
const WORKS_LOWER: Partial<Pos> = { terrain: [{ at: [4, 6], t: 'fieldworks', on: 'plain', sides: ['SW', 'SE'] }] };

/** "infantry −1, artillery −1" for the non-zero entries of an arm row, or null. */
function armsText(v: ArmValues): string | null {
  const parts = (['infantry', 'cavalry', 'artillery'] as const).filter((a) => v[a] !== 0).map((a) => `${a} −${Math.abs(v[a])}`);
  return parts.length ? parts.join(', ') : null;
}
/** The combat lines the table's reductions call for. */
function reductionLines(r: Reductions, dir: 'into' | 'out of'): string[] {
  const fire = armsText(r.fire);
  const melee = armsText(r.melee);
  return [...(fire ? [`combat: Fire ${dir} it: ${fire}`] : []), ...(melee ? [`combat: Melee ${dir} it: ${melee}`] : [])];
}

const PAINTED = TERRAIN_TYPES.filter((t) => t !== 'plain' && t !== 'void');

describe('terrain names', () => {
  it('terrainName(t) is TERRAIN_STATS[t].name', () => {
    for (const t of TERRAIN_TYPES) expect(terrainName(t), t).toBe(TERRAIN_STATS[t].name);
  });
});

describe('terrain tooltips: each terrain row', () => {
  it('has one tip, titled with its table name, with the swatch to paint', () => {
    for (const t of PAINTED) {
      const tip = tipOf(t);
      expect(tip, t).not.toBeNull();
      expect(tip!.name, t).toBe(TERRAIN_STATS[t].name);
      expect(tip!.t, t).toBe(t);
      expect(tip!.lines.length, t).toBeGreaterThan(0);
    }
  });

  it('lists every reduction of its row, into and out of it', () => {
    for (const t of PAINTED) {
      const st = TERRAIN_STATS[t];
      const got = lines(tipOf(t));
      for (const want of [...reductionLines(st.into, 'into'), ...reductionLines(st.out, 'out of')]) expect(got, `${t}: ${want}`).toContain(want);
    }
  });

  it('forest: stops units, lets only light troops battle, takes dice from fire and melee, blocks sight', () => {
    expect(lines(tipOf('forest'))).toEqual([
      'move: Stops every unit and lone leader entering it',
      'move: After entering it, only light troops may battle that turn',
      'combat: Fire into it: infantry −1, artillery −1',
      'combat: Melee into it: infantry −1, cavalry −2, artillery −1',
      'combat: Fire out of it: artillery −1',
      'combat: Melee out of it: cavalry −2, artillery −1',
      'sight: Blocks line of sight',
    ]);
  });

  it('town (and windmill and fortress, which share its row): heavy reductions, no square, cancels a cavalry charge', () => {
    const got = lines(tipOf('town'));
    expect(got).toContain('combat: Fire into it: infantry −2, artillery −1');
    expect(got).toContain('combat: Melee into it: infantry −2, cavalry −3, artillery −1');
    expect(got).toContain('move: A unit that enters it may not battle that turn');
    expect(got).toContain('combat: No square can be formed here');
    expect(got).toContain('sight: Blocks line of sight');
    for (const t of ['windmill', 'fortress'] as const) expect(lines(tipOf(t)), t).toEqual(got);
  });

  it('ford, brook and sand quarry: their rows', () => {
    expect(lines(tipOf('ford'))).toContain('combat: Melee into it: infantry −1, cavalry −1, artillery −1');
    expect(lines(tipOf('ford'))).toContain('move: Stops every unit and lone leader entering it');
    expect(lines(tipOf('fordNoStop'))).not.toContain('move: Stops every unit and lone leader entering it');
    expect(lines(tipOf('brook'))).toContain('move: Stops every unit and lone leader entering it');
    expect(lines(tipOf('sandQuarry'))).toContain('move: Closed to artillery');
    expect(lines(tipOf('sandQuarry'))).toContain('combat: Fire into it: infantry −1, artillery −1');
    expect(lines(tipOf('sandQuarry'))).toContain('combat: Melee into it: cavalry −2');
  });

  it('river and rugged hill are impassable; a hill says how it works between hills', () => {
    expect(lines(tipOf('river'))).toContain('move: Impassable');
    expect(lines(tipOf('river'))).toContain('combat: No melee into it');
    expect(lines(tipOf('rugged'))).toContain('move: Impassable');
    expect(lines(tipOf('hill')).some((l) => l.startsWith('combat: Melee up onto it'))).toBe(true);
  });
});

describe('terrain tooltips: Field Works', () => {
  it('a works hex on open ground is "Field works", with its sides, the works reductions and the flags it ignores', () => {
    const tip = terrainTip(build(WORKS_LOWER), H(4, 6), false)!;
    expect(tip.name).toBe('Field works');
    const got = lines(tip);
    expect(got[0]).toBe('combat: Field works along lower hexsides');
    expect(got).toContain('combat: Fire into it: infantry −1');
    expect(got).toContain('combat: Melee into it: infantry −1, cavalry −2');
    expect(got).toContain('combat: Melee out of it: cavalry −2');
    expect(got.at(-1)).toBe('combat: A unit crossing them stops there; infantry and artillery defending behind them ignore 1 flag');
  });

  it('on a flipped board the works turn by 180 degrees', () => {
    expect(lines(terrainTip(build(WORKS_LOWER), H(4, 6), true))[0]).toBe('combat: Field works along upper hexsides');
  });

  it('works on a hill: the hill is named with them and keeps its own lines', () => {
    const s = build({ terrain: [{ at: [4, 6], t: 'fieldworks', on: 'hill', sides: ['SW'] }] });
    const tip = terrainTip(s, H(4, 6), false)!;
    expect(tip.name).toBe('Hill with field works');
    expect(lines(tip).some((l) => l.startsWith('combat: Melee up onto it'))).toBe(true);
    expect(lines(tip).some((l) => l.startsWith('combat: Field works along'))).toBe(true);
  });
});

describe('terrain tooltips: no tip', () => {
  it('open ground without works and off the board have none', () => {
    expect(tipOf('plain')).toBeNull();
    const s = build({});
    s.terrain[H(4, 6)] = 'void';
    expect(terrainTip(s, H(4, 6), false)).toBeNull();
    expect(terrainTip(s, -1, false)).toBeNull();
  });
});

describe('terrain tooltips: the tooltip block', () => {
  it('a swatch, the name and each kind labelled once; a divider under a unit', () => {
    const tip = tipOf('forest')!;
    const html = renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: true }));
    expect(html).toContain('<svg');
    expect(html).toContain('>Forest<');
    expect(html.match(/class="tip-kind">Move</g)).toHaveLength(1); // two move lines, one label
    expect(html.match(/class="tip-kind">Combat</g)).toHaveLength(1);
    expect(html).not.toContain('tip-divided');
    expect(renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: false }))).toContain('tip-divided');
  });

  it('every row has a swatch, and so has a Field Works hex', () => {
    for (const t of PAINTED) {
      expect(renderToStaticMarkup(createElement(TerrainTipBlock, { tip: tipOf(t)!, alone: true })), t).toContain('<svg');
    }
    const tip = terrainTip(build(WORKS_LOWER), H(4, 6), false)!;
    expect(renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: true }))).toContain('<svg');
  });
});
