// Plan 7C Task 16: log, tooltip and objective wording for the Spanish expansion (RR §15–§16).
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARD_DEFS, UNIT_KEYS, UNIT_STATS, cardKind, createGame, hexId, type GameEvent, type GameState, type ObjectiveDef, type RowKey, type Unit } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { eventLog, rollSummary, rollTitle } from '../../src/ui/game/logText';
import { commandText } from '../../src/ui/game/squareText';
import { objectiveMarkerText, majorityMarkerText, objectiveSummary, objectiveTipLines } from '../../src/ui/game/objectiveText';
import { unitSummary } from '../../src/ui/game/unitText';
import { ObjectiveMarkers } from '../../src/ui/terrain/objectives';
import { build } from '../rules/helpers';

// top = French, bottom = British (the QA kit)
const s: GameState = build({
  units: [
    { side: 'bottom', key: 'BR/LN', at: [6, 6] },
    { side: 'top', key: 'FR/LN', at: [2, 6] },
    { side: 'top', key: 'FR/LNC', at: [2, 7] },
    { side: 'top', key: 'FR/SWI', at: [2, 8] },
  ],
});
const BR_LN = 'u1', FR_LNC = 'u3', FR_SWI = 'u4';
const line = (e: GameEvent, st: GameState = s) => eventLog(e, st, st, 'bottom');
const title = (card: number): string => CARD_DEFS[cardKind(card)].title;

describe('log lines for the Spanish events', () => {
  it('guerrilla stood, cancelled and gained', () => {
    // the guerrilla side is `bottom` here; its opponent is the French
    expect(line({ t: 'guerrilla', side: 'bottom', what: 'stood', held: 2, pool: 4 })!.text).toBe('The guerrillas strike, but the French card stands (sabre).');
    expect(line({ t: 'guerrilla', side: 'bottom', what: 'cancelled', held: 1, pool: 5 })!.text).toBe('Guerrillas cut the French orders: the card is lost.');
    expect(line({ t: 'guerrilla', side: 'bottom', what: 'gained', held: 3, pool: 3 })!.text).toBe('The British army gains a Guerrilla counter (3 held).');
  });

  it('moveFirst names both cards and values, or no card', () => {
    const t0 = title(0), t1 = title(1);
    const both: GameEvent = { t: 'moveFirst', picks: { top: 0, bottom: 1 }, values: { top: 3, bottom: 2 }, first: 'top' };
    expect(line(both)!.text).toBe(`Opening cards: French: ${t0} (3); British: ${t1} (2). The French army moves first.`);
    const none: GameEvent = { t: 'moveFirst', picks: { top: 0, bottom: null }, values: { top: 3, bottom: 99 }, first: 'top' };
    expect(line(none)!.text).toBe(`Opening cards: French: ${t0} (3); British: no card. The French army moves first.`);
  });

  it('a broken unit leaves the field, and the engine note with its raw id stays silent', () => {
    expect(line({ t: 'removed', id: FR_SWI, reason: 'broken' })!.text).toBe('French Swiss Infantry leaves the field.');
    expect(line({ t: 'log', text: 'u4 leaves the field (broken).', side: 'top' })).toBeNull();
  });

  it('a face-up discard (hand shrink or Scout) names the card', () => {
    expect(line({ t: 'discarded', side: 'top', card: 0 })!.text).toBe(`The French army discards ${title(0)}, face up.`);
  });

  it('a re-rolled roll carries the suffix in its title and its own line', () => {
    expect(rollTitle('melee', FR_LNC, BR_LN, s, true)).toBe('French Lancers attacks — flags re-rolled');
    expect(rollTitle('melee', FR_LNC, BR_LN, s)).toBe('French Lancers attacks');
    const e: GameEvent = { t: 'roll', purpose: 'melee', faces: ['infantry'], scoring: [true], by: FR_LNC, against: BR_LN, reroll: true };
    expect(line(e)!.text).toBe('→ re-rolled flags: 1 hit.');
    expect(line({ ...e, from: [FR_LNC, 'u2'] } as GameEvent)!.text).toBe('→ re-rolled flags (with guns): 1 hit.');
  });

  it('the Guerrilla roll is titled and summarised', () => {
    expect(rollTitle('guerrilla', null, null, s)).toBe('Guerrilla Action');
    expect(rollSummary('guerrilla', ['sabre'], [true])).toBe('Sabre: the card stands');
    expect(rollSummary('guerrilla', ['flag'], [false])).toBe('No sabre: the card is lost');
    const l = line({ t: 'roll', purpose: 'guerrilla', faces: ['flag'], scoring: [false], by: null, against: null })!.text;
    expect(l).toBe('Guerrilla Action — No sabre: the card is lost.');
  });

  it('exit banners name the unit, never a raw id or {unit}', () => {
    const g = createGame(scenarioById('102').setup, 3);
    const u = g.units.find((x) => x.side === 'top')!;
    const ev: GameEvent = { t: 'banner', side: 'top', total: 1, reason: `Spanish ${u.id} leaves by the Spanish baseline.` };
    const text = eventLog(ev, g, g, 'bottom')!.text;
    expect(text).not.toMatch(/\bu\d+\b|\{unit\}/);
    expect(text).toContain(`Spanish ${UNIT_STATS[u.key].name} leaves by the Spanish baseline.`);
    // the unit is already gone from both states: still no raw id
    const gone = { ...g, units: g.units.filter((x) => x.id !== u.id) } as GameState;
    expect(eventLog(ev, gone, gone, 'bottom')!.text).toBe(`The ${gone.players.top.army} army gains a Victory Banner (1/${gone.bannersToWin}) — Spanish unit leaves by the Spanish baseline.`);
  });

  it('no new line names a raw unit id', () => {
    const evs: GameEvent[] = [
      { t: 'guerrilla', side: 'bottom', what: 'stood', held: 2, pool: 4 },
      { t: 'moveFirst', picks: { top: 0, bottom: 1 }, values: { top: 3, bottom: 2 }, first: 'top' },
      { t: 'removed', id: FR_SWI, reason: 'broken' },
      { t: 'discarded', side: 'top', card: 0 },
      { t: 'roll', purpose: 'melee', faces: ['flag'], scoring: [false], by: FR_LNC, against: BR_LN, reroll: true, from: [FR_LNC, 'u2'] },
    ];
    for (const e of evs) expect(line(e)!.text, e.t).not.toMatch(/\bu\d+\b/);
  });
});

