// A map ornament in engraved ink: the compass rose of the main menu. Original art.

const f = (n: number) => String(Math.round(n * 100) / 100);

/** One point of a compass star, split down its length into a dark half and a light half, as engravers drew them. */
function starPoint(angle: number, length: number, notch: number, dark: string, light: string, line: string, key: string) {
  const a = (angle * Math.PI) / 180;
  const at = (r: number, da: number) => [Math.sin(a + da) * r, -Math.cos(a + da) * r] as const;
  const [tx, ty] = at(length, 0);
  const [lx, ly] = at(notch, -Math.PI / 4);
  const [rx, ry] = at(notch, Math.PI / 4);
  return (
    <g key={key}>
      <path d={`M0,0L${f(lx)},${f(ly)}L${f(tx)},${f(ty)}Z`} fill={light} stroke={line} strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M0,0L${f(tx)},${f(ty)}L${f(rx)},${f(ry)}Z`} fill={dark} stroke={line} strokeWidth={0.7} strokeLinejoin="round" />
    </g>
  );
}

/**
 * A compass rose: two fine rings with a tick at every point of the compass, a short four-point star on the quarters and a
 * long one on the cardinals, the north point in British red, and an N above it.
 */
export function CompassRose({ size = 100, className }: { size?: number; className?: string }) {
  const ink = 'var(--kit-rule, #3b3127)';
  const paper = 'var(--kit-parchment-light, #f6f0de)';
  const ticks: string[] = [];
  for (let k = 0; k < 32; k++) {
    const a = (k * Math.PI) / 16;
    const r0 = k % 4 === 0 ? 30 : 33;
    ticks.push(`M${f(Math.sin(a) * r0)},${f(-Math.cos(a) * r0)}L${f(Math.sin(a) * 36)},${f(-Math.cos(a) * 36)}`);
  }
  return (
    <svg
      className={className}
      viewBox="-50 -62 100 112"
      width={size}
      height={(size * 112) / 100}
      aria-hidden="true"
      focusable="false"
      data-ornament="compass-rose"
    >
      <circle r={36} fill={paper} stroke={ink} strokeWidth={0.9} />
      <circle r={33} fill="none" stroke={ink} strokeWidth={0.5} />
      <path d={ticks.join('')} stroke={ink} strokeWidth={0.6} strokeLinecap="round" />
      {[45, 135, 225, 315].map((a) => starPoint(a, 24, 5, ink, paper, ink, `q${a}`))}
      {[90, 180, 270].map((a) => starPoint(a, 44, 8, ink, paper, ink, `c${a}`))}
      {starPoint(0, 44, 8, 'var(--kit-crimson, #a3262a)', paper, ink, 'n')}
      <circle r={2.4} fill={paper} stroke={ink} strokeWidth={0.7} />
      <text
        y={-50}
        textAnchor="middle"
        fill={ink}
        style={{ fontFamily: 'var(--kit-font-title)', fontSize: 13 }}
      >
        N
      </text>
    </svg>
  );
}
