import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Ornament } from './CardView';

/** Title-font button. primary = a British-red plate, secondary = paper with an engraved double rule, ghost = one ruled line. */
export function Button(p: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { variant = 'primary', className, type, children, ...rest } = p;
  return (
    <button {...rest} type={type ?? 'button'} className={`kit-btn kit-btn--${variant} ${className ?? ''}`}>
      <span className="kit-btn__label">{children}</span>
    </button>
  );
}

/** A panel ruled with a double line: a buff card (default, still called `leather`) or parchment, with an optional title. */
export function Panel(p: {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'leather' | 'parchment';
}) {
  const variant = p.variant ?? 'leather';
  return (
    <section className={`kit-panel kit-panel--${variant} ${p.className ?? ''}`} style={p.style}>
      <div className={`kit-panel__inner ${variant === 'leather' ? 'kit-leather' : 'kit-parchment'}`}>
        <span className="kit-panel__stud kit-panel__stud--tl" />
        <span className="kit-panel__stud kit-panel__stud--tr" />
        <span className="kit-panel__stud kit-panel__stud--bl" />
        <span className="kit-panel__stud kit-panel__stud--br" />
        {p.title ? (
          <header className="kit-panel__head">
            <Ornament className="kit-panel__orn" />
            <h3 className="kit-panel__title">{p.title}</h3>
            <Ornament className="kit-panel__orn" />
          </header>
        ) : null}
        <div className="kit-panel__body">{p.children}</div>
      </div>
    </section>
  );
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Where Tab (or Shift+Tab) from item `index` of `count` goes inside a dialog: it wraps round at either end. */
export function focusWrap(index: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (index < 0) return shift ? count - 1 : 0;
  return shift ? (index + count - 1) % count : (index + 1) % count;
}

/** What the dialog's keyboard handling needs of an element (a DOM element, or a stand-in in a test). */
export interface DialogItem { focus(): void; hasAttribute(name: string): boolean; setAttribute(name: string, value: string): void }
export interface DialogRoot { querySelectorAll(selector: string): ArrayLike<DialogItem> }

/** A scroll container with more to read than shows: it must be in the tab cycle, or the keyboard cannot scroll it. */
export function isScrollable(el: unknown): boolean {
  const e = el as HTMLElement;
  return typeof getComputedStyle === 'function' && e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY);
}

/**
 * Tab inside a dialog: scroll containers join the tab cycle (tabindex 0), and focus wraps only where it would leave the
 * dialog (past the last control, before the first, or from outside it).
 */
export function dialogTab(e: { shiftKey: boolean; preventDefault(): void }, root: DialogRoot, active: unknown, scrollable: (el: DialogItem) => boolean = isScrollable): void {
  for (const el of Array.from(root.querySelectorAll('*'))) if (!el.hasAttribute('tabindex') && scrollable(el)) el.setAttribute('tabindex', '0');
  const items = Array.from(root.querySelectorAll(FOCUSABLE));
  const i = items.indexOf(active as DialogItem);
  if (items.length && (i < 0 || (e.shiftKey ? i === 0 : i === items.length - 1))) {
    e.preventDefault();
    items[focusWrap(i, items.length, e.shiftKey)].focus();
  }
}

/** A centred parchment dialog over a dimmed table. Escape / backdrop click call onClose; focus moves in, stays in, and returns. */
export function Modal(p: { open: boolean; title?: string; children: ReactNode; onClose?: () => void; width?: number | string }) {
  const { open, onClose } = p;
  const box = useRef<HTMLDivElement>(null);
  // focus goes to the dialog's primary button (else its first control) and comes back to where it was when the dialog closes
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = box.current;
    // a control marked data-autofocus (the safe choice) wins over the primary button
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('.kit-btn--primary:not(:disabled)') ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    return () => { if (before && document.contains(before)) before.focus({ preventScroll: true }); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && box.current) dialogTab(e, box.current, document.activeElement);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const node = (
    <div
      className="kit-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div ref={box} className="kit-modal__box" role="dialog" aria-modal="true" aria-label={p.title} style={p.width === undefined ? undefined : { width: `min(${typeof p.width === 'number' ? `${p.width}px` : p.width}, 100%)` }}>
        <div className="kit-modal__inner kit-parchment">
          {onClose ? (
            <button type="button" className="kit-modal__close" onClick={onClose} aria-label="Close">
              &times;
            </button>
          ) : null}
          {p.title ? (
            <header className="kit-modal__head">
              <h2 className="kit-modal__title">{p.title}</h2>
              <Ornament className="kit-modal__orn" />
            </header>
          ) : null}
          <div className="kit-modal__body">{p.children}</div>
        </div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}

/**
 * A floating tooltip card near (x, y). With position 'fixed' (default) x/y are viewport (client)
 * coordinates and the tooltip flips to stay on screen; with 'absolute' they are relative to the
 * nearest positioned ancestor.
 */
export function Tooltip(p: {
  x: number;
  y: number;
  children: ReactNode;
  position?: 'fixed' | 'absolute';
  offset?: number;
  /** 'bare' drops the dark backing (e.g. to float a CardView). */
  variant?: 'dark' | 'bare';
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const position = p.position ?? 'fixed';
  const off = p.offset ?? 16;
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: p.x + off, top: p.y + off });
  useLayoutEffect(() => {
    let left = p.x + off;
    let top = p.y + off;
    const el = ref.current;
    if (el && position === 'fixed' && typeof window !== 'undefined') {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (left + w > window.innerWidth - 8) left = Math.max(8, p.x - off - w);
      if (top + h > window.innerHeight - 8) top = Math.max(8, p.y - off - h);
    }
    setPos((cur) => (cur.left === left && cur.top === top ? cur : { left, top }));
  }, [p.x, p.y, off, position]);
  return (
    <div ref={ref} className={`kit-tooltip ${p.variant === 'bare' ? 'kit-tooltip--bare' : ''} ${p.className ?? ''}`} role="tooltip" style={{ position, left: pos.left, top: pos.top, ...p.style }}>
      {p.children}
    </div>
  );
}

/** Full-bleed page background: a sheet of map paper (the name is kept from the old wooden table). */
export function Tabletop(p: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`kit-table ${p.className ?? ''}`} style={p.style}>
      {p.children}
    </div>
  );
}
