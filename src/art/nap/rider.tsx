// The mounted figure: horse and rider. A stub until Task 3 draws it.
import type { NationLook } from './nations';
import { StubFigure } from './stub';
import type { HorseSpec } from './uniform';

export function MountedFigure({ spec: _spec, n, i }: { spec: HorseSpec; n: NationLook; i: number }) {
  return <StubFigure drawing="horse" n={n} i={i} />;
}
