// The Napoleonic rules reference (Plan 4 Task 8): units by nation, the 70 cards, terrain row keys, the dice table, plain
// "Our reading:" notes (R1), expansion tabs from the unit table, British spelling.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARD_DEFS, EXPANSIONS, NATIONS, NATION_NAMES, UNIT_KEYS, UNIT_STATS, nationOf, type CardKind } from '../../src/engine';
import { RULES_TEXT, rulesTabs, type RulesTab } from '../../src/ui/screens/rulesText';
import { RulesReference, RulesTabBody, terrainRows } from '../../src/ui/screens/RulesReference';

const body = (tab: RulesTab): string => renderToStaticMarkup(createElement(RulesTabBody, { tab }));
const text = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ');
const ALL_TABS = rulesTabs().map(([t]) => t);

describe('the rules reference content', () => {
  it('every Command card appears once with its count, 70 in all', () => {
    const html = body('cards');
    const titles = [...html.matchAll(/<div class="unit-card-title">([\s\S]*?)<\/div>/g)].map((m) => text(m[1]));
    for (const k of Object.keys(CARD_DEFS) as CardKind[]) {
      const hits = titles.filter((t) => t.startsWith(`${CARD_DEFS[k].title} ×${CARD_DEFS[k].count}`));
      expect(hits, k).toHaveLength(1);
    }
    expect(titles).toHaveLength(Object.keys(CARD_DEFS).length);
    expect(titles.reduce((n, t) => n + Number(/×(\d+)/.exec(t)![1]), 0)).toBe(70);
    // section cards before tactic cards
    expect(html.indexOf('Scout Left')).toBeLessThan(html.indexOf('Bayonet Charge'));
  });

  it("the Units tab groups the base rows by nation: French, British, Portuguese, Allied", () => {
    const html = body('units');
    const names = ['French', 'British', 'Portuguese', 'Allied'];
    const heads = [...html.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]).filter((h) => names.includes(h));
    expect(heads).toEqual(names);
    const parts = html.split(/<h3>/).filter((p) => names.some((n) => p.startsWith(`${n}<`)));
    expect(parts).toHaveLength(4);
    for (const [i, n] of NATIONS.filter((x) => names.includes(NATION_NAMES[x])).entries()) {
      const keys = UNIT_KEYS.filter((k) => nationOf(k) === n && UNIT_STATS[k].expansion === 'base');
      expect(keys.length).toBeGreaterThan(0);
      expect(parts[i].split('class="unit-card"').length - 1, n).toBe(keys.length);
      for (const k of keys) expect(parts[i], k).toContain(`${NATION_NAMES[n]} ${UNIT_STATS[k].name}`);
    }
    expect(text(html)).toMatch(/rounds? down/);
    expect(text(html)).toMatch(/rounds? up/);
  });

  it('the Hill row has its icon; Hill relations is its own row', () => {
    const rows = terrainRows();
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    const trs = [...body('terrain').matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    const th = (tr: string) => text(/<th>([\s\S]*?)<\/th>/.exec(tr)![1]).trim();
    const hill = trs.find((tr) => th(tr) === 'Hill')!;
    const rel = trs.find((tr) => th(tr) === 'Hill relations')!;
    expect(hill).toContain('<svg');
    expect(rel).not.toContain('<svg');
    expect(rows).toHaveLength(trs.length);
  });

  it('the dice section shows the five faces and what each does', () => {
    const html = body('combat');
    for (const f of ['Infantry', 'Cavalry', 'Artillery', 'Flag', 'Sabre']) expect(html).toContain(`aria-label="${f}"`);
    expect((html.match(/role="img"/g) ?? []).length).toBe(5);
    const table = /<table class="dice-table">([\s\S]*?)<\/table>/.exec(html)![1];
    expect(text(/<thead>([\s\S]*?)<\/thead>/.exec(table)![1])).toMatch(/Fire.*Melee.*lone leader.*Retire and Reform/i);
    const rows = [...table.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)][0][1].split('<tr>').slice(1);
    expect(rows).toHaveLength(5);
    for (const r of rows) expect((r.match(/<td>/g) ?? []).length).toBe(4);
  });

  it('play-affecting readings appear as plain notes', () => {
    const all = ALL_TABS.map((t) => text(body(t))).join(' ');
    expect((all.match(/Our reading:/g) ?? []).length).toBeGreaterThanOrEqual(4);
    const readings = Object.values(RULES_TEXT).flat().flatMap((b) => (b.reading ? [b.reading] : []));
    expect(readings.length).toBeGreaterThanOrEqual(4);
    for (const r of readings) {
      expect(r).not.toContain('[Interp');
      expect(r).not.toMatch(/\bR\d+\b/);
    }
    expect(all).not.toMatch(/\bR\d{1,2}\b/);
    expect(text(body('squares'))).toContain('Our reading:');
  });

  it('an expansion tab appears only when the expansion has unit rows', () => {
    const html = renderToStaticMarkup(createElement(RulesReference));
    const tabs = [...[...html.matchAll(/<nav class="rules-tabs">([\s\S]*?)<\/nav>/g)][0][1].matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    expect(tabs).toEqual(['Basics', 'Units', 'Combat', 'Squares & Combined Arms', 'Terrain', 'Cards']);
    for (const e of EXPANSIONS.filter((x) => x.number > 0)) {
      const has = UNIT_KEYS.some((k) => UNIT_STATS[k].expansion === e.id);
      expect(tabs.includes(e.name)).toBe(has);
      expect(rulesTabs().some(([t]) => t === e.id)).toBe(has);
    }
  });

  it('no American spellings, ruling marks or placeholder notes', () => {
    for (const t of ALL_TABS) {
      const s = text(body(t)).replace(/Commands & Colou?rs/g, '');
      expect(s, t).not.toMatch(/\b(color|colors|center|maneuver|defense|armor|honor)\b/i);
      expect(s, t).not.toContain('[Interp');
      expect(s, t).not.toContain('arrives with');
      expect(s, t).not.toContain('Plan ');
    }
  });

  it('Command is fixed when the card is played; Short Supply keeps a unit on its own baseline', () => {
    expect(text(body('basics'))).toMatch(/Our reading: .*Command.*(played|card is played)/);
    expect(text(body('cards'))).toMatch(/Our reading: .*already .*own baseline/);
  });

  it('review round 1: layout, prose and readings', () => {
    const css = readFileSync('src/ui/screens/screens.css', 'utf8');
    expect(/\.rules-battle \{[^}]*flex: 0 0 auto/.test(css) || /\.rules-battle \{[^}]*flex-shrink: 0/.test(css)).toBe(true);
    expect(/\.rules-body \{[^}]*min-height: 0/.test(css)).toBe(true);
    const all = ALL_TABS.map((t) => text(body(t))).join(' ');
    expect(all).not.toMatch(/cost more than attacking downhill/);
    expect(all).not.toMatch(/ignores flags by its type/);
    expect(all).not.toMatch(/\btoward\b/);
    expect(all).not.toMatch(/third blocked hex/);
    expect(text(body('basics'))).toContain('Let the general decide');
    for (const [tab, h] of [['combat', 'Melee'], ['squares', 'Taking ground'], ['terrain', 'Field Works']] as const)
      expect(RULES_TEXT[tab].find((b) => b.heading === h)?.reading, h).toBeTruthy();
    const french = RULES_TEXT.units.find((b) => b.heading === 'French')!;
    expect(french.paragraphs.join(' ')).not.toMatch(/Rifles/);
    const names = terrainRows().map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    const rows = [...body('terrain').matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => text(m[1]));
    for (const n of ['Town', 'Windmill', 'Fortress']) expect(rows.find((r) => r.trim().startsWith(n)), n).toMatch(/Cavalry Charge/);
    expect(rows.find((r) => r.trim().startsWith('Bridge')), 'Bridge').toMatch(/river/i);
    expect(rows.find((r) => r.trim().startsWith('Brook')), 'Brook').toMatch(/battle/i);
    const cards = text(body('cards'));
    for (const w of ['Grande Manoeuvre', 'Guard heavy cavalry', 'every leader', 'own turn']) expect(cards).toContain(w);
  });
});
