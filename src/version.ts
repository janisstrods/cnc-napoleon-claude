/**
 * Published releases, newest first; the first is shown on the main menu. Each is named after a battle of the game that
 * suits what it brought (no fixed order, never reused). Bump for every publish, together with package.json's version.
 */
export const RELEASES = [
  { number: '1.0.2', name: 'Vimiero', notes: 'The hill tooltip now says that a hill blocks line of sight beyond it, except across one connected hill (it wrongly said hills never block sight; play was already correct)' },
  { number: '1.0.1', name: 'Corunna', notes: 'Smoother marching: a unit the computer moves stays where it marched, instead of jumping back until the next unit moves (most visible with Force March)' },
  { number: '1.0.0', name: 'Talavera', notes: 'The base game (battles 001–015) and Expansion #1, The Spanish Army (battles 101–118), against a computer general at three levels, with original miniatures, the history of every battle, Triumphs medals and the rules in the game' },
] as const;

export const RELEASE = RELEASES[0];

declare const __BUILD_TIME__: string;

/** When this bundle was built (ISO, UTC), or null in the dev server. */
export const BUILD_TIME: string | null = import.meta.env.DEV ? null : __BUILD_TIME__;

/** "build 2026-10-10 14:05 UTC", or "dev build". */
export function buildLabel(iso: string | null): string {
  return iso ? `build ${iso.slice(0, 16).replace('T', ' ')} UTC` : 'dev build';
}