describe('unit tooltip lines for the new rows', () => {
  const lines = (k: RowKey) => unitSummary({ id: 'u1', side: 'top', key: k, hex: 0, blocks: 4, maxBlocks: 4 } as Unit);
  it('Spanish line infantry: fire and melee after moving, 2-hex retreat', () => {
    expect(lines('SP/LN')).toContain('After moving: melee 1 die less.');
    expect(lines('SP/LN')[0]).toContain('Retreat 2 hexes per flag');
    expect(lines('SP/LN').some((l) => l.startsWith('Retreats'))).toBe(false);
  });
  it('Spanish light infantry: melee only after moving', () => {
    expect(lines('SP/LT')).toContain('After moving: melee 1 die less.');
  });
  it('Spanish militia retreat 3 hexes', () => {
    expect(lines('SP/ML')[0]).toContain('Retreat 3 hexes per flag');
    expect(lines('SP/ML')).toContain('After moving: melee 1 die less.');
  });
  it('lancers re-roll flags, cuirassiers are immune, and no other row says either', () => {
    expect(lines('FR/LNC')).toContain('Re-rolls flags once when it attacks or strikes first (not against cuirassiers).');
    expect(lines('SP/CU')).toContain('Lancers do not re-roll flags against it.');
    for (const k of UNIT_KEYS) {
      if (k !== 'FR/LNC') expect(lines(k).join('|'), k).not.toContain('Re-rolls flags');
      if (!UNIT_STATS[k].immuneToFlagReroll || UNIT_STATS[k].expansion === 'base') expect(lines(k).join('|'), k).not.toContain('Lancers do not');
    }
  });
  it('base rows without a moving penalty gain no After-moving line', () => {
    expect(lines('FR/LN').join('|')).not.toContain('After moving');
  });
});

