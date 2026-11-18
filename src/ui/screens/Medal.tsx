// Medals of the player's battle record (src/ui/record.ts): a bronze, silver or gold disc hung from a ribbon, a star over a laurel, for a side won
// against the Captain, Colonel or Marshal, a plain ring for a side fought but not won, a dotted ring for one not fought.
import { useId } from 'react';
import type { Side } from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { iconPath } from '../kit';
import { sideStanding, type BattleRecord, type Medal as MedalKind, type Standing } from '../record';

/** Each metal: highlight, body, shade (top to bottom) and rim. */
const METAL: Record<MedalKind, { stops: [string, string, string]; rim: string }> = {
  gold: { stops: ['#fff3b8', '#e6bd4f', '#94661a'], rim: '#6e4a10' },
  silver: { stops: ['#ffffff', '#c8ccd3', '#7b828d'], rim: '#4f555e' },
  bronze: { stops: ['#f7cfa6', '#c47c3f', '#7c4219'], rim: '#5a2e10' },
};

/** A five-pointed star, centred on the disc (20 24). */
const STAR = 'M20.00 17.60 L21.59 21.82 L26.09 22.02 L22.57 24.83 L23.76 29.18 L20.00 26.70 L16.24 29.18 L17.43 24.83 L13.91 22.02 L18.41 21.82 Z';

/** The opponent level each medal is won against. */
export const MEDAL_LEVEL: Record<MedalKind, string> = { gold: 'Marshal', silver: 'Colonel', bronze: 'Captain' };

const STANDING_TEXT: Record<Standing, string> = {
  gold: `gold (beat the ${MEDAL_LEVEL.gold})`,
  silver: `silver (beat the ${MEDAL_LEVEL.silver})`,
  bronze: `bronze (beat the ${MEDAL_LEVEL.bronze})`,
  fought: 'not won yet',
  none: 'not fought yet',
};

export function standingText(s: Standing): string {
  return STANDING_TEXT[s];
}

/** One medal (decorative: the text around it, or the label of its `MedalPair`, says what it means). */
export function Medal(p: { standing: Standing; size?: number; faint?: boolean; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = p.size ?? 18;
  const cls = `medal is-${p.standing}${p.faint ? ' is-faint' : ''}${p.className ? ` ${p.className}` : ''}`;
  const s = p.standing;
  return (
    <svg className={cls} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      {s === 'none' && <circle className="medal-ring" cx="20" cy="20" r="14" fill="none" strokeWidth="2" strokeDasharray="2.6 3.2" />}
      {s === 'fought' && <circle className="medal-ring" cx="20" cy="20" r="14.5" strokeWidth="2.6" />}
      {s !== 'none' && s !== 'fought' && (
        <>
          <defs>
            <linearGradient id={`${uid}m`} x1="0" y1="0" x2="0.35" y2="1">
              {METAL[s].stops.map((c, i) => <stop key={i} offset={i / 2} stopColor={c} />)}
            </linearGradient>
          </defs>
          <g className="medal-ribbon">
            <path d="M12 1 H28 V12 H12 Z" />
            <path d="M18.4 1 H21.6 V12 H18.4 Z" fill="#f1e2b6" stroke="none" />
          </g>
          <circle cx="20" cy="24" r="15.2" fill={`url(#${uid}m)`} stroke={METAL[s].rim} strokeWidth="1.4" />
          <circle cx="20" cy="24" r="12.2" fill="none" stroke={METAL[s].stops[0]} strokeWidth="1" opacity=".75" />
          <path d={iconPath('laurels')} transform="translate(9.76 13.76) scale(0.04)" fill={METAL[s].rim} opacity=".82" />
          <path className="medal-star" d={STAR} fill={METAL[s].stops[0]} stroke={METAL[s].rim} strokeWidth=".8" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/** The sides in the order of the briefing's "Command the" buttons. */
export const SIDE_ORDER: readonly Side[] = ['bottom', 'top'];

/** What a battle's two medals mean, side by side: "British: gold (beat the Marshal) · French: not fought yet". */
export function pairText(rec: BattleRecord, sc: ScenarioInfo): string {
  return SIDE_ORDER.map((sd) => `${sc.setup[sd].army}: ${standingText(sideStanding(rec, sc.id, sd))}`).join(' · ');
}

/** A battle's two medals, one per army (bottom army first), labelled for assistive technology and on hover. */
export function MedalPair(p: { rec: BattleRecord; sc: ScenarioInfo; size?: number; className?: string }) {
  const text = pairText(p.rec, p.sc);
  return (
    <span className={`medal-pair${p.className ? ` ${p.className}` : ''}`} role="img" aria-label={text} title={text}>
      {SIDE_ORDER.map((sd) => <Medal key={sd} standing={sideStanding(p.rec, p.sc.id, sd)} size={p.size} />)}
    </span>
  );
}
