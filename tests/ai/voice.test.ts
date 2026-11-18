// The commanders' voice (src/ai/voice.ts): lines in the commander's temperament, never revealing a card still in hand.
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, type CardKind } from '../../src/engine';
import { PERSONALITIES } from '../../src/ai/personality';
import { Rng } from '../../src/ai/rand';
import { MOMENTS, sayFor } from '../../src/ai/voice';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

const CARD_KINDS = Object.keys(CARD_DEFS) as CardKind[];
const UNITS = ['Line Infantry', 'Heavy Cavalry', 'Foot Artillery', 'Grenadiers'];
/** American spellings and their stems: none may appear. */
const AMERICAN = /\b(color\w*|maneuver\w*|honor\w*|defense\w*|armor\w*|favor\w*|neighbor\w*|labor\w*|valor\w*|center\w*|gray)\b/i;
/** A talkative copy of a personality: chatter 2 makes the chance to speak 1, so every call produces a line. */
const talkative = (p: (typeof PERSONALITIES)[number]) => ({ ...p, chatter: 2 });

/** Every line a talkative commander of every voice says over many seeds (a card and a unit given, then neither). */
function allLines(): string[] {
  const out: string[] = [];
  for (const p of PERSONALITIES) {
    for (const m of MOMENTS) {
      for (let seed = 1; seed <= 60; seed++) {
        const ctx = seed % 2 ? { card: 'bayonetCharge' as CardKind, unit: UNITS[seed % 4] } : {};
        const line = sayFor(talkative(p), m, ctx, new Rng(seed));
        if (line !== undefined) out.push(line);
      }
    }
  }
  return out;
}

describe('sayFor', () => {
  it('lines never name a card not yet played', () => {
    let spoken = 0;
    for (let i = 0; i < 200; i++) {
      const p = PERSONALITIES[i % PERSONALITIES.length];
      const m = MOMENTS[i % MOMENTS.length];
      const played = CARD_KINDS[(i * 7) % CARD_KINDS.length];
      const line = sayFor(talkative(p), m, i % 3 === 0 ? {} : { card: played, unit: UNITS[i % 4] }, new Rng(1000 + i));
      if (line === undefined) continue;
      spoken++;
      for (const k of CARD_KINDS) {
        if (CARD_DEFS[k].title === CARD_DEFS[played].title) continue;
        expect(line.toLowerCase(), `"${line}" (played ${played}) names ${CARD_DEFS[k].title}`).not.toContain(CARD_DEFS[k].title.toLowerCase());
      }
    }
    expect(spoken).toBeGreaterThan(150);
  });

  it('no line uses a one-word card title as a word (Forward, Bombard, Rally, Leadership, Élan)', () => {
    const single = [...new Set(CARD_KINDS.map((k) => CARD_DEFS[k].title).filter((t) => !t.includes(' ')))].map((t) => t.toLowerCase());
    expect(single.length).toBeGreaterThanOrEqual(5);
    for (const line of allLines()) {
      for (const t of single) expect(line.toLowerCase(), line).not.toMatch(new RegExp(`(^|[^\\p{L}])${t}($|[^\\p{L}])`, 'u'));
    }
  });

  it('a silent personality (chatter 0) never speaks; lines are at most 80 characters; British spelling (colour, manoeuvre)', () => {
    for (const p of PERSONALITIES) {
      for (const m of MOMENTS) {
        for (let seed = 1; seed <= 60; seed++) {
          expect(sayFor({ ...p, chatter: 0 }, m, { card: 'forceMarch', unit: 'Line Infantry' }, new Rng(seed))).toBeUndefined();
        }
      }
    }
    const lines = allLines();
    expect(lines.length).toBeGreaterThan(1000);
    for (const line of lines) {
      expect(line.length, line).toBeLessThanOrEqual(80);
      expect(line, line).not.toMatch(AMERICAN);
      expect(line, line).not.toMatch(/[{}]/); // no placeholder left behind
    }
    // the British spellings the brief names are used somewhere in the book
    const text = lines.join(' ').toLowerCase();
    expect(text).toMatch(/colour|manoeuvre/);
  });

  it('every voice has 3 to 4 plain lines for every moment', () => {
    const voices = [...new Set(PERSONALITIES.map((p) => p.voice))].sort();
    expect(voices).toEqual(['bold', 'cunning', 'methodical', 'reckless', 'stoic']);
    expect(MOMENTS).toHaveLength(8);
    for (const v of voices) {
      const p = talkative(PERSONALITIES.find((x) => x.voice === v)!);
      for (const m of MOMENTS) {
        const plain = new Set<string>();
        for (let seed = 1; seed <= 400; seed++) {
          const line = sayFor(p, m, {}, new Rng(seed)); // no card, no unit: only plain lines can be spoken
          if (line) plain.add(line);
        }
        expect(plain.size, `${v} / ${m}`).toBeGreaterThanOrEqual(3);
        expect(plain.size, `${v} / ${m}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('speaking is deterministic for a seed; seeds differ', () => {
    const run = (p: (typeof PERSONALITIES)[number], m: (typeof MOMENTS)[number], seed: number) => {
      const rand = new Rng(seed);
      const out = [1, 2, 3, 4, 5, 6].map(() => sayFor(talkative(p), m, { card: 'cavalryCharge', unit: 'Heavy Cavalry' }, rand));
      return { out, state: rand.state };
    };
    for (const p of PERSONALITIES) for (const m of MOMENTS) expect(run(p, m, 77)).toEqual(run(p, m, 77));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => run(PERSONALITIES[0], 'cardPlayed', i).out.join('|')));
    expect(seen.size).toBeGreaterThan(5);
  });

  it('the chance to speak is the temperament chatter times a half', () => {
    const p = { ...PERSONALITIES[0], chatter: 0.6 };
    const rand = new Rng(5);
    let n = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (sayFor(p, 'cardPlayed', { card: 'forceMarch' }, rand) !== undefined) n++;
    expect(n / N).toBeGreaterThan(0.26);
    expect(n / N).toBeLessThan(0.34);
  });
});
