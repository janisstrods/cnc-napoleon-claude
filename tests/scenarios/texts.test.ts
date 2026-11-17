import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/scenarios/catalogue';
import { TEXTS } from '../../src/scenarios/texts';

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const allStrings = (): string[] =>
  Object.values(TEXTS).flatMap((t) => [t.blurb, t.hint, ...(t.specialText ?? [])]);

describe('briefing texts', () => {
  it('every base battle has texts; every entry is a catalogue battle', () => {
    const base = CATALOGUE.filter((b) => b.box === 'base').map((b) => b.id);
    expect(base).toHaveLength(15);
    for (const id of base) expect(TEXTS[id], id).toBeDefined();
    const ids = new Set(CATALOGUE.map((b) => b.id));
    for (const key of Object.keys(TEXTS)) expect(ids.has(key), key).toBe(true);
  });

  it('blurbs are 30–80 words, hints at most 70 characters', () => {
    for (const [id, t] of Object.entries(TEXTS)) {
      const n = words(t.blurb);
      expect(n, `${id} blurb words`).toBeGreaterThanOrEqual(30);
      expect(n, `${id} blurb words`).toBeLessThanOrEqual(80);
      expect(t.hint.length, `${id} hint`).toBeGreaterThan(0);
      expect(t.hint.length, `${id} hint`).toBeLessThanOrEqual(70);
    }
  });

  it('special rules: line counts and key words', () => {
    const counts: Record<string, number> = {
      '001': 2, '002': 0, '003': 2, '004': 1, '005': 2, '006': 5, '007': 1, '008': 0,
      '009': 1, '010': 1, '011': 1, '012': 2, '013': 2, '014': 3, '015': 3,
    };
    for (const [id, n] of Object.entries(counts)) {
      expect(TEXTS[id]?.specialText?.length ?? 0, id).toBe(n);
    }
    const j = (id: string): string => (TEXTS[id]?.specialText ?? []).join(' ');
    expect(j('006')).toContain('bridge');
    expect(j('006')).toContain('Almeida');
    expect(j('006')).toContain('4 cards');
    expect(j('012')).toContain('square');
    expect(j('015')).toContain('impetuous');
  });

  it('special rules are the fixed copy', () => {
    const fixed: Record<string, string[]> = {
      '001': ['Each hill at either end of the French baseline gives the Anglo-Portuguese a temporary banner while one of their units holds it at the start of their turn.', 'The river is fordable everywhere.'],
      '002': [],
      '003': ['Vimiero: the French gain 2 temporary banners while they hold both town hexes at the start of their turn, and lose both the moment either hex is empty.', 'The river is fordable everywhere.'],
      '004': ['All streams are fordable.'],
      '005': ['The Portina Brook stops movement but gives no battle penalties; a unit that entered it this turn may not take ground.', 'A British battery starts behind field works on a hill.'],
      '006': ['An Anglo-Portuguese unit that leaves the board by the Côa bridge on its own baseline scores 1 permanent banner; leaders may leave but score nothing.', 'No retreat leads off the bridge: a unit that cannot complete its retreat loses blocks instead.', 'The river is impassable except at the bridge.', 'The Fortress of Almeida counts as a town; an Anglo-Portuguese unit there may ignore 1 flag.', 'Each side holds 4 cards.'],
      '007': ['The stream is fordable everywhere.'],
      '008': [],
      '009': ['The Ancos is impassable except at the bridge.'],
      '010': ['The Azan is impassable except at the bridge.'],
      '011': ['The stream is fordable everywhere, and entering it does not stop movement.'],
      '012': ['Two French light infantry units start in square, so 2 French cards begin on the square track.', 'The first French infantry unit destroyed gives the British 1 banner; each later one gives 2.'],
      '013': ['Nauzeilles and the Seminary each give the Anglo-Portuguese a temporary banner while held at the start of their turn.', 'The river is fordable; crossing at the ford does not stop movement.'],
      '014': ['Quatre Bras gives the French a temporary banner while held at the start of their turn.', 'The stream is fordable everywhere, and entering it does not stop movement.', 'Allied line infantry retreats 2 hexes per flag.'],
      '015': ['La Haye Sainte, Hougoumont and Papelotte each give the French a temporary banner while held at the start of their turn.', 'British cavalry is impetuous: after a successful attack it must break through and press on 1 hex towards the French.', 'Allied line infantry retreats 2 hexes per flag.'],
    };
    for (const [id, lines] of Object.entries(fixed)) expect(TEXTS[id]?.specialText ?? [], id).toEqual(lines);
  });

  it('British spelling, and no quotation of 15 words or more', () => {
    const us = /\b(center|centers|color|colors|maneuvers?|defense|honor|favor|armor|toward)\b/i;
    for (const s of allStrings()) {
      expect(us.test(s), s).toBe(false);
      for (const m of s.matchAll(/“([^”]*)”|"([^"]*)"/g)) {
        expect(words(m[1] ?? m[2] ?? ''), s).toBeLessThan(15);
      }
    }
  });
});
