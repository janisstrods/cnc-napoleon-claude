// The hidden-information scan (Plan 5, ruling 1): only src/ai/view.ts may touch the deck, hands, square tracks and the game
// RNG, or clone/replay a state. Every other AI source file is parsed with the TypeScript compiler and walked as an AST, so
// formatting, optional chaining, split lines and nested or parameter destructuring cannot hide an access (comments and
// strings are never flagged).
//
// This is a TRIPWIRE, not the guarantee: code can still reach hidden data indirectly. The guarantee is Task 9's re-deal
// invariance test (tests/ai/hidden-info.slow.test.ts), which re-deals the hidden cards and expects identical answers.
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// `picks`: a side's Move First pick (special.moveFirst.picks), secret until the reveal (RR §15.8, S44); view.ts redacts it
const FIELDS = new Set(['deck', 'hand', 'squareTrack', 'rng', 'rngCalls', 'picks']);
/** Identifiers that copy or replay a state with its real hidden data (GameDriver's constructor clones deck and rng). */
const BANNED = new Set(['cloneState', 'structuredClone', 'GameDriver']);

const nameText = (n: ts.Node | undefined): string | null =>
  n && (ts.isIdentifier(n) || ts.isStringLiteralLike(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null;

/** Offending nodes of a source text as `file:line: what`. */
export function violations(src: string, file = 'x.ts'): string[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const flag = (n: ts.Node, what: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    out.push(`${file}:${line + 1}: ${what}`);
  };
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAccessExpression(n)) {
      if (FIELDS.has(n.name.text)) flag(n, `property access .${n.name.text}`);
      if (n.name.text === 'parse' && ts.isIdentifier(n.expression) && n.expression.text === 'JSON') flag(n, 'JSON.parse');
    } else if (ts.isElementAccessExpression(n)) {
      const k = nameText(n.argumentExpression);
      if (k !== null && FIELDS.has(k)) flag(n, `element access ['${k}']`);
    } else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
      const k = nameText(n.propertyName) ?? nameText(n.name);
      if (k !== null && FIELDS.has(k)) flag(n, `destructuring of ${k}`);
    } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isObjectLiteralExpression(n.left)) {
      const walk = (m: ts.Node): void => {
        if ((ts.isShorthandPropertyAssignment(m) || ts.isPropertyAssignment(m)) && FIELDS.has(nameText(m.name) ?? '')) flag(m, `destructuring assignment of ${nameText(m.name)}`);
        ts.forEachChild(m, walk);
      };
      walk(n.left);
    }
    if (ts.isIdentifier(n) && BANNED.has(n.text)) flag(n, `banned ${n.text}`);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const VIEW = '../../src/ai/view.ts';
const files = import.meta.glob('../../src/ai/**/*.{ts,tsx,js,mjs}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('hidden information', () => {
  it('only view.ts touches deck, hand, squareTrack, rng, rngCalls, moveFirst.picks, cloneState, structuredClone, JSON.parse or GameDriver', () => {
    const names = Object.keys(files).filter((f) => f !== VIEW);
    expect(names.length).toBeGreaterThan(3);
    expect(Object.keys(files)).toContain(VIEW);
    expect(names.flatMap((f) => violations(files[f], f.replace('../../', '')))).toEqual([]);
  });

  it('the scan sees view.ts itself touching the fields (so the exemption is real)', () => {
    expect(violations(files[VIEW], VIEW).length).toBeGreaterThan(5);
  });

  describe('self-test: planted cases are flagged', () => {
    const planted: Record<string, string> = {
      'dot access': 'const x = s.players.top.hand;',
      'optional chain': 'const x = p?.hand;',
      'split dot access': 'const x = s\n  .players\n  .top\n  .squareTrack;',
      'bracket access': "const x = p['squareTrack'];",
      'template bracket access': 'const x = p[`deck`];',
      'plain destructuring': 'const { deck, discard } = s;',
      'parameter destructuring': 'const f = ({ hand }: PlayerState) => hand.length;',
      'nested destructuring': 'const { players: { top: { hand: hh } } } = s;',
      'multi-line destructuring': 'const {\n  discard,\n  rngCalls,\n} = s;',
      'renamed destructuring': 'const { rng: r } = s;',
      'move first pick': 'const p = s.special.moveFirst?.picks[side];',
      'move first picks destructured': 'const { picks } = s.special.moveFirst!;',
      'destructuring assignment': 'let hand; ({ hand } = p);',
      cloneState: 'const c = cloneState(s);',
      structuredClone: 'const c = structuredClone(s);',
      'JSON.parse': 'const c = JSON.parse(JSON.stringify(s));',
      GameDriver: 'const d = new GameDriver(s);',
    };
    for (const [name, src] of Object.entries(planted)) {
      it(name, () => expect(violations(src).length).toBeGreaterThan(0));
    }
  });

  it('innocent code is not flagged (comments, strings, near-miss names)', () => {
    const ok = [
      '// s.hand and cloneState(s) in a comment',
      "const t = 'deck hand squareTrack rng';",
      'const ok = s.discard.length + s.turn.card + hands + deckSize + handSize(s, me);',
      'const { discard, units } = s;',
      'const r = new Rng(1); r.next();',
      'JSON.stringify(x);',
    ].join('\n');
    expect(violations(ok)).toEqual([]);
  });
});
