import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { ARTILLERY, type ArtKey, type ArtilleryKey } from '../../../src/art/nap/keys';
import { NapMiniature } from '../../../src/art/nap/token';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
import { GUN_PIECE_BOX, SLOTS } from '../../../src/art/nap/slots';
import { FIGURE_SPECS } from '../../../src/art/nap/specs';
import type { GunPiece, GunSpec } from '../../../src/art/nap/uniform';
import { count, hueClass, shape, svg, token } from './helpers';

const spec = (k: ArtKey) => FIGURE_SPECS[k] as GunSpec;
const piece = (k: ArtilleryKey, p: GunPiece, i = 0) => svg(h(NapMiniature, { unitKey: k, i, piece: p }));
/** A whole unit, colours stripped: the drawing alone. */
const unit = (k: ArtKey) => shape(token(k));
const HORSE = ARTILLERY.filter((k) => k.endsWith('/HA'));
const FOOT = ARTILLERY.filter((k) => !k.endsWith('/HA'));

describe('artillery', () => {
  it('no artillery key is a stub', () => {
    for (const k of ARTILLERY) {
      expect(spec(k).stub, k).toBeUndefined();
      expect(token(k), k).not.toContain('data-stub');
    }
  });

  it('the gun is the last piece left', () => {
    for (const k of ARTILLERY) {
      const out = token(k, { blocks: 1, maxBlocks: 3 });
      expect(count(out, 'data-piece='), k).toBe(1);
      expect(out, k).toContain('data-piece="gun"');
    }
  });

  it('foot guns have a gun and two crew; horse guns have a driver as well, at 3 and 4 blocks', () => {
    for (const k of FOOT) {
      const out = token(k, { blocks: 3, maxBlocks: 3 });
      expect(count(out, 'data-piece='), k).toBe(3);
      expect(out).toContain('data-piece="gun"');
      expect(out).not.toContain('data-piece="driver"');
    }
    for (const k of HORSE) {
      for (const m of [3, 4]) expect(count(token(k, { blocks: m, maxBlocks: m }), 'data-piece="driver"'), `${k} ${m}`).toBe(1);
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    for (const [a, b] of [['FR/FA', 'FR/HA'], ['FR/FA', 'FR/GA'], ['FR/FA', 'BR/FA'], ['BR/FA', 'BR/HA']] as const) expect(unit(a), `${a} vs ${b}`).not.toBe(unit(b));
  });

  it('the Guard gunners wear bearskins and the Royal Horse Artillery Tarleton helmets', () => {
    for (const p of ['gun', 'rammer', 'linstock', 'ammo'] as const) expect(piece('FR/GA', p)).toContain('data-head="bearskin"');
    expect(piece('BR/HA', 'rammer')).toContain('data-head="tarleton"');
    expect(piece('BR/HA', 'driver')).toContain('data-head="tarleton"');
    expect(piece('FR/FA', 'rammer')).toContain('data-head="shako"');
    expect(piece('BR/FA', 'rammer')).toContain('data-head="stovepipe"');
    expect(piece('PT/FA', 'rammer')).toContain('data-head="barretina"');
  });

  it('French carriages are green, British and Portuguese ones grey or blue, and each shows in the drawing', () => {
    for (const k of ['FR/FA', 'FR/HA', 'FR/GA'] as const) {
      expect(hueClass(spec(k).carriage), k).toBe('green');
      expect(piece(k, 'gun'), k).toContain(spec(k).carriage);
    }
    for (const k of ['BR/FA', 'BR/HA', 'PT/FA'] as const) {
      expect(['grey', 'blue'], k).toContain(hueClass(spec(k).carriage));
      expect(piece(k, 'gun'), k).toContain(spec(k).carriage);
    }
    expect(spec('FR/FA').carriage).not.toBe(spec('BR/FA').carriage);
  });

  it('the horse-artillery carriage is lighter and its gun is smaller', () => {
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16);
    expect(lum(spec('FR/HA').carriage)).toBeGreaterThan(lum(spec('FR/FA').carriage));
    expect(lum(spec('BR/HA').carriage)).toBeGreaterThan(lum(spec('BR/FA').carriage));
    expect(piece('FR/HA', 'gun')).toContain('scale(0.945)');
    expect(piece('FR/FA', 'gun')).toContain('scale(1.05)');
  });

  it('only the Guard artillery carries the marker', () => {
    expect(token('FR/GA')).toContain('data-guard="eagle"');
    for (const k of ARTILLERY.filter((x) => x !== 'FR/GA')) expect(token(k), k).not.toContain('data-guard');
  });

  it('a mounted driver sits on a light draught horse in collar and traces', () => {
    const out = piece('FR/HA', 'driver');
    expect(out).toContain('data-horse="light"');
    expect(out).toContain('data-part="harness"');
    expect(out).toContain('data-rider');
  });

  it('every piece of every key renders in both facings without junk', () => {
    for (const k of ARTILLERY) for (const p of spec(k).pieces) for (let i = 0; i < 4; i++) expect(piece(k, p, i), `${k} ${p} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
    for (const k of ARTILLERY) for (const facing of ['left', 'right'] as const) for (let b = 1; b <= 4; b++) expect(token(k, { blocks: b, facing }), `${k} ${facing} ${b}`).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('every piece clears the leader attach corner where it stands, at every strength and in both facings', () => {
    const CX = 29, CY = -28, R = 12;
    const hits: string[] = [];
    for (const k of ARTILLERY) for (const max of [3, 4] as const) for (let n = 1; n <= max; n++) {
      const slots = SLOTS.gun[Math.min(n, 4) as 1 | 2 | 3 | 4];
      const full = SLOTS.gun[max];
      slots.forEach((sl, idx) => {
        // the slot's index in the full list picks the piece, as the token does
        const fi = n >= 2 ? idx + (full.length - slots.length) : full.length - 1;
        const p = spec(k).pieces[max - 1 - fi] ?? spec(k).pieces[0];
        const { box: [top, bottom, left, right], step } = GUN_PIECE_BOX[p];
        for (const flip of [1, -1]) for (const [t, b, l, r] of [[top, step.y, step.left, step.right], [step.y, bottom, left, right]]) {
          const x0 = sl.x + (flip > 0 ? l : -r) * sl.s;
          const x1 = sl.x + (flip > 0 ? r : -l) * sl.s;
          const d = Math.hypot(Math.max(x0 - CX, 0, CX - x1), Math.max(sl.y + t * sl.s - CY, 0, CY - (sl.y + b * sl.s)));
          if (d < R) hits.push(`${k} ${n}/${max} ${p} flip${flip} d=${d.toFixed(1)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it('uses the nations\' own looks', () => {
    expect(NATION_LOOKS.FR.side.edge).not.toBe(NATION_LOOKS.BR.side.edge);
  });
});