describe('objective words', () => {
  const g114 = createGame(scenarioById('114').setup, 5);
  const g102 = createGame(scenarioById('102').setup, 5);
  const g105 = createGame(scenarioById('105').setup, 5);
  const g115 = createGame(scenarioById('115').setup, 5);
  
  it('tempAny: banners, the hexes, and the held state', () => {
    const o = g115.scenario.objectives.findIndex((x) => x.kind === 'tempAny');
    const ob = g115.scenario.objectives[o] as Extract<ObjectiveDef, { kind: 'tempAny' }>;
    const sum = objectiveSummary(g115, ob.side).find((l) => l.startsWith('The French hold Albuera'))!;
    expect(sum).toBe(`The French hold Albuera: 1 banner while a ${g115.players[ob.side].army} unit stands on any of these ${ob.hexes.length} hexes at the start of its turn`);
    const held = structuredClone(g115) as GameState;
    held.special.objState[o].held = true;
    expect(objectiveSummary(held, ob.side).find((l) => l.startsWith('The French hold Albuera'))).toContain('(held now)');
    expect(objectiveTipLines(g115, ob.hexes[0]).some((l) => l.startsWith('The French hold Albuera'))).toBe(true);
  });

  it('majority: names the holder, or no one', () => {
    const idx = g114.scenario.objectives.findIndex((x) => x.kind === 'majority' && x.startHeld);
    const o = g114.scenario.objectives[idx] as Extract<ObjectiveDef, { kind: 'majority' }>;
    const startHolder = o.side;
    const text = objectiveSummary(g114, startHolder).find((l) => l.includes('Barrosa Ridge'))!;
    expect(text).toBe(`Barrosa Ridge: 1 banner while it holds more of these ${o.hexes.length} hexes than the enemy at the start of its turn (lost at once on a tie) — held by the ${g114.players[startHolder].army} army`);
    const none = structuredClone(g114) as GameState;
    none.special.objState.forEach((x) => { x.held = false; });
    expect(objectiveSummary(none, startHolder).find((l) => l.includes('Barrosa Ridge'))).toMatch(/ — held by no one$/);
    const tip = objectiveTipLines(none, o.hexes[0]);
    expect(tip).toHaveLength(1);   // a contested group is one line, not one per side
    expect(tip[0]).toContain('more of these');
    expect(tip[0]).toContain('lost at once on a tie');
    expect(tip[0]).toContain('held by no one');
  });

  it('majority marker title: neutral while nobody holds it', () => {
    const o = g114.scenario.objectives.filter((x) => x.kind === 'majority') as Extract<ObjectiveDef, { kind: 'majority' }>[];
    expect(majorityMarkerText(o, undefined)).toBe('Barrosa Ridge: held by neither side');
    expect(majorityMarkerText(o, 0)).toBe(o[0].text);
    expect(majorityMarkerText([{ ...o[0], text: 'The Spanish hold the left hills.' }], undefined)).toBe('The left hills: held by neither side');
  });

  it('exitEdge: free exits used, then the banner', () => {
    const o = g102.scenario.objectives.findIndex((x) => x.kind === 'exitEdge');
    const ob = g102.scenario.objectives[o] as Extract<ObjectiveDef, { kind: 'exitEdge' }>;
    const used = structuredClone(g102) as GameState;
    used.special.objState[o].count = 2;
    const sum = objectiveSummary(used, ob.side).find((l) => l.includes('baseline'))!;
    expect(sum).toBe('Spanish unit leaves by the Spanish baseline: 2 of 3 free exits used; each later exit scores 1 banner');
    expect(objectiveTipLines(used, hexId(ob.row, 1))[0]).toContain('2 of 3 free exits used');
    expect(objectiveTipLines(used, hexId(4, 1))).toEqual([]);
  });

  it('suddenDeath: batteries left before the other side wins', () => {
    const o = g105.scenario.objectives.findIndex((x) => x.kind === 'suddenDeath');
    const ob = g105.scenario.objectives[o] as Extract<ObjectiveDef, { kind: 'suddenDeath' }>;
    const st = structuredClone(g105) as GameState;
    st.special.objState[o].count = 1;
    const text = objectiveSummary(st, ob.side).find((l) => l.startsWith('Sudden death'))!;
    expect(text).toBe(`Sudden death: ${ob.need - 1} ${st.players[ob.side === 'top' ? 'bottom' : 'top'].army} ${ob.need - 1 === 1 ? 'battery' : 'batteries'} left before the ${st.players[ob.side].army} win`);
  });

  it('marker text never shows {unit}', () => {
    const o = g102.scenario.objectives.find((x) => x.kind === 'exitEdge')!;
    expect(objectiveMarkerText(o)).toBe('Spanish unit leaves by the Spanish baseline.');
    const html = renderToStaticMarkup(createElement('svg', null, createElement(ObjectiveMarkers, { objectives: g102.scenario.objectives, objState: g102.special.objState, flipped: false, nations: { top: 'SP', bottom: 'FR' } } as never)));
    expect(html).not.toContain('{unit}');
  });
});

describe('hand size', () => {
  it('the Command line reads the hand size now, not the scenario starting size', () => {
    const g = createGame(scenarioById('106').setup, 2);
    g.special.handSize.top = 3;
    expect(commandText(g, 'top')).toBe(`Hand ${g.players.top.hand.length} of 3${g.players.top.squareTrack.some((c) => c != null) ? ' · 1 on the square track' : ''}`);
  });
});
