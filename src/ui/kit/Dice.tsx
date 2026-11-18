import { useId, type CSSProperties } from 'react';
import { DIE_FACES } from '../../engine/rng';
import type { DieFace } from '../../engine/types';
import { NAP_GLYPHS } from './icons/napGlyphs';
import { theme } from './theme';

export type DieState = 'hit' | 'flag' | 'miss' | null;

const FACES: readonly DieFace[] = DIE_FACES;

/** What the face is called to the eye and the ear: `aria-label` of a die. */
export const FACE_LABEL: Record<DieFace, string> = {
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  artillery: 'Artillery',
  flag: 'Flag',
  sabre: 'Sabre',
};

/** Accent of each arm: a tinted roundel behind the glyph and a ground bar under it. */
const ARM_ACCENT: Record<'infantry' | 'cavalry' | 'artillery', string> = {
  infantry: theme.dice.infantry,
  cavalry: theme.dice.cavalry,
  artillery: theme.dice.artillery,
};
const GLYPH_OF = { infantry: 'infantryman', cavalry: 'horseman', artillery: 'cannon' } as const;

/** Symbol layer of a die, drawn into a 100x100 box. `uid` scopes the gradient ids. */
function Symbol({ face, uid }: { face: DieFace; uid: string }) {
  switch (face) {
    case 'infantry':
    case 'cavalry':
    case 'artillery': {
      const accent = ARM_ACCENT[face];
      return (
        <g>
          <circle cx="50" cy="50" r="47" fill={accent} opacity=".2" />
          <path d={NAP_GLYPHS[GLYPH_OF[face]]} transform="translate(7 5) scale(.172)" fill={`url(#${uid}gi)`} />
          <rect x="22" y="90" width="56" height="6" rx="3" fill={accent} />
        </g>
      );
    }
    case 'flag':
      return (
        <g>
          <path d="M33 22 C45 16 56 27 78 19 L68.5 35.5 L80 51 C59 58 46 45 33 51 Z" fill="#a8201a" stroke="#3b0c08" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M36 26 C46 21 55 30 70 26" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="27.5" y="17" width="5.5" height="69" rx="2.7" fill={`url(#${uid}gi)`} />
          <circle cx="30.2" cy="15" r="5.2" fill={`url(#${uid}gi)`} />
        </g>
      );
    case 'sabre':
      return <path d={NAP_GLYPHS.crossedSabres} transform="translate(8 8) scale(.168)" fill={`url(#${uid}gi)`} />;
  }
}

function SymbolDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}gi`} x1="0" y1="0" x2=".2" y2="1">
        <stop offset="0" stopColor="#5a4128" />
        <stop offset=".5" stopColor="#2c1d10" />
        <stop offset="1" stopColor="#140b04" />
      </linearGradient>
    </defs>
  );
}

/** A die face's symbol on its own, without the die body (e.g. the arm badge on cards). */
export function DieSymbol({ face, className }: { face: DieFace; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <SymbolDefs uid={uid} />
      <Symbol face={face} uid={uid} />
    </svg>
  );
}

/** An ivory battle die. `rolling` tumbles and cycles faces; `state` marks the resolved result. */
export function DieView(p: {
  face: DieFace;
  size?: number;
  rolling?: boolean;
  state?: DieState;
  /** Animation offset in seconds (desynchronises several rolling dice). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = p.size ?? 44;
  const state = p.rolling ? null : (p.state ?? null);
  const delay = p.delay ?? 0;
  const cls = ['kit-die', p.rolling ? 'is-rolling' : '', state ? `is-${state}` : '', p.className ?? ''].filter(Boolean).join(' ');
  const style = {
    '--die-size': `${size}px`,
    '--die-delay': `${delay}s`,
    ...p.style,
  } as CSSProperties;
  return (
    <div className={cls} style={style} role="img" aria-label={p.rolling ? 'Rolling die' : FACE_LABEL[p.face] + (state ? ` (${state})` : '')}>
      <div className="kit-die__shadow" />
      <div className="kit-die__body">
        <svg className="kit-die__sym" viewBox="0 0 100 100" aria-hidden="true">
          <SymbolDefs uid={uid} />
          {p.rolling ? (
            FACES.map((f, i) => (
              <g key={f} className="kit-die__layer" style={{ '--i': i } as CSSProperties}>
                <Symbol face={f} uid={uid} />
              </g>
            ))
          ) : (
            <Symbol face={p.face} uid={uid} />
          )}
        </svg>
      </div>
    </div>
  );
}

function summarise(faces: DieFace[], scoring?: boolean[]): string | null {
  if (!scoring) return null;
  const hits = scoring.filter(Boolean).length;
  const flags = faces.filter((f, i) => f === 'flag' && !scoring[i]).length;
  const parts = [`${hits} ${hits === 1 ? 'hit' : 'hits'}`];
  if (flags) parts.push(`${flags} ${flags === 1 ? 'flag' : 'flags'}`);
  return parts.join(', ');
}

/** The dice tray: a felt-lined wooden box holding the rolled dice, with a caption. */
export function DiceTray(p: {
  faces: DieFace[];
  scoring?: boolean[];
  rolling?: boolean;
  title?: string;
  subtitle?: string;
  dieSize?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const size = p.dieSize ?? 46;
  const subtitle = p.rolling ? (p.subtitle ?? 'Rolling…') : (p.subtitle ?? summarise(p.faces, p.scoring));
  const hits = p.scoring ? p.scoring.filter(Boolean).length : 0;
  return (
    <div className={`kit-tray ${p.className ?? ''}`} style={p.style} role="group" aria-label={subtitle ?? p.title ?? 'Battle dice'}>
      {p.title || subtitle ? (
        <header className="kit-tray__head">
          {p.title ? <div className="kit-tray__title">{p.title}</div> : null}
          {subtitle ? (
            <div className={`kit-tray__sub ${!p.rolling && hits > 0 ? 'has-hits' : ''}`} aria-live="polite">
              {subtitle}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className="kit-tray__felt">
        <div className="kit-tray__dice">
          {p.faces.map((f, i) => {
            let state: DieState = null;
            if (p.scoring && !p.rolling) state = p.scoring[i] ? 'hit' : f === 'flag' ? 'flag' : 'miss';
            return <DieView key={i} face={f} size={size} rolling={p.rolling} state={state} delay={-(i * 0.17) - (i % 2) * 0.05} />;
          })}
          {p.faces.length === 0 ? <div className="kit-tray__empty">No dice</div> : null}
        </div>
      </div>
    </div>
  );
}

export const ALL_DIE_FACES: readonly DieFace[] = DIE_FACES;
