// The Élan / Rally dice panel: one row per die (the die, and the piece it goes to, or "no effect"). A die is armed by
// clicking it; a click on the board then gives the armed die to that piece. The validator's message stands under the list.
import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '../../engine';
import { DieView } from '../kit';
import { assignError, assignOptions, currentAssign, type ElanOrRally } from './assign';
import type { UiSel } from './uiModel';

export function AssignPanel({ s, d, ui, setUi, note, text }: {
  s: GameState;
  d: ElanOrRally;
  ui: UiSel;
  setUi: Dispatch<SetStateAction<UiSel>>;
  /** Why the last board click was refused. */
  note: string | null;
  text: string;
}) {
  const cur = currentAssign(s, d, ui.assign);
  const err = assignError(s, d, cur.ids);
  const set = (next: { die?: number | null; ids?: (string | null)[] }) =>
    setUi((u) => ({ ...u, assign: { die: next.die !== undefined ? next.die : cur.die, ids: next.ids ?? cur.ids } }));
  return (
    <div className="assign-panel" role="group" aria-label={d.kind === 'elan' ? 'Élan dice' : 'Rally dice'}>
      <p className="assign-text">{text}</p>
      <div className="assign-list">
        {d.faces.map((f, i) => {
          const opts = assignOptions(s, d, i);
          const armed = cur.die === i && opts.length > 0;
          return (
            <div key={i} className={`assign-row ${armed ? 'is-armed' : ''}`}>
              <button
                type="button"
                className="assign-die"
                disabled={!opts.length}
                aria-pressed={armed}
                title={opts.length ? 'Arm this die, then click a piece on the board' : undefined}
                onClick={() => set({ die: armed ? null : i })}
              >
                <DieView face={f} size={34} />
              </button>
              {opts.length ? (
                <select
                  aria-label={`Die ${i + 1}`}
                  value={cur.ids[i] ?? ''}
                  onFocus={() => set({ die: i })}
                  onChange={(e) => set({ die: i, ids: cur.ids.map((x, j) => (j === i ? e.target.value || null : x)) })}
                >
                  <option value="">— unused —</option>
                  {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <span className="assign-none">no effect</span>
              )}
            </div>
          );
        })}
      </div>
      {(err ?? note) && <div className="prompt-err" role="alert">{err ?? note}</div>}
    </div>
  );
}
