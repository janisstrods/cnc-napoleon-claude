import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../scripts/scenarios/args';

describe('build.ts arguments', () => {
  it('accepts --check, --ids and a leading --', () => {
    expect(parseArgs([])).toEqual({ check: false, ids: undefined });
    expect(parseArgs(['--', '--check'])).toEqual({ check: true, ids: undefined });
    expect(parseArgs(['--ids', '001,006'])).toEqual({ check: false, ids: ['001', '006'] });
  });
  it('refuses a lone stray argument, a stray beside --check, and a bare --ids', () => {
    expect(() => parseArgs(['--chek'])).toThrow(/unknown argument --chek/);
    expect(() => parseArgs(['bogus', '--check'])).toThrow(/unknown argument bogus/);
    expect(() => parseArgs(['--ids'])).toThrow(/--ids needs/);
    expect(() => parseArgs(['--ids', '--check'])).toThrow(/--ids needs/);
  });
});
