import { useId, type CSSProperties, type KeyboardEvent } from 'react';
import { CARD_DEFS, mirrorKind } from '../../engine/cards';
import type { CardKind, SectionName } from '../../engine/types';
import { Icon, iconPath, type IconName, type NapGlyph } from './Icon';
import { SectionMiniMap } from './SectionMiniMap';
import { GROUP_COLORS } from './theme';

export type CardSize = 'sm' | 'md' | 'lg';

/** Illustration of each tactic card (game-icons.net, CC BY 3.0, or our own glyphs); section cards show the mini-map instead. */
export const CARD_ICONS: Partial<Record<CardKind, IconName | NapGlyph>> = {
  coordinatedAdvance: 'laurels',
  forward: 'run',
  reconInForce: 'spyglass',
  bayonetCharge: 'spears',
  bombard: 'strikingArrows',
  cavalryCharge: 'cavalry',
  counterAttack: 'shieldReflect',
  elan: 'trumpetFlag',
  fireAndHold: 'shieldEchoes',
  firstStrike: 'swordWound',
  forceMarch: 'run',
  coldSteel: 'crossedSwords',
  leadership: 'bicorne',
  grandManoeuvre: 'laurelCrown',
  rally: 'trumpetFlag',
  shortSupply: 'breadBag',
};

const SWAP: Record<SectionName, SectionName> = { left: 'right', center: 'center', right: 'left' };

const f2 = (n: number) => n.toFixed(2);

/** The roundel's bezel: 60 fine radial ticks, every fifth one longer, as on an engraved dial. */
const ROUNDEL_TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2;
  const r0 = i % 5 === 0 ? 39.6 : 41.4;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return `M${f2(50 + c * r0)} ${f2(50 + s * r0)}L${f2(50 + c * 44.4)} ${f2(50 + s * 44.4)}`;
}).join('');

/**
 * A tactic card's symbol as an engraved roundel: a double rule, a ticked bezel, a hatched field, and the glyph in ink
 * with a paper halo cut out of the hatching. Plain ink on paper; the group colour tints only the glyph.
 */
function EngravedRoundel({ icon }: { icon?: IconName | NapGlyph }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className="kit-card__roundel" viewBox="0 0 100 100" data-device="engraved-roundel" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${uid}h`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V2.6" className="kit-roundel__hatchline" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="48" className="kit-roundel__plate" />
      <circle cx="50" cy="50" r="45.6" className="kit-roundel__fine" />
      <path d={ROUNDEL_TICKS} className="kit-roundel__ticks" />
      <circle cx="50" cy="50" r="38.6" className="kit-roundel__rule" />
      <circle cx="50" cy="50" r="38" fill={`url(#${uid}h)`} className="kit-roundel__hatch" />
      {icon ? <path d={iconPath(icon)} transform="translate(23 23) scale(0.10546875)" className="kit-roundel__icon" /> : null}
    </svg>
  );
}

export function Ornament({ className }: { className?: string }) {
  return (
    <div className={`kit-ornament ${className ?? ''}`} aria-hidden="true">
      <span className="kit-ornament__line" />
      <svg viewBox="0 0 40 10" className="kit-ornament__mark">
        <path d="M20 1 L24 5 L20 9 L16 5 Z" fill="currentColor" />
        <circle cx="11" cy="5" r="1.4" fill="currentColor" />
        <circle cx="29" cy="5" r="1.4" fill="currentColor" />
      </svg>
      <span className="kit-ornament__line kit-ornament__line--r" />
    </div>
  );
}

function DetachBadge() {
  return (
    <div className="kit-card__detach" title="Leaders may detach from their units">
      <Icon name="bicorne" size="100%" />
    </div>
  );
}

