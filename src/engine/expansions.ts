// The boxes of the game: the base game and its expansions, in order. Everything keyed by box derives from this table:
// a battle file's `expansion` (src/scenarios), the box of a unit row (`UnitStats.expansion`), the battle picker's tabs, the rules reference's tabs and the briefing texts by box.
// A new expansion is one row here, then its battles, texts and rules tab (the compiler asks for each table keyed by box).

export interface ExpansionDef {
  /** Id of the box: a battle file's `expansion` (which the base game's files leave out). */
  id: string;
  /** 0 the base game, then 1, ... (`UnitStats.expansion`). */
  number: number;
  /** Its name in the rules reference: the base game's rules are the general tabs, each expansion has a tab of this name. */
  name: string;
  /** Its tab in the battle picker. */
  pickerLabel: string;
}

export const EXPANSIONS = [
  { id: 'base', number: 0, name: 'Base game', pickerLabel: 'The Peninsula & Waterloo' },
  { id: 'exp1', number: 1, name: 'Expansion #1', pickerLabel: 'The Spanish Army' },
] as const satisfies readonly ExpansionDef[];

/** Which box a battle comes from (`EXPANSIONS` id). */
export type Expansion = (typeof EXPANSIONS)[number]['id'];

/** The box that brings a unit row, by number: 0 the base game, 1 Expansion #1. */
export type ExpansionNumber = (typeof EXPANSIONS)[number]['number'];
