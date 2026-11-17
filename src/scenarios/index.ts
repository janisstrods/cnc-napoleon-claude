// The battles: only the hidden drill battle 000 until the Napoleonic battles return. Setups, rules included, are
// transcribed data (src/scenarios/data); texts are original summaries (texts.ts).
import { EXPANSIONS, type Expansion } from '../engine/expansions';
import type { ScenarioSetup } from '../engine/setup';
import { TEXTS, type ScenarioTexts } from './texts';

export type { Expansion };

/**
 * A scenario file in src/scenarios/data: the `ScenarioSetup` fields (terrain, rivers, units, leaders, objectives, sideRules,
 * unitOverrides) plus the picker's `year`, its box (`expansion`, left out for the base game) and `hidden`. Any other top-level
 * field (`grid`, `notes`, copied rule text) is ignored.
 */
export interface ScenarioJson extends ScenarioSetup {
  year: string;
  expansion?: Expansion;
  /** Left out of the battle picker and random battle (the drill battle 000). */
  hidden?: boolean;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  year: string;
  expansion: Expansion;
  /** Short original summary of the historical battle. */
  blurb: string;
  /** Plain-language special rules shown in the briefing. */
  specialText: string[];
  setup: ScenarioSetup;
  difficultyHint: string;
  /** Not offered by the battle picker or random battle. */
  hidden?: boolean;
}

const files = import.meta.glob<ScenarioJson>('./data/*.json', { eager: true, import: 'default' });

/** Build a scenario from its JSON data and texts. The setup is a deep copy: nothing in it shares the JSON's objects. */
export function scenarioFromJson(j: ScenarioJson): ScenarioInfo {
  const expansion = j.expansion ?? 'base';
  if (!EXPANSIONS.some((e) => e.id === expansion)) throw new Error(`unknown expansion ${String(j.expansion)} (${j.id})`);
  for (const k of ['terrain', 'units', 'leaders'] as const) if (!Array.isArray(j[k])) throw new TypeError(`${k} must be a list`);
  const texts: ScenarioTexts | undefined = TEXTS[j.id];
  const setup: ScenarioSetup = structuredClone({
    id: j.id, name: j.name, top: j.top, bottom: j.bottom, first: j.first, banners: j.banners, terrain: j.terrain, units: j.units, leaders: j.leaders,
  });
  if (j.rivers !== undefined) setup.rivers = j.rivers;
  if (j.objectives !== undefined) setup.objectives = structuredClone(j.objectives);
  if (j.sideRules !== undefined) setup.sideRules = structuredClone(j.sideRules);
  if (j.unitOverrides !== undefined) setup.unitOverrides = structuredClone(j.unitOverrides);
  return {
    id: j.id,
    name: j.name,
    year: j.year,
    expansion,
    blurb: texts?.blurb ?? '',
    specialText: texts?.specialText ?? [],
    setup,
    difficultyHint: texts?.hint ?? '',
    ...(j.hidden ? { hidden: true } : {}),
  };
}

/**
 * Build every scenario file (path -> JSON), sorted by id. A malformed file throws an Error naming the file and its id,
 * with the original error as `cause`.
 */
export function scenariosFromFiles(byPath: Record<string, ScenarioJson>): ScenarioInfo[] {
  return Object.entries(byPath)
    .map(([path, json]) => {
      try {
        return scenarioFromJson(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const id = json && typeof json === 'object' && typeof json.id === 'string' ? json.id : undefined;
        const named = id !== undefined && msg.includes(`(${id})`);
        throw new Error(`scenario file ${path}${id !== undefined && !named ? ` (${id})` : ''}: ${msg}`, { cause: e });
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const SCENARIOS: ScenarioInfo[] = scenariosFromFiles(files);

export function scenarioById(id: string): ScenarioInfo {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}
