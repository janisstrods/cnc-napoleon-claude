// Plan 4 Task 6: tooltip lines for a unit in square and for a leader.
import { describe, expect, it } from 'vitest';
import * as unitText from '../../src/ui/game/unitText';
import { leaderLines } from '../../src/ui/game/unitText';
import { squareLines } from '../../src/ui/game/squareText';
import { build, leaderId } from '../rules/helpers';

describe('tooltips', () => {
  it('a square\'s tooltip lines', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }, { side: 'top', key: 'FR/LC', at: [2, 6] }] });
    expect(squareLines(s, s.units[0])).toEqual([]);
    s.units[0].square = 2;
    expect(squareLines(s, s.units[0])).toEqual(['In square (counter 2): rolls at most 1 die; cannot move, take ground or break through; fights first against cavalry.']);
  });

  it('leader lines replace the empty trait lines', () => {
    const s = build({ units: [{ side: 'bottom', key: 'BR/LN', at: [6, 5] }], leaders: [{ side: 'bottom', at: [6, 5] }, { side: 'bottom', at: [7, 1] }] });
    expect(leaderLines(s, s.leaders.find((l) => l.id === leaderId(s, 0))!)).toEqual(['Attached: the unit may ignore 1 flag; +1 die only with Leadership.']);
    expect(leaderLines(s, s.leaders.find((l) => l.id === leaderId(s, 1))!)).toEqual(['Alone: cannot be fired at; a melee against him needs a sabre.']);
    expect('leaderTraitLines' in unitText).toBe(false);
  });
});
