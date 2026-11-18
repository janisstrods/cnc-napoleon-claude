import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { NapLeaderToken, NapUnitIcon, NapUnitToken, ART_KEYS, ART_NATIONS } from '../../../src/art/nap';
import { svg } from './helpers';

// The hash pin: fixes the Napoleonic art as of Plan 7C Task 13 (the Spanish, Swiss and Guard light cavalry miniatures). After
// a deliberate art change, re-pin by pasting the hash this failure prints, and say so in the commit message.
const BASELINE = '487b0bb6f2f5d630edf32523c10827c69ff32ae33eb4735f21401054ad4e6284';

function markup(): string {
  const out: string[] = [];
  for (const key of ART_KEYS) {
    for (const max of [3, 4, 5]) for (let blocks = 0; blocks <= max; blocks++) for (const facing of ['left', 'right'] as const) for (const dimmed of [false, true]) {
      out.push(svg(h(NapUnitToken, { unitKey: key, blocks, maxBlocks: max, facing, dimmed })));
    }
    for (const size of [24, 64]) out.push(svg(h(NapUnitIcon, { unitKey: key, size })));
  }
  for (const nation of ART_NATIONS) for (const facing of ['left', 'right'] as const) for (const attached of [true, false]) {
    out.push(svg(h(NapLeaderToken, { nation, facing, attached, name: 'Picton', showName: true })));
  }
  return out.join('\n');
}

describe('the art is pinned', () => {
  it('renders byte-identically to the pinned hash', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(markup()));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hash).toBe(BASELINE);
  });
});
