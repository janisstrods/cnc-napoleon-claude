import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { ARTILLERY, type ArtKey, type ArtilleryKey } from '../../../src/art/nap/keys';
import { NapMiniature } from '../../../src/art/nap/token';
import { standing } from '../../../src/art/nap/slots';
import { HorseHolderFigure } from '../../../src/art/nap/gun';
import { NATION_LOOKS } from '../../../src/art/nap/nations';
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

  it('every gun has a gun and two crew at 3 blocks and four pieces at 4 (the horse holder is not a block piece)', () => {
    for (const k of ARTILLERY) {
      const out = token(k, { blocks: 3, maxBlocks: 3 });
      expect(count(out, 'data-piece='), k).toBe(3);
      expect(out).toContain('data-piece="gun"');
      expect(out).not.toContain('data-piece="driver"');
      expect(count(token(k, { blocks: 4, maxBlocks: 4 }), 'data-piece='), k).toBe(4);
    }
  });

  it('every horse-artillery key shows one mounted gunner holding his horse at 1 to 4 blocks, in both facings, and no limber', () => {
    expect(HORSE.length).toBeGreaterThan(0);
    for (const k of HORSE) for (const facing of ['right', 'left'] as const) for (const max of [3, 4]) for (let b = 1; b <= max; b++) {
      const out = token(k, { blocks: b, maxBlocks: max, facing });
      const label = `${k} ${facing} ${b}/${max}`;
      expect(count(out, '<g data-holder="true"'), label).toBe(1);
      expect(count(out, 'data-horse="light"'), label).toBe(1);
      expect(count(out, 'data-rider'), label).toBe(1);
      expect(out, label).toContain('data-weapon="reins"');
      expect(count(out, 'data-fig='), label).toBe(b);
      for (const a of ['data-limber', 'data-team']) expect(out, `${label} ${a}`).not.toContain(a);
    }
  });

  it('foot guns, Guard guns included, show no holder and no horse', () => {
    for (const k of FOOT) {
      expect(spec(k).holder, k).toBeUndefined();
      for (const b of [1, 3]) {
        const out = token(k, { blocks: b, maxBlocks: 3 });
        for (const a of ['data-holder', 'data-team', 'data-limber', 'data-horse=', 'data-rider']) expect(out, `${k} ${a}`).not.toContain(a);
      }
    }
    for (const k of HORSE) expect(spec(k).holder, k).toBe(true);
  });

  it('the holder is not a block piece: his markup is the same at every strength, and he is drawn before every piece', () => {
    const holder = (out: string) => out.slice(out.indexOf('<g data-holder="true"'), out.indexOf('<g data-slot='));
    for (const k of HORSE) for (const facing of ['right', 'left'] as const) {
      const full = holder(token(k, { blocks: 3, maxBlocks: 3, facing }));
      expect(full.length, k).toBeGreaterThan(500);
      for (const [b, m] of [[2, 3], [1, 3], [4, 4], [1, 4]] as const) expect(holder(token(k, { blocks: b, maxBlocks: m, facing })), `${k} ${facing} ${b}/${m}`).toBe(full);
      const out = token(k, { facing });
      expect(out.indexOf('<g data-holder="true"'), k).toBeLessThan(out.indexOf('data-slot='));
    }
  });

  it('the gun stands front centre, the linstock man behind it, and the rammer out at the muzzle, facing it', () => {
    for (const k of ARTILLERY) for (const facing of ['right', 'left'] as const) {
      const flip = facing === 'right' ? 1 : -1;
      const out = token(k, { blocks: 3, maxBlocks: 3, facing });
      const at = (p: GunPiece) => {
        const m = new RegExp(`<g transform="translate\\(([-\\d.]+) ([-\\d.]+)\\) scale\\(([-\\d.]+) [\\d.]+\\)"><g data-fig="gun" data-piece="${p}"`).exec(out);
        expect(m, `${k} ${facing} ${p}`).not.toBeNull();
        return m!.slice(1).map(Number);
      };
      const [gx, gy] = at('gun');
      const [lx, ly, ls] = at('linstock');
      const [rx, ry, rs] = at('rammer');
      expect(Math.abs(gx), k).toBeLessThanOrEqual(3);
      expect(gy, k).toBeGreaterThan(Math.max(ly, ry)); // in front of both crewmen
      expect(rx * flip, k).toBeGreaterThan(20); // out at the muzzle
      expect(rx * flip, k).toBeGreaterThan(lx * flip + 12); // clear of the linstock man, who stands back by the breech
      expect(Math.sign(ls), k).toBe(flip); // the linstock man faces the enemy
      expect(Math.sign(rs), k).toBe(-flip); // the rammer faces the gun
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    for (const [a, b] of [['FR/FA', 'FR/HA'], ['FR/FA', 'FR/GA'], ['FR/FA', 'BR/FA'], ['BR/FA', 'BR/HA']] as const) expect(unit(a), `${a} vs ${b}`).not.toBe(unit(b));
  });

  it('the Guard gunners wear bearskins and the Royal Horse Artillery Tarleton helmets', () => {
    for (const p of ['gun', 'rammer', 'linstock', 'ammo'] as const) expect(piece('FR/GA', p)).toContain('data-head="bearskin"');
    expect(piece('BR/HA', 'rammer')).toContain('data-head="tarleton"');
    expect(token('BR/HA')).toContain('data-head="tarleton"');
    expect(count(svg(h(HorseHolderFigure, { spec: spec('BR/HA'), n: NATION_LOOKS.BR })), 'data-head="tarleton"')).toBe(1);
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
    expect(piece('FR/HA', 'gun')).toContain('scale(1.008)');
    expect(piece('FR/FA', 'gun')).toContain('scale(1.12)');
  });

  it('only the Guard artillery stands on the gold-rimmed base', () => {
    expect(token('FR/GA')).toContain('data-base-rim="gold"');
    for (const k of ARTILLERY.filter((x) => x !== 'FR/GA')) expect(token(k), k).not.toContain('data-base-rim');
  });

  it('the holder is a light horse at a halt with a gunner in the crew\'s dress holding the reins', () => {
    for (const k of HORSE) {
      const out = svg(h(HorseHolderFigure, { spec: spec(k), n: NATION_LOOKS[k.slice(0, 2) as 'FR'] }));
      expect(count(out, 'data-horse="light"'), k).toBe(1);
      expect(count(out, 'data-rider'), k).toBe(1);
      expect(out, k).toContain('data-weapon="reins"');
      expect(out, k).toContain(`data-head="${spec(k).crew.head.kind}"`);
      expect(out, k).toContain(spec(k).crew.dress.coat);
      expect(out).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('the gunner crouches behind the trail end, drawn behind the near wheel', () => {
    const out = piece('FR/FA', 'gun');
    const crew = out.indexOf('data-crew="gun"');
    const wheels = [...out.matchAll(/data-part="wheel"/g)].map((m) => m.index!);
    expect(crew).toBeGreaterThan(wheels[0]);
    expect(crew).toBeLessThan(wheels[wheels.length - 1]);
  });

  it('every piece of every key renders in both facings without junk', () => {
    for (const k of ARTILLERY) for (const p of spec(k).pieces) for (let i = 0; i < 4; i++) expect(piece(k, p, i), `${k} ${p} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
    for (const k of ARTILLERY) for (const facing of ['left', 'right'] as const) for (let b = 1; b <= 4; b++) expect(token(k, { blocks: b, facing }), `${k} ${facing} ${b}`).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('draws back to front: the gun, in front, is drawn last', () => {
    for (const max of [3, 4]) {
      const ys = standing('gun', max, max).map(([sl]) => sl.y);
      expect(Math.max(...ys)).toBe(ys[ys.length - 1]);
    }
  });
});
