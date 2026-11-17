// Battle picker logic: the boxes as tabs. Pure apart from the tab remembered in storage.
import { EXPANSIONS, type Expansion, type Side } from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { storage, storageKey } from '../storage';

export interface PickerTab {
  id: Expansion;
  label: string;
}

/** Picker tabs in display order, one per box (`EXPANSIONS`): the base game, then Expansion #1. */
export const PICKER_TABS: readonly PickerTab[] = EXPANSIONS.map((e) => ({ id: e.id, label: e.pickerLabel }));

/** The battles the picker and random battle may offer: every battle but the hidden ones (the drill battle 000). */
export function visibleBattles(all: readonly ScenarioInfo[]): ScenarioInfo[] {
  return all.filter((s) => !s.hidden);
}

/** The visible battles of one tab, in the order given (the scenario list is sorted by id). */
export function battlesOf(all: readonly ScenarioInfo[], tab: Expansion): ScenarioInfo[] {
  return visibleBattles(all).filter((s) => s.expansion === tab);
}

/** The tab a key press on the tab list selects: Left/Right step (wrapping around), Home/End the first/last; else none. */
export function tabForKey(current: Expansion, key: string): Expansion | undefined {
  const n = PICKER_TABS.length;
  const i = PICKER_TABS.findIndex((t) => t.id === current);
  const j = key === 'ArrowRight' ? (i + 1) % n : key === 'ArrowLeft' ? (i + n - 1) % n : key === 'Home' ? 0 : key === 'End' ? n - 1 : -1;
  return j < 0 ? undefined : PICKER_TABS[j].id;
}

/**
 * Random battle: any visible battle of `all` except the one shown (`currentId`), so a press always changes it, and a side
 * to command, each equally likely. Null when there is no visible battle. `rand` returns numbers in [0, 1), like Math.random.
 */
export function randomPick(
  all: readonly ScenarioInfo[],
  currentId: string,
  rand: () => number = Math.random,
): { battle: ScenarioInfo; side: Side } | null {
  const shown = visibleBattles(all);
  if (!shown.length) return null;
  const others = shown.filter((s) => s.id !== currentId);
  const pool = others.length ? others : shown;
  const battle = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  return { battle, side: rand() < 0.5 ? 'bottom' : 'top' };
}

const TAB_KEY = storageKey('battle-tab');

/** The tab shown last time (the base game when none is stored or the value is unknown). */
export function loadPickerTab(): Expansion {
  const v = storage.get(TAB_KEY);
  return PICKER_TABS.find((t) => t.id === v)?.id ?? 'base';
}

export function savePickerTab(tab: Expansion) {
  storage.set(TAB_KEY, tab);
}
