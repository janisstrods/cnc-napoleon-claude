// Panels of the game screen around the board: the hover tooltip's frame and the battle log.
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { CARD_DEFS, cardKind, guerrillaHeld, guerrillaPool, guerrillaSide, handShrinkRule, type Decision, type GameState, type Side } from '../../engine';
import { CardView, Icon, Panel } from '../kit';
import type { LogLine } from './controller';
import { handChoices, type UiSel } from './uiModel';

/**
 * Floating unit tooltip that follows the mouse without re-rendering the game screen. It is kept inside the window by its
 * measured size (a unit with a leader, his traits and an objective can be tall).
 */
/** `anchor`: a client position to show the tip at while the keyboard drives the hover (the pointer's last position otherwise). */
export function HoverTip({ active, children, anchor }: { active: boolean; children: React.ReactNode; anchor?: { x: number; y: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // read both sizes before writing either style, so the browser lays the tip out once
    const { offsetWidth: w, offsetHeight: h } = el;
    el.style.left = `${Math.min(pos.current.x + 18, window.innerWidth - Math.max(300, w + 8))}px`;
    el.style.top = `${Math.max(4, Math.min(pos.current.y + 18, window.innerHeight - Math.max(220, h + 8)))}px`;
  }, []);
  useEffect(() => {
    if (anchor) { pos.current = anchor; place(); }
  }, [anchor, place, active]);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener('mousemove', on);
    place();
    return () => window.removeEventListener('mousemove', on);
  }, [active, place]);
  // the content (and so the size) changes with the hovered hex
  useLayoutEffect(place);
  if (!active) return null;
  return <div className="hover-tip" ref={ref}>{children}</div>;
}

export const LogPanel = memo(function LogPanel({ log, human }: { log: LogLine[]; human: Side }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastId = log.length ? log[log.length - 1].id : 0;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);
  return (
    <Panel className="log-panel" title="Battle Log">
      <div className="log-scroll" ref={ref} role="log" aria-label="Battle log">
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.kind} ${l.side ? (l.side === human ? 'log-me' : 'log-them') : ''}`}>
            {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
});

/** Guerrilla counters are drawn at least this large: the glyph loses its detail below it. */
const COUNTER_PX = 26;

/** The guerrilla side's counters: six places, the held ones solid and those in the pool faint, and the counts in words. */
export function GuerrillaCounters({ s, side }: { s: GameState; side: Side }) {
  if (guerrillaSide(s) !== side) return null;
  const held = guerrillaHeld(s);
  const pool = guerrillaPool(s);
  const text = `${held} held · ${pool} in the pool`;
  return (
    <div className="guerrilla-counters" role="group" aria-label={`Guerrilla counters: ${text}`} title="Guerrilla counters: spent against the enemy's card, taken with a Scout">
      {Array.from({ length: held + pool }).map((_, i) => (
        <span key={i} className={`gc ${i < held ? 'is-held' : 'is-pool'}`}>
          <Icon name="guerrilla" size={COUNTER_PX} />
        </span>
      ))}
      <span className="gc-text">{text}</span>
    </div>
  );
}

/** "Hand size 5 (falls with each banner lost, to 3)" for a side whose hand shrinks; nothing for any other. */
export function HandSizeLine({ s, side }: { s: GameState; side: Side }) {
  const r = handShrinkRule(s, side);
  if (!r) return null;
  return <div className="army-cmd army-hand hand-size-line">{`Hand size ${s.special.handSize[side]} (falls with each banner lost, to ${r.floor})`}</div>;
}

/**
 * The card a side committed to at the Move First reveal, face up beside its hand while the side has not finished a turn (it
 * must play it first). Nothing before the reveal, whoever's it is, and nothing for the side that moves first.
 */
export function committedShown(s: GameState, side: Side): boolean {
  const mf = s.special.moveFirst;
  const card = mf?.done ? mf.committed[side] : null;
  return card !== null && card !== undefined && side !== s.first && s.special.turnsDone[side] === 0;
}

export function CommittedCard({ s, side }: { s: GameState; side: Side }) {
  const card = s.special.moveFirst?.committed[side];
  if (!committedShown(s, side) || card === null || card === undefined) return null;
  return (
    <div className="committed-card" data-side={side} title={`Opening card: ${CARD_DEFS[cardKind(card)].title}`}>
      <span className="committed-label">Opening card</span>
      <CardView kind={cardKind(card)} size="sm" />
    </div>
  );
}

/** The human's hand: a card is clickable only when `handChoices` allows it. */
export function HandStrip({ s, d, human, ui, setUi }: { s: GameState; d: Decision | null; human: Side; ui: UiSel; setUi: React.Dispatch<React.SetStateAction<UiSel>> }) {
  const me = s.players[human];
  const choices = handChoices(s, d, human);
  // the human's own opening card stays in the hand, marked and labelled: it is drawn once
  const committed = s.special.moveFirst?.done && s.special.turnsDone[human] === 0 ? s.special.moveFirst.committed[human] : null;
  return (
    <div className="hand-cards" style={{ '--n': me.hand.length } as React.CSSProperties}>
      {me.hand.map((c) => {
        const playable = choices.includes(c);
        return (
          <div key={c} className={`hand-slot ${ui.selCard === c ? 'is-selected' : ''} ${playable ? 'is-playable' : ''} ${c === committed ? 'is-committed' : ''}`}>
            <CardView
              kind={cardKind(c)}
              size="sm"
              selected={ui.selCard === c}
              disabled={!playable}
              onClick={() => playable && setUi({ ...ui, selCard: ui.selCard === c ? null : c })}
              onHover={(hv) => setUi((u) => ({ ...u, hoverCard: hv ? c : u.hoverCard === c ? null : u.hoverCard }))}
            />
            {c === committed && <span className="committed-label hand-committed-label">Opening card</span>}
          </div>
        );
      })}
    </div>
  );
}
