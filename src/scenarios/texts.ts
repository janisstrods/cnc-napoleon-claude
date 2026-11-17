// Briefing texts by battle id. Empty until the Napoleonic battles return (Plan 6); the loader reads this table.

export interface ScenarioTexts {
  /** Short original summary of the historical battle. */
  blurb: string;
  /** Plain-language special rules shown in the briefing. */
  specialText?: string[];
  /** One-line hint shown in the battle list. */
  hint: string;
}

export const TEXTS: Record<string, ScenarioTexts> = {};
