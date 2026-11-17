import { describe, expect, it } from 'vitest';

const FILES = import.meta.glob('../../../src/art/nap/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const GALLERY = import.meta.glob('../../../src/dev/FigureGallery.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const NAMES = [/['"`](FR|BR|PT|AL)(\/[A-Z]{2,3})?['"`]/, /['"`](LN|LT|RI|GR|YG|OG|GG|ML|LC|LNC|HC|CU|GLC|GHC|FA|HA|GA)['"`]/];
const isName = (line: string) => NAMES.some((r) => r.test(line));
const code = (src: string) => src.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).map((l) => l.replace(/\s\/\/.*$/, ''));

/** Every module specifier imported or re-exported, including multi-line and side-effect imports. */
function importsOf(src: string): string[] {
  return [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g), ...src.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

describe('art/nap guards', () => {
  it('finds the files', () => expect(Object.keys(FILES).length).toBeGreaterThan(20));

  it('imports stay inside the module, react, color and codes', () => {
    const bad: string[] = [];
    for (const [path, src] of Object.entries(FILES)) {
      const rel = path.replace('../../../src/art/nap/', '');
      for (const spec of importsOf(src)) {
        if (spec === 'react') continue;
        if (!spec.startsWith('.')) { bad.push(`${rel}: ${spec}`); continue; }
        // resolve against src/art/nap/<dir of file>, as a path under src/
        const stack = ['art', 'nap', ...rel.split('/').slice(0, -1)];
        for (const seg of spec.split('/')) {
          if (seg === '..') stack.pop();
          else if (seg !== '.') stack.push(seg);
        }
        const target = stack.join('/');
        const ok = target.startsWith('art/nap/') || target === 'art/color' || target === 'engine/codes';
        if (!ok) bad.push(`${rel}: ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the import scan catches multi-line and side-effect imports', () => {
    const src = "import {\n  a,\n  b,\n} from '../../ui/secret';\nimport './sideeffect';\nexport { c } from \"../x\";\nimport d from 'react';";
    expect(importsOf(src)).toEqual(['../../ui/secret', '../x', 'react', './sideeffect']);
  });

  it('the name check hits and misses what it should', () => {
    for (const l of ["if (n === 'FR')", "case 'BR/RI':", 'code === "CU"']) expect(isName(l), l).toBe(true);
    for (const l of ['codeOf(k)', "spec.head.kind === 'shako'"]) expect(isName(l), l).toBe(false);
  });

  it('drawing code never names a nation or a unit code', () => {
    const bad: string[] = [];
    for (const [path, src] of Object.entries(FILES)) {
      const rel = path.replace('../../../src/art/nap/', '');
      if (rel === 'keys.ts' || rel === 'nations.ts' || rel.startsWith('specs/')) continue;
      code(src).forEach((l, n) => isName(l) && bad.push(`${rel}:${n + 1}: ${l.trim()}`));
    }
    expect(bad).toEqual([]);
  });

  it('the gallery does not read scenarios', () => {
    const src = Object.values(GALLERY)[0];
    expect(src).toBeTruthy();
    expect(importsOf(src).filter((s) => /scenarios/.test(s))).toEqual([]);
  });
});
