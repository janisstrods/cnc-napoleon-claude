import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { ARTILLERY, type ArtKey, type ArtilleryKey } from '../../../src/art/nap/keys';
import { NapMiniature } from '../../../src/art/nap/token';
import { GUN_PIECE_BOX, ICON_BOX, ICON_STEP, TEAM_BANDS, TEAM_SLOT, standing } from '../../../src/art/nap/slots';
import { GunTeamFigure } from '../../../src/art/nap/gun';
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

  it('every gun has a gun and two crew at 3 blocks and four pieces at 4 (the horse teams are not block pieces)', () => {
    for (const k of ARTILLERY) {
      const out = token(k, { blocks: 3, maxBlocks: 3 });
      expect(count(out, 'data-piece='), k).toBe(3);
      expect(out).toContain('data-piece="gun"');
      expect(out).not.toContain('data-piece="driver"');
      expect(count(token(k, { blocks: 4, maxBlocks: 4 }), 'data-piece='), k).toBe(4);
    }
  });

  it('every horse-artillery key shows a limber and a pair of draught horses at 4, 3, 2 and 1 blocks, in both facings', () => {
    expect(HORSE.length).toBeGreaterThan(0);
    for (const k of HORSE) for (const facing of ['right', 'left'] as const) for (let b = 1; b <= 4; b++) {
      const out = token(k, { blocks: b, maxBlocks: 4, facing });
      const label = `${k} ${facing} ${b}`;
      expect(count(out, 'data-limber='), label).toBe(1);
      expect(count(out, 'data-horse="light"'), label).toBe(2);
      expect(count(out, 'data-rider'), label).toBe(1);
      expect(out, label).toContain(spec(k).carriage);
    }
  });

  it('foot guns, Guard guns included, show no team', () => {
    for (const k of FOOT) {
      expect(spec(k).team, k).toBeUndefined();
      const out = token(k);
      for (const a of ['data-team', 'data-limber', 'data-horse=', 'data-rider']) expect(out, `${k} ${a}`).not.toContain(a);
    }
    for (const k of HORSE) expect(spec(k).team, k).toBe(true);
  });

  it('the team is not a block piece: its markup is the same at every strength', () => {
    const team = (out: string) => out.slice(out.indexOf('<g data-team-slot'), out.indexOf('<g data-slot='));
    for (const k of HORSE) for (const facing of ['right', 'left'] as const) {
      const full = team(token(k, { blocks: 4, maxBlocks: 4, facing }));
      expect(full.length, k).toBeGreaterThan(500);
      for (const [b, m] of [[3, 3], [2, 3], [1, 3]] as const) expect(team(token(k, { blocks: b, maxBlocks: m, facing })), `${k} ${facing} ${b}/${m}`).toBe(full);
      for (const b of [3, 2, 1]) expect(team(token(k, { blocks: b, maxBlocks: 4, facing })), `${k} ${facing} ${b}`).toBe(full);
    }
  });

  it('the team is drawn before every piece, so the crew and the gun stand in front of it', () => {
    for (const k of HORSE) {
      const out = token(k);
      expect(out.indexOf('data-team-slot'), k).toBeGreaterThan(-1);
      expect(out.indexOf('data-team-slot'), k).toBeLessThan(out.indexOf('data-slot='));
    }
  });

  it('silhouettes differ where a player must tell them apart (colours stripped)', () => {
    for (const [a, b] of [['FR/FA', 'FR/HA'], ['FR/FA', 'FR/GA'], ['FR/FA', 'BR/FA'], ['BR/FA', 'BR/HA']] as const) expect(unit(a), `${a} vs ${b}`).not.toBe(unit(b));
  });

  it('the Guard gunners wear bearskins and the Royal Horse Artillery Tarleton helmets', () => {
    for (const p of ['gun', 'rammer', 'linstock', 'ammo'] as const) expect(piece('FR/GA', p)).toContain('data-head="bearskin"');
    expect(piece('BR/HA', 'rammer')).toContain('data-head="tarleton"');
    expect(token('BR/HA')).toContain('data-head="tarleton"');
    expect(count(svg(h(GunTeamFigure, { spec: spec('BR/HA'), n: NATION_LOOKS.BR })), 'data-head="tarleton"')).toBe(1);
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

  it('the team is a limber hooked to two light draught horses in collar and traces, the near one ridden', () => {
    const out = svg(h(GunTeamFigure, { spec: spec('FR/HA'), n: NATION_LOOKS.FR }));
    expect(count(out, 'data-limber=')).toBe(1);
    expect(count(out, 'data-horse="light"')).toBe(2);
    expect(count(out, 'data-part="harness"')).toBe(2);
    expect(count(out, 'data-rider')).toBe(1);
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('every piece of every key renders in both facings without junk', () => {
    for (const k of ARTILLERY) for (const p of spec(k).pieces) for (let i = 0; i < 4; i++) expect(piece(k, p, i), `${k} ${p} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
    for (const k of ARTILLERY) for (const facing of ['left', 'right'] as const) for (let b = 1; b <= 4; b++) expect(token(k, { blocks: b, facing }), `${k} ${facing} ${b}`).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('every piece clears the leader attach corner where it stands, at every strength and in both facings', () => {
    const CX = 29, CY = -28, R = 12;
    const hits: string[] = [];
    for (const k of ARTILLERY) for (const max of [3, 4] as const) for (let n = 1; n <= max; n++) {
      for (const [sl, fi] of standing('gun', n, max)) {
        // the paint index picks the piece, as the token does
        const p = spec(k).pieces[max - 1 - fi] ?? spec(k).pieces[0];
        const { box: [top, bottom, left, right], step } = GUN_PIECE_BOX[p];
        for (const flip of [1, -1]) for (const [t, b, l, r] of [[top, step.y, step.left, step.right], [step.y, bottom, left, right]]) {
          const x0 = sl.x + (flip > 0 ? l : -r) * sl.s;
          const x1 = sl.x + (flip > 0 ? r : -l) * sl.s;
          const d = Math.hypot(Math.max(x0 - CX, 0, CX - x1), Math.max(sl.y + t * sl.s - CY, 0, CY - (sl.y + b * sl.s)));
          if (d < R) hits.push(`${k} ${n}/${max} ${p} flip${flip} d=${d.toFixed(1)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('the team clears the leader attach corner in both facings (measured bands, stroke included)', () => {
    const CX = 29, CY = -28, R = 12;
    const hits: string[] = [];
    for (const flip of [1, -1]) for (const [t, b, l, r] of TEAM_BANDS) {
      const x0 = TEAM_SLOT.x + (flip > 0 ? l : -r) * TEAM_SLOT.s;
      const x1 = TEAM_SLOT.x + (flip > 0 ? r : -l) * TEAM_SLOT.s;
      const d = Math.hypot(Math.max(x0 - CX, 0, CX - x1), Math.max(TEAM_SLOT.y + t * TEAM_SLOT.s - CY, 0, CY - (TEAM_SLOT.y + b * TEAM_SLOT.s)));
      if (d < R) hits.push(`flip${flip} band ${t}..${b} d=${d.toFixed(1)}`);
    }
    expect(hits).toEqual([]);
  });

  it('draws back to front: the slots are listed by increasing y', () => {
    const ys = standing('gun', 4, 4).map(([sl]) => sl.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(GUN_PIECE_BOX.gun.box).toBe(ICON_BOX.gun);
    expect(GUN_PIECE_BOX.gun.step).toBe(ICON_STEP.gun);
  });
});
