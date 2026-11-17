// UnitIcon: the arm glyph of a unit, for panels and tooltips. Art keys use NapUnitIcon; the rest a placeholder.
import { ARM_OF, codeOf, type UnitKey } from '../engine/codes';
import { ArmGlyph, NapUnitIcon, isArtKey } from './nap';

/** The unit's arm glyph on a dark plaque, centred on (0,0) and scaled to fit a `size` x `size` box. */
export function UnitIcon({ unitKey, size }: { unitKey: UnitKey; size: number }): JSX.Element {
  if (isArtKey(unitKey)) return <NapUnitIcon unitKey={unitKey} size={size} />;
  const s = size / 20;
  return (
    <g transform={`scale(${s})`}>
      <rect x={-10} y={-8} width={20} height={16} rx={3} fill="#17110c" fillOpacity={0.93} stroke="#6b5638" strokeWidth={0.7} />
      <ArmGlyph arm={ARM_OF[codeOf(unitKey)]} x={0} y={0} s={1.5} />
    </g>
  );
}
