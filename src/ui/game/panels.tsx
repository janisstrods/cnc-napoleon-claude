// Panels of the game screen around the board: the hover tooltip's frame and the battle log.
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Side } from '../../engine';
import { Panel } from '../kit';
import type { LogLine } from './controller';

/**
 * Floating unit tooltip that follows the mouse without re-rendering the game screen. It is kept inside the window by its
 * measured size (a unit with a leader, his traits and an objective can be tall).
 */
export function HoverTip({ active, children }: { active: boolean; children: React.ReactNode }) {
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
      <div className="log-scroll" ref={ref}>
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.kind} ${l.side ? (l.side === human ? 'log-me' : 'log-them') : ''}`}>
            {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
});
