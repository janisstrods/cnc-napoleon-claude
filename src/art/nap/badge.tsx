// The arm badge: a dark plaque under the figures with the arm glyph, the unit code and the block pips. It is drawn
// outside the token's mirrored group, so its text and pips read the same whichever way the unit faces.
import { ARM_OF, codeOf, type Arm } from '../../engine/codes';
import type { ArtKey } from './keys';

const CREAM = '#fbf1d6';

/** The arm's symbol in the manner of a campaign map: a framed rectangle holding a saltire (infantry), a single diagonal (cavalry) or a dot (artillery). */
export function ArmGlyph({ arm, x, y, s = 1 }: { arm: Arm; x: number; y: number; s?: number }) {
  const w = 4.2 * s;
  const h = 3.2 * s;
  const inner =
    arm === 'infantry' ? <path d={`M${-w} ${-h} L${w} ${h} M${-w} ${h} L${w} ${-h}`} />
    : arm === 'cavalry' ? <path d={`M${-w} ${h} L${w} ${-h}`} />
    : <circle cx={0} cy={0} r={1.9 * s} fill={CREAM} stroke="none" />;
  return (
    <g data-glyph={arm} transform={`translate(${x} ${y})`} fill="none" stroke={CREAM} strokeWidth={1.2} strokeLinecap="round">
      <rect x={-w} y={-h} width={2 * w} height={2 * h} rx={0.6} />
      {inner}
    </g>
  );
}

export function UnitBadge({ unitKey, blocks, maxBlocks, guard }: { unitKey: ArtKey; blocks: number; maxBlocks: number; guard: boolean }) {
  const code = codeOf(unitKey);
  const arm = ARM_OF[code];
  const cyB = 30.8;
  const pw = 4.6;
  const right = 19.4;
  const pips: JSX.Element[] = [];
  for (let k = 0; k < maxBlocks; k++) {
    const px = right - (maxBlocks - 1 - k) * pw;
    pips.push(
      k < blocks
        ? <circle key={k} data-pip="on" cx={px} cy={cyB} r={1.95} fill="#f8e9bd" />
        : <circle key={k} data-pip="off" cx={px} cy={cyB} r={1.55} fill="none" stroke="#a8946c" strokeWidth={0.8} />,
    );
  }
  const long = code.length > 2;
  return (
    <g data-badge data-arm={arm} data-rim={guard ? 'gold' : undefined}>
      <rect x={-23.4} y={24.4} width={46.8} height={12.8} rx={3.4} fill="#17110c" fillOpacity={0.93} stroke={guard ? '#e9bf4f' : '#6b5638'} strokeWidth={guard ? 1.2 : 0.7} />
      <ArmGlyph arm={arm} x={-17.6} y={cyB} />
      <text
        x={-11.2}
        y={cyB + 3.3}
        fontFamily='"IM Fell English SC", "IM Fell English", Georgia, serif'
        fontWeight={700}
        fontSize={long ? 8 : 9.4}
        fill={CREAM}
        // a fixed width whatever font loads, so the code never runs into the pips
        textLength={long ? 13 : 12.5}
        lengthAdjust="spacingAndGlyphs"
      >
        {code}
      </text>
      {pips}
    </g>
  );
}
