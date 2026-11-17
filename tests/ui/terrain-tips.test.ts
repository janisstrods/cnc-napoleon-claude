// Terrain tooltips (rules-reference §4, §7–§10, §16, §18.6, §18.7): every terrain says what it does to movement, combat and
// line of sight; the variants of single battles (no-cap ford, coastal ford, very steep hills, ramparts, Expansion #3's
// city walls, walled towns, camps and walls on hills and steep slopes) are worded for them.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, hexId, type GameState, type HexId, type TerrainType } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { TerrainTipBlock } from '../../src/ui/game/TerrainTipBlock';
import { terrainTip, type TerrainTip } from '../../src/ui/game/terrainTips';
import { H, build, type Pos } from '../rules/helpers';

const game = (id: string) => createGame(scenarioById(id).setup, 1);
const lines = (tip: TerrainTip | null) => tip!.lines.map((x) => `${x.kind}: ${x.text}`);
/** The tip of a single terrain hex at (4, 6) on an otherwise empty board. */
const tipOf = (t: TerrainType, extra: Partial<Pos> & { ford?: boolean } = {}) => {
  const { ford, ...pos } = extra;
  return terrainTip(build({ terrain: [{ at: [4, 6], t, ford }], ...pos }), H(4, 6), false);
};
/** The first hex of terrain `t` in `s` that passes `pred`. */
function hexOf(s: GameState, t: TerrainType, pred: (h: HexId) => boolean = () => true): HexId {
  const h = s.terrain.findIndex((x, i) => x === t && pred(i));
  expect(h, t).toBeGreaterThanOrEqual(0);
  return h;
}

const STOPS = 'move: Stops every unit and lone leader entering it';
const CLEAR = 'sight: Does not block line of sight';
const BLOCKS = 'sight: Blocks line of sight';
const HILL_SIGHT = 'sight: Blocks line of sight, unless firer and target stand on the same hill';
const ADVANCE_OUT = 'combat: A unit here may advance out after combat only if it did not move this turn';
const FORD = [STOPS, 'combat: Close combat in or out: max 2 dice. Firing out: max 1 die', ADVANCE_OUT, CLEAR];
/** Camps, ramparts and walls protect only a defender (§4, §16, §18.7). */
const DEFENDER_ONLY = 'combat: A unit attacking out of it is not protected against the battle back';
const NO_HWM = 'move: Heavy war machines may not enter';

describe('terrain tooltips: each terrain', () => {
  it('hill', () => {
    const tip = tipOf('hill');
    expect(tip!.name).toBe('Hill');
    expect(lines(tip)).toEqual([
      'move: No effect',
      'combat: Battling up onto it from lower ground: max 2 dice',
      'combat: Battling from it: foot max 3 dice, mounted max 2',
      HILL_SIGHT,
    ]);
  });
  it('forest', () => {
    const tip = tipOf('forest');
    expect(tip!.name).toBe('Forest');
    expect(lines(tip)).toEqual([
      STOPS,
      'move: After entering it, only light foot, auxilia and warriors may battle that turn',
      'combat: Close combat in or out: max 2 dice. Firing into it: max 1 die',
      BLOCKS,
    ]);
  });
  it('marsh', () => {
    const tip = tipOf('marsh');
    expect(tip!.name).toBe('Marsh');
    expect(lines(tip)).toEqual([
      `${STOPS}. Leaving it, a unit or lone leader moves only 1 hex`,
      'move: A unit entering it (also by retreat or advance) rolls 1 die and loses a block on its own symbol; a lone leader dies on a helmet',
      'combat: Close combat in or out: max 2 dice. Firing out: max 1 die',
      ADVANCE_OUT,
      CLEAR,
    ]);
  });
  it('broken ground', () => {
    const tip = tipOf('broken');
    expect(tip!.name).toBe('Broken Ground');
    expect(lines(tip)).toEqual([
      'move: Stops mounted units and lone leaders entering it; a mounted unit that enters may not battle that turn',
      'combat: Close combat in or out: max 2 dice',
      CLEAR,
    ]);
  });
  it('heavy war machines are mentioned only where one is on the board', () => {
    const hwm: Partial<Pos> = { units: [{ side: 'bottom', type: 'HWM', at: [7, 6] }] };
    expect(lines(tipOf('marsh', hwm))).toEqual([...lines(tipOf('marsh')).slice(0, 2), NO_HWM, ...lines(tipOf('marsh')).slice(2)]);
    expect(lines(tipOf('broken', hwm))).toEqual([...lines(tipOf('broken')).slice(0, 1), NO_HWM, ...lines(tipOf('broken')).slice(1)]);
    expect(lines(tipOf('forest', hwm))).toEqual(lines(tipOf('forest')));
  });
  it('rivers: a fordable river, and the impassable river, lake, sea and steep hills', () => {
    const ford = tipOf('river', { ford: true });
    expect(ford).toMatchObject({ name: 'Fordable River', t: 'river', ford: true });
    expect(lines(ford)).toEqual(FORD);
    for (const [t, name] of [['river', 'River'], ['lake', 'Lake'], ['sea', 'Sea']] as const) {
      const tip = tipOf(t);
      expect(tip!.name).toBe(name);
      expect(lines(tip), t).toEqual(['move: Impassable', CLEAR]);
    }
    expect(tipOf('steep')!.name).toBe('Steep Hill');
    expect(lines(tipOf('steep'))).toEqual(['move: Impassable', BLOCKS]);
  });
  it('fortified camp and ditch', () => {
    expect(tipOf('camp')!.name).toBe('Fortified Camp');
    expect(lines(tipOf('camp'))).toEqual([
      'move: No effect',
      'combat: A unit here rolls 1 die fewer when it battles',
      'combat: Foot defending here ignore 1 sword and may ignore 1 flag',
      DEFENDER_ONLY,
      BLOCKS,
    ]);
    expect(tipOf('ditch')!.name).toBe('Ditch');
    expect(lines(tipOf('ditch'))).toEqual([STOPS, 'combat: No effect', CLEAR]);
  });
  it('open ground and off-board: no tip', () => {
    expect(tipOf('plain')).toBeNull();
    const s = game('000');
    expect(terrainTip(s, s.terrain.indexOf('void'), false)).toBeNull();
  });
});

describe('terrain tooltips: the tooltip block', () => {
  it('a swatch, the name and each kind labelled once; a divider under a unit', () => {
    const tip = tipOf('forest')!;
    const html = renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: true }));
    expect(html).toContain('<svg');
    expect(html).toContain('>Forest<');
    expect(html.match(/class="tip-kind">Move</g)).toHaveLength(1); // two move lines, one label
    expect(html.match(/class="tip-kind"><\/span>/g)).toHaveLength(1);
    expect(html).not.toContain('tip-divided');
    expect(renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: false }))).toContain('tip-divided');
  });
});