/** A Command card face. Section cards show a mini-map with the number of orders per section. */
export function CardView(p: {
  kind: CardKind;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  /** Show the card from the opposite point of view (left and right swapped), e.g. for Counter Attack. */
  mirrored?: boolean;
  onClick?: () => void;
  onHover?: (h: boolean) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const size = p.size ?? 'md';
  const shownKind = p.mirrored ? mirrorKind(p.kind) : p.kind;
  const def = CARD_DEFS[shownKind];
  const g = GROUP_COLORS[def.group];
  const swapped = p.mirrored && shownKind === p.kind && def.sections.length > 0 && def.sections.length < 3;
  const sections = swapped ? def.sections.map((s) => SWAP[s]) : def.sections;
  // orders per section; a count of "as many as the Command allows" has no number to print
  const select = def.select;
  const rawCounts = select.kind === 'sections' ? select.counts : undefined;
  const counts: Partial<Record<SectionName, number>> | undefined = rawCounts
    ? Object.fromEntries(Object.entries(rawCounts).filter(([, n]) => typeof n === 'number').map(([s, n]) => [swapped ? SWAP[s as SectionName] : s, n]))
    : undefined;
  const icon = CARD_ICONS[shownKind];
  const clickable = !!p.onClick && !p.disabled;
  const textLen = def.text.length;
  const textClass = textLen > 172 ? 'kit-card__text--xlong' : textLen > 140 ? 'kit-card__text--long' : textLen < 90 ? 'kit-card__text--short' : '';

  const cls = [
    'kit-card',
    `kit-card--${size}`,
    `kit-card--${def.group}`,
    p.selected ? 'is-selected' : '',
    p.disabled ? 'is-disabled' : '',
    p.highlight ? 'is-highlight' : '',
    clickable ? 'is-clickable' : '',
    p.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--g-main': g.main,
    '--g-light': g.light,
    '--g-dark': g.dark,
    ...p.style,
  } as CSSProperties;

  const onKey = (e: KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onClick?.();
    }
  };

  return (
    <div
      className={cls}
      style={style}
      role={p.onClick ? 'button' : 'img'}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={p.onClick ? !!p.selected : undefined}
      aria-disabled={p.disabled || undefined}
      aria-label={`${def.title}. ${def.text}`}
      onClick={clickable ? p.onClick : undefined}
      onKeyDown={onKey}
      onMouseEnter={p.onHover ? () => p.onHover!(true) : undefined}
      onMouseLeave={p.onHover ? () => p.onHover!(false) : undefined}
    >
      <div className="kit-card__face">
        <div className="kit-card__frame" />
        <header className="kit-card__header">
          <span className="kit-card__title">{def.title}</span>
          {def.detach ? <DetachBadge /> : null}
          {p.mirrored ? (
            <div className="kit-card__mirror" title="Left and right swapped">
              &#8644;
            </div>
          ) : null}
        </header>
        <div className={`kit-card__art ${def.group === 'section' ? 'kit-card__art--map' : ''}`}>
          {def.group === 'section' ? (
            <div className="kit-card__map">
              <SectionMiniMap sections={sections} counts={counts} color={g.main} size={100} className="kit-card__minimap" />
              <div className="kit-card__maplabels" aria-hidden="true">
                {(['left', 'center', 'right'] as const).map((s) => (
                  <span key={s} className={sections.includes(s) ? 'is-on' : undefined}>
                    {s === 'center' ? 'centre' : s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EngravedRoundel icon={icon} />
          )}
        </div>
        <Ornament className="kit-card__rule" />
        <p className={`kit-card__text ${textClass}`}>{def.text}</p>
        <footer className="kit-card__footer">
          <span>{g.label}</span>
        </footer>
      </div>
    </div>
  );
}

/** One band of a guilloche: `n` sine-modulated rings about a centre, each a phase apart, as on a banknote's rosette. */
function guilloche(cx: number, cy: number, r: number, amp: number, lobes: number, n: number, squash: number): string {
  const steps = 240;
  let d = '';
  for (let k = 0; k < n; k++) {
    const ph = (k / n) * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const rr = r + amp * Math.sin(lobes * t + ph);
      d += `${i ? 'L' : 'M'}${f2(cx + rr * Math.cos(t))} ${f2(cy + rr * squash * Math.sin(t))}`;
    }
    d += 'Z';
  }
  return d;
}

// the card back is 145 x 210 units, the cartouche at its centre
const BACK_ROSETTE = guilloche(72.5, 105, 39, 4.2, 14, 6, 1.18);
const BACK_RING = guilloche(72.5, 105, 47.5, 1.6, 30, 3, 1.18);

/** The back of a Command card: an engraved cartouche with crossed sabres in a guilloche rosette, ink on buff. */
export function CardBack(p: { size?: CardSize; className?: string; style?: CSSProperties }) {
  const size = p.size ?? 'md';
  return (
    <div className={`kit-card kit-card--${size} kit-cardback ${p.className ?? ''}`} style={p.style} role="img" aria-label="Command card (face down)">
      <div className="kit-cardback__face">
        <svg className="kit-cardback__art" viewBox="0 0 145 210" data-device="cartouche" aria-hidden="true" focusable="false">
          <rect x="6" y="6" width="133" height="198" className="kit-cardback__rule" />
          <rect x="9.5" y="9.5" width="126" height="191" className="kit-cardback__fine" />
          <path d={BACK_RING} className="kit-cardback__ring" />
          <path d={BACK_ROSETTE} className="kit-cardback__guilloche" />
          <ellipse cx="72.5" cy="105" rx="27" ry="34" className="kit-cardback__cartouche" />
          <ellipse cx="72.5" cy="105" rx="24.4" ry="31.4" className="kit-cardback__fine" />
          <path d="M72.5 63.5l2.6 3.5l-2.6 3.5l-2.6-3.5ZM72.5 139.5l2.6 3.5l-2.6 3.5l-2.6-3.5Z" className="kit-cardback__lozenge" />
          <path d={iconPath('crossedSabres')} transform="translate(53.5 86) scale(0.07421875)" className="kit-cardback__sabres" />
        </svg>
        <div className="kit-cardback__caption kit-cardback__caption--top">Command</div>
        <div className="kit-cardback__caption kit-cardback__caption--bottom">Napoleonics</div>
      </div>
    </div>
  );
}
